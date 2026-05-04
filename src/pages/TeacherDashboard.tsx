import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

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
}

interface TeacherDashboardProps {
  onBack: () => void;
  onViewClass: (classId: string, className: string) => void;
  onLogout: () => void;
  onCreateAssignment: (importMode?: boolean) => void;
  onExamsClick: () => void;
  onViewExamResults: (examId: string) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  onBack, onViewClass, onLogout, onCreateAssignment, onExamsClick, onViewExamResults 
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
  const [activeView, setActiveView] = useState<'classes' | 'exams'>('classes');

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
    const t = JSON.parse(teacherData);
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
        showToast("New exam attempt started!", "info");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
    };
  }, []);

  const fetchDashboardData = async (teacherId: string) => {
    try {
      setLoading(true);

      // Verify teacher exists in DB
      const { data: teacherCheck, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('id', teacherId)
        .maybeSingle();

      if (teacherError || !teacherCheck) {
        console.error("Teacher record not found in database.");
        showToast("Session expired or database reset. Please sign up again.", "error");
        handleLogout();
        return;
      }

      // Fetch Classes and Assignments in parallel
      const [classesResponse, assignmentsResponse, examsResponse] = await Promise.all([
        supabase
          .from('classes')
          .select('id, name, created_at')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false }),
        supabase
          .from('assignments')
          .select('id, title, subject, grade, due_date, created_at, class_id')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false }),
        supabase
          .from('exams')
          .select('id, title, subject, grade, is_published, created_at')
          .eq('created_by', teacherId)
          .order('created_at', { ascending: false })
      ]);

      if (classesResponse.error) throw classesResponse.error;
      if (assignmentsResponse.error) throw assignmentsResponse.error;
      if (examsResponse.error) throw examsResponse.error;

      setClasses(classesResponse.data || []);
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
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert([{
          name: newClassName.trim(),
          teacher_id: teacher.id
        }])
        .select()
        .maybeSingle();

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
      <header className="bg-brand-surface border-b border-brand-border sticky top-0 z-50 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent">
                <UserPersona initial={teacher?.name?.charAt(0) || 'T'} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-black tracking-tight leading-none uppercase">HEY {teacher?.name?.split(' ')[0]}</h1>
                <div className="flex items-center gap-2 text-brand-muted text-[8px] font-bold uppercase tracking-[0.1em] mt-0.5">
                  <School size={8} />
                  {teacher?.school_name}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500/10 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveView('classes')}
                className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${activeView === 'classes' ? 'text-brand-accent' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <BookOpen size={14} />
                My Classes
              </button>
              <button 
                onClick={() => setActiveView('exams')}
                className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${activeView === 'exams' ? 'text-brand-accent' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <Clock size={14} />
                Timed Exams
              </button>
           </div>
          <div className="flex flex-wrap gap-2">
            {activeView === 'classes' ? (
              <>
                <button 
                  onClick={() => setIsAddingClass(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  Add New Class
                </button>
                <button 
                  onClick={() => onCreateAssignment()}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  New Assignment
                </button>
                <button 
                  onClick={onExamsClick}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-accent rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  New Exam
                </button>
              </>
            ) : (
              <button 
                onClick={onExamsClick}
                className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
              >
                <Plus size={14} />
                Create Exam
              </button>
            )}
          </div>
        </div>

        {recentActivity.length > 0 && (
          <div className="bg-brand-surface border border-brand-accent/20 p-6 rounded-[2rem] shadow-lg shadow-brand-accent/5">
             <h3 className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
               <Clock size={12} />
               Live Activity Feed
             </h3>
             <div className="space-y-3">
               {recentActivity.map((act, i) => (
                 <motion.div 
                   key={act.id || i}
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   className="flex items-center gap-3 bg-brand-bg/50 p-3 rounded-2xl border border-brand-border"
                 >
                   <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                     {act.student_name ? <Check size={14} /> : <Clock size={14} />}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-bold text-brand-text">
                        <span className="text-brand-accent">{act.student_name || 'A student'}</span> 
                        {act.student_name ? ' submitted an assignment' : ' started an exam attempt'}
                      </p>
                      <p className="text-[8px] font-black text-brand-muted uppercase tracking-widest">
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
                    <h3 className="font-black tracking-tight">Create New Class</h3>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingClass(false)}
                      className="text-brand-muted hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Class Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. 9 North"
                          className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold outline-none focus:border-brand-accent/50"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Grade Level</label>
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Students (One per line: Name, Index)</label>
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
                      className={`p-6 rounded-[2rem] border border-brand-border bg-brand-surface shadow-sm hover:border-brand-accent group cursor-pointer transition-all active:scale-[0.98]`}
                      onClick={() => onViewClass(cls.id, cls.name)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${index % 3 === 0 ? 'bg-blue-500/10 text-blue-500' : index % 3 === 1 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'} group-hover:scale-110 transition-transform`}>
                          <Users size={24} />
                        </div>
                        <div className="bg-brand-bg border border-brand-border px-3 py-1.5 rounded-xl">
                          <span className="text-[10px] font-black tracking-widest text-brand-muted uppercase">{classAssignments.length} Assignment{classAssignments.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight mb-6">{cls.name}</h3>
                      <div className="flex items-center justify-between text-brand-muted">
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exams.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4 bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem]">
                <div className="w-16 h-16 bg-brand-accent/5 rounded-full flex items-center justify-center mx-auto text-brand-accent/30">
                  <Clock size={32} />
                </div>
                <div>
                  <p className="text-brand-muted font-bold">No exams created yet.</p>
                  <p className="text-xs text-brand-muted/60 mt-1">Create your first timed exam to test your students.</p>
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
                  onClick={() => onViewExamResults(exam.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-brand-accent/10 text-brand-accent group-hover:scale-110 transition-transform">
                      <Clock size={24} />
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl border border-brand-accent/5 ${exam.is_published ? 'bg-green-500/10 text-green-500' : 'bg-brand-bg text-brand-muted'}`}>
                      <span className="text-[10px] font-black tracking-widest uppercase">{exam.is_published ? 'Published' : 'Draft'}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-2 truncate">{exam.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-6">{exam.subject} • {exam.grade}</p>
                  
                  <div className="flex items-center justify-between text-brand-muted">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
                      View Results
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-colors">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const UserPersona = ({ initial }: { initial: string }) => (
  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-brand-accent to-brand-accent/50 flex items-center justify-center text-white font-black text-xl">
    {initial}
  </div>
);

export default TeacherDashboard;

const ArrowLeftIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
