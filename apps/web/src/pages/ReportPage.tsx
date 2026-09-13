import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionReport } from '../services/api.service';
import type { SessionReport } from '@communication-agent/types';
import { CheckCircle2, TrendingUp, Mic, ArrowRight, BookOpen, Zap } from 'lucide-react';

const SCORE_COLOR: Record<string, string> = {
  strong: 'text-green-400',
  moderate: 'text-yellow-400',
  developing: 'text-gray-400',
};
const SCORE_LABEL: Record<string, string> = {
  strong: 'Strong ✓',
  moderate: 'Moderate',
  developing: 'Developing',
};

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    let pollCount = 0;

    const fetchReport = async () => {
      try {
        const data = await getSessionReport(sessionId);
        if (data && mounted) {
          setReport(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.message?.includes('404') && pollCount < 12) {
          pollCount++;
          setTimeout(fetchReport, 2500);
        } else {
          if (mounted) setLoading(false);
        }
      }
    };

    fetchReport();
    return () => { mounted = false; };
  }, [sessionId]);

  if (loading || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full pt-24">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500 mb-6" />
        <h2 className="text-xl text-gray-300 mb-2">Generating your report...</h2>
        <p className="text-gray-500 text-sm">Analyzing speech patterns, clarity, and storytelling.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 py-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Session Report</h1>
          <p className="text-gray-400 text-sm">
            {new Date(report.generatedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/session')}
          className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 text-sm"
        >
          New Session <ArrowRight size={15} />
        </button>
      </div>

      {/* What you did well + Biggest opportunity */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-green-950/20 border border-green-900/40 rounded-xl p-6">
          <h3 className="text-green-400 font-medium flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
            <CheckCircle2 size={15} /> Well Done
          </h3>
          <ul className="space-y-2">
            {report.wellDone.map((item, i) => (
              <li key={i} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
                <span className="text-green-500 mt-1 flex-none">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-orange-950/20 border border-orange-900/40 rounded-xl p-6">
          <h3 className="text-orange-400 font-medium flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
            <TrendingUp size={15} /> Biggest Opportunity
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            {report.biggestOpportunity.observation}
          </p>
          <p className="text-xs text-gray-500 italic border-t border-gray-800 pt-3">
            💡 {report.biggestOpportunity.principle}
          </p>
        </div>
      </div>

      {/* Dimension scores */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-base font-medium text-white mb-5">Dimension Scores</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(report.scores).map(([key, score]) => (
            <div key={key} className="p-4 bg-gray-950 rounded-lg border border-gray-800/50">
              <div className="text-xs text-gray-500 capitalize mb-1">{key}</div>
              <div className={`font-medium text-sm ${SCORE_COLOR[score] || 'text-gray-400'}`}>
                {SCORE_LABEL[score] || score}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's lesson */}
      <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-6 mb-8">
        <h3 className="text-blue-400 font-medium flex items-center gap-2 mb-3 text-sm uppercase tracking-wider">
          <BookOpen size={15} /> Today's One Lesson
        </h3>
        <p className="text-gray-200 text-base leading-relaxed">{report.oneLesson}</p>
      </div>

      {/* Today's exercise */}
      {report.oneExercise && (
        <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-6 mb-8">
          <h3 className="text-purple-400 font-medium flex items-center gap-2 mb-3 text-sm uppercase tracking-wider">
            <Zap size={15} /> Practice Exercise · {report.oneExercise.duration}
          </h3>
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">{report.oneExercise.type}</p>
          <p className="text-gray-200 text-sm leading-relaxed">{report.oneExercise.instruction}</p>
        </div>
      )}

      {/* Speech patterns */}
      {report.speechPatterns && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-base font-medium text-white mb-5 flex items-center gap-2">
            <Mic size={16} className="text-gray-500" /> Speech Patterns
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-light text-white mb-1">{report.speechPatterns.fillerWordCount}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Filler Words</div>
            </div>
            <div>
              <div className="text-3xl font-light text-white mb-1">{report.speechPatterns.ramblingMoments}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Rambling Moments</div>
            </div>
            <div>
              <div className="text-3xl font-light text-white mb-1">{report.speechPatterns.repetitions.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Repetitions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
