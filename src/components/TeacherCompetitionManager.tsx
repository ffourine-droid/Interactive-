import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Trophy, Clock, Users, 
  ChevronRight, Trash2, CheckCircle2, AlertCircle,
  Loader2, Play, Pause, ListChecks, MessageSquare,
  Award, ShieldCheck, HelpCircle, Save, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface Question {
  id?: string;
  text: string;
  type: 'mcq' | 'short_answer';
  options?: string[];
  correct_answer: string;
  points: number;
}

interface Competition {
  id: string;
  title: string;
  subject: string;
  grade: string;
  status: 'draft' | 'active' | 'marking' | 'finished';
  created_at: string;
  question_count?: number;
}

interface Participant {
  student_id: string;
  student_name: string;
  score: number;
  total_questions: number;
  is_finished: boolean;
  submitted_at: string;
}

export const TeacherCompetitionManager: React.FC<{ teacherId: string }> = ({ teacherId }) => {
  const { showToast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'manage'>('list');

  // New Comp Form
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchCompetitions();
  }, [teacherId]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teacher_competitions')
        .select(`
          *,
          teacher_competition_questions(count)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback for missing relationship or schema cache issues
        if (error.message?.includes('relationship') || error.code === 'PGRST200') {
          const { data: basicData, error: basicErr } = await supabase
            .from('teacher_competitions')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false });
          if (basicErr) throw basicErr;
          setCompetitions(basicData.map(c => ({ ...c, question_count: 0 })));
          return;
        }
        throw error;
      }

      setCompetitions(data.map(c => ({
        ...c,
        question_count: (c as any).teacher_competition_questions?.[0]?.count || 0
      })));
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title || !subject || !grade || questions.length === 0) {
      showToast("Fill all fields and add questions", "error");
      return;
    }

    try {
      setLoading(true);
      const { data: comp, error: compErr } = await supabase
        .from('teacher_competitions')
        .insert([{
          teacher_id: teacherId,
          title,
          subject,
          grade,
          status: 'draft'
        }])
        .select()
        .single();

      if (compErr) throw compErr;

      const questionsToInsert = questions.map(q => ({
        competition_id: comp.id,
        question_text: q.text,
        type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points
      }));

      const { error: qErr } = await supabase
        .from('teacher_competition_questions')
        .insert(questionsToInsert);

      if (qErr) throw qErr;

      showToast("Competition created!", "success");
      setIsCreating(false);
      resetForm();
      fetchCompetitions();
      setView('list');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setGrade('');
    setQuestions([]);
  };

  const addQuestion = (type: 'mcq' | 'short_answer') => {
    setQuestions([...questions, {
      text: '',
      type,
      options: type === 'mcq' ? ['', '', '', ''] : undefined,
      correct_answer: '',
      points: 10
    }]);
  };

  const updateQuestion = (idx: number, updates: Partial<Question>) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...updates };
    setQuestions(next);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const deleteCompetition = async (id: string) => {
    if (!confirm("Are you sure? This will delete all questions and results.")) return;
    try {
      const { error } = await supabase.from('teacher_competitions').delete().eq('id', id);
      if (error) throw error;
      showToast("Deleted", "success");
      fetchCompetitions();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const toggleStatus = async (comp: Competition) => {
    const nextStatus = comp.status === 'draft' ? 'active' : (comp.status === 'active' ? 'marking' : 'finished');
    try {
      const { error } = await supabase
        .from('teacher_competitions')
        .update({ status: nextStatus })
        .eq('id', comp.id);
      if (error) throw error;
      fetchCompetitions();
      showToast(`Competition is now ${nextStatus}`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('list')} className="text-brand-muted hover:text-brand-accent flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
            <X size={16} /> Cancel
          </button>
          <h2 className="text-xl font-black tracking-tight uppercase">New Competition</h2>
          <button onClick={handleCreate} className="bg-brand-accent text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-accent/20">
            {loading ? <Loader2 className="animate-spin" size={14} /> : 'Save as Draft'}
          </button>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Science Bowl" className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Science" className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Grade</label>
              <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. Grade 7" className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" />
            </div>
          </div>

          <div className="pt-6 border-t border-brand-border space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">Questions</h3>
              <div className="flex gap-2">
                <button onClick={() => addQuestion('mcq')} className="px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-brand-accent transition-colors">Add MCQ</button>
                <button onClick={() => addQuestion('short_answer')} className="px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-brand-accent transition-colors">Add Short Answer</button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-brand-bg border border-brand-border rounded-3xl p-6 space-y-4 relative group">
                  <button onClick={() => removeQuestion(qIdx)} className="absolute top-4 right-4 text-red-500/20 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full uppercase tracking-widest">Q{qIdx + 1}</span>
                    <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">{q.type}</span>
                  </div>
                  <input value={q.text} onChange={e => updateQuestion(qIdx, { text: e.target.value })} placeholder="Enter question..." className="w-full bg-brand-surface border border-brand-border rounded-xl p-3 font-bold text-sm outline-none focus:border-brand-accent/50" />
                  
                  {q.type === 'mcq' && q.options && (
                    <div className="grid grid-cols-2 gap-3">
                      {q.options.map((opt, oIdx) => (
                        <input key={oIdx} value={opt} onChange={e => {
                          const newOpts = [...q.options!];
                          newOpts[oIdx] = e.target.value;
                          updateQuestion(qIdx, { options: newOpts });
                        }} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} className="bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-bold" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-brand-muted px-1">Correct Answer</label>
                      <input value={q.correct_answer} onChange={e => updateQuestion(qIdx, { correct_answer: e.target.value })} placeholder={q.type === 'mcq' ? "e.g. A" : "Enter correct keywords..."} className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2 text-xs font-bold text-emerald-600" />
                    </div>
                    <div className="w-24">
                      <label className="text-[8px] font-black uppercase tracking-widest text-brand-muted px-1">Points</label>
                      <input type="number" value={q.points} onChange={e => updateQuestion(qIdx, { points: parseInt(e.target.value) })} className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-bold" />
                    </div>
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-brand-border rounded-[2rem] text-brand-muted">
                  <HelpCircle size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Add questions to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'manage' && selectedComp) {
    return (
      <CompetitionDashboard 
        competition={selectedComp} 
        onBack={() => { setView('list'); fetchCompetitions(); }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase">Class Competitions</h2>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-1">Create engaging battles for your classes</p>
        </div>
        <button onClick={() => setView('create')} className="bg-brand-accent text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-accent/20 flex items-center gap-2 active:scale-95 transition-all">
          <Plus size={16} /> New Competition
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>
        ) : competitions.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] space-y-4">
             <Trophy size={48} className="mx-auto text-brand-muted/20" />
             <div>
               <p className="text-brand-muted font-bold">No competitions yet.</p>
               <p className="text-xs text-brand-muted/60">Gamify your classroom with real-time battles.</p>
             </div>
          </div>
        ) : (
          competitions.map((comp, idx) => (
            <motion.div 
              key={comp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-4 hover:border-brand-accent transition-all group cursor-pointer"
              onClick={() => { setSelectedComp(comp); setView('manage'); }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full border ${
                    comp.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    comp.status === 'marking' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    comp.status === 'finished' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-brand-bg text-brand-muted border-brand-border'
                  }`}>
                    {comp.status}
                  </span>
                  <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">{comp.subject} • {comp.grade}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteCompetition(comp.id); }} className="text-red-500/20 hover:text-red-500 p-2 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-black tracking-tight group-hover:text-brand-accent transition-colors">{comp.title}</h3>
                <p className="text-xs font-bold text-brand-muted mt-1">{comp.question_count} Questions</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-brand-muted">
                    <Users size={14} />
                    <span className="text-xs font-black">0 Joined</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-brand-accent font-black text-[10px] uppercase tracking-widest">
                  Manage Battle <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const CompetitionDashboard: React.FC<{ competition: Competition, onBack: () => void }> = ({ competition, onBack }) => {
  const { showToast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'marking' | 'leaderboard'>('overview');

  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 5000);
    return () => clearInterval(interval);
  }, [competition.id]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_competition_participants')
        .select('*')
        .eq('competition_id', competition.id)
        .order('score', { ascending: false });

      if (error) throw error;
      setParticipants(data);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    const nextStatus = competition.status === 'draft' ? 'active' : (competition.status === 'active' ? 'marking' : 'finished');
    try {
      const { error } = await supabase
        .from('teacher_competitions')
        .update({ status: nextStatus })
        .eq('id', competition.id);
      if (error) throw error;
      showToast(`Competition is now ${nextStatus}`, "success");
      onBack(); // Simple way to refresh parent
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-brand-muted hover:text-brand-accent flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
          <ChevronRight className="rotate-180" size={16} /> Back
        </button>
        <div className="flex gap-2">
          {competition.status !== 'finished' && (
            <button 
              onClick={toggleStatus}
              className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${
                competition.status === 'draft' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                competition.status === 'active' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                'bg-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              {competition.status === 'draft' ? <Play size={14} /> : competition.status === 'active' ? <Pause size={14} /> : <CheckCircle2 size={14} />}
              {competition.status === 'draft' ? 'Start Competition' : competition.status === 'active' ? 'Move to Marking' : 'Finalize Results'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest px-2 py-0.5 bg-brand-accent/10 rounded-full">{competition.subject}</span>
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Grade {competition.grade}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase">{competition.title}</h2>
          </div>
          <div className="flex items-center gap-6 px-6 py-4 bg-brand-bg border border-brand-border rounded-2xl">
            <div className="text-center">
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Participants</p>
              <p className="text-xl font-black text-brand-text">{participants.length}</p>
            </div>
            <div className="w-px h-8 bg-brand-border" />
            <div className="text-center">
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Avg Score</p>
              <p className="text-xl font-black text-brand-text">
                {participants.length > 0 ? Math.round(participants.reduce((acc, p) => acc + p.score, 0) / participants.length) : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-b border-brand-border pb-px">
          {[
            { id: 'overview', label: 'Participants', icon: Users },
            { id: 'marking', label: 'Manual Marking', icon: ListChecks },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 relative ${activeTab === tab.id ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted hover:text-brand-accent'}`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'marking' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {participants.length === 0 ? (
                <div className="py-20 text-center text-brand-muted">
                  <Users size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Waiting for students to join...</p>
                  <div className="mt-4 p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/20 max-w-sm mx-auto">
                    <p className="text-[8px] font-black uppercase tracking-widest text-brand-accent mb-1">Competition Mode</p>
                    <p className="text-xs font-bold leading-none">Tell students to look for "{competition.title}" in their competition hub.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {participants.map(p => (
                    <div key={p.student_id} className="bg-brand-bg border border-brand-border p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-center font-black text-brand-muted uppercase">
                          {p.student_name[0]}
                        </div>
                        <div>
                          <p className="font-black text-brand-text">{p.student_name}</p>
                          <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">
                            {p.is_finished ? 'Finished' : 'In Progress'} • {p.score} pts
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-black text-brand-text leading-none">{p.score}</p>
                          <p className="text-[8px] font-black text-brand-muted uppercase tracking-widest mt-0.5">Points</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'marking' && (
            <MarkingInterface competitionId={competition.id} />
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-3">
              {participants.map((p, idx) => (
                <div key={p.student_id} className={`flex items-center gap-4 p-4 rounded-2xl border ${idx === 0 ? 'bg-amber-500/5 border-amber-500/30' : 'bg-brand-bg border-brand-border'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-300 text-slate-700' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-brand-surface text-brand-muted border border-brand-border'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-brand-text">{p.student_name}</p>
                    <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Accuracy: {Math.round((p.score / (p.total_questions * 10)) * 100)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-brand-text tabular-nums leading-none">{p.score}</p>
                    <p className="text-[8px] font-black text-brand-muted uppercase tracking-widest mt-1">Total Pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MarkingInterface: React.FC<{ competitionId: string }> = ({ competitionId }) => {
  const { showToast } = useToast();
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResponses();
  }, [competitionId]);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_competition_responses')
        .select(`
          *,
          teacher_competition_questions(question_text, correct_answer, points)
        `)
        .eq('competition_id', competitionId)
        .eq('is_correct', null) // Only un-marked
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      setResponses(data.map(r => ({
        ...r,
        question: (r as any).teacher_competition_questions
      })));
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const markResponse = async (responseId: string, isCorrect: boolean, studentId: string, points: number) => {
    try {
      // 1. Update response
      const { error: resErr } = await supabase
        .from('teacher_competition_responses')
        .update({ 
          is_correct: isCorrect, 
          points_awarded: isCorrect ? points : 0,
          graded_at: new Date().toISOString()
        })
        .eq('id', responseId);

      if (resErr) throw resErr;

      // 2. Update student score in participant table
      if (isCorrect) {
        const { data: currentPart, error: fetchErr } = await supabase
          .from('teacher_competition_participants')
          .select('score')
          .eq('competition_id', competitionId)
          .eq('student_id', studentId)
          .single();
        
        if (!fetchErr && currentPart) {
          await supabase
            .from('teacher_competition_participants')
            .update({ score: currentPart.score + points })
            .eq('competition_id', competitionId)
            .eq('student_id', studentId);
        }
      }

      setResponses(prev => prev.filter(r => r.id !== responseId));
      showToast("Response marked", "success");
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-brand-accent/5 border border-brand-accent/20 px-6 py-4 rounded-3xl flex items-center gap-4">
        <ShieldCheck size={20} className="text-brand-accent" />
        <div>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Marking Queue</p>
          <p className="text-xs font-bold">You need to mark {responses.length} short-answer responses.</p>
        </div>
      </div>

      <div className="space-y-4">
        {responses.map(res => (
          <div key={res.id} className="bg-brand-bg border border-brand-border rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">Question</p>
                <p className="text-sm font-bold text-brand-text leading-snug">{res.question.question_text}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{res.student_name}</p>
                <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest mt-1">Worth {res.question.points} Pts</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Expected Keywords</p>
                <p className="text-xs font-bold text-emerald-600">{res.question.correct_answer}</p>
              </div>
              <div className="p-4 bg-brand-accent/5 border border-brand-accent/30 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest">Student Response</p>
                <p className="text-xs font-black text-brand-text">{res.answer_text}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => markResponse(res.id, false, res.student_id, res.question.points)}
                className="flex-1 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all hover:text-white"
              >
                Incorrect
              </button>
              <button 
                onClick={() => markResponse(res.id, true, res.student_id, res.question.points)}
                className="flex-3 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Mark Correct (+{res.question.points} Pts)
              </button>
            </div>
          </div>
        ))}

        {responses.length === 0 && (
          <div className="py-20 text-center text-brand-muted bg-brand-bg border border-brand-border border-dashed rounded-[2.5rem]">
            <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">All caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
};
