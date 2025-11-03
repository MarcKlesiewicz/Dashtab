import { Component, computed, inject } from '@angular/core';
import { Center } from './layout/center/center';
import { TopRow } from './layout/top-row/top-row';
import { FocusService } from './components/focus/focus-service';

@Component({
  selector: 'app-root',
  imports: [
    Center,
    TopRow
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  focusMode = computed(() => this.focusService.inFocusMode());

  
  private readonly focusService = inject(FocusService);
}
