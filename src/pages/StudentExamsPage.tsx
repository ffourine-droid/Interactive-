import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Clock, BookOpen, AlertCircle, 
  CheckCircle2, PlayCircle, Loader2, Search,
  Filter, Calendar, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { examService } from '../services/examService';
import { Exam, ExamAttempt } from '../types';
import { useToast } from '../components/Toast';

interface StudentExamsPageProps {
  onBack: () => void;
  onStartExam: (examId: string) => void;
  grade?: string;
  classId?: string;
}

export default function StudentExamsPage({ onBack, onStartExam, grade = 'Grade 7', classId }: StudentExamsPageProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Record<string, ExamAttempt>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExamsAndAttempts();
    }, 400);
    return () => clearTimeout(timer);
  }, [grade, classId, search]);

  const fetchExamsAndAttempts = async () => {
    setLoading(true);
    try {
      const studentStr = localStorage.getItem('azilearn_student');
      const student = studentStr ? JSON.parse(studentStr) : null;
      const effectiveGrade = student?.grade || grade;

      // Seed prebuilt if necessary
      await examService.seedPrebuiltExams();

      const examData = await examService.searchExams(effectiveGrade, search);
      setExams(examData);

      if (student?.id) {
        const attemptPromises = examData.map(e => examService.getAttempt(e.id, student.id));
        const attemptData = await Promise.all(attemptPromises);
        const attemptMap: Record<string, ExamAttempt> = {};
        attemptData.forEach(a => {
          if (a) attemptMap[a.exam_id] = a;
        });
        setAttempts(attemptMap);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(e => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'completed' && attempts[e.id]?.is_submitted) ||
                         (filter === 'pending' && !attempts[e.id]?.is_submitted);
    return matchesFilter;
  });

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-brand-card/80 backdrop-blur-xl border-b border-brand-accent/10 sticky top-0 z-50 p-4">
        <div className="max-w-[420px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center hover:bg-brand-accent/10 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-brand-accent" />
            </button>
            <h1 className="font-sans font-bold text-xl text-brand-text">Timed Exams</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center">
            <Star size={16} className="text-brand-accent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-[420px] mx-auto p-4 space-y-6">
        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search teacher, school or exam..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-brand-card border border-brand-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {['all', 'pending', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  filter === f 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' 
                    : 'bg-white dark:bg-brand-card text-brand-muted hover:text-brand-accent border border-brand-accent/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Exams List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
            <Loader2 className="animate-spin text-brand-accent mb-4" size={32} />
            <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">Preparing exams...</p>
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="space-y-4">
            {filteredExams.map((exam, idx) => {
              const attempt = attempts[exam.id];
              const isCompleted = attempt?.is_submitted;
              const isStarted = attempt && !isCompleted;
              
              // Calculate status display
              let statusText = 'Start Exam';
              let statusColor = 'bg-brand-accent';
              if (isCompleted) {
                statusText = attempt.has_overtime ? 'Overtime Submitted' : '✅ Completed';
                statusColor = attempt.has_overtime ? 'bg-orange-500' : 'bg-green-500';
              } else if (isStarted) {
                statusText = 'Continue Exam';
                statusColor = 'bg-orange-500';
              }

              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-brand-card rounded-3xl p-5 border border-brand-accent/5 shadow-xl shadow-brand-accent/5 relative overflow-hidden group"
                >
                  {/* Subject Badge */}
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-brand-accent/10 text-brand-accent text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">
                    {exam.subject}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                      <h3 className="font-sans font-bold text-lg text-brand-text truncate pr-20">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                        <span className="flex items-center gap-1 text-brand-accent font-black">{(exam as any).teacher?.name || 'Prebuilt Exam'}</span>
                        <span className="w-1 h-1 rounded-full bg-brand-muted/30" />
                        <span className="flex items-center gap-1 italic">{(exam as any).teacher?.school_name || 'Azilearn Academy'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-brand-muted uppercase tracking-wider pt-1">
                        <span className="flex items-center gap-1"><Calendar size={12}/> {exam.grade}</span>
                        <span className="w-1 h-1 rounded-full bg-brand-muted/30" />
                        <span className="flex items-center gap-1"><BookOpen size={12}/> {exam.questions.length} Questions</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-brand-bg rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-brand-accent/5">
                         <Clock size={16} className="text-brand-accent mb-1" />
                         <span className="text-[10px] font-black uppercase text-brand-muted tracking-widest">Duration</span>
                         <span className="text-sm font-bold text-brand-text">{exam.duration_minutes} min</span>
                      </div>
                      <div className="bg-brand-bg rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-brand-accent/5">
                         <Star size={16} className="text-brand-accent mb-1" />
                         <span className="text-[10px] font-black uppercase text-brand-muted tracking-widest">Marks</span>
                         <span className="text-sm font-bold text-brand-text">{exam.questions.reduce((s,q) => s + q.marks, 0)} Total</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                       {isCompleted ? (
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-brand-muted tracking-widest mb-1">Score Result</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg text-white text-[10px] font-black uppercase ${statusColor}`}>
                                {statusText}
                              </span>
                              <span className="font-sans font-black text-brand-accent text-lg">
                                {attempt.score}/{attempt.total_marks}
                              </span>
                            </div>
                         </div>
                       ) : (
                         <button
                          onClick={() => onStartExam(exam.id)}
                          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 ${statusColor} shadow-${statusColor.split('-')[1]}-500/20`}
                         >
                           {isStarted ? <Loader2 className="animate-spin" size={16} /> : <PlayCircle size={18} />}
                           {statusText}
                         </button>
                       )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-brand-accent/5 flex items-center justify-center text-brand-accent/30">
                <AlertCircle size={32} />
             </div>
             <div className="space-y-1">
                <p className="font-bold text-brand-text">No Exams Found</p>
                <p className="text-xs text-brand-muted max-w-[200px]">There are no published exams for your grade yet. Check back later!</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
