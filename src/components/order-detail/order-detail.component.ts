import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AllocationsService } from '../../services/allocations.service';
import { Order, OrderStatus, OrderTimelineEventType } from '../../types';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class OrderDetailComponent {
  private route = inject(ActivatedRoute);
  private allocationsService = inject(AllocationsService);

  private orderId = signal<string | null>(null);
  isLoading = signal(true);
  
  // Expose OrderStatus enum to the template
  OrderStatus = OrderStatus;

  order = computed(() => {
    const id = this.orderId();
    if (!id) return null;
    return this.allocationsService.getOrderById(id);
  });
  
  newComment = signal('');

  constructor() {
    this.route.paramMap.subscribe(params => {
      this.orderId.set(params.get('id'));
    });

    // Simulate data fetching delay
    setTimeout(() => {
      this.isLoading.set(false);
    }, 800);
  }

  getTimelineEventInfo(type: OrderTimelineEventType) {
    switch (type) {
      case OrderTimelineEventType.Log:
        return { icon: 'history', color: 'bg-gray-200' };
      case OrderTimelineEventType.Comment:
        return { icon: 'message-square', color: 'bg-blue-100' };
      case OrderTimelineEventType.File:
        return { icon: 'paperclip', color: 'bg-green-100' };
      default:
        return { icon: 'info', color: 'bg-gray-200' };
    }
  }

  // FIX: Aligned status cases with the OrderStatus enum to resolve compilation errors.
  getStatusInfo(status: OrderStatus | undefined) {
    if (!status) return { color: 'text-gray-800', bgColor: 'bg-gray-100' };
    switch (status) {
      case OrderStatus.Aberta: return { color: 'text-blue-800', bgColor: 'bg-blue-100' };
      case OrderStatus.ComPendencia: return { color: 'text-yellow-800', bgColor: 'bg-yellow-100' };
      case OrderStatus.EmTratamento: return { color: 'text-gray-600', bgColor: 'bg-gray-200' };
      case OrderStatus.Executada: return { color: 'text-green-800', bgColor: 'bg-green-100' };
      case OrderStatus.Rejeitada: return { color: 'text-red-800', bgColor: 'bg-red-100' };
      case OrderStatus.Fechada: return { color: 'text-gray-600', bgColor: 'bg-gray-200' };
      default: return { color: 'text-gray-800', bgColor: 'bg-gray-100' };
    }
  }

  addComment() {
    const commentText = this.newComment().trim();
    const id = this.orderId();
    if (!commentText || !id) return;
    
    // In a real app, we'd get the current user's name
    this.allocationsService.addCommentToOrder(id, 'Admin', commentText);
    this.newComment.set('');
  }
  
  changeStatus(status: OrderStatus) {
    const id = this.orderId();
    if (!id) return;
    this.allocationsService.updateOrderStatus(id, status);
  }
}