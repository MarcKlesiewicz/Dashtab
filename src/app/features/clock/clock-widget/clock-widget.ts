import { DatePipe } from '@angular/common';
import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-clock-widget',
  templateUrl: './clock-widget.html',
})
export class ClockWidget implements OnInit, OnDestroy {
  readonly currentTime = signal(new Date());

  private timerId?: number;

  readonly hours = computed<string>(() => {
    return new DatePipe('en-US').transform(this.currentTime(), 'HH') || '';
  });

  readonly minutes = computed<string>(() => {
    return new DatePipe('en-US').transform(this.currentTime(), 'mm') || '';
  });

  ngOnInit(): void {
    this.timerId = window.setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }
}
