import { Component, computed, effect, inject, signal } from '@angular/core';
import { FocusService } from '../focus-service';

@Component({
  selector: 'app-active-focus',
  templateUrl: './active-focus.html',
})
export class ActiveFocus {
  //TODO: Make duration configurable
  readonly totalSeconds = 25 * 60;

  readonly remainingSeconds = signal(this.totalSeconds);
  readonly isRunning = signal(true);

  readonly minutes = computed(() => Math.floor(this.remainingSeconds() / 60));
  readonly seconds = computed(() => String(this.remainingSeconds() % 60).padStart(2, '0'));

  readonly progress = computed(() => {
    const completed = this.totalSeconds - this.remainingSeconds();
    return Math.round((completed / this.totalSeconds) * 100);
  });

  private readonly focusService = inject(FocusService);

  constructor() {
    effect(
      (onCleanup) => {
        if (!this.isRunning()) {
          return;
        }

        const intervalId = setInterval(() => {
          const current = this.remainingSeconds();
          if (current > 0) {
            this.remainingSeconds.set(current - 1);
          }
          if (current - 1 <= 0) {
            this.isRunning.set(false);
            this.focusService.toggleFocusMode();
          }
        }, 1000);

        onCleanup(() => clearInterval(intervalId));
      },
    );
  }

}
