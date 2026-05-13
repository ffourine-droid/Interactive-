import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Swords, Users, Clock, 
  ChevronRight, Play, CheckCircle2, AlertCircle,
  Loader2, Star, Sparkles, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface Competition {
  id: string;
  title: string;
  subject: string;
  grade: string;
  status: 'active' | 'marking' | 'finished';
  teacher_name?: string;
}

interface Question {
  id: string;
  question_text: string;
  type: 'mcq' | 'short_answer';
  options?: string[];
  points: number;
}

export const StudentCompetitionLobby: React.FC<{ 
  username: string; 
  grade: string;
  onBack: () => void;
}> = ({ username, grade, onBack }) => {
  const { showToast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeComp, setActiveComp] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    fetchCompetitions();
  }, [grade]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teacher_competitions')
        .select(`
          *,
          teachers(name)
        `)
        .eq('grade', grade)
        .in('status', ['active', 'marking', 'finished'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompetitions(data.map(c => ({
        ...c,
        teacher_name: (c as any).teachers?.name
      })));
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startCompetition = async (comp: Competition) => {
    try {
      setLoading(true);
      // 1. Get questions
      const { data: qs, error: qErr } = await supabase
        .from('teacher_competition_questions')
        .select('*')
        .eq('competition_id', comp.id);
      
      if (qErr) throw qErr;

      // 2. Register participant
      const { error: pErr } = await supabase
        .from('teacher_competition_participants')
        .insert([{
          competition_id: comp.id,
          student_id: localStorage.getItem('azilearn_student_id') || 'anon-' + Math.random().toString(36).substr(2, 9),
          student_name: username,
          score: 0,
          total_questions: qs.length,
          is_finished: false
        }]);

      if (pErr && !pErr.message.includes('unique_violation')) throw pErr;

      setQuestions(qs);
      setActiveComp(comp);
      setCurrentIdx(0);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    const q = questions[currentIdx];
    const newAnswers = { ...answers, [q.id]: answer };
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleFinalSubmit(newAnswers);
    }
  };

  const handleFinalSubmit = async (finalAnswers: Record<string, string>) => {
    setIsSubmitting(true);
    try {
      const studentId = localStorage.getItem('azilearn_student_id') || 'anon-' + Math.random().toString(36).substr(2, 9);
      
      const responses = questions.map(q => {
        const ans = finalAnswers[q.id];
        // Auto-grade MCQs
        const isMcq = q.type === 'mcq';
        const isCorrect = isMcq ? (ans.toUpperCase() === q.correct_answer.toUpperCase()) : null;
        
        return {
          competition_id: activeComp!.id,
          question_id: q.id,
          student_id: studentId,
          student_name: username,
          answer_text: ans,
          is_correct: isCorrect,
          points_awarded: isCorrect ? q.points : 0,
          submitted_at: new Date().toISOString()
        };
      });

      const { error: resErr } = await supabase
        .from('teacher_competition_responses')
        .insert(responses);

      if (resErr) throw resErr;

      // Calculate score for auto-graded ones
      const mcqScore = responses.reduce((acc, r) => acc + (r.points_awarded || 0), 0);

      await supabase
        .from('teacher_competition_participants')
        .update({ 
          is_finished: true, 
          score: mcqScore, // This might be updated later by teacher marking
          submitted_at: new Date().toISOString()
        })
        .eq('competition_id', activeComp!.id)
        .eq('student_id', studentId);

      setHasFinished(true);
      showToast("Answers submitted!", "success");
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center py-20">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter uppercase">Well Done!</h2>
        <div className="space-y-2">
          <p className="text-brand-muted font-bold">Your responses have been sent to your teacher.</p>
          <p className="text-xs text-brand-muted">If some questions were short answer, your final score will be updated after marking.</p>
        </div>
        <button onClick={onBack} className="w-full bg-brand-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20">
          Back to Arena
        </button>
      </div>
    );
  }

  if (activeComp && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-brand-bg flex flex-col p-6">
        <div className="mb-8 space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brand-muted">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 bg-brand-surface border border-brand-border rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-brand-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <h3 className="text-2xl font-black tracking-tight leading-tight">{q.question_text}</h3>

          <div className="space-y-3">
            {q.type === 'mcq' && q.options ? (
              q.options.filter(o => o).map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => submitAnswer(String.fromCharCode(65 + i))}
                  className="w-full p-5 bg-brand-surface border-2 border-brand-border rounded-2xl text-left font-bold hover:border-brand-accent active:scale-95 transition-all flex items-center gap-4"
                >
                  <span className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted font-black text-xs uppercase">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              ))
            ) : (
              <div className="space-y-4">
                <textarea 
                  id="short-answer-input"
                  placeholder="Type your answer here..."
                  className="w-full bg-brand-surface border-2 border-brand-border rounded-2xl p-6 font-bold text-sm h-40 outline-none focus:border-brand-accent transition-colors"
                />
                <button 
                  onClick={() => {
                    const el = document.getElementById('short-answer-input') as HTMLTextAreaElement;
                    submitAnswer(el.value);
                  }}
                  className="w-full py-5 bg-brand-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  Confirm Answer <Send size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted">
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Class Battles</h2>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-1">Join the fight started by teachers</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>
        ) : competitions.length === 0 ? (
          <div className="py-20 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] space-y-4">
            <Sparkles size={48} className="mx-auto text-brand-muted/20" />
            <p className="text-brand-muted font-bold text-xs uppercase tracking-widest">No active class battles for {grade}</p>
          </div>
        ) : (
          competitions.map(comp => (
            <motion.div 
              key={comp.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => startCompetition(comp)}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-4 hover:border-brand-accent transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                    comp.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-brand-bg text-brand-muted'
                  }`}>
                    {comp.status === 'active' ? 'JOIN NOW' : 'MARKING'}
                  </span>
                  <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">{comp.subject}</span>
                </div>
                <Users size={16} className="text-brand-muted/40" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tighter uppercase group-hover:text-brand-accent transition-colors">{comp.title}</h3>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mt-1">Host: {comp.teacher_name || 'Your Teacher'}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                <div className="flex items-center gap-1.5 text-brand-muted">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Live Session</span>
                </div>
                <div className="flex items-center gap-2 text-brand-accent font-black text-[10px] uppercase tracking-widest">
                  Battle Now <Play size={12} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
