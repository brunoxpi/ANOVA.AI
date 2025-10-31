import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

export interface ClientRates {
  adminFee: string;
  performanceFee: string;
}

@Component({
  selector: 'app-define-rates-modal',
  templateUrl: './define-rates-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefineRatesModalComponent {
  close = output<void>();
  save = output<ClientRates>();

  adminFee = signal('0,5');
  performanceFee = signal('10');

  updateAdminFee(event: Event) {
    this.adminFee.set((event.target as HTMLInputElement).value);
  }

  updatePerformanceFee(event: Event) {
    this.performanceFee.set((event.target as HTMLInputElement).value);
  }

  onClose() {
    this.close.emit();
  }

  onSave() {
    this.save.emit({
      adminFee: this.adminFee(),
      performanceFee: this.performanceFee(),
    });
  }
}