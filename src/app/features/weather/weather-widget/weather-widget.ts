import { Component, inject } from '@angular/core';
import { WeatherService } from '../weather-service';

@Component({
  selector: 'app-weather-widget',
  templateUrl: './weather-widget.html',
  styleUrl: './weather-widget.scss',
})
export class WeatherWidget {
  private readonly weatherService = inject(WeatherService);

  readonly weather = this.weatherService.weather;
  readonly isLoading = this.weatherService.isLoading;
  readonly hasError = this.weatherService.hasError;
  readonly condition = this.weatherService.condition;
  readonly iconClass = this.weatherService.iconClass;

  refreshWeather(): void {
    this.weatherService.refreshNow();
  }

  toggleLocation(): void {
    this.weatherService.toggleLocation();
  }
}
