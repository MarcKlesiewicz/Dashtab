import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type FocusStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface FocusSession {
  status: FocusStatus;
  intention: string;
  durationSeconds: number;
  startedAt: number | null;
  endsAt: number | null;
  pausedRemainingSeconds: number | null;
}

const defaultDurationSeconds = 25 * 60;
const defaultSession: FocusSession = {
  status: 'idle',
  intention: '',
  durationSeconds: defaultDurationSeconds,
  startedAt: null,
  endsAt: null,
  pausedRemainingSeconds: null,
};

@Injectable({
  providedIn: 'root',
})
export class FocusService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'focus.session';
  private readonly now = signal(Date.now());
  private readonly sessionState = signal<FocusSession>(this.restoreSession());
  private readonly tickerId = window.setInterval(() => this.tick(), 1000);

  readonly session = computed(() => this.sessionState());
  readonly status = computed(() => this.session().status);
  readonly inFocusMode = computed(() => this.status() !== 'idle');
  readonly isRunning = computed(() => this.status() === 'running');
  readonly isPaused = computed(() => this.status() === 'paused');
  readonly isCompleted = computed(() => this.status() === 'completed');

  readonly remainingSeconds = computed(() => {
    const session = this.session();

    if (session.status === 'running' && session.endsAt) {
      return Math.max(0, Math.ceil((session.endsAt - this.now()) / 1000));
    }

    if (session.status === 'paused' && session.pausedRemainingSeconds !== null) {
      return session.pausedRemainingSeconds;
    }

    if (session.status === 'completed') {
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
    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  constructor() {
    effect(() => {
      this.persistSession(this.sessionState());
    });
    this.destroyRef.onDestroy(() => clearInterval(this.tickerId));
    this.tick();
  }

  startSession(durationSeconds = defaultDurationSeconds): void {
    const now = Date.now();
    const previous = this.sessionState();

    this.now.set(now);
    this.sessionState.set({
      status: 'running',
      intention: previous.status === 'completed' ? '' : previous.intention,
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

  completeSession(): void {
    const session = this.sessionState();
    if (session.status === 'idle') {
      return;
    }

    this.sessionState.set({
      ...session,
      status: 'completed',
      endsAt: null,
      pausedRemainingSeconds: 0,
    });
  }

  cancelSession(): void {
    this.sessionState.set({ ...defaultSession });
  }

  returnHome(): void {
    this.cancelSession();
  }

  updateIntention(intention: string): void {
    this.sessionState.update((session) => ({
      ...session,
      intention,
    }));
  }

  private tick(): void {
    const now = Date.now();
    this.now.set(now);

    const session = this.sessionState();
    if (session.status === 'running' && session.endsAt && session.endsAt <= now) {
      this.completeSession();
    }
  }

  private persistSession(session: FocusSession): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    } catch {
      // Ignore storage failures; the in-memory session still works.
    }
  }

  private restoreSession(): FocusSession {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return { ...defaultSession };
      }

      const session = JSON.parse(stored) as Partial<FocusSession>;
      const restored: FocusSession = {
        ...defaultSession,
        ...session,
        durationSeconds:
          typeof session.durationSeconds === 'number'
            ? session.durationSeconds
            : defaultDurationSeconds,
      };

      if (restored.status === 'running' && restored.endsAt && restored.endsAt <= Date.now()) {
        return {
          ...restored,
          status: 'completed',
          endsAt: null,
          pausedRemainingSeconds: 0,
        };
      }

      return restored;
    } catch {
      return { ...defaultSession };
    }
  }
}
