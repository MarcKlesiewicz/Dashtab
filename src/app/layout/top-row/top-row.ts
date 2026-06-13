import { Component } from '@angular/core';
import { MoveWidget } from '../../features/move/move-widget';
import { FocusWidget } from '../../features/focus/focus-widget/focus-widget';

@Component({
  selector: 'app-top-row',
  templateUrl: './top-row.html',
  imports: [
    MoveWidget,
    FocusWidget
  ]
})
export class TopRow {

}
