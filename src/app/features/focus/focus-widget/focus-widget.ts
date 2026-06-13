import { Component, computed, inject } from '@angular/core';
import { FocusService } from '../focus-service';

@Component({
  selector: 'app-focus-widget',
  imports: [],
  templateUrl: './focus-widget.html',
})
export class FocusWidget {
  private readonly focusService = inject(FocusService);

  readonly status = this.focusService.status;
  readonly label = computed(() => {
    if (this.focusService.isRunning()) {
      return 'Pause';
    }
    if (this.focusService.isPaused()) {
      return 'Resume';
    }
    if (this.focusService.isCompleted()) {
      return 'Done';
    }
    return 'Focus';
  });

  handleClick(): void {
    if (this.focusService.isRunning()) {
      this.focusService.pauseSession();
      return;
    }

    if (this.focusService.isPaused()) {
      this.focusService.resumeSession();
      return;
    }

    this.focusService.startSession();
  }
}
