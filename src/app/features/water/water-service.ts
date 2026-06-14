import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

type WaterStatus = 'idle' | 'running' | 'waiting' | 'complete';

interface WaterState {
  dateKey: string;
  status: WaterStatus;
  consumedMl: number;
  levelMl: number;
  segmentStartMl: number;
  segmentTargetMl: number;
  segmentStartedAt: number | null;
}

const targetMl = 1000;
const segmentMl = 250;
const dayStartHour = 8;
const dayEndHour = 16;
const segmentDurationMs = ((dayEndHour - dayStartHour) * 60 * 60 * 1000) / (targetMl / segmentMl);

const defaultState = (dateKey: string): WaterState => ({
  dateKey,
  status: 'idle',
  consumedMl: 0,
  levelMl: targetMl,
  segmentStartMl: targetMl,
  segmentTargetMl: targetMl - segmentMl,
  segmentStartedAt: null,
});

@Injectable({
  providedIn: 'root',
})
export class WaterService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'water.intake';
  private readonly now = signal(Date.now());
  private readonly state = signal<WaterState>(this.restoreState());
  private readonly tickerId = window.setInterval(() => this.tick(), 1000);

  readonly targetMl = targetMl;
  readonly drinkStepMl = segmentMl;

  readonly status = computed(() => this.state().status);
  readonly isWaiting = computed(() => this.status() === 'waiting');
  readonly consumedMl = computed(() => this.state().consumedMl);
  readonly levelMl = computed(() => this.currentLevelMl());
  readonly levelPercent = computed(() => Math.round((this.levelMl() / targetMl) * 100));

  constructor() {
    effect(() => {
      this.persistState(this.state());
    });
    this.destroyRef.onDestroy(() => clearInterval(this.tickerId));
    this.tick();
  }

  logWater(amountMl = segmentMl): void {
    this.state.update((state) => ({
      ...state,
      consumedMl: Math.min(targetMl, state.consumedMl + amountMl),
    }));

    if (this.isWaiting() && this.isCheckpointCovered(this.state().levelMl)) {
      this.continueToNextSegment();
    }
  }

  private start(): void {
    this.startSegment(targetMl, targetMl - segmentMl);
  }

  private continueToNextSegment(): void {
    const levelMl = this.state().levelMl;
    if (levelMl <= 0) {
      this.state.update((state) => ({ ...state, status: 'complete' }));
      return;
    }

    this.startSegment(levelMl, Math.max(0, levelMl - segmentMl));
  }

  private startSegment(startMl: number, targetMl: number): void {
    this.now.set(Date.now());
    this.state.set({
      dateKey: this.dateKey(new Date()),
      status: 'running',
      consumedMl: this.state().consumedMl,
      levelMl: startMl,
      segmentStartMl: startMl,
      segmentTargetMl: targetMl,
      segmentStartedAt: Date.now(),
    });
  }

  private tick(): void {
    const now = Date.now();
    this.now.set(now);

    if (this.state().dateKey !== this.dateKey(new Date(now))) {
      this.resetForDate(new Date(now));
      return;
    }

    const state = this.state();
    if (state.status === 'idle' && this.shouldStart(now)) {
      this.start();
      return;
    }

    if (state.status !== 'running' || state.segmentStartedAt === null) {
      return;
    }

    const levelMl = this.currentLevelMl();
    if (levelMl <= state.segmentTargetMl) {
      if (state.segmentTargetMl > 0 && this.isCheckpointCovered(state.segmentTargetMl)) {
        this.startSegment(state.segmentTargetMl, Math.max(0, state.segmentTargetMl - segmentMl));
        return;
      }

      this.state.set({
        ...state,
        status: state.segmentTargetMl <= 0 ? 'complete' : 'waiting',
        levelMl: state.segmentTargetMl,
        segmentStartedAt: null,
      });
    }
  }

  private currentLevelMl(): number {
    const state = this.state();
    if (state.status !== 'running' || state.segmentStartedAt === null) {
      return state.levelMl;
    }

    const elapsed = this.now() - state.segmentStartedAt;
    const progress = Math.min(1, Math.max(0, elapsed / segmentDurationMs));
    const level = state.segmentStartMl - (state.segmentStartMl - state.segmentTargetMl) * progress;
    return Math.round(level);
  }

  private restoreState(): WaterState {
    const today = this.dateKey(new Date());
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return defaultState(today);
      }

      const state = JSON.parse(stored) as Partial<WaterState>;
      if (state.dateKey !== today) {
        return defaultState(today);
      }

      return {
        dateKey: today,
        status: this.cleanStatus(state.status),
        consumedMl: this.cleanMl(state.consumedMl, 0),
        levelMl: this.cleanMl(state.levelMl, targetMl),
        segmentStartMl: this.cleanMl(state.segmentStartMl, targetMl),
        segmentTargetMl: this.cleanMl(state.segmentTargetMl, targetMl - segmentMl),
        segmentStartedAt:
          typeof state.segmentStartedAt === 'number' && Number.isFinite(state.segmentStartedAt)
            ? state.segmentStartedAt
            : null,
      };
    } catch {
      return defaultState(today);
    }
  }

  private persistState(state: WaterState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures; the in-memory widget still works.
    }
  }

  private cleanMl(value: unknown, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(targetMl, Math.max(0, Math.round(value)));
  }

  private cleanStatus(value: unknown): WaterStatus {
    if (value === 'running' || value === 'waiting' || value === 'complete') {
      return value;
    }

    return 'idle';
  }

  private isCheckpointCovered(levelMl: number): boolean {
    return this.consumedMl() >= targetMl - levelMl;
  }

  private resetForDate(date: Date): void {
    this.state.set(defaultState(this.dateKey(date)));
  }

  private shouldStart(timestamp: number): boolean {
    const now = new Date(timestamp);
    const start = new Date(now);
    start.setHours(dayStartHour, 0, 0, 0);

    return now >= start;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
