import { CoachingEvent, InterventionLevel } from '@communication-agent/types';

interface DeciderState {
  sessionId: string;
  lastInterventionAt: number; // timestamp ms
  lastInterventionLevel: InterventionLevel;
  totalInterventions: number;
  cooldownMs: number; // default 30000 (30s)
  positiveReinforcementCount: number;
  lastPositiveAt: number;
}

export class CoachingDecider {
  private states = new Map<string, DeciderState>();

  createSession(sessionId: string, cooldownMs: number = 30000): void {
    this.states.set(sessionId, {
      sessionId,
      lastInterventionAt: 0,
      lastInterventionLevel: 0,
      totalInterventions: 0,
      cooldownMs,
      positiveReinforcementCount: 0,
      lastPositiveAt: 0,
    });
  }

  destroySession(sessionId: string): void {
    this.states.delete(sessionId);
  }

  shouldSurface(sessionId: string, event: CoachingEvent): boolean {
    const state = this.states.get(sessionId);
    if (!state) return false;

    if (event.level === 0) return false;
    if (event.level === 1) return true;
    if (event.level === 4) return true;

    const now = Date.now();
    const timeSince = now - state.lastInterventionAt;

    if (event.level === 2 && timeSince >= state.cooldownMs) return true;
    if (event.level === 3 && timeSince >= 10000) return true;

    return false;
  }

  recordIntervention(sessionId: string, level: InterventionLevel): void {
    const state = this.states.get(sessionId);
    if (state) {
      state.lastInterventionAt = Date.now();
      state.lastInterventionLevel = level;
      state.totalInterventions++;
    }
  }

  isCooldownActive(sessionId: string): boolean {
    const state = this.states.get(sessionId);
    if (!state) return false;
    return (Date.now() - state.lastInterventionAt) < state.cooldownMs;
  }

  prioritizeEvents(events: CoachingEvent[]): CoachingEvent | null {
    if (!events.length) return null;
    const validEvents = events.filter(e => e.level > 0);
    if (!validEvents.length) return null;
    
    // Sort by level descending
    validEvents.sort((a, b) => b.level - a.level);
    return validEvents[0];
  }
}

export const coachingDecider = new CoachingDecider();
