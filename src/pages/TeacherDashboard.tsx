import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  LogOut, 
  ChevronRight, 
  BookOpen,
  Calendar,
  Loader2,
  School,
  GraduationCap,
  ArrowLeft,
  MessageCircle,
  Download,
  Clock,
  Check,
  Trophy,
  Shield,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { TeacherCompetitionManager } from '../components/TeacherCompetitionManager';
import { QuestionRequestForm } from '../components/QuestionRequestForm';
import { MaterialCard } from '../components/MaterialCard';
import { SlidesViewer } from '../components/SlidesViewer';
import { Experiment } from '../types';
import ModerationPage from './ModerationPage';
import { SchoolSetupModal } from '../components/SchoolSetupModal';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  class_id: string;
  due_date: string;
}

interface Class {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
}

interface Teacher {
  id: string;
  name: string;
  school_name: string;
  school_id?: string | null;
}

interface TeacherDashboardProps {
  onBack: () => void;
  onViewClass: (classId: string, className: string) => void;
  onLogout: () => void;
  onCreateAssignment: (importMode?: boolean) => void;
  onExamsClick: () => void;
  onViewExamResults: (examId: string) => void;
  onEditExam: (exam: any) => void;
  onImportWork: (work: any) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  onBack, onViewClass, onLogout, onCreateAssignment, onExamsClick, onViewExamResults, onEditExam, onImportWork
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [studentNames, setStudentNames] = useState('');
  const [activeView, setActiveView] = useState<'classes' | 'exams' | 'competitions' | 'forum_moderation'>('classes');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [isSchoolSetupOpen, setIsSchoolSetupOpen] = useState(false);

  const handleImportByCode = async (passedCode?: string) => {
    const finalCode = (passedCode || importCode).trim().toUpperCase();
    if (!finalCode) {
      showToast("Please enter a valid code", "error");
      return;
    }

    setImporting(true);
    try {
      // Check admin_assignments table (New preferred source)
      const { data: adminData } = await supabase
        .from('admin_assignments')
        .select('*')
        .eq('share_code', finalCode)
        .maybeSingle();

      if (adminData) {
        if (adminData.type === 'groupwork') {
          showToast("Importing Group Work...", "info");
          // Create the teacher competition directly
          const { data: comp, error: compErr } = await supabase
            .from('teacher_competitions')
            .insert([{
              teacher_id: teacher?.id,
              title: adminData.title,
              subject: adminData.subject,
              grade: adminData.grade,
              status: 'active'
            }])
            .select()
            .single();

          if (compErr) throw compErr;

          const questionsToInsert = adminData.questions.map((q: any) => ({
            competition_id: comp.id,
            question_text: q.question || q.text || '',
            type: 'mcq',
            options: q.options || ['', '', '', ''],
            correct_answer: q.correct_answer || String(q.correct_option !== undefined ? q.correct_option : q.correct_answer || ''),
            points: q.points || q.marks || 10
          }));

          const { error: qErr } = await supabase
            .from('teacher_competition_questions')
            .insert(questionsToInsert);

          if (qErr) throw qErr;

          showToast("Group Work competition imported successfully! Check your Groups tab.", "success");
          if (teacher) fetchDashboardData(teacher.id);
          setShowImportModal(false);
          setImportCode('');
          return;
        }

        showToast("Shared work found!", "success");
        onImportWork(adminData);
        setShowImportModal(false);
        setImportCode('');
        return;
      }

      // Legacy fallback (checking existing exams/assignments)
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('share_code', finalCode)
        .maybeSingle();

      if (examData) {
        showToast("Assessment found! Importing...", "info");
        const { error: copyErr } = await supabase
          .from('exams')
          .insert({
            ...examData,
            id: undefined,
            created_at: undefined,
            created_by: teacher?.id,
            is_published: false,
            share_code: null,
            created_by_admin: false
          });
        
        if (copyErr) throw copyErr;
        showToast("Assessment imported successfully!", "success");
        if (teacher) fetchDashboardData(teacher.id);
        setShowImportModal(false);
        setImportCode('');
        return;
      }

      const { data: assignData } = await supabase
        .from('assignments')
        .select('*')
        .eq('share_code', finalCode)
        .maybeSingle();

      if (assignData) {
        showToast("Assignment found! Importing...", "info");
        const { error: copyErr } = await supabase
          .from('assignments')
          .insert({
            ...assignData,
            id: undefined,
            created_at: undefined,
            teacher_id: teacher?.id,
            share_code: null,
            created_by_admin: false
          });
        
        if (copyErr) throw copyErr;
        showToast("Assignment imported successfully!", "success");
        if (teacher) fetchDashboardData(teacher.id);
        setShowImportModal(false);
        setImportCode('');
        return;
      }

      showToast("No work found with this code.", "error");
    } catch (err: any) {
      showToast(err.message || "Failed to import work", "error");
    } finally {
      setImporting(false);
    }
  };

