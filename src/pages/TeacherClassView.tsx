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
  ListTodo,
  Save,
  Swords,
  FolderOpen,
  School
} from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ParentCodeTable } from '../components/ParentCodeTable';
import { StudentManager } from '../components/StudentManager';
import { TeacherCompetitionManager } from '../components/TeacherCompetitionManager';
import { TeacherMaterialsUpload } from '../components/TeacherMaterialsUpload';
import { MaterialsList } from '../components/MaterialsList';

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
  parent_feedback?: string;
  is_broadcast?: boolean;
}

interface TeacherClassViewProps {
  classId: string;
  className: string;
  onBack: () => void;
  onAddAssignment: (classId: string) => void;
  onAddExam: (classId: string) => void;
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

const TeacherClassView: React.FC<TeacherClassViewProps> = ({ classId, className, onBack, onAddAssignment, onAddExam }) => {
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
  const [exams, setExams] = useState<any[]>([]);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'assignments' | 'students' | 'exams' | 'groupwork' | 'materials' | 'broadcasts'>('assignments');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedExamAttempt, setSelectedExamAttempt] = useState<any | null>(null);
  const [gradingExam, setGradingExam] = useState(false);
  const [showParentCodes, setShowParentCodes] = useState(false);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [replyInput, setReplyInput] = useState<string>('');

