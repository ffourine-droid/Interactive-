import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, 
  Save, Send, Eye, BookOpen, Clock, Users, CheckCircle2,
  HelpCircle, Type, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Question, Exam } from '../types';

interface CreateExamPageProps {
  onBack: () => void;
  onPreview?: (exam: Partial<Exam>) => void;
  initialData?: any;
  preSelectedClassId?: string;
}

export default function CreateExamPage({ onBack, initialData, preSelectedClassId }: CreateExamPageProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [teacher, setTeacher] = useState<any>(null);

    const [formData, setFormData] = useState({
    title: initialData?.title || '',
    subject: initialData?.subject || 'Mathematics',
    grade: initialData?.grade || 'Grade 6',
    duration: initialData?.duration_minutes || 30,
    instructions: '',
    classId: preSelectedClassId || '',
    isPrebuilt: false
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialData?.questions) {
      return initialData.questions.map((q: any, i: number) => ({
        index: i,
        type: q.type === 'mcq' ? 'mcq' : 'short_answer',
        question: q.text || q.question || '',
        options: q.options || (q.type === 'mcq' ? ['', '', '', ''] : undefined),
        correct_answer: q.correct_option !== undefined ? String(q.correct_option) : (q.correct_answer || ''),
        marks: q.marks || (q.type === 'mcq' ? 2 : 4)
      }));
    }
    return [];
  });

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

      // Set the teacher_id session config inside Postgres before running queries/RPCs
      await setTeacherConfig(teacherData.id);

      let fetchedClasses: any[] = [];
      try {
        const { data, error } = await supabase.rpc('teacher_get_classes', {
          p_teacher_id: teacherData.id
        });
        if (!error && data) {
          if (Array.isArray(data)) {
            fetchedClasses = data;
          } else if (typeof data === 'object') {
            const innerArray = Object.values(data).find(v => Array.isArray(v));
            if (innerArray) {
              fetchedClasses = innerArray as any[];
            } else if ((data as any).id) {
              fetchedClasses = [data];
            }
          }
        }
      } catch (rpcErr) {
        console.warn("RPC fetch failed, using fallback:", rpcErr);
      }

      if (!fetchedClasses || fetchedClasses.length === 0) {
        try {
          const { data: subjectClasses, error: tsError } = await supabase
            .from('teacher_subjects')
            .select('class_id')
            .eq('teacher_id', teacherData.id);

          if (!tsError && subjectClasses && subjectClasses.length > 0) {
            const classIds = subjectClasses.map((sc: any) => sc.class_id);
            const { data: dbData, error: dbError } = await supabase
              .from('classes')
              .select('id, name, grade')
              .in('id', classIds);
            if (!dbError && dbData) {
              fetchedClasses = dbData;
            }
          }
        } catch (dbErr) {
          console.error("Direct classes query fallback failed:", dbErr);
        }
      }

      // Add local classes if any
      try {
        const localClassesRaw = localStorage.getItem(`local_classes_${teacherData.id}`);
        if (localClassesRaw) {
          const localClasses = JSON.parse(localClassesRaw);
          fetchedClasses = [...fetchedClasses, ...localClasses];
        }
      } catch (localErr) {
        console.error("Failed to parse local classes:", localErr);
      }

      let filteredClasses = fetchedClasses;
      try {
        const { data: subjectClasses, error: tsError } = await supabase
          .from('teacher_subjects')
          .select('class_id')
          .eq('teacher_id', teacherData.id);

        if (!tsError && subjectClasses && subjectClasses.length > 0) {
          const classIds = subjectClasses.map((sc: any) => sc.class_id);
          filteredClasses = fetchedClasses.filter((c: any) => c.is_local || classIds.includes(c.id));
        } else if (!tsError && subjectClasses && subjectClasses.length === 0) {
          filteredClasses = fetchedClasses.filter((c: any) => c.is_local);
        }
      } catch (tsErr) {
        console.error("Failed to filter classes by teacher_subjects:", tsErr);
      }

      setClasses(filteredClasses);
      if (filteredClasses && filteredClasses.length > 0) {
        const defaultClass = preSelectedClassId ? filteredClasses.find(c => c.id === preSelectedClassId) : filteredClasses[0];
        const finalClassId = defaultClass?.id || filteredClasses[0].id;
        const finalGrade = defaultClass?.grade || filteredClasses[0].grade || formData.grade;
        
        setFormData(prev => ({ 
          ...prev, 
          classId: finalClassId,
          grade: finalGrade
        }));
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

  const handleClassChange = (classId: string) => {
    const selectedClass = classes.find(c => c.id === classId);
    setFormData(prev => ({ 
      ...prev, 
      classId,
      grade: selectedClass?.grade || prev.grade
    }));
  };

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const generateShareCode = (schoolName: string, className: string, subject: string) => {
    // School Code (first 3-4 chars)
    const schoolPart = schoolName.replace(/\s+/g, '').substring(0, 4).toUpperCase() || 'AZI';
    
    // Class/Subject Code
    const classPart = className 
      ? className.replace(/\s+/g, '').substring(0, 4).toUpperCase() 
      : subject.substring(0, 3).toUpperCase() || 'GEN';
    
    // Random 4 chars
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `${schoolPart}-${classPart}-${randomPart}`;
  };

  const handleSave = async (isPublished: boolean) => {
    if (!formData.title) {
      showToast('Please enter an assessment title', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('Please add at least one question', 'error');
      return;
    }

    setLoading(true);
    try {
      // Get class name if needed for code generation
      let className = '';
      if (formData.classId) {
        const targetClass = classes.find(c => c.id === formData.classId);
        className = targetClass ? targetClass.name : '';
      }

      const shareCode = isPublished 
        ? generateShareCode(teacher?.school_name || 'AZI', className, formData.subject)
        : null;

      // Prepare exam data
      const examData: any = {
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        duration_minutes: formData.duration,
        instructions: formData.instructions,
        class_id: formData.classId || null,
        questions: questions,
        is_prebuilt: formData.isPrebuilt,
        is_published: isPublished,
        share_code: shareCode
      };

      // Only add created_by if teacher exists
      if (teacher && teacher.id) {
        examData.created_by = teacher.id;
      }

      // If we're editing an existing exam (has is_published property), use its ID for upsert
      // If it's an import from admin_assignments, we want a NEW record in the exams table.
      if (initialData?.id && initialData?.hasOwnProperty('is_published')) {
        examData.id = initialData.id;
      }

      const { error } = await supabase
        .from('exams')
        .upsert(examData);

      if (error) throw error;

      showToast(isPublished ? 'Assessment published!' : 'Assessment saved as draft', 'success');
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to save assessment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans text-brand-text">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-accent/20 blur-[150px] transform translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-brand-accent/10 blur-[150px] transform -translate-x-1/2" />
      </div>

      {/* Header */}
      <div className="bg-white/90 dark:bg-brand-card/90 backdrop-blur-2xl border-b border-brand-border sticky top-0 z-50 p-4 shrink-0 transition-colors">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center bg-brand-bg hover:bg-brand-accent/5 border border-brand-border rounded-xl transition-all active:scale-95 group focus:ring-2 focus:ring-brand-accent/20"
            >
              <ArrowLeft size={18} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
            </button>
            <div className="hidden sm:block">
              <h1 className="font-black text-xl text-brand-text leading-none uppercase tracking-tighter">ASSESSMENT ARCHITECT</h1>
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mt-1">Professional Assessment Builder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-6 py-2.5 text-brand-muted hover:text-brand-accent font-black text-[10px] uppercase tracking-widest transition-all hover:bg-brand-accent/5 rounded-xl border border-transparent hover:border-brand-accent/10"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="flex items-center gap-2 bg-brand-accent px-6 py-3 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-brand-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span>Publish Assessment</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar: Settings */}
          <aside className="lg:col-span-4 space-y-6 sticky lg:top-24">
            <section className="bg-white dark:bg-brand-card rounded-[2.5rem] p-8 border border-brand-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent" />
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] font-black text-brand-accent uppercase tracking-[0.25em] flex items-center gap-2">
                  <Save size={14} />
                  Configuration
                </h2>
                <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest opacity-40 italic">#v2.0</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-brand-muted uppercase tracking-[0.15em] opacity-60">Assessment Title</label>
                  <input 
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. End of Term Assessment"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3.5 text-sm font-bold focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/5 outline-none transition-all placeholder:text-brand-muted/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-brand-muted uppercase tracking-[0.15em] opacity-60">Field/Subject</label>
                    <div className="relative">
                      <select 
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3.5 text-sm font-bold appearance-none outline-none focus:border-brand-accent transition-all cursor-pointer"
                      >
                        {['Mathematics', 'English', 'Science', 'Social Studies', 'Agriculture', 'CRE', 'Arts', 'Business'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-brand-muted uppercase tracking-[0.15em] opacity-60">Target Grade</label>
                    <div className="relative">
                      <select 
                        value={formData.grade}
                        onChange={e => setFormData({ ...formData, grade: e.target.value })}
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3.5 text-sm font-bold appearance-none outline-none focus:border-brand-accent transition-all cursor-pointer"
                      >
                        {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-brand-muted uppercase tracking-[0.15em] opacity-60">Timer (Minutes)</label>
                  <div className="relative group/input">
                    <input 
                      type="number"
                      value={isNaN(formData.duration) ? '' : formData.duration}
                      onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3.5 text-sm font-bold focus:border-brand-accent outline-none transition-all pl-12"
                    />
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/30 group-focus-within/input:text-brand-accent transition-colors" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-brand-muted uppercase tracking-[0.15em] opacity-60">Class Assignment</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/30" size={18} />
                    <select 
                      value={formData.classId}
                      onChange={e => handleClassChange(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-12 py-3.5 text-sm font-bold appearance-none outline-none focus:border-brand-accent transition-all cursor-pointer"
                    >
                      <option value="">Public Prebuilt</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-brand-muted uppercase tracking-[0.15em] opacity-60">Core Instructions</label>
                  <textarea 
                    value={formData.instructions}
                    onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Enter directives for students..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3.5 text-sm font-bold focus:border-brand-accent outline-none transition-all h-32 resize-none shadow-inner"
                  />
                </div>
              </div>
            </section>

            <section className="bg-brand-text dark:bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-brand-text/20 dark:shadow-white/5 transition-colors">
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 dark:text-brand-text/40">Real-time Metrics</p>
                     <div className="flex gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-brand-accent" />
                        <div className="w-1 h-1 rounded-full bg-brand-accent opacity-50" />
                        <div className="w-1 h-1 rounded-full bg-brand-accent opacity-20" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-1">
                        <p className="text-4xl font-black text-white dark:text-brand-text tracking-tighter tabular-nums leading-none">{questions.length}</p>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 dark:text-brand-text/40">Total Items</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-4xl font-black text-brand-accent tracking-tighter tabular-nums leading-none">{totalMarks}</p>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 dark:text-brand-text/40">Weighting</p>
                     </div>
                  </div>
               </div>
            </section>
          </aside>

          {/* Main Question Editor */}
          <main className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-brand-border">
               <h2 className="text-[11px] font-black text-brand-text uppercase tracking-[0.4em] flex items-center gap-4">
                  <BookOpen size={16} className="text-brand-accent" />
                  Assessment Canvas
               </h2>
               <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2">
                     <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest opacity-60">Layout Mode:</span>
                     <div className="px-2 py-0.5 bg-brand-accent text-white rounded text-[8px] font-black uppercase tracking-tighter">Structured</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => addQuestion('mcq')}
                      className="p-2 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white rounded-lg transition-all flex items-center gap-2"
                      title="Add Multiple Choice"
                    >
                      <List size={14} />
                      <span className="text-[9px] font-black uppercase tracking-tighter sm:inline hidden">Add MCQ</span>
                    </button>
                    <button 
                      onClick={() => addQuestion('short_answer')}
                      className="p-2 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white rounded-lg transition-all flex items-center gap-2"
                      title="Add Short Answer"
                    >
                      <Type size={14} />
                      <span className="text-[9px] font-black uppercase tracking-tighter sm:inline hidden">Add Written</span>
                    </button>
                  </div>
               </div>
            </div>

            <AnimatePresence mode="popLayout">
              {questions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/40 dark:bg-brand-card/40 border-2 border-dashed border-brand-border rounded-[3rem] py-24 flex flex-col items-center justify-center text-center space-y-8"
                >
                   <div className="w-20 h-20 rounded-[2.5rem] bg-brand-accent/5 flex items-center justify-center text-brand-accent opacity-30 animate-pulse">
                      <BookOpen size={40} />
                   </div>
                   <div className="space-y-2">
                      <p className="font-black text-lg text-brand-text tracking-tight uppercase">Your Canvas is empty</p>
                      <p className="text-xs font-bold text-brand-muted max-w-[280px] mx-auto leading-relaxed">Select an assessment type to start writing your questions.</p>
                   </div>
                   
                   <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-8">
                      <button
                        onClick={() => addQuestion('mcq')}
                        className="flex-1 flex items-center justify-center gap-3 bg-brand-text dark:bg-white text-white dark:text-brand-text px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                      >
                        <List size={16} />
                        <span>Add MCQ Question</span>
                      </button>
                      <button
                        onClick={() => addQuestion('short_answer')}
                        className="flex-1 flex items-center justify-center gap-3 bg-brand-accent text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-accent/20"
                      >
                        <Type size={16} />
                        <span>Add Short Answer</span>
                      </button>
                   </div>
                </motion.div>
              ) : (
                <div className="space-y-8 pb-20">
                  {questions.map((q, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30, scale: 0.9 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="bg-white dark:bg-brand-card rounded-[3.5rem] p-10 border border-brand-border shadow-2xl shadow-brand-accent/5 group relative transition-all hover:shadow-brand-accent/10 focus-within:ring-4 focus-within:ring-brand-accent/5"
                    >
                      {/* Action Bar */}
                      <div className="absolute top-8 right-8 flex flex-col gap-2 items-end sm:opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <div className="flex gap-1.5 p-1.5 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-xl">
                          <button onClick={() => moveQuestion(idx, 'up')} className="w-8 h-8 flex items-center justify-center hover:bg-brand-accent hover:text-white rounded-lg transition-all"><ChevronUp size={16}/></button>
                          <button onClick={() => moveQuestion(idx, 'down')} className="w-8 h-8 flex items-center justify-center hover:bg-brand-accent hover:text-white rounded-lg transition-all"><ChevronDown size={16}/></button>
                        </div>
                        <button onClick={() => removeQuestion(idx)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg shadow-red-500/5">
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-8 items-start">
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-16 h-16 rounded-[2rem] bg-brand-text text-white flex items-center justify-center font-black text-2xl tracking-tighter shadow-xl shadow-brand-text/30 group-hover:bg-brand-accent group-hover:shadow-brand-accent/30 transition-all duration-500">
                              {idx + 1}
                           </div>
                           <div className="w-1 h-32 rounded-full bg-gradient-to-bottom from-brand-border to-transparent opacity-50" />
                        </div>
                        
                        <div className="flex-1 space-y-8 w-full">
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                               <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${q.type === 'mcq' ? 'bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                                  {q.type === 'mcq' ? 'Multiple Choice' : 'Free Response'}
                               </span>
                               <div className="h-4 w-px bg-brand-border" />
                               <div className="flex items-center gap-2 bg-brand-bg px-4 py-1.5 rounded-full border border-brand-border group/marks focus-within:border-brand-accent transition-colors">
                                  <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest opacity-60">Value:</span>
                                  <input 
                                    type="number"
                                    value={isNaN(q.marks) ? '' : q.marks}
                                    onChange={e => updateQuestion(idx, { marks: parseInt(e.target.value) || 0 })}
                                    className="w-12 bg-transparent font-black text-sm text-brand-accent focus:ring-0 text-center p-0 outline-none"
                                  />
                               </div>
                            </div>
                            <textarea 
                              value={q.question}
                              onChange={e => updateQuestion(idx, { question: e.target.value })}
                              placeholder="Type your question here..."
                              className="w-full font-black text-xl sm:text-2xl text-brand-text bg-brand-bg/20 hover:bg-brand-bg/40 focus:bg-brand-bg/60 border border-transparent focus:border-brand-accent/30 rounded-2xl px-4 py-3 focus:ring-0 placeholder:text-brand-muted/20 tracking-tight transition-all min-h-[100px]"
                              rows={2}
                            />
                          </div>

                          <div className="relative">
                            <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-brand-accent/10" />
                            
                            {q.type === 'mcq' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {q.options?.map((opt, oIdx) => {
                                  const isActive = q.correct_answer === opt && opt !== '';
                                  return (
                                    <div key={oIdx} className={`group/opt flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isActive ? 'bg-emerald-500/5 border-emerald-500/40 shadow-xl shadow-emerald-500/5' : 'bg-brand-bg/30 border-transparent hover:border-brand-accent/20'}`}>
                                      <button 
                                        onClick={() => updateQuestion(idx, { correct_answer: opt })}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all border-2 ${
                                          isActive 
                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/40' 
                                            : 'bg-white border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + oIdx)}
                                      </button>
                                      <input 
                                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                        value={opt}
                                        onChange={e => updateOption(idx, oIdx, e.target.value)}
                                        className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder:text-brand-muted/30"
                                      />
                                      {isActive && <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="bg-brand-bg/50 border border-brand-border border-dashed rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <CheckCircle2 size={16} />
                                  </div>
                                  <h4 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">Solution Guide / Key Phrases</h4>
                                </div>
                                <textarea 
                                  value={q.correct_answer}
                                  onChange={e => updateQuestion(idx, { correct_answer: e.target.value })}
                                  placeholder="Provide the benchmark answer for grading comparisons..."
                                  className="w-full bg-white dark:bg-brand-card border border-brand-border rounded-2xl px-6 py-4 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-brand-muted/20 min-h-[100px] resize-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Bottom Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-12 border-t border-brand-border">
              <button
                onClick={() => addQuestion('mcq')}
                className="group relative flex flex-col items-center justify-center gap-6 py-12 bg-white dark:bg-brand-card border-2 border-dashed border-brand-border rounded-[4rem] hover:border-brand-accent hover:bg-brand-accent/5 transition-all duration-300 active:scale-95 shadow-xl shadow-brand-accent/5"
              >
                <div className="w-20 h-20 rounded-[2.5rem] bg-brand-accent/10 flex items-center justify-center text-brand-accent group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl shadow-brand-accent/20">
                  <List size={32} />
                </div>
                <div className="text-center space-y-2">
                   <h3 className="font-black text-lg text-brand-text tracking-tight uppercase leading-none">Objective MCQ</h3>
                   <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest opacity-60">Auto-graded assessment item</p>
                </div>
                {/* Visual hint */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus className="text-brand-accent animate-bounce" size={24} />
                </div>
              </button>
              
              <button
                onClick={() => addQuestion('short_answer')}
                className="group relative flex flex-col items-center justify-center gap-6 py-12 bg-white dark:bg-brand-card border-2 border-dashed border-brand-border rounded-[4rem] hover:border-brand-accent hover:bg-brand-accent/5 transition-all duration-300 active:scale-95 shadow-xl shadow-brand-accent/5"
              >
                <div className="w-20 h-20 rounded-[2.5rem] bg-brand-accent/10 flex items-center justify-center text-brand-accent group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 shadow-2xl shadow-brand-accent/20">
                  <Type size={32} />
                </div>
                <div className="text-center space-y-2">
                   <h3 className="font-black text-lg text-brand-text tracking-tight uppercase leading-none">Free Response</h3>
                   <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest opacity-60">Written subjective assessment</p>
                </div>
                {/* Visual hint */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus className="text-brand-accent animate-bounce" size={24} />
                </div>
              </button>
            </div>

            <footer className="py-20 text-center space-y-6">
               <div className="flex items-center justify-center gap-6">
                  <div className="w-px h-12 bg-gradient-to-bottom from-transparent via-brand-border to-transparent" />
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.6em]">BUILDING THE FUTURE OF EDUCATION</p>
                  <div className="w-px h-12 bg-gradient-to-bottom from-transparent via-brand-border to-transparent" />
               </div>
               <div className="flex items-center justify-center gap-4">
                  <div className="px-3 py-1 rounded-full border border-brand-border bg-white text-[9px] font-black uppercase text-brand-muted">Secure-Lock v2.1</div>
                  <div className="px-3 py-1 rounded-full border border-brand-accent/20 bg-brand-accent/5 text-[9px] font-black uppercase text-brand-accent tracking-widest">Teacher Certified</div>
               </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
