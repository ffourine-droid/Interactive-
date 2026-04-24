import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  BarChart3, 
  Calendar, 
  Search,
  ArrowLeft,
  GraduationCap,
  MessageSquare,
  Eye,
  Check,
  AlertCircle,
  FileText,
  TrendingUp,
  Award,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface Question {
  id: string;
  type: 'mcq' | 'short_answer' | 'photo';
  text: string;
  options: string[];
  correct_option: number | null;
}

interface Assignment {
  id: string;
  short_code: string;
  title: string;
  subject: string;
  grade: string;
  class_name: string;
  due_date: string;
  questions: Question[];
  created_at: string;
  expected_students: string[];
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  answers: Record<string, any>;
  submitted_at: string;
  score: number | null;
  status: 'pending' | 'graded';
  teacher_comment?: string;
}

export const TeacherDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState<{ score: string; comment: string }>({ score: '', comment: '' });
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherData();

    // Subscribe to new submissions
    const submissionSubscription = supabase
      .channel('teacher-dashboard-submissions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, (payload) => {
        setSubmissions(prev => [payload.new as Submission, ...prev]);
        showToast("New submission received!", "info");
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'submissions' }, (payload) => {
        setSubmissions(prev => prev.map(s => s.id === payload.new.id ? payload.new as Submission : s));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionSubscription);
    };
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    const teacherId = localStorage.getItem('azilearn_teacher_id');
    
    try {
      let assignmentsQuery = supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (teacherId) {
        assignmentsQuery = assignmentsQuery.eq('teacher_id', teacherId);
      }

      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) throw assignmentsError;

      // For submissions, we fetch all that belong to the teacher's assignments
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      
      let submissionsQuery = supabase
        .from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (assignmentIds.length > 0) {
        submissionsQuery = submissionsQuery.in('assignment_id', assignmentIds);
      } else if (teacherId) {
        // If teacher has assignments but none found (shouldn't happen with filter above)
        // or just no assignments yet, return empty submissions
        setSubmissions([]);
        setAssignments(assignmentsData || []);
        setLoading(false);
        return;
      }

      const { data: submissionsData, error: submissionsError } = await submissionsQuery;

      if (submissionsError) throw submissionsError;

      setAssignments(assignmentsData || []);
      setSubmissions(submissionsData || []);
    } catch (err: any) {
      showToast("Error loading dashboard: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsGraded = async () => {
    if (!gradingSubmission) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'graded',
          score: parseInt(gradeInput.score) || gradingSubmission.score,
          teacher_comment: gradeInput.comment
        })
        .eq('id', gradingSubmission.id);

      if (error) throw error;

      showToast("Submission marked as graded!", "success");
      setGradingSubmission(null);
      setGradeInput({ score: '', comment: '' });
      fetchTeacherData();
    } catch (err: any) {
      showToast("Failed to update: " + err.message, "error");
    }
  };

  const calculateStats = () => {
    const totalAssignments = assignments.length;
    const today = new Date().toISOString().split('T')[0];
    const submissionsToday = submissions.filter(s => s.submitted_at.startsWith(today)).length;
    
    const gradedMcqSubmissions = submissions.filter(s => s.score !== null && s.status === 'graded');
    const avgScore = gradedMcqSubmissions.length > 0 
      ? Math.round(gradedMcqSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / gradedMcqSubmissions.length)
      : 0;

    return { totalAssignments, submissionsToday, avgScore };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-accent" size={48} />
        <p className="text-brand-muted font-bold animate-pulse">Loading Teacher Portal...</p>
      </div>
    );
  }

  if (selectedAssignment) {
    const assignmentSubmissions = submissions.filter(s => s.assignment_id === selectedAssignment.id);
    const submittedStudentNames = assignmentSubmissions.map(s => s.student_name.toLowerCase());
    const missingStudents = selectedAssignment.expected_students.filter(
      name => !submittedStudentNames.includes(name.toLowerCase())
    );

    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-20 p-4">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedAssignment(null)}
              className="p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-brand-accent"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{selectedAssignment.title}</h1>
              <p className="text-sm font-bold text-brand-muted uppercase tracking-widest">{selectedAssignment.class_name} • {selectedAssignment.subject}</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
             <Users className="shrink-0" size={18} />
             <span className="font-black text-sm">{assignmentSubmissions.length} / {selectedAssignment.expected_students.length || '?'} Submissions</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted px-2">Submissions</h2>
            <div className="space-y-4">
              {assignmentSubmissions.length === 0 ? (
                <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2rem] p-12 text-center text-brand-muted">
                   <p className="font-bold">No submissions yet.</p>
                </div>
              ) : (
                assignmentSubmissions.map(s => (
                  <motion.div 
                    key={s.id}
                    layoutId={s.id}
                    className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-sm hover:border-brand-accent/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-brand-border pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent font-black">
                          {s.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{s.student_name}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Submitted {new Date(s.submitted_at).toLocaleDateString()} at {new Date(s.submitted_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.score !== null && (
                          <div className="bg-brand-bg px-4 py-2 rounded-xl border border-brand-border">
                            <span className="text-xs font-black text-brand-accent">Score: {s.score}%</span>
                          </div>
                        )}
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.status === 'graded' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {selectedAssignment.questions.map(q => (
                        <div key={q.id} className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-2">
                            <FileText size={12} />
                            {q.text}
                          </p>
                          <div className="pl-5 border-l-2 border-brand-border">
                            {q.type === 'mcq' && (
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-sm">Student Answer: <span className="text-brand-accent">{q.options[s.answers[q.id]] || 'None'}</span></span>
                                {parseInt(s.answers[q.id]) === q.correct_option ? (
                                  <CheckCircle2 className="text-emerald-500" size={16} />
                                ) : (
                                  <AlertCircle className="text-red-500" size={16} />
                                )}
                              </div>
                            )}
                            {q.type === 'short_answer' && (
                              <p className="font-bold text-sm bg-brand-bg/50 p-3 rounded-xl border border-brand-border">{s.answers[q.id] || 'No response'}</p>
                            )}
                            {q.type === 'photo' && s.answers[q.id] && (
                              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-brand-border group cursor-pointer" onClick={() => setViewingImage(s.answers[q.id])}>
                                <img src={s.answers[q.id]} className="w-full h-full object-cover" alt="Student work" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="text-white" size={24} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {s.status === 'pending' && (
                      <button 
                        onClick={() => {
                          setGradingSubmission(s);
                          setGradeInput({ score: s.score?.toString() || '', comment: '' });
                        }}
                        className="mt-6 w-full py-4 bg-brand-bg border-2 border-brand-accent border-dashed rounded-2xl font-black uppercase tracking-widest text-brand-accent hover:bg-brand-accent/5 transition-all flex items-center justify-center gap-2"
                      >
                        <GraduationCap size={18} />
                        Mark as Graded
                      </button>
                    )}

                    {s.teacher_comment && (
                      <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                         <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="text-blue-500" size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Teacher's Feedback</span>
                         </div>
                         <p className="text-sm font-bold italic text-brand-text/80">"{s.teacher_comment}"</p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted px-2">Missing Submissions ({missingStudents.length})</h2>
            <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 space-y-4">
              {missingStudents.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-brand-muted font-bold text-sm">Everyone has submitted! 🎉</p>
                </div>
              ) : (
                missingStudents.map((name, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 font-bold text-xs uppercase">
                      {name.charAt(0)}
                    </div>
                    <span className="font-bold text-sm text-red-800">{name}</span>
                  </div>
                ))
              )}
              {selectedAssignment.expected_students.length === 0 && (
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-brand-muted italic">No class roll call provided</p>
              )}
            </div>
          </div>
        </div>

        {/* Grading Modal */}
        <AnimatePresence>
          {gradingSubmission && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
                onClick={() => setGradingSubmission(null)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
              >
                <h3 className="text-2xl font-black tracking-tight mb-2">Grading {gradingSubmission.student_name}</h3>
                <p className="text-brand-muted text-sm font-bold mb-6">Provide a score and feedback for this student.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Score (%)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 85"
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                      value={gradeInput.score}
                      onChange={e => setGradeInput({...gradeInput, score: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Teacher Comment</label>
                    <textarea 
                      placeholder="Great job on the MCQ part! Practice more on..."
                      rows={4}
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm resize-none"
                      value={gradeInput.comment}
                      onChange={e => setGradeInput({...gradeInput, comment: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={handleMarkAsGraded}
                    className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Confirm Grade
                  </button>
                  <button 
                    onClick={() => setGradingSubmission(null)}
                    className="w-full py-4 text-brand-muted font-bold text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Image Portal */}
        <AnimatePresence>
          {viewingImage && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewingImage(null)}>
              <motion.img 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                src={viewingImage} 
                className="max-w-full max-h-full object-contain rounded-xl"
              />
              <button className="absolute top-6 right-6 p-4 text-white hover:bg-white/10 rounded-full transition-colors">
                 <ArrowLeft className="rotate-90" />
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4 pt-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-brand-accent/10 rounded-full border border-brand-accent/10">
              <span className="text-[10px] font-black tracking-widest text-brand-accent uppercase">AziLearn Teacher Portal</span>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Daily Overview</h1>
          <p className="text-brand-muted font-medium">Hello Teacher! Here's what's happening today.</p>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-3 px-6 py-4 bg-brand-surface border border-brand-border rounded-2xl font-black uppercase tracking-widest hover:bg-brand-bg transition-all"
        >
          <ArrowLeft size={18} />
          Student View
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-4 shadow-sm group hover:scale-[1.02] transition-transform">
          <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-colors">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Active Assignments</p>
            <h3 className="text-3xl font-black">{stats.totalAssignments}</h3>
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-4 shadow-sm group hover:scale-[1.02] transition-transform">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Received Today</p>
            <h3 className="text-3xl font-black">{stats.submissionsToday}</h3>
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-4 shadow-sm group hover:scale-[1.02] transition-transform">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Avg Class MCQ Score</p>
            <h3 className="text-3xl font-black">{stats.avgScore}%</h3>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
            <BarChart3 size={14} />
            Assignments Manager
          </h2>
          <div className="flex items-center gap-2">
             <div className="relative hidden sm:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted/40" size={14} />
               <input type="text" placeholder="Search classes..." className="bg-brand-surface border border-brand-border rounded-xl py-2 pl-9 pr-4 text-xs font-bold outline-none focus:border-brand-accent/50" />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {assignments.map((assignment) => {
              const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
              const pendingCount = assignmentSubmissions.filter(s => s.status === 'pending').length;
              
              return (
                <motion.div 
                  key={assignment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedAssignment(assignment)}
                  className="group bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 cursor-pointer hover:border-brand-accent shadow-sm transition-all hover:shadow-xl hover:shadow-brand-accent/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-0 group-hover:opacity-10 opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
                     <GraduationCap size={120} className="text-brand-accent" />
                  </div>

                  <div className="relative space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-brand-accent/10 rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">{assignment.grade}</span>
                      </div>
                      <div className="px-3 py-1 bg-brand-bg border border-brand-border rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{assignment.subject}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black tracking-tight mb-2 group-hover:text-brand-accent transition-colors">{assignment.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-brand-muted">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Users size={14} />
                          {assignment.class_name}
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-brand-accent text-xs">
                          <FileText size={14} />
                          Code: {assignment.short_code}
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Calendar size={14} />
                          Due {new Date(assignment.due_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-4 border-t border-brand-border/50">
                      <div>
                        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Submission Progress</p>
                        <div className="flex items-center gap-3">
                          <div className="w-48 h-3 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(assignmentSubmissions.length / (assignment.expected_students.length || 1)) * 100}%` }}
                              className="h-full bg-brand-accent" 
                            />
                          </div>
                          <span className="text-xs font-black">{assignmentSubmissions.length} / {assignment.expected_students.length || '?'}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {pendingCount > 0 && (
                          <div className="px-3 py-1 bg-amber-500 rounded-lg animate-pulse">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{pendingCount} New</span>
                          </div>
                        )}
                        <div className="w-10 h-10 bg-brand-bg border border-brand-border rounded-xl flex items-center justify-center text-brand-muted group-hover:bg-brand-accent group-hover:text-white transition-all">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
