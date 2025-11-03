import { Component } from '@angular/core';
import { MoveWidget } from '../../components/move-widget/move-widget';
import { FocusWidget } from '../../components/focus/focus-widget/focus-widget';

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
