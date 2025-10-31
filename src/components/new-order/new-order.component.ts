import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AllocationsService } from '../../services/allocations.service';
import { GeminiService, CopilotResponse } from '../../services/gemini.service';
import { NotificationService } from '../../services/notification.service';
import { Client, Asset, OrderStatus } from '../../types';
import { DecimalPipe } from '@angular/common';

interface OrderItem {
  asset: Asset;
  amount: number;
}

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
  assetIds?: string[];
}

@Component({
  selector: 'app-new-order',
  templateUrl: './new-order.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe],
})
export class NewOrderComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private allocationsService = inject(AllocationsService);
  private geminiService = inject(GeminiService);
  private notificationService = inject(NotificationService);

  // --- UI State Signals ---
  creationPath = signal<'guided' | 'direct' | null>(null);
  copilotStep = signal<1 | 2 | 3>(1);

  // --- Data Signals ---
  allClients = this.allocationsService.getClients();
  allAssets = this.allocationsService.getAssets();
  clientSearchTerm = signal('');
  selectedClient = signal<Client | null>(null);
  
  // --- Chat Signals ---
  chatMessages = signal<ChatMessage[]>([
    { sender: 'ai', text: 'Olá! Sou seu Copilot de investimentos. Como posso te ajudar a montar a cesta ideal para este cliente?' }
  ]);
  userMessage = signal('');
  isThinking = signal(false);

  // --- Order & Asset Signals ---
  recommendedAssets = signal<Asset[]>([]);
  currentOrderItems = signal<OrderItem[]>([]);
  isFullAssetListOpen = signal(false);
  activeAssetTab = signal<'Pública' | 'Privada'>('Pública');

  // --- Voice & Speech Signals ---
  isRecording = signal(false);
  isTranscribing = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  isSpeaking = signal(false);
  speakingMessageIndex = signal<number | null>(null);

  // --- Computed Signals ---
  filteredClients = computed(() => {
    const term = this.clientSearchTerm().toLowerCase();
    if (!term) return [];
    return this.allClients().filter(c => c.name.toLowerCase().includes(term));
  });

  publicAssets = computed(() => this.allAssets().filter(a => a.category === 'Pública'));
  privateAssets = computed(() => this.allAssets().filter(a => a.category === 'Privada'));

  totalOrderValue = computed(() => 
    this.currentOrderItems().reduce((sum, item) => sum + item.amount, 0)
  );
  
  isAssetSelected = computed(() => (assetId: string) => 
    this.currentOrderItems().some(item => item.asset.id === assetId)
  );
  
  selectedClientInitials = computed(() => {
    const name = this.selectedClient()?.name;
    if (!name) return '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('');
  });

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const path = params.get('path');
      if (path === 'guided' || path === 'direct') {
        this.creationPath.set(path);
      }

      const clientId = params.get('clientId');
      if (clientId) {
        const client = this.allClients().find(c => c.account === clientId);
        if (client) {
          this.selectedClient.set(client);
          this.copilotStep.set(2);
          
          // If the user is coming pre-selected, 'direct' is a good default path.
          if (!this.creationPath()) {
            this.creationPath.set('direct');
          }
        }
      }
    });
  }

  // --- Methods ---
  private scrollToTop() {
    // The main content area is the <main> element in app.component.html
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setCreationPath(path: 'guided' | 'direct') {
    this.creationPath.set(path);
  }

  selectClient(client: Client) {
    this.selectedClient.set(client);
    this.clientSearchTerm.set('');
    this.copilotStep.set(2);
    this.scrollToTop();
  }

  resetClientSelection() {
    this.selectedClient.set(null);
    this.currentOrderItems.set([]);
    this.copilotStep.set(1);
    this.scrollToTop();
  }

  nextStep() {
    if (this.copilotStep() < 3) {
      this.copilotStep.update(s => s + 1 as 1 | 2 | 3);
      this.scrollToTop();
    }
  }

  prevStep() {
    if (this.copilotStep() > 1) {
      this.copilotStep.update(s => s - 1 as 1 | 2 | 3);
      this.scrollToTop();
    }
  }

  getRiskBadgeClass(risk: 'Baixo' | 'Médio' | 'Alto' | 'Conservador' | 'Moderado' | 'Arrojado' | undefined): string {
    if (!risk) return 'bg-gray-200 text-gray-800';
    switch (risk) {
      case 'Baixo':
      case 'Conservador':
        return 'bg-status-success/20 text-status-success';
      case 'Médio':
      case 'Moderado':
        return 'bg-status-warning/20 text-status-warning';
      case 'Alto':
      case 'Arrojado':
        return 'bg-status-error/20 text-status-error';
    }
  }

  async sendMessage() {
    const message = this.userMessage().trim();
    if (!message || !this.selectedClient() || this.isThinking()) return;

    this.chatMessages.update(m => [...m, { sender: 'user', text: message }]);
    this.userMessage.set('');
    this.isThinking.set(true);

    try {
      const fullPrompt = `Cliente: ${this.selectedClient()!.name}, Perfil de Risco: ${this.selectedClient()!.riskProfile}. Solicitação: ${message}`;
      const response: CopilotResponse = await this.geminiService.getAssetRecommendations(fullPrompt);
      
      this.chatMessages.update(m => [...m, { sender: 'ai', text: response.analysis, assetIds: response.recommendedAssetIds }]);
      
      const recommended = response.recommendedAssetIds
        .map(id => this.allocationsService.getAssetById(id))
        .filter((a): a is Asset => !!a);
      this.recommendedAssets.set(recommended);

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      this.chatMessages.update(m => [...m, { sender: 'system', text: 'Desculpe, ocorreu um erro ao processar sua solicitação.' }]);
    } finally {
      this.isThinking.set(false);
    }
  }

  selectAsset(asset: Asset) {
    if (this.isAssetSelected()(asset.id)) return;
    this.currentOrderItems.update(items => [...items, { asset, amount: asset.minAmount }]);
  }

  removeAssetFromOrder(assetId: string) {
    this.currentOrderItems.update(items => items.filter(item => item.asset.id !== assetId));
  }

  updateAmount(assetId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const amount = parseFloat(input.value) || 0;
    this.currentOrderItems.update(items =>
      items.map(item => item.asset.id === assetId ? { ...item, amount } : item)
    );
  }
  
  getAmountForAsset(assetId: string): number {
    const item = this.currentOrderItems().find(i => i.asset.id === assetId);
    return item?.amount || 0;
  }

  createOrder() {
    if (!this.selectedClient() || this.currentOrderItems().length === 0) return;
    
    this.allocationsService.addOrder({
      client: this.selectedClient()!,
      status: OrderStatus.Aberta,
      totalValue: this.totalOrderValue(),
      assets: this.currentOrderItems(),
    });

    this.notificationService.show('Nova ordem criada com sucesso!');
    this.router.navigate(['/allocations']);
  }

  speak(text: string, index: number) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
        this.notificationService.show('Seu navegador não suporta a leitura de texto.', 'error');
        return;
    }

    if (this.isSpeaking()) {
        window.speechSynthesis.cancel(); // This will trigger 'onend' and reset state
        if (this.speakingMessageIndex() === index) {
            // If the same button is clicked, it acts as a stop button.
            return;
        }
    }
    
    this.isSpeaking.set(true);
    this.speakingMessageIndex.set(index);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';

    utterance.onend = () => {
        this.isSpeaking.set(false);
        this.speakingMessageIndex.set(null);
    };
    utterance.onerror = () => {
        this.isSpeaking.set(false);
        this.speakingMessageIndex.set(null);
        this.notificationService.show('Erro ao reproduzir o áudio.', 'error');
    };
    window.speechSynthesis.speak(utterance);
}

  async toggleRecording() {
    if (this.isRecording()) {
      this.mediaRecorder?.stop();
      this.isRecording.set(false);
      this.isTranscribing.set(true);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = event => this.audioChunks.push(event.data);

        this.mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
          
          try {
            const transcribedText = await this.geminiService.transcribeAudio(audioFile);
            this.userMessage.set(transcribedText);
            if (transcribedText) {
                await this.sendMessage();
            }
          } catch (error) {
            console.error('Error transcribing audio:', error);
            this.notificationService.show('Erro ao transcrever o áudio.', 'error');
          } finally {
            this.isTranscribing.set(false);
            stream.getTracks().forEach(track => track.stop());
          }
        };

        this.mediaRecorder.start();
        this.isRecording.set(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        this.notificationService.show('Acesso ao microfone negado.', 'error');
      }
    }
  }
}