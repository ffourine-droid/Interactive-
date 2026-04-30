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
  Loader2,
  MessageCircle,
  Download,
  ClipboardList
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
  expected_students: string; // Keep this for backward compatibility and manual entry
}

interface Class {
  id: string;
  name: string;
}

export const TeacherAssignmentCreator: React.FC<{ onBack?: () => void, preSelectedClassId?: string, importCode?: string }> = ({ onBack, preSelectedClassId, importCode: initialImportCode }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  // If initialImportCode is a space, it just means "show the import UI"
  const [importCode, setImportCode] = useState(initialImportCode?.trim() || '');
  const [showImport, setShowImport] = useState(!!initialImportCode);
  const [success, setSuccess] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [form, setForm] = useState<AssignmentForm>({
    title: '',
    subject: '',
    grade: '',
    class_id: preSelectedClassId || '',
    class_name: '',
    due_date: '',
    expected_students: ''
  });
  const [questions, setQuestions] = useState<Question[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'mcq', text: '', options: ['', '', '', ''], correct_option: 0 }
  ]);

  const subjects = ['Mathematics', 'Science', 'English', 'Kiswahili', 'Social Studies'];
  const grades = ['6', '7', '8', '9'];

  React.useEffect(() => {
    fetchClasses();
    if (initialImportCode && initialImportCode.trim().length === 6) {
      handleImport(initialImportCode.trim());
    }
  }, [preSelectedClassId, initialImportCode]);

  const handleImport = async (code: string) => {
    if (!code || code.length < 6) return;
    
    setImportLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('short_code', code.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setForm(prev => ({
          ...prev,
          title: data.title,
          subject: data.subject,
          grade: data.grade.replace('Grade ', ''),
          // We don't import class_id as it belongs to the teacher claiming it
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
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacherId);

      if (error) throw error;
      const fetchedClasses = data || [];
      setClasses(fetchedClasses);

      // If we have a pre-selected class, initialize its data
      if (preSelectedClassId) {
        const cls = fetchedClasses.find(c => c.id === preSelectedClassId);
        if (cls) {
          handleClassSelect(preSelectedClassId, cls.name);
        }
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleClassSelect = async (classId: string, className?: string) => {
    if (!classId || classId === 'new') {
      setForm(prev => ({ ...prev, class_id: classId, class_name: classId === 'new' ? '' : '', expected_students: '' }));
      setStudents([]);
      return;
    }

    let finalClassName = className;
    if (!finalClassName) {
      const selectedClass = classes.find(c => c.id === classId);
      finalClassName = selectedClass?.name;
    }

    // Always update the form state first so the UI reflects the selection
    setForm(prev => ({
      ...prev,
      class_id: classId,
      class_name: finalClassName || prev.class_name
    }));

    if (!finalClassName && classes.length === 0) {
      // If classes are still loading, we'll wait for fetchClasses to handle the sync
      return;
    }

    // Fetch students for this class
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('id, name, parent_code')
        .eq('class_id', classId)
        .order('name');

      if (error) throw error;

      const fetchedStudents = data || [];
      setStudents(fetchedStudents);
      
      const studentNames = fetchedStudents.map(s => s.name).join(', ');
      setForm(prev => ({
        ...prev,
        expected_students: studentNames
      }));
    } catch (err) {
      showToast("Error fetching students", "error");
    } finally {
      setLoading(false);
    }
  };

  const addStudentToClass = async () => {
    if (!newStudentName.trim() || !form.class_id || form.class_id === 'new') return;

    try {
      // 1. Get the current teacher's school name to uniquely identify students by school
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('school_name')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const schoolName = teacherData?.school_name || '';

      // 2. Check if student already exists in this grade and school
      const { data: existingStudent } = await supabase
        .from('students')
        .select(`
          id, parent_code,
          classes!inner (
            teachers!inner (
              school_name
            )
          )
        `)
        .ilike('name', newStudentName.trim())
        .eq('grade', `Grade ${form.grade}`)
        .eq('classes.teachers.school_name', schoolName)
        .maybeSingle();

      let parent_code = newStudentCode.trim();

      if (existingStudent) {
        setNewStudentName('');
        setNewStudentCode('');
        const confirmUseExisting = confirm(`Student ${newStudentName.trim()} already exists in another class at this school with Index #${existingStudent.parent_code}. Use this index?`);
        if (!confirmUseExisting) return;
        parent_code = existingStudent.parent_code;
      } else if (!parent_code) {
        const { data: schoolStudents, error: fetchError } = await supabase
          .from('students')
          .select(`
            parent_code,
            classes!inner (
              teachers!inner (
                school_name
              )
            )
          `)
          .eq('classes.teachers.school_name', schoolName)
          .eq('grade', `Grade ${form.grade}`);

        if (fetchError) throw fetchError;

        let nextIndex = 1;
        if (schoolStudents && schoolStudents.length > 0) {
          const indices = schoolStudents
            .map(s => parseInt(s.parent_code))
            .filter(n => !isNaN(n));
          if (indices.length > 0) {
            nextIndex = Math.max(...indices) + 1;
          }
        }
        
        parent_code = nextIndex.toString().padStart(4, '0');
      }

      const { data, error } = await supabase
        .from('students')
        .insert([{
          name: newStudentName.trim(),
          class_id: form.class_id,
          grade: `Grade ${form.grade}`,
          parent_code: parent_code
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setStudents(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewStudentName('');
        setNewStudentCode('');
        showToast("Student added to class", "success");
      }
    } catch (err) {
      showToast("Failed to add student. Code might be taken.", "error");
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkNames.trim() || !form.class_id || form.class_id === 'new' || !form.grade) return;

    const lines = bulkNames
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (lines.length === 0) return;

    try {
      setLoading(true);
      
      // Get school name
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('school_name')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      const schoolName = teacherData?.school_name || '';

      // Get current school students for index
      const { data: schoolStudents, error: fetchError } = await supabase
        .from('students')
        .select(`
          name,
          parent_code,
          classes!inner (
            teachers!inner (
              school_name
            )
          )
        `)
        .eq('classes.teachers.school_name', schoolName)
        .eq('grade', `Grade ${form.grade}`);

      if (fetchError) throw fetchError;

      const existingCodes = new Set(
        (schoolStudents || [])
          .map(s => parseInt(s.parent_code))
          .filter(n => !isNaN(n))
      );

      let currentCode = 1;
      const newStudents = [];

      for (const line of lines) {
        let name = line;
        let parent_code = '';

        if (line.includes(',')) {
          const parts = line.split(',');
          name = parts[0].trim();
          parent_code = parts[1].trim().replace(/\D/g, '').padStart(4, '0');
        }

        // Check if student with this name already exists in this school/grade
        const existingStudent = (schoolStudents || []).find(s => s.name.toLowerCase() === name.toLowerCase());
        
        if (existingStudent) {
          parent_code = existingStudent.parent_code;
        } else if (!parent_code || existingCodes.has(parseInt(parent_code))) {
          while (existingCodes.has(currentCode)) {
            currentCode++;
          }
          parent_code = currentCode.toString().padStart(4, '0');
          existingCodes.add(parseInt(parent_code));
        } else {
          existingCodes.add(parseInt(parent_code));
        }
        
        newStudents.push({
          name,
          class_id: form.class_id,
          grade: `Grade ${form.grade}`,
          parent_code: parent_code
        });
      }

      const { data, error } = await supabase
        .from('students')
        .insert(newStudents)
        .select();

      if (error) throw error;

      if (data) {
        setStudents(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)));
        setBulkNames('');
        setShowBulkAdd(false);
        showToast(`Added ${newStudents.length} students`, "success");
      }
    } catch (err) {
      showToast("Failed to bulk add students", "error");
    } finally {
      setLoading(false);
    }
  };

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCode, setEditingCode] = useState('');

  const updateStudent = async (studentId: string) => {
    if (!editingName.trim() || !editingCode.trim()) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          name: editingName.trim(),
          parent_code: editingCode.trim().padStart(4, '0')
        })
        .eq('id', studentId);

      if (error) throw error;

      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, name: editingName.trim(), parent_code: editingCode.trim().padStart(4, '0') } : s).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingStudentId(null);
      showToast("Student updated", "success");
    } catch (err) {
      showToast("Failed to update student. Code might be taken.", "error");
    }
  };

  const removeStudentFromClass = async (studentId: string) => {
    if (!confirm("Are you sure you want to remove this student?")) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== studentId));
      showToast("Student deleted", "info");
    } catch (err) {
      showToast("Failed to remove student", "error");
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
    
    // If it's a dynamic class (one-time), we strictly need students to track performance.
    // If it's a linked class, we can use the class students later.
    const isDynamic = !form.class_id || form.class_id === 'new';
    if (isDynamic && !form.expected_students.trim()) {
      showToast("For a one-time class, please provide at least one student name.", "error");
      return false;
    }
    
    if (!isDynamic && students.length === 0) {
      showToast("Please add at least one student to this class first.", "error");
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
    const teacherData = localStorage.getItem('azilearn_teacher');
    
    if (teacherData) {
      teacherId = JSON.parse(teacherData).id;
    }

    if (!teacherId) {
      teacherId = 'teacher_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('azilearn_teacher_id', teacherId);
    }

    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    setLoading(true);
    try {
      const isDynamic = !form.class_id || form.class_id === 'new';
      const studentList = isDynamic 
        ? form.expected_students.split(',').map(s => s.trim()).filter(s => s !== '')
        : students.map(s => s.name);

      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          teacher_id: teacherId,
          class_id: form.class_id && form.class_id !== 'new' ? form.class_id : null,
          title: form.title,
          subject: form.subject,
          grade: `Grade ${form.grade}`,
          class_name: form.class_name,
          due_date: new Date(form.due_date).toISOString(),
          questions: questions,
          expected_students: studentList,
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
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-2 px-4 py-4 bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-accent rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            <Download size={20} />
            {showImport ? 'Cancel Import' : 'Use Code'}
          </button>
          <button 
            onClick={() => window.open('https://wa.me/254799426863?text=Hello%20Azilearn%2C%20I%20would%20like%20to%20request%20an%20assignment%20upload%20for%20my%20class.', '_blank')}
            className="flex items-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <MessageCircle size={20} />
            Request Upload
          </button>
          <button 
            onClick={publishAssignment}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-4 bg-brand-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
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
                <p className="text-sm font-bold text-brand-muted/80">Enter the 6-character code sent to you by the admin to quickly load assignment questions.</p>
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
                      {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
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
                    <option value="new">+ Dynamic Class (One-time)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted/40 pointer-events-none" size={18} />
                </div>
              </div>

              {form.class_id === 'new' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
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
                </motion.div>
              )}

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
                  {form.class_id && form.class_id !== 'new' ? 'Linked Class Roll Call' : 'Student Roll Call'}
                </label>
                
                {form.class_id && form.class_id !== 'new' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Directly Synced with {form.class_name}</p>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-brand-border">
                      {students.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border group">
                          {editingStudentId === student.id ? (
                            <div className="flex-1 flex gap-2">
                              <input 
                                type="text"
                                maxLength={4}
                                className="w-12 bg-transparent border-b border-brand-accent outline-none font-black text-xs text-brand-accent text-center"
                                value={editingCode}
                                onChange={e => setEditingCode(e.target.value.replace(/\D/g, ''))}
                              />
                              <input 
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none font-bold text-sm"
                                value={editingName}
                                autoFocus
                                onChange={e => setEditingName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') updateStudent(student.id);
                                  if (e.key === 'Escape') setEditingStudentId(null);
                                }}
                              />
                              <button onClick={() => updateStudent(student.id)} className="text-emerald-500"><Check size={16} /></button>
                              <button onClick={() => setEditingStudentId(null)} className="text-brand-muted"><X size={16} /></button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center gap-3">
                              <span className="text-[10px] font-black text-brand-accent bg-brand-accent/5 px-2 py-0.5 rounded border border-brand-accent/10 font-mono">
                                {student.parent_code || '----'}
                              </span>
                              <span 
                                className="text-sm font-bold cursor-pointer hover:text-brand-accent transition-colors flex-1"
                                onClick={() => {
                                  setEditingStudentId(student.id);
                                  setEditingName(student.name);
                                  setEditingCode(student.parent_code || '');
                                }}
                              >
                                {student.name}
                              </span>
                            </div>
                          )}
                          {!editingStudentId && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => {
                                  setEditingStudentId(student.id);
                                  setEditingName(student.name);
                                  setEditingCode(student.parent_code || '');
                                }}
                                className="p-1.5 text-brand-muted hover:text-brand-accent hover:bg-brand-accent/5 rounded-lg"
                              >
                                <Type size={14} />
                              </button>
                              <button 
                                onClick={() => removeStudentFromClass(student.id)}
                                className="p-1.5 text-brand-muted hover:text-red-500 hover:bg-red-500/5 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {students.length === 0 && (
                        <p className="text-center py-4 text-xs font-bold text-brand-muted italic">No students in this class yet.</p>
                      )}
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => setShowBulkAdd(!showBulkAdd)}
                        className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                          showBulkAdd ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-surface text-brand-muted border-brand-border hover:border-brand-accent/50'
                        }`}
                      >
                        <ClipboardList size={12} className="inline mr-2" />
                        {showBulkAdd ? 'Single Add' : 'Bulk Add Mode'}
                      </button>
                    </div>

                    {showBulkAdd ? (
                      <div className="space-y-3">
                        <textarea 
                          placeholder="Name, Index (one per line)...&#10;John Doe, 0001&#10;Jane Smith, 0002"
                          rows={4}
                          className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm font-bold outline-none focus:border-brand-accent/50 resize-none"
                          value={bulkNames}
                          onChange={e => setBulkNames(e.target.value)}
                        />
                        <p className="text-[9px] text-brand-muted/70 italic px-1">Tip: Comma-separated name and index number works best.</p>
                        <button 
                          onClick={handleBulkAdd}
                          disabled={loading || !bulkNames.trim()}
                          className="w-full bg-brand-accent text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                          Add {bulkNames.split('\n').filter(n => n.trim()).length || ''} Students
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Name..."
                          className="flex-[2] bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-brand-accent/50"
                          value={newStudentName}
                          onChange={e => setNewStudentName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addStudentToClass()}
                        />
                        <input 
                          type="text"
                          placeholder="Index"
                          maxLength={4}
                          className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs font-black text-center outline-none focus:border-brand-accent/50"
                          value={newStudentCode}
                          onChange={e => setNewStudentCode(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={e => e.key === 'Enter' && addStudentToClass()}
                        />
                        <button 
                          onClick={addStudentToClass}
                          className="p-2.5 bg-brand-accent text-white rounded-xl shadow-lg shadow-brand-accent/20 active:scale-95 transition-transform"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea 
                      placeholder="e.g. John Kamau, 0001, Sarah Wambui, 0002"
                      rows={3}
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm resize-none"
                      value={form.expected_students}
                      onChange={e => setForm({...form, expected_students: e.target.value})}
                    />
                    <p className="text-[10px] text-brand-muted/60 mt-1 ml-1 italic">Enter Name, Index pairs (comma separated) to track results.</p>
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

          <div className="space-y-4">
            <AnimatePresence>
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
                            key={`${q.id}-opt-${optIdx}`} 
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${q.correct_option === optIdx ? 'bg-emerald-500/5 border-emerald-500/30 ring-2 ring-emerald-500/10' : 'bg-brand-bg/50 border-brand-border hover:border-brand-accent/30'}`}
                          >
                            <button 
                              type="button"
                              onClick={() => updateQuestion(q.id, { correct_option: optIdx })}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${q.correct_option === optIdx ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-brand-surface border border-brand-border text-transparent'}`}
                            >
                              <Check size={14} />
                            </button>
                            <input 
                              type="text"
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 bg-transparent border border-transparent focus:border-brand-accent/20 rounded-lg px-2 py-1 outline-none font-bold placeholder:text-brand-muted/20 transition-all"
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
