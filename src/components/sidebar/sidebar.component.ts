import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavItem {
  id: string;
  label: string;
  iconId: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private router = inject(Router);
  activeItem = signal('clients');
  
  navItems = signal<NavItem[]>([
    { id: 'clients', label: 'Clientes', iconId: 'clients', path: '/dashboard' },
    { id: 'allocations', label: 'Central de alocações', iconId: 'allocations', path: '/allocations' },
    { id: 'portfolio', label: 'Carteira', iconId: 'portfolio', path: '/portfolio' },
    { id: 'finance', label: 'Financeiro', iconId: 'finance', path: '/finance' },
  ]);

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const currentUrl = event.urlAfterRedirects;
      const matchingNavItem = this.navItems().find(item => currentUrl.startsWith(item.path));
      if (matchingNavItem) {
        this.activeItem.set(matchingNavItem.id);
      }
    });
  }

  navigateTo(path: string, itemId: string) {
    this.activeItem.set(itemId);
    this.router.navigate([path]);
  }
}