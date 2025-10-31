import { Injectable, signal } from '@angular/core';
import { ClientRates } from '../components/define-rates-modal/define-rates-modal.component';

@Injectable({
  providedIn: 'root',
})
export class ClientRegistrationService {
  clientRates = signal<ClientRates | null>(null);

  setRates(rates: ClientRates) {
    this.clientRates.set(rates);
  }
}
