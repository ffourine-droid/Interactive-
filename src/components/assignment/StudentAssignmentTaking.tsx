import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  FastForward, 
  HelpCircle, 
  Camera, 
  AlertCircle, 
  Send, 
  Loader2, 
  PenTool, 
  ListOrdered, 
  Layers, 
  Eye, 
  Trash2, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { PhotoZoomModal } from './PhotoZoomModal';
import { StudentPhotoInput } from './StudentPhotoInput';
import { AssignmentScratchpad } from './AssignmentScratchpad';
import { getDueStatusInfo } from './AssignmentCard';

interface Question {
  id: string;
  type: 'mcq' | 'short_answer' | 'photo';
  text: string;
  options: string[];
  correct_option: number | null;
  max_marks?: number;
  marks?: number;
  points?: number;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  class_id?: string;
  class_name?: string;
  due_date?: string;
  questions: Question[];
  is_broadcast?: boolean;
  teacher_id?: string;
  teacher?: {
    name?: string;
    school_name?: string;
  };
}

interface StudentAssignmentTakingProps {
  assignment: Assignment;
  studentName: string;
  initialAnswers?: Record<string, any>;
  initialSkipped?: Set<string>;
  onBack: () => void;
  onSubmit: (answers: Record<string, any>, files: Record<string, File>, skipped: Set<string>) => Promise<void>;
  onSaveDraftAnswer?: (questionId: string, val: any) => Promise<void>;
  onSkipQuestionRemote?: (questionId: string) => Promise<void>;
  submitting: boolean;
  needsClassSelection: boolean;
  availableClasses: { id: string; name: string }[];
  onSelectClass: (classId: string) => void;
}

