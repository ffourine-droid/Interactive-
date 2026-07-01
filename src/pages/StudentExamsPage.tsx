import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Clock, BookOpen, AlertCircle, 
  CheckCircle2, PlayCircle, Loader2, Search,
  Calendar, Star, Trophy, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { examService } from '../services/examService';
import { Exam, ExamAttempt } from '../types';
import { useToast } from '../components/Toast';
import { useStudent } from '../contexts/StudentContext';

interface StudentExamsPageProps {
  onBack: () => void;
  onStartExam: (examId: string) => void;
  grade?: string;
  classId?: string;
}

export default function StudentExamsPage({ onBack, onStartExam, grade = 'Grade 7', classId }: StudentExamsPageProps) {
  const { showToast } = useToast();
  const { currentStudent, setIsIdentityModalOpen } = useStudent();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Record<string, ExamAttempt>>({});
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchGrade, setSearchGrade] = useState(grade);
  const [filter, setFilter] = useState('all');
  const [pendingExamId, setPendingExamId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Initialize searchGrade from student grade once when loaded
  useEffect(() => {
    if (currentStudent?.grade) {
      setSearchGrade(currentStudent.grade);
    }
  }, [currentStudent?.grade]);

  useEffect(() => {
    fetchExams();
  }, [currentStudent]);

  const fetchExams = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const effectiveGrade = searchGrade || currentStudent?.grade || grade;

      const examData = await examService.searchExams(
        effectiveGrade,
        searchTeacher,
        searchSchool,
        searchCode
      );

      setExams(examData);

      if (currentStudent?.student_id) {
        const attemptData = await Promise.all(examData.map((e: Exam) => examService.getAttempt(e.id, currentStudent.student_id)));
        const attemptMap: Record<string, ExamAttempt> = {};
        attemptData.forEach((a: ExamAttempt | null) => {
          if (a) attemptMap[a.exam_id] = a;
        });
        setAttempts(attemptMap);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load assessments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExamClick = (id: string) => {
    if (!currentStudent) {
      setPendingExamId(id);
      setIsIdentityModalOpen(true);
    } else {
      onStartExam(id);
    }
  };

  useEffect(() => {
    if (currentStudent && pendingExamId) {
      onStartExam(pendingExamId);
      setPendingExamId(null);
    }
  }, [currentStudent, pendingExamId]);

  const filteredExams = exams.filter(e => {
    if (filter === 'completed') return attempts[e.id]?.is_submitted;
    if (filter === 'pending') return !attempts[e.id]?.is_submitted;
    return true;
  });

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-brand-accent blur-[100px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-brand-accent blur-[100px]" />
      </div>

      {/* Header */}
      <div className="bg-white/80 dark:bg-brand-card/80 backdrop-blur-2xl border-b border-brand-border sticky top-0 z-50 p-4">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center bg-brand-bg hover:bg-brand-accent/10 border border-brand-border rounded-xl transition-all active:scale-95 group"
            >
              <ArrowLeft size={18} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
            </button>
            <div>
              <h1 className="font-black text-xl text-brand-text leading-none tracking-tighter">ASSESSMENTS</h1>
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mt-1">Timed Exams & Tests</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
            <Trophy size={20} className="text-brand-accent" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-[480px] mx-auto p-4 space-y-6 relative z-10">

        {/* Search & Filter */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input
                type="text"
                value={searchTeacher}
                onChange={e => setSearchTeacher(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-all text-brand-text"
                placeholder="Teacher Name"
              />
              <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest rounded-md border border-brand-border/30">Teacher</span>
            </div>

            <div className="relative group">
              <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input
                type="text"
                value={searchSchool}
                onChange={e => setSearchSchool(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-all text-brand-text"
                placeholder="School Name"
              />
              <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest rounded-md border border-brand-border/30">School</span>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input
                type="text"
                value={searchCode}
                onChange={e => setSearchCode(e.target.value.toUpperCase())}
                className="w-full bg-brand-surface border-2 border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-black focus:border-brand-accent outline-none transition-all text-brand-accent uppercase tracking-widest"
                placeholder="SHARE CODE"
              />
              <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest rounded-md border border-brand-border/30">Direct Code</span>
            </div>

            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <select
                value={searchGrade}
                onChange={e => setSearchGrade(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-all appearance-none text-brand-text"
              >
                {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest rounded-md border border-brand-border/30">Grade</span>
            </div>
          </div>

          <button
            onClick={fetchExams}
            disabled={loading}
            className="w-full bg-brand-text text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Search Assessments
          </button>

          {/* Filter pills */}
          <div className="flex items-center gap-2">
            {['all', 'pending', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all border ${
                  filter === f
                    ? 'bg-brand-accent text-white border-brand-accent shadow-xl shadow-brand-accent/20'
                    : 'bg-brand-surface text-brand-muted hover:text-brand-accent border-brand-border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <Loader2 className="animate-spin text-brand-accent" size={40} />
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.3em]">Loading assessments...</p>
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="w-24 h-24 rounded-[3rem] bg-brand-accent/5 flex items-center justify-center text-brand-accent/20">
              <Search size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-xl text-brand-text uppercase tracking-tighter">Find Your Test</h3>
              <p className="text-xs text-brand-muted max-w-[240px] font-bold mx-auto leading-relaxed">
                Enter your school, teacher name, or share code to find your assessments.
              </p>
            </div>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="w-24 h-24 rounded-[3rem] bg-brand-accent/5 flex items-center justify-center text-brand-accent/20">
              <AlertCircle size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-xl text-brand-text uppercase tracking-tighter">No Assessments Found</h3>
              <p className="text-xs text-brand-muted max-w-[240px] font-bold mx-auto leading-relaxed">
                No assessments found for {searchGrade}. Try a different search.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-brand-border">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Available Assessments</span>
              <span className="text-[10px] font-black text-brand-accent">{filteredExams.length} Total</span>
            </div>

            {filteredExams.map((exam, idx) => {
              const attempt = attempts[exam.id];
              const isCompleted = attempt?.is_submitted;
              const isStarted = attempt && !isCompleted;

              let statusText = 'Begin Assessment';
              let statusColor = 'bg-brand-accent';
              let statusIcon = <PlayCircle size={18} />;

              if (isCompleted) {
                statusText = attempt.has_overtime ? 'Submitted with Overtime' : 'Assessment Completed';
                statusColor = attempt.has_overtime ? 'bg-orange-500' : 'bg-emerald-500';
                statusIcon = <CheckCircle2 size={18} />;
              } else if (isStarted) {
                statusText = 'Resume Session';
                statusColor = 'bg-orange-500';
                statusIcon = <Loader2 className="animate-spin" size={18} />;
              }

              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, ease: 'easeOut' }}
                  className="bg-white dark:bg-brand-card rounded-[2.5rem] p-6 border border-brand-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
                >
                  <div className="absolute top-4 right-4">
                    <div className="bg-brand-bg px-3 py-1 rounded-full border border-brand-border">
                      <span className="text-[8px] font-black uppercase text-brand-muted tracking-widest">{exam.grade}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(244,123,32,0.4)]" />
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.15em]">{exam.subject}</span>
                      </div>
                      <h3 className="font-black text-2xl text-brand-text leading-tight tracking-tighter group-hover:text-brand-accent transition-colors pr-16">
                        {exam.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-brand-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center">
                            <Star size={12} className="text-brand-accent" />
                          </div>
                          <span className="text-[10px] font-bold text-brand-muted uppercase">{(exam as any).teacher?.name || 'Academic Core'}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-60">
                          <BookOpen size={12} className="text-brand-muted" />
                          <span className="text-[10px] font-bold text-brand-muted uppercase">{exam.questions.length} Questions</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-brand-bg/50 rounded-2xl p-4 border border-brand-border flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-brand-muted opacity-50 mb-1">
                          <Clock size={12} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Time</span>
                        </div>
                        <span className="text-lg font-black text-brand-text tracking-tighter">{exam.duration_minutes} Mins</span>
                      </div>
                      <div className="bg-brand-bg/50 rounded-2xl p-4 border border-brand-border flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-brand-muted opacity-50 mb-1">
                          <Star size={12} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Marks</span>
                        </div>
                        <span className="text-lg font-black text-brand-text tracking-tighter">
                          {exam.questions.reduce((s: number, q: any) => s + (q.marks || 0), 0)} Pts
                        </span>
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-emerald-600/60 tracking-widest mb-1">Your Score</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-2xl text-emerald-600 tracking-tighter">
                              {Math.round((attempt.score! / attempt.total_marks!) * 100)}%
                            </span>
                            <div className="h-4 w-px bg-emerald-500/20" />
                            <span className="text-[10px] font-black text-emerald-600/80 uppercase">
                              {attempt.score}/{attempt.total_marks}
                            </span>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                          <CheckCircle2 size={20} />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartExamClick(exam.id)}
                        className={`w-full group flex items-center justify-center gap-3 py-5 rounded-[2rem] text-white font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-[0.97] hover:brightness-105 ${statusColor} shadow-brand-accent/20`}
                      >
                        {statusIcon}
                        {statusText}
                        <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <footer className="pt-20 pb-8 text-center">
          <p className="text-[9px] font-black text-brand-muted uppercase tracking-[0.5em]">AZILEARN ASSESSMENTS</p>
        </footer>
      </div>
    </div>
  );
}
