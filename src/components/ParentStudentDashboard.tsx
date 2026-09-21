import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Hourglass, 
  FileText, 
  Calendar, 
  Award, 
  ChevronRight,
  Loader2,
  AlertTriangle,
  Trophy,
  Star,
  MessageCircle,
  User,
  Save,
  School,
  X,
  GraduationCap,
  BookOpen,
  Sparkles,
  Check,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { GradeBadge, getGradeLabel } from '../utils/grading';

interface Student {
  id: string;
  name: string;
  grade: string;
  class_id: string;
  parent_code: string;
  all_student_ids?: string[];
  all_class_ids?: string[];
  classes?: {
    name: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  questions?: any[];
  total_marks?: number;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  score: number | null;
  percentage?: number | null;
  grade_label?: string | null;
  teacher_comment?: string;
  parent_feedback?: string;
  teacher_reply?: string;
  status: 'pending' | 'graded';
  submitted_at: string;
  answers: Record<string, any>;
  grading?: Record<string, any>;
}

interface ExamAttempt {
  id: string;
  exam_id: string;
  score: number | null;
  total_marks: number;
  teacher_feedback?: string;
  parent_feedback?: string;
  teacher_reply?: string;
  submitted_at: string;
  exam?: Exam;
}

interface Acknowledgement {
  assignment_id: string;
  acknowledged_at: string;
}

interface ParentStudentDashboardProps {
  student: Student;
  parentPin: string;
}

export const ParentStudentDashboard: React.FC<ParentStudentDashboardProps> = ({ student, parentPin }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fetchedStudent, setFetchedStudent] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [noteSessions, setNoteSessions] = useState<any[]>([]);
  const [ackLoading, setAckLoading] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<{assignment: Assignment, submission: Submission} | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamAttempt | null>(null);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [modalFeedbackText, setModalFeedbackText] = useState('');
  const [examData, setExamData] = useState<any | null>(null);
  const [loadingExamDetails, setLoadingExamDetails] = useState(false);

  // Tab and filter controls for uncluttered experience
  const [activeTab, setActiveTab] = useState<'all' | 'assignments' | 'exams' | 'notes'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [modalTab, setModalTab] = useState<'questions' | 'feedback'>('questions');

  // Live polling and synchronization state
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const lastRpcDataStrRef = React.useRef<string>('');