  useEffect(() => {
    fetchInitialData();

    // Subscribe to submissions for this class
    const submissionChannel = supabase
      .channel(`class-${classId}-realtime`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'assignment_submissions' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSubmissions(prev => [payload.new as Submission, ...prev]);
          showToast("New assessment submission received!", "info");
        } else if (payload.eventType === 'UPDATE') {
          setSubmissions(prev => prev.map(s => s.id === payload.new.id ? payload.new as Submission : s));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exam_attempts'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setExamAttempts(prev => [payload.new, ...prev]);
          showToast("New assessment attempt received!", "info");
        } else if (payload.eventType === 'UPDATE') {
          setExamAttempts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionChannel);
    };
  }, [classId]);

  const [classGrade, setClassGrade] = useState<string>('');

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
        .from('assignment_submissions')
        .update({ 
          score,
          teacher_comment: feedbackInput,
          teacher_reply: replyInput,
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
    setGradeInput((submission.score === null || isNaN(submission.score as number)) ? '' : submission.score.toString());
    setFeedbackInput(submission.teacher_comment || '');
    setReplyInput((submission as any).teacher_reply || '');
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
      // Set the teacher_id session config inside Postgres before running queries/RPCs
      await setTeacherConfig(teacherId);

      // 1. Fetch assignments, students, exams, teacher info, and class info in parallel
      const [assignmentsRes, studentsRes, teacherRes, examsRes, classRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, subject, questions, grade, due_date, class_id, expected_students, created_at, share_code, is_broadcast')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false }),
        (async () => {
          try {
            const { data, error } = await supabase.rpc('teacher_get_class_students', {
              p_teacher_id: teacherId,
              p_class_id: classId
            });
            if (!error && data) {
              let fetchedStudents: any[] = [];
              if (Array.isArray(data)) {
                fetchedStudents = data;
              } else if (typeof data === 'object') {
                const innerArray = Object.values(data).find(v => Array.isArray(v));
                if (innerArray) {
                  fetchedStudents = innerArray as any[];
                } else if ((data as any).id) {
                  fetchedStudents = [data];
                }
              }
              return { data: fetchedStudents, error: null };
            }
          } catch (e) {
            console.warn("RPC student load failed in ClassView:", e);
          }
          return { data: [], error: null };
        })(),
        supabase
          .from('teachers')
          .select('id, name, school_name')
          .eq('id', teacherId)
          .maybeSingle(),
        supabase
          .from('exams')
          .select('*')
          .eq('class_id', classId)
          .order('created_at', { ascending: false }),
        supabase
          .from('classes')
          .select('id, name, grade')
          .eq('id', classId)
          .maybeSingle()
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (teacherRes.error) throw teacherRes.error;
      if (examsRes.error) throw examsRes.error;

      const assignmentsData = assignmentsRes.data || [];
      const studentsData = studentsRes.data || [];
      const examsData = examsRes.data || [];
      
      setAssignments(assignmentsData);
      setStudents(studentsData);
      setTeacher(teacherRes.data);
      setExams(examsData);
      if (classRes && !classRes.error && classRes.data) {
        setClassGrade(classRes.data.grade || '');
      }

      // 2. Fetch submissions, acknowledgements, and exam attempts only for these students/assignments/exams
      const examIds = examsData.map(e => e.id);
      
      const fetchSubmissionsAndAcks = [
        supabase.from('assignment_submissions').select('*').eq('teacher_id', teacherId),
        assignmentsData.length > 0 ? supabase
          .from('parent_acknowledgements')
          .select('assignment_id, student_id, acknowledged_at')
          .in('assignment_id', assignmentsData.map(a => a.id))
          : Promise.resolve({ data: [], error: null })
      ];

      const fetchExamAttempts = examIds.length > 0 ? supabase
        .from('exam_attempts')
        .select('*')
        .in('exam_id', examIds) : Promise.resolve({ data: [], error: null });

      const [submissionsRes, acksRes, examAttemptsRes] = await Promise.all([
        ...fetchSubmissionsAndAcks,
        fetchExamAttempts
      ] as any);

      if (submissionsRes.error) throw submissionsRes.error;
      if (acksRes.error) throw acksRes.error;
      if (examAttemptsRes.error) throw examAttemptsRes.error;

      let fetchedSubmissions: Submission[] = [];
      if (submissionsRes.data) {
        if (submissionsRes.data.success) {
          fetchedSubmissions = submissionsRes.data.submissions || [];
        } else if (Array.isArray(submissionsRes.data)) {
          fetchedSubmissions = submissionsRes.data;
        }
      }

      setSubmissions(fetchedSubmissions);
      setAcknowledgements(acksRes.data || []);
      setExamAttempts(examAttemptsRes.data || []);
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
                className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-brand-accent transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-black tracking-tight">{className}</h1>
                <p className="text-brand-muted text-[10px] font-black uppercase tracking-wider mt-1 whitespace-nowrap">
                  Class Profile & Results
                </p>
              </div>
            </div>

            <div className="flex bg-brand-surface border border-brand-border p-1 rounded-2xl overflow-x-auto no-scrollbar whitespace-nowrap">
              <button 
                onClick={() => setViewMode('assignments')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${viewMode === 'assignments' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <ListTodo size={14} />
                Work
              </button>
              <button 
                onClick={() => setViewMode('exams')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${viewMode === 'exams' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <Award size={14} />
                Assessments
              </button>
              <button 
                onClick={() => setViewMode('groupwork')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${viewMode === 'groupwork' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <Users size={14} />
                Groups
              </button>
              <button 
                onClick={() => setViewMode('materials')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${viewMode === 'materials' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <FolderOpen size={14} />
                Materials
              </button>
              <button 
                onClick={() => setViewMode('students')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${viewMode === 'students' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <Users size={14} />
                Roster
              </button>
              <button 
                onClick={() => setViewMode('broadcasts')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${viewMode === 'broadcasts' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <School size={14} />
                Broadcasts
              </button>
            </div>
          </div>

          {viewMode !== 'students' && viewMode !== 'materials' && viewMode !== 'broadcasts' && (
            <div className="flex bg-brand-surface border border-brand-border p-2 rounded-2xl justify-end gap-2 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => onAddAssignment(classId)}
                className="px-4 py-2.5 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Assignment
              </button>
              <button 
                onClick={() => onAddExam(classId)}
                className="px-4 py-2.5 bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-accent rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Assessment
              </button>
            </div>
          )}
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {viewMode === 'students' ? (
          <section className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-brand-text">Student Management</h2>
                <p className="text-brand-muted text-[10px] font-black uppercase tracking-wider mt-1 whitespace-nowrap">Register new students or update names</p>
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
                    grade={classGrade || assignments[0]?.grade || (students[0] as any)?.grade} 
                    schoolName={teacher?.school_name}
                    onUpdate={fetchInitialData}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        ) : viewMode === 'groupwork' ? (
          <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
            <TeacherCompetitionManager 
              teacherId={teacher?.id || ''} 
              classId={classId} 
              grade={assignments[0]?.grade || students[0]?.grade || 'Grade 7'}
            />
          </div>
        ) : viewMode === 'exams' ? (
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-brand-muted flex items-center gap-2 px-2 whitespace-nowrap">
              <Award size={14} />
              Published Assessments
            </h2>
            {exams.length === 0 ? (
              <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] p-12 text-center text-brand-muted">
                <p className="font-bold">No assessments created for this class yet.</p>
              </div>
            ) : (
              exams.map((exam) => {
                const attempts = examAttempts.filter(a => a.exam_id === exam.id);
                const isExpanded = expandedAssignment === exam.id; // Reuse expandedAssignment state for exams

                return (
                  <div key={exam.id} className="bg-brand-surface border border-brand-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div 
                      className="p-6 cursor-pointer"
                      onClick={() => setExpandedAssignment(isExpanded ? null : exam.id)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <h3 className="text-xl font-black tracking-tight">{exam.title}</h3>
                          <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted mt-1 truncate">
                            {exam.subject} • {exam.duration_minutes} Mins • {attempts.length} Submissions
                          </p>
                        </div>
                        <div className="text-brand-muted">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted mb-4 px-1">Assessment Results</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {students.map(student => {
                                const attempt = attempts.find(a => a.student_id === student.id);
                                return (
                                  <div key={student.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${attempt ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-brand-bg border-brand-border'}`}>
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${attempt ? 'bg-emerald-500/10 text-emerald-600' : 'bg-brand-muted/10 text-brand-muted'}`}>
                                        {attempt ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                      </div>
                                      <div>
                                        <p className="font-bold text-sm text-brand-text">{student.name}</p>
                                        <p className="text-[8px] font-black text-brand-muted uppercase tracking-widest">
                                          {attempt ? `Scored ${attempt.score}/${attempt.total_marks}` : 'Not attempted'}
                                        </p>
                                      </div>
                                    </div>
                                    {attempt && (
                                      <button 
                                        onClick={() => {
                                          setSelectedExamAttempt(attempt);
                                          setGradeInput((attempt.score === null || isNaN(attempt.score)) ? '' : attempt.score.toString());
                                          setFeedbackInput(attempt.teacher_feedback || '');
                                          setReplyInput(attempt.teacher_reply || '');
                                        }}
                                        className="p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-brand-accent"
                                      >
                                        <Award size={14} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        ) : viewMode === 'materials' ? (
          <div className="space-y-6">
            <TeacherMaterialsUpload 
              teacherId={teacher?.id || ''}
              classId={classId}
              grade={assignments[0]?.grade || students[0]?.grade || 'Grade 7'}
              subject={assignments[0]?.subject || 'General'}
              onUploaded={() => setRefreshKey(prev => prev + 1)}
            />
            
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6.5 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6 px-1.5">
                <div>
                  <h3 className="font-display text-base font-bold text-brand-text">Shared Class Materials</h3>
                  <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider mt-0.5">Documents visible to students in this class</p>
                </div>
              </div>
              <MaterialsList 
                teacherId={teacher?.id || ''}
                classId={classId}
                isTeacher={true}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        ) : viewMode === 'broadcasts' ? (
          <div className="space-y-6">
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6.5 md:p-8 shadow-sm">
              <div className="mb-6 px-1.5">
                <h3 className="font-display text-lg font-black text-brand-text">School Broadcast Submissions</h3>
                <p className="text-xs text-brand-muted font-bold mt-1">Submissions from school-wide holiday assignments routed automatically to you.</p>
              </div>
              
              {(() => {
                const broadcastSubs = submissions.filter(s => {
                  if (s.is_broadcast) return true;
                  const asgn = assignments.find(a => a.id === s.assignment_id);
                  return asgn?.is_broadcast === true;
                });

                if (broadcastSubs.length === 0) {
                  return (
                    <div className="text-center py-12 bg-brand-bg/50 rounded-2xl border border-brand-border border-dashed text-brand-muted">
                      <School className="mx-auto mb-3 opacity-30" size={32} />
                      <p className="font-bold text-sm">No broadcast submissions found yet.</p>
                      <p className="text-[10px] opacity-60 mt-1">When students submit broadcast assignments for your grades, they'll appear here.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {broadcastSubs.map((sub) => {
                      const asgn = assignments.find(a => a.id === sub.assignment_id);
                      const formattedDate = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A';
                      
                      return (
                        <div key={sub.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-brand-bg/40 border border-brand-border/60 rounded-2xl hover:border-brand-accent/50 transition-all gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-brand-text">{sub.student_name}</span>
                              <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15 flex items-center gap-1">
                                📢 Broadcast
                              </span>
                              {sub.status === 'graded' ? (
                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                                  Graded
                                </span>
                              ) : (
                                <span className="text-[8px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/15">
                                  Pending
                                </span>
                              )}
                            </div>
                            
                            <p className="text-xs font-bold text-brand-muted">
                              Assignment: <span className="text-brand-text font-black">{asgn?.title || 'Unknown Assignment'}</span>
                            </p>
                            
                            <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">
                              {asgn?.subject} • {asgn?.grade} • Submitted: {formattedDate}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 self-end md:self-auto">
                            {sub.score !== null && (
                              <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1">
                                <Award size={12} />
                                <span className="text-xs font-black">{sub.score}%</span>
                              </div>
                            )}
                            <button
                              onClick={() => openSubmissionDetails(sub)}
                              className="px-4 py-2 bg-brand-surface hover:bg-brand-accent/10 border border-brand-border hover:border-brand-accent text-brand-muted hover:text-brand-accent rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                            >
                              <FileText size={12} />
                              {sub.status === 'graded' ? 'Review' : 'Grade'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* Class Members Summary Section */}
            <section className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-brand-muted flex items-center gap-2 whitespace-nowrap">
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
                  <div key={student.id} className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg border border-brand-border rounded-xl shrink-0">
                    <div className="w-7 h-7 bg-brand-surface border border-brand-border rounded-lg flex items-center justify-center text-[10px] font-black text-brand-accent font-mono">
                      {student.parent_code}
                    </div>
                    <span className="text-xs font-bold text-brand-muted whitespace-nowrap">{student.name}</span>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-xs font-bold text-brand-muted/60 italic p-2 px-4">No students added to this class yet.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-brand-muted flex items-center gap-2 px-2 whitespace-nowrap">
            <FileText size={14} />
            Assessments
          </h2>
          {(() => {
            const classAssignments = assignments.filter(a => a.class_id === classId);
            if (classAssignments.length === 0) {
              return (
                <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] p-12 text-center text-brand-muted">
                   <p className="font-bold font-lg">No assignments for this class.</p>
                </div>
              );
            }
            return classAssignments.map((assignment) => {
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
                      <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted mt-1 truncate">{assignment.subject} • Due {new Date(assignment.due_date).toLocaleDateString()}</p>
                      
                      {assignment.share_code && (
                        <div className="mt-3 p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center justify-between group/code hover:border-emerald-500 transition-all inline-flex min-w-[120px]"
                             onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(assignment.share_code); showToast("Code copied!", "success"); }}>
                          <div className="flex flex-col pr-4">
                            <span className="text-[7px] font-black uppercase tracking-widest text-brand-muted mb-0.5">Share Code</span>
                            <span className="text-xs font-black tracking-[0.2em] text-emerald-600">{assignment.share_code}</span>
                          </div>
                          <Plus size={12} className="text-emerald-500/40 group-hover/code:text-emerald-500 transition-colors" />
                        </div>
                      )}
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
                            const isMissing = !submission;

                            return (
                              <div 
                                key={student.id}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${submission ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10 shadow-lg shadow-red-500/5 border-2 border-dashed'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${submission ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600 animate-pulse'}`}>
                                    {submission ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-brand-accent font-mono text-[10px] bg-brand-surface border border-brand-border px-1.5 py-0.5 rounded-md min-w-[36px] text-center">
                                        {student.parent_code}
                                      </span>
                                      <p className={`font-bold text-sm ${submission ? 'text-emerald-900' : 'text-red-900'}`}>{student.name}</p>
                                      {isMissing && <span className="bg-red-500 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest">Missing</span>}
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
                                      className="p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-brand-accent transition-all active:scale-95"
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
          });
          })()}
        </div>
      </>
    )}
  </main>

      {/* Assessment Grading Modal */}
      <AnimatePresence>
        {selectedExamAttempt && (
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
                    {students.find(s => s.id === selectedExamAttempt.student_id)?.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">
                      {students.find(s => s.id === selectedExamAttempt.student_id)?.name}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Assessment Results & Feedback</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedExamAttempt(null)}
                  className="p-3 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-red-500 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-[2rem] p-8 space-y-6">
                  {selectedExamAttempt.parent_feedback && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Parent Feedback</span>
                      </div>
                      <p className="text-sm font-bold text-brand-text italic leading-relaxed">
                        "{selectedExamAttempt.parent_feedback}"
                      </p>
                    </div>
                  )}

                  {selectedExamAttempt.parent_feedback && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Teacher's Reply to Parent</label>
                      <textarea 
                        value={replyInput}
                        onChange={e => setReplyInput(e.target.value)}
                        placeholder="Reply to the parent's feedback..."
                        className="w-full bg-brand-bg border border-brand-accent/20 rounded-xl p-4 text-xs font-bold outline-none focus:border-brand-accent transition-all min-h-[80px]"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Award className="text-brand-accent" size={24} />
                    <h3 className="text-lg font-black tracking-tight">Final Assessment</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Score / {selectedExamAttempt.total_marks}</label>
                      <input 
                        type="number"
                        value={gradeInput}
                        onChange={e => setGradeInput(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-accent/20 rounded-2xl py-4 px-6 font-black text-xl text-brand-accent outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Teacher Feedback</label>
                      <textarea 
                        value={feedbackInput}
                        onChange={e => setFeedbackInput(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-accent/20 rounded-2xl py-4 px-6 font-bold text-sm outline-none min-h-[120px] resize-none"
                        placeholder="Provide feedback on the assessment performance..."
                      />
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      setGradingExam(true);
                      try {
                        const { error } = await supabase
                          .from('exam_attempts')
                          .update({ 
                            score: parseInt(gradeInput),
                            teacher_feedback: feedbackInput,
                            teacher_reply: replyInput
                          })
                          .eq('id', selectedExamAttempt.id);
                        if (error) throw error;
                        showToast("Assessment graded!", "success");
                        setSelectedExamAttempt(null);
                        fetchInitialData();
                      } catch (err: any) {
                        showToast("Error: " + err.message, "error");
                      } finally {
                        setGradingExam(false);
                      }
                    }}
                    disabled={gradingExam}
                    className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3"
                  >
                    {gradingExam ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Update Assessment Feedback
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Item Analysis</h3>
                  <p className="text-xs text-brand-muted italic">Detailed question review is available in the student's submission log.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      {selectedSubmission.is_broadcast && (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/15">
                          <School size={8} />
                          School-wide
                        </span>
                      )}
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
                  {assignments.find(a => a.id === selectedSubmission.assignment_id)?.questions.map((q: any, idx: number) => {
                    const submissionAnswers = selectedSubmission.answers || {};
                    const qAnswer = submissionAnswers[q.id];
                    return (
                      <div key={q.id} className="bg-brand-bg/50 rounded-3xl p-6 border border-brand-border/50">
                        <div className="flex items-start gap-4 mb-4">
                          <span className="text-[10px] font-black text-brand-accent bg-brand-accent/10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">{idx + 1}</span>
                          <h4 className="font-bold text-sm leading-tight pt-0.5">{q.text}</h4>
                        </div>
                        <div className="pl-10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Student Answer</p>
                          {q.type === 'mcq' ? (
                            <div className="flex items-center gap-2">
                               <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${parseInt(qAnswer) === q.correct_option ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                                 {q.options?.[parseInt(qAnswer)] || 'No choice selected'}
                               </div>
                               {parseInt(qAnswer) === q.correct_option ? (
                                 <CheckCircle2 size={16} className="text-emerald-500" />
                               ) : (
                                 <XCircle size={16} className="text-red-500" />
                               )}
                            </div>
                          ) : q.type === 'photo' ? (
                            <div className="space-y-2">
                              {qAnswer ? (
                                <>
                                  <img 
                                    src={qAnswer} 
                                    alt="Student work" 
                                    className="rounded-2xl border border-brand-border w-full max-w-sm object-cover shadow-sm cursor-zoom-in"
                                    onClick={() => window.open(qAnswer, '_blank')}
                                    referrerPolicy="no-referrer"
                                  />
                                  <p className="text-[10px] italic text-brand-muted">Click image to expand</p>
                                </>
                              ) : (
                                <p className="text-xs font-semibold text-brand-muted">No photo uploaded</p>
                              )}
                            </div>
                          ) : (
                            <p className="font-bold text-brand-text italic bg-brand-surface p-4 rounded-xl border border-brand-border/50">{qAnswer || 'No answer provided'}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <section className="bg-brand-accent/5 border border-brand-accent/20 rounded-[2rem] p-8 space-y-6">
                  {(selectedSubmission as any).parent_feedback && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Parent Feedback</span>
                      </div>
                      <p className="text-sm font-bold text-brand-text italic leading-relaxed">
                        "{(selectedSubmission as any).parent_feedback}"
                      </p>
                    </div>
                  )}

                  {(selectedSubmission as any).parent_feedback && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Teacher's Reply to Parent</label>
                      <textarea 
                        value={replyInput}
                        onChange={e => setReplyInput(e.target.value)}
                        placeholder="Reply to the parent's feedback..."
                        className="w-full bg-brand-bg border border-brand-accent/20 rounded-xl p-4 text-xs font-bold outline-none focus:border-brand-accent transition-all min-h-[80px]"
                      />
                    </div>
                  )}

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

export default TeacherClassView;
