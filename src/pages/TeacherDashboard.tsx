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
  Download
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
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBack, onViewClass, onLogout, onCreateAssignment }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [studentNames, setStudentNames] = useState('');

  useEffect(() => {
    const teacherData = localStorage.getItem('azilearn_teacher');
    if (!teacherData) {
      onLogout();
      return;
    }
    const t = JSON.parse(teacherData);
    setTeacher(t);
    fetchDashboardData(t.id);
  }, []);

  const fetchDashboardData = async (teacherId: string) => {
    try {
      setLoading(true);
      // Fetch Classes and Assignments in parallel
      const [classesResponse, assignmentsResponse] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false }),
        supabase
          .from('assignments')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
      ]);

      if (classesResponse.error) throw classesResponse.error;
      if (assignmentsResponse.error) throw assignmentsResponse.error;

      setClasses(classesResponse.data || []);
      setAssignments(assignmentsResponse.data || []);
    } catch (err: any) {
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !teacher) return;

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
        .single();

      if (classError) throw classError;

      // 2. Add Students if provided
      if (studentNames.trim()) {
        const names = studentNames.split(',').map(n => n.trim()).filter(n => n);
        if (names.length > 0) {
          const { error: studentError } = await supabase
            .from('students')
            .insert(names.map(name => ({
              class_id: classData.id,
              name
            })));
          
          if (studentError) throw studentError;
        }
      }

      showToast("Class created successfully!", "success");
      setIsAddingClass(false);
      setNewClassName('');
      setStudentNames('');
      fetchDashboardData(teacher.id);
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
      <header className="bg-brand-surface border-b border-brand-border sticky top-0 z-50 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent">
              <UserPersona initial={teacher?.name?.charAt(0) || 'T'} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">HELLO {teacher?.name?.toUpperCase()}</h1>
              <div className="flex items-center gap-2 text-brand-muted text-[10px] font-bold uppercase tracking-widest">
                <School size={10} />
                {teacher?.school_name}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
            <BookOpen size={14} />
            My Classes
          </h2>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => window.open('https://wa.me/254799426863?text=Hello%20Azilearn%2C%20I%20would%20like%20to%20request%20an%20assignment%20upload%20for%20my%20class.', '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <MessageCircle size={14} />
              Request Upload
            </button>
            <button 
              onClick={() => setIsAddingClass(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <Plus size={14} />
              Add New Class
            </button>
            <button 
              onClick={() => onCreateAssignment(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-accent rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Download size={14} />
              Import with Code
            </button>
            <button 
              onClick={() => onCreateAssignment()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
            >
              <Plus size={14} />
              New Assignment
            </button>
          </div>
        </div>

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
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Class Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Grade 9A"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold outline-none focus:border-brand-accent/50"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Student Names (comma separated)</label>
                  <textarea 
                    placeholder="John Doe, Jane Smith, Ali Omar..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold outline-none focus:border-brand-accent/50 min-h-[100px]"
                    value={studentNames}
                    onChange={(e) => setStudentNames(e.target.value)}
                  />
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
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="max-w-[420px] mx-auto flex justify-center">
          <button 
            onClick={onBack}
            className="pointer-events-auto flex items-center gap-2 px-6 py-4 bg-brand-surface border border-brand-border rounded-2xl shadow-xl font-black uppercase tracking-widest text-[10px] hover:text-brand-accent transition-all active:scale-95"
          >
            <ArrowLeft size={14} />
            Student View
          </button>
        </div>
      </div>
    </div>
  );
};

const UserPersona = ({ initial }: { initial: string }) => (
  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-brand-accent to-brand-accent/50 flex items-center justify-center text-white font-black text-xl">
    {initial}
  </div>
);

const ArrowLeftIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
