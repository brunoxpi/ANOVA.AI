import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ClientRegistrationComponent } from './components/client-registration/client-registration.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'register', component: ClientRegistrationComponent },
  {
    path: 'allocations',
    loadComponent: () => import('./components/allocations-dashboard/allocations-dashboard.component').then(m => m.AllocationsDashboardComponent),
  },
  {
    path: 'allocations/new',
    loadComponent: () => import('./components/new-order/new-order.component').then(m => m.NewOrderComponent),
  },
  {
    path: 'allocations/:id',
    loadComponent: () => import('./components/order-detail/order-detail.component').then(m => m.OrderDetailComponent),
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./components/portfolio/portfolio.component').then(m => m.PortfolioComponent),
  },
  {
    path: 'finance',
    loadComponent: () => import('./components/finance/finance.component').then(m => m.FinanceComponent),
  }
];