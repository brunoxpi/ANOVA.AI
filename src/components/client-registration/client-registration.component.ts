import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ClientRegistrationService } from '../../services/client-registration.service';
import { NotificationService } from '../../services/notification.service';
import { GeminiService, PersonalData, AddressData } from '../../services/gemini.service';
import { OnboardingTipComponent } from '../onboarding-tip/onboarding-tip.component';

@Component({
  selector: 'app-client-registration',
  templateUrl: './client-registration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OnboardingTipComponent],
})
export class ClientRegistrationComponent {
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private clientRegistrationService = inject(ClientRegistrationService);
  private geminiService = inject(GeminiService);

  currentStep = signal(1);

  // Step 1: AI Analysis State
  isAnalyzingDocument = signal(false);
  analysisSuccess = signal(false);
  analysisError = signal<string | null>(null);
  aiSuggestedFields = signal<Record<keyof PersonalData, boolean>>({
    nomeCompleto: false,
    cpf: false,
    dataNascimento: false,
    rg: false,
    orgaoEmissor: false,
    dataExpedicao: false,
    nomeMae: false,
    nomePai: false,
  });

  // Step 1: Form Fields
  nomeCompleto = signal('');
  cpf = signal('');
  dataNascimento = signal('');
  rg = signal('');
  orgaoEmissor = signal('');
  dataExpedicao = signal('');
  nacionalidade = signal('Brasileira');
  naturalidade = signal('');
  sexo = signal('');
  escolaridade = signal('');
  estadoCivil = signal('');
  nomePai = signal('');
  nomeMae = signal('');

  // Step 1: Additional Info
  hasBrokerageAccount = signal(false);
  brokerages = signal([
    'BTG Pactual',
    'XP Investimentos',
    'Safra',
    'Inter',
    'Avenue',
  ]);
  selectedBrokerage = signal('');
  accountCode = signal('');
  registrationDate = signal(new Date().toLocaleDateString('pt-BR'));
  unidadeCredenciada = signal('Matriz');
  assessor = signal('Bruno Nascimento');

  // Step 2: AI Analysis State for Address
  isAnalyzingAddress = signal(false);
  addressAnalysisSuccess = signal(false);
  addressAnalysisError = signal<string | null>(null);
  aiSuggestedAddressFields = signal<Record<keyof AddressData, boolean>>({
      cep: false,
      endereco: false,
      bairro: false,
      cidade: false,
      estado: false,
  });

  // Step 2: Address Form Fields
  cep = signal('');
  endereco = signal('');
  numero = signal('');
  complemento = signal('');
  bairro = signal('');
  cidade = signal('');
  estado = signal('');
  pais = signal('Brasil');

  // Step 2: Contact Form Fields
  telefoneResidencial = signal('');
  celular = signal('');
  email = signal('');
  confirmeEmail = signal('');

  // Step 5: Allocation Proposal State
  allocationType = signal<'reallocation' | 'new' | null>(null);
  portfolioFile = signal<File | null>(null);
  objectives = signal('');
  isRecording = signal(false);
  isTranscribing = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  emailMismatch = computed(() => {
      return this.email() && this.confirmeEmail() && this.email() !== this.confirmeEmail();
  });

  steps = [
    { id: 1, name: 'Dados' },
    { id: 2, name: 'Endereço' },
    { id: 3, name: 'Profissional' },
    { id: 4, name: 'Perfil' },
    { id: 5, name: 'Proposta' },
    { id: 6, name: 'Contrato' },
  ];

