import { Component, computed, inject } from '@angular/core';
import { Center } from './layout/center/center';
import { TopRow } from './layout/top-row/top-row';
import { FocusService } from './features/focus/focus-service';
import { ActiveFocus } from './features/focus/active-focus/active-focus';
import { SettingsPanel } from './features/settings/settings-panel/settings-panel';

@Component({
  selector: 'app-root',
  imports: [
    Center,
    TopRow,
    ActiveFocus,
    SettingsPanel
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  focusMode = computed(() => this.focusService.inFocusMode());


  private readonly focusService = inject(FocusService);
}
