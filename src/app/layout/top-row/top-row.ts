import { Component } from '@angular/core';
import { MoveWidget } from '../../features/move/move-widget';
import { FocusWidget } from '../../features/focus/focus-widget/focus-widget';
import { WeatherWidget } from '../../features/weather/weather-widget/weather-widget';

@Component({
  selector: 'app-top-row',
  templateUrl: './top-row.html',
  imports: [MoveWidget, FocusWidget, WeatherWidget],
})
export class TopRow {}
