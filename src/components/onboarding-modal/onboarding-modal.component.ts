import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Client, OnboardingStatus } from '../../types';
import { NotificationService } from '../../services/notification.service';
import { OnboardingTipComponent } from '../onboarding-tip/onboarding-tip.component';

const SUCCESS_NOTIFICATION_MESSAGE = 'Status do cliente atualizado com sucesso!';
const ANNOTATIONS_STORAGE_KEY_PREFIX = 'client_annotations_';
const AUTOSAVE_INTERVAL_MS = 30000;

@Component({
  selector: 'app-onboarding-modal',
  templateUrl: './onboarding-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OnboardingTipComponent],
})
export class OnboardingModalComponent {
  client = input.required<Client>();
  @Output() close = new EventEmitter<void>();
  @Output() clientUpdate = new EventEmitter<Client>();

  private notificationService = inject(NotificationService);
  private router = inject(Router);

  editingClient = signal<Client | null>(null);
  private originalClient = signal<Client | null>(null);
  
  activeStepId = signal(1);

  hasChanges = computed(() => {
    if (!this.originalClient() || !this.editingClient()) {
      return false;
    }
    // Per user request, the save button is only active if the client's progress has advanced.
    return this.originalClient()!.progress < this.editingClient()!.progress;
  });

  // State for step 2: "Vínculo de Conta"
  interactiveAccountLinkSubStatusIndex = signal(0);
  accountLinkSubSteps = ['Solicitação Enviada', 'Push Aceito', 'Concluído'];

  accountLinkSubStatusIndex = computed(() => {
    const client = this.editingClient();
    if (!client) return 0;
    // If step 2 is fully complete, show the final sub-step as complete.
    if (client.progress > 2) {
      return 2;
    }
    // Otherwise, use the interactive state.
    return this.interactiveAccountLinkSubStatusIndex();
  });

  // State for step 3: "Definição da Estratégia"
  strategyDefinedByAlgorithm = signal(false);

  steps = [
    { id: 1, name: 'Formulário e Contrato' },
    { id: 2, name: 'Vínculo de Conta' },
    { id: 3, name: 'Definição da Estratégia' },
    { id: 4, name: 'Aporte / Realocação' },
  ];

  constructor() {
    // Effect to initialize and load client data
    effect(() => {
      const currentClient = this.client();
      if (currentClient) {
        // Step 1 is considered automatically complete. 
        // If the client is on step 1, we advance them to step 2 immediately.
        const newProgress = currentClient.progress === 1 ? 2 : currentClient.progress;
        
        // Load saved annotations from localStorage
        const storageKey = `${ANNOTATIONS_STORAGE_KEY_PREFIX}${currentClient.account}`;
        const savedAnnotations = localStorage.getItem(storageKey);
        
        const clientCopy = { 
          ...currentClient, 
          progress: newProgress,
          annotations: savedAnnotations ?? currentClient.annotations ?? ''
        };

        this.editingClient.set(clientCopy);
        this.originalClient.set(clientCopy); // Set both to the new state to avoid "unsaved changes" on open
        this.activeStepId.set(newProgress);
        this.resetLocalStepStates(newProgress);
      }
    });

    // Effect for autosaving annotations
    effect((onCleanup) => {
      const client = this.editingClient();
      if (!client) return;

      const intervalId = setInterval(() => {
        const currentEditingClient = this.editingClient();
        // Only save if there are annotations to prevent empty strings in storage
        if (currentEditingClient && currentEditingClient.annotations) {
          const storageKey = `${ANNOTATIONS_STORAGE_KEY_PREFIX}${currentEditingClient.account}`;
          localStorage.setItem(storageKey, currentEditingClient.annotations);
        }
      }, AUTOSAVE_INTERVAL_MS);

      onCleanup(() => {
        clearInterval(intervalId);
      });
    });
  }
  
  private resetLocalStepStates(progress: number) {
    if (progress <= 2) {
      this.interactiveAccountLinkSubStatusIndex.set(0);
    }
    if (progress <= 3) {
      this.strategyDefinedByAlgorithm.set(false);
    }
  }

  selectStep(stepId: number) {
    if (this.editingClient() && stepId <= this.editingClient()!.progress) {
      this.activeStepId.set(stepId);
    }
  }
  
  closeModal() {
    this.close.emit();
  }

  saveChanges() {
    if (this.editingClient()) {
      const savedClient = this.editingClient()!;
      this.clientUpdate.emit(savedClient);
      this.notificationService.show(SUCCESS_NOTIFICATION_MESSAGE);

      // Clean up localStorage on successful save
      const storageKey = `${ANNOTATIONS_STORAGE_KEY_PREFIX}${savedClient.account}`;
      localStorage.removeItem(storageKey);
    }
  }

  updateAnnotations(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.editingClient.update(prev => prev ? { ...prev, annotations: value } : null);
  }

  private advanceProgress() {
    this.editingClient.update(prev => {
      if (!prev || prev.progress > prev.totalSteps) return prev;
      const newProgress = prev.progress + 1;
      const newStatus = newProgress > prev.totalSteps ? OnboardingStatus.Completed : OnboardingStatus.InProgress;
      const nextStep = { ...prev, progress: newProgress, status: newStatus };
      this.activeStepId.set(nextStep.progress);
      return nextStep;
    });
  }

  // Step 1 Logic
  completeFormAndContractStep() {
    this.advanceProgress();
  }

  // Step 2 Logic
  advanceAccountLinkStatus() {
    if (this.interactiveAccountLinkSubStatusIndex() < this.accountLinkSubSteps.length - 1) {
      this.interactiveAccountLinkSubStatusIndex.update(i => i + 1);
      if (this.interactiveAccountLinkSubStatusIndex() === this.accountLinkSubSteps.length - 1) {
        this.advanceProgress();
      }
    }
  }

  // Step 3 Logic
  selectAssetAllocationAlgorithm() {
    const client = this.editingClient();
    if (!client) return;

    this.router.navigate(['/allocations/new'], {
      queryParams: {
        path: 'guided',
        clientId: client.account
      }
    });
    this.closeModal();
  }
  
  markStrategyAsComplete() {
     this.advanceProgress();
  }

  // Step 4 Logic
  handleSimulateDeposit() {
    this.editingClient.update(prev => {
      if (!prev) return null;
      return { ...prev, balance: 50000 };
    });
    this.advanceProgress();
  }
  
  concludeFinalStep() {
    this.advanceProgress();
  }
}