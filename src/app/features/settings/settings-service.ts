import { computed, effect, Injectable, signal } from '@angular/core';

export interface DashboardSettings {
  focusDurationMinutes: number;
  sittingDurationMinutes: number;
  standingDurationMinutes: number;
}

const defaultSettings: DashboardSettings = {
  focusDurationMinutes: 25,
  sittingDurationMinutes: 120,
  standingDurationMinutes: 30,
};

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly storageKey = 'dashboard.settings';
  private readonly settingsState = signal<DashboardSettings>(this.restoreSettings());

  readonly settings = computed(() => this.settingsState());
  readonly focusDurationSeconds = computed(() => this.settings().focusDurationMinutes * 60);
  readonly sittingDurationSeconds = computed(() => this.settings().sittingDurationMinutes * 60);
  readonly standingDurationSeconds = computed(() => this.settings().standingDurationMinutes * 60);

  constructor() {
    effect(() => {
      this.persistSettings(this.settingsState());
    });
  }

  updateSettings(settings: Partial<DashboardSettings>): void {
    this.settingsState.update((current) => ({
      ...current,
      ...this.sanitizeSettings(settings),
    }));
  }

  resetSettings(): void {
    this.settingsState.set({ ...defaultSettings });
  }

  private restoreSettings(): DashboardSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return { ...defaultSettings };
      }

      const parsed = JSON.parse(stored) as Partial<DashboardSettings>;
      return {
        ...defaultSettings,
        ...this.sanitizeSettings(parsed),
      };
    } catch {
      return { ...defaultSettings };
    }
  }

  private persistSettings(settings: DashboardSettings): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch {
      // Ignore storage failures; defaults/in-memory settings still work.
    }
  }

  private sanitizeSettings(settings: Partial<DashboardSettings>): Partial<DashboardSettings> {
    return {
      ...(settings.focusDurationMinutes !== undefined
        ? { focusDurationMinutes: this.cleanMinutes(settings.focusDurationMinutes, 1, 180) }
        : {}),
      ...(settings.sittingDurationMinutes !== undefined
        ? { sittingDurationMinutes: this.cleanMinutes(settings.sittingDurationMinutes, 1, 360) }
        : {}),
      ...(settings.standingDurationMinutes !== undefined
        ? { standingDurationMinutes: this.cleanMinutes(settings.standingDurationMinutes, 1, 180) }
        : {}),
    };
  }

  private cleanMinutes(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }

    return Math.min(max, Math.max(min, Math.round(value)));
  }
}
