import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MoveService } from '../../move/move-service';

@Component({
  selector: 'app-greeting-widget',
  templateUrl: './greeting-widget.html',
})
export class GreetingWidget implements OnInit, OnDestroy {
  readonly currentTime = signal(new Date());

  private readonly moveService = inject(MoveService);
  private timerId?: number;

  readonly greeting = computed<string>(() => {
    if (this.moveService.isAwaitingAck()) {
      return this.moveService.phase() === 'sitting'
        ? 'Time to move, Marc.'
        : 'Time to sit down, Marc.';
    }

    const hour = this.currentTime().getHours();
    if (hour < 12) {
      return 'Good morning, Marc.';
    }
    if (hour < 18) {
      return 'Good afternoon, Marc.';
    }
    return 'Good evening, Marc.';
  });

  ngOnInit(): void {
    this.timerId = window.setInterval(() => {
      this.currentTime.set(new Date());
    }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }
}