  // Keep track of Page Visibility API state
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Timer to track seconds since last successful update
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceUpdate(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Core RPC Fetch Function
  const fetchProgressData = async () => {
    if (!student?.id || !parentPin) return;

    try {
      const { data, error } = await supabase.rpc('get_student_progress_for_parent', {
        p_student_id: student.id,
        p_pin: parentPin
      });

      if (error) {
        throw error;
      }

      if (data) {
        if (data.success) {
          setConsecutiveFailures(0);
          if (data.student) {
            setFetchedStudent(data.student);
          }
          const submissionsPayload = data.submissions || [];
          const acknowledgementsPayload = data.acknowledgements || [];
          const dataPayload = {
            submissions: submissionsPayload,
            acknowledgements: acknowledgementsPayload
          };
          const dataStr = JSON.stringify(dataPayload);

          // Deep comparison to prevent unnecessary UI flickers/re-renders
          if (dataStr !== lastRpcDataStrRef.current) {
            setSubmissions(submissionsPayload);
            setAcknowledgements(acknowledgementsPayload);
            lastRpcDataStrRef.current = dataStr;
          }
          setSecondsSinceUpdate(0);
        } else {
          console.warn("get_student_progress_for_parent success is false:", data.message);
          setConsecutiveFailures(prev => prev + 1);
        }
      } else {
        setConsecutiveFailures(prev => prev + 1);
      }
    } catch (err: any) {
      console.error("Error in get_student_progress_for_parent polling cycle:", err);
      setConsecutiveFailures(prev => prev + 1);
    }
  };

  // Polling effect hook: runs every 15 seconds, pauses when tab is inactive, resumes instantly
  useEffect(() => {
    if (!student?.id || !parentPin) return;

    // Fetch immediately on mount or when visibility shifts back to true
    if (isTabVisible) {
      fetchData(true);
    }

    if (!isTabVisible) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [student?.id, parentPin, isTabVisible]);

  // Realtime subscription effect to keep all tables in sync instantly on database changes
  useEffect(() => {
    if (!student?.id) return;

    const rawStudentIds = student.all_student_ids || (student.id ? [student.id] : []);
    const studentIds = rawStudentIds.filter((id: any) => typeof id === 'string' && id.trim() !== '' && id !== 'undefined');
    const studentNameLower = (student.name || '').trim().toLowerCase();

    const realtimeChannel = supabase
      .channel(`parent-dashboard-${student.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignment_submissions'
      }, (payload) => {
        const sub = payload.new as any || payload.old as any;
        if (
          (sub?.student_id && studentIds.includes(sub.student_id)) ||
          (sub?.student_name && sub.student_name.trim().toLowerCase() === studentNameLower)
        ) {
          fetchData(true);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exam_attempts'
      }, (payload) => {
        const att = payload.new as any || payload.old as any;
        if (att?.student_id && studentIds.includes(att.student_id)) {
          fetchData(true);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_note_sessions'
      }, (payload) => {
        const sess = payload.new as any || payload.old as any;
        const usernamesToQuery = [
          student.name,
          (student as any).username,
          student.id
        ].filter((u): u is string => typeof u === 'string' && u.trim() !== '' && u !== 'undefined');
        if (sess?.username && usernamesToQuery.includes(sess.username)) {
          fetchData(true);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'parent_acknowledgements'
      }, (payload) => {
        const ack = payload.new as any || payload.old as any;
        if (ack?.student_id && studentIds.includes(ack.student_id)) {
          fetchData(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [student?.id, student?.all_student_ids?.join(','), student?.name]);

  useEffect(() => {
    if (student) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [student?.id, student?.all_student_ids?.join(','), parentPin]);

  useEffect(() => {
    if (selectedExam) {
      fetchExamDetails(selectedExam.exam_id);
      setModalFeedbackText(selectedExam.parent_feedback || '');
    } else if (selectedSubmission) {
      setModalFeedbackText(selectedSubmission.submission.parent_feedback || '');
    } else {
      setExamData(null);
      setModalFeedbackText('');
    }
  }, [selectedExam, selectedSubmission]);

  const fetchExamDetails = async (examId: string) => {
    setLoadingExamDetails(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();
      if (error) throw error;
      setExamData(data);
    } catch (err: any) {
      showToast("Error loading assessment details", "error");
    } finally {
      setLoadingExamDetails(false);
    }
  };

  const fetchData = async (silent = false) => {
    if (!student) {
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
    }
    try {
      // First, fetch direct progress data including the student object
      await fetchProgressData();

      const rawStudentIds = student.all_student_ids || (student.id ? [student.id] : []);
      const studentIds = rawStudentIds.filter((id: any) => typeof id === 'string' && id.trim() !== '' && id !== 'undefined');

      const rawClassIds = student.all_class_ids || (student.class_id ? [student.class_id] : []);
      const classIds = rawClassIds.filter((id: any) => typeof id === 'string' && id.trim() !== '' && id !== 'undefined');

      // Try RPC first for assignments
      let fetchedAssignments: any[] = [];
      let rpcSuccess = false;

      if (student.id && student.id !== 'undefined') {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('student_get_assignments', {
            p_student_id: student.id
          });
          if (!rpcErr && rpcRes && rpcRes.success) {
            fetchedAssignments = rpcRes.assignments || [];
            rpcSuccess = true;
          } else if (rpcErr) {
            console.warn("student_get_assignments RPC failed inside parent dashboard:", rpcErr.message);
          }
        } catch (e) {
          console.warn("student_get_assignments RPC check caught an exception:", e);
        }
      }

      let normalAssignments: any[] = [];
      let broadcastAssignments: any[] = [];
      let examAttemptsData: any[] = [];

      // 1. Fetch normal assignments
      if (!rpcSuccess && classIds.length > 0) {
        try {
          let { data, error } = await supabase
            .from('assignments')
            .select('id, title, subject, grade, due_date, class_id, class_name, questions, created_at, is_broadcast, school_name')
            .in('class_id', classIds)
            .order('created_at', { ascending: false });

          if (error && (error.message?.includes('school_name') || error.code === '42703')) {
            const fallbackRes = await supabase
              .from('assignments')
              .select('id, title, subject, grade, due_date, class_id, class_name, questions, created_at, is_broadcast, target_school_name')
              .in('class_id', classIds)
              .order('created_at', { ascending: false });
            data = fallbackRes.data as any;
            error = fallbackRes.error;
          }

          if (error) {
            console.error("Error fetching class assignments:", error);
          } else {
            normalAssignments = (data || []).map((a: any) => ({
              ...a,
              school_name: a.school_name || a.target_school_name || ''
            }));
          }
        } catch (e) {
          console.error("Exception fetching class assignments:", e);
        }
      }

      // 2. Fetch broadcast assignments
      if (!rpcSuccess) {
        try {
          let { data, error } = await supabase
            .from('assignments')
            .select('id, title, subject, grade, due_date, class_id, class_name, questions, created_at, is_broadcast, school_name')
            .eq('is_broadcast', true)
            .eq('grade', student.grade)
            .order('created_at', { ascending: false });

          if (error && (error.message?.includes('school_name') || error.code === '42703')) {
            const fallbackRes = await supabase
              .from('assignments')
              .select('id, title, subject, grade, due_date, class_id, class_name, questions, created_at, is_broadcast, target_school_name')
              .eq('is_broadcast', true)
              .eq('grade', student.grade)
              .order('created_at', { ascending: false });
            data = fallbackRes.data as any;
            error = fallbackRes.error;
          }

          if (error) {
            console.error("Error fetching broadcast assignments:", error);
          } else {
            broadcastAssignments = (data || []).map((a: any) => ({
              ...a,
              school_name: a.school_name || a.target_school_name || ''
            }));
          }
        } catch (e) {
          console.error("Exception fetching broadcast assignments:", e);
        }
      }

      // 4. Fetch exam attempts securely, avoiding nested relational joins that might crash the query
      if (studentIds.length > 0) {
        try {
          const { data: attempts, error: attemptsErr } = await supabase
            .from('exam_attempts')
            .select('id, exam_id, score, total_marks, teacher_feedback, parent_feedback, teacher_reply, submitted_at, answers, grading')
            .in('student_id', studentIds)
            .eq('is_submitted', true)
            .order('submitted_at', { ascending: false });

          if (attemptsErr) {
            console.error("Error fetching exam attempts:", attemptsErr);
          } else if (attempts) {
            const examIds = Array.from(new Set(attempts.map((a: any) => a.exam_id).filter(Boolean)));
            const examsMap: Record<string, any> = {};
            if (examIds.length > 0) {
              try {
                const { data: examsList, error: examsErr } = await supabase
                  .from('exams')
                  .select('id, title, subject')
                  .in('id', examIds);
                if (!examsErr && examsList) {
                  examsList.forEach((e: any) => {
                    examsMap[e.id] = e;
                  });
                }
              } catch (e) {
                console.error("Exception fetching exam details for attempts:", e);
              }
            }
            examAttemptsData = attempts.map((a: any) => ({
              ...a,
              exam: examsMap[a.exam_id] || null
            }));
          }
        } catch (e) {
          console.error("Exception fetching exam attempts:", e);
        }
      }

      // Map and set assignments state
      if (rpcSuccess) {
        setAssignments(fetchedAssignments);
      } else {
        // Filter broadcasts belonging to the student's school
        const schoolBroadcasts = broadcastAssignments.filter(b => {
          if (student.school_name && b.school_name) {
            return b.school_name.trim().toLowerCase() === student.school_name.trim().toLowerCase();
          }
          return true;
        });

        // Merge and remove duplicates
        const mergedMap = new Map<string, any>();
        normalAssignments.forEach(a => mergedMap.set(a.id, a));
        schoolBroadcasts.forEach(b => mergedMap.set(b.id, b));
        const sortedAssignments = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setAssignments(sortedAssignments);
      }

      setExamAttempts(examAttemptsData);

      // 5. Fetch assignment submissions directly to guarantee visibility even if RPC failed or returned partial data
      try {
        let directSubmissions: any[] = [];

        // Query by student UUIDs
        if (studentIds.length > 0) {
          const { data: subById, error: errById } = await supabase
            .from('assignment_submissions')
            .select('*')
            .in('student_id', studentIds);
          if (!errById && subById) {
            directSubmissions = [...directSubmissions, ...subById];
          }
        }

        // Query by student name (for name-matched submissions)
        const nameToMatch = (student.name || '').trim();
        if (nameToMatch) {
          const { data: subByName, error: errByName } = await supabase
            .from('assignment_submissions')
            .select('*')
            .ilike('student_name', nameToMatch);
          if (!errByName && subByName) {
            directSubmissions = [...directSubmissions, ...subByName];
          }
        }

        // Query fallback 'submissions' table if it exists
        if (studentIds.length > 0) {
          try {
            const { data: legacySub } = await supabase
              .from('submissions')
              .select('*')
              .in('student_id', studentIds);
            if (legacySub) {
              directSubmissions = [...directSubmissions, ...legacySub];
            }
          } catch {}
        }

        // Merge submissions safely
        if (directSubmissions.length > 0) {
          setSubmissions(prev => {
            const subMap = new Map<string, any>();
            // Start with previous state (e.g. populated by RPC)
            (prev || []).forEach(s => {
              if (s.assignment_id) subMap.set(s.assignment_id, s);
            });
            // Merge direct table rows
            directSubmissions.forEach(s => {
              if (s.assignment_id) {
                const existing = subMap.get(s.assignment_id);
                if (!existing) {
                  subMap.set(s.assignment_id, s);
                } else if (s.score !== null && existing.score === null) {
                  subMap.set(s.assignment_id, { ...existing, ...s });
                } else if (new Date(s.submitted_at).getTime() > new Date(existing.submitted_at || 0).getTime()) {
                  subMap.set(s.assignment_id, { ...existing, ...s });
                }
              }
            });
            return Array.from(subMap.values());
          });
        }
      } catch (subErr) {
        console.warn("Direct assignment_submissions lookup warning:", subErr);
      }

      // Fetch acknowledgements directly
      if (studentIds.length > 0) {
        try {
          const { data: directAcks } = await supabase
            .from('parent_acknowledgements')
            .select('*')
            .in('student_id', studentIds);
          if (directAcks && directAcks.length > 0) {
            setAcknowledgements(prev => {
              const ackMap = new Map<string, any>();
              (prev || []).forEach(a => {
                if (a.assignment_id) ackMap.set(a.assignment_id, a);
              });
              directAcks.forEach(a => {
                if (a.assignment_id) ackMap.set(a.assignment_id, a);
              });
              return Array.from(ackMap.values());
            });
          }
        } catch (ackErr) {
          console.warn("Direct parent_acknowledgements lookup warning:", ackErr);
        }
      }

      // 6. Fetch student note sessions with error safety
      const usernamesToQuery = [
        student.name,
        (student as any).username,
        student.id
      ].filter((u): u is string => typeof u === 'string' && u.trim() !== '' && u !== 'undefined');

      if (usernamesToQuery.length > 0) {
        try {
          const { data: noteSessionsData, error: noteSessionsError } = await supabase
            .from('student_note_sessions')
            .select('*')
            .in('username', usernamesToQuery)
            .order('updated_at', { ascending: false });

          if (!noteSessionsError && noteSessionsData) {
            setNoteSessions(noteSessionsData);
          }
        } catch (e) {
          console.error("Exception fetching note sessions:", e);
        }
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      showToast(`Error loading dashboard: ${err.message || 'Unknown error'}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParentFeedback = async (id: string, type: 'assignment' | 'exam', isFromModal = false) => {
    setSavingFeedback(true);
    const feedbackToSave = isFromModal ? modalFeedbackText : feedbackText;
    try {
      const { error } = await supabase
        .from(type === 'assignment' ? 'assignment_submissions' : 'exam_attempts')
        .update({ parent_feedback: feedbackToSave })
        .eq('id', id);

      if (error) throw error;

      showToast("Feedback sent to teacher!", "success");
      if (!isFromModal) {
        setActiveFeedbackId(null);
        setFeedbackText('');
      }
      fetchData(); // Refresh
    } catch (err: any) {
      showToast("Error saving feedback", "error");
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleAcknowledge = async (assignmentId: string) => {
    if (!student?.id) {
      showToast("Access denied: student not selected", "error");
      return;
    }
    setAckLoading(assignmentId);
    try {
      // FIXED: removed parent_code — column doesn't exist on parent_acknowledgements
      const { error } = await supabase
        .from('parent_acknowledgements')
        .insert({
          student_id: student.id,
          assignment_id: assignmentId
        });

      if (error) throw error;

      setAcknowledgements(prev => [...prev, {
        assignment_id: assignmentId,
        acknowledged_at: new Date().toISOString()
      }]);
      showToast("Acknowledgement recorded!", "success");
    } catch (err: any) {
      showToast("Error saving acknowledgement", "error");
    } finally {
      setAckLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-brand-accent/20" size={40} />
        <p className="text-brand-muted font-bold text-xs uppercase tracking-widest animate-pulse">Loading progress...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-brand-muted font-bold text-xs uppercase tracking-widest">No student data selected</p>
      </div>
    );
  }

  const displayName = fetchedStudent?.name || student.name || 'Student';
  const displayGrade = fetchedStudent?.grade || student.grade || 'No Grade';
  const displayIndexNumber = fetchedStudent?.index_number || student.parent_code || 'N/A';
  const displayClassName = fetchedStudent?.class_name || (Array.isArray(student.classes) ? student.classes[0]?.name : student.classes?.name) || 'Assigned Class';

  // Derived progress statistics for quick overview
  const completedSubmissionsCount = submissions.filter(s => (s.percentage !== undefined && s.percentage !== null) || s.score !== null || (s.answers && Object.keys(s.answers).length > 0)).length;
  
  const assignmentScores = submissions
    .map(s => s.percentage ?? s.score)
    .filter((score): score is number => typeof score === 'number');
  
  const examScores = examAttempts
    .map(e => e.score !== null ? Math.round(((e.score || 0) / (e.total_marks || 1)) * 100) : null)
    .filter((score): score is number => typeof score === 'number');
  
  const allScores = [...assignmentScores, ...examScores];
  const averageScore = allScores.length > 0 
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) 
    : null;

  // Filtered assignments
  const filteredAssignments = assignments.filter(assignment => {
    const submission = submissions.find(s => s.assignment_id === assignment.id);
    const acknowledgement = acknowledgements.find(a => a.assignment_id === assignment.id);
    if (assignmentFilter === 'pending') {
      return !acknowledgement || !submission;
    }
    if (assignmentFilter === 'graded') {
      return submission && ((submission.percentage !== undefined && submission.percentage !== null) || submission.score !== null);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Student Overview Profile Header */}
      <header className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-black text-xl shrink-0">
              {(displayName || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-brand-text">{displayName}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                <span className="px-2.5 py-0.5 bg-brand-bg border border-brand-border rounded-md font-semibold text-brand-text">
                  {displayGrade}
                </span>
                <span className="px-2.5 py-0.5 bg-brand-bg border border-brand-border rounded-md font-mono text-brand-muted">
                  Index: {displayIndexNumber}
                </span>
                <span className="px-2.5 py-0.5 bg-brand-accent/10 text-brand-accent rounded-md font-medium">
                  {displayClassName}
                </span>
              </div>
            </div>
          </div>

          {/* Sync status indicator */}
          <div className="flex items-center sm:self-start">
            {isTabVisible ? (
              consecutiveFailures >= 2 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Reconnecting sync...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Active
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-bg border border-brand-border rounded-full text-xs font-medium text-brand-muted">
                Paused
              </span>
            )}
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-brand-border/60">
          <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-border/40">
            <span className="text-[11px] font-semibold text-brand-muted block">Assignments</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-brand-text">{completedSubmissionsCount}</span>
              <span className="text-xs text-brand-muted font-normal">/ {assignments.length} done</span>
            </div>
          </div>

          <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-border/40">
            <span className="text-[11px] font-semibold text-brand-muted block">Average Grade</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-brand-accent">
                {averageScore !== null ? `${averageScore}%` : 'Pending'}
              </span>
            </div>
          </div>

          <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-border/40">
            <span className="text-[11px] font-semibold text-brand-muted block">Assessments</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-brand-text">{examAttempts.length}</span>
              <span className="text-xs text-brand-muted font-normal">completed</span>
            </div>
          </div>

          <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-border/40">
            <span className="text-[11px] font-semibold text-brand-muted block">Study Notes</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-brand-text">{noteSessions.length}</span>
              <span className="text-xs text-brand-muted font-normal">topics tracked</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-brand-surface border border-brand-border rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
          }`}
        >
          <span>All Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'assignments'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
          }`}
        >
          <FileText size={14} />
          <span>Assignments</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'assignments' ? 'bg-white/20 text-white' : 'bg-brand-bg text-brand-muted'}`}>
            {assignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
          }`}
        >
          <Award size={14} />
          <span>Assessments & Exams</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'exams' ? 'bg-white/20 text-white' : 'bg-brand-bg text-brand-muted'}`}>
            {examAttempts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
          }`}
        >
          <BookOpen size={14} />
          <span>Study & Revision</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'notes' ? 'bg-white/20 text-white' : 'bg-brand-bg text-brand-muted'}`}>
            {noteSessions.length}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">

        {/* 1. ASSIGNMENTS TAB OR PART OF ALL */}
        {(activeTab === 'all' || activeTab === 'assignments') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-brand-accent" />
                <h2 className="text-sm font-bold text-brand-text">Class Assignments</h2>
                <span className="text-xs font-medium text-brand-muted">({assignments.length})</span>
              </div>

              {activeTab === 'assignments' && (
                <div className="flex items-center gap-1 bg-brand-bg p-0.5 rounded-lg border border-brand-border text-xs">
                  <button
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${assignmentFilter === 'all' ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('pending')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${assignmentFilter === 'pending' ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
                  >
                    Needs Attention
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('graded')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${assignmentFilter === 'graded' ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
                  >
                    Graded
                  </button>
                </div>
              )}
            </div>

            {filteredAssignments.length === 0 ? (
              <div className="bg-brand-surface border border-brand-border border-dashed rounded-2xl p-8 text-center text-brand-muted">
                <p className="text-xs font-medium">No assignments found matching this filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredAssignments.map((assignment) => {
                  const submission = submissions.find(s => s.assignment_id === assignment.id);
                  const acknowledgement = acknowledgements.find(a => a.assignment_id === assignment.id);
                  const isOverdue = !submission && new Date(assignment.due_date) < new Date();

                  return (
                    <div 
                      key={assignment.id} 
                      className="bg-brand-surface border border-brand-border rounded-xl p-4 sm:p-5 shadow-sm hover:border-brand-border/90 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-md">
                              {assignment.subject}
                            </span>
                            {assignment.is_broadcast && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                <School size={12} />
                                School-wide
                              </span>
                            )}
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-brand-muted'}`}>
                              <Calendar size={12} />
                              Due {new Date(assignment.due_date).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-brand-text leading-snug">{assignment.title}</h3>

                          {/* Status pill & Teacher's brief remark */}
                          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                            {submission ? (
                              ((submission.percentage !== undefined && submission.percentage !== null) || submission.score !== null) ? (
                                <GradeBadge 
                                  percentage={submission.percentage ?? submission.score} 
                                  gradeLabel={submission.grade_label} 
                                  size="xs" 
                                />
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 font-medium border border-amber-500/20">
                                  <Hourglass size={13} className="animate-pulse" />
                                  Submitted • Awaiting grading
                                </span>
                              )
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium border ${isOverdue ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-brand-bg text-brand-muted border-brand-border'}`}>
                                <AlertTriangle size={13} />
                                {isOverdue ? 'Past Due Date' : 'Not submitted yet'}
                              </span>
                            )}

                            {submission?.teacher_comment && (
                              <span className="text-xs text-brand-muted italic max-w-md truncate">
                                Teacher: "{submission.teacher_comment}"
                              </span>
                            )}
                          </div>

                          {/* Parent note preview if already added */}
                          {submission?.parent_feedback && (
                            <div className="mt-2 text-xs text-brand-muted bg-brand-bg/80 p-2 rounded-lg border border-brand-border/60">
                              <span className="font-semibold text-brand-text">Your note: </span>
                              <span className="italic">"{submission.parent_feedback}"</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0">
                          {/* Review Work button */}
                          <button 
                            onClick={() => {
                              setSelectedSubmission({ 
                                assignment, 
                                submission: submission || {
                                  id: '', 
                                  assignment_id: assignment.id, 
                                  score: null, 
                                  status: 'pending', 
                                  submitted_at: '', 
                                  answers: {} 
                                } 
                              });
                              setModalTab('questions');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg hover:bg-brand-surface text-brand-text border border-brand-border rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <FileText size={13} />
                            <span>Review Work</span>
                          </button>

                          {/* Acknowledgement Status / Button */}
                          {acknowledgement ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-500/20">
                              <CheckCircle2 size={13} />
                              <span>Seen ✓</span>
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleAcknowledge(assignment.id)}
                              disabled={ackLoading === assignment.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {ackLoading === assignment.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              <span>Acknowledge</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 2. ASSESSMENTS / EXAMS TAB OR PART OF ALL */}
        {(activeTab === 'all' || activeTab === 'exams') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-brand-accent" />
                <h2 className="text-sm font-bold text-brand-text">Assessments & Formal Tests</h2>
                <span className="text-xs font-medium text-brand-muted">({examAttempts.length})</span>
              </div>
            </div>

            {examAttempts.length === 0 ? (
              <div className="bg-brand-surface border border-brand-border border-dashed rounded-2xl p-8 text-center text-brand-muted">
                <p className="text-xs font-medium">No assessment results recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {examAttempts.map((attempt) => {
                  const pct = Math.round(((attempt.score || 0) / (attempt.total_marks || 1)) * 100);

                  return (
                    <div 
                      key={attempt.id} 
                      className="bg-brand-surface border border-brand-border rounded-xl p-4 sm:p-5 shadow-sm hover:border-brand-border/90 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent font-semibold rounded-md">
                              {attempt.exam?.subject || 'Assessment'}
                            </span>
                            <span className="text-brand-muted">
                              Completed {new Date(attempt.submitted_at).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-brand-text leading-snug">{attempt.exam?.title}</h3>

                          {attempt.teacher_feedback && (
                            <p className="text-xs text-brand-muted italic mt-1">
                              Teacher feedback: "{attempt.teacher_feedback}"
                            </p>
                          )}

                          {attempt.parent_feedback && (
                            <div className="text-xs text-brand-muted bg-brand-bg/80 p-2 rounded-lg border border-brand-border/60 mt-1">
                              <span className="font-semibold text-brand-text">Your response: </span>
                              <span className="italic">"{attempt.parent_feedback}"</span>
                            </div>
                          )}
                        </div>

                        {/* Score & Actions */}
                        <div className="flex items-center gap-4 sm:self-center shrink-0">
                          <div className="text-right">
                            <span className="text-lg font-bold text-brand-text">{pct}%</span>
                            <span className="text-[11px] text-brand-muted block font-mono">
                              {attempt.score || 0} / {attempt.total_marks || 1} pts
                            </span>
                          </div>

                          <button 
                            onClick={() => {
                              setSelectedExam(attempt);
                              setModalTab('questions');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent text-white rounded-lg text-xs font-semibold hover:opacity-95 transition-all cursor-pointer shadow-sm"
                          >
                            <FileText size={13} />
                            <span>View Breakdown</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 3. STUDY & REVISION SESSIONS */}
        {(activeTab === 'all' || activeTab === 'notes') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-brand-accent" />
                <h2 className="text-sm font-bold text-brand-text">Curriculum Study & Revisions</h2>
                <span className="text-xs font-medium text-brand-muted">({noteSessions.length})</span>
              </div>
            </div>

            {noteSessions.length === 0 ? (
              <div className="bg-brand-surface border border-brand-border border-dashed rounded-2xl p-8 text-center text-brand-muted">
                <p className="text-xs font-medium">No revision study sessions logged yet.</p>
                <p className="text-[11px] text-brand-muted/70 mt-1">
                  When the student studies topic packages, their real-time reading progress and XP show here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {noteSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="bg-brand-surface border border-brand-border rounded-xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent font-semibold rounded-md">
                        {session.subject}
                      </span>
                      <span className="text-brand-muted font-medium">
                        Grade {session.grade}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-brand-text leading-snug">{session.topic}</h4>
                      <span className="text-[11px] text-brand-muted block mt-0.5">
                        Last active: {new Date(session.updated_at || session.started_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-brand-text">{session.progress_pct || 0}% completed</span>
                        <span className="font-semibold text-brand-accent">+{session.xp_earned || 0} XP</span>
                      </div>
                      <div className="w-full bg-brand-bg rounded-full h-2 overflow-hidden border border-brand-border/60">
                        <div 
                          className="bg-brand-accent h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, session.progress_pct || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>

      {/* Detailed Work Modal (Selected Submission or Exam) */}
      <AnimatePresence>
        {(selectedSubmission || selectedExam) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col"
            >
              {/* Modal Header */}
              <header className="px-6 py-4 border-b border-brand-border flex items-center justify-between shrink-0 bg-brand-surface">
                <div className="min-w-0 pr-4">
                  <span className="text-[11px] font-semibold text-brand-accent uppercase tracking-wider block">
                    {selectedSubmission?.assignment.subject || selectedExam?.exam?.subject}
                  </span>
                  <h2 className="text-lg font-bold text-brand-text truncate">
                    {selectedSubmission?.assignment.title || selectedExam?.exam?.title}
                  </h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {selectedSubmission?.submission && ((selectedSubmission.submission.percentage !== undefined && selectedSubmission.submission.percentage !== null) || selectedSubmission.submission.score !== null) && (
                    <GradeBadge 
                      percentage={selectedSubmission.submission.percentage ?? selectedSubmission.submission.score} 
                      gradeLabel={selectedSubmission.submission.grade_label} 
                      size="sm" 
                    />
                  )}
                  {selectedExam && selectedExam.score !== null && (
                    <GradeBadge 
                      percentage={Math.round(((selectedExam.score || 0) / (selectedExam.total_marks || 1)) * 100)} 
                      size="sm" 
                    />
                  )}
                  <button 
                    onClick={() => {
                      setSelectedSubmission(null);
                      setSelectedExam(null);
                    }}
                    className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              {/* Modal Navigation Segment */}
              <div className="flex items-center gap-2 px-6 py-2.5 border-b border-brand-border/60 bg-brand-bg/40 text-xs">
                <button
                  onClick={() => setModalTab('questions')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    modalTab === 'questions' ? 'bg-brand-surface text-brand-text shadow-sm border border-brand-border' : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  Questions & Answers
                </button>
                <button
                  onClick={() => setModalTab('feedback')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    modalTab === 'feedback' ? 'bg-brand-surface text-brand-text shadow-sm border border-brand-border' : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  <span>Teacher & Parent Notes</span>
                  {(selectedSubmission?.submission?.teacher_comment || selectedExam?.teacher_feedback) && (
                    <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  )}
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* TAB: Questions & Answers */}
                {modalTab === 'questions' && (
                  <div className="space-y-4">
                    {/* Performance Assessment summary banner */}
                    {selectedSubmission?.submission && ((selectedSubmission.submission.percentage !== undefined && selectedSubmission.submission.percentage !== null) || selectedSubmission.submission.score !== null) && (
                      <div className="p-4 bg-brand-surface rounded-xl border border-brand-border flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                            <Award size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Performance Assessment</p>
                            <p className="font-bold text-sm text-brand-text">
                              {selectedSubmission.submission.percentage !== undefined && selectedSubmission.submission.percentage !== null
                                ? `${selectedSubmission.submission.percentage}% — `
                                : `${selectedSubmission.submission.score}% — `}
                              {selectedSubmission.submission.grade_label || getGradeLabel(selectedSubmission.submission.percentage ?? selectedSubmission.submission.score)}
                            </p>
                          </div>
                        </div>
                        <GradeBadge 
                          percentage={selectedSubmission.submission.percentage ?? selectedSubmission.submission.score} 
                          gradeLabel={selectedSubmission.submission.grade_label} 
                          size="md" 
                        />
                      </div>
                    )}

                    {loadingExamDetails && (
                      <div className="flex items-center justify-center py-8 text-brand-muted">
                        <Loader2 className="animate-spin mr-2" size={20} />
                        <span className="text-xs">Loading assessment details...</span>
                      </div>
                    )}

                    {/* Assignment questions */}
                    {selectedSubmission && (
                      selectedSubmission.assignment.questions && selectedSubmission.assignment.questions.length > 0 ? (
                        selectedSubmission.assignment.questions.map((q: any, idx: number) => {
                          const isSubmitted = !!selectedSubmission.submission?.id;
                          const answers = selectedSubmission.submission?.answers || {};
                          const qAnswer = answers[q.id] !== undefined
                            ? answers[q.id]
                            : (answers[idx] !== undefined ? answers[idx] : answers[String(idx)]);
                          
                          const gradingEntry = selectedSubmission?.submission?.grading?.[q.id];
                          const isMcq = q.type === 'mcq';
                          let marksAwarded: number | null = null;
                          const qMaxPts = q.marks !== undefined && q.marks !== null ? Number(q.marks) : (q.max_marks || 10);
                          if (gradingEntry && gradingEntry.marks_awarded !== null && gradingEntry.marks_awarded !== undefined) {
                            marksAwarded = Number(gradingEntry.marks_awarded);
                          } else if (gradingEntry && gradingEntry.correct !== undefined && gradingEntry.correct !== null) {
                            marksAwarded = gradingEntry.correct ? qMaxPts : 0;
                          } else if (isMcq && isSubmitted) {
                            marksAwarded = parseInt(qAnswer) === q.correct_option ? qMaxPts : 0;
                          }

                          return (
                            <div key={q.id || idx} className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-md bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <p className="text-sm font-semibold text-brand-text leading-snug">{q.text}</p>
                                </div>
                                <span className="text-xs font-mono text-brand-muted shrink-0 bg-brand-surface px-2 py-0.5 rounded border border-brand-border">
                                  {qMaxPts} pts
                                </span>
                              </div>

                              <div className="pl-7 space-y-2">
                                <span className="text-[11px] font-semibold text-brand-muted block">Student's Response:</span>
                                {isSubmitted ? (
                                  q.type === 'photo' ? (
                                    qAnswer ? (
                                      <img 
                                        src={qAnswer} 
                                        alt="Work photo" 
                                        className="rounded-lg border border-brand-border max-h-64 object-contain bg-brand-surface"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <p className="text-xs text-brand-muted italic">No photo submitted</p>
                                    )
                                  ) : q.type === 'mcq' ? (
                                    <div className="flex items-center gap-2">
                                      <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                                        parseInt(qAnswer) === q.correct_option 
                                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
                                          : 'bg-red-500/10 border-red-500/20 text-red-700'
                                      }`}>
                                        {q.options?.[parseInt(qAnswer)] || 'No option selected'}
                                      </span>
                                      {parseInt(qAnswer) === q.correct_option ? (
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                      ) : (
                                        <AlertTriangle size={16} className="text-red-500" />
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs font-medium text-brand-text bg-brand-surface p-3 rounded-lg border border-brand-border">
                                      {qAnswer || 'No answer provided'}
                                    </p>
                                  )
                                ) : (
                                  <p className="text-xs text-brand-muted italic">Assignment not yet submitted by student</p>
                                )}

                                {/* Marks & Question Feedback */}
                                {marksAwarded !== null && (
                                  <div className="pt-2 flex items-center gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded font-semibold ${marksAwarded > 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                                      Awarded: {marksAwarded} / {qMaxPts} pts
                                    </span>
                                    {gradingEntry?.comment && (
                                      <span className="text-brand-muted italic">
                                        "{gradingEntry.comment}"
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-brand-muted text-center py-6">No individual question breakdown available for this task.</p>
                      )
                    )}

                    {/* Exam questions */}
                    {selectedExam && examData && (
                      examData.questions && examData.questions.length > 0 ? (
                        examData.questions.map((q: any, idx: number) => {
                          const studentAnswer = (selectedExam as any).answers?.[idx] !== undefined
                            ? (selectedExam as any).answers?.[idx]
                            : (selectedExam as any).answers?.[String(idx)];
                          
                          const gradingEntry = selectedExam.grading?.[idx] !== undefined
                            ? selectedExam.grading[idx]
                            : selectedExam.grading?.[String(idx)];
                          
                          const isCorrect = q.type === 'mcq'
                            ? studentAnswer === q.correct_answer
                            : (typeof gradingEntry === 'object' && gradingEntry !== null ? (gradingEntry.correct === true || gradingEntry.correct === 'true') : false);

                          return (
                            <div key={idx} className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-md bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <p className="text-sm font-semibold text-brand-text leading-snug">{q.question}</p>
                                </div>
                                <span className="text-xs font-mono text-brand-muted shrink-0 bg-brand-surface px-2 py-0.5 rounded border border-brand-border">
                                  {q.marks || 1} pts
                                </span>
                              </div>

                              <div className="pl-7 space-y-2">
                                <span className="text-[11px] font-semibold text-brand-muted block">Student's Response:</span>
                                {q.type === 'image' ? (
                                  studentAnswer ? (
                                    <img 
                                      src={studentAnswer} 
                                      alt="Student answer" 
                                      className="rounded-lg border border-brand-border max-h-64 object-contain bg-brand-surface"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <p className="text-xs text-brand-muted italic">No image provided</p>
                                  )
                                ) : (
                                  <div className={`p-2.5 rounded-lg text-xs font-semibold border ${
                                    isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-red-500/10 border-red-500/20 text-red-700'
                                  }`}>
                                    {studentAnswer || 'No response'}
                                  </div>
                                )}

                                {q.type === 'mcq' && !isCorrect && (
                                  <p className="text-xs text-emerald-600 font-medium">
                                    Correct answer: {q.correct_answer}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-brand-muted text-center py-6">No question breakdown available.</p>
                      )
                    )}
                  </div>
                )}

                {/* TAB: Teacher & Parent Feedback */}
                {modalTab === 'feedback' && (
                  <div className="space-y-6">
                    {/* Teacher feedback box */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-brand-muted flex items-center gap-1.5">
                        <Award size={14} className="text-brand-accent" />
                        Teacher's Feedback & Comments
                      </h3>
                      {(selectedSubmission?.submission?.teacher_comment || selectedExam?.teacher_feedback) ? (
                        <div className="p-4 bg-brand-bg rounded-xl border border-brand-border space-y-3">
                          <p className="text-sm font-medium text-brand-text italic">
                            "{selectedSubmission?.submission?.teacher_comment || selectedExam?.teacher_feedback}"
                          </p>

                          {(selectedSubmission?.submission?.teacher_reply || selectedExam?.teacher_reply) && (
                            <div className="pt-3 border-t border-brand-border/60">
                              <span className="text-[11px] font-semibold text-brand-accent block mb-1">Teacher's Reply to your Note:</span>
                              <p className="text-xs text-brand-text italic">
                                "{selectedSubmission?.submission?.teacher_reply || selectedExam?.teacher_reply}"
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-brand-bg rounded-xl border border-brand-border/60 text-xs text-brand-muted text-center">
                          No teacher comment has been posted yet.
                        </div>
                      )}
                    </div>

                    {/* Parent's Remarks (Editable) */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-brand-muted flex items-center gap-1.5">
                        <User size={14} className="text-emerald-600" />
                        Your Note for the Teacher
                      </h3>
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                        <textarea 
                          placeholder="Add questions or notes for the teacher regarding this work..."
                          value={modalFeedbackText}
                          onChange={(e) => setModalFeedbackText(e.target.value)}
                          className="w-full bg-brand-surface border border-brand-border rounded-xl p-3 text-xs font-medium text-brand-text outline-none focus:border-emerald-500 min-h-[90px] resize-none transition-all"
                        />
                        <button 
                          onClick={() => {
                            if (selectedSubmission?.submission?.id) {
                              handleSaveParentFeedback(selectedSubmission.submission.id, 'assignment', true);
                            } else if (selectedExam?.id) {
                              handleSaveParentFeedback(selectedExam.id, 'exam', true);
                            }
                          }}
                          disabled={savingFeedback}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {savingFeedback ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          <span>{savingFeedback ? 'Saving...' : 'Send Note to Teacher'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
