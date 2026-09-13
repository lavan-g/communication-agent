// ─── Intervention Hierarchy ───────────────────────────────────────────────────

export enum InterventionLevel {
  /** Notice but don't surface — purely internal tracking */
  Observe = 0,
  /** Show passively in UI without disrupting the user */
  Passive = 1,
  /** Short coaching signal after user finishes a thought */
  Gentle = 2,
  /** Interrupt when issue materially affects communication */
  Important = 3,
  /** Interrupt immediately — serious damage to interaction */
  Critical = 4,
}

// ─── Coaching Categories ──────────────────────────────────────────────────────

export enum CoachingCategory {
  Language = 'language',
  Structure = 'structure',
  Storytelling = 'storytelling',
  Wit = 'wit',
  Engagement = 'engagement',
  Delivery = 'delivery',
  Clarity = 'clarity',
  Conciseness = 'conciseness',
  Memorability = 'memorability',
  FillerWords = 'filler_words',
  Repetition = 'repetition',
  Rambling = 'rambling',
  Opening = 'opening',
  Ending = 'ending',
  Positive = 'positive', // 🟢 strong moment reinforcement
}

// ─── Session Mode ─────────────────────────────────────────────────────────────

export type SessionMode = 'conversation' | 'presentation' | 'practice';

// ─── Coaching Event (streamed to frontend) ───────────────────────────────────

export interface CoachingEvent {
  id: string;
  sessionId: string;
  level: InterventionLevel;
  category: CoachingCategory;
  /** Short message shown in the live UI — max ~12 words */
  message: string;
  /** The underlying communication principle being taught */
  principle: string;
  /** Optional rewrite example — only shown for Level 2+ */
  suggestedVersion?: string;
  /** Witty alternatives when appropriate */
  alternatives?: {
    direct?: string;
    natural?: string;
    strong?: string;
    witty?: string;
  };
  /** The transcript excerpt that triggered this event */
  triggerText?: string;
  timestamp: string; // ISO 8601
}

// ─── Transcript ───────────────────────────────────────────────────────────────

export interface TranscriptChunk {
  id: string;
  sessionId: string;
  text: string;
  isFinal: boolean;
  speaker: 'user' | 'other';
  timestamp: string;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  mode: SessionMode;
  title?: string;
  startedAt: string;
  endedAt?: string;
  context?: string; // Audience/topic context provided by user
  wordCount: number;
  duration: number; // seconds
}

export interface SessionContext {
  audience?: string;
  topic?: string;
  formality?: 'casual' | 'professional' | 'formal';
  objective?: string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export type ProfileStrength =
  | 'vocabulary'
  | 'storytelling'
  | 'confidence'
  | 'humor'
  | 'explanations'
  | 'conciseness'
  | 'hooks'
  | 'endings'
  | 'empathy'
  | 'clarity';

export type ProfileWeakness =
  | 'rambling'
  | 'filler_words'
  | 'weak_hooks'
  | 'weak_endings'
  | 'lack_of_pauses'
  | 'repetition'
  | 'abstract_explanations'
  | 'over_explaining'
  | 'unnecessary_qualifiers'
  | 'no_structure';

export type LearningStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const LEARNING_STAGE_LABELS: Record<LearningStage, string> = {
  1: 'Reduce filler words',
  2: 'Improve sentence structure',
  3: 'Improve clarity',
  4: 'Build stronger explanations',
  5: 'Introduce storytelling',
  6: 'Introduce timing & wit',
  7: 'Improve audience engagement',
  8: 'Develop distinctive style',
};

export interface ProfileTendency {
  pattern: string;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  lastSeen: string;
}

export interface UserProfile {
  strengths: Array<{ type: ProfileStrength; confidence: 'low' | 'medium' | 'high'; note?: string }>;
  weaknesses: Array<{ type: ProfileWeakness; confidence: 'low' | 'medium' | 'high'; note?: string }>;
  tendencies: ProfileTendency[];
  learningStage: LearningStage;
  totalSessions: number;
  totalMinutes: number;
  lastSessionAt?: string;
}

// ─── Story Bank ───────────────────────────────────────────────────────────────

export type StoryTone = 'funny' | 'inspiring' | 'vulnerable' | 'dramatic' | 'reflective' | 'cautionary';

export interface Story {
  id: string;
  title: string;
  situation?: string;
  characters?: string;
  conflict?: string;
  stakes?: string;
  turningPoint?: string;
  outcome?: string;
  lesson?: string;
  tone?: StoryTone;
  topics: string[];
  audienceTypes: string[];
  usableSituations: string[];
  memorableLines: string[];
  alternativeOpenings: string[];
  alternativeEndings: string[];
  rawExcerpt?: string; // original transcript snippet
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Post-Session Report ──────────────────────────────────────────────────────

export interface SessionReport {
  sessionId: string;
  generatedAt: string;

  wellDone: string[];
  biggestOpportunity: {
    observation: string;
    principle: string;
    exercise?: string;
  };

  storytelling: {
    strongestMoment?: string;
    missedOpportunity?: string;
  };

  wit: {
    strongestMoment?: string;
    missedOpportunity?: string;
  };

  engagement: {
    assessment: 'strong' | 'moderate' | 'needs_work';
    observations: string[];
  };

  speechPatterns: {
    fillerWordCount: number;
    fillerWords: Record<string, number>;
    repetitions: string[];
    ramblingMoments: number;
  };

  oneLesson: string;
  oneExercise: {
    type: string;
    instruction: string;
    duration?: string;
  };

  progress?: {
    comparedTo: string; // session date
    improvements: string[];
    regressions: string[];
  };

  scores: {
    clarity: 'strong' | 'moderate' | 'developing';
    structure: 'strong' | 'moderate' | 'developing';
    storytelling: 'strong' | 'moderate' | 'developing';
    engagement: 'strong' | 'moderate' | 'developing';
    conciseness: 'strong' | 'moderate' | 'developing';
    confidence: 'strong' | 'moderate' | 'developing';
  };
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateSessionPayload {
  mode: SessionMode;
  title?: string;
  context?: SessionContext;
}

export interface AnalyzeChunkPayload {
  text: string;
  isFinal: boolean;
  transcriptWindow: TranscriptChunk[]; // last N chunks for context
  sessionContext?: SessionContext;
}

export interface AnalyzeChunkResponse {
  received: boolean;
  queued: boolean;
}

// ─── SSE Event types ──────────────────────────────────────────────────────────

export type SSEEventType =
  | 'coaching'     // CoachingEvent
  | 'transcript'   // TranscriptChunk echo
  | 'heartbeat'    // keep-alive
  | 'session_end'; // session ended signal

export interface SSEMessage<T = unknown> {
  type: SSEEventType;
  data: T;
}
