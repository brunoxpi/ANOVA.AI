

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private router = inject(Router);
  
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    )
  );

  pageTitle = computed(() => {
    const url = this.currentUrl() ?? '';
    if (url.startsWith('/dashboard') || url === '/') {
      return 'Clientes';
    }
    if (url.startsWith('/allocations')) {
      return 'Central de Alocações';
    }
    if (url.startsWith('/portfolio')) {
      return 'Carteira';
    }
    if (url.startsWith('/finance')) {
      return 'Financeiro';
    }
    if (url.startsWith('/register')) {
      return 'Cadastro de Cliente'
    }
    return 'ClientHub';
  });
}