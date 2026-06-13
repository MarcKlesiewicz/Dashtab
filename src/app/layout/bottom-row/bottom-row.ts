import { Component } from '@angular/core';
import { SettingsPanel } from '../../features/settings/settings-panel/settings-panel';

@Component({
  selector: 'app-bottom-row',
  imports: [SettingsPanel],
  templateUrl: './bottom-row.html',
})
export class BottomRow {}
