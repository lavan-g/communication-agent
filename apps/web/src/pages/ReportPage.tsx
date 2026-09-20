import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MessageSquare, Lightbulb, Dumbbell, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { getSessionReport, type SessionReportFull } from '../services/api.service';
import type { SessionReport } from '@communication-agent/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SCORE_COLOR: Record<string, string> = {
  strong:     'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  moderate:   'text-amber-400 bg-amber-950/40 border-amber-900/50',
  developing: 'text-violet-400 bg-violet-950/40 border-violet-900/50',
};

const SCORE_BAR: Record<string, number> = {
  strong: 100, moderate: 60, developing: 30,
};

const SCORE_BAR_COLOR: Record<string, string> = {
  strong: 'bg-emerald-500', moderate: 'bg-amber-500', developing: 'bg-violet-500',
};

const SCORE_LABELS: Record<string, string> = {
  clarity: 'Clarity', structure: 'Structure', storytelling: 'Storytelling',
  engagement: 'Engagement', conciseness: 'Conciseness', confidence: 'Confidence',
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SessionReportFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 6;

    const fetchReport = async () => {
      try {
        const result = await getSessionReport(sessionId);
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch {
        if (!mounted) return;
        attempts++;
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(fetchReport, 2500);
        } else {
          setLoading(false);
          setError('Could not load the report. The session may not have ended properly.');
        }
      }
    };

    fetchReport();
    return () => { mounted = false; };
  }, [sessionId]);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading || (!data && !error)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-violet-500" />
        <p className="text-gray-400 text-sm">Generating your coaching summary…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-gray-300 font-medium">Report unavailable</p>
        <p className="text-gray-500 text-sm max-w-xs text-center">{error}</p>
        <button
          onClick={() => navigate('/session')}
          className="mt-4 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium"
        >
          Start new session
        </button>
      </div>
    );
  }

  const { report, session, transcripts, coachingEvents } = data;
  const fullTranscript = (transcripts ?? []).map((c: any) => c.text).join(' ').trim();
  const wordCount = session?.word_count ?? (fullTranscript ? fullTranscript.split(/\s+/).length : 0);
  const duration = session?.duration_seconds ?? 0;
  const hasRealData = fullTranscript.length > 0;

  // Filler words from coaching events fired during session
  const fillerHits = (coachingEvents ?? []).filter((e: any) => e.category === 'filler_words');
  const totalFillers = report.speechPatterns?.fillerWordCount ?? fillerHits.length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <span className="text-xs text-gray-600">
            {session?.started_at ? formatDate(session.started_at) : ''}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-white">Session Report</h1>
          <p className="text-gray-500 text-sm mt-1">
            {session?.mode ? `${session.mode.charAt(0).toUpperCase()}${session.mode.slice(1)} session` : 'Session'}
            {duration > 0 && <> · {formatDuration(duration)}</>}
            {wordCount > 0 && <> · {wordCount} words</>}
          </p>
        </div>

        {/* ── No transcript warning ─────────────────────────────────── */}
        {!hasRealData && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-950/30 border border-amber-900/40 rounded-xl text-sm">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-300 font-medium">No speech was captured in this session.</p>
              <p className="text-amber-500/80 text-xs mt-0.5">
                Voxa didn't receive any audio. Make sure you click "Begin Session", allow mic access, and speak clearly. The report below is a template.
              </p>
            </div>
          </div>
        )}

        {/* ── What you said (transcript) ────────────────────────────── */}
        {hasRealData && (
          <Section icon={<Mic size={16} />} title="What you said" accent="violet">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(transcripts as any[]).map((chunk: any, i: number) => (
                <p key={i} className="text-gray-300 text-sm leading-relaxed">
                  {chunk.text}
                </p>
              ))}
            </div>
            {transcripts.length === 0 && (
              <p className="text-gray-600 text-sm italic">No transcript recorded.</p>
            )}
          </Section>
        )}

        {/* ── Coaching events during session ────────────────────────── */}
        {(coachingEvents ?? []).length > 0 && (
          <Section icon={<MessageSquare size={16} />} title="What Voxa noticed" accent="cyan">
            <div className="space-y-3">
              {(coachingEvents as any[]).map((evt: any, i: number) => (
                <CoachingEventRow key={i} event={evt} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Speech patterns (fillers + rambling) ─────────────────── */}
        <Section icon={<BarChart3 size={16} />} title="Speech patterns" accent="amber">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Filler words" value={totalFillers} unit="caught" good={totalFillers === 0} />
            <StatCard label="Rambling moments" value={report.speechPatterns?.ramblingMoments ?? 0} unit="detected" good={(report.speechPatterns?.ramblingMoments ?? 0) === 0} />
            <StatCard label="Words spoken" value={wordCount} unit="words" />
            <StatCard label="Duration" value={formatDuration(duration)} />
          </div>

          {/* Individual filler words breakdown */}
          {Object.keys(report.speechPatterns?.fillerWords ?? {}).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(report.speechPatterns.fillerWords).map(([word, count]) => (
                <span key={word} className="px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-900/40 text-amber-400 text-xs">
                  "{word}" × {count as number}
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* ── What you did well ─────────────────────────────────────── */}
        {(report.wellDone ?? []).length > 0 && (
          <Section icon={<CheckCircle2 size={16} />} title="What you did well" accent="emerald">
            <ul className="space-y-2">
              {report.wellDone.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Biggest opportunity ───────────────────────────────────── */}
        {report.biggestOpportunity && (
          <Section icon={<Lightbulb size={16} />} title="Biggest opportunity" accent="violet" highlight>
            <p className="text-gray-200 font-medium text-sm">{report.biggestOpportunity.observation}</p>
            {report.biggestOpportunity.principle && (
              <p className="text-violet-300 text-sm mt-2 italic">"{report.biggestOpportunity.principle}"</p>
            )}
          </Section>
        )}

        {/* ── Today's exercise ──────────────────────────────────────── */}
        {report.oneExercise && (
          <Section icon={<Dumbbell size={16} />} title="Practice today" accent="cyan">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  {report.oneExercise.type}
                  {report.oneExercise.duration && <span className="text-gray-600 ml-2 normal-case">· {report.oneExercise.duration}</span>}
                </p>
                <p className="text-gray-300 text-sm">{report.oneExercise.instruction}</p>
              </div>
            </div>
          </Section>
        )}

        {/* ── Scores ───────────────────────────────────────────────── */}
        {report.scores && (
          <Section icon={<BarChart3 size={16} />} title="Scores" accent="gray">
            <div className="space-y-3">
              {Object.entries(report.scores).map(([key, value]) => (
                <ScoreRow key={key} label={SCORE_LABELS[key] ?? key} value={value as string} />
              ))}
            </div>
            {!hasRealData && (
              <p className="text-xs text-gray-600 mt-3 italic">These scores are estimates — speak during your session for accurate analysis.</p>
            )}
          </Section>
        )}

        {/* ── The one lesson ────────────────────────────────────────── */}
        {report.oneLesson && (
          <div className="px-6 py-5 bg-violet-950/20 border border-violet-900/30 rounded-2xl">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-2">One lesson from this session</p>
            <p className="text-gray-200 text-base leading-relaxed">"{report.oneLesson}"</p>
          </div>
        )}

        <div className="pb-8" />
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const ACCENT: Record<string, string> = {
  violet: 'border-violet-900/40 text-violet-400',
  cyan:   'border-cyan-900/40 text-cyan-400',
  amber:  'border-amber-900/40 text-amber-400',
  emerald:'border-emerald-900/40 text-emerald-400',
  gray:   'border-gray-800 text-gray-400',
};

function Section({
  icon, title, accent = 'gray', highlight = false, children,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'bg-violet-950/10 border-violet-900/40' : 'bg-gray-900/50 border-gray-800'}`}>
      <div className={`flex items-center gap-2 mb-4 ${ACCENT[accent] ?? ACCENT.gray}`}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function CoachingEventRow({ event }: { event: any }) {
  const categoryLabel: Record<string, string> = {
    filler_words: 'Filler word', rambling: 'Rambling', clarity: 'Clarity',
    structure: 'Structure', storytelling: 'Storytelling', positive: 'Well done',
    conciseness: 'Conciseness', engagement: 'Engagement', language: 'Language',
  };
  const isPositive = event.category === 'positive';
  return (
    <div className={`rounded-xl px-4 py-3 border text-sm ${isPositive
      ? 'bg-emerald-950/20 border-emerald-900/30'
      : 'bg-gray-950 border-gray-800'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-semibold uppercase tracking-wide ${isPositive ? 'text-emerald-400' : 'text-cyan-400'}`}>
          {categoryLabel[event.category] ?? event.category}
        </span>
      </div>
      <p className={`leading-snug ${isPositive ? 'text-emerald-200' : 'text-gray-300'}`}>{event.message}</p>
      {event.principle && !isPositive && (
        <p className="text-gray-500 text-xs mt-1.5 italic">{event.principle}</p>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, good }: { label: string; value: string | number; unit?: string; good?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-950 border border-gray-800 px-4 py-3">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${good === true ? 'text-emerald-400' : good === false ? 'text-amber-400' : 'text-gray-200'}`}>
        {value}
      </p>
      {unit && <p className="text-xs text-gray-600 mt-0.5">{unit}</p>}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  const pct = SCORE_BAR[value] ?? 30;
  const barColor = SCORE_BAR_COLOR[value] ?? 'bg-gray-600';
  const textColor = value === 'strong' ? 'text-emerald-400' : value === 'moderate' ? 'text-amber-400' : 'text-violet-400';
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-gray-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-20 text-right capitalize ${textColor}`}>{value}</span>
    </div>
  );
}
