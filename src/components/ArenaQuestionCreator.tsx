import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle, FileJson, CheckCircle2, ChevronDown, 
  Loader2, AlertCircle, Check, XCircle, Trash2,
  ListRestart, Trophy, Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArenaQuestion {
  grade: number;
  subject: string;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Mathematics', 'Integrated Science', 'Social Studies',
  'English', 'Kiswahili', 'Agriculture', 'CRE',
  'Creative Arts & Sports', 'Pre-Technical Studies', 'Business Studies',
];

const GRADES = [7, 8, 9];

const EMPTY_QUESTION: ArenaQuestion = {
  grade: 7,
  subject: 'Mathematics',
  topic: '',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  explanation: '',
  difficulty: 'medium',
};

const OPTION_COLORS: Record<string, string> = {
  A: 'border-blue-500 bg-blue-500/10 text-blue-400',
  B: 'border-purple-500 bg-purple-500/10 text-purple-400',
  C: 'border-amber-500 bg-amber-500/10 text-amber-400',
  D: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  hard: 'text-red-400 bg-red-400/10 border-red-400/30',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validate(q: ArenaQuestion): string[] {
  const errors: string[] = [];
  if (!q.question.trim()) errors.push('Question text is required');
  if (!q.option_a.trim()) errors.push('Option A is required');
  if (!q.option_b.trim()) errors.push('Option B is required');
  if (!q.option_c.trim()) errors.push('Option C is required');
  if (!q.option_d.trim()) errors.push('Option D is required');
  return errors;
}

async function saveQuestions(questions: ArenaQuestion[]): Promise<void> {
  const { error } = await supabase
    .from('questions_bank')
    .insert(questions.map(q => ({ ...q, is_approved: true, source: 'admin' })));
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1 block">
    {children}
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: (string | number)[];
}> = ({ label, value, onChange, options }) => (
  <div className="flex flex-col">
    <FieldLabel>{label}</FieldLabel>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-brand-bg border border-brand-border rounded-2xl py-3 pl-4 pr-10 text-sm font-bold text-brand-text focus:border-brand-accent outline-none cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
    </div>
  </div>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}> = ({ label, value, onChange, placeholder, multiline }) => (
  <div className="flex flex-col">
    <FieldLabel>{label}</FieldLabel>
    {multiline ? (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="bg-brand-bg border border-brand-border rounded-2xl py-3 px-4 text-sm font-bold text-brand-text placeholder:text-brand-muted/30 focus:border-brand-accent outline-none resize-none"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-brand-bg border border-brand-border rounded-2xl py-3 px-4 text-sm font-bold text-brand-text placeholder:text-brand-muted/30 focus:border-brand-accent outline-none"
      />
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ArenaQuestionCreatorProps {
  initialData?: Partial<ArenaQuestion> & {
    teacher_id?: string;
    teacher_name?: string;
    request_id?: string;
  };
}

export const ArenaQuestionCreator: React.FC<ArenaQuestionCreatorProps> = ({ initialData }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  
  // Manual Form State
  const [form, setForm] = useState<ArenaQuestion>({ 
    ...EMPTY_QUESTION,
    grade: typeof initialData?.grade === 'string' ? parseInt((initialData.grade as string).replace(/\D/g, '')) || 7 : initialData?.grade || 7,
    subject: initialData?.subject || 'Mathematics',
    topic: initialData?.topic || '',
  });
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<ArenaQuestion[]>([]);

  useEffect(() => {
    if (initialData) {
      setForm(prev => ({
        ...prev,
        grade: typeof initialData.grade === 'string' ? parseInt((initialData.grade as string).replace(/\D/g, '')) || 7 : initialData.grade || 7,
        subject: initialData.subject || 'Mathematics',
        topic: initialData.topic || '',
      }));
    }
  }, [initialData]);

  // Import State
  const [rawJson, setRawJson] = useState('');
  const [parsed, setParsed] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [targetId, setTargetId] = useState(initialData?.teacher_id || '');
  const [targetName, setTargetName] = useState(initialData?.teacher_name || '');
  const [targetSchool, setTargetSchool] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showTeacherSearch, setShowTeacherSearch] = useState(false);

  useEffect(() => {
    if (initialData?.teacher_id) setTargetId(initialData.teacher_id);
    if (initialData?.teacher_name) setTargetName(initialData.teacher_name);
  }, [initialData]);

  const fetchTeachers = async () => {
    const { data } = await supabase.from('profiles').select('id, username, school_name').order('username');
    setTeachers(data || []);
  };

  const handleManualSave = async () => {
    const errors = validate(form);
    if (errors.length) { showToast(errors[0], 'error'); return; }

    setSaving(true);
    try {
      await saveQuestions([form]);
      setSessionQuestions(prev => [...prev, form]);
      setSavedCount(c => c + 1);
      showToast('Question added to bank!', 'success');
      setForm({ ...EMPTY_QUESTION, grade: form.grade, subject: form.subject, topic: form.topic });
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAutoCompetition = async () => {
    // Collect all valid questions: session questions + current form (if valid)
    let finalQuestions = [...sessionQuestions];
    const currentErrors = validate(form);
    if (currentErrors.length === 0) {
      // Check if current form is already in sessionQuestions (simple check by question text)
      if (!sessionQuestions.find(sq => sq.question === form.question)) {
        finalQuestions.push(form);
      }
    }

    if (!targetId || finalQuestions.length === 0) {
      if (finalQuestions.length === 0) showToast("Add at least one question first", "error");
      return;
    }
    
    setSaving(true);
    try {
      // 1. Create teacher competition - set to active so it shows for students
      const { data: comp, error: compErr } = await supabase
        .from('teacher_competitions')
        .insert([{
          teacher_id: targetId,
          title: `${form.topic || 'New Project'} Group Work`,
          subject: form.subject,
          grade: form.grade.toString(),
          status: 'active'
        }])
        .select()
        .single();

      if (compErr) throw compErr;

      // 2. Add questions
      const questionsToInsert = finalQuestions.map(q => ({
        competition_id: comp.id,
        question_text: q.question,
        type: 'mcq',
        options: [q.option_a, q.option_b, q.option_c, q.option_d],
        correct_answer: q.correct_answer,
        points: q.difficulty === 'easy' ? 5 : (q.difficulty === 'hard' ? 15 : 10)
      }));

      const { error: qErr } = await supabase
        .from('teacher_competition_questions')
        .insert(questionsToInsert);

      if (qErr) throw qErr;

      // 3. Mark request as completed
      if (initialData?.request_id) {
        await supabase.from('question_requests').update({ status: 'completed' }).eq('id', initialData.request_id);
      }

      showToast(`Group project live for ${targetName || 'Teacher'}!`, "success");
      setSessionQuestions([]);
      setSavedCount(0);
    } catch (e: any) {
      console.error('Error creating competition:', e);
      showToast(e.message || 'Failed to create competition', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleJsonParse = () => {
    try {
      const data = JSON.parse(rawJson);
      const items = Array.isArray(data) ? data : [data];
      setParsed(items.map((item, i) => {
        // Handle various field name conventions
        const questionText = item.question || item.question_text || item.text || '';
        const optA = item.option_a || (item.options && item.options[0]) || '';
        const optB = item.option_b || (item.options && item.options[1]) || '';
        const optC = item.option_c || (item.options && item.options[2]) || '';
        const optD = item.option_d || (item.options && item.options[3]) || '';
        
        const normalizedItem = {
          ...EMPTY_QUESTION,
          grade: item.grade || form.grade,
          subject: item.subject || form.subject,
          topic: item.topic || form.topic,
          question: questionText,
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_answer: item.correct_answer || item.answer || 'A',
          difficulty: item.difficulty || 'medium',
        };

        return {
          ...normalizedItem,
          _id: i,
          _valid: validate(normalizedItem).length === 0,
          _selected: validate(normalizedItem).length === 0
        };
      }));
      setIsReviewing(true);
    } catch {
      showToast('Invalid JSON format', 'error');
    }
  };

  const handleBulkImport = async () => {
    const selected = parsed.filter(p => p._selected && p._valid);
    if (!selected.length) { showToast('No valid questions selected', 'error'); return; }

    setSaving(true);
    try {
      // 1. Save to global bank
      const clean = selected.map(({ _id, _valid, _selected, ...q }) => q);
      await saveQuestions(clean);

      // 2. If target teacher is set, create a competition
      if (targetId) {
        // Find the most common subject/grade in the batch for the competition header
        const mainSubject = clean[0].subject;
        const mainGrade = clean[0].grade.toString();
        const mainTopic = clean[0].topic || 'Imported Arena';

        const { data: comp, error: compErr } = await supabase
          .from('teacher_competitions')
          .insert([{
            teacher_id: targetId,
            title: `${mainTopic} Battle`,
            subject: mainSubject,
            grade: mainGrade,
            status: 'active'
          }])
          .select()
          .single();

        if (compErr) throw compErr;

        const questionsToInsert = clean.map(q => ({
          competition_id: comp.id,
          question_text: q.question,
          type: 'mcq',
          options: [q.option_a, q.option_b, q.option_c, q.option_d],
          correct_answer: q.correct_answer,
          points: q.difficulty === 'easy' ? 5 : (q.difficulty === 'hard' ? 15 : 10)
        }));

        const { error: qErr } = await supabase
          .from('teacher_competition_questions')
          .insert(questionsToInsert);

        if (qErr) throw qErr;

        if (initialData?.request_id) {
          await supabase.from('question_requests').update({ status: 'completed' }).eq('id', initialData.request_id);
        }

        showToast(`Imported ${selected.length} questions and created competition for ${targetName}`, 'success');
      } else {
        showToast(`Successfully imported ${selected.length} questions to bank`, 'success');
      }

      setRawJson('');
      setIsReviewing(false);
      setParsed([]);
    } catch (e: any) {
      console.error('Import error:', e);
      showToast(e.message || 'Import failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent">
            <PlusCircle size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">Group Work Generator</h2>
            <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">Create collaborative projects for the class</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'bg-brand-bg text-brand-muted'}`}
          >
            Manual
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'import' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'bg-brand-bg text-brand-muted'}`}
          >
            Import
          </button>
        </div>
      </div>

      {/* Target Teacher Toolbar */}
      <div className="bg-brand-bg border border-brand-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Target Recipient</p>
            <p className="text-xs font-bold text-brand-text">
              {targetName ? `${targetName} (${targetSchool || 'Manual Info'})` : 'Global Bank (Not sent to teacher)'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          {targetId ? (
            <button 
              onClick={() => { setTargetId(''); setTargetName(''); setTargetSchool(''); }}
              className="px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-[9px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              Clear Target
            </button>
          ) : (
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => { fetchTeachers(); setShowTeacherSearch(true); }}
                className="flex-1 px-4 py-2 bg-brand-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/10"
              >
                Select Teacher
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Teacher Search Modal/Dropdown */}
      <AnimatePresence>
        {showTeacherSearch && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-brand-bg border border-brand-border rounded-2xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Teacher Profiles</h3>
              <button onClick={() => setShowTeacherSearch(false)}><XCircle size={16} className="text-brand-muted" /></button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {teachers.map(t => (
                <button 
                  key={t.id}
                  onClick={() => {
                    setTargetId(t.id);
                    setTargetName(t.username);
                    setTargetSchool(t.school_name || '');
                    setShowTeacherSearch(false);
                  }}
                  className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-left hover:border-brand-accent transition-all flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-brand-text">{t.username}</span>
                    <span className="text-[9px] text-brand-muted uppercase tracking-widest">{t.school_name || 'No School'}</span>
                  </div>
                  <PlusCircle size={14} className="text-brand-accent" />
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-brand-border space-y-3">
              <p className="text-[9px] font-bold text-brand-muted uppercase">Or Input Manually</p>
              <div className="grid grid-cols-2 gap-3">
                <TextField 
                  label="Teacher Name" 
                  value={targetName} 
                  onChange={v => setTargetName(v)}
                  placeholder="Direct Name"
                />
                <TextField 
                  label="School Name" 
                  value={targetSchool} 
                  onChange={v => setTargetSchool(v)}
                  placeholder="Direct School"
                />
              </div>
              <p className="text-[8px] text-brand-muted italic">Note: If you don't select a teacher from the list, you can still input details for a custom assignment.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'manual' ? (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {savedCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{savedCount} Added This Session</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SelectField label="Grade" value={form.grade} onChange={v => setForm({ ...form, grade: Number(v) })} options={GRADES} />
              <SelectField label="Subject" value={form.subject} onChange={v => setForm({ ...form, subject: v })} options={SUBJECTS} />
              <TextField label="Topic" value={form.topic} onChange={v => setForm({ ...form, topic: v })} placeholder="e.g. Algebra" />
              <SelectField label="Difficulty" value={form.difficulty} onChange={v => setForm({ ...form, difficulty: v as any })} options={['easy', 'medium', 'hard']} />
            </div>

            <TextField label="Question Text" value={form.question} onChange={v => setForm({ ...form, question: v })} multiline />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['A', 'B', 'C', 'D'] as const).map(letter => {
                const key = `option_${letter.toLowerCase()}` as keyof ArenaQuestion;
                const isCorrect = form.correct_answer === letter;
                return (
                  <div key={letter} className="flex gap-3 items-center">
                    <button 
                      onClick={() => setForm({ ...form, correct_answer: letter })}
                      className={`w-10 h-10 rounded-xl border-2 shrink-0 flex items-center justify-center font-black ${isCorrect ? 'bg-brand-accent border-brand-accent text-white shadow-lg' : 'border-brand-border text-brand-muted hover:border-brand-accent/50 transition-colors'}`}
                    >
                      {letter}
                    </button>
                    <input 
                      value={form[key] as string}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      placeholder={`Option ${letter}`}
                      className={`w-full bg-brand-bg border rounded-2xl p-4 text-sm font-bold transition-all ${isCorrect ? 'border-brand-accent ring-1 ring-brand-accent/10' : 'border-brand-border'}`}
                    />
                  </div>
                );
              })}
            </div>

            <TextField label="Explanation (shown after round)" value={form.explanation || ''} onChange={v => setForm({ ...form, explanation: v })} multiline placeholder="Hint: Explaining why can help students learn faster!" />

            <div className="flex gap-4">
              <button 
                onClick={handleManualSave}
                disabled={saving}
                className="flex-1 bg-brand-bg border-2 border-brand-accent text-brand-accent py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-accent hover:text-white transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" /> : <PlusCircle size={18} />}
                Add More Questions
              </button>
              
              {targetId && (
                <button 
                  onClick={handleCreateAutoCompetition}
                  disabled={saving}
                  className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Trophy size={18} />}
                  Finish & Create for {targetName || 'Teacher'} ({sessionQuestions.length + (validate(form).length === 0 && !sessionQuestions.find(sq => sq.question === form.question) ? 1 : 0)})
                </button>
              )}

              {!targetId && (
                <button 
                  onClick={handleManualSave}
                  disabled={saving}
                  className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                  Save Question to Arena
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            {!isReviewing ? (
              <div className="space-y-4">
                <div className="bg-brand-bg border border-brand-border p-5 rounded-3xl space-y-3">
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Expected JSON Schema</p>
                  <pre className="text-[9px] text-brand-text/70 font-mono bg-black/5 p-4 rounded-xl overflow-x-auto leading-relaxed">
{`[
  {
    "grade": 7,
    "subject": "Mathematics",
    "question": "What is 15% of 200?",
    "option_a": "20", "option_b": "30", "option_c": "40", "option_d": "50",
    "correct_answer": "B",
    "difficulty": "medium"
  }
]`}
                  </pre>
                </div>
                <textarea 
                  value={rawJson}
                  onChange={e => setRawJson(e.target.value)}
                  placeholder="Paste JSON array here..."
                  className="w-full h-80 bg-brand-bg border-2 border-brand-border rounded-3xl p-6 font-mono text-xs outline-none focus:border-brand-accent"
                />
                <button 
                  onClick={handleJsonParse}
                  className="w-full bg-brand-text text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                >
                  <FileJson size={18} /> Review Data
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-brand-muted">Review {parsed.length} Questions</h3>
                  <button onClick={() => setIsReviewing(false)} className="text-[10px] font-black text-brand-accent uppercase tracking-widest flex items-center gap-1">
                    <ListRestart size={12} /> Start Over
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {parsed.map((item, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${item._valid ? 'bg-brand-bg border-brand-border' : 'bg-red-500/5 border-red-500/20'}`}>
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          checked={item._selected} 
                          disabled={!item._valid}
                          onChange={() => setParsed(prev => prev.map(p => p._id === i ? { ...p, _selected: !p._selected } : p))}
                          className="mt-1 w-4 h-4 accent-brand-accent"
                        />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">{item.subject} • Gr.{item.grade}</p>
                          <p className="text-sm font-bold text-brand-text mt-1">{item.question || 'MISSING QUESTION'}</p>
                          {!item._valid && <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-2 flex items-center gap-1"><AlertCircle size={8} /> Validation Errors</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleBulkImport}
                  disabled={saving || parsed.filter(p => p._selected).length === 0}
                  className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <PlusCircle size={18} />}
                  Import {parsed.filter(p => p._selected).length} Questions
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Save = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
