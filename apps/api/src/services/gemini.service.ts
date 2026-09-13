import { GoogleGenAI } from '@google/genai';
import { 
  SessionMode, 
  UserProfile, 
  LearningStage, 
  SessionContext, 
  CoachingEvent, 
  Session, 
  TranscriptChunk, 
  SessionReport 
} from '@communication-agent/types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = 'gemini-2.0-flash';

export interface AnalyzeParams {
  transcript: string;
  transcriptWindow: string;
  sessionMode: SessionMode;
  userProfile: UserProfile | null;
  learningStage: LearningStage;
  cooldownActive: boolean;
  sessionContext?: SessionContext;
  sessionId: string;
}

export interface ReportParams {
  session: Session;
  transcript: TranscriptChunk[];
  coachingEvents: CoachingEvent[];
  userProfile: UserProfile | null;
  previousReport?: SessionReport;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(prompt: string, attempt = 1): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });
    return response.text || '';
  } catch (err: any) {
    if (err.status === 429 && attempt < 3) {
      await sleep(3000 * attempt);
      return callGeminiWithRetry(prompt, attempt + 1);
    }
    throw err;
  }
}

export const geminiService = {
  async analyzeTranscript(params: AnalyzeParams): Promise<CoachingEvent[]> {
    try {
      const stageGuidance: Record<number, string> = {
        1: 'Focus ONLY on filler words and basic clarity. Ignore storytelling/wit.',
        2: 'Focus on sentence structure and basic clarity. Avoid storytelling coaching.',
        3: 'Focus on clarity, conciseness, and clear main points.',
        4: 'Focus on explanation quality, examples, and avoiding abstraction.',
        5: 'Introduce storytelling coaching. Detect missed story opportunities.',
        6: 'Add timing, wit awareness, and humor opportunities to analysis.',
        7: 'Focus on audience engagement, tension, variety, and questions.',
        8: 'Help develop a distinctive voice. All dimensions active.',
      };

      const weaknesses = params.userProfile?.weaknesses?.map(w => w.type).join(', ') || 'unknown';
      const strengths = params.userProfile?.strengths?.map(s => s.type).join(', ') || 'unknown';

      const prompt = `You are an elite, intelligent, slightly witty, non-judgmental communication coach. You are NOT a grammar teacher.

COACHING PHILOSOPHY:
- AI should be a coach, not a crutch. Teach WHY, not just WHAT.
- Priority order: meaning → engagement → clarity → structure → storytelling → delivery → wit → grammar
- Do NOT correct every mistake. Only intervene when it genuinely matters.
- Preserve the speaker's natural personality and voice.
- Never make natural speech sound like AI output.

SESSION CONTEXT:
- Mode: ${params.sessionMode}
- Learning Stage: ${params.learningStage} — ${stageGuidance[params.learningStage] || ''}
- User strengths: ${strengths}
- User weaknesses to watch for: ${weaknesses}
- Cooldown active: ${params.cooldownActive} (if true, return ONLY level 0 or 1 events, no interruptions)

CURRENT TRANSCRIPT CHUNK (what the speaker just said):
"${params.transcript}"

TRANSCRIPT WINDOW (last 2 minutes for context):
"${params.transcriptWindow}"

TASK:
Analyze the current chunk in context of the window. Return a JSON array of coaching events.
- Return at most 2 events (1 is preferred)
- The most important event should have the highest level
- If nothing meaningful to coach: return []
- For positive/strong moments: use category "positive" and level 1

JSON format — return ONLY the array, no markdown:
[
  {
    "level": 1,
    "category": "filler_words",
    "message": "Filler: 'basically' (3rd time this session)",
    "principle": "Filler words signal hesitation to listeners. A deliberate pause is 10x more powerful than 'basically'.",
    "triggerText": "basically what happened was",
    "suggestedVersion": "what happened was"
  }
]

Valid levels: 0 (observe only), 1 (passive), 2 (gentle - after thought), 3 (important), 4 (critical)
Valid categories: language, structure, storytelling, wit, engagement, delivery, clarity, conciseness, memorability, filler_words, repetition, rambling, opening, ending, positive`;

      const text = await callGeminiWithRetry(prompt);
      let parsed: any[];
      try {
        parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) parsed = [parsed];
      } catch {
        return [];
      }

      return parsed.map((p: any) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        sessionId: params.sessionId,
        level: Number(p.level) || 1,
        category: p.category || 'language',
        message: p.message || '',
        principle: p.principle || '',
        triggerText: p.triggerText,
        suggestedVersion: p.suggestedVersion,
        alternatives: p.alternatives,
        timestamp: new Date().toISOString(),
      })) as CoachingEvent[];
    } catch (err) {
      console.error('Gemini analyze error:', err);
      return [];
    }
  },

  async generatePostSessionReport(params: ReportParams): Promise<SessionReport> {
    const fullTranscript = params.transcript.map(c => c.text).join(' ');
    const wordCount = fullTranscript.split(/\s+/).filter(Boolean).length;
    const fillerEvents = params.coachingEvents.filter(e => e.category === 'filler_words');
    const coachingSummary = params.coachingEvents.map(e => `[${e.category}] ${e.message}`).join('\n');

    const prompt = `You are an expert communication coach writing a post-session report. Be direct, specific, and encouraging. Avoid generic platitudes.

SESSION DATA:
- Duration: ${params.session.duration || 0} seconds  
- Word count: ${wordCount}
- Mode: ${params.session.mode}
- Number of filler word events: ${fillerEvents.length}
- Coaching events that fired: ${coachingSummary || 'none'}

FULL TRANSCRIPT:
"${fullTranscript.slice(0, 3000)}${fullTranscript.length > 3000 ? '...(truncated)' : ''}"

TASK: Generate a complete, honest, encouraging post-session report. Return ONLY a JSON object:

{
  "sessionId": "${params.session.id}",
  "generatedAt": "${new Date().toISOString()}",
  "wellDone": ["specific observation 1", "specific observation 2"],
  "biggestOpportunity": {
    "observation": "The most impactful thing to improve, with specific example from the transcript",
    "principle": "The underlying communication principle to internalize",
    "exercise": "A specific short exercise to practice this"
  },
  "storytelling": {
    "strongestMoment": "Quote or describe the best storytelling moment, or null",
    "missedOpportunity": "Where could a story have made more impact? Or null"
  },
  "wit": {
    "strongestMoment": "Best witty or light moment, or null",
    "missedOpportunity": "Where was there a natural opportunity for lightness? Or null"
  },
  "engagement": {
    "assessment": "strong",
    "observations": ["specific observation about engagement"]
  },
  "speechPatterns": {
    "fillerWordCount": ${fillerEvents.length},
    "fillerWords": {},
    "repetitions": [],
    "ramblingMoments": 0
  },
  "oneLesson": "The single most important communication principle from this session",
  "oneExercise": {
    "type": "practice type",
    "instruction": "Clear, specific instruction for the exercise",
    "duration": "e.g. 2 minutes"
  },
  "scores": {
    "clarity": "moderate",
    "structure": "moderate",
    "storytelling": "developing",
    "engagement": "moderate",
    "conciseness": "moderate",
    "confidence": "moderate"
  }
}

Note: assessment must be one of: "strong", "moderate", "needs_work"
Note: all score values must be one of: "strong", "moderate", "developing"`;

    try {
      const text = await callGeminiWithRetry(prompt);
      const parsed = JSON.parse(text) as SessionReport;
      parsed.sessionId = params.session.id;
      parsed.generatedAt = new Date().toISOString();
      return parsed;
    } catch (err) {
      console.error('Gemini report error:', err);
      return {
        sessionId: params.session.id,
        generatedAt: new Date().toISOString(),
        wellDone: ['You showed up and practiced — that alone matters.'],
        biggestOpportunity: {
          observation: 'Keep practicing to build more data for your coach.',
          principle: 'Consistency beats perfection.',
          exercise: 'Record yourself speaking for 2 minutes tomorrow.',
        },
        storytelling: { strongestMoment: undefined, missedOpportunity: undefined },
        wit: { strongestMoment: undefined, missedOpportunity: undefined },
        engagement: { assessment: 'moderate', observations: ['More data needed for a full assessment.'] },
        speechPatterns: { fillerWordCount: fillerEvents.length, fillerWords: {}, repetitions: [], ramblingMoments: 0 },
        oneLesson: 'The most important communication skill is showing up and practicing.',
        oneExercise: { type: 'Conciseness', instruction: 'Pick a topic and explain it in exactly 30 seconds.', duration: '30 seconds' },
        scores: { clarity: 'moderate', structure: 'moderate', storytelling: 'developing', engagement: 'moderate', conciseness: 'moderate', confidence: 'moderate' },
      };
    }
  },

  async detectStoryOpportunity(transcript: string): Promise<{ detected: boolean; prompt?: string }> {
    try {
      const prompt = `A communication coach is analyzing whether a speaker missed a storytelling opportunity.

Speaker said: "${transcript}"

Did they state a conclusion, result, or observation WITHOUT telling the actual story/experience behind it?
Examples of missed opportunities: "We had a tough launch" (no story), "It was really hard" (no context), "That project changed everything" (no narrative).

Return ONLY JSON: { "detected": true, "prompt": "coaching question to ask" } or { "detected": false }`;
      const text = await callGeminiWithRetry(prompt);
      return JSON.parse(text);
    } catch (err) {
      console.error('Story opportunity detection error:', err);
      return { detected: false };
    }
  }
};
