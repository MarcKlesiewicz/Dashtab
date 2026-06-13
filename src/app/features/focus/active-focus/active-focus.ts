import { Component, inject } from '@angular/core';
import { FocusService } from '../focus-service';

@Component({
  selector: 'app-active-focus',
  templateUrl: './active-focus.html',
  styleUrl: './active-focus.scss',
})
export class ActiveFocus {
  private readonly focusService = inject(FocusService);

  readonly session = this.focusService.session;
  readonly status = this.focusService.status;
  readonly displayTime = this.focusService.displayTime;
  readonly progress = this.focusService.progress;

  updateIntention(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.focusService.updateIntention(input.value);
  }

  togglePause(): void {
    if (this.focusService.isPaused()) {
      this.focusService.resumeSession();
      return;
    }

    this.focusService.pauseSession();
  }

  finishSession(): void {
    this.focusService.completeSession();
  }

  cancelSession(): void {
    this.focusService.cancelSession();
  }

  returnHome(): void {
    this.focusService.returnHome();
  }
}
