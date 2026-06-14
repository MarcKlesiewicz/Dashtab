import { Component, inject } from '@angular/core';
import { WaterService } from '../water-service';

@Component({
  selector: 'app-water-widget',
  templateUrl: './water-widget.html',
  styleUrl: './water-widget.scss',
})
export class WaterWidget {
  private readonly waterService = inject(WaterService);

  readonly targetMl = this.waterService.targetMl;
  readonly drinkStepMl = this.waterService.drinkStepMl;
  readonly levelMl = this.waterService.levelMl;
  readonly levelPercent = this.waterService.levelPercent;
  readonly consumedMl = this.waterService.consumedMl;
  readonly isWaiting = this.waterService.isWaiting;

  logWater(): void {
    this.waterService.logWater();
  }
}
