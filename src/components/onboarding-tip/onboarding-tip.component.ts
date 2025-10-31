import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-onboarding-tip',
  template: `
    <div class="group relative flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-label cursor-help">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs p-3 bg-foreground text-background text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {{ tipText() }}
        <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-foreground"></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingTipComponent {
  tipText = input.required<string>();
}
