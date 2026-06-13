import { Component, computed, inject } from '@angular/core';
import { TopRow } from './layout/top-row/top-row';
import { BottomRow } from './layout/bottom-row/bottom-row';
import { FocusService } from './features/focus/focus-service';
import { MainArea } from './layout/main-area/main-area';

@Component({
  selector: 'app-root',
  imports: [
    TopRow,
    BottomRow,
    MainArea,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  focusMode = computed(() => this.focusService.inFocusMode());


  private readonly focusService = inject(FocusService);
}
