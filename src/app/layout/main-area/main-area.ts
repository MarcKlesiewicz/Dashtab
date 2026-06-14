import { Component, computed, inject } from '@angular/core';
import { ActiveFocus } from '../../features/focus/active-focus/active-focus';
import { FocusService } from '../../features/focus/focus-service';
import { WaterWidget } from '../../features/water/water-widget/water-widget';
import { Center } from '../center/center';

@Component({
  selector: 'app-main-area',
  imports: [ActiveFocus, Center, WaterWidget],
  templateUrl: './main-area.html',
  styleUrl: './main-area.scss',
})
export class MainArea {
  private readonly focusService = inject(FocusService);

  readonly focusMode = computed(() => this.focusService.inFocusMode());
}
