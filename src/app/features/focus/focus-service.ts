import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FocusService {
  inFocusMode = signal(false);

  toggleFocusMode() {
    this.inFocusMode.set(!this.inFocusMode());
  }

}