  const grades = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'
  ];

  useEffect(() => {
    const teacherData = localStorage.getItem('azilearn_teacher');
    if (!teacherData) {
      onLogout();
      return;
    }
    let t;
    try {
      t = teacherData ? JSON.parse(teacherData) : null;
    } catch {
      t = null;
    }
    
    if (!t) {
      onLogout();
      return;
    }
    setTeacher(t);
    fetchDashboardData(t.id);

    // Global real-time listener for teacher's classes
    const activityChannel = supabase
      .channel(`teacher-${t.id}-activity`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'assignment_submissions'
      }, (payload) => {
        setRecentActivity(prev => [payload.new, ...prev].slice(0, 5));
        fetchDashboardData(t.id);
        showToast(`New assignment from ${payload.new.student_name}!`, "info");
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'exam_attempts'
      }, (payload) => {
        setRecentActivity(prev => [payload.new, ...prev].slice(0, 5));
        fetchDashboardData(t.id);
        showToast("New assessment attempt started!", "info");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
    };
  }, []);

  const fetchDashboardData = async (teacherId: string) => {
    try {
      setLoading(true);

      const teacherData = localStorage.getItem('azilearn_teacher');
      const t = teacherData ? JSON.parse(teacherData) : null;

      // Verify teacher exists in DB
      let { data: teacherCheck, error: teacherError } = await supabase
        .from('teachers')
        .select('id, name, school_name, school_id')
        .eq('id', teacherId)
        .maybeSingle();

      // If not found by ID, try finding by name and school (fallback for DB resets)
      if (!teacherCheck && !teacherError && t) {
        const { data: fallbackTeachers, error: fallbackError } = await supabase
          .from('teachers')
          .select('id, name, school_name, school_id')
          .ilike('name', t.name.trim())
          .ilike('school_name', t.school_name.trim());
        
        const fallbackTeacher = fallbackTeachers?.[0];
        
        if (fallbackTeacher && !fallbackError) {
          teacherCheck = fallbackTeacher;
          // Update localStorage with new ID
          localStorage.setItem('azilearn_teacher', JSON.stringify({
            id: fallbackTeacher.id,
            name: fallbackTeacher.name,
            school_name: fallbackTeacher.school_name,
            school_id: fallbackTeacher.school_id
          }));
          teacherId = fallbackTeacher.id;
          setTeacher(fallbackTeacher);
        }
      }

      if (teacherError || !teacherCheck) {
        console.error("Teacher record not found in database.");
        showToast("Your session has expired or the database was reset. Please sign up or login again.", "error");
        handleLogout();
        return;
      }

      // Automatically trigger setup if school is not linked yet and they haven't dismissed it this session
      if (teacherCheck && !teacherCheck.school_id) {
        const hasSkipped = sessionStorage.getItem('azilearn_skipped_school_setup');
        if (!hasSkipped) {
          setIsSchoolSetupOpen(true);
        }
      }

      setTeacher(teacherCheck);
      localStorage.setItem('azilearn_teacher', JSON.stringify({
        id: teacherCheck.id,
        name: teacherCheck.name,
        school_name: teacherCheck.school_name,
        school_id: teacherCheck.school_id
      }));

      // Fetch Classes and Assignments in parallel
      const [assignmentsResponse, examsResponse] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, subject, grade, due_date, created_at, class_id, share_code')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false }),
        supabase
          .from('exams')
          .select('id, title, subject, grade, is_published, created_at, share_code')
          .eq('created_by', teacherId)
          .order('created_at', { ascending: false })
      ]);

      if (assignmentsResponse.error) throw assignmentsResponse.error;
      if (examsResponse.error) throw examsResponse.error;

      let fetchedClasses: any[] = [];
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('teacher_get_classes', {
          p_teacher_id: teacherId
        });
        if (!rpcError && rpcData) {
          if (Array.isArray(rpcData)) {
            fetchedClasses = rpcData;
          } else if (typeof rpcData === 'object') {
            const innerArray = Object.values(rpcData).find(v => Array.isArray(v));
            if (innerArray) {
              fetchedClasses = innerArray as any[];
            } else if ((rpcData as any).id) {
              fetchedClasses = [rpcData];
            }
          }
        }
      } catch (rpcErr) {
        console.warn("RPC teacher_get_classes failed, using fallback:", rpcErr);
      }

      // Robust fallback if RPC was not successful, returned nothing, or was empty
      if (!fetchedClasses || fetchedClasses.length === 0) {
        try {
          const { data: dbData, error: dbError } = await supabase
            .from('classes')
            .select('id, name, created_at, grade')
            .eq('teacher_id', teacherId);
          if (!dbError && dbData) {
            fetchedClasses = dbData;
          }
        } catch (dbErr) {
          console.error("Direct classes table query fallback failed:", dbErr);
        }
      }

      // Sort classes by created_at desc if available
      const sortedClasses = [...(fetchedClasses || [])].sort((a: any, b: any) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      setClasses(sortedClasses);
      setAssignments(assignmentsResponse.data || []);
      setExams(examsResponse.data || []);
    } catch (err: any) {
      console.error("Dashboard Loading Error:", err);
      showToast("Failed to load data: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedGrade || !teacher) return;

    try {
      setLoading(true);
      // 1. Create Class
      const { data: rawClassData, error: classError } = await supabase.rpc('teacher_create_class', {
        p_teacher_id: teacher.id,
        p_name: newClassName.trim(),
        p_grade: selectedGrade
      });

      const classData = Array.isArray(rawClassData) ? rawClassData[0] : rawClassData;

      if (classError || !classData) {
        throw classError || new Error("Failed to create class record");
      }

      // 2. Add Students if provided
      if (studentNames.trim()) {
        const lines = studentNames.split('\n').map(n => n.trim()).filter(n => n);
        if (lines.length > 0) {
          // Get current highest index for this school/grade to continue sequence
          const { data: existingStudents, error: fetchError } = await supabase
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
            .eq('classes.teachers.school_name', teacher.school_name)
            .eq('grade', selectedGrade);

          if (fetchError) throw fetchError;

          const existingCodes = new Set(
            (existingStudents || [])
              .map(s => parseInt(s.parent_code))
              .filter(n => !isNaN(n))
          );

          let currentCode = 1;
          const studentsToInsert = [];

          for (const line of lines) {
            let name = line;
            let parent_code = '';

            if (line.includes(',')) {
              const parts = line.split(',');
              name = parts[0].trim();
              parent_code = parts[1].trim().replace(/\D/g, '').padStart(4, '0');
            }

            // Check if student with this name already exists in this school/grade
            const existingStudent = (existingStudents || []).find(s => s.name.toLowerCase() === name.toLowerCase());
            
            if (existingStudent) {
              // Reuse existing index number
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

            studentsToInsert.push({
              class_id: classData.id,
              name,
              grade: selectedGrade,
              parent_code: parent_code
            });
          }

          const { error: studentError } = await supabase
            .from('students')
            .insert(studentsToInsert);
          
          if (studentError) throw studentError;
        }
      }

      showToast("Class created successfully!", "success");
      setIsAddingClass(false);
      setNewClassName('');
      setSelectedGrade('');
      setStudentNames('');
      fetchDashboardData(teacher.id);
      
      // Navigate to the new class view immediately
      onViewClass(classData.id, classData.name);
    } catch (err: any) {
      showToast(err.message || "Failed to create class", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRenameClass = async (classId: string, newName: string) => {
    if (!teacher || !newName.trim()) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('teacher_update_class', {
        p_teacher_id: teacher.id,
        p_class_id: classId,
        p_name: newName.trim()
      });
      if (error) throw error;
      showToast("Class renamed successfully!", "success");
      setEditingClassId(null);
      fetchDashboardData(teacher.id);
    } catch (err: any) {
      showToast(err.message || "Failed to rename class", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!teacher) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this class? This will permanently delete the class and all associated students.");
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('teacher_delete_class', {
        p_teacher_id: teacher.id,
        p_class_id: classId
      });
      if (error) throw error;
      showToast("Class deleted successfully!", "success");
      fetchDashboardData(teacher.id);
    } catch (err: any) {
      showToast(err.message || "Failed to delete class", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSchoolSetup = () => {
    sessionStorage.setItem('azilearn_skipped_school_setup', 'true');
    setIsSchoolSetupOpen(false);
  };

  const handleSchoolLinked = (schoolId: string, schoolName: string) => {
    if (teacher) {
      const updated = {
        ...teacher,
        school_id: schoolId,
        school_name: schoolName
      };
      setTeacher(updated);
      localStorage.setItem('azilearn_teacher', JSON.stringify(updated));
      fetchDashboardData(teacher.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('azilearn_teacher');
    onLogout();
    showToast("Logged out successfully", "info");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-accent/20" size={48} />
        <p className="text-brand-muted font-bold animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <header className="bg-brand-surface border-b border-brand-border sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted active:text-brand-accent transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent shrink-0">
                <UserPersona initial={teacher?.name?.charAt(0) || 'T'} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black tracking-tight leading-none uppercase truncate">
                  {teacher?.name?.split(' ')[0]}
                </h1>
                <button
                  onClick={() => setIsSchoolSetupOpen(true)}
                  className="flex items-center gap-1 text-brand-muted hover:text-brand-accent text-[8px] font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap group transition-colors text-left outline-none"
                  title="Link or Register School"
                  id="header-school-btn"
                >
                  <School size={8} className="group-hover:scale-110 transition-transform" />
                  <span className="truncate max-w-[120px] underline decoration-dotted decoration-brand-muted/50 group-hover:decoration-brand-accent/50">
                    {teacher?.school_name || 'No School Linked'}
                  </span>
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-500/5 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0"
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {!teacher?.school_id && (
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0" id="unlinked-school-banner">
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-accent flex items-center gap-1.5">
                <School size={12} />
                Unlinked School Profile
              </h4>
              <p className="text-[9px] font-bold text-brand-muted leading-relaxed">
                Your teacher profile is not linked to a registered school account yet. Link or register your school to enable full administrative dashboard capabilities.
              </p>
            </div>
            <button
              onClick={() => setIsSchoolSetupOpen(true)}
              className="self-start sm:self-center px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors shrink-0"
              id="banner-link-school-btn"
            >
              Link School Now
            </button>
          </div>
        )}
        <div className="space-y-3">
          {/* View toggle */}
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap border-b border-brand-border">
            <button
              onClick={() => setActiveView('classes')}
              className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 transition-all relative shrink-0 ${
                activeView === 'classes' ? 'text-brand-accent' : 'text-brand-muted'
              }`}
            >
              <BookOpen size={12} /> Classes
              {activeView === 'classes' && <motion.div layoutId="activeTabT" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />}
            </button>
            <button
              onClick={() => setActiveView('exams')}
              className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 transition-all relative shrink-0 ${
                activeView === 'exams' ? 'text-brand-accent' : 'text-brand-muted'
              }`}
            >
              <Clock size={12} /> Assessments
              {activeView === 'exams' && <motion.div layoutId="activeTabT" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />}
            </button>
            <button
              onClick={() => setActiveView('competitions')}
              className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 transition-all relative shrink-0 ${
                activeView === 'competitions' ? 'text-brand-accent' : 'text-brand-muted'
              }`}
            >
              <Trophy size={12} /> Groups
              {activeView === 'competitions' && <motion.div layoutId="activeTabT" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />}
            </button>
            <button
              onClick={() => setActiveView('forum_moderation')}
              className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 transition-all relative shrink-0 ${
                activeView === 'forum_moderation' ? 'text-brand-accent' : 'text-brand-muted'
              }`}
            >
              <Shield size={12} /> Forum Mod
              {activeView === 'forum_moderation' && <motion.div layoutId="activeTabT" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />}
            </button>
          </div>

          {/* Action buttons — scroll horizontally, never wrap */}
          {activeView !== 'forum_moderation' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {activeView === 'classes' ? (
                <>
                  <ActionBtn onClick={() => setIsAddingClass(true)} icon={<Plus size={12} />} label="New Class" />
                  <ActionBtn onClick={() => onCreateAssignment()} icon={<Plus size={12} />} label="Assignment" accent />
                  <ActionBtn onClick={onExamsClick} icon={<Plus size={12} />} label="Assessment" />
                  <ActionBtn onClick={() => setShowImportModal(true)} icon={<Download size={12} />} label="Import" />
                  <ActionBtn onClick={() => setShowRequestModal(true)} icon={<MessageCircle size={12} />} label="Request" green />
                </>
              ) : activeView === 'exams' ? (
                <>
                  <ActionBtn onClick={onExamsClick} icon={<Plus size={12} />} label="New Assessment" accent />
                  <ActionBtn onClick={() => setShowImportModal(true)} icon={<Download size={12} />} label="Import" />
                  <ActionBtn onClick={() => setShowRequestModal(true)} icon={<MessageCircle size={12} />} label="Request" green />
                </>
              ) : (
                <>
                  <ActionBtn onClick={() => {}} icon={<Plus size={12} />} label="New Group" accent />
                  <ActionBtn onClick={() => setShowRequestModal(true)} icon={<MessageCircle size={12} />} label="Request" green />
                </>
              )}
            </div>
          )}
        </div>

        {recentActivity.length > 0 && (
          <div className="bg-brand-surface border border-brand-border p-5 rounded-[2rem] shadow-lg shadow-brand-accent/5">
             <h3 className="text-[10px] font-black text-brand-accent uppercase tracking-wider mb-4 flex items-center gap-2 whitespace-nowrap">
               <Clock size={12} />
               Live Activity Feed
             </h3>
             <div className="space-y-2">
               {recentActivity.map((act, i) => (
                 <motion.div 
                   key={act.id || i}
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   className="flex items-center gap-3 bg-brand-bg/50 p-2.5 rounded-2xl border border-brand-border"
                 >
                   <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                     {act.student_name ? <Check size={14} /> : <Clock size={14} />}
                   </div>
                   <div className="min-w-0">
                      <p className="text-xs font-bold text-brand-text truncate">
                        <span className="font-black text-brand-accent">{act.student_name || 'A student'}</span> 
                        {act.student_name ? ' submitted' : ' started attempt'}
                      </p>
                      <p className="text-[8px] font-black text-brand-muted uppercase tracking-wider">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                   </div>
                 </motion.div>
               ))}
             </div>
          </div>
        )}

        {activeView === 'classes' ? (
          <>
            {isAddingClass && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-surface border border-brand-accent/30 rounded-[2rem] p-6 shadow-xl"
              >
                <form onSubmit={handleAddClass} className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold tracking-tight">Create New Class</h3>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingClass(false)}
                      className="text-brand-muted hover:text-brand-accent font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-muted px-1 whitespace-nowrap">Class Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. 9 North"
                          className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold outline-none focus:border-brand-accent/50"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-muted px-1 whitespace-nowrap">Grade Level</label>
                        <select 
                          className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold outline-none focus:border-brand-accent/50 appearance-none"
                          value={selectedGrade}
                          onChange={(e) => setSelectedGrade(e.target.value)}
                        >
                          <option value="">Select Grade...</option>
                          {grades.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-muted px-1 whitespace-nowrap">Students (One per line: Name, Index)</label>
                      <textarea 
                        placeholder="John Doe, 0001&#10;Jane Smith, 0002&#10;Ali Omar (auto-indexes)..."
                        className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold outline-none focus:border-brand-accent/50 min-h-[100px]"
                        value={studentNames}
                        onChange={(e) => setStudentNames(e.target.value)}
                      />
                      <p className="text-[9px] text-brand-muted/70 italic px-1">Tip: Comma-separated name and index number works best.</p>
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-brand-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-accent/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {loading ? "Creating..." : "Save Class & Students"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4 bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem]">
                  <div className="w-16 h-16 bg-brand-accent/5 rounded-full flex items-center justify-center mx-auto text-brand-accent/30">
                    <GraduationCap size={32} />
                  </div>
                  <div>
                    <p className="text-brand-muted font-bold">No classes yet.</p>
                    <p className="text-xs text-brand-muted/60 mt-1">Add your first class to manage students and assignments.</p>
                  </div>
                </div>
              ) : (
                classes.map((cls, index) => {
                  const classAssignments = assignments.filter(a => a.class_id === cls.id);
                  return (
                    <motion.div 
                      key={cls.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-2xl border border-brand-border bg-brand-surface shadow-sm hover:border-brand-accent group cursor-pointer transition-all active:scale-[0.98]`}
                      onClick={() => onViewClass(cls.id, cls.name)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${index % 3 === 0 ? 'bg-blue-500/10 text-blue-500' : index % 3 === 1 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'} group-hover:scale-110 transition-transform`}>
                          <Users size={24} />
                        </div>
                        <div className="flex items-center gap-1.5 ms-2">
                          <div className="bg-brand-bg border border-brand-border px-3 py-1.5 rounded-xl whitespace-nowrap">
                            <span className="text-[10px] font-black tracking-wider text-brand-muted uppercase">{classAssignments.length} Assignment{classAssignments.length !== 1 ? 's' : ''}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClassId(cls.id);
                              setEditingClassName(cls.name);
                            }}
                            className="p-2 bg-brand-bg hover:bg-brand-accent/10 border border-brand-border text-brand-muted hover:text-brand-accent rounded-xl transition-all"
                            title="Rename Class"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClass(cls.id);
                            }}
                            className="p-2 bg-brand-bg hover:bg-red-500/10 border border-brand-border text-brand-muted hover:text-red-500 rounded-xl transition-all"
                            title="Delete Class"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      {editingClassId === cls.id ? (
                        <div className="flex items-center gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingClassName}
                            onChange={(e) => setEditingClassName(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-brand-bg border border-brand-accent rounded-xl text-xs font-bold text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/20"
                            placeholder="Class Name"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameClass(cls.id, editingClassName)}
                            className="p-2 bg-brand-accent text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-brand-accent/10"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingClassId(null)}
                            className="p-2 bg-brand-bg border border-brand-border text-brand-muted rounded-xl hover:scale-105 active:scale-95 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-lg font-black tracking-tight mb-4 truncate text-brand-text">{cls.name}</h3>
                      )}

                      <div className="flex items-center justify-between text-brand-muted">
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-wider uppercase whitespace-nowrap">
                          View Class
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-colors">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        ) : activeView === 'exams' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exams.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4 bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem]">
                <div className="w-16 h-16 bg-brand-accent/5 rounded-full flex items-center justify-center mx-auto text-brand-accent/30">
                  <Clock size={32} />
                </div>
                <div>
                  <p className="text-brand-muted font-bold">No assessments created yet.</p>
                  <p className="text-xs text-brand-muted/60 mt-1">Create your first timed assessment to test your students.</p>
                </div>
              </div>
            ) : (
              exams.map((exam, index) => (
                <motion.div 
                  key={exam.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 rounded-[2rem] border border-brand-border bg-brand-surface shadow-sm hover:border-brand-accent group cursor-pointer transition-all active:scale-[0.98]"
                  onClick={() => exam.is_published ? onViewExamResults(exam.id) : onEditExam(exam)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-brand-accent/10 text-brand-accent group-hover:scale-110 transition-transform">
                      <Clock size={24} />
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl border border-brand-accent/5 whitespace-nowrap ${exam.is_published ? 'bg-green-500/10 text-green-500' : 'bg-brand-bg text-brand-muted'}`}>
                      <span className="text-[10px] font-black tracking-wider uppercase">{exam.is_published ? 'Published' : 'Draft'}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-2 truncate">{exam.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted mb-4 truncate">{exam.subject} • {exam.grade}</p>
                  
                  {exam.is_published && exam.share_code && (
                    <div className="mb-6 p-3 bg-brand-accent/5 rounded-2xl border border-brand-accent/10 flex items-center justify-between group/code hover:border-brand-accent transition-all"
                         onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(exam.share_code); showToast("Code copied!", "success"); }}>
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-wider text-brand-muted mb-0.5 whitespace-nowrap">Share Code</span>
                        <span className="text-xs font-black tracking-[0.2em] text-brand-accent">{exam.share_code}</span>
                      </div>
                      <Plus size={14} className="text-brand-accent/40 group-hover/code:text-brand-accent transition-colors" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-brand-muted">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-wider uppercase whitespace-nowrap">
                      {exam.is_published ? 'View Results' : 'Complete Draft'}
                    </div>
                    <div className="flex gap-2">
                       {!exam.is_published && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); onEditExam(exam); }}
                           className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center hover:bg-brand-accent hover:text-white transition-colors"
                         >
                           <Plus size={16} />
                         </button>
                       )}
                       <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-colors">
                         <ChevronRight size={16} />
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : activeView === 'competitions' ? (
          <TeacherCompetitionManager teacherId={teacher?.id || ''} />
        ) : (
          <ModerationPage embedMode={true} />
        )}
      </main>

      {/* Request Admin Modal */}
      {showRequestModal && teacher && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-brand-bg/80 backdrop-blur-md"
            onClick={() => setShowRequestModal(false)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-brand-surface border-2 border-brand-accent/20 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            <QuestionRequestForm 
              teacher={teacher} 
              onClose={() => setShowRequestModal(false)} 
              onImportCode={(code) => {
                setShowRequestModal(false);
                handleImportByCode(code);
              }}
            />
          </motion.div>
        </div>
      )}

      {/* Import Code Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-brand-bg/80 backdrop-blur-md"
            onClick={() => setShowImportModal(false)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-md bg-brand-surface border-2 border-brand-accent/20 rounded-[2.5rem] p-5 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent" />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-black tracking-tight uppercase leading-none">Import Shared Work</h2>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mt-2">Enter the code provided by admin</p>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="w-10 h-10 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest px-1">Unique Share Code</label>
                <input 
                  type="text"
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                  placeholder="E.G. AZ-9X2V-KL"
                  className="w-full bg-brand-bg border-2 border-brand-border rounded-2xl px-4 py-3 font-black tracking-widest text-center text-brand-text outline-none focus:border-brand-accent transition-colors"
                />
              </div>

              <button 
                onClick={handleImportByCode}
                disabled={importing || !importCode}
                className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
              >
                {importing ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                {importing ? 'Importing...' : 'Link to My Dashboard'}
              </button>

              <div className="bg-brand-accent/5 rounded-2xl p-4 flex gap-4 items-start">
                 <div className="bg-brand-accent text-white p-2 rounded-xl mt-1 shrink-0">
                    <MessageCircle size={14} />
                 </div>
                 <p className="text-[10px] font-black text-brand-muted uppercase leading-relaxed">
                    Don't have a code? Use the <span className="text-brand-accent">"Request Admin"</span> button to ask the admin to create professional work for you.
                 </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {teacher && (
        <SchoolSetupModal
          isOpen={isSchoolSetupOpen}
          onClose={handleCloseSchoolSetup}
          teacherId={teacher.id}
          teacherName={teacher.name}
          onSchoolLinked={handleSchoolLinked}
          canSkip={true}
        />
      )}
    </div>
  );
};

const ActionBtn = ({
  onClick, icon, label, accent, green
}: {
  onClick: () => void; icon: React.ReactNode; label: string;
  accent?: boolean; green?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap shrink-0 active:scale-95 transition-all border
      ${accent
        ? 'bg-brand-accent text-white border-brand-accent shadow-sm shadow-brand-accent/20'
        : green
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          : 'bg-brand-surface border-brand-border text-brand-muted'
      }`}
  >
    {icon}{label}
  </button>
);

const UserPersona = ({ initial }: { initial: string }) => (
  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-brand-accent to-brand-accent/50 flex items-center justify-center text-white font-black text-xl">
    {initial}
  </div>
);

export default TeacherDashboard;