  constructor() {
    // If for some reason rates are not set (e.g., page refresh), redirect to dashboard.
    if (!this.clientRegistrationService.clientRates()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isAnalyzingDocument.set(true);
    this.analysisSuccess.set(false);
    this.analysisError.set(null);
    this.aiSuggestedFields.set({} as any); // Reset suggestions

    try {
      const data = await this.geminiService.analyzeDocument(file);
      this.populateFormData(data);
      this.analysisSuccess.set(true);
    } catch (error) {
      console.error('Error analyzing document:', error);
      this.analysisError.set('Não foi possível analisar o documento. Tente novamente.');
    } finally {
      this.isAnalyzingDocument.set(false);
      input.value = ''; // Reset file input
    }
  }

  private populateFormData(data: PersonalData) {
    const suggestions: Partial<Record<keyof PersonalData, boolean>> = {};
    
    if (data.nomeCompleto) {
      this.nomeCompleto.set(data.nomeCompleto);
      suggestions.nomeCompleto = true;
    }
    if (data.cpf) {
      this.cpf.set(data.cpf);
      suggestions.cpf = true;
    }
    if (data.dataNascimento) {
      this.dataNascimento.set(data.dataNascimento);
      suggestions.dataNascimento = true;
    }
    if (data.rg) {
      this.rg.set(data.rg);
      suggestions.rg = true;
    }
     if (data.orgaoEmissor) {
      this.orgaoEmissor.set(data.orgaoEmissor);
      suggestions.orgaoEmissor = true;
    }
    if (data.dataExpedicao) {
      this.dataExpedicao.set(data.dataExpedicao);
      suggestions.dataExpedicao = true;
    }
    if (data.nomeMae) {
      this.nomeMae.set(data.nomeMae);
      suggestions.nomeMae = true;
    }
     if (data.nomePai) {
      this.nomePai.set(data.nomePai);
      suggestions.nomePai = true;
    }

    this.aiSuggestedFields.update(current => ({...current, ...suggestions}));
  }

  async onAddressFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isAnalyzingAddress.set(true);
    this.addressAnalysisSuccess.set(false);
    this.addressAnalysisError.set(null);
    this.aiSuggestedAddressFields.set({} as any);

    try {
      const data = await this.geminiService.analyzeAddressDocument(file);
      this.populateAddressFormData(data);
      this.addressAnalysisSuccess.set(true);
    } catch (error) {
      console.error('Error analyzing address document:', error);
      this.addressAnalysisError.set('Não foi possível analisar o comprovante. Tente novamente.');
    } finally {
      this.isAnalyzingAddress.set(false);
      input.value = '';
    }
  }

  private populateAddressFormData(data: AddressData, fromViaCep = false) {
    const suggestions: Partial<Record<keyof AddressData, boolean>> = {};
    
    if (data.cep) {
        this.cep.set(data.cep);
        if (!fromViaCep) suggestions.cep = true;
    }
    if (data.endereco) {
        this.endereco.set(data.endereco);
        if (!fromViaCep) suggestions.endereco = true;
    }
    if (data.bairro) {
        this.bairro.set(data.bairro);
        if (!fromViaCep) suggestions.bairro = true;
    }
    if (data.cidade) {
        this.cidade.set(data.cidade);
        if (!fromViaCep) suggestions.cidade = true;
    }
    if (data.estado) {
        this.estado.set(data.estado);
        if (!fromViaCep) suggestions.estado = true;
    }
    
    if (!fromViaCep) {
        this.aiSuggestedAddressFields.update(current => ({...current, ...suggestions}));
    }
  }


  async searchCep() {
    const cepValue = this.cep().replace(/\D/g, ''); // Remove non-digit characters
    if (cepValue.length !== 8) {
        return; // Invalid CEP
    }
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
        if (!response.ok) {
            throw new Error('CEP não encontrado.');
        }
        const data = await response.json();
        if (data.erro) {
            // CEP not found
            return;
        }
        
        // Map ViaCEP response to our AddressData structure
        const addressData: AddressData = {
            cep: data.cep,
            endereco: data.logouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf,
        };
        
        this.populateAddressFormData(addressData, true);

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
    }
  }

  private applyPhoneMask(value: string): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  handleTelefoneResidencialInput(event: Event) {
    this.telefoneResidencial.set(this.applyPhoneMask((event.target as HTMLInputElement).value));
  }

  handleCelularInput(event: Event) {
    this.celular.set(this.applyPhoneMask((event.target as HTMLInputElement).value));
  }

  onPortfolioFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
        this.portfolioFile.set(file);
    }
    input.value = ''; // Reset to allow re-uploading same file
  }

  removePortfolioFile() {
      this.portfolioFile.set(null);
  }

  async toggleRecording() {
    if (this.isRecording()) {
      // Stop recording
      this.mediaRecorder?.stop();
      this.isRecording.set(false);
      this.isTranscribing.set(true); // Show spinner while waiting for Gemini
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
          
          try {
            const transcribedText = await this.geminiService.transcribeAudio(audioFile);
            this.objectives.update(currentText => 
                currentText ? `${currentText.trim()}\n${transcribedText}`.trim() : transcribedText
            );
          } catch (error) {
            console.error('Error transcribing audio:', error);
            this.notificationService.show('Erro ao transcrever o áudio.', 'error');
          } finally {
            this.isTranscribing.set(false);
            // Clean up the stream tracks to turn off the browser's recording indicator
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

  nextStep() {
    if (this.currentStep() < this.steps.length) {
      this.currentStep.update(s => s + 1);
      window.scrollTo(0, 0);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
      window.scrollTo(0, 0);
    }
  }
  
  goToStep(stepId: number) {
    if (stepId < this.currentStep()) {
      this.currentStep.set(stepId);
       window.scrollTo(0, 0);
    }
  }

  finishRegistration() {
    this.notificationService.show('Novo cliente cadastrado com sucesso!');
    this.router.navigate(['/dashboard']);
  }
}
