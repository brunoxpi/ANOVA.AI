import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceComponent {}
