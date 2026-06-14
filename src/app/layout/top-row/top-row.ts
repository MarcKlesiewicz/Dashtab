import { Component, computed, inject } from '@angular/core';
import { MoveWidget } from '../../features/move/move-widget';
import { FocusWidget } from '../../features/focus/focus-widget/focus-widget';
import { WeatherWidget } from '../../features/weather/weather-widget/weather-widget';
import { FocusService } from '../../features/focus/focus-service';

@Component({
  selector: 'app-top-row',
  templateUrl: './top-row.html',
  imports: [MoveWidget, FocusWidget, WeatherWidget],
})
export class TopRow {
  private readonly focusService = inject(FocusService);

  readonly focusMode = computed(() => this.focusService.inFocusMode());
}
