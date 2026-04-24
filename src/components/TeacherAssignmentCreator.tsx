import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ChevronDown, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Layout, 
  Save, 
  X, 
  Copy,
  LayoutDashboard,
  Check,
  Image as ImageIcon,
  Type,
  FileText,
  Clock,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

type QuestionType = 'mcq' | 'short_answer' | 'photo';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correct_option: number | null;
}

interface AssignmentForm {
  title: string;
  subject: string;
  grade: string;
  class_name: string;
  due_date: string;
  expected_students: string;
}

export const TeacherAssignmentCreator: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm>({
    title: '',
    subject: '',
    grade: '',
    class_name: '',
    due_date: '',
    expected_students: ''
  });
  const [questions, setQuestions] = useState<Question[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'mcq', text: '', options: ['', '', '', ''], correct_option: 0 }
  ]);

  const subjects = ['Mathematics', 'Science', 'English', 'Kiswahili', 'Social Studies'];
  const grades = ['6', '7', '8', '9'];

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: Math.random().toString(36).substr(2, 9), type: 'mcq', text: '', options: ['', '', '', ''], correct_option: 0 }
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) {
      showToast("You must have at least one question.", "info");
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleOptionChange = (qId: string, optIdx: number, val: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optIdx] = val;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const validateForm = () => {
    if (!form.title || !form.subject || !form.grade || !form.class_name || !form.due_date) {
      showToast("Please fill in all assignment details.", "error");
      return false;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        showToast("Please provide text for all questions.", "error");
        return false;
      }
      if (q.type === 'mcq') {
        if (q.options.some(opt => !opt.trim())) {
          showToast("Please fill in all options for MCQ questions.", "error");
          return false;
        }
      }
    }
    return true;
  };

  const publishAssignment = async () => {
    if (!validateForm()) return;

    let teacherId = localStorage.getItem('azilearn_teacher_id');
    if (!teacherId) {
      teacherId = 'teacher_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('azilearn_teacher_id', teacherId);
    }

    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          teacher_id: teacherId,
          title: form.title,
          subject: form.subject,
          grade: `Grade ${form.grade}`,
          class_name: form.class_name,
          due_date: new Date(form.due_date).toISOString(),
          questions: questions,
          expected_students: form.expected_students.split(',').map(s => s.trim()).filter(s => s !== ''),
          short_code: shortCode
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSuccess(data.short_code || shortCode);
        showToast("Assignment published successfully!", "success");
      }
    } catch (err: any) {
      console.error('Publish error:', err);
      showToast("Failed to publish assignment: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (success) {
      navigator.clipboard.writeText(success);
      showToast("Assignment code copied!", "success");
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-brand-surface border border-brand-border rounded-[2.5rem] p-10 text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="text-emerald-500" size={40} />
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-2">Published!</h2>
        <p className="text-brand-muted font-bold mb-8 uppercase tracking-widest text-[10px]">Share this code with your students</p>
        
        <div className="bg-brand-bg/50 border border-brand-border rounded-2xl p-6 mb-8 flex items-center justify-between group overflow-hidden relative">
          <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-4xl font-black tracking-[0.2em] text-brand-accent">{success}</span>
          <button 
            onClick={copyToClipboard}
            className="p-3 bg-brand-accent text-white rounded-xl active:scale-90 transition-transform shadow-lg shadow-brand-accent/20"
          >
            <Copy size={20} />
          </button>
        </div>

        <button 
          onClick={onBack}
          className="w-full bg-brand-bg border border-brand-border text-brand-text py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-surface transition-all"
        >
          Return to Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-brand-accent transition-all"
          >
            <X size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 px-2 bg-brand-accent/10 rounded-md">
                <span className="text-[10px] font-black tracking-widest text-brand-accent uppercase">Teacher Mode</span>
              </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Create Assignment</h1>
          </div>
        </div>
        <button 
          onClick={publishAssignment}
          disabled={loading}
          className="hidden md:flex items-center gap-2 px-8 py-4 bg-brand-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Publish
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 space-y-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
              <LayoutDashboard size={14} />
              Assignment Info
            </h2>
            
            <div className="space-y-4">
              <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2 group-focus-within:text-brand-accent transition-colors">Assignment Title</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                  <input 
                    type="text"
                    placeholder="e.g. Weekly Math Quiz"
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5 transition-all font-bold"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Subject</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                    <select 
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none appearance-none focus:border-brand-accent/50 transition-all font-bold"
                      value={form.subject}
                      onChange={e => setForm({...form, subject: e.target.value})}
                    >
                      <option value="">Select</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted/40 pointer-events-none" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Grade</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                    <select 
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none appearance-none focus:border-brand-accent/50 transition-all font-bold"
                      value={form.grade}
                      onChange={e => setForm({...form, grade: e.target.value})}
                    >
                      <option value="">Select</option>
                      {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted/40 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Class Name</label>
                <div className="relative">
                  <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                  <input 
                    type="text"
                    placeholder="e.g. Grade 7B"
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                    value={form.class_name}
                    onChange={e => setForm({...form, class_name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                  <input 
                    type="date"
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                    value={form.due_date}
                    onChange={e => setForm({...form, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Class Roll Call (Optional)</label>
                <div className="relative">
                  <textarea 
                    placeholder="e.g. John Kamau, Sarah Wambui, Kevin Otieno"
                    rows={3}
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm resize-none"
                    value={form.expected_students}
                    onChange={e => setForm({...form, expected_students: e.target.value})}
                  />
                  <p className="text-[10px] text-brand-muted/60 mt-1 ml-1 italic">Enter student names separated by commas to track attendance.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted">Questions Builder ({questions.length})</h2>
            <button 
              onClick={addQuestion}
              className="flex items-center gap-2 text-brand-accent font-black tracking-widest text-[10px] uppercase hover:opacity-80 transition-opacity"
            >
              <Plus size={14} />
              Add Question
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {questions.map((q, idx) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-brand-surface border border-brand-border rounded-3xl p-8 space-y-6 relative group overflow-hidden shadow-sm"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => removeQuestion(q.id)}
                      className="p-2 text-red-500/40 hover:text-red-500 bg-red-500/5 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-accent text-white rounded-lg flex items-center justify-center font-black text-sm">
                        {idx + 1}
                      </div>
                      <span className="font-bold">Question {idx + 1}</span>
                    </div>
                    
                    <div className="flex bg-brand-bg p-1 rounded-2xl border border-brand-border">
                      <button 
                        onClick={() => updateQuestion(q.id, { type: 'mcq' })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${q.type === 'mcq' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`}
                      >
                        <LayoutDashboard size={12} />
                        MCQ
                      </button>
                      <button 
                        onClick={() => updateQuestion(q.id, { type: 'short_answer' })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${q.type === 'short_answer' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`}
                      >
                        <Type size={12} />
                        Short
                      </button>
                      <button 
                        onClick={() => updateQuestion(q.id, { type: 'photo' })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${q.type === 'photo' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`}
                      >
                        <ImageIcon size={12} />
                        Photo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <textarea 
                      placeholder="Enter question text here..."
                      rows={3}
                      className="w-full bg-transparent border-none outline-none resize-none font-sans text-lg font-bold placeholder:text-brand-text/10"
                      value={q.text}
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                    />

                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {q.options.map((opt, optIdx) => (
                          <div 
                            key={optIdx} 
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${q.correct_option === optIdx ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-brand-bg/50 border-brand-border'}`}
                          >
                            <button 
                              onClick={() => updateQuestion(q.id, { correct_option: optIdx })}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${q.correct_option === optIdx ? 'bg-emerald-500 text-white' : 'bg-brand-surface border border-brand-border'}`}
                            >
                              {q.correct_option === optIdx && <Check size={14} />}
                            </button>
                            <input 
                              type="text"
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 bg-transparent border-none outline-none font-bold placeholder:text-brand-muted/20"
                              value={opt}
                              onChange={e => handleOptionChange(q.id, optIdx, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'short_answer' && (
                      <div className="p-4 bg-brand-bg/30 border border-brand-border border-dashed rounded-2xl flex items-center justify-center text-brand-muted/40 italic text-sm">
                        Students will type their answer here
                      </div>
                    )}

                    {q.type === 'photo' && (
                      <div className="p-8 bg-brand-bg/30 border border-brand-border border-dashed rounded-3xl flex flex-col items-center justify-center gap-3">
                        <ImageIcon className="text-brand-muted/20" size={32} />
                        <span className="text-xs font-bold text-brand-muted/40 uppercase tracking-widest text-center">Students will upload a photo of their work</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={addQuestion}
              className="w-full py-8 border-2 border-dashed border-brand-border rounded-[2.5rem] flex flex-col items-center justify-center gap-2 hover:border-brand-accent/50 hover:bg-brand-accent/5 transition-all group"
            >
              <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted group-hover:text-brand-accent">Add Another Question</span>
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <button 
          onClick={publishAssignment}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-5 bg-brand-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-brand-accent/40 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Publish Assignment
        </button>
      </div>
    </div>
  );
};

export default TeacherAssignmentCreator;
