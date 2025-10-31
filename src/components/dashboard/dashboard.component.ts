import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Client, OnboardingStatus } from '../../types';
import { OnboardingModalComponent } from '../onboarding-modal/onboarding-modal.component';
import { DefineRatesModalComponent, ClientRates } from '../define-rates-modal/define-rates-modal.component';
import { ClientRegistrationService } from '../../services/client-registration.service';
import { OnboardingTipComponent } from '../onboarding-tip/onboarding-tip.component';

interface Stat {
  title: string;
  value: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OnboardingModalComponent, DefineRatesModalComponent, OnboardingTipComponent],
})
export class DashboardComponent {
  private router = inject(Router);
  private clientRegistrationService = inject(ClientRegistrationService);
  isLoading = signal(true);

  stats = signal<Stat[]>([
    { title: 'Total de Clientes', value: '6' },
    { title: 'Em Andamento', value: '2' },
    { title: 'Concluídos', value: '4' },
    { title: 'Taxa de Conclusão', value: '67%' },
  ]);

  clients = signal<Client[]>([
    { account: '8574921', name: 'Marcelo Vitor Goncalves', assessor: 'Maria Oliveira', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 15000, registrationDate: '21/10/2025' },
    { account: '10984572', name: 'Ana Paula Costa', assessor: 'Carlos Mendes', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 25000, registrationDate: '20/10/2025' },
    { account: '33450912', name: 'Pedro Henrique Lima', assessor: 'Juliana Ferreira', status: OnboardingStatus.InProgress, progress: 1, totalSteps: 4, balance: 0, registrationDate: '19/10/2025' },
    { account: '72103465', name: 'Mariana Souza Alves', assessor: 'Roberto Santos', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 5000, registrationDate: '16/10/2025' },
    { account: '50672198', name: 'Lucas Rodrigues Martins', assessor: 'Fernanda Dias', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 100000, registrationDate: '12/10/2025' },
    { account: '98765432', name: 'Beatriz Almeida', assessor: 'Ricardo Gomes', status: OnboardingStatus.InProgress, progress: 3, totalSteps: 4, balance: 0, registrationDate: '11/10/2025' },
    { account: '12345678', name: 'Guilherme Ribeiro', assessor: 'Maria Oliveira', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 7500, registrationDate: '10/10/2025' },
  ]);

  searchTerm = signal('');
  
  selectedClient = signal<Client | null>(null);
  isDefineRatesModalOpen = signal(false);

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.clients();
    }
    return this.clients().filter(client => 
      client.name.toLowerCase().includes(term) ||
      client.account.toLowerCase().includes(term) ||
      client.assessor.toLowerCase().includes(term) ||
      client.registrationDate.toLowerCase().includes(term)
    );
  });

  currentPage = signal(1);
  itemsPerPage = signal(5);

  totalPages = computed(() => Math.ceil(this.filteredClients().length / this.itemsPerPage()));
  
  paginatedClients = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredClients().slice(start, end);
  });

  constructor() {
    // Simulate data fetching delay
    setTimeout(() => {
      this.isLoading.set(false);
    }, 1000);
  }

  updateSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  getOnboardingProgress(client: Client): number {
    if (client.status === OnboardingStatus.InProgress && client.progress && client.totalSteps && client.totalSteps > 0) {
      return (client.progress / client.totalSteps) * 100;
    }
    return 0;
  }

  selectClient(client: Client) {
    this.selectedClient.set(client);
  }

  closeModal() {
    this.selectedClient.set(null);
  }

  handleClientUpdate(updatedClient: Client) {
    this.clients.update(clients => 
      clients.map(c => c.account === updatedClient.account ? updatedClient : c)
    );
    this.closeModal();
  }

  openDefineRatesModal() {
    this.isDefineRatesModalOpen.set(true);
  }

  closeDefineRatesModal() {
    this.isDefineRatesModalOpen.set(false);
  }

  handleRatesDefined(rates: ClientRates) {
    this.clientRegistrationService.setRates(rates);
    this.closeDefineRatesModal();
    this.router.navigate(['/register']);
  }
}
