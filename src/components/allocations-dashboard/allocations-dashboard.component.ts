import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AllocationsService } from '../../services/allocations.service';
import { Order, OrderStatus } from '../../types';

interface StatusCard {
  id: OrderStatus;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-allocations-dashboard',
  templateUrl: './allocations-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class AllocationsDashboardComponent {
  private router = inject(Router);
  private allocationsService = inject(AllocationsService);

  allOrders = this.allocationsService.getOrders();
  isLoading = signal(true);
  
  activeStatusFilter = signal<OrderStatus | null>(null);
  searchTerm = signal('');
  
  statusCards = computed<StatusCard[]>(() => [
    { id: OrderStatus.Aberta, label: 'Aberta', icon: 'trend', color: 'bg-gray-400' },
    { id: OrderStatus.ComPendencia, label: 'Com Pendência', icon: 'pending', color: 'bg-status-warning' },
    { id: OrderStatus.EmTratamento, label: 'Em Tratamento', icon: 'treatment', color: 'bg-gray-400' },
    { id: OrderStatus.Executada, label: 'Executada', icon: 'executed', color: 'bg-status-success' },
    { id: OrderStatus.Rejeitada, label: 'Rejeitada', icon: 'rejected', color: 'bg-status-error' },
    { id: OrderStatus.Fechada, label: 'Fechada', icon: 'closed', color: 'bg-gray-400' },
  ]);

  statusCounts = computed(() => {
    const counts: { [key in OrderStatus]?: number } = {};
    for(const order of this.allOrders()){
      counts[order.status] = (counts[order.status] || 0) + 1;
    }
    return counts;
  });

  filteredOrders = computed(() => {
    const status = this.activeStatusFilter();
    const term = this.searchTerm().toLowerCase();
    
    let orders = this.allOrders();

    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    if (term) {
      orders = orders.filter(order =>
        order.id.toLowerCase().includes(term) ||
        order.client.name.toLowerCase().includes(term)
      );
    }
    
    // Sort by favorite, then by date
    return orders.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      const dateA = this.parseDate(a.createdDate);
      const dateB = this.parseDate(b.createdDate);
      return dateB.getTime() - dateA.getTime();
    });
  });

  constructor() {
    // Simulate data fetching delay
    setTimeout(() => {
      this.isLoading.set(false);
    }, 1200);
  }

  private parseDate(dateString: string): Date {
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes] = timePart.split(':');
    return new Date(+year, +month - 1, +day, +hours, +minutes);
  }
  
  getStatusInfo(status: OrderStatus): { color: string; bgColor: string; icon: string } {
    switch (status) {
      case OrderStatus.Aberta: return { color: 'text-gray-600', bgColor: 'bg-gray-200', icon: 'trend' };
      case OrderStatus.ComPendencia: return { color: 'text-yellow-800', bgColor: 'bg-yellow-100', icon: 'pending' };
      case OrderStatus.EmTratamento: return { color: 'text-gray-600', bgColor: 'bg-gray-200', icon: 'treatment' };
      case OrderStatus.Executada: return { color: 'text-green-800', bgColor: 'bg-green-100', icon: 'executed_circle' };
      case OrderStatus.Rejeitada: return { color: 'text-red-800', bgColor: 'bg-red-100', icon: 'rejected' };
      case OrderStatus.Fechada: return { color: 'text-gray-600', bgColor: 'bg-gray-200', icon: 'closed' };
      default: return { color: 'text-gray-800', bgColor: 'bg-gray-100', icon: 'help-circle' };
    }
  }
  
  updateSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
  
  selectStatus(status: OrderStatus) {
    if (this.activeStatusFilter() === status) {
      this.activeStatusFilter.set(null);
    } else {
      this.activeStatusFilter.set(status);
    }
  }

  toggleFavorite(orderId: string) {
    this.allocationsService.toggleFavorite(orderId);
  }
  
  navigateToOrder(orderId: string) {
    this.router.navigate(['/allocations', orderId]);
  }
}