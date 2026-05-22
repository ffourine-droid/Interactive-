import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Trophy, Clock, Users, 
  ChevronRight, Trash2, CheckCircle2, AlertCircle,
  Loader2, Play, Pause, ListChecks, MessageSquare,
  Award, ShieldCheck, HelpCircle, Save, X, FileJson,
  Wand2, Sparkles, Edit, BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { QuestionRequestForm } from './QuestionRequestForm';

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
  group_mappings?: any;
}

interface Participant {
  student_id: string;
  student_name: string;
  score: number;
  total_questions: number;
  is_finished: boolean;
  submitted_at: string;
}

export const TeacherCompetitionManager: React.FC<{ teacherId: string, classId?: string, grade?: string }> = ({ teacherId, classId, grade: propGrade }) => {
  const { showToast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'manage'>('list');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [students, setStudents] = useState<any[]>([]);

  // New Comp Form
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState(propGrade || '');
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchCompetitions();
    if (classId) fetchStudents();
  }, [teacherId, classId]);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').eq('class_id', classId);
    setStudents(data || []);
  };

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('teacher_competitions')
        .select(`
          id, title, subject, grade, status, created_at,
          teacher_competition_questions!competition_id(id)
        `)
        .eq('teacher_id', teacherId);

      if (classId) {
        // If we want to strictly filter by class, we might need a class_id column.
        // Assuming for now competitions are grade-based but we can filter by grade if classId is provided.
        if (propGrade) query = query.eq('grade', propGrade);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Fallback for missing relationship or schema cache issues
        if (error.message?.includes('relationship') || error.message?.includes('not found') || error.code?.startsWith('PGRST')) {
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
        question_count: (c as any).teacher_competition_questions?.length || 0
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

  const handleImportJson = () => {
    try {
      const data = JSON.parse(importJson);
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid structure. Must have a 'questions' array.");
      }
      
      if (data.title) setTitle(data.title);
      if (data.subject) setSubject(data.subject);
      if (data.grade) setGrade(data.grade);
      
      const importedQuestions = data.questions.map((q: any) => ({
        text: q.text || q.question_text || '',
        type: q.type || (q.options ? 'mcq' : 'short_answer'),
        options: q.options,
        correct_answer: q.correct_answer || q.answer || '',
        points: q.points || 10
      }));
      
      setQuestions(importedQuestions);
      setShowImportForm(false);
      setImportJson('');
      showToast("Questions imported successfully!", "success");
    } catch (e: any) {
      showToast("Failed to parse JSON: " + e.message, "error");
    }
  };

  if (showRequestForm) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8">
        <QuestionRequestForm 
          teacher={{ id: teacherId, name: 'Teacher', school_name: '' }} 
          onClose={() => setShowRequestForm(false)} 
        />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <button onClick={() => setView('list')} className="text-brand-muted hover:text-brand-accent flex items-center gap-2 font-black text-[10px] uppercase tracking-wider whitespace-nowrap">
              <X size={16} /> Cancel
            </button>
          <h2 className="text-xl font-bold tracking-tight uppercase">New Group Project</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowRequestForm(true)}
              className="px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-[9px] font-black text-brand-muted uppercase tracking-wider hover:border-brand-accent transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <MessageSquare size={14} /> Request from Admin
            </button>
            <button onClick={handleCreate} className="bg-brand-accent text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-brand-accent/20 whitespace-nowrap shrink-0">
              {loading ? <Loader2 className="animate-spin" size={14} /> : 'Publish Project'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showImportForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-brand-bg border border-brand-border rounded-[2rem] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <FileJson size={16} className="text-brand-accent" />
                  Import Questions via JSON
                </h3>
                <button onClick={() => setShowImportForm(false)} className="text-brand-muted"><X size={16} /></button>
              </div>
              <p className="text-[10px] text-brand-muted">Paste the JSON configuration provided by the administrator or exported from another competition.</p>
              <textarea 
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder='{ "questions": [...] }'
                className="w-full h-32 bg-brand-surface border border-brand-border rounded-xl p-4 font-mono text-xs outline-none focus:border-brand-accent/50"
              />
              <button 
                onClick={handleImportJson}
                className="w-full bg-brand-accent text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-accent/10"
              >
                Parse & Import
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted px-1 whitespace-nowrap">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Science Bowl" className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted px-1 whitespace-nowrap">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Science" className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted px-1 whitespace-nowrap">Grade</label>
              <select 
                value={grade || 'Grade 7'} 
                onChange={e => setGrade(e.target.value)} 
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50 appearance-none"
              >
                {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-brand-border space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">Questions</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowImportForm(!showImportForm)}
                  className="px-3 py-1.5 bg-brand-accent/10 border border-brand-accent/20 rounded-lg text-[9px] font-black text-brand-accent uppercase tracking-widest hover:bg-brand-accent/20 transition-colors flex items-center gap-1.5"
                >
                  <FileJson size={14} /> Import Code
                </button>
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
                      <input type="number" value={isNaN(q.points) ? '' : q.points} onChange={e => updateQuestion(qIdx, { points: parseInt(e.target.value) || 0 })} className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-bold" />
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
        classId={classId}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight uppercase">Group Work Manager</h2>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mt-1">Design collaborative and competitive class projects</p>
        </div>
        <button onClick={() => setView('create')} className="bg-brand-accent text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-xl shadow-brand-accent/20 flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap shrink-0">
          <Plus size={16} /> New Group Work
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
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                    comp.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    comp.status === 'marking' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    comp.status === 'finished' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-brand-bg text-brand-muted border-brand-border'
                  }`}>
                    {comp.status}
                  </span>
                  <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider">{comp.subject} • {comp.grade}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteCompetition(comp.id); }} className="text-red-500/20 hover:text-red-500 p-2 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-bold tracking-tight group-hover:text-brand-accent transition-colors">{comp.title}</h3>
                <p className="text-xs font-bold text-brand-muted mt-1">{comp.question_count} Questions</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-brand-muted">
                    <Users size={14} />
                    <span className="text-xs font-bold">0 Joined</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-brand-accent font-bold text-[10px] uppercase tracking-wider">
                  Manage Project <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const THEMES_PRESETS = {
  standard: ['Group A', 'Group B', 'Group C', 'Group D'],
  space: ['🚀 Cosmic Pulsars', '🌠 Nebula Raiders', '👾 Asteroid Rangers', '🛰️ Solar Voyagers'],
  wildlife: ['🦊 Cyber Foxes', '🦫 Coding Capybaras', '🐼 Pixel Pandas', '🦁 Binary Lions'],
  magic: ['🔮 Spellbound Wizards', '🐲 Dragon Alchemists', '🦅 Griffin Scholars', '🔥 Phoenix Sages']
};

const CompetitionDashboard: React.FC<{ competition: Competition, onBack: () => void, classId?: string }> = ({ competition, onBack, classId }) => {
  const { showToast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'marking' | 'leaderboard'>('overview');
  const [responsesCount, setResponsesCount] = useState(0);
  const [groups, setGroups] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(`groups_${competition.id}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [compQuestions, setCompQuestions] = useState<any[]>([]);
  const [questionStats, setQuestionStats] = useState<Record<string, { correct: number, total: number }>>({});

  // Playful Group States
  const [activeTheme, setActiveTheme] = useState<'standard' | 'space' | 'wildlife' | 'magic'>('standard');
  const [customGroupNames, setCustomGroupNames] = useState<string[]>(() => {
    const saved = localStorage.getItem(`group_names_${competition.id}`);
    if (saved) return JSON.parse(saved);

    // Dynamic recovery fallback from DB's group_mappings column
    const mappings = competition.group_mappings;
    if (mappings && typeof mappings === 'object') {
      const names = new Set<string>();
      Object.keys(mappings).forEach(key => {
        if (Array.isArray(mappings[key])) {
          names.add(key);
        } else if (typeof mappings[key] === 'string') {
          names.add(mappings[key]);
        }
      });
      if (names.size > 0) return Array.from(names);
    }

    return THEMES_PRESETS.standard;
  });
  const [groupGoal, setGroupGoal] = useState(() => {
    return localStorage.getItem(`group_goal_${competition.id}`) || 'Work together to solve questions correctly and aim high! 🚀';
  });
  const [editingGroupIdx, setEditingGroupIdx] = useState<number | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');

  const fetchQuestionsAndStats = async () => {
    try {
      const { data: qs } = await supabase
        .from('teacher_competition_questions')
        .select('*')
        .eq('competition_id', competition.id);
      
      setCompQuestions(qs || []);

      const { data: resp } = await supabase
        .from('teacher_competition_responses')
        .select('question_id, is_correct')
        .eq('competition_id', competition.id);

      const stats: Record<string, { correct: number, total: number }> = {};
      resp?.forEach(r => {
        if (!stats[r.question_id]) {
          stats[r.question_id] = { correct: 0, total: 0 };
        }
        stats[r.question_id].total++;
        if (r.is_correct === true) {
          stats[r.question_id].correct++;
        }
      });
      setQuestionStats(stats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchParticipants();
    fetchAvailableStudents();
    fetchResponsesCount();
    fetchQuestionsAndStats();

    // Subscribe to changes in participants and responses
    const participantsChannel = supabase
      .channel(`participants_${competition.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teacher_competition_participants',
        filter: `competition_id=eq.${competition.id}`
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    const responsesChannel = supabase
      .channel(`responses_${competition.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teacher_competition_responses',
        filter: `competition_id=eq.${competition.id}`
      }, () => {
        fetchResponsesCount();
        fetchParticipants(); // Score might have changed after marking
        fetchQuestionsAndStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, [competition.id]);

  const fetchResponsesCount = async () => {
    const { count } = await supabase
      .from('teacher_competition_responses')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competition.id)
      .is('is_correct', null);
    setResponsesCount(count || 0);
  };

  const fetchAvailableStudents = async () => {
    if (classId) {
      const { data } = await supabase.from('students').select('*').eq('class_id', classId);
      setAvailableStudents(data || []);
    } else {
      const { data: compData } = await supabase.from('teacher_competitions').select('grade').eq('id', competition.id).single();
      const { data } = await supabase.from('students').select('*').eq('grade', compData?.grade);
      setAvailableStudents(data || []);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_competition_participants')
        .select('student_id, student_name, score, total_questions, is_finished, submitted_at, group_name')
        .eq('competition_id', competition.id)
        .order('score', { ascending: false });

      if (error) throw error;
      setParticipants(data);

      // Sync groups state from DB data
      if (data) {
        const newGroups: Record<string, string> = {};
        data.forEach(p => {
          if (p.group_name) newGroups[p.student_id] = p.group_name;
        });
        setGroups(prev => ({ ...prev, ...newGroups }));
      }
    } catch (e: any) {
      console.error(e.message);
    } finally {
      if (loading) setLoading(false);
    }
  };

  const updateStudentGroup = async (studentId: string, groupName: string | null) => {
    // Optimistic update
    setGroups(prev => {
      const next = { ...prev };
      if (groupName) next[studentId] = groupName;
      else delete next[studentId];
      return next;
    });

    try {
      const { data: existing } = await supabase
        .from('teacher_competition_participants')
        .select('*')
        .eq('competition_id', competition.id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('teacher_competition_participants')
          .update({ group_name: groupName })
          .eq('competition_id', competition.id)
          .eq('student_id', studentId);
        if (error) throw error;
      } else {
        const student = availableStudents.find(s => s.id === studentId);
        const { error } = await supabase
          .from('teacher_competition_participants')
          .insert({
            competition_id: competition.id,
            student_id: studentId,
            student_name: student?.name || 'Unknown Student',
            score: 0,
            total_questions: 0,
            is_finished: false,
            group_name: groupName
          });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Failed to update group in DB:", e);
    }
  };

  const changeThemeAndMigrate = async (themeKey: 'standard' | 'space' | 'wildlife' | 'magic') => {
    const oldNames = [...customGroupNames];
    const newNames = THEMES_PRESETS[themeKey];
    setCustomGroupNames(newNames);
    localStorage.setItem(`group_names_${competition.id}`, JSON.stringify(newNames));
    setActiveTheme(themeKey);

    const nextGroups = { ...groups };
    const updatedIds: string[] = [];

    Object.keys(nextGroups).forEach(studentId => {
      const oldVal = nextGroups[studentId];
      const idx = oldNames.indexOf(oldVal);
      if (idx !== -1) {
        nextGroups[studentId] = newNames[idx];
        updatedIds.push(studentId);
      }
    });

    setGroups(nextGroups);
    localStorage.setItem(`groups_${competition.id}`, JSON.stringify(nextGroups));

    for (const sId of updatedIds) {
      try {
        await supabase
          .from('teacher_competition_participants')
          .update({ group_name: nextGroups[sId] })
          .eq('competition_id', competition.id)
          .eq('student_id', sId);
      } catch (e) {
        console.error(e);
      }
    }

    fetchParticipants();
    showToast(`🪄 Activated ${themeKey === 'wildlife' ? 'Cyber Wildlife' : themeKey === 'space' ? 'Astro Wonders' : themeKey === 'magic' ? 'Fantasy Wizards' : 'Standard'} team theme!`, "success");
  };

  const autoDistributeUnassigned = async () => {
    const unassigned = availableStudents.filter(s => !groups[s.id]);
    if (unassigned.length === 0) {
      showToast("Everyone is already assigned to a team! 🦊", "warning");
      return;
    }

    const nextGroups = { ...groups };
    const updated: { studentId: string, name: string, group: string }[] = [];

    unassigned.forEach((student, index) => {
      const assignedGroup = customGroupNames[index % customGroupNames.length];
      nextGroups[student.id] = assignedGroup;
      updated.push({ studentId: student.id, name: student.name, group: assignedGroup });
    });

    setGroups(nextGroups);
    localStorage.setItem(`groups_${competition.id}`, JSON.stringify(nextGroups));

    for (const item of updated) {
      try {
        const { data: existing } = await supabase
          .from('teacher_competition_participants')
          .select('*')
          .eq('competition_id', competition.id)
          .eq('student_id', item.studentId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('teacher_competition_participants')
            .update({ group_name: item.group })
            .eq('competition_id', competition.id)
            .eq('student_id', item.studentId);
        } else {
          await supabase
            .from('teacher_competition_participants')
            .insert({
              competition_id: competition.id,
              student_id: item.studentId,
              student_name: item.name,
              score: 0,
              total_questions: 0,
              is_finished: false,
              group_name: item.group
            });
        }
      } catch (e) {
        console.error(e);
      }
    }

    fetchParticipants();
    showToast(`🪄 Magic wand success! Distributed ${unassigned.length} students evenly!`, "success");
  };

  const clearAllGroups = async () => {
    if (!confirm("Clear all student group assignments? This sends everyone back to Unassigned.")) return;

    setGroups({});
    localStorage.removeItem(`groups_${competition.id}`);

    try {
      const { error } = await supabase
        .from('teacher_competition_participants')
        .update({ group_name: null })
        .eq('competition_id', competition.id);

      if (error) throw error;
      showToast("🧹 Clean sweep! All students are now unassigned.", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
    fetchParticipants();
  };

  const saveCustomGroupName = async (idx: number) => {
    if (!tempGroupName.trim()) return;
    const oldName = customGroupNames[idx];
    const newName = tempGroupName.trim();

    const nextGroupNames = [...customGroupNames];
    nextGroupNames[idx] = newName;
    setCustomGroupNames(nextGroupNames);
    localStorage.setItem(`group_names_${competition.id}`, JSON.stringify(nextGroupNames));
    setEditingGroupIdx(null);

    const nextGroups = { ...groups };
    const updatedIds: string[] = [];

    Object.keys(nextGroups).forEach(sId => {
      if (nextGroups[sId] === oldName) {
        nextGroups[sId] = newName;
        updatedIds.push(sId);
      }
    });

    setGroups(nextGroups);
    localStorage.setItem(`groups_${competition.id}`, JSON.stringify(nextGroups));

    for (const sId of updatedIds) {
      try {
        await supabase
          .from('teacher_competition_participants')
          .update({ group_name: newName })
          .eq('competition_id', competition.id)
          .eq('student_id', sId);
      } catch (e) {
        console.error(e);
      }
    }
    fetchParticipants();
    showToast(`✏️ Renamed team to "${newName}"!`, "success");
  };

  const updateGroupGoal = (val: string) => {
    setGroupGoal(val);
    localStorage.setItem(`group_goal_${competition.id}`, val);
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
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Students</p>
              <p className="text-xl font-black text-brand-text">{participants.length}</p>
            </div>
            <div className="w-px h-8 bg-brand-border" />
            <div className="text-center">
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Avg Progress</p>
              <p className="text-xl font-black text-brand-text">
                {participants.length > 0 ? Math.round(participants.reduce((acc, p) => acc + (p.score / (p.total_questions * 10 || 1)) * 100, 0) / participants.length) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-b border-brand-border pb-px overflow-x-auto">
          {[
            { id: 'overview', label: 'Students', icon: Users },
            { id: 'groups', label: 'Group Manager', icon: ListChecks },
            { id: 'marking', label: 'Review Work', icon: ListChecks },
            { id: 'leaderboard', label: 'Group Standings', icon: Trophy }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 relative shrink-0 ${activeTab === tab.id ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted hover:text-brand-accent'}`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'marking' && responsesCount > 0 && (
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
                    <p className="text-[8px] font-black uppercase tracking-widest text-brand-accent mb-1">Collaborative Work</p>
                    <p className="text-xs font-bold leading-none">Tell students to join "{competition.title}" in their dashboard.</p>
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">
                              {p.is_finished ? 'Submitted' : 'Drafting'}
                            </span>
                            {groups[p.student_id] && (
                              <span className="text-[8px] font-black bg-brand-accent text-white px-2 rounded-full uppercase">
                                {groups[p.student_id]}
                              </span>
                            )}
                          </div>
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

          {activeTab === 'groups' && (
            <div className="space-y-6">
              {/* Strategy Header & Creative Challenge Generator */}
              <div className="bg-gradient-to-r from-brand-accent/5 to-purple-500/5 border border-brand-accent/20 rounded-3xl p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent flex-shrink-0">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-brand-text uppercase tracking-wider mb-1">Collaboration Strategy Room</h3>
                    <p className="text-xs font-semibold text-brand-muted leading-relaxed">
                      Transform passive homework into active team battle arenas. Select a fun preset theme, auto-balance rosters with the magic wand, or type custom names to customize each team!
                    </p>
                  </div>
                </div>

                {/* Team Theme Pickers & Global Challenge Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-brand-border/40">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted">🔮 Team Name Preset Theme</label>
                    <div className="flex flex-wrap gap-2">
                      {(['standard', 'space', 'wildlife', 'magic'] as const).map(themeKey => (
                        <button
                          key={themeKey}
                          onClick={() => changeThemeAndMigrate(themeKey)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            activeTheme === themeKey
                              ? 'bg-brand-accent text-white border-brand-accent shadow-md shadow-brand-accent/15'
                              : 'bg-brand-bg text-brand-muted border-brand-border hover:border-brand-accent/40 hover:text-brand-accent'
                          }`}
                        >
                          {themeKey === 'standard' ? 'Standard ABCD' : themeKey === 'space' ? 'Astro Wonders 🚀' : themeKey === 'wildlife' ? 'Cyber Wildlife 🦊' : 'Fantasy Magic 🔮'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted">📝 Active Group Team-Quest Goal (Seen by Students)</label>
                    <input
                      type="text"
                      value={groupGoal}
                      onChange={e => updateGroupGoal(e.target.value)}
                      placeholder="e.g. Solve correctly to help your team win the ultimate badge! 🎉"
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                </div>

                {/* Automation toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-brand-border/40">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={autoDistributeUnassigned}
                      className="px-5 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-600/15 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Wand2 size={13} />
                      Magic Wand (Auto-Fill)
                    </button>
                    <button
                      onClick={clearAllGroups}
                      className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 transition-colors"
                    >
                      Clear Assignments
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-brand-muted">
                    📊 Roster Status: <span className="text-brand-accent font-black">{availableStudents.filter(s => groups[s.id]).length}</span> / <span className="font-black">{availableStudents.length}</span> assigned
                  </div>
                </div>
              </div>

              {/* Interactive Workspace Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Unassigned Drawer */}
                <div className="lg:col-span-1 space-y-4 bg-brand-surface border border-brand-border rounded-3xl p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-brand-text">
                      <Users size={14} className="text-brand-muted" /> Unassigned Pupils
                    </h3>
                    <span className="text-[10px] font-black text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full border border-brand-border">
                      {availableStudents.filter(s => !groups[s.id]).length} Left
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableStudents.filter(s => !groups[s.id]).length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-brand-border rounded-2xl italic space-y-2">
                        <CheckCircle2 size={24} className="mx-auto text-emerald-500 opacity-60" />
                        <p className="text-xs text-brand-muted font-bold uppercase tracking-wider">Perfect Balance!</p>
                        <p className="text-[9px] text-brand-muted">All students are placed in a cozy team camp.</p>
                      </div>
                    ) : (
                      availableStudents.filter(s => !groups[s.id]).map(s => (
                        <div key={s.id} className="bg-brand-bg border border-brand-border rounded-2xl p-3 space-y-2 group transition-all hover:border-brand-accent/40 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-brand-text">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest mr-1">Join:</span>
                            {customGroupNames.map((gName, idx) => {
                              // Extract first character as badge if emoji, otherwise index
                              const firstChar = gName.trim().match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/) 
                                ? gName.substring(0, 2) 
                                : `T${idx + 1}`;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => updateStudentGroup(s.id, gName)}
                                  title={`Move to ${gName}`}
                                  className="px-2 py-1 bg-brand-surface border border-brand-border rounded-lg text-[9px] font-black hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center gap-1"
                                >
                                  {firstChar}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Area: Interactive Team Pod Hubs */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 px-1">
                    🌟 Active Team Podquarters
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customGroupNames.map((groupName, idx) => {
                      const members = availableStudents.filter(s => groups[s.id] === groupName);
                      const isEditing = editingGroupIdx === idx;

                      // Extract logo badge
                      const matchedEmoji = groupName.trim().match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/);
                      const displayEmoji = matchedEmoji ? matchedEmoji[0] : '🛡️';
                      const printableName = matchedEmoji 
                        ? groupName.replace(matchedEmoji[0], '').trim() 
                        : groupName;

                      return (
                        <div
                          key={groupName}
                          className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 space-y-4 transition-all hover:border-brand-accent/30 relative shadow-sm"
                        >
                          {/* Pod Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={tempGroupName}
                                    onChange={e => setTempGroupName(e.target.value)}
                                    maxLength={30}
                                    className="bg-brand-bg border border-brand-border rounded-lg px-2 py-1 text-xs font-black outline-none focus:border-brand-accent"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && saveCustomGroupName(idx)}
                                  />
                                  <button
                                    onClick={() => saveCustomGroupName(idx)}
                                    className="p-1 text-emerald-500 hover:brightness-110"
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingGroupIdx(null)}
                                    className="p-1 text-red-500 hover:brightness-110"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group/title">
                                  <span className="text-xl" role="img" aria-label="team sign">{displayEmoji}</span>
                                  <h4 className="text-xs font-black uppercase tracking-tight text-brand-text truncate max-w-[120px]">
                                    {printableName}
                                  </h4>
                                  <button
                                    onClick={() => {
                                      setEditingGroupIdx(idx);
                                      setTempGroupName(groupName);
                                    }}
                                    className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 text-brand-muted hover:text-brand-accent"
                                  >
                                    <Edit size={10} />
                                  </button>
                                </div>
                              )}
                              <p className="text-[8px] font-black uppercase tracking-widest text-brand-muted mt-1">
                                {members.length} Squad Members
                              </p>
                            </div>
                          </div>

                          {/* Member tags */}
                          <div className="bg-brand-bg border border-brand-border rounded-2xl p-2 min-h-[140px] max-h-[180px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2 content-start">
                            {members.map(s => (
                              <div
                                key={s.id}
                                className="px-2.5 py-1.5 bg-brand-surface border border-brand-border rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 shadow-sm group/tag hover:border-red-400"
                              >
                                <span className="text-brand-text leading-none">{s.name}</span>
                                <button
                                  onClick={() => updateStudentGroup(s.id, null)}
                                  className="text-brand-muted hover:text-red-500 transition-colors"
                                  title="Remove from Team"
                                >
                                  <X size={11} className="font-bold border rounded bg-brand-bg p-px" />
                                </button>
                              </div>
                            ))}
                            {members.length === 0 && (
                              <div className="w-full h-full flex flex-col items-center justify-center text-center py-6 text-brand-muted/40 font-bold space-y-1">
                                <Users size={18} className="opacity-25" />
                                <p className="text-[8px] uppercase tracking-widest">Squad Empty</p>
                              </div>
                            )}
                          </div>

                          {/* Quick Add Student Menu inside Group Pod */}
                          {availableStudents.filter(s => !groups[s.id]).length > 0 && (
                            <div className="pt-2 border-t border-brand-border/40">
                              <select
                                onChange={e => {
                                  if (e.target.value) {
                                    updateStudentGroup(e.target.value, groupName);
                                    e.target.value = ''; // Reset select
                                  }
                                }}
                                className="w-full bg-brand-bg hover:bg-brand-border/40 border border-brand-border rounded-xl py-1.5 px-3 text-[9px] font-black uppercase text-brand-muted outline-none appearance-none cursor-pointer text-center"
                              >
                                <option value="">➕ Fast Add Student...</option>
                                {availableStudents.filter(s => !groups[s.id]).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marking' && (
            <MarkingInterface competitionId={competition.id} />
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Trophy className="text-amber-500" /> Group Leaderboard
                </h3>
                
                <div className="space-y-4">
                  {customGroupNames.map((groupName, idx) => {
                    const groupMembers = participants.filter(p => groups[p.student_id] === groupName);
                    const totalScore = groupMembers.reduce((acc, p) => acc + p.score, 0);
                    const activeMembers = groupMembers.filter(p => p.is_finished || p.total_questions > 0);
                    const avgScore = activeMembers.length > 0 ? Math.round(totalScore / activeMembers.length) : 0;
                    
                    if (groupMembers.length === 0) return null;

                    return (
                      <div key={groupName} className={`flex items-center gap-6 p-6 rounded-[2.5rem] border transition-all ${idx === 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-brand-bg border-brand-border'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-brand-surface text-brand-muted border border-brand-border'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-black tracking-tight">{groupName}</h4>
                          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mt-1">
                            {groupMembers.length} Collaborative Members • {avgScore} Avg Pts
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black text-brand-text tabular-nums leading-none">{totalScore}</p>
                          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mt-1">Total Score</p>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}

                  {Object.values(groups).length === 0 && (
                    <div className="py-20 text-center text-brand-muted">
                      <Users size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-sm font-bold">Groups have not been assigned yet.</p>
                      <button onClick={() => setActiveTab('groups')} className="mt-4 text-brand-accent font-black text-[10px] uppercase tracking-widest underline underline-offset-4">Assign Groups Now</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-muted px-2">Individual Contributions</h3>
                {participants.map((p, idx) => (
                  <div key={p.student_id} className={`flex items-center gap-4 p-4 rounded-2xl border bg-brand-bg border-brand-border`}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm bg-brand-surface text-brand-muted border border-brand-border">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-brand-text">{p.student_name}</p>
                      <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest">
                        {groups[p.student_id] || 'Individual'} • Accuracy: {p.total_questions > 0 ? Math.round((p.score / (p.total_questions * 10)) * 100) : 0}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-brand-text tabular-nums leading-none">{p.score}</p>
                      <p className="text-[8px] font-black text-brand-muted uppercase tracking-widest mt-1">Pts</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Classroom Revision & Question Insights */}
              <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-brand-accent" size={20} />
                  <h3 className="text-xl font-black uppercase tracking-tight">📚 Class Revision & Question Insights</h3>
                </div>
                <p className="text-xs font-bold text-brand-muted">Review which concepts students mastered or found difficult during the live project.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {compQuestions.map((q, qIdx) => {
                    const stats = questionStats[q.id] || { correct: 0, total: 0 };
                    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    
                    // Determine accuracy branding
                    const brandColor = accuracy >= 70 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : accuracy >= 40 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20';

                    return (
                      <div key={q.id} className="bg-brand-bg border border-brand-border rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Question {qIdx + 1} ({q.type.toUpperCase()})</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${brandColor}`}>
                            Class Accuracy: {accuracy}% ({stats.correct}/{stats.total})
                          </span>
                        </div>

                        <p className="font-bold text-brand-text leading-snug text-sm">{q.question_text}</p>
                        
                        <div className="pt-2 border-t border-brand-border/40 text-xs font-bold">
                          <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest block mb-1">Expected Correct Answer:</span>
                          <span className="text-emerald-600">{q.correct_answer}</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {compQuestions.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-brand-muted border border-dashed border-brand-border rounded-3xl">
                      No questions to show insights for.
                    </div>
                  )}
                </div>
              </div>
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
          teacher_competition_questions!question_id(question_text, correct_answer, points)
        `)
        .eq('competition_id', competitionId)
        .is('is_correct', null) // Only un-marked
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
      // 1. Update response - ensure isCorrect is explicitly a boolean or null
      const safeIsCorrect = isCorrect === true ? true : (isCorrect === false ? false : null);
      
      const { error: resErr } = await supabase
        .from('teacher_competition_responses')
        .update({ 
          is_correct: safeIsCorrect, 
          points_awarded: safeIsCorrect === true ? points : 0,
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
