import { Component, computed, inject, signal } from '@angular/core';
import { SettingsService } from '../settings-service';

@Component({
  selector: 'app-settings-panel',
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.scss',
})
export class SettingsPanel {
  private readonly settingsService = inject(SettingsService);

  readonly settings = this.settingsService.settings;
  readonly isOpen = signal(false);
  readonly focusDurationMinutes = signal(this.settings().focusDurationMinutes);
  readonly sittingDurationMinutes = signal(this.settings().sittingDurationMinutes);
  readonly standingDurationMinutes = signal(this.settings().standingDurationMinutes);

  readonly summary = computed(() => {
    const settings = this.settings();
    return `${settings.focusDurationMinutes}m focus · ${settings.sittingDurationMinutes}m sit · ${settings.standingDurationMinutes}m stand`;
  });

  togglePanel(): void {
    if (!this.isOpen()) {
      this.syncDraft();
    }
    this.isOpen.set(!this.isOpen());
  }

  closePanel(): void {
    this.isOpen.set(false);
  }

  updateFocusDuration(event: Event): void {
    this.focusDurationMinutes.set((event.target as HTMLInputElement).valueAsNumber);
  }

  updateSittingDuration(event: Event): void {
    this.sittingDurationMinutes.set((event.target as HTMLInputElement).valueAsNumber);
  }

  updateStandingDuration(event: Event): void {
    this.standingDurationMinutes.set((event.target as HTMLInputElement).valueAsNumber);
  }

  saveSettings(): void {
    this.settingsService.updateSettings({
      focusDurationMinutes: this.focusDurationMinutes(),
      sittingDurationMinutes: this.sittingDurationMinutes(),
      standingDurationMinutes: this.standingDurationMinutes(),
    });
    this.syncDraft();
    this.closePanel();
  }

  resetSettings(): void {
    this.settingsService.resetSettings();
    this.syncDraft();
  }

  private syncDraft(): void {
    const settings = this.settings();
    this.focusDurationMinutes.set(settings.focusDurationMinutes);
    this.sittingDurationMinutes.set(settings.sittingDurationMinutes);
    this.standingDurationMinutes.set(settings.standingDurationMinutes);
  }
}
