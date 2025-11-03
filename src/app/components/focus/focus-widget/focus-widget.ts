import { Component, inject } from '@angular/core';
import { FocusService } from '../focus-service';

@Component({
  selector: 'app-focus-widget',
  imports: [],
  templateUrl: './focus-widget.html',
})
export class FocusWidget {

  private readonly focusService = inject(FocusService);

  toggleFocusMode() {
    this.focusService.toggleFocusMode();
  }

}
