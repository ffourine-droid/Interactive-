import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, 
  Save, Send, Eye, BookOpen, Clock, Users, CheckCircle2,
  HelpCircle, Type, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Question, Exam } from '../types';

interface CreateExamPageProps {
  onBack: () => void;
  onPreview?: (exam: Partial<Exam>) => void;
}

export default function CreateExamPage({ onBack }: CreateExamPageProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [teacher, setTeacher] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    subject: 'Mathematics',
    grade: 'Grade 6',
    duration: 30,
    instructions: '',
    classId: '',
    isPrebuilt: false
  });

  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchTeacherAndClasses();
  }, []);

  const fetchTeacherAndClasses = async () => {
    try {
      const teacherStr = localStorage.getItem('azilearn_teacher');
      if (!teacherStr) {
        onBack();
        return;
      }
      const teacherData = JSON.parse(teacherStr);
      setTeacher(teacherData);

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacherData.id);

      if (error) throw error;
      setClasses(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, classId: data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const addQuestion = (type: 'mcq' | 'short_answer') => {
    const newQuestion: Question = {
      index: questions.length,
      type,
      question: '',
      options: type === 'mcq' ? ['', '', '', ''] : undefined,
      correct_answer: '',
      marks: type === 'mcq' ? 2 : 4
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const filtered = questions.filter((_, i) => i !== index);
    const updated = filtered.map((q, i) => ({ ...q, index: i }));
    setQuestions(updated);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    setQuestions(updated.map((q, i) => ({ ...q, index: i })));
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions(questions.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[qIndex].options) {
      updatedQuestions[qIndex].options![oIndex] = value;
      setQuestions(updatedQuestions);
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  const handleSave = async (isPublished: boolean) => {
    if (!formData.title) {
      showToast('Please enter an exam title', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('Please add at least one question', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('exams')
        .insert({
          title: formData.title,
          subject: formData.subject,
          grade: formData.grade,
          duration_minutes: formData.duration,
          instructions: formData.instructions,
          class_id: formData.classId || null,
          questions: questions,
          created_by: teacher.id,
          is_prebuilt: formData.isPrebuilt,
          is_published: isPublished
        });

      if (error) throw error;

      showToast(isPublished ? 'Exam published!' : 'Exam saved as draft', 'success');
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to save exam', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-brand-card/80 backdrop-blur-xl border-b border-brand-accent/10 sticky top-0 z-50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center hover:bg-brand-accent/10 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-brand-accent" />
            </button>
            <h1 className="font-sans font-bold text-xl text-brand-text">Create Exam</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-brand-muted hover:text-brand-text font-bold text-xs transition-colors"
            >
              <Save size={16} />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="flex items-center gap-2 bg-brand-accent px-4 py-2 rounded-xl text-white font-bold text-xs shadow-lg shadow-brand-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Send size={16} />
              <span>Publish Exam</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Info */}
          <section className="bg-white dark:bg-brand-card rounded-3xl p-6 border border-brand-accent/5 shadow-xl shadow-brand-accent/5">
            <h2 className="text-xs font-black text-brand-accent uppercase tracking-widest mb-4 flex items-center gap-2">
              <BookOpen size={14} />
              Exam Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Exam Title</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. End of Term Mathematics Exam"
                  className="w-full bg-brand-bg border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Subject</label>
                <select 
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-brand-bg border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
                >
                  {['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'Agriculture', 'CRE', 'Creative Arts', 'Business Studies'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Grade</label>
                <select 
                  value={formData.grade}
                  onChange={e => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full bg-brand-bg border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
                >
                  {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Duration (Minutes)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-bg border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted/30" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Assign to Class</label>
                <div className="relative">
                  <select 
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full bg-brand-bg border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
                  >
                    <option value="">No Class (Public Prebuilt)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Users className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted/30" size={16} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Instructions (Optional)</label>
                <textarea 
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="e.g. Read each question carefully. You must answer all questions."
                  className="w-full bg-brand-bg border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all h-24 resize-none"
                />
              </div>
              {/* Admin toggle - Simplified for now */}
              {(teacher?.email?.includes('admin') || teacher?.email?.includes('azilearn')) && (
                <div className="md:col-span-2 flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="isPrebuilt"
                    checked={formData.isPrebuilt}
                    onChange={e => setFormData({ ...formData, isPrebuilt: e.target.checked })}
                    className="accent-brand-accent"
                  />
                  <label htmlFor="isPrebuilt" className="text-xs font-bold text-brand-muted">Mark as Prebuilt Exam (Visible to all students)</label>
                </div>
              )}
            </div>
          </section>

          {/* Question Builder */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-brand-accent uppercase tracking-widest flex items-center gap-2">
                <HelpCircle size={14} />
                Exam Questions ({questions.length})
              </h2>
              <div className="p-2 bg-brand-accent/5 rounded-lg border border-brand-accent/10">
                <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Total Marks: {totalMarks}</span>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {questions.map((q, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-brand-card rounded-3xl p-6 border border-brand-accent/5 shadow-lg group relative"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-accent/10 flex items-center justify-center font-black text-brand-accent text-xs">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">
                          {q.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                        </span>
                        <input 
                          type="text"
                          value={q.question}
                          onChange={e => updateQuestion(idx, { question: e.target.value })}
                          placeholder="Type your question here..."
                          className="font-bold text-sm bg-transparent border-none focus:ring-0 p-0 w-full placeholder:text-brand-muted/30"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveQuestion(idx, 'up')} className="p-2 hover:bg-brand-bg rounded-lg text-brand-muted transition-colors"><ChevronUp size={16}/></button>
                      <button onClick={() => moveQuestion(idx, 'down')} className="p-2 hover:bg-brand-bg rounded-lg text-brand-muted transition-colors"><ChevronDown size={16}/></button>
                      <button onClick={() => removeQuestion(idx)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>

                  {q.type === 'mcq' ? (
                    <div className="space-y-3 ml-11">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options?.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3 group/opt">
                            <button 
                              onClick={() => updateQuestion(idx, { correct_answer: opt })}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                q.correct_answer === opt && opt !== '' 
                                  ? 'border-green-500 bg-green-500 text-white' 
                                  : 'border-brand-accent/20'
                              }`}
                            >
                              {q.correct_answer === opt && opt !== '' && <CheckCircle2 size={12} />}
                            </button>
                            <input 
                              placeholder={`Option ${oIdx + 1}`}
                              value={opt}
                              onChange={e => updateOption(idx, oIdx, e.target.value)}
                              className="flex-1 bg-brand-bg border-none rounded-xl p-2 text-xs focus:ring-1 focus:ring-brand-accent/30 outline-none transition-all"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 ml-11">
                      <label className="block text-[8px] font-black text-brand-muted uppercase tracking-widest mb-1">Correct Answer</label>
                      <input 
                        type="text"
                        value={q.correct_answer}
                        onChange={e => updateQuestion(idx, { correct_answer: e.target.value })}
                        placeholder="Expected answer..."
                        className="w-full bg-brand-bg border-none rounded-xl p-3 text-xs focus:ring-1 focus:ring-brand-accent/30 outline-none transition-all"
                      />
                    </div>
                  )}

                  <div className="mt-4 ml-11 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <label className="text-[10px] font-bold text-brand-muted">Marks:</label>
                       <input 
                        type="number"
                        value={q.marks}
                        onChange={e => updateQuestion(idx, { marks: parseInt(e.target.value) || 0 })}
                        className="w-16 bg-brand-bg border-none rounded-lg p-1 text-center font-bold text-xs focus:ring-1 focus:ring-brand-accent/30 outline-none"
                       />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => addQuestion('mcq')}
                className="flex items-center justify-center gap-3 p-6 bg-white dark:bg-brand-card border-2 border-dashed border-brand-accent/20 rounded-3xl text-brand-muted hover:border-brand-accent/50 hover:text-brand-accent transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-brand-accent/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <List size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Add MCQ</p>
                  <p className="text-[10px]">Multiple choice question</p>
                </div>
              </button>
              <button
                onClick={() => addQuestion('short_answer')}
                className="flex items-center justify-center gap-3 p-6 bg-white dark:bg-brand-card border-2 border-dashed border-brand-accent/20 rounded-3xl text-brand-muted hover:border-brand-accent/50 hover:text-brand-accent transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-brand-accent/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Type size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Add Short Answer</p>
                  <p className="text-[10px]">Written response question</p>
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
