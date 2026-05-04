import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, 
  Loader2, Filter, Download, User, BarChart3, Star,
  Search, ExternalLink, Calendar, Save, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Exam, ExamAttempt, Question, AnswerLog } from '../types';

interface ExamResultsPageProps {
  examId: string;
  onBack: () => void;
}

export default function ExamResultsPage({ examId, onBack }: ExamResultsPageProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [gradingMarks, setGradingMarks] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState('');
  const [parentFeedback, setParentFeedback] = useState('');
  const [savingGrading, setSavingGrading] = useState(false);
  const [savingParentFeedback, setSavingParentFeedback] = useState(false);

  useEffect(() => {
    fetchResults();

    const channel = supabase
      .channel(`exam-${examId}-results`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exam_attempts',
        filter: `exam_id=eq.${examId}`
      }, () => {
        fetchResults();
        showToast("Updates received!", "info");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [examId]);

  useEffect(() => {
    if (selectedAttempt) {
      setGradingMarks(selectedAttempt.grading || {});
      setFeedback(selectedAttempt.teacher_feedback || '');
      setParentFeedback(selectedAttempt.parent_feedback || '');
    }
  }, [selectedAttempt]);

  const fetchResults = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();

      if (examError) throw examError;
      if (!examData) throw new Error('Exam not found');
      setExam(examData);

      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          students (
            name,
            grade
          )
        `)
        .eq('exam_id', examId)
        .order('submitted_at', { ascending: false });

      if (attemptError) throw attemptError;
      setAttempts(attemptData || []);

      // Fetch students in this class to see who hasn't submitted
      if (examData.class_id) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name')
          .eq('class_id', examData.class_id);
        if (!studentsError) setClassStudents(studentsData || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (qIdx: number, marks: number) => {
    setGradingMarks(prev => ({ ...prev, [qIdx]: marks }));
  };

  const saveParentFeedback = async () => {
    if (!selectedAttempt) return;
    setSavingParentFeedback(true);
    try {
      const { error } = await supabase
        .from('exam_attempts')
        .update({ 
          parent_feedback: parentFeedback
        })
        .eq('id', selectedAttempt.id);

      if (error) throw error;
      showToast('Parent remarks saved!', 'success');
      fetchResults();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingParentFeedback(false);
    }
  };

  const saveGrading = async () => {
    if (!selectedAttempt || !exam) return;
    setSavingGrading(true);
    try {
      // Calculate new score
      let newScore = 0;
      exam.questions.forEach((q, idx) => {
        if (q.type === 'mcq') {
          if (selectedAttempt.answers[idx] === q.correct_answer) {
            newScore += q.marks;
          }
        } else {
          newScore += gradingMarks[idx] !== undefined ? gradingMarks[idx] : (selectedAttempt.grading?.[idx] || 0);
        }
      });

      const { error } = await supabase
        .from('exam_attempts')
        .update({ 
          score: newScore,
          grading: gradingMarks,
          teacher_feedback: feedback
        })
        .eq('id', selectedAttempt.id);

      if (error) throw error;
      showToast('Grading and feedback saved!', 'success');
      fetchResults(); // Refresh list
      setSelectedAttempt(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save grading', 'error');
    } finally {
      setSavingGrading(false);
    }
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8">
        <Loader2 className="animate-spin text-brand-accent mb-4" size={40} />
        <p className="text-xs font-black text-brand-muted uppercase tracking-widest animate-pulse">Analyzing Results...</p>
      </div>
    );
  }

  // Summary stats
  const submittedCount = attempts.filter(a => a.is_submitted).length;
  const pendingStudents = classStudents.filter(s => !attempts.some(a => a.student_id === s.id));
  const overtimeCount = attempts.filter(a => a.has_overtime).length;
  const avgScore = attempts.length > 0 ? (attempts.reduce((acc, a) => acc + (a.score || 0), 0) / attempts.length).toFixed(1) : 0;
  const topScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score || 0)) : 0;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col p-4 sm:p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-brand-card rounded-xl border border-brand-accent/10 hover:bg-brand-accent/10 transition-colors">
                <ArrowLeft size={20} className="text-brand-accent" />
              </button>
              <div>
                <h1 className="font-sans font-bold text-xl text-brand-text truncate max-w-[300px]">{exam.title}</h1>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{exam.subject} • {exam.grade}</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
             <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-brand-card rounded-xl border border-brand-accent/10 text-brand-muted hover:text-brand-text transition-all text-xs font-bold">
               <Download size={16} /> Export
             </button>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           {[
             { label: 'Submissions', value: submittedCount, icon: CheckCircle2, color: 'text-green-500' },
             { label: 'Pending', value: pendingStudents.length, icon: Clock, color: 'text-amber-500' },
             { label: 'Avg. Score', value: avgScore, icon: BarChart3, color: 'text-brand-accent' },
             { label: 'Highest Score', value: topScore, icon: Star, color: 'text-orange-500' },
             { label: 'Overtime', value: overtimeCount, icon: Clock, color: 'text-red-400' }
           ].map((stat, i) => (
             <div key={i} className="bg-white dark:bg-brand-card p-5 rounded-3xl border border-brand-accent/5 shadow-xl shadow-brand-accent/5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center ${stat.color}`}>
                   <stat.icon size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{stat.label}</p>
                   <p className="text-xl font-sans font-black text-brand-text">{stat.value}</p>
                </div>
             </div>
           ))}
        </div>

        {/* Attempts Table */}
        <div className="bg-white dark:bg-brand-card rounded-3xl border border-brand-accent/5 shadow-xl shadow-brand-accent/5 overflow-hidden">
           <div className="p-6 border-b border-brand-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-sans font-bold text-lg text-brand-text">Student Submissions</h3>
              <div className="flex items-center gap-2">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={14} />
                    <input 
                      placeholder="Search student..." 
                      className="bg-brand-bg dark:bg-brand-card border border-brand-accent/10 rounded-xl py-2 pl-9 pr-4 text-xs text-brand-text focus:ring-1 focus:ring-brand-accent/30 outline-none w-48" 
                    />
                 </div>
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-brand-bg/50">
                       <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Student</th>
                       <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Started At</th>
                       <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Submitted</th>
                       <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Score</th>
                       <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Status</th>
                       <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-brand-accent/5">
                    {attempts.length === 0 && pendingStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-brand-muted font-bold text-xs uppercase tracking-widest">No candidates found</td>
                      </tr>
                    ) : (
                      <>
                        {attempts.map((attempt) => (
                          <tr key={attempt.id} className="hover:bg-brand-bg/30 transition-colors">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-xs">
                                      {attempt.students?.name?.charAt(0) || 'S'}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="font-bold text-sm text-brand-text">{attempt.students?.name || 'Unknown Student'}</span>
                                      <span className="text-[10px] text-brand-muted uppercase tracking-wider">{attempt.students?.grade}</span>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-xs text-brand-muted font-bold">
                                   <Calendar size={12}/> {new Date(attempt.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                {attempt.is_submitted ? (
                                  <div className="flex flex-col gap-0.5">
                                     <span className="text-xs text-brand-text font-bold">
                                       {new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                     </span>
                                     <span className="text-[9px] text-brand-muted uppercase font-black tracking-widest">
                                       {new Date(attempt.submitted_at).toLocaleDateString()}
                                     </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest italic animate-pulse">In Progress</span>
                                )}
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex flex-col">
                                   <span className="font-black text-brand-accent text-base">{attempt.score || 0} / {attempt.total_marks || 0}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                   {attempt.has_overtime ? (
                                     <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                        <Clock size={10}/> Overtime
                                     </span>
                                   ) : (
                                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                        <CheckCircle2 size={10}/> In Time
                                     </span>
                                   )}
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <button 
                                  onClick={() => setSelectedAttempt(attempt)}
                                  className="p-2 hover:bg-brand-accent/10 text-brand-accent rounded-xl transition-all"
                                >
                                   <ExternalLink size={18} />
                                </button>
                             </td>
                          </tr>
                        ))}
                        {pendingStudents.map((student) => (
                           <tr key={student.id} className="bg-red-500/5 hover:bg-red-500/10 transition-colors opacity-75">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                                      {student.name.charAt(0)}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="font-bold text-sm text-red-900">{student.name}</span>
                                      <span className="text-[10px] text-red-600 uppercase font-black tracking-widest">Awaiting Attempt</span>
                                   </div>
                                </div>
                             </td>
                             <td colSpan={2} className="px-6 py-4">
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-pulse flex items-center gap-2">
                                  <AlertCircle size={12}/> EXAM NOT STARTED
                                </span>
                             </td>
                             <td className="px-6 py-4">
                                <span className="text-sm font-black text-red-300">0 / {exam.questions.reduce((acc, q) => acc + q.marks, 0)}</span>
                             </td>
                             <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                  Pending
                                </span>
                             </td>
                             <td className="px-6 py-4"></td>
                           </tr>
                        ))}
                      </>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* Attempt Review Modal */}
      <AnimatePresence>
        {selectedAttempt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAttempt(null)}
              className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="bg-white dark:bg-brand-card w-full max-w-2xl h-full shadow-2xl relative z-10 flex flex-col border-l border-brand-accent/10"
             >
                <div className="p-6 border-b border-brand-accent/5 flex items-center justify-between bg-white dark:bg-brand-card sticky top-0 z-20">
                   <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedAttempt(null)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted"><ArrowLeft size={20}/></button>
                      <div>
                         <h2 className="font-bold text-lg text-brand-text">{selectedAttempt.students?.name}</h2>
                         <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Reviewing Exam Attempt</p>
                      </div>
                   </div>
                   <button 
                    onClick={saveGrading}
                    disabled={savingGrading}
                    className="bg-brand-accent px-6 py-2.5 rounded-xl text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-brand-accent/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                   >
                     {savingGrading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                     Save Marks
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-brand-bg">
                   {/* Remarks Section */}
                   <div className="grid grid-cols-1 gap-6">
                      {/* Teacher Remarks */}
                      <div className="bg-white dark:bg-brand-card p-6 rounded-[2rem] border-2 border-brand-accent/10 shadow-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-brand-accent/10 text-brand-accent">
                            <MessageCircle size={18} />
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-brand-accent">Teacher Remarks</h3>
                        </div>
                        <textarea 
                          placeholder="Teacher's comments..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full bg-brand-bg border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 min-h-[100px] resize-none transition-all"
                        />
                        <button 
                          onClick={saveGrading}
                          disabled={savingGrading}
                          className="w-full py-3 bg-brand-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-accent/20"
                        >
                          {savingGrading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Update Teacher Remarks'}
                        </button>
                      </div>

                      {/* Parent Remarks */}
                      <div className="bg-white dark:bg-brand-card p-6 rounded-[2rem] border-2 border-emerald-500/10 shadow-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <User size={18} />
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600">Parent Remarks</h3>
                        </div>
                        <textarea 
                          placeholder="Parent's comments..."
                          value={parentFeedback}
                          onChange={(e) => setParentFeedback(e.target.value)}
                          className="w-full bg-brand-bg border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px] resize-none transition-all"
                        />
                        <button 
                          onClick={saveParentFeedback}
                          disabled={savingParentFeedback}
                          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
                        >
                          {savingParentFeedback ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Update Parent Remarks'}
                        </button>
                      </div>
                   </div>

                   <div className="h-px bg-brand-accent/10 w-full" />

                   {exam.questions.map((q, idx) => {
                     const studentAnswer = selectedAttempt.answers[idx];
                     const isCorrect = q.type === 'mcq' ? studentAnswer === q.correct_answer : false;
                     // In a real app we'd fetch if this answer was overtime from answer logs
                     // But for simplification we can just highlight if the WHOLE attempt was overtime or check a field if we added it

                     return (
                       <div key={idx} className="space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-brand-accent/10 flex items-center justify-center font-black text-xs text-brand-accent">
                                   {idx + 1}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${q.type === 'mcq' ? 'text-brand-accent' : 'text-orange-500'}`}>
                                   {q.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                                </span>
                             </div>
                             <div className="flex items-center gap-3">
                                {q.type === 'mcq' ? (
                                   <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${
                                     isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                   }`}>
                                      {isCorrect ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                                      {isCorrect ? 'AUTOGRADED: CORRECT' : 'AUTOGRADED: WRONG'}
                                   </div>
                                ) : (
                                  <div className="flex items-center gap-2 bg-white dark:bg-brand-card p-1 rounded-xl border border-brand-accent/5">
                                     <span className="text-[10px] font-black text-brand-muted uppercase px-2">Marks:</span>
                                     <input 
                                      type="number"
                                      defaultValue={selectedAttempt.grading?.[idx] || 0}
                                      onChange={(e) => handleGradeChange(idx, parseInt(e.target.value) || 0)}
                                      className="w-16 bg-brand-bg border-none rounded-lg p-1.5 text-center font-black text-xs text-brand-accent focus:ring-1 focus:ring-brand-accent/30 outline-none"
                                     />
                                     <span className="text-[10px] font-black text-brand-muted uppercase px-2">/ {q.marks}</span>
                                  </div>
                                )}
                             </div>
                          </div>

                          <div className="bg-white dark:bg-brand-card p-6 rounded-3xl border border-brand-accent/5 shadow-sm space-y-4">
                             <p className="font-bold text-brand-text leading-relaxed">{q.question}</p>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Student Response</p>
                                   <div className={`p-3 rounded-2xl text-sm font-bold border-2 ${
                                     q.type === 'mcq' 
                                       ? isCorrect ? 'bg-green-500/5 border-green-500/20 text-green-600' : 'bg-red-500/5 border-red-500/20 text-red-600'
                                       : 'bg-brand-bg border-brand-accent/5 text-brand-text'
                                   }`}>
                                      {studentAnswer || 'NO RESPONSE'}
                                   </div>
                                </div>
                                <div className="space-y-1">
                                   <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Correct Solution</p>
                                   <div className="p-3 rounded-2xl text-sm font-bold bg-green-500/5 border-2 border-green-500/20 text-green-600">
                                      {q.correct_answer}
                                   </div>
                                </div>
                             </div>
                          </div>
                          {idx < exam.questions.length - 1 && <div className="h-px bg-brand-accent/10 w-full" />}
                       </div>
                     );
                   })}
                </div>

             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
