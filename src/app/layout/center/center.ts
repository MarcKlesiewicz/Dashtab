import { Component } from '@angular/core';
import { ClockWidget } from '../../features/clock/clock-widget/clock-widget';
import { GreetingWidget } from '../../features/greeting/greeting-widget/greeting-widget';

@Component({
  selector: 'app-center',
  templateUrl: './center.html',
  imports: [ClockWidget, GreetingWidget],
})
export class Center {}