export const StudentAssignmentTaking: React.FC<StudentAssignmentTakingProps> = ({
  assignment,
  studentName,
  initialAnswers = {},
  initialSkipped = new Set(),
  onBack,
  onSubmit,
  onSaveDraftAnswer,
  onSkipQuestionRemote,
  submitting,
  needsClassSelection,
  availableClasses,
  onSelectClass
}) => {
  const [viewMode, setViewMode] = useState<'focus' | 'list'>('focus'); // focus (one at a time) or list
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set(initialSkipped));
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered' | 'skipped'>('all');

  const saveTimers = useRef<Record<string, any>>({});
  const questions = assignment?.questions || [];
  const totalQuestions = questions.length;

  // Initialize from initialAnswers if they update (e.g. from draft)
  useEffect(() => {
    if (Object.keys(initialAnswers).length > 0) {
      setAnswers(prev => ({ ...initialAnswers, ...prev }));
    }
  }, [initialAnswers]);

  useEffect(() => {
    if (initialSkipped.size > 0) {
      setSkippedQuestions(new Set([...initialSkipped]));
    }
  }, [initialSkipped]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(filePreviews).forEach((url: string) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [filePreviews]);

  // Handle Answer Changes with debounce
  const handleAnswerChange = (questionId: string, val: any, isText = false) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));

    // Unmark as skipped if student answers
    if (skippedQuestions.has(questionId)) {
      setSkippedQuestions(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }

    setSaveStatus('saving');

    if (saveTimers.current[questionId]) {
      clearTimeout(saveTimers.current[questionId]);
    }

    const delay = isText ? 600 : 150;
    saveTimers.current[questionId] = setTimeout(async () => {
      if (onSaveDraftAnswer) {
        try {
          await onSaveDraftAnswer(questionId, val);
        } catch {}
      }
      // Also backup to localStorage
      try {
        localStorage.setItem(`assignment_draft_${assignment.id}_${questionId}`, JSON.stringify(val));
      } catch {}
      setSaveStatus('saved');
    }, delay);
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local blob preview
    const previewUrl = URL.createObjectURL(file);
    setFilePreviews(prev => ({ ...prev, [questionId]: previewUrl }));
    setFiles(prev => ({ ...prev, [questionId]: file }));
    handleAnswerChange(questionId, file.name, false);
  };

  const handleSelectPhotoFile = (questionId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setFilePreviews(prev => ({ ...prev, [questionId]: previewUrl }));
    setFiles(prev => ({ ...prev, [questionId]: file }));
    handleAnswerChange(questionId, file.name, false);
  };

  const handleRemovePhoto = (questionId: string) => {
    setFiles(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setFilePreviews(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  // Handle Question Skip
  const handleSkipQuestion = async (questionId: string, idx: number) => {
    setSkippedQuestions(prev => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });

    setAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

    setFiles(prev => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

    if (onSkipQuestionRemote) {
      try {
        await onSkipQuestionRemote(questionId);
      } catch {}
    }

    // In focus mode, automatically advance to next question
    if (viewMode === 'focus' && idx < totalQuestions - 1) {
      setCurrentIdx(idx + 1);
    }
  };

  // Stats calculation
  const answeredCount = questions.filter(q => {
    const hasAns = answers[q.id] !== undefined && answers[q.id] !== '' && !skippedQuestions.has(q.id);
    const hasFile = !!files[q.id];
    return hasAns || hasFile;
  }).length;

  const skippedCount = questions.filter(q => skippedQuestions.has(q.id)).length;
  const untouchedCount = totalQuestions - answeredCount - skippedCount;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const dueInfo = getDueStatusInfo(assignment.due_date);

  // Filter questions for display if filterMode is active
  const filteredIndices = questions.map((_, i) => i).filter(i => {
    const q = questions[i];
    const isSkipped = skippedQuestions.has(q.id);
    const isAnswered = !isSkipped && ((answers[q.id] !== undefined && answers[q.id] !== '') || !!files[q.id]);
    if (filterMode === 'unanswered') return !isAnswered && !isSkipped;
    if (filterMode === 'skipped') return isSkipped;
    return true;
  });

  const currentQuestion = questions[currentIdx] || questions[0];

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col pb-24 font-sans">
      {/* ── STICKY TOP APP BAR ── */}
      <header className="sticky top-0 z-40 bg-brand-surface/95 backdrop-blur-md border-b border-brand-border px-4 py-2.5 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors shrink-0"
              title="Return to assignments"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-accent truncate">
                  {assignment.subject}
                </span>
                <span className="text-brand-muted/40">•</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${dueInfo.color}`}>
                  {dueInfo.text}
                </span>
              </div>
              <h2 className="font-display font-black text-sm text-brand-text truncate leading-tight">
                {assignment.title}
              </h2>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Autosave badge */}
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-brand-muted bg-brand-bg px-2.5 py-1 rounded-full border border-brand-border">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 size={10} className="animate-spin text-amber-500" />
                  <span className="text-amber-600">Saving draft…</span>
                </>
              ) : (
                <>
                  <Check size={10} className="text-emerald-500" />
                  <span>Draft saved</span>
                </>
              )}
            </div>

            {/* Scratchpad Trigger */}
            <button
              type="button"
              onClick={() => setIsScratchpadOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand-bg hover:bg-brand-accent/10 text-brand-text hover:text-brand-accent border border-brand-border text-xs font-bold transition-all"
              title="Open Scratchpad / Rough Work"
            >
              <PenTool size={13} />
              <span className="hidden sm:inline">Scratchpad</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex bg-brand-bg rounded-xl p-0.5 border border-brand-border">
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'focus' ? 'bg-brand-accent text-white shadow-xs' : 'text-brand-muted hover:text-brand-text'
                }`}
                title="Focus Mode (1 question at a time)"
              >
                <Layers size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-brand-accent text-white shadow-xs' : 'text-brand-muted hover:text-brand-text'
                }`}
                title="List Mode (all questions view)"
              >
                <ListOrdered size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── STICKY PROGRESS & QUESTION NAVIGATOR ── */}
      <div className="sticky top-[53px] z-30 bg-brand-surface/90 backdrop-blur-md border-b border-brand-border px-4 py-2.5 shadow-xs">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Progress Metrics */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-brand-accent">
                {answeredCount}/{totalQuestions} Answered
              </span>
              {skippedCount > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {skippedCount} Skipped
                </span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
              {progressPercent}% Completed
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden border border-brand-border/60">
            <div 
              className="h-full bg-gradient-to-r from-brand-accent via-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick-Jump Question Strip */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-border/40">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar flex-1">
              {questions.map((q, idx) => {
                const isSkipped = skippedQuestions.has(q.id);
                const isAnswered = !isSkipped && ((answers[q.id] !== undefined && answers[q.id] !== '') || !!files[q.id]);
                const isCurrent = viewMode === 'focus' && currentIdx === idx;

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => {
                      if (viewMode === 'focus') {
                        setCurrentIdx(idx);
                      } else {
                        const el = document.getElementById(`q-card-${idx}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={`min-w-7 h-7 px-1 rounded-lg text-xs font-black transition-all flex items-center justify-center shrink-0 active:scale-95 ${
                      isCurrent
                        ? 'ring-2 ring-brand-accent ring-offset-1 bg-brand-accent text-white shadow-xs'
                        : isSkipped
                          ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                          : isAnswered
                            ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                            : 'bg-brand-bg text-brand-muted border border-brand-border hover:border-brand-accent/40'
                    }`}
                    title={`Question ${idx + 1}: ${isSkipped ? 'Skipped' : isAnswered ? 'Answered' : 'Untouched'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Quick Filter Menu for Jump Navigator */}
            <div className="flex items-center gap-1 shrink-0 pl-1">
              {(['all', 'unanswered', 'skipped'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterMode(f)}
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border transition-all ${
                    filterMode === f 
                      ? 'bg-brand-text text-white border-brand-text' 
                      : 'text-brand-muted bg-brand-bg border-brand-border/80 hover:text-brand-text'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unanswered' ? 'Left' : 'Skip'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TAKING CONTENT ── */}
      <main className="max-w-2xl mx-auto w-full px-4 pt-4 space-y-6 flex-1">
        {/* Student Profile Info Chip */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/15 text-brand-accent flex items-center justify-center font-black text-xs">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-brand-muted">Answering as</p>
              <p className="font-bold text-xs text-brand-text truncate">{studentName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-brand-muted font-medium">
            <span className="hidden sm:inline">Need calculation space?</span>
            <button
              type="button"
              onClick={() => setIsScratchpadOpen(true)}
              className="text-brand-accent hover:underline font-bold flex items-center gap-1"
            >
              <PenTool size={11} />
              Open Rough Work
            </button>
          </div>
        </div>

        {/* ──────────────── FOCUS MODE (1 QUESTION AT A TIME) ──────────────── */}
        {viewMode === 'focus' && currentQuestion && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 sm:p-6 shadow-sm relative space-y-5">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-brand-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-brand-accent text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {currentIdx + 1}
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                      Question {currentIdx + 1} of {totalQuestions}
                    </span>
                    <p className="text-[10px] font-bold text-brand-accent uppercase">
                      {currentQuestion.type === 'mcq' 
                        ? 'Multiple Choice' 
                        : currentQuestion.type === 'photo' 
                          ? 'Photo Capture' 
                          : 'Written Response'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-brand-bg border border-brand-border px-2.5 py-1 rounded-lg text-brand-muted font-mono">
                    {currentQuestion.marks !== undefined && currentQuestion.marks !== null ? currentQuestion.marks : (currentQuestion.max_marks || currentQuestion.points || 10)} Pts
                  </span>

                  {skippedQuestions.has(currentQuestion.id) ? (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                      <FastForward size={10} />
                      Skipped
                    </span>
                  ) : ((answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== '') || files[currentQuestion.id]) ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      Answered
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Question Statement */}
              <div className="text-base sm:text-lg font-bold text-brand-text leading-relaxed">
                {currentQuestion.text}
              </div>

              {/* Input Area Depending on Type */}
              <div className="pt-2">
                {/* 1. Multiple Choice */}
                {currentQuestion.type === 'mcq' && (
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQuestion.id] === optIdx.toString();
                      const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleAnswerChange(currentQuestion.id, optIdx.toString(), false)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between group active:scale-[0.99] ${
                            isSelected
                              ? 'bg-brand-accent/10 border-brand-accent text-brand-text shadow-xs'
                              : 'bg-brand-bg border-brand-border hover:border-brand-accent/40 text-brand-text/90'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${
                              isSelected
                                ? 'bg-brand-accent text-white shadow-xs'
                                : 'bg-brand-surface border border-brand-border text-brand-muted group-hover:text-brand-text'
                            }`}>
                              {letter}
                            </span>
                            <span className="font-semibold text-sm leading-snug">{opt}</span>
                          </div>

                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-brand-accent bg-brand-accent' : 'border-brand-border/60 group-hover:border-brand-accent/50'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. Short Answer Textarea */}
                {currentQuestion.type === 'short_answer' && (
                  <div className="space-y-2">
                    <textarea
                      placeholder="Write your answer clearly here. Formulas, reasoning, and working steps can be included..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, true)}
                      className="w-full min-h-[140px] p-4 rounded-2xl bg-brand-bg border-2 border-brand-border focus:border-brand-accent outline-none font-medium text-sm text-brand-text resize-y leading-relaxed transition-all shadow-inner"
                    />
                    <div className="flex items-center justify-between text-[11px] text-brand-muted px-1">
                      <span>
                        {(answers[currentQuestion.id] || '').trim() 
                          ? `${(answers[currentQuestion.id] || '').trim().split(/\s+/).length} words` 
                          : '0 words'}
                      </span>
                      <span>Autosaves as you type</span>
                    </div>
                  </div>
                )}

                {/* 3. Photo Upload Work */}
                {currentQuestion.type === 'photo' && (
                  <div className="pt-1">
                    <StudentPhotoInput
                      id={`photo-input-${currentQuestion.id}`}
                      file={files[currentQuestion.id]}
                      previewUrl={filePreviews[currentQuestion.id]}
                      onSelectFile={(f) => handleSelectPhotoFile(currentQuestion.id, f)}
                      onRemove={() => handleRemovePhoto(currentQuestion.id)}
                      onZoomPreview={(url) => setPreviewZoomImage(url)}
                      compact={false}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Card Controls: Skip & Jump */}
              <div className="pt-3 border-t border-brand-border/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSkipQuestion(currentQuestion.id, currentIdx)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 ${
                    skippedQuestions.has(currentQuestion.id)
                      ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                      : 'bg-brand-bg text-brand-muted hover:text-brand-text border-brand-border'
                  }`}
                >
                  <FastForward size={13} />
                  <span>{skippedQuestions.has(currentQuestion.id) ? 'Skipped ✓' : 'Skip for Now'}</span>
                </button>

                <div className="text-[11px] font-bold text-brand-muted">
                  {currentIdx + 1} / {totalQuestions}
                </div>
              </div>
            </div>

            {/* Pagination Navigation Footer */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className="flex-1 py-3 px-4 rounded-2xl border border-brand-border bg-brand-surface font-bold text-xs text-brand-text hover:bg-brand-bg disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {currentIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                  className="flex-1 py-3 px-4 rounded-2xl bg-brand-accent text-white font-bold text-xs hover:brightness-105 active:scale-98 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-brand-accent/20"
                >
                  <span>Next Question</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-wider text-xs hover:bg-emerald-700 active:scale-98 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 size={16} />
                  <span>Review & Finish</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ──────────────── LIST MODE (ALL QUESTIONS SCROLLABLE) ──────────────── */}
        {viewMode === 'list' && (
          <div className="space-y-4 animate-fade-in">
            {questions.map((q, idx) => {
              const isSkipped = skippedQuestions.has(q.id);
              const isAnswered = !isSkipped && ((answers[q.id] !== undefined && answers[q.id] !== '') || !!files[q.id]);

              return (
                <div
                  key={q.id || idx}
                  id={`q-card-${idx}`}
                  className={`bg-brand-surface border rounded-3xl p-5 shadow-xs space-y-4 transition-all ${
                    isSkipped
                      ? 'border-amber-500/30 bg-amber-500/[0.01]'
                      : isAnswered
                        ? 'border-emerald-500/30 bg-emerald-500/[0.01]'
                        : 'border-brand-border'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-brand-border/40">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        isSkipped 
                          ? 'bg-amber-500/20 text-amber-700' 
                          : isAnswered 
                            ? 'bg-emerald-500/20 text-emerald-700' 
                            : 'bg-brand-bg text-brand-accent border border-brand-border'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                        Question {idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md border border-brand-border">
                        {q.marks !== undefined && q.marks !== null ? q.marks : (q.max_marks || q.points || 10)} Pts
                      </span>
                      {isSkipped ? (
                        <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          Skipped
                        </span>
                      ) : isAnswered ? (
                        <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          Answered
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-base font-bold text-brand-text leading-snug">{q.text}</p>

                  {/* MCQ List */}
                  {q.type === 'mcq' && (
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[q.id] === optIdx.toString();
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, optIdx.toString(), false)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between text-xs font-semibold ${
                              isSelected
                                ? 'bg-brand-accent/10 border-brand-accent text-brand-text'
                                : 'bg-brand-bg border-brand-border hover:border-brand-accent/40 text-brand-text/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                isSelected ? 'bg-brand-accent text-white' : 'bg-brand-surface text-brand-muted'
                              }`}>
                                {letter}
                              </span>
                              <span>{opt}</span>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-brand-accent bg-brand-accent' : 'border-brand-border'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short answer */}
                  {q.type === 'short_answer' && (
                    <textarea
                      placeholder="Type your response..."
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value, true)}
                      className="w-full min-h-[90px] p-3 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-medium text-brand-text resize-y leading-relaxed"
                    />
                  )}

                  {/* Photo upload */}
                  {q.type === 'photo' && (
                    <div className="pt-1">
                      <StudentPhotoInput
                        id={`photo-input-list-${q.id}`}
                        file={files[q.id]}
                        previewUrl={filePreviews[q.id]}
                        onSelectFile={(f) => handleSelectPhotoFile(q.id, f)}
                        onRemove={() => handleRemovePhoto(q.id)}
                        onZoomPreview={(url) => setPreviewZoomImage(url)}
                        compact={true}
                      />
                    </div>
                  )}

                  {/* Action row */}
                  <div className="pt-2 border-t border-brand-border/40 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleSkipQuestion(q.id, idx)}
                      className="text-brand-muted hover:text-amber-600 font-bold flex items-center gap-1"
                    >
                      <FastForward size={12} />
                      {isSkipped ? 'Skipped ✓' : 'Skip'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentIdx(idx);
                        setViewMode('focus');
                      }}
                      className="text-brand-accent hover:underline font-bold"
                    >
                      Open in Focus Mode →
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Bottom Submit Action */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="w-full py-4 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-brand-accent/20 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                <span>Review & Submit Assignment</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── CLASS SELECTION PROMPT (FOR BROADCAST ASSIGNMENTS) ── */}
      {needsClassSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-accent">
                School-Wide Assignment
              </span>
              <h3 className="font-display font-black text-lg text-brand-text">Which class are you in?</h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Select your class stream so your teacher receives your submission.
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableClasses.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectClass(c.id)}
                  className="w-full p-3.5 rounded-xl border border-brand-border hover:border-brand-accent hover:bg-brand-accent/5 font-bold text-xs text-brand-text flex items-center justify-between transition-all"
                >
                  <span>{c.name}</span>
                  <ArrowRight size={14} className="text-brand-accent" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PRE-SUBMISSION CONFIRMATION & REVIEW MODAL ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/15 text-brand-accent flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-brand-text">Ready to Submit?</h3>
                <p className="text-xs text-brand-muted">Here is a quick summary of your answers:</p>
              </div>
            </div>

            {/* Tally Card */}
            <div className="bg-brand-bg rounded-2xl p-4 space-y-2.5 border border-brand-border/60 text-xs">
              <div className="flex justify-between items-center text-emerald-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Answered Questions
                </span>
                <span className="font-black text-sm">{answeredCount} / {totalQuestions}</span>
              </div>

              {skippedCount > 0 && (
                <div className="flex justify-between items-center text-amber-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <FastForward size={14} />
                    Skipped Questions
                  </span>
                  <span className="font-black text-sm">{skippedCount}</span>
                </div>
              )}

              {untouchedCount > 0 && (
                <div className="flex justify-between items-center text-brand-muted font-bold">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle size={14} />
                    Not Answered
                  </span>
                  <span className="font-black text-sm">{untouchedCount}</span>
                </div>
              )}
            </div>

            {untouchedCount > 0 || skippedCount > 0 ? (
              <p className="text-xs text-amber-700 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed font-medium">
                Tip: Any skipped or untouched questions will be marked as omitted. You can still return to answer them, or submit now.
              </p>
            ) : (
              <p className="text-xs text-emerald-700 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 leading-relaxed font-medium">
                All questions have been answered! Your work is complete and ready for your teacher.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-brand-border text-xs font-bold text-brand-text hover:bg-brand-bg transition-colors"
              >
                Review Work
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setShowReviewModal(false);
                  await onSubmit(answers, files, skippedQuestions);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-accent text-white text-xs font-black uppercase tracking-wider shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO ZOOM PREVIEW MODAL ── */}
      <PhotoZoomModal
        imageUrl={previewZoomImage}
        onClose={() => setPreviewZoomImage(null)}
      />

      {/* ── INTERACTIVE SCRATCHPAD DRAWER ── */}
      <AssignmentScratchpad
        assignmentId={assignment.id}
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
      />
    </div>
  );
};
