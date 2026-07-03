import { DatePipe } from '@angular/common';
import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-clock-widget',
  templateUrl: './clock-widget.html',
  styleUrl: './clock-widget.scss',
})
export class ClockWidget implements OnInit, OnDestroy {
  readonly currentTime = signal(new Date());
  readonly isSyncing = signal(false);

  private timerId?: number;
  private resumeSyncTimeoutId?: number;
  private lastSyncTimestamp = Date.now();

  readonly hours = computed<string>(() => {
    return new DatePipe('en-US').transform(this.currentTime(), 'HH') || '';
  });

  readonly minutes = computed<string>(() => {
    return new DatePipe('en-US').transform(this.currentTime(), 'mm') || '';
  });

  ngOnInit(): void {
    this.syncCurrentTime(true);
    this.timerId = window.setInterval(() => this.syncCurrentTime(), 1000);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleWindowResume);
    window.addEventListener('pageshow', this.handleWindowResume);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    if (this.resumeSyncTimeoutId) {
      clearTimeout(this.resumeSyncTimeoutId);
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleWindowResume);
    window.removeEventListener('pageshow', this.handleWindowResume);
  }

  private readonly handleVisibilityChange = (): void => {
    if (!document.hidden) {
      this.syncCurrentTime(true);
    }
  };

  private readonly handleWindowResume = (): void => {
    this.syncCurrentTime(Date.now() - this.lastSyncTimestamp > 2000);
  };

  private syncCurrentTime(suppressAnimation = false): void {
    if (suppressAnimation) {
      this.isSyncing.set(true);
    }

    const now = new Date();
    this.lastSyncTimestamp = now.getTime();
    this.currentTime.set(now);

    if (suppressAnimation) {
      if (this.resumeSyncTimeoutId) {
        clearTimeout(this.resumeSyncTimeoutId);
      }

      this.resumeSyncTimeoutId = window.setTimeout(() => {
        this.isSyncing.set(false);
        this.resumeSyncTimeoutId = undefined;
      }, 100);
    }
  }
}
