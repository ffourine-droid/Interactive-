import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Swords, Users, Clock, 
  ChevronRight, Play, CheckCircle2, AlertCircle,
  Loader2, Star, Sparkles, Send, Search, BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { StudentIdentityModal } from './StudentIdentityModal';

interface Competition {
  id: string;
  title: string;
  subject: string;
  grade: string;
  status: 'active' | 'marking' | 'finished';
  teacher_name?: string;
  school_name?: string;
}

interface Question {
  id: string;
  question_text: string;
  type: 'mcq' | 'short_answer';
  options?: string[];
  points: number;
  correct_answer: string;
}

export const StudentCompetitionLobby: React.FC<{ 
  username: string; 
  grade: string;
  onBack: () => void;
}> = ({ username: initialUsername, grade: initialGrade, onBack }) => {
  const { showToast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeComp, setActiveComp] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  
  // Search state
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [searchGrade, setSearchGrade] = useState(initialGrade);
  const [hasSearched, setHasSearched] = useState(false);

  // Identity state
  const [showIdentity, setShowIdentity] = useState(false);
  const [pendingComp, setPendingComp] = useState<Competition | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(() => {
    const saved = localStorage.getItem('azilearn_student');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentUser) {
      fetchCompetitions();
    }
  }, []);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      setHasSearched(true);
      
      let query = supabase
        .from('teacher_competitions')
        .select(`
          *,
          teachers!teacher_id(name, school_name)
        `)
        .in('status', ['active', 'marking', 'finished']);

      if (searchGrade) query = query.eq('grade', searchGrade);
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Fallback for relationship errors
        if (error.message?.includes('relationship') || error.message?.includes('not found') || error.code?.startsWith('PGRST')) {
          let basicQuery = supabase
            .from('teacher_competitions')
            .select('*')
            .in('status', ['active', 'marking', 'finished']);
          if (searchGrade) basicQuery = basicQuery.eq('grade', searchGrade);
          
          const { data: basicData, error: basicErr } = await basicQuery.order('created_at', { ascending: false });
          
          if (basicErr) throw basicErr;
          
          // Filter manually if relationship fetch failed
          let filtered = basicData || [];
          
          setCompetitions(filtered.map(c => ({ 
            ...c, 
            teacher_name: 'Your Teacher',
            school_name: 'Your School'
          })));
          return;
        }
        throw error;
      }
      
      let filtered = data || [];
      
      // Client-side filtering for teacher/school since standard joins might be tricky depending on schema
      if (searchTeacher) {
        filtered = filtered.filter(c => 
          (c as any).teachers?.name?.toLowerCase().includes(searchTeacher.toLowerCase())
        );
      }
      if (searchSchool) {
        filtered = filtered.filter(c => 
          (c as any).teachers?.school_name?.toLowerCase().includes(searchSchool.toLowerCase())
        );
      }
      
      setCompetitions(filtered.map(c => ({
        ...c,
        teacher_name: (c as any).teachers?.name,
        school_name: (c as any).teachers?.school_name
      })));
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartComp = (comp: Competition) => {
    if (!currentUser) {
      setPendingComp(comp);
      setShowIdentity(true);
    } else {
      startCompetition(comp);
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

      if (qs.length === 0) {
        showToast("This competition has no questions yet.", "error");
        return;
      }

      // 2. Register participant
      const { error: pErr } = await supabase
        .from('teacher_competition_participants')
        .insert([{
          competition_id: comp.id,
          student_id: currentUser?.id || 'anon-' + Math.random().toString(36).substr(2, 9),
          student_name: currentUser?.name || initialUsername,
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
      const studentId = currentUser?.id || 'anon-' + Math.random().toString(36).substr(2, 9);
      const studentName = currentUser?.name || initialUsername;
      
      const responses = questions.map(q => {
        const ans = finalAnswers[q.id];
        // Auto-grade MCQs
        const isMcq = q.type === 'mcq';
        const rawIsCorrect = isMcq ? (ans.toUpperCase() === q.correct_answer.toUpperCase()) : null;
        const isCorrect = rawIsCorrect === true ? true : (rawIsCorrect === false ? false : null);
        
        return {
          competition_id: activeComp!.id,
          question_id: q.id,
          student_id: studentId,
          student_name: studentName,
          answer_text: ans,
          is_correct: isCorrect,
          points_awarded: isCorrect === true ? q.points : 0,
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
        <h2 className="text-3xl font-bold tracking-tighter uppercase">Well Done!</h2>
        <div className="space-y-2">
          <p className="text-brand-muted font-bold">Your responses have been sent to your teacher.</p>
          <p className="text-xs text-brand-muted">If some questions were short answer, your final score will be updated after marking.</p>
        </div>
        <button onClick={onBack} className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold uppercase tracking-wider shadow-lg shadow-brand-accent/20">
          Back to Arena
        </button>
      </div>
    );
  }

  if (activeComp && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;
    const safeProgress = isNaN(progress) ? 0 : progress;

    return (
      <div className="min-h-screen bg-brand-bg flex flex-col p-6">
        <div className="mb-8 space-y-4">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-brand-muted">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span>{Math.round(safeProgress)}% Complete</span>
          </div>
          <div className="h-2 bg-brand-surface border border-brand-border rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-brand-accent"
              initial={{ width: 0 }}
              animate={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <h3 className="text-2xl font-bold tracking-tight leading-tight">{q.question_text}</h3>

          <div className="space-y-3">
            {q.type === 'mcq' && q.options ? (
              q.options.filter(o => o).map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => submitAnswer(String.fromCharCode(65 + i))}
                  className="w-full p-5 bg-brand-surface border-2 border-brand-border rounded-2xl text-left font-bold hover:border-brand-accent active:scale-95 transition-all flex items-center gap-4"
                >
                  <span className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted font-bold text-xs uppercase">{String.fromCharCode(65 + i)}</span>
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
                  className="w-full py-5 bg-brand-accent text-white rounded-2xl font-bold uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
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
          <h2 className="text-xl font-bold uppercase tracking-tight">Class Battles</h2>
          <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider mt-1">Join teacher-created arenas</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={16} />
            <input 
              type="text"
              value={searchTeacher}
              onChange={e => setSearchTeacher(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold focus:border-brand-accent outline-none transition-all text-brand-text"
              placeholder="Search Teacher Name"
            />
            <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest border border-brand-border/30 rounded">Teacher</span>
          </div>

          <div className="relative group">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={16} />
            <input 
              type="text"
              value={searchSchool}
              onChange={e => setSearchSchool(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold focus:border-brand-accent outline-none transition-all text-brand-text"
              placeholder="Search School Name"
            />
            <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest border border-brand-border/30 rounded">School</span>
          </div>

          <div className="relative group">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent pointer-events-none" size={16} />
            <select
              value={searchGrade}
              onChange={e => setSearchGrade(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold focus:border-brand-accent outline-none text-brand-text appearance-none transition-all"
            >
              {Array.from(new Set([initialGrade, 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'])).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest border border-brand-border/30 rounded">Grade</span>
          </div>
        </div>

        <button 
          onClick={fetchCompetitions}
          disabled={loading}
          className="w-full bg-brand-text text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Swords size={18} />}
          Find Arena Battles
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>
        ) : !hasSearched ? (
          <div className="py-20 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] space-y-4">
            <Search size={48} className="mx-auto text-brand-muted/20" />
            <p className="text-brand-muted font-bold text-xs uppercase tracking-wider">Search for your teacher's arena</p>
          </div>
        ) : competitions.length === 0 ? (
          <div className="py-20 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] space-y-4">
            <Sparkles size={48} className="mx-auto text-brand-muted/20" />
            <p className="text-brand-muted font-bold text-xs uppercase tracking-wider">No active class battles found</p>
          </div>
        ) : (
          competitions.map(comp => (
            <motion.div 
              key={comp.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartComp(comp)}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-4 hover:border-brand-accent transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${
                    comp.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    comp.status === 'marking' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-brand-bg text-brand-muted border-brand-border'
                  }`}>
                    {comp.status === 'active' ? 'JOIN NOW' : comp.status === 'marking' ? 'MARKING' : 'FINISHED'}
                  </span>
                  <span className="text-[9px] font-black text-brand-muted uppercase tracking-wider">{comp.subject}</span>
                </div>
                <div className="px-2 py-1 bg-brand-bg rounded-lg border border-brand-border text-[7px] font-black uppercase text-brand-muted">
                  {comp.grade}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight uppercase group-hover:text-brand-accent transition-colors leading-tight">{comp.title}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-bold text-brand-text truncate">👨‍🏫 {comp.teacher_name || 'Your Teacher'}</p>
                  <p className="text-[9px] font-bold text-brand-muted truncate">🏫 {comp.school_name || 'Academic Core'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                <div className="flex items-center gap-1.5 text-brand-muted">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums">
                    {comp.status === 'finished' ? 'Session Over' : 'Live Battle'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-brand-accent font-black text-[10px] uppercase tracking-wider">
                  {comp.status === 'active' ? (
                    <>Battle Now <Play size={12} /></>
                  ) : (
                    <>View Score <Trophy size={12} /></>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <StudentIdentityModal
        isOpen={showIdentity}
        onClose={() => setShowIdentity(false)}
        grade={searchGrade}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (pendingComp) {
            startCompetition(pendingComp);
            setPendingComp(null);
          }
        }}
      />
    </div>
  );
};

