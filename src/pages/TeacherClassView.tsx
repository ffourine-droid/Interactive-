import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Loader2, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Award,
  FileText,
  Plus,
  ShieldCheck,
  Settings,
  ListTodo
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ParentCodeTable } from '../components/ParentCodeTable';
import { StudentManager } from '../components/StudentManager';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  due_date: string;
  questions: any[];
  expected_students: string[];
}

interface Submission {
  id: string;
  assignment_id: string;
  student_name: string;
  submitted_at: string;
  score: number | null;
  status: 'pending' | 'graded';
  answers: Record<string, any>;
  teacher_comment?: string;
}

interface TeacherClassViewProps {
  classId: string;
  className: string;
  onBack: () => void;
  onAddAssignment: () => void;
}

interface Student {
  id: string;
  name: string;
  parent_code?: string;
}

interface Teacher {
  id: string;
  name: string;
  school_name: string;
}

interface Acknowledgement {
  assignment_id: string;
  student_id: string;
  acknowledged_at: string;
}

export const TeacherClassView: React.FC<TeacherClassViewProps> = ({ classId, className, onBack, onAddAssignment }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showParentCodes, setShowParentCodes] = useState(false);
  const [viewMode, setViewMode] = useState<'assignments' | 'students'>('assignments');
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  useEffect(() => {
    fetchInitialData();

    // Subscribe to submissions for this class
    const submissionChannel = supabase
      .channel(`class-${classId}-submissions`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'submissions' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSubmissions(prev => [payload.new as Submission, ...prev]);
          showToast("New submission received!", "info");
        } else if (payload.eventType === 'UPDATE') {
          setSubmissions(prev => prev.map(s => s.id === payload.new.id ? payload.new as Submission : s));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionChannel);
    };
  }, [classId]);

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;
    const score = parseInt(gradeInput);
    if (isNaN(score) || score < 0 || score > 100) {
      showToast("Please enter a valid score (0-100)", "error");
      return;
    }

    setGradingLoading(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ 
          score,
          teacher_comment: feedbackInput,
          status: 'graded'
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      
      showToast("Submission graded successfully!", "success");
      setSelectedSubmission(null);
    } catch (err: any) {
      showToast("Error grading submission: " + err.message, "error");
    } finally {
      setGradingLoading(false);
    }
  };

  const openSubmissionDetails = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeInput(submission.score?.toString() || '');
    setFeedbackInput(submission.teacher_comment || '');
  };

  const fetchInitialData = async () => {
    if (students.length === 0) {
      setLoading(true);
    }
    const teacherData = localStorage.getItem('azilearn_teacher');
    if (!teacherData) return;
    const tData = JSON.parse(teacherData);
    const teacherId = tData.id;

    try {
      // 1. Fetch assignments, students, and teacher info in parallel
      const [assignmentsRes, studentsRes, teacherRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, subject, questions, grade, due_date, class_id, expected_students, created_at')
          .eq('teacher_id', teacherId)
          .eq('class_id', classId)
          .order('created_at', { ascending: false }),
        supabase
          .from('students')
          .select('id, name, parent_code, grade')
          .eq('class_id', classId),
        supabase
          .from('teachers')
          .select('id, name, school_name')
          .eq('id', teacherId)
          .single()
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (teacherRes.error) throw teacherRes.error;

      const assignmentsData = assignmentsRes.data || [];
      const studentsData = studentsRes.data || [];
      const studentIds = studentsData.map(s => s.id);
      
      setAssignments(assignmentsData);
      setStudents(studentsData);
      setTeacher(teacherRes.data);

      // 2. Fetch submissions and acknowledgements only for these students/assignments
      if (assignmentsData.length > 0) {
        const assignmentIds = assignmentsData.map(a => a.id);
        const [submissionsRes, acksRes] = await Promise.all([
          supabase
            .from('submissions')
            .select('id, assignment_id, student_id, student_name, answers, score, teacher_comment, status, submitted_at')
            .in('assignment_id', assignmentIds),
          supabase
            .from('parent_acknowledgements')
            .select('assignment_id, student_id, acknowledged_at')
            .in('assignment_id', assignmentIds)
        ]);

        if (submissionsRes.error) throw submissionsRes.error;
        if (acksRes.error) throw acksRes.error;

        setSubmissions(submissionsRes.data || []);
        setAcknowledgements(acksRes.data || []);
      }
    } catch (err: any) {
      console.error("Error loading class data:", err);
      showToast("Error loading data: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-accent/20" size={48} />
        <p className="text-brand-muted font-bold animate-pulse">Loading {className}...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-20 p-4">
      <header className="max-w-4xl mx-auto py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-brand-accent transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-4xl font-black tracking-tight">{className}</h1>
              <p className="text-brand-muted text-sm font-bold uppercase tracking-widest mt-1">
                {viewMode === 'assignments' ? 'Class Overview & Assignments' : 'Manage Students & Index Nos'}
              </p>
            </div>
          </div>

          <div className="flex bg-brand-surface border border-brand-border p-1 rounded-2xl">
            <button 
              onClick={() => setViewMode('assignments')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'assignments' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
            >
              <ListTodo size={14} />
              Assignments
            </button>
            <button 
              onClick={() => setViewMode('students')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'students' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
            >
              <Users size={14} />
              Students
            </button>
          </div>
        </div>

        {viewMode === 'assignments' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-8">
            <button 
              onClick={onAddAssignment}
              className="px-6 py-3 bg-brand-accent text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Assignment
            </button>
            <div className="bg-brand-accent/10 text-brand-accent px-4 py-2 rounded-2xl border border-brand-accent/10 flex items-center gap-2 h-max">
              <Users size={16} />
              <span className="font-black text-sm">{assignments.length} assignments</span>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {viewMode === 'students' ? (
          <section className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Student Management</h2>
                <p className="text-brand-muted text-[10px] font-black uppercase tracking-widest mt-1">Register new students or update names</p>
              </div>
              <button 
                onClick={() => setShowParentCodes(!showParentCodes)}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${showParentCodes ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-bg text-brand-muted border-brand-border'}`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={12} />
                  {showParentCodes ? 'Viewing Codes' : 'Show Parent Codes'}
                </div>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showParentCodes ? (
                <motion.div
                  key="codes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ParentCodeTable 
                    students={students} 
                    className={className} 
                    teacher={teacher}
                    onUpdate={fetchInitialData}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="manager"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StudentManager 
                    classId={classId} 
                    grade={assignments[0]?.grade || students[0]?.grade} 
                    schoolName={teacher?.school_name}
                    onUpdate={fetchInitialData}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        ) : (
          <>
            {/* Class Members Summary Section */}
            <section className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
              <Users size={14} />
              Class Members ({students.length})
            </h2>
            <button 
              onClick={() => setShowParentCodes(!showParentCodes)}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${showParentCodes ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-bg text-brand-muted border-brand-border'}`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={12} />
                {showParentCodes ? 'Hide Access Codes' : 'Show Parent Codes'}
              </div>
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            {showParentCodes ? (
              <motion.div
                key="codes"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ParentCodeTable 
                  students={students} 
                  className={className} 
                  teacher={teacher}
                  onUpdate={fetchInitialData}
                />
              </motion.div>
            ) : (
              <motion.div 
                key="members"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-2"
              >
                {students.map(student => (
                  <div key={student.id} className="flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-border rounded-xl">
                    <div className="w-8 h-8 bg-brand-surface border border-brand-border rounded-lg flex items-center justify-center text-[10px] font-black text-brand-accent font-mono">
                      {student.parent_code}
                    </div>
                    <span className="text-sm font-bold text-brand-muted">{student.name}</span>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-xs font-bold text-brand-muted/60 italic p-2 px-4">No students added to this class yet. Add some when creating an assignment!</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2 px-2">
            <FileText size={14} />
            Assignments
          </h2>
          {assignments.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] p-12 text-center text-brand-muted">
             <p className="font-bold font-lg">No assignments for this class.</p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
            const isExpanded = expandedAssignment === assignment.id;
            
            // Use the class students as the base for status if assignment doesn't have its own list
            // User requested students to be stored in DB, so we prefer the class-level student list.
            const studentList = students.length > 0 ? students.map(s => s.name) : assignment.expected_students;
            
            const submissionPercentage = studentList.length > 0 
              ? Math.round((assignmentSubmissions.length / studentList.length) * 100) 
              : 0;

            const assignmentAcks = acknowledgements.filter(a => a.assignment_id === assignment.id);
            const ackPercentage = studentList.length > 0
              ? Math.round((assignmentAcks.length / studentList.length) * 100)
              : 0;

            return (
              <div 
                key={assignment.id} 
                className="bg-brand-surface border border-brand-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedAssignment(isExpanded ? null : assignment.id)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-black tracking-tight">{assignment.title}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mt-1">{assignment.subject} • Due {new Date(assignment.due_date).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                       <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <FileText size={10} />
                            Submissions: {assignmentSubmissions.length} / {studentList.length}
                          </span>
                          <div className="w-24 sm:w-32 h-2 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                             <div 
                               className="h-full bg-emerald-500 transition-all duration-1000" 
                               style={{ width: `${submissionPercentage}%` }}
                             />
                          </div>
                       </div>

                       <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <ShieldCheck size={10} />
                            Parents: {assignmentAcks.length} / {studentList.length}
                          </span>
                          <div className="w-24 sm:w-32 h-2 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                             <div 
                               className="h-full bg-brand-accent transition-all duration-1000" 
                               style={{ width: `${ackPercentage}%` }}
                             />
                          </div>
                       </div>

                       <div className="text-brand-muted">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-brand-border bg-brand-bg/30"
                    >
                      <div className="p-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted mb-4 px-1">Student Status</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {students.map((student) => {
                            const submission = assignmentSubmissions.find(s => s.student_name.toLowerCase() === student.name.toLowerCase());
                            const ack = assignmentAcks.find(a => a.student_id === student.id);

                            return (
                              <div 
                                key={student.id}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${submission ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${submission ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                    {submission ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-brand-accent font-mono text-[10px] bg-brand-surface border border-brand-border px-1.5 py-0.5 rounded-md min-w-[36px] text-center">
                                        {student.parent_code}
                                      </span>
                                      <p className={`font-bold text-sm ${submission ? 'text-emerald-900' : 'text-red-900'}`}>{student.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      {ack ? (
                                        <div className="flex items-center gap-1 group relative">
                                          <ShieldCheck size={10} className="text-brand-accent" />
                                          <span className="text-[8px] font-black text-brand-accent uppercase tracking-widest">Parent Confirmed</span>
                                          {/* Tooltip */}
                                          <div className="absolute bottom-full left-0 mb-2 invisible group-hover:visible bg-brand-text text-white text-[8px] py-1 px-2 rounded-lg whitespace-nowrap z-10">
                                            {new Date(ack.acknowledged_at).toLocaleDateString()} at {new Date(ack.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <Clock size={10} className="text-brand-muted" />
                                          <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest">No Parent Ack</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {submission && (
                                    <button 
                                      onClick={() => openSubmissionDetails(submission)}
                                      className="p-2 bg-white border border-brand-border rounded-lg text-brand-muted hover:text-brand-accent transition-all active:scale-95"
                                    >
                                      <FileText size={14} />
                                    </button>
                                  )}
                                  {submission && submission.score !== null && (
                                    <div className="bg-emerald-500 text-white px-2 py-1.5 rounded-lg flex items-center gap-1 min-w-[48px] justify-center">
                                      <Award size={10} />
                                      <span className="text-[9px] font-black">{submission.score}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {studentList.length === 0 && (
                          <div className="text-center py-4 bg-brand-bg/50 rounded-2xl border border-brand-border border-dashed">
                             <p className="text-xs font-bold text-brand-muted">No student list provided for this class.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
        </div>
      </>
    )}
  </main>

      {/* Submission Details Overlay */}
      <AnimatePresence>
        {selectedSubmission && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-brand-bg/80 backdrop-blur-md p-4 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <header className="p-8 border-b border-brand-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center text-white font-black text-xl">
                    {selectedSubmission.student_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {students.find(s => s.name === selectedSubmission.student_name)?.parent_code && (
                        <span className="font-black text-brand-accent font-mono text-sm bg-brand-bg border border-brand-border px-2 py-1 rounded-lg">
                          {students.find(s => s.name === selectedSubmission.student_name)?.parent_code}
                        </span>
                      )}
                      <h2 className="text-2xl font-black tracking-tight">{selectedSubmission.student_name}</h2>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Grading Submission</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-3 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-red-500 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-6">
                  {assignments.find(a => a.id === selectedSubmission.assignment_id)?.questions.map((q: any, idx: number) => (
                    <div key={q.id} className="bg-brand-bg/50 rounded-3xl p-6 border border-brand-border/50">
                      <div className="flex items-start gap-4 mb-4">
                        <span className="text-[10px] font-black text-brand-accent bg-brand-accent/10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">{idx + 1}</span>
                        <h4 className="font-bold text-sm leading-tight pt-0.5">{q.text}</h4>
                      </div>
                      <div className="pl-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Student Answer</p>
                        {q.type === 'mcq' ? (
                          <div className="flex items-center gap-2">
                             <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${parseInt(selectedSubmission.answers[q.id]) === q.correct_option ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                               {q.options[parseInt(selectedSubmission.answers[q.id])]}
                             </div>
                             {parseInt(selectedSubmission.answers[q.id]) === q.correct_option ? (
                               <CheckCircle2 size={16} className="text-emerald-500" />
                             ) : (
                               <XCircle size={16} className="text-red-500" />
                             )}
                          </div>
                        ) : q.type === 'photo' ? (
                          <div className="space-y-2">
                            <img 
                              src={selectedSubmission.answers[q.id]} 
                              alt="Student work" 
                              className="rounded-2xl border border-brand-border w-full max-w-sm object-cover shadow-sm cursor-zoom-in"
                              onClick={() => window.open(selectedSubmission.answers[q.id], '_blank')}
                            />
                            <p className="text-[10px] italic text-brand-muted">Click image to expand</p>
                          </div>
                        ) : (
                          <p className="font-bold text-brand-text italic bg-brand-surface p-4 rounded-xl border border-brand-border/50">{selectedSubmission.answers[q.id] || 'No answer provided'}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <section className="bg-brand-accent/5 border border-brand-accent/20 rounded-[2rem] p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <Award className="text-brand-accent" size={24} />
                    <h3 className="text-lg font-black tracking-tight">Grade & Feedback</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Score (0-100)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={gradeInput}
                        onChange={e => setGradeInput(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-accent/20 rounded-2xl py-4 px-6 font-black text-xl text-brand-accent outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all"
                        placeholder="--"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Teacher Feedback</label>
                      <textarea 
                        value={feedbackInput}
                        onChange={e => setFeedbackInput(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-accent/20 rounded-2xl py-4 px-6 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all min-h-[100px] resize-none"
                        placeholder="Great effort! Keep it up..."
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleGradeSubmission}
                    disabled={gradingLoading}
                    className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {gradingLoading ? <Loader2 className="animate-spin" size={20} /> : <Award size={20} />}
                    Finalize Grade
                  </button>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
