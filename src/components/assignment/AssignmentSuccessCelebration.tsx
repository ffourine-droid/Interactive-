import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Camera,
  Star,
  Sparkles
} from 'lucide-react';
import { triggerConfetti } from '../../utils/confetti';
import { GradeBadge } from '../../utils/grading';

interface AssignmentSuccessCelebrationProps {
  assignment: any;
  submission: any;
  onBackToAssignments: () => void;
  onBackToHome: () => void;
  onExamsClick?: () => void;
}

export const AssignmentSuccessCelebration: React.FC<AssignmentSuccessCelebrationProps> = ({
  assignment,
  submission,
  onBackToAssignments,
  onBackToHome,
  onExamsClick
}) => {
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    triggerConfetti();
  }, []);

  const percentage = submission?.percentage ?? submission?.score;
  const gradeLabel = submission?.grade_label;
  const isScorePresent = percentage !== undefined && percentage !== null && !isNaN(percentage);
  const questions = assignment?.questions || [];
  const answers = submission?.answers || {};

  return (
    <div className="max-w-[440px] mx-auto p-4 sm:p-6 pb-20 animate-fade-in space-y-5">
      {/* Top Banner & Trophy */}
      <div className="bg-brand-surface border border-brand-border border-b-[4px] border-b-emerald-500/50 rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl" />

        {/* Animated Trophy Container */}
        <div className="w-20 h-20 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-lg shadow-emerald-500/10 animate-bounce">
          <Trophy size={40} className="drop-shadow-sm" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 mb-2">
          <Sparkles size={12} />
          <span>Work Handed In!</span>
        </div>

        <h2 className="font-display font-black text-2xl text-brand-text mb-1">
          Outstanding Effort!
        </h2>
        <p className="text-xs font-medium text-brand-muted max-w-[280px] mx-auto leading-relaxed">
          Your submission has been securely delivered to your teacher's grading inbox.
        </p>

        {/* Score Card if Available */}
        {isScorePresent && (
          <div className="mt-5 p-4 rounded-2xl bg-brand-bg/80 border border-brand-border/60 flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                Performance Assessment
              </span>
            </div>
            <div className="text-4xl font-black text-brand-accent tracking-tight">
              {percentage}%
            </div>
            <GradeBadge percentage={percentage} gradeLabel={gradeLabel} size="md" />
            <p className="text-[11px] text-brand-muted mt-0.5 font-medium">
              {gradeLabel ? `Status: ${gradeLabel}` : 'Based on auto-scored exercises.'}
            </p>
          </div>
        )}
      </div>

      {/* Assignment & Submission Metadata */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted">Assignment Title</p>
            <p className="font-display font-bold text-sm text-brand-text">{assignment?.title}</p>
          </div>
          <span className="text-xs font-black text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-lg">
            {assignment?.subject}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted">Teacher</p>
            <p className="font-semibold text-brand-text truncate">
              {assignment?.teacher?.name || 'Assigned Instructor'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted">Handed in on</p>
            <p className="font-semibold text-brand-text">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {submission?.teacher_comment && (
          <div className="mt-2 p-3 bg-brand-accent/5 rounded-xl border border-brand-accent/20">
            <p className="text-[10px] font-black uppercase tracking-wider text-brand-accent mb-1">Teacher Remarks</p>
            <p className="text-xs font-semibold text-brand-text italic leading-relaxed">
              "{submission.teacher_comment}"
            </p>
          </div>
        )}
      </div>

      {/* Expandable "Review Submitted Answers" */}
      {questions.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowAnswers(!showAnswers)}
            className="w-full px-4 py-3 flex items-center justify-between font-bold text-xs text-brand-text hover:bg-brand-bg/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-brand-accent" />
              <span>Review Your Submitted Work ({questions.length} questions)</span>
            </div>
            {showAnswers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAnswers && (
            <div className="p-4 pt-0 space-y-3 border-t border-brand-border/40 max-h-[360px] overflow-y-auto divide-y divide-brand-border/30">
              {questions.map((q: any, idx: number) => {
                const ans = answers[q.id];
                return (
                  <div key={q.id || idx} className="pt-3 text-xs space-y-1">
                    <p className="font-bold text-brand-text">
                      <span className="text-brand-accent mr-1.5">{idx + 1}.</span>
                      {q.text}
                    </p>
                    <div className="pl-4">
                      {q.type === 'photo' ? (
                        ans ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-medium">
                            <Camera size={13} />
                            <span>Photo work submitted</span>
                          </div>
                        ) : (
                          <span className="text-brand-muted italic">No photo attached</span>
                        )
                      ) : q.type === 'mcq' ? (
                        <p className="text-brand-text/80 font-medium">
                          Selected: <span className="font-bold text-brand-text">{q.options?.[parseInt(ans)] || ans || 'Omitted'}</span>
                        </p>
                      ) : (
                        <p className="text-brand-text/80 italic font-mono bg-brand-bg/80 p-2 rounded-lg border border-brand-border/40">
                          {ans || 'No written response entered'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={onBackToAssignments}
          className="w-full py-4 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-brand-accent/20 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} />
          <span>Back to All Assignments</span>
        </button>

        <button
          type="button"
          onClick={onBackToHome}
          className="w-full py-3.5 rounded-2xl bg-brand-surface border border-brand-border text-brand-text font-bold text-xs hover:bg-brand-bg active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft size={15} />
          <span>Return to Study Dashboard</span>
        </button>

        {onExamsClick && (
          <button
            type="button"
            onClick={onExamsClick}
            className="w-full py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 font-bold text-xs hover:bg-amber-500/15 transition-all"
          >
            Take a Timed Exam or Assessment →
          </button>
        )}
      </div>
    </div>
  );
};
