import { Component } from '@angular/core';
import { Center } from './layout/center/center';
import { TopRow } from './layout/top-row/top-row';

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
}
