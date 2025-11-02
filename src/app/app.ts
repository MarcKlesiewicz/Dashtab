import { Component } from '@angular/core';
import { Center } from './components/center/center';

@Component({
  selector: 'app-root',
  imports: [
    Center
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
