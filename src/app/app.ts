import { Component } from '@angular/core';
import { Center } from './components/center/center';
import { TopRow } from './components/top-row/top-row';

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
