import React from 'react';
import { 
  FileText, 
  Clock, 
  ArrowRight, 
  School, 
  CheckCircle2, 
  Sparkles,
  BookOpen,
  Calculator,
  Compass,
  GraduationCap
} from 'lucide-react';

export interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  due_date?: string;
  created_at?: string;
  questions?: any[];
  is_broadcast?: boolean;
  teacher_id?: string;
  teacher?: {
    name?: string;
    school_name?: string;
  };
  // Submission or draft status if known
  submission_status?: 'not_started' | 'draft' | 'submitted' | 'graded';
  has_submitted?: boolean;
  score?: number | null;
  teacher_comment?: string | null;
}

interface AssignmentCardProps {
  assignment: AssignmentItem;
  onSelect: (assignmentId: string) => void;
  index?: number;
}

export const getSubjectIcon = (subject: string) => {
  const sub = (subject || '').toLowerCase();
  if (sub.includes('math') || sub.includes('algebra') || sub.includes('geometry')) {
    return Calculator;
  }
  if (sub.includes('sci') || sub.includes('bio') || sub.includes('chem') || sub.includes('phy')) {
    return Compass;
  }
  if (sub.includes('eng') || sub.includes('lit') || sub.includes('read') || sub.includes('lang')) {
    return BookOpen;
  }
  return GraduationCap;
};

export const getDueStatusInfo = (dateStr?: string) => {
  if (!dateStr) return { text: 'No due date', color: 'text-brand-muted bg-brand-muted/10', urgent: false };
  const due = new Date(dateStr);
  if (isNaN(due.getTime())) return { text: 'No due date', color: 'text-brand-muted bg-brand-muted/10', urgent: false };
  
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) {
    return { text: 'Overdue', color: 'text-rose-600 bg-rose-500/10 border-rose-500/20', urgent: true };
  }
  if (days === 0) {
    return { text: 'Due Today', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', urgent: true };
  }
  if (days === 1) {
    return { text: 'Due Tomorrow', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', urgent: true };
  }
  if (days <= 3) {
    return { text: `Due in ${days} days`, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', urgent: false };
  }
  return { text: `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, color: 'text-brand-muted bg-brand-surface border-brand-border', urgent: false };
};

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  onSelect
}) => {
  const SubjectIcon = getSubjectIcon(assignment.subject);
  const dueInfo = getDueStatusInfo(assignment.due_date);
  const questionCount = assignment.questions?.length || 0;
  
  // Determine card status badge
  const isGraded = assignment.submission_status === 'graded' || (assignment.score !== null && assignment.score !== undefined);
  const isSubmitted = assignment.has_submitted || assignment.submission_status === 'submitted' || isGraded;
  const isDraft = assignment.submission_status === 'draft';

  return (
    <div
      onClick={() => onSelect(assignment.id)}
      className="group relative overflow-hidden bg-brand-surface border border-brand-border border-b-[3px] border-b-brand-border/80 hover:border-brand-accent/40 rounded-2xl p-4 transition-all shadow-xs hover:shadow-md cursor-pointer active:translate-y-[1px]"
    >
      {/* Top row: Subject, Badges & Due Status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-accent/10 text-brand-accent border border-brand-accent/15">
            <SubjectIcon size={11} />
            {assignment.subject || 'General'}
          </span>

          {assignment.is_broadcast && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-500/10 border border-indigo-500/20">
              <School size={9} />
              School-wide
            </span>
          )}

          {assignment.grade && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold text-brand-muted bg-brand-bg border border-brand-border/60">
              {assignment.grade}
            </span>
          )}
        </div>

        {/* Due Date or Status */}
        {isGraded ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle2 size={11} />
            {assignment.score}% Graded
          </span>
        ) : isSubmitted ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-500/10 border border-blue-500/25">
            <CheckCircle2 size={11} />
            Submitted
          </span>
        ) : isDraft ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-500/10 border border-amber-500/25">
            <Sparkles size={11} />
            Draft Saved
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${dueInfo.color}`}>
            <Clock size={10} />
            {dueInfo.text}
          </span>
        )}
      </div>

      {/* Assignment Title */}
      <h3 className="font-display font-black text-base text-brand-text group-hover:text-brand-accent transition-colors leading-snug line-clamp-2 mb-1.5">
        {assignment.title}
      </h3>

      {/* Teacher / School Attribution */}
      <div className="flex items-center gap-1.5 text-xs text-brand-muted mb-3 flex-wrap">
        {assignment.teacher?.name && (
          <span className="font-semibold text-brand-text/80">
            {assignment.teacher.name}
          </span>
        )}
        {assignment.teacher?.school_name && (
          <>
            <span className="text-brand-muted/40">•</span>
            <span className="truncate max-w-[200px] text-brand-muted">
              {assignment.teacher.school_name}
            </span>
          </>
        )}
      </div>

      {/* Footer Info & Action */}
      <div className="flex items-center justify-between pt-2.5 border-t border-brand-border/40 text-xs">
        <div className="flex items-center gap-2 text-brand-muted font-medium text-[11px]">
          <span className="flex items-center gap-1">
            <FileText size={12} className="text-brand-accent" />
            {questionCount > 0 ? `${questionCount} ${questionCount === 1 ? 'Question' : 'Questions'}` : 'Exercises included'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-black text-brand-accent group-hover:translate-x-0.5 transition-transform">
          <span>
            {isGraded ? 'View Grade' : isSubmitted ? 'View Submission' : isDraft ? 'Resume Draft' : 'Start Task'}
          </span>
          <ArrowRight size={13} />
        </div>
      </div>
    </div>
  );
};
