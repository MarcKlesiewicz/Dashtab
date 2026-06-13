import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type MovePhase = 'sitting' | 'standing';
export type MoveStatus = 'idle' | 'running' | 'awaitingAck' | 'paused';

export interface MoveSession {
  status: MoveStatus;
  phase: MovePhase;
  durationSeconds: number;
  startedAt: number | null;
  endsAt: number | null;
  pausedRemainingSeconds: number | null;
}

const sittingDurationSeconds = 5;
const standingDurationSeconds = 5;

const defaultSession: MoveSession = {
  status: 'idle',
  phase: 'sitting',
  durationSeconds: sittingDurationSeconds,
  startedAt: null,
  endsAt: null,
  pausedRemainingSeconds: null,
};

@Injectable({
  providedIn: 'root',
})
export class MoveService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'move.session';
  private readonly now = signal(Date.now());
  private readonly sessionState = signal<MoveSession>(this.restoreSession());
  private readonly tickerId = window.setInterval(() => this.tick(), 1000);

  readonly session = computed(() => this.sessionState());
  readonly status = computed(() => this.session().status);
  readonly phase = computed(() => this.session().phase);
  readonly isActive = computed(() => this.status() !== 'idle');
  readonly isRunning = computed(() => this.status() === 'running');
  readonly isPaused = computed(() => this.status() === 'paused');
  readonly isAwaitingAck = computed(() => this.status() === 'awaitingAck');

  readonly remainingSeconds = computed(() => {
    const session = this.session();

    if (session.status === 'running' && session.endsAt) {
      return Math.max(0, Math.ceil((session.endsAt - this.now()) / 1000));
    }

    if (session.status === 'paused' && session.pausedRemainingSeconds !== null) {
      return session.pausedRemainingSeconds;
    }

    if (session.status === 'awaitingAck') {
      return 0;
    }

    return session.durationSeconds;
  });

  readonly progress = computed(() => {
    const duration = this.session().durationSeconds;
    if (duration <= 0) {
      return 0;
    }

    const completed = duration - this.remainingSeconds();
    return Math.min(100, Math.max(0, Math.round((completed / duration) * 100)));
  });

  readonly displayTime = computed(() => {
    const remaining = this.remainingSeconds();
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }

    return `${minutes}m`;
  });

  readonly label = computed(() => {
    const status = this.status();
    const phase = this.phase();

    if (status === 'idle') {
      return 'Move';
    }

    if (status === 'awaitingAck') {
      return phase === 'sitting' ? 'Time to move' : 'Sit down';
    }

    if (status === 'paused') {
      return 'Paused';
    }

    return this.displayTime();
  });

  readonly actionLabel = computed(() => {
    if (this.isRunning()) {
      return 'Pause timer';
    }

    if (this.isPaused()) {
      return 'Resume timer';
    }

    if (this.isAwaitingAck()) {
      return this.phase() === 'sitting' ? 'Start standing' : 'Start sitting';
    }

    return 'Start timer';
  });

  constructor() {
    effect(() => {
      this.persistSession(this.sessionState());
    });
    this.destroyRef.onDestroy(() => clearInterval(this.tickerId));
    this.tick();
  }

  primaryAction(): void {
    if (this.isRunning()) {
      this.pauseSession();
      return;
    }

    if (this.isPaused()) {
      this.resumeSession();
      return;
    }

    if (this.isAwaitingAck()) {
      this.startNextPhase();
      return;
    }

    this.startSession('sitting');
  }

  startSession(phase: MovePhase = this.phase()): void {
    const now = Date.now();
    const durationSeconds = this.durationForPhase(phase);

    this.now.set(now);
    this.sessionState.set({
      status: 'running',
      phase,
      durationSeconds,
      startedAt: now,
      endsAt: now + durationSeconds * 1000,
      pausedRemainingSeconds: null,
    });
  }

  pauseSession(): void {
    const session = this.sessionState();
    if (session.status !== 'running') {
      return;
    }

    this.sessionState.set({
      ...session,
      status: 'paused',
      endsAt: null,
      pausedRemainingSeconds: this.remainingSeconds(),
    });
  }

  resumeSession(): void {
    const session = this.sessionState();
    if (session.status !== 'paused') {
      return;
    }

    const now = Date.now();
    const remainingSeconds = session.pausedRemainingSeconds ?? session.durationSeconds;

    this.now.set(now);
    this.sessionState.set({
      ...session,
      status: 'running',
      endsAt: now + remainingSeconds * 1000,
      pausedRemainingSeconds: null,
    });
  }

  startNextPhase(): void {
    this.startSession(this.phase() === 'sitting' ? 'standing' : 'sitting');
  }

  resetSession(): void {
    this.sessionState.set({ ...defaultSession });
  }

  private tick(): void {
    const now = Date.now();
    this.now.set(now);

    const session = this.sessionState();
    if (session.status === 'running' && session.endsAt && session.endsAt <= now) {
      this.sessionState.set({
        ...session,
        status: 'awaitingAck',
        endsAt: null,
        pausedRemainingSeconds: 0,
      });
    }
  }

  private persistSession(session: MoveSession): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    } catch {
      // Ignore storage failures; the in-memory session still works.
    }
  }

  private restoreSession(): MoveSession {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.restoreLegacySession();
      }

      const session = JSON.parse(stored) as Partial<MoveSession>;
      const phase: MovePhase = session.phase === 'standing' ? 'standing' : 'sitting';
      const restored: MoveSession = {
        ...defaultSession,
        ...session,
        phase,
        durationSeconds:
          typeof session.durationSeconds === 'number'
            ? session.durationSeconds
            : this.durationForPhase(phase),
      };

      if (restored.status === 'running' && restored.endsAt && restored.endsAt <= Date.now()) {
        return {
          ...restored,
          status: 'awaitingAck',
          endsAt: null,
          pausedRemainingSeconds: 0,
        };
      }

      return restored;
    } catch {
      return this.restoreLegacySession();
    }
  }

  private restoreLegacySession(): MoveSession {
    try {
      const isSitting = JSON.parse(localStorage.getItem('mw.isSitdown') ?? 'true');
      const isRunning = JSON.parse(localStorage.getItem('mw.isRunning') ?? 'false');
      const awaitingAck = JSON.parse(localStorage.getItem('mw.awaitingAck') ?? 'false');
      const periodEndMs = JSON.parse(localStorage.getItem('mw.periodEndMs') ?? 'null');
      const phase: MovePhase = isSitting ? 'sitting' : 'standing';
      const durationSeconds = this.durationForPhase(phase);

      if (awaitingAck) {
        return {
          ...defaultSession,
          status: 'awaitingAck',
          phase,
          durationSeconds,
          pausedRemainingSeconds: 0,
        };
      }

      if (isRunning && typeof periodEndMs === 'number') {
        if (periodEndMs <= Date.now()) {
          return {
            ...defaultSession,
            status: 'awaitingAck',
            phase,
            durationSeconds,
            pausedRemainingSeconds: 0,
          };
        }

        return {
          status: 'running',
          phase,
          durationSeconds,
          startedAt: null,
          endsAt: periodEndMs,
          pausedRemainingSeconds: null,
        };
      }
    } catch {
      // Use the default session when legacy storage is malformed.
    }

    return { ...defaultSession };
  }

  private durationForPhase(phase: MovePhase): number {
    return phase === 'sitting' ? sittingDurationSeconds : standingDurationSeconds;
  }
}
