import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-move-widget',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './move-widget.html',
  styleUrl: './move-widget.scss',
})
export class MoveWidget implements OnInit, OnDestroy {
  // Durations in hours
  standupHour = 1;
  sitdownHour = 2;

  private timerSub?: Subscription;

  // State
  readonly isSitdown = signal(true); // true = sitting (chair icon), false = standing (walking icon)
  readonly isRunning = signal(false); // countdown is active
  readonly awaitingAck = signal(false); // countdown finished; wait for user click to start next period
  readonly periodEndMs = signal<number | null>(null); // epoch ms when current period ends

  // Derived
  readonly countdownSeconds = signal(0);
  readonly hoursLeft = computed(() => Math.floor(this.countdownSeconds() / 3600));
  readonly minutesLeft = computed(() => Math.floor((this.countdownSeconds() % 3600) / 60));
  readonly minutesLeftPadded = computed(() => this.minutesLeft().toString().padStart(2, '0'));

  ngOnInit(): void {
    this.restoreState();
    // 1s ticker to update the countdown
    this.timerSub = interval(1000).subscribe(() => this.updateCountdown());
    // Initial update on load
    this.updateCountdown();
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }

  // User interaction
  action(): void {
    if (this.isRunning()) {
      // Ignore clicks while countdown is running
      return;
    }

    if (this.awaitingAck()) {
      // Acknowledge finished period and start the next one
      this.isSitdown.set(!this.isSitdown());
      this.startMoveTimer();
      return;
    }

    // First click of the day: start the sitdown period by default (isSitdown defaults to true)
    this.startMoveTimer();
  }

  // Starts a new period based on current phase (sit/stand)
  startMoveTimer(): void {
    const hours = this.isSitdown() ? this.sitdownHour : this.standupHour;
    const end = Date.now() + hours * 3600_000; // ms

    this.periodEndMs.set(end);
    this.isRunning.set(true);
    this.awaitingAck.set(false);

    this.updateCountdown();
    this.saveState();
  }

  stopMoveTimer() {
    this.isRunning.set(false);
    this.isSitdown.set(true);
    this.awaitingAck.set(false);
    this.periodEndMs.set(null);

    this.saveState();
  }

  private updateCountdown(): void {
    if (!this.isRunning()) {
      this.countdownSeconds.set(0);
      return;
    }

    const end = this.periodEndMs();
    if (!end) {
      this.isRunning.set(false);
      this.countdownSeconds.set(0);
      this.saveState();
      return;
    }

    const now = Date.now();
    const remainingSec = Math.ceil((end - now) / 1000);

    if (remainingSec > 0) {
      this.countdownSeconds.set(remainingSec);
    } else {
      // Period finished: stop timer and wait for user to acknowledge
      this.countdownSeconds.set(0);
      this.isRunning.set(false);
      this.awaitingAck.set(true);
      this.saveState();
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem('mw.isSitdown', JSON.stringify(this.isSitdown()));
      localStorage.setItem('mw.isRunning', JSON.stringify(this.isRunning()));
      localStorage.setItem('mw.awaitingAck', JSON.stringify(this.awaitingAck()));
      localStorage.setItem('mw.periodEndMs', JSON.stringify(this.periodEndMs()));
    } catch {
      // ignore storage errors
    }
  }

  private restoreState(): void {
    try {
      const isSitdown = JSON.parse(localStorage.getItem('mw.isSitdown') ?? 'true');
      const isRunning = JSON.parse(localStorage.getItem('mw.isRunning') ?? 'false');
      const awaitingAck = JSON.parse(localStorage.getItem('mw.awaitingAck') ?? 'false');
      const periodEndMs = JSON.parse(localStorage.getItem('mw.periodEndMs') ?? 'null');

      this.isSitdown.set(!!isSitdown);
      this.awaitingAck.set(!!awaitingAck);
      this.periodEndMs.set(typeof periodEndMs === 'number' ? periodEndMs : null);

      // Derive running/ack state based on current time
      if (periodEndMs && isRunning) {
        const now = Date.now();
        if (now < periodEndMs) {
          this.isRunning.set(true);
        } else {
          this.isRunning.set(false);
          this.awaitingAck.set(true);
        }
      } else {
        this.isRunning.set(false);
      }
    } catch {
      // use defaults
    }
  }
}
