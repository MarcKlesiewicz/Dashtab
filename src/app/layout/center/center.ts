import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-center',
  templateUrl: './center.html',
})
export class Center implements OnInit, OnDestroy {
  currentTime = signal(new Date());
  private timerId?: number;

  hours = computed<string>(() => {
    return new DatePipe('en-US').transform(this.currentTime(), 'HH') || '';
  });

  minutes = computed<string>(() => {
    return new DatePipe('en-US').transform(this.currentTime(), 'mm') || '';
  });

  greeting = computed<string>(() => {
    const hour = this.currentTime().getHours();
    if (hour < 12) {
      return 'Good morning, Marc.';
    } else if (hour < 18) {
      return 'Good afternoon, Marc.';
    } else {
      return 'Good evening, Marc.';
    }
  })

  ngOnInit() {
    this.timerId = window.setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }
}
