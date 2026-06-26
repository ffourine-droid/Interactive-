import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Clock, CheckCircle2, ChevronLeft, ChevronRight,
  Send, AlertCircle, Loader2, Info, Timer, MessageCircle, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { examService } from '../services/examService';
import { Exam, ExamAttempt, Question } from '../types';
import { useToast } from '../components/Toast';
import { useStudent } from '../contexts/StudentContext';

interface TakeExamPageProps {
  examId: string;
  onBack: () => void;
  onSubmitted: (attempt: ExamAttempt) => void;
}

export default function TakeExamPage({ examId, onBack, onSubmitted }: TakeExamPageProps) {
  const { showToast } = useToast();
  const { currentStudent } = useStudent();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentTime, setCurrentTime] = useState<string>('00:00');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<'taking' | 'result'>('taking');
  const [logs, setLogs] = useState<any[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initExam();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId]);

  const initExam = async () => {
    try {
      if (!currentStudent) {
        showToast('Student data missing', 'error');
        onBack();
        return;
      }

      const examData = await examService.getExamById(examId);
      setExam(examData);

      const attemptData = await examService.startExamAttempt(examId, currentStudent.student_id);
      
      if (attemptData.submitted_at) {
        setAttempt(attemptData);
        setAnswers(attemptData.answers || {});
        const l = await examService.getAnswerLogs(attemptData.id);
        setLogs(l);
        setStep('result');
      } else {
        setAttempt(attemptData);
        setAnswers(attemptData.answers || {});

        // Calculate timer
        const startTime = new Date(attemptData.started_at).getTime();
        const durationMs = examData.duration_minutes * 60 * 1000;
        const endTime = startTime + durationMs;

        startTimer(endTime);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize assessment', 'error');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (endTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const updateTimer = () => {
      const now = Date.now();
      const diff = endTime - now;
      
      if (diff <= 0) {
        setIsOvertime(true);
        setTimeLeftSeconds(0);
        setCurrentTime('00:00');
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setTimeLeftSeconds(Math.floor(diff / 1000));
        const mins = Math.floor(diff / 1000 / 60);
        const secs = Math.floor((diff / 1000) % 60);
        setCurrentTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const handleAnswerChange = async (qIndex: number, value: string) => {
    setAnswers(prev => ({ ...prev, [qIndex]: value }));

    try {
      if (attempt) {
        await examService.logAnswer(attempt.id, qIndex, value, isOvertime);
      }
    } catch (err) {
      console.error('Failed to log answer:', err);
    }
  };

  const handleSubmit = async () => {
    if (!exam || !attempt) return;
    
    setIsSubmitting(true);
    try {
      const finalAttempt = await examService.submitExam(attempt.id, exam, answers, isOvertime);
      setAttempt(finalAttempt);
      const l = await examService.getAnswerLogs(finalAttempt.id);
      setLogs(l);
      setStep('result');
      showToast('Assessment submitted successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8 grayscale opacity-50">
        <Loader2 className="animate-spin text-brand-accent mb-4" size={40} />
        <p className="text-xs font-black text-brand-muted uppercase tracking-widest animate-pulse">Loading Assessment Canvas...</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const timerColor = isOvertime ? 'text-red-500' : timeLeftSeconds < 120 ? 'text-orange-500' : 'text-brand-accent';

  if (step === 'result' && attempt) {
    const totalMarks = exam.questions.reduce((acc, q) => acc + q.marks, 0);
    const mcqQuestions = exam.questions.filter(q => q.type === 'mcq');
    const mcqMarks = mcqQuestions.reduce((acc, q) => acc + q.marks, 0);
    
    let gradedMcqScore = 0;
    mcqQuestions.forEach(q => {
      if (answers[q.index] === q.correct_answer) {
        gradedMcqScore += q.marks;
      }
    });

    const percentage = Math.round((attempt.score! / totalMarks) * 100);

    return (
      <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-bottom from-brand-accent/20 to-transparent blur-[120px]" />
        </div>

        <header className="bg-white/90 dark:bg-brand-card/90 backdrop-blur-2xl border-b border-brand-border sticky top-0 z-50 p-4">
           <div className="max-w-3xl mx-auto flex items-center justify-between">
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="text-center">
                 <h1 className="font-black text-xs uppercase tracking-[0.3em] text-brand-muted mb-0.5">Assessment Submitted</h1>
                 <p className="font-black text-sm text-brand-text truncate max-w-[200px]">{exam.title}</p>
              </div>
              <div className="w-10" />
           </div>
        </header>

        <main className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto p-4 sm:p-8 space-y-8 relative z-10">
           <motion.div 
             initial={{ scale: 0.95, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             className="bg-white dark:bg-brand-card rounded-[3rem] p-10 border border-brand-border shadow-2xl shadow-brand-accent/5 overflow-hidden relative"
           >
              <div className="absolute top-0 right-0 p-8 text-brand-accent/10">
                 <Trophy size={48} className="-rotate-12" />
              </div>

              <div className="relative flex flex-col items-center text-center space-y-8">
                <div className="space-y-2">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/10 rounded-full border border-brand-accent/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                      <span className="text-[9px] font-black text-brand-accent uppercase tracking-[0.2em]">Official Report</span>
                   </div>
                   <h2 className="text-5xl font-black text-brand-text tracking-tighter uppercase leading-none mt-4">Finished!</h2>
                   <p className="text-sm font-bold text-brand-muted max-w-[280px] leading-relaxed">Your assessment has been submitted and sent to your teacher for review.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  <div className="bg-brand-bg/50 rounded-[2.5rem] p-6 border border-brand-border flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-brand-accent" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted mb-3">Overall Mastery</p>
                    <p className="text-5xl font-black text-brand-text tracking-tighter tabular-nums">{percentage}%</p>
                  </div>
                  
                  <div className="bg-brand-bg/50 rounded-[2.5rem] p-6 border border-brand-border flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted mb-3">Objective Result</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-brand-text tracking-tighter tabular-nums">{gradedMcqScore}</span>
                      <span className="text-xs font-bold text-brand-muted">/ {mcqMarks}</span>
                    </div>
                  </div>

                  <div className={`rounded-[2.5rem] p-6 border flex flex-col items-center justify-center relative overflow-hidden group ${attempt.score !== null ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 ${attempt.score !== null ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted mb-3 italic">Subjective Review</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-black tracking-tighter tabular-nums ${attempt.score !== null ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {attempt.score !== null ? `${attempt.score - gradedMcqScore}` : '...'}
                      </span>
                      <span className="text-xs font-bold text-brand-muted">/ {totalMarks - mcqMarks}</span>
                    </div>
                  </div>
                </div>

                {attempt.teacher_feedback && (
                  <div className="w-full bg-brand-bg rounded-3xl p-8 border border-brand-border text-left relative group">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                          <MessageCircle size={20} />
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-accent">Instructor Commentary</p>
                          <p className="font-bold text-xs text-brand-muted">Teacher Feedback</p>
                       </div>
                    </div>
                    <p className="text-lg font-black text-brand-text leading-tight tracking-tight italic">"{attempt.teacher_feedback}"</p>
                  </div>
                )}
              </div>
           </motion.div>

           <section className="space-y-6">
              <div className="flex items-center justify-between px-4">
                 <h3 className="font-black text-xs uppercase tracking-[0.4em] text-brand-muted flex items-center gap-4">
                    <div className="w-8 h-[2px] bg-brand-border" />
                    ASSESSMENT SUMMARY
                 </h3>
                 <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest">{exam.questions.length} Questions Answered</span>
              </div>

              <div className="grid grid-cols-1 gap-6 pb-20">
                {exam.questions.map((q, idx) => {
                  const answer = answers[idx];
                  const isCorrect = q.type === 'mcq' && answer === q.correct_answer;
                  const isIncorrect = q.type === 'mcq' && answer !== q.correct_answer && answer !== undefined;
                  const log = logs.find(l => l.question_index === idx);
                  const isLogOvertime = log?.is_overtime;

                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white dark:bg-brand-card rounded-[2.5rem] p-8 border border-brand-border shadow-xl shadow-brand-accent/5 relative overflow-hidden"
                    >
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-brand-bg dark:bg-brand-bg border border-brand-border flex items-center justify-center font-black text-brand-text text-sm">
                                {idx + 1}
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted">{q.type === 'mcq' ? 'Multiple Choice' : 'Written Answer'}</span>
                          </div>
                          <div className="flex gap-2">
                             {isLogOvertime && (
                                <div className="px-3 py-1 bg-amber-500 text-white rounded-lg flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                                   <Clock size={12} />
                                   <span className="text-[9px] font-black uppercase tracking-widest">Late</span>
                                </div>
                             )}
                             {isCorrect && (
                                <div className="px-3 py-1 bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                                   <CheckCircle2 size={12} />
                                   <span className="text-[9px] font-black uppercase tracking-widest">Correct</span>
                                </div>
                             )}
                          </div>
                       </div>

                       <h4 className="font-black text-xl text-brand-text mb-6 leading-tight tracking-tighter">{q.question}</h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-5 bg-brand-bg/50 rounded-2xl border border-brand-border">
                             <p className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-muted mb-2">Your Answer</p>
                             <p className={`text-sm font-bold leading-relaxed ${isIncorrect ? 'text-red-500' : isCorrect ? 'text-emerald-600' : 'text-brand-text'}`}>
                               {answer || <span className="italic opacity-30">No answer</span>}
                             </p>
                          </div>
                          
                          {(q.type === 'mcq' || q.correct_answer) && (
                            <div className={`p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-brand-bg/50 border-brand-border'}`}>
                               <p className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-muted mb-2">Teacher Benchmark</p>
                               <p className={`text-sm font-black ${isCorrect ? 'text-emerald-700' : 'text-brand-accent'}`}>{q.correct_answer}</p>
                            </div>
                          )}
                       </div>
                    </motion.div>
                  );
                })}
              </div>

              <button 
                onClick={onBack}
                className="w-full group bg-brand-text text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-brand-text/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 hover:brightness-110"
              >
                Go Back
                <ArrowLeft size={18} className="rotate-180 transition-transform group-hover:translate-x-2" />
              </button>
           </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col pt-[100px] font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4" />
      </div>

      <div className="fixed top-0 left-0 right-0 z-[100] bg-white/95 dark:bg-brand-card/95 backdrop-blur-2xl border-b border-brand-border p-5 transition-colors">
         <div className="max-w-4xl mx-auto flex items-center justify-between gap-8">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                  <h2 className="font-black text-sm text-brand-text truncate leading-none uppercase tracking-tighter">{exam.title}</h2>
               </div>
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-brand-bg rounded-lg border border-brand-border">
                    <CheckCircle2 size={12} className="text-brand-accent" />
                    <span className="text-[10px] font-black text-brand-text uppercase tracking-widest tabular-nums">{answeredCount}/{exam.questions.length} Answered</span>
                  </div>
                  <div className="h-4 w-px bg-brand-border" />
                  <span className="text-[9px] font-black text-brand-muted uppercase tracking-[0.2em]">{exam.subject}</span>
               </div>
            </div>

            <div className="flex items-center gap-6">
               <div className={`flex flex-col items-end transition-colors ${timerColor}`}>
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] leading-none mb-1 opacity-60">Time Left</span>
                  <div className="font-black text-3xl tabular-nums leading-none tracking-tighter">
                    {isOvertime ? 'LATE' : currentTime}
                  </div>
               </div>

               <button 
                onClick={() => setShowConfirm(true)}
                className="group relative bg-brand-accent hover:brightness-110 px-8 py-3.5 rounded-2xl text-white font-black uppercase text-xs tracking-[0.15em] shadow-[0_10px_30px_rgba(244,123,32,0.3)] active:scale-95 transition-all overflow-hidden"
               >
                 <span className="relative z-10">SUBMIT ASSESSMENT</span>
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
               </button>
            </div>
         </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-12 max-w-4xl mx-auto w-full relative z-10 space-y-20">
        {isOvertime && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-red-500/10 border-2 border-red-500/20 rounded-[2.5rem] flex items-center gap-6 mb-12 shadow-[0_15px_40px_rgba(239,68,68,0.1)]"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
               <Clock size={28} className="text-white animate-pulse" />
            </div>
            <div className="space-y-1">
               <p className="font-black text-sm text-red-500 uppercase tracking-[0.2em]">Time Up</p>
               <p className="text-xs text-red-500/70 font-bold leading-relaxed max-w-[400px]">
                 Your time has ended. You can still finish your answers, but they will be marked as late.
               </p>
            </div>
          </motion.div>
        )}

        {exam.questions.map((q, idx) => {
          const isAnswered = answers[idx] !== undefined && answers[idx] !== '';
          return (
            <motion.div 
              key={idx} 
              id={`q-${idx}`} 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-10 group"
            >
              <div className="flex items-center justify-between group-focus-within:translate-x-2 transition-transform duration-500">
                 <div className="flex items-center gap-6">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all duration-500 ${
                     isAnswered ? 'bg-brand-accent text-white shadow-[0_15px_35px_rgba(244,123,32,0.3)]' : 'bg-brand-bg dark:bg-brand-card border border-brand-border text-brand-muted'
                   }`}>
                     {idx + 1}
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em] opacity-40">Question {idx + 1}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-brand-text uppercase tracking-widest">{q.type === 'mcq' ? 'Multiple Choice' : 'Write Answer'}</span>
                        <div className="h-1 w-1 rounded-full bg-brand-border" />
                        <span className="text-[11px] font-black text-brand-accent tracking-tighter uppercase">{q.marks} Pts</span>
                      </div>
                   </div>
                 </div>
                 {isAnswered && (
                   <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={24} />
                   </motion.div>
                 )}
              </div>

              <div className="space-y-8 pl-2 sm:pl-20">
                 <h4 className="font-black text-3xl text-brand-text leading-[1.1] tracking-tighter group-focus-within:text-brand-accent transition-colors duration-500">
                   {q.question}
                 </h4>
                 
                 <div className="max-w-[600px]">
                    {q.type === 'mcq' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {q.options?.map((opt, optIdx) => {
                          const isSelected = answers[idx] === opt;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleAnswerChange(idx, opt)}
                              className={`p-6 rounded-[2rem] text-left border-2 transition-all flex items-center gap-6 group relative overflow-hidden active:scale-[0.98] ${
                                isSelected 
                                  ? 'bg-brand-text border-brand-text text-white shadow-2xl shadow-brand-text/30' 
                                  : 'bg-white dark:bg-brand-card border-brand-border text-brand-text hover:border-brand-accent/50 hover:shadow-xl hover:shadow-brand-accent/5'
                              }`}
                            >
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                                 isSelected ? 'bg-brand-accent text-white' : 'bg-brand-bg text-brand-muted group-hover:text-brand-accent'
                               }`}>
                                  {String.fromCharCode(65 + optIdx)}
                               </div>
                               <span className="font-bold text-sm tracking-tight leading-tight">{opt}</span>
                               {isSelected && (
                                  <div className="absolute top-0 right-0 p-2">
                                     <CheckCircle2 size={14} className="text-brand-accent" />
                                  </div>
                               )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative group/ta">
                        <div className="absolute -left-6 top-0 bottom-0 w-1 bg-brand-accent/10 rounded-full scale-y-0 group-focus-within/ta:scale-y-100 transition-transform duration-500 origin-top" />
                        <textarea
                          value={answers[idx] || ''}
                          onChange={e => handleAnswerChange(idx, e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full bg-white dark:bg-brand-card border-2 border-brand-border rounded-[2.5rem] p-8 text-lg font-bold min-h-[200px] focus:border-brand-accent focus:ring-8 focus:ring-brand-accent/5 outline-none transition-all text-brand-text placeholder:text-brand-muted/20 tracking-tight leading-relaxed shadow-inner"
                        />
                      </div>
                    )}
                 </div>
              </div>

              {idx < exam.questions.length - 1 && (
                <div className="flex items-center gap-4 py-8 pointer-events-none opacity-[0.05]">
                  <div className="h-px bg-brand-text flex-1" />
                  <Trophy size={16} />
                  <div className="h-px bg-brand-text flex-1" />
                </div>
              )}
            </motion.div>
          );
        })}

        <div className="pt-20 pb-12 flex flex-col items-center space-y-8">
           <div className="w-px h-24 bg-gradient-to-bottom from-brand-border to-transparent" />
           <div className="text-center space-y-3">
              <h3 className="font-black text-lg text-brand-text tracking-tighter uppercase leading-none">Finished with your assessment?</h3>
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em]">Make sure you answered everything</p>
           </div>
           <button 
             onClick={() => setShowConfirm(true)}
             className="bg-brand-accent text-white px-12 py-5 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-[0_20px_50px_rgba(244,123,32,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
           >
              Submit Assessment Now
              <ArrowLeft size={18} className="rotate-180" />
           </button>
        </div>
      </main>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowConfirm(false)}
               className="absolute inset-0 bg-brand-text/80 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 40 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 40 }}
               className="bg-white dark:bg-brand-card w-full max-w-lg rounded-[4rem] p-12 border border-brand-border shadow-[0_40px_100px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-10 opacity-5">
                   <Send size={120} className="-rotate-12" />
                </div>

                <div className="relative flex flex-col items-center text-center space-y-10">
                   <div className="w-24 h-24 rounded-[2.5rem] bg-brand-accent/5 flex items-center justify-center border-4 border-brand-accent/10 relative">
                      <div className="absolute inset-0 bg-brand-accent/20 blur-2xl rounded-full scale-150 animate-pulse" />
                      <Send size={48} className="text-brand-accent relative z-10" />
                   </div>
                   
                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.4em] mb-2">Final Step</p>
                      <h3 className="font-black text-4xl text-brand-text uppercase tracking-tighter leading-none">Submit Now?</h3>
                      <p className="text-sm font-bold text-brand-muted leading-relaxed max-w-[320px] mx-auto opacity-70">
                        You have answered <span className="text-brand-text font-black">{answeredCount}</span> out of <span className="text-brand-text font-black">{exam.questions.length}</span> questions.
                      </p>
                   </div>

                   <div className="flex flex-col w-full gap-4">
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full relative group bg-brand-accent px-10 py-6 rounded-[2.5rem] text-white font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-brand-accent/30 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                      >
                         <span className="relative z-10">{isSubmitting ? 'Submitting...' : 'Yes, Submit My Work'}</span>
                         <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                         <ArrowLeft size={20} className="rotate-180 relative z-10 group-hover:translate-x-2 transition-transform" />
                      </button>
                      
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isSubmitting}
                        className="w-full py-4 text-brand-muted hover:text-brand-accent font-black uppercase text-[10px] tracking-[0.3em] transition-colors"
                      >
                         No, let me check again
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
