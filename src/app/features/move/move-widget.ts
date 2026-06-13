import { Component, inject } from '@angular/core';
import { MoveService } from './move-service';

@Component({
  selector: 'app-move-widget',
  templateUrl: './move-widget.html',
  styleUrl: './move-widget.scss',
})
export class MoveWidget {
  private readonly moveService = inject(MoveService);

  readonly phase = this.moveService.phase;
  readonly status = this.moveService.status;
  readonly isActive = this.moveService.isActive;
  readonly isAwaitingAck = this.moveService.isAwaitingAck;
  readonly label = this.moveService.label;
  readonly actionLabel = this.moveService.actionLabel;
  readonly progress = this.moveService.progress;

  primaryAction(): void {
    this.moveService.primaryAction();
  }

  resetSession(): void {
    this.moveService.resetSession();
  }
}
