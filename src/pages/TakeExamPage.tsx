import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Clock, CheckCircle2, ChevronLeft, ChevronRight,
  Send, AlertCircle, Loader2, Info, Timer, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { examService } from '../services/examService';
import { Exam, ExamAttempt, Question } from '../types';
import { useToast } from '../components/Toast';

interface TakeExamPageProps {
  examId: string;
  onBack: () => void;
  onSubmitted: (attempt: ExamAttempt) => void;
}

export default function TakeExamPage({ examId, onBack, onSubmitted }: TakeExamPageProps) {
  const { showToast } = useToast();
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
      const studentStr = localStorage.getItem('azilearn_student');
      if (!studentStr) {
        showToast('Student data missing', 'error');
        onBack();
        return;
      }
      const student = JSON.parse(studentStr);

      const examData = await examService.getExamById(examId);
      setExam(examData);

      const attemptData = await examService.startExamAttempt(examId, student.id);
      
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
      showToast(err.message || 'Failed to initialize exam', 'error');
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
        // Clear interval instead of stopping if we want to show 00:00
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
    // Optimistic update
    setAnswers(prev => ({ ...prev, [qIndex]: value }));

    // Persist to DB
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
      showToast('Exam submitted successfully!', 'success');
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
        <p className="text-xs font-black text-brand-muted uppercase tracking-widest animate-pulse">Loading Exam Canvas...</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const timerColor = isOvertime ? 'text-red-500' : timeLeftSeconds < 120 ? 'text-orange-500' : 'text-brand-accent';

  if (step === 'result' && attempt) {
    const totalMarks = exam.questions.reduce((acc, q) => acc + q.marks, 0);
    const mcqQuestions = exam.questions.filter(q => q.type === 'mcq');
    const mcqMarks = mcqQuestions.reduce((acc, q) => acc + q.marks, 0);
    
    // Auto-graded mcq actual score
    let gradedMcqScore = 0;
    mcqQuestions.forEach(q => {
      if (answers[q.index] === q.correct_answer) {
        gradedMcqScore += q.marks;
      }
    });

    return (
      <div className="min-h-screen bg-brand-bg pb-20">
        <header className="bg-white dark:bg-brand-card border-b border-brand-accent/10 p-6">
           <div className="max-w-[420px] mx-auto flex items-center justify-between">
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-black text-lg uppercase tracking-tighter">Exam Results</h1>
              <div className="w-10" />
           </div>
        </header>

        <main className="max-w-[420px] mx-auto p-4 space-y-8">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="text-center space-y-6 pt-10"
           >
              <div className="w-24 h-24 bg-brand-accent/10 rounded-[2.5rem] flex items-center justify-center mx-auto">
                 <CheckCircle2 size={48} className="text-brand-accent" />
              </div>
              <div className="space-y-1">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Exam Submitted!</h2>
                 <p className="text-brand-muted font-bold text-sm">Well done on completing the test.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-brand-accent/5 rounded-3xl p-4 border border-brand-accent/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-1">MCQ Score</p>
                    <p className="text-2xl font-black">{gradedMcqScore} / {mcqMarks}</p>
                 </div>
                 <div className={`rounded-3xl p-4 border ${attempt.grading && Object.keys(attempt.grading).length > 0 ? 'bg-green-500/5 border-green-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${attempt.grading && Object.keys(attempt.grading).length > 0 ? 'text-green-600' : 'text-amber-600'}`}>Short Answers</p>
                    <p className="text-2xl font-black">
                       {attempt.grading && Object.keys(attempt.grading).length > 0 
                         ? `${Object.values(attempt.grading).reduce((a: any, b: any) => a + b, 0)} / ${totalMarks - mcqMarks}`
                         : 'PENDING'}
                    </p>
                 </div>
              </div>

              {attempt.teacher_feedback && (
               <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-3xl p-6 text-left relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent" />
                  <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 rounded-xl bg-brand-accent/10 text-brand-accent">
                        <MessageCircle size={14} />
                     </div>
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Teacher's Feedback</h3>
                  </div>
                  <p className="text-sm font-bold text-brand-text leading-relaxed italic">"{attempt.teacher_feedback}"</p>
               </div>
              )}

              {attempt.score !== null && (
                <div className="bg-brand-card border border-brand-border rounded-3xl p-6 text-left">
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Teacher Review Status</p>
                   <div className="flex items-center gap-3 bg-brand-accent/5 p-3 rounded-2xl">
                      <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                      <p className="text-xs font-bold text-brand-text">Awaiting teacher to grade your short answers.</p>
                   </div>
                </div>
              )}
           </motion.div>

           <div className="space-y-4">
              <h3 className="font-black text-xs uppercase tracking-widest text-brand-muted ml-2">Question Review</h3>
              {exam.questions.map((q, idx) => {
                const answer = answers[idx];
                const isCorrect = q.type === 'mcq' && answer === q.correct_answer;
                const isIncorrect = q.type === 'mcq' && answer !== q.correct_answer && answer !== undefined;
                const isShort = q.type === 'short_answer';
                const log = logs.find(l => l.question_index === idx);
                const isLogOvertime = log?.is_overtime;

                let rowColor = 'bg-brand-card border-brand-border';
                if (isCorrect) rowColor = 'bg-green-500/5 border-green-500/20';
                if (isIncorrect) rowColor = 'bg-red-500/5 border-red-500/20';
                if (isLogOvertime) rowColor = 'bg-amber-500/5 border-amber-500/20';

                return (
                  <div key={idx} className={`p-5 rounded-3xl border-2 transition-all ${rowColor}`}>
                     <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                           <span className="w-6 h-6 rounded-lg bg-brand-bg flex items-center justify-center font-black text-[10px]">{idx + 1}</span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{q.type}</span>
                        </div>
                        {isLogOvertime && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500 text-white rounded-lg">
                             <Clock size={10} />
                             <span className="text-[8px] font-black uppercase tracking-widest">Overtime</span>
                          </div>
                        )}
                     </div>
                     <p className="font-bold text-sm mb-4">{q.question}</p>
                     
                     <div className="space-y-2">
                        <div className="p-3 bg-brand-bg/50 rounded-2xl">
                           <p className="text-[8px] font-black uppercase tracking-widest text-brand-muted mb-1">Your Answer</p>
                           <p className={`text-xs font-bold ${isIncorrect ? 'text-red-500' : isCorrect ? 'text-green-600' : ''}`}>
                             {answer || <span className="italic text-brand-muted/40 font-medium">No answer provided</span>}
                           </p>
                        </div>
                        
                        {q.type === 'mcq' && isIncorrect && (
                           <div className="p-3 bg-green-500/5 rounded-2xl">
                              <p className="text-[8px] font-black uppercase tracking-widest text-green-600 mb-1">Correct Answer</p>
                              <p className="text-xs font-black text-green-600">{q.correct_answer}</p>
                           </div>
                        )}

                        {isShort && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-brand-accent/5 rounded-xl">
                             <Info size={12} className="text-brand-accent" />
                             <p className="text-[9px] font-bold text-brand-accent uppercase tracking-wider">Awaiting Teacher Review...</p>
                          </div>
                        )}
                     </div>
                  </div>
                );
              })}
           </div>

           <button 
             onClick={onBack}
             className="w-full bg-brand-text text-white py-5 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-all"
           >
             Finish Review
           </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col pt-[88px] pb-24">
      {/* Fixed Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-white/95 dark:bg-brand-card/95 backdrop-blur-xl border-b border-brand-accent/10 p-4">
         <div className="max-w-[420px] mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
               <h2 className="font-sans font-black text-sm text-brand-text truncate leading-none uppercase tracking-tighter">{exam.title}</h2>
               <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-accent/5 rounded-full">
                    <CheckCircle2 size={10} className="text-brand-accent" />
                    <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">{answeredCount}/{exam.questions.length} Answered</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <div className={`flex flex-col items-center transition-colors ${timerColor}`}>
                  <span className="text-[8px] font-black uppercase tracking-tighter leading-none mb-0.5">Time Left</span>
                  <div className="font-sans font-black text-xl tabular-nums leading-none">
                    {isOvertime ? 'TIME UP' : currentTime}
                  </div>
               </div>

               <button 
                onClick={() => setShowConfirm(true)}
                className="bg-brand-accent px-4 py-2 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
               >
                Submit
               </button>
            </div>
         </div>
      </div>

      {/* Main Questions Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 max-w-[420px] mx-auto w-full">
        {isOvertime && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border-2 border-red-500/20 rounded-3xl flex items-start gap-4 mb-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-red-500 flex items-center justify-center shrink-0">
               <Timer size={24} className="text-white animate-pulse" />
            </div>
            <div className="space-y-1">
               <p className="font-black text-xs text-red-500 uppercase tracking-widest">⏰ Time is up!</p>
               <p className="text-[10px] text-red-500/80 font-bold leading-relaxed">
                 You can still submit or continue answering — note that any answers entered after this point will be marked as overtime results.
               </p>
            </div>
          </motion.div>
        )}

        <div className="bg-brand-accent/5 rounded-3xl p-6 border border-brand-accent/10 mb-8">
           <div className="flex items-start gap-3 mb-3">
              <Info size={16} className="text-brand-accent shrink-0 mt-0.5" />
              <h3 className="font-bold text-xs text-brand-text uppercase tracking-widest">Exam Instructions</h3>
           </div>
           <p className="text-xs text-brand-muted leading-relaxed italic">
             {exam.instructions || 'Answer all questions to the best of your ability. MCQ questions are worth 2 marks, Short answer 4 marks.'}
           </p>
        </div>

        {exam.questions.map((q, idx) => {
          const isAnswered = answers[idx] !== undefined && answers[idx] !== '';
          return (
            <div key={idx} id={`q-${idx}`} className="space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                     isAnswered ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/30' : 'bg-brand-accent/10 text-brand-accent'
                   }`}>
                     {idx + 1}
                   </div>
                   <div className="px-2 py-0.5 bg-brand-bg rounded-lg text-[10px] font-black text-brand-muted uppercase tracking-widest border border-brand-accent/5">
                      {q.marks} Marks
                   </div>
                 </div>
                 {isAnswered && (
                   <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500">
                    <CheckCircle2 size={20} />
                   </motion.div>
                 )}
              </div>

              <div className="space-y-4">
                 <h4 className="font-sans font-bold text-lg text-brand-text leading-tight">{q.question}</h4>
                 
                 {q.type === 'mcq' ? (
                   <div className="grid grid-cols-1 gap-3">
                     {q.options?.map((opt, optIdx) => {
                       const isSelected = answers[idx] === opt;
                       return (
                         <button
                           key={optIdx}
                           onClick={() => handleAnswerChange(idx, opt)}
                           className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center gap-4 group ${
                             isSelected 
                               ? 'bg-brand-accent border-brand-accent text-white shadow-xl shadow-brand-accent/20' 
                               : 'bg-white dark:bg-brand-card border-brand-accent/5 text-brand-muted hover:border-brand-accent/20'
                           }`}
                         >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                              isSelected ? 'bg-white text-brand-accent' : 'bg-brand-bg text-brand-muted group-hover:text-brand-accent'
                            }`}>
                               {String.fromCharCode(65 + optIdx)}
                            </div>
                            <span className="font-bold text-sm">{opt}</span>
                         </button>
                       );
                     })}
                   </div>
                 ) : (
                   <textarea
                     value={answers[idx] || ''}
                     onChange={e => handleAnswerChange(idx, e.target.value)}
                     placeholder="Type your answer here..."
                     className="w-full bg-white dark:bg-brand-card border-2 border-brand-accent/5 rounded-3xl p-5 text-sm font-bold min-h-[120px] focus:border-brand-accent/30 outline-none transition-all placeholder:text-brand-muted/20"
                   />
                 )}
              </div>

              {/* Progress visual */}
              {idx < exam.questions.length - 1 && <div className="h-px bg-brand-accent/10 w-full rounded-full" />}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowConfirm(false)}
               className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white dark:bg-brand-card w-full max-w-sm rounded-[40px] p-8 border border-brand-accent/10 shadow-3xl shadow-brand-accent/20 relative z-10"
             >
                <div className="flex flex-col items-center text-center space-y-6">
                   <div className="w-20 h-20 rounded-3xl bg-brand-accent/10 flex items-center justify-center">
                      <Send size={40} className="text-brand-accent animate-pulse" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="font-sans font-black text-xl text-brand-text uppercase tracking-tighter">Submit Your Exam?</h3>
                      <p className="text-xs text-brand-muted font-bold leading-relaxed">
                        You have answered <span className="text-brand-accent">{answeredCount}</span> out of <span className="text-brand-accent">{exam.questions.length}</span> questions.
                      </p>
                   </div>

                   <div className="flex flex-col w-full gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-brand-accent py-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                         {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={18} />}
                         {isSubmitting ? 'SUBMITTING...' : 'YES, SUBMIT NOW'}
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-2xl text-brand-muted font-black uppercase text-[10px] tracking-widest"
                      >
                         KEEP WORKING
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
