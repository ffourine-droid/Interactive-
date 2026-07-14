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
  Loader2,
  MessageCircle,
  Download
} from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from './Toast';

type QuestionType = 'mcq' | 'short_answer' | 'photo';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correct_option: number | null;
}

interface Student {
  id: string;
  name: string;
  parent_code?: string;
}

interface AssignmentForm {
  title: string;
  subject: string;
  grade: string;
  class_id: string;
  class_name: string;
  due_date: string;
}

interface Class {
  id: string;
  name: string;
  grade?: string;
}

export const TeacherAssignmentCreator: React.FC<{ onBack?: () => void, preSelectedClassId?: string, importCode?: string, initialData?: any }> = ({ onBack, preSelectedClassId, importCode: initialImportCode, initialData }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  // If initialImportCode is a space, it just means "show the import UI"
  const [importCode, setImportCode] = useState(initialImportCode?.trim() || '');
  const [showImport, setShowImport] = useState(!!initialImportCode);
  const [success, setSuccess] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<AssignmentForm>({
    title: '',
    subject: '',
    grade: '',
    class_id: preSelectedClassId || '',
    class_name: '',
    due_date: ''
  });
  const [questions, setQuestions] = useState<Question[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'mcq', text: '', options: ['', '', '', ''], correct_option: 0 }
  ]);

  const subjects = ['Mathematics', 'Science', 'English', 'Kiswahili', 'Social Studies'];
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  React.useEffect(() => {
    fetchClasses();
    if (initialImportCode && initialImportCode.trim().length === 6) {
      handleImport(initialImportCode.trim());
    }
    if (initialData) {
      setForm(prev => ({
        ...prev,
        title: initialData.title || '',
        subject: initialData.subject || '',
        grade: initialData.grade || '',
      }));
      if (initialData.questions) {
        setQuestions(initialData.questions.map((q: any) => ({
          id: q.id || Math.random().toString(36).substr(2, 9),
          type: q.type === 'mcq' ? 'mcq' : 'short_answer',
          text: q.text || q.question || '',
          options: q.options || ['', '', '', ''],
          correct_option: q.correct_option !== undefined ? q.correct_option : 0
        })));
      }
    }
  }, [preSelectedClassId, initialImportCode, initialData]);

  const handleImport = async (code: string) => {
    if (!code || code.length < 6) return;
    
    setImportLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('share_code', code.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setForm(prev => ({
          ...prev,
          title: data.title,
          subject: data.subject,
          grade: data.grade,
        }));
        setQuestions(data.questions);
        showToast("Assignment data loaded successfully!", "success");
        setShowImport(false);
      } else {
        showToast("Failed: Invalid code", "error");
      }
    } catch (err: any) {
      showToast("Failed: Try again later", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const fetchClasses = async () => {
    const teacherData = localStorage.getItem('azilearn_teacher');
    if (!teacherData) return;
    const teacherId = JSON.parse(teacherData).id;

    try {
      setLoading(true);
      await setTeacherConfig(teacherId);

      const { data, error } = await supabase.rpc('teacher_get_classes', {
        p_teacher_id: teacherId
      });

      if (error) {
        showToast("Failed to load classes: " + error.message, "error");
        return;
      }

      let fetchedClasses: Class[] = [];
      if (data) {
        if (Array.isArray(data)) {
          fetchedClasses = data;
        } else if (typeof data === 'object') {
          const innerArray = Object.values(data).find(v => Array.isArray(v));
          if (innerArray) {
            fetchedClasses = innerArray as Class[];
          } else if ((data as any).id) {
            fetchedClasses = [data as Class];
          }
        }
      }

      setClasses(fetchedClasses);

      // If we have a pre-selected class, initialize its data
      if (preSelectedClassId) {
        const cls = fetchedClasses.find(c => c.id === preSelectedClassId);
        if (cls) {
          handleClassSelect(preSelectedClassId, cls.name);
        }
      }
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      showToast("Error loading classes: " + (err.message || err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (classId: string, className?: string) => {
    if (!classId) {
      setForm(prev => ({ ...prev, class_id: '', class_name: '', expected_students: '' }));
      setStudents([]);
      return;
    }

    let finalClassName = className;
    if (!finalClassName) {
      const selectedClass = classes.find(c => c.id === classId);
      finalClassName = selectedClass?.name;
    }

    setForm(prev => ({
      ...prev,
      class_id: classId,
      class_name: finalClassName || prev.class_name
    }));

    if (!finalClassName && classes.length === 0) {
      return;
    }

    try {
      setLoading(true);
      const selectedClass = classes.find(c => c.id === classId);
      let grade = selectedClass?.grade;

      if (!grade) {
        const teacherData = localStorage.getItem('azilearn_teacher');
        if (teacherData) {
          const teacherId = JSON.parse(teacherData).id;
          const { data: classData } = await supabase.rpc('teacher_get_classes', {
            p_teacher_id: teacherId
          });
          let fetched: any[] = [];
          if (classData) {
            if (Array.isArray(classData)) {
              fetched = classData;
            } else if (typeof classData === 'object') {
              const innerArray = Object.values(classData).find(v => Array.isArray(v));
              if (innerArray) {
                fetched = innerArray as any[];
              } else if ((classData as any).id) {
                fetched = [classData];
              }
            }
          }
          const cls = fetched.find((c: any) => c.id === classId);
          if (cls?.grade) {
            grade = cls.grade;
          }
        }
      }

      if (grade) {
        setForm(prev => ({ ...prev, grade: grade }));
      }

      let fetchedStudents: any[] = [];
      try {
        const teacherStr = localStorage.getItem('azilearn_teacher');
        if (teacherStr) {
          const teacher = JSON.parse(teacherStr);
          const { data: rpcData, error: rpcError } = await supabase.rpc('teacher_get_class_students', {
            p_teacher_id: teacher.id,
            p_class_id: classId
          });
          
          if (rpcError) {
            console.error("RPC Error fetching students:", rpcError);
            showToast("Couldn't load students: " + rpcError.message, "error");
          } else if (rpcData && (rpcData.error || rpcData.success === false)) {
            const errMsg = rpcData.error || rpcData.message || "Unknown error";
            showToast("Couldn't load students: " + errMsg, "error");
          } else if (!rpcData) {
            showToast("Couldn't load students: Empty response from server", "error");
          } else {
            if (rpcData.success && Array.isArray(rpcData.students)) {
              fetchedStudents = rpcData.students;
            } else if (Array.isArray(rpcData)) {
              fetchedStudents = rpcData;
            } else if (typeof rpcData === 'object') {
              const innerArray = Object.values(rpcData).find(v => Array.isArray(v));
              if (innerArray) {
                fetchedStudents = innerArray as any[];
              } else if ((rpcData as any).id) {
                fetchedStudents = [rpcData];
              }
            }
          }
        }
      } catch (rpcErr) {
        console.warn("RPC fetch failed:", rpcErr);
      }

      setStudents(fetchedStudents);
    } catch (err) {
      console.error("Error in class select:", err);
      showToast("Error fetching student/class data", "error");
    } finally {
      setLoading(false);
    }
  };

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
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleOptionChange = (qId: string, optIdx: number, val: string) => {
    setQuestions(prev => prev.map(q => {
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
      showToast("Please fill in all assignment details (Title, Subject, Grade, Class and Date).", "error");
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

    const teacherData = localStorage.getItem('azilearn_teacher');
    let teacherId = '';
    
    if (teacherData) {
      try {
        teacherId = JSON.parse(teacherData).id;
      } catch (err) {}
    }

    if (!teacherId) {
      showToast("Session expired. Please login again.", "error");
      return;
    }

    setLoading(true);
    try {
      const resolvedClassId = form.class_id ? form.class_id : null;

      const { data, error } = await supabase.rpc('teacher_create_assignment', {
        p_teacher_id: teacherId,
        p_title: form.title,
        p_subject: form.subject,
        p_grade: form.grade,
        p_class_id: resolvedClassId,
        p_class_name: form.class_name,
        p_due_date: new Date(form.due_date).toISOString(),
        p_questions: questions,
        p_total_marks: 100,
        p_passing_score: 50,
        p_allow_late: false
      });

      if (error) throw error;

      const response = data || {};
      if (response.success === false) {
        throw new Error(response.message || "Failed to publish assignment");
      }

      if (response.success && response.share_code) {
        setSuccess(response.share_code);
        showToast("Assignment published successfully!", "success");
      } else {
        throw new Error("Invalid response from server");
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
        <p className="text-brand-muted font-bold mb-6 uppercase tracking-widest text-[10px]">Students can now find this assignment by searching your name</p>
        
        <div className="bg-brand-bg border border-brand-border rounded-2xl p-4 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Assignment Share Code</p>
          <div className="flex items-center justify-between bg-brand-surface border border-brand-border px-4 py-3 rounded-xl font-mono text-lg font-bold">
            <span>{success}</span>
            <button 
              onClick={copyToClipboard}
              className="p-1.5 hover:text-brand-accent transition-all text-brand-muted"
              title="Copy Share Code"
            >
              <Copy size={16} />
            </button>
          </div>
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-accent rounded-xl font-bold uppercase tracking-wider text-xs transition-all"
          >
            <Download size={16} />
            {showImport ? 'Cancel' : 'Use Code'}
          </button>
          <button 
            onClick={() => window.open('https://wa.me/254799426863?text=Hello%20Azilearn%2C%20I%20would%20like%20to%20request%20an%20assignment%20upload%20for%20my%20class.', '_blank')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md shadow-emerald-500/10 hover:scale-102 active:scale-95 transition-all"
          >
            <MessageCircle size={16} />
            Request Upload
          </button>
          <button 
            onClick={publishAssignment}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-accent text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md shadow-brand-accent/10 hover:scale-102 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Publish
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showImport && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="md:flex-1">
                <h3 className="text-lg font-black tracking-tight text-brand-accent mb-2">Import with Code</h3>
                <p className="text-sm font-bold text-brand-muted/80">Enter the code created by the admin to quickly load curated assignment questions.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <input 
                  type="text"
                  placeholder="CODE"
                  maxLength={6}
                  className="bg-brand-surface border border-brand-accent/30 rounded-xl px-6 py-4 font-black tracking-[0.2em] text-brand-accent outline-none w-full md:w-32 uppercase text-xl text-center"
                  value={importCode}
                  onChange={e => setImportCode(e.target.value)}
                />
                <button 
                  onClick={() => handleImport(importCode)}
                  disabled={importLoading || importCode.length < 6}
                  className="bg-brand-accent text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {importLoading ? <Loader2 className="animate-spin" size={20} /> : 'Load Content'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted/40 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Select Class</label>
                <div className="relative">
                  <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                  <select 
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none appearance-none focus:border-brand-accent/50 transition-all font-bold"
                    value={form.class_id}
                    onChange={e => handleClassSelect(e.target.value)}
                  >
                    <option value="">Select a Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted/40 pointer-events-none" size={18} />
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">
                  Linked Class Roll Call
                </label>
                
                {form.class_id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Directly Synced with {form.class_name}</p>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-brand-border">
                      {students.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                          <div className="flex-1 flex items-center gap-3">
                            <span className="text-[10px] font-black text-brand-accent bg-brand-accent/5 px-2 py-0.5 rounded border border-brand-accent/10 font-mono">
                              {student.parent_code || '----'}
                            </span>
                            <span className="text-sm font-bold text-brand-text">
                              {student.name}
                            </span>
                          </div>
                        </div>
                      ))}
                      {students.length === 0 && (
                        <p className="text-center py-4 text-xs font-bold text-brand-muted italic">No students in this class yet.</p>
                      )}
                    </div>

                    <div className="p-3 bg-brand-bg border border-brand-border rounded-xl text-center">
                      <p className="text-[10px] text-brand-muted font-bold">
                        Need to update this roster?
                      </p>
                      <p className="text-[9px] text-brand-muted/70 mt-0.5">
                        Classes and student rosters are managed by your school admin.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-brand-bg/50 border border-brand-border border-dashed rounded-2xl text-center">
                    <p className="text-xs text-brand-muted font-bold">Select a Class first</p>
                    <p className="text-[10px] text-brand-muted/70 mt-1">Roll call is automatically synchronized.</p>
                  </div>
                )}
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

          <div className="space-y-3">
            <AnimatePresence>
              {questions.map((q, idx) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4 relative group overflow-hidden shadow-sm"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => removeQuestion(q.id)}
                      className="p-1.5 text-red-500/40 hover:text-red-500 bg-red-500/5 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand-accent text-white rounded-lg flex items-center justify-center font-black text-xs">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-sm text-brand-text">Question {idx + 1}</span>
                    </div>
                    
                    <div className="flex bg-brand-bg p-1 rounded-xl border border-brand-border">
                      <button 
                        onClick={() => updateQuestion(q.id, { type: 'mcq' })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${q.type === 'mcq' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`}
                      >
                        <LayoutDashboard size={10} />
                        MCQ
                      </button>
                      <button 
                        onClick={() => updateQuestion(q.id, { type: 'short_answer' })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${q.type === 'short_answer' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`}
                      >
                        <Type size={10} />
                        Short
                      </button>
                      <button 
                        onClick={() => updateQuestion(q.id, { type: 'photo' })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${q.type === 'photo' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`}
                      >
                        <ImageIcon size={10} />
                        Photo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                      placeholder="Enter question text here..."
                      rows={2}
                      className="w-full bg-transparent border-none outline-none resize-none font-sans text-base font-bold placeholder:text-brand-text/10"
                      value={q.text}
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                    />

                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, optIdx) => (
                          <div 
                            key={`${q.id}-opt-${optIdx}`} 
                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${q.correct_option === optIdx ? 'bg-emerald-500/5 border-emerald-500/30 ring-2 ring-emerald-500/10' : 'bg-brand-bg/50 border-brand-border hover:border-brand-accent/30'}`}
                          >
                            <button 
                              type="button"
                              onClick={() => updateQuestion(q.id, { correct_option: optIdx })}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${q.correct_option === optIdx ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-brand-surface border border-brand-border text-transparent'}`}
                            >
                              <Check size={12} />
                            </button>
                            <input 
                              type="text"
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 bg-transparent border border-transparent focus:border-brand-accent/20 rounded-lg px-2 py-0.5 outline-none text-sm font-bold placeholder:text-brand-muted/20 transition-all"
                              value={opt}
                              onChange={e => handleOptionChange(q.id, optIdx, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'short_answer' && (
                      <div className="p-3 bg-brand-bg/30 border border-brand-border border-dashed rounded-xl flex items-center justify-center text-brand-muted/40 italic text-xs">
                        Students will type their answer here
                      </div>
                    )}

                    {q.type === 'photo' && (
                      <div className="p-5 bg-brand-bg/30 border border-brand-border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="text-brand-muted/20" size={24} />
                        <span className="text-[10px] font-bold text-brand-muted/40 uppercase tracking-widest text-center">Students will upload a photo of their work</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={addQuestion}
              className="w-full py-5 border-2 border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-brand-accent/50 hover:bg-brand-accent/5 transition-all group"
            >
              <div className="w-9 h-9 bg-brand-surface rounded-xl flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-colors">
                <Plus size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted group-hover:text-brand-accent">Add Another Question</span>
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <button 
          onClick={publishAssignment}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-accent text-white rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-brand-accent/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Publish Assignment
        </button>
      </div>
    </div>
  );
};

export default TeacherAssignmentCreator;
