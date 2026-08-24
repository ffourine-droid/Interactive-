import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  FileText, 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Check, 
  Eye, 
  Image as ImageIcon, 
  Edit3, 
  MessageSquare, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  ZoomIn, 
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { isTeacherLinkedToAssignment } from '../utils/teacherScoping';
import { useToast } from './Toast';

interface Teacher {
  id: string;
  name: string;
  school_name: string;
  school_id?: string | null;
}

interface Question {
  id: string;
  text?: string;
  question?: string;
  type?: 'mcq' | 'photo' | 'short_answer' | string;
  options?: string[];
  correct_option?: number;
  max_marks?: number;
  marks?: number;
  points?: number;
}

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  teacher_id?: string;
  class_id?: string;
  class_name?: string;
  school_name?: string;
  is_broadcast?: boolean;
  due_date?: string;
  created_at?: string;
  questions?: Question[] | string;
}

interface SubmissionItem {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  teacher_id?: string;
  answers: Record<string, any>;
  score: number | null;
  status: 'submitted' | 'pending' | 'graded' | string;
  grading?: Record<string, { marks_awarded?: number; comment?: string }>;
  teacher_comment?: string;
  parent_feedback?: string;
  teacher_reply?: string;
  submitted_at: string;
  graded_at?: string;
  is_broadcast?: boolean;
}

interface TeacherBroadcastMarkingProps {
  teacher: Teacher;
  classes?: any[];
  teacherSubjects?: any[];
  onRefreshParent?: () => void;
}

// Robust helper to parse questions reliably
export const parseQuestions = (questionsData: any): Question[] => {
  if (!questionsData) return [];
  let list: any[] = [];
  if (Array.isArray(questionsData)) {
    list = questionsData;
  } else if (typeof questionsData === 'string') {
    try {
      const parsed = JSON.parse(questionsData);
      list = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      list = [];
    }
  } else if (typeof questionsData === 'object') {
    list = Object.values(questionsData).filter(v => typeof v === 'object');
  }

  return list.map((q: any, idx: number) => {
    let opts = q.options;
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch { opts = []; }
    }

    let correctOpt = q.correct_option;
    if (correctOpt === undefined && q.correct_answer !== undefined) {
      const parsedNum = parseInt(q.correct_answer);
      if (!isNaN(parsedNum)) {
        correctOpt = parsedNum;
      } else if (Array.isArray(opts)) {
        const foundIdx = opts.findIndex((o: string) => o.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase());
        if (foundIdx !== -1) correctOpt = foundIdx;
      }
    }

    const typeStr = (q.type || 'short_answer').toLowerCase();
    const normalizedType = (typeStr.includes('mcq') || typeStr.includes('choice')) ? 'mcq'
      : (typeStr.includes('photo') || typeStr.includes('image') || typeStr.includes('upload')) ? 'photo'
      : 'short_answer';

    return {
      id: q.id || `q_${idx}`,
      text: q.text || q.question || q.prompt || q.question_text || `Question ${idx + 1}`,
      type: normalizedType,
      options: Array.isArray(opts) ? opts : [],
      correct_option: correctOpt,
      max_marks: Number(q.max_marks || q.marks || q.points || 10) || 10
    };
  });
};

// Helper to reliably extract student's answer regardless of how keys are formatted
export const extractStudentAnswer = (answers: Record<string, any> | undefined | null, q: Question, qIdx: number): string => {
  if (!answers) return '';
  let ansObj: Record<string, any> = {};
  if (typeof answers === 'string') {
    try { ansObj = JSON.parse(answers); } catch { ansObj = {}; }
  } else if (typeof answers === 'object') {
    ansObj = answers;
  }

  const qId = q.id || `q_${qIdx}`;
  if (ansObj[qId] !== undefined && ansObj[qId] !== null) return String(ansObj[qId]);
  if (q.text && ansObj[q.text] !== undefined && ansObj[q.text] !== null) return String(ansObj[q.text]);
  if (ansObj[`q_${qIdx}`] !== undefined && ansObj[`q_${qIdx}`] !== null) return String(ansObj[`q_${qIdx}`]);
  if (ansObj[qIdx] !== undefined && ansObj[qIdx] !== null) return String(ansObj[qIdx]);
  if (ansObj[String(qIdx + 1)] !== undefined && ansObj[String(qIdx + 1)] !== null) return String(ansObj[String(qIdx + 1)]);
  return '';
};

// Normalize submission records from database
export const normalizeSubmission = (raw: any): SubmissionItem => {
  let answersObj: Record<string, any> = {};
  if (typeof raw.answers === 'string') {
    try { answersObj = JSON.parse(raw.answers); } catch { answersObj = {}; }
  } else if (raw.answers && typeof raw.answers === 'object') {
    answersObj = raw.answers;
  }

  let gradingObj: Record<string, any> = {};
  if (typeof raw.grading === 'string') {
    try { gradingObj = JSON.parse(raw.grading); } catch { gradingObj = {}; }
  } else if (raw.grading && typeof raw.grading === 'object') {
    gradingObj = raw.grading;
  }

  return {
    id: raw.id,
    assignment_id: raw.assignment_id,
    student_id: raw.student_id,
    student_name: raw.student_name || raw.student?.name || 'Student',
    teacher_id: raw.teacher_id,
    answers: answersObj,
    score: raw.score !== undefined && raw.score !== null ? Number(raw.score) : null,
    status: raw.status || (raw.score !== null && raw.score !== undefined ? 'graded' : 'pending'),
    grading: gradingObj,
    teacher_comment: raw.teacher_comment || raw.feedback || '',
    parent_feedback: raw.parent_feedback || '',
    teacher_reply: raw.teacher_reply || '',
    submitted_at: raw.submitted_at || raw.created_at || new Date().toISOString(),
    graded_at: raw.graded_at,
    is_broadcast: raw.is_broadcast
  };
};

export const TeacherBroadcastMarking: React.FC<TeacherBroadcastMarkingProps> = ({
  teacher,
  classes = [],
  teacherSubjects = [],
  onRefreshParent
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  // Ref to hold current state inside realtime listeners without stale closures
  const assignmentsRef = useRef<AssignmentItem[]>([]);
  assignmentsRef.current = assignments;
  const submissionsRef = useRef<SubmissionItem[]>([]);
  submissionsRef.current = submissions;
  const teacherRef = useRef(teacher);
  teacherRef.current = teacher;
  const teacherSubjectsRef = useRef(teacherSubjects);
  teacherSubjectsRef.current = teacherSubjects;
  const classesRef = useRef(classes);
  classesRef.current = classes;
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'broadcast' | 'graded'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);

  // Active Marking Modal State
  const [activeSubmission, setActiveSubmission] = useState<SubmissionItem | null>(null);
  const [activeAssignmentForModal, setActiveAssignmentForModal] = useState<AssignmentItem | null>(null);
  
  // Grading form state inside modal
  const [questionGrades, setQuestionGrades] = useState<Record<string, { score: number | ''; comment: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [parentReply, setParentReply] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Lightbox for photos
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  const fetchAllData = async (isManualRefresh = false, silent = false) => {
    if (isManualRefresh) setRefreshing(true);
    else if (!silent) setLoading(true);

    try {
      if (teacher?.id) {
        await setTeacherConfig(teacher.id);
      }

      // 1. Fetch Assignments from multiple sources in parallel
      const teacherSchool = teacher.school_name?.trim() || '';
      
      const [
        assignmentsRpcRes,
        teacherCreatedRes,
        broadcastsRes,
        directSubsRes,
        legacySubsRes
      ] = await Promise.all([
        supabase.rpc('teacher_get_assignments', { p_teacher_id: teacher.id }),
        supabase.from('assignments').select('*').eq('teacher_id', teacher.id).order('created_at', { ascending: false }),
        supabase.from('assignments').select('*').or('is_broadcast.eq.true,class_name.eq.School Broadcast').order('created_at', { ascending: false }),
        supabase.from('assignment_submissions').select('*').order('submitted_at', { ascending: false }),
        supabase.from('submissions').select('*').order('submitted_at', { ascending: false })
      ]);

      const assignmentMap = new Map<string, AssignmentItem>();

      // A. Process RPC assignments
      if (assignmentsRpcRes.data) {
        let rpcList: any[] = [];
        if (assignmentsRpcRes.data.success && Array.isArray(assignmentsRpcRes.data.assignments)) {
          rpcList = assignmentsRpcRes.data.assignments;
        } else if (Array.isArray(assignmentsRpcRes.data)) {
          rpcList = assignmentsRpcRes.data;
        }
        rpcList.forEach(a => { if (a && a.id) assignmentMap.set(a.id, a); });
      }

      // B. Process Teacher-Created assignments
      if (teacherCreatedRes.data) {
        teacherCreatedRes.data.forEach((a: any) => {
          if (a && a.id) assignmentMap.set(a.id, a);
        });
      }

      // C. Process Broadcast assignments
      if (broadcastsRes.data) {
        const relevantBroadcasts = broadcastsRes.data.filter((b: any) => {
          if (teacherSchool && b.school_name && b.school_name.trim().toLowerCase() !== teacherSchool.toLowerCase()) {
            return false;
          }
          return isTeacherLinkedToAssignment(b, teacherSubjectsRef.current, classesRef.current);
        });

        relevantBroadcasts.forEach((rb: any) => {
          if (rb && rb.id) assignmentMap.set(rb.id, rb);
        });
      }

      // 2. Process and Normalize Submissions
      const rawSubmissions: any[] = [];
      if (directSubsRes.data) rawSubmissions.push(...directSubsRes.data);
      if (legacySubsRes.data) rawSubmissions.push(...legacySubsRes.data);

      const normalizedSubs: SubmissionItem[] = [];
      const seenSubIds = new Set<string>();

      rawSubmissions.forEach((raw) => {
        if (!raw || !raw.id || seenSubIds.has(raw.id)) return;
        seenSubIds.add(raw.id);
        const sub = normalizeSubmission(raw);
        normalizedSubs.push(sub);
      });

      // 3. Find any assignments needed by submissions that aren't loaded yet
      const missingAssignmentIds = normalizedSubs
        .map(s => s.assignment_id)
        .filter(id => id && !assignmentMap.has(id));

      const uniqueMissingIds = Array.from(new Set(missingAssignmentIds));

      if (uniqueMissingIds.length > 0) {
        const { data: missingAsgns } = await supabase
          .from('assignments')
          .select('*')
          .in('id', uniqueMissingIds);

        if (missingAsgns) {
          missingAsgns.forEach((a: any) => {
            if (a && a.id) assignmentMap.set(a.id, a);
          });
        }
      }

      const finalAssignments = Array.from(assignmentMap.values());
      const assignmentIdSet = new Set(finalAssignments.map(a => a.id));

      // Filter submissions to those relevant to this teacher's assignments or teacher_id
      const relevantSubmissions = normalizedSubs.filter(s => 
        s.teacher_id === teacher.id || assignmentIdSet.has(s.assignment_id)
      );

      setAssignments(finalAssignments);
      setSubmissions(relevantSubmissions);

      // Auto expand first assignment with pending submissions
      if (!expandedAssignmentId && finalAssignments.length > 0) {
        const firstWithPending = finalAssignments.find(asgn => 
          relevantSubmissions.some(s => s.assignment_id === asgn.id && s.status !== 'graded')
        );
        if (firstWithPending) {
          setExpandedAssignmentId(firstWithPending.id);
        } else {
          setExpandedAssignmentId(finalAssignments[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error loading real-time broadcasts and marking data:", err);
      if (!silent) {
        showToast("Failed to load submissions: " + (err.message || "Unknown error"), "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Real-time Subscriptions with Supabase
  useEffect(() => {
    fetchAllData();

    if (!teacher?.id) return;

    // Set up unique Supabase Realtime Channel
    const channelId = `teacher_marking_${teacher.id}_${Date.now()}`;
    const channel = supabase.channel(channelId);

    // 1. Listen to assignment_submissions changes (INSERT, UPDATE, DELETE)
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_submissions'
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newSub = normalizeSubmission(payload.new);
            const matchesAssignment = assignmentsRef.current.some(a => a.id === newSub.assignment_id);
            const matchesTeacher = newSub.teacher_id === teacherRef.current.id;

            if (matchesAssignment || matchesTeacher) {
              setSubmissions(prev => {
                if (prev.some(s => s.id === newSub.id)) return prev;
                return [newSub, ...prev];
              });
              showToast(`New submission from ${newSub.student_name || 'a student'}!`, 'info');
              if (onRefreshParent) onRefreshParent();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedSub = normalizeSubmission(payload.new);
            setSubmissions(prev => prev.map(s => s.id === updatedSub.id ? { ...s, ...updatedSub } : s));
            setActiveSubmission(current => current && current.id === updatedSub.id ? { ...current, ...updatedSub } : current);
            if (onRefreshParent) onRefreshParent();
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setSubmissions(prev => prev.filter(s => s.id !== deletedId));
            }
          }
        }
      )
      // 2. Listen to legacy submissions table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions'
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newSub = normalizeSubmission(payload.new);
            const matchesAssignment = assignmentsRef.current.some(a => a.id === newSub.assignment_id);
            if (matchesAssignment) {
              setSubmissions(prev => {
                if (prev.some(s => s.id === newSub.id)) return prev;
                return [newSub, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedSub = normalizeSubmission(payload.new);
            setSubmissions(prev => prev.map(s => s.id === updatedSub.id ? { ...s, ...updatedSub } : s));
          }
        }
      )
      // 3. Listen to assignments changes (e.g., admin broadcasts new school assignment)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments'
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newAsgn: AssignmentItem = payload.new;
            const isBroadcast = newAsgn.is_broadcast || newAsgn.class_name === 'School Broadcast';
            const schoolMatches = !newAsgn.school_name || !teacherRef.current.school_name || 
              newAsgn.school_name.trim().toLowerCase() === teacherRef.current.school_name.trim().toLowerCase();

            if (newAsgn.teacher_id === teacherRef.current.id || (isBroadcast && schoolMatches)) {
              setAssignments(prev => {
                if (prev.some(a => a.id === newAsgn.id)) return prev;
                return [newAsgn, ...prev];
              });
              showToast(`New assignment: "${newAsgn.title}"`, 'info');
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedAsgn: AssignmentItem = payload.new;
            setAssignments(prev => prev.map(a => a.id === updatedAsgn.id ? { ...a, ...updatedAsgn } : a));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setAssignments(prev => prev.filter(a => a.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // Background sync poll every 20 seconds
    const interval = setInterval(() => {
      fetchAllData(false, true);
    }, 20000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [teacher.id]);

  // Derived Statistics
  const stats = useMemo(() => {
    const totalAssignments = assignments.length;
    const broadcastCount = assignments.filter(a => a.is_broadcast || a.class_name === 'School Broadcast').length;
    const totalSubmissions = submissions.length;
    const pendingCount = submissions.filter(s => s.status !== 'graded').length;
    const gradedCount = submissions.filter(s => s.status === 'graded').length;
    
    return {
      totalAssignments,
      broadcastCount,
      totalSubmissions,
      pendingCount,
      gradedCount
    };
  }, [assignments, submissions]);

  // Unique Subjects & Grades for filtering
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    assignments.forEach(a => { if (a.subject) subs.add(a.subject); });
    return Array.from(subs);
  }, [assignments]);

  const availableGrades = useMemo(() => {
    const grds = new Set<string>();
    assignments.forEach(a => { if (a.grade) grds.add(a.grade); });
    return Array.from(grds);
  }, [assignments]);

  // Filtered Assignments List
  const filteredAssignments = useMemo(() => {
    return assignments.filter((asgn) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = asgn.title?.toLowerCase().includes(query);
        const matchesSubject = asgn.subject?.toLowerCase().includes(query);
        const matchesGrade = asgn.grade?.toLowerCase().includes(query);
        const asgnSubs = submissions.filter(s => s.assignment_id === asgn.id);
        const matchesStudent = asgnSubs.some(s => s.student_name?.toLowerCase().includes(query));

        if (!matchesTitle && !matchesSubject && !matchesGrade && !matchesStudent) {
          return false;
        }
      }

      // 2. Subject Filter
      if (selectedSubject !== 'all' && asgn.subject !== selectedSubject) {
        return false;
      }

      // 3. Grade Filter
      if (selectedGrade !== 'all' && asgn.grade !== selectedGrade) {
        return false;
      }

      // 4. Tab Status Filter
      const asgnSubs = submissions.filter(s => s.assignment_id === asgn.id);
      const isBroadcast = asgn.is_broadcast || asgn.class_name === 'School Broadcast';
      const hasPending = asgnSubs.some(s => s.status !== 'graded');
      const hasGraded = asgnSubs.some(s => s.status === 'graded');

      if (activeFilter === 'pending') {
        return hasPending || asgnSubs.length === 0;
      }
      if (activeFilter === 'broadcast') {
        return isBroadcast;
      }
      if (activeFilter === 'graded') {
        return hasGraded;
      }

      return true;
    });
  }, [assignments, submissions, activeFilter, selectedSubject, selectedGrade, searchQuery]);

  // Open Marking Interface for a Student Submission
  const handleOpenMarkingModal = (submission: SubmissionItem, assignment: AssignmentItem) => {
    setActiveSubmission(submission);
    setActiveAssignmentForModal(assignment);

    const parsedQuestions = parseQuestions(assignment.questions);
    const existingGrading = submission.grading || {};
    const initialGrades: Record<string, { score: number | ''; comment: string }> = {};

    parsedQuestions.forEach((q, idx) => {
      const qId = q.id || `q_${idx}`;
      const defaultMax = q.max_marks || q.marks || q.points || 10;
      const studentAns = extractStudentAnswer(submission.answers, q, idx);

      if (q.type === 'mcq') {
        // MCQ Auto-calculation
        const isCorrect = studentAns !== '' && parseInt(studentAns) === q.correct_option;
        const autoScore = isCorrect ? defaultMax : 0;
        
        initialGrades[qId] = {
          score: existingGrading[qId]?.marks_awarded !== undefined ? existingGrading[qId].marks_awarded! : autoScore,
          comment: existingGrading[qId]?.comment || ''
        };
      } else {
        // Short Answer / Photo subjective grading
        initialGrades[qId] = {
          score: existingGrading[qId]?.marks_awarded !== undefined ? existingGrading[qId].marks_awarded! : '',
          comment: existingGrading[qId]?.comment || ''
        };
      }
    });

    setQuestionGrades(initialGrades);
    setOverallFeedback(submission.teacher_comment || '');
    setParentReply(submission.teacher_reply || '');
  };

  // Calculate live score in marking modal
  const modalCalculations = useMemo(() => {
    if (!activeAssignmentForModal || !activeSubmission) return { totalScore: 0, maxScore: 0, percentage: 0 };

    const parsedQuestions = parseQuestions(activeAssignmentForModal.questions);
    let totalScore = 0;
    let maxScore = 0;

    parsedQuestions.forEach((q, idx) => {
      const qId = q.id || `q_${idx}`;
      const qMax = q.max_marks || q.marks || q.points || 10;
      maxScore += qMax;

      const gradeEntry = questionGrades[qId];
      if (gradeEntry && gradeEntry.score !== '') {
        totalScore += Number(gradeEntry.score);
      }
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    return { totalScore, maxScore, percentage };
  }, [activeAssignmentForModal, activeSubmission, questionGrades]);

  // Save Graded Submission
  const handleSaveGrade = async (andNext = false) => {
    if (!activeSubmission || !activeAssignmentForModal) return;

    setSavingGrade(true);
    try {
      const parsedQuestions = parseQuestions(activeAssignmentForModal.questions);
      const finalScore = modalCalculations.percentage; // Store percentage (0-100)
      const gradingRecord: Record<string, { marks_awarded: number; comment: string }> = {};

      parsedQuestions.forEach((q, idx) => {
        const qId = q.id || `q_${idx}`;
        const defaultMax = q.max_marks || q.marks || q.points || 10;
        const entry = questionGrades[qId];
        const scoreVal = (entry && entry.score !== '') ? Number(entry.score) : 0;
        
        gradingRecord[qId] = {
          marks_awarded: Math.min(Math.max(0, scoreVal), defaultMax),
          comment: entry?.comment || ''
        };
      });

      const updatePayload: any = {
        score: finalScore,
        status: 'graded',
        grading: gradingRecord,
        teacher_comment: overallFeedback.trim() || null,
        teacher_reply: parentReply.trim() || null,
        teacher_id: teacher.id,
        graded_at: new Date().toISOString()
      };

      // 1. Update in assignment_submissions table
      const { error: updateErr } = await supabase
        .from('assignment_submissions')
        .update(updatePayload)
        .eq('id', activeSubmission.id);

      if (updateErr) {
        console.warn("Direct update notice:", updateErr.message);
        // Fallback update on submissions table
        await supabase
          .from('submissions')
          .update(updatePayload)
          .eq('id', activeSubmission.id);
      }

      // Also try notifying via RPC if available
      try {
        await supabase.rpc('teacher_grade_submission', {
          p_teacher_id: teacher.id,
          p_submission_id: activeSubmission.id,
          p_score: finalScore,
          p_feedback: overallFeedback.trim() || null
        });
      } catch {
        // Safe to ignore RPC missing
      }

      showToast(`Marks saved for ${activeSubmission.student_name}! (${finalScore}%)`, 'success');

      // Update local state immediately
      setSubmissions(prev => prev.map(s => {
        if (s.id === activeSubmission.id) {
          return {
            ...s,
            ...updatePayload,
            status: 'graded'
          };
        }
        return s;
      }));

      if (onRefreshParent) onRefreshParent();

      if (andNext) {
        // Find next pending submission in same assignment or queue
        const currentAssignmentSubs = submissions.filter(s => s.assignment_id === activeAssignmentForModal.id);
        const nextPending = currentAssignmentSubs.find(s => s.id !== activeSubmission.id && s.status !== 'graded');

        if (nextPending) {
          handleOpenMarkingModal(nextPending, activeAssignmentForModal);
        } else {
          // Check other assignments for pending
          const anyPending = submissions.find(s => s.id !== activeSubmission.id && s.status !== 'graded');
          if (anyPending) {
            const nextAsgn = assignments.find(a => a.id === anyPending.assignment_id);
            if (nextAsgn) {
              handleOpenMarkingModal(anyPending, nextAsgn);
              return;
            }
          }
          setActiveSubmission(null);
          showToast("All submissions in this queue are marked!", "info");
        }
      } else {
        setActiveSubmission(null);
      }
    } catch (err: any) {
      console.error("Error saving grade:", err);
      showToast(err.message || "Failed to save marks", "error");
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Section */}
      <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                <School size={20} />
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-brand-text">
                Broadcasts & Marking
              </h2>
            </div>
            <p className="text-xs font-bold text-brand-muted mt-1">
              Mark student submissions for school-wide broadcasts and class assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-bg hover:bg-brand-accent/10 border border-brand-border text-brand-text rounded-2xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
              id="refresh-broadcasts-btn"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-brand-accent' : 'text-brand-muted'} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-brand-bg/60 border border-brand-border/60 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-black text-brand-muted uppercase tracking-wider">Broadcast Work</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-brand-text">{stats.broadcastCount}</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">School</span>
            </div>
          </div>

          <div className="bg-brand-bg/60 border border-brand-border/60 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-black text-brand-muted uppercase tracking-wider">Total Submissions</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-brand-text">{stats.totalSubmissions}</span>
              <span className="text-[10px] font-bold text-brand-muted">Turned in</span>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Awaiting Marking</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-amber-600">{stats.pendingCount}</span>
              <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Pending</span>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Graded & Completed</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-600">{stats.gradedCount}</span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">Done</span>
            </div>
          </div>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-brand-border/50">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input
              type="text"
              placeholder="Search by assignment title, subject, or student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-brand-text outline-none focus:border-brand-accent transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-brand-accent text-white shadow-sm'
                  : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text'
              }`}
            >
              All Work ({assignments.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text'
              }`}
            >
              <Clock size={12} />
              Needs Marking ({stats.pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('broadcast')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'broadcast'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text'
              }`}
            >
              <School size={12} />
              Broadcasts ({stats.broadcastCount})
            </button>
            <button
              onClick={() => setActiveFilter('graded')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'graded'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text'
              }`}
            >
              <CheckCircle2 size={12} />
              Graded ({stats.gradedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content List */}
      {loading ? (
        <div className="py-20 text-center space-y-4 bg-brand-surface border border-brand-border rounded-[2.5rem]">
          <Loader2 className="animate-spin text-brand-accent mx-auto" size={40} />
          <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">Loading assignments & submissions...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] p-6">
          <div className="w-16 h-16 bg-brand-accent/5 rounded-full flex items-center justify-center mx-auto text-brand-accent/40">
            <School size={32} />
          </div>
          <div>
            <h3 className="font-bold text-brand-text text-base">No assignments match your filter</h3>
            <p className="text-xs text-brand-muted mt-1 max-w-md mx-auto">
              {searchQuery 
                ? `No results found for "${searchQuery}". Try clearing search keywords.`
                : "There are currently no broadcast assignments or pending submissions under this filter."}
            </p>
          </div>
          <button
            onClick={() => {
              setActiveFilter('all');
              setSearchQuery('');
              setSelectedSubject('all');
              setSelectedGrade('all');
            }}
            className="px-4 py-2 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-wider mx-auto transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment, asgnIdx) => {
            const isBroadcast = assignment.is_broadcast || assignment.class_name === 'School Broadcast';
            const asgnSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
            const pendingSubs = asgnSubmissions.filter(s => s.status !== 'graded');
            const gradedSubs = asgnSubmissions.filter(s => s.status === 'graded');
            const isExpanded = expandedAssignmentId === assignment.id;
            const parsedQuestions = parseQuestions(assignment.questions);

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: asgnIdx * 0.04 }}
                className="bg-brand-surface border border-brand-border rounded-[2rem] overflow-hidden shadow-sm hover:border-brand-accent/40 transition-all"
              >
                {/* Assignment Header Row */}
                <div 
                  onClick={() => setExpandedAssignmentId(isExpanded ? null : assignment.id)}
                  className="p-5 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-brand-bg/30 transition-colors"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isBroadcast ? (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                          <School size={10} />
                          School Broadcast
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-brand-accent bg-brand-accent/10 border border-brand-accent/20 px-2.5 py-0.5 rounded-full">
                          <BookOpen size={10} />
                          Class Work
                        </span>
                      )}

                      <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted bg-brand-bg px-2 py-0.5 rounded-lg border border-brand-border">
                        {assignment.subject || 'General'}
                      </span>

                      {assignment.grade && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted bg-brand-bg px-2 py-0.5 rounded-lg border border-brand-border">
                          {assignment.grade}
                        </span>
                      )}

                      <span className="text-[9px] font-bold text-brand-muted">
                        • {parsedQuestions.length} Question{parsedQuestions.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <h3 className="text-base md:text-lg font-black tracking-tight text-brand-text truncate">
                      {assignment.title}
                    </h3>
                  </div>

                  {/* Submission Statistics & Toggle Button */}
                  <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs font-black text-brand-text">
                          {asgnSubmissions.length} Submissions
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-wider">
                          {pendingSubs.length > 0 ? (
                            <span className="text-amber-600">{pendingSubs.length} Need Marking</span>
                          ) : asgnSubmissions.length > 0 ? (
                            <span className="text-emerald-600">All {gradedSubs.length} Graded</span>
                          ) : (
                            <span className="text-brand-muted">Awaiting Submissions</span>
                          )}
                        </p>
                      </div>

                      {pendingSubs.length > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      )}
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted transition-transform">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Submissions Roster Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-brand-border/60 bg-brand-bg/40 p-5 md:p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-1.5">
                          <Users size={12} />
                          Student Submissions Roster ({asgnSubmissions.length})
                        </h4>

                        {pendingSubs.length > 0 && (
                          <button
                            onClick={() => handleOpenMarkingModal(pendingSubs[0], assignment)}
                            className="px-3 py-1.5 bg-brand-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all"
                          >
                            <Sparkles size={11} />
                            Start Marking Queue ({pendingSubs.length})
                          </button>
                        )}
                      </div>

                      {asgnSubmissions.length === 0 ? (
                        <div className="py-8 text-center bg-brand-surface border border-brand-border/60 rounded-2xl">
                          <p className="text-xs font-bold text-brand-muted">No students have submitted this assignment yet.</p>
                          <p className="text-[10px] text-brand-muted/70 mt-0.5">As students submit their answers, they will appear here ready to mark.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {asgnSubmissions.map((sub) => {
                            const isGraded = sub.status === 'graded';
                            const subDate = sub.submitted_at ? new Date(sub.submitted_at) : null;
                            const photoCount = parsedQuestions.filter((q, qIdx) => {
                              if (q.type !== 'photo') return false;
                              const ans = extractStudentAnswer(sub.answers, q, qIdx);
                              return Boolean(ans);
                            }).length;

                            return (
                              <div
                                key={sub.id}
                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                  isGraded 
                                    ? 'bg-brand-surface border-brand-border/60' 
                                    : 'bg-amber-500/[0.03] border-amber-500/30 shadow-sm'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                    isGraded 
                                      ? 'bg-emerald-500/10 text-emerald-600' 
                                      : 'bg-amber-500/10 text-amber-600'
                                  }`}>
                                    {sub.student_name?.charAt(0)?.toUpperCase() || 'S'}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-bold text-sm text-brand-text truncate">
                                        {sub.student_name}
                                      </h5>
                                      {photoCount > 0 && (
                                        <span className="flex items-center gap-0.5 text-[8px] font-black text-brand-muted bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border/40">
                                          <ImageIcon size={8} /> {photoCount}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] text-brand-muted font-medium">
                                        {subDate ? `${subDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${subDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Submitted'}
                                      </span>
                                      <span>•</span>
                                      {isGraded ? (
                                        <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                                          <CheckCircle2 size={10} /> Score: {sub.score !== null ? `${sub.score}%` : 'Graded'}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-black text-amber-600 flex items-center gap-1">
                                          <Clock size={10} /> Needs Marking
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleOpenMarkingModal(sub, assignment)}
                                  className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all active:scale-95 ${
                                    isGraded
                                      ? 'bg-brand-bg border border-brand-border text-brand-text hover:bg-brand-accent/10 hover:text-brand-accent'
                                      : 'bg-brand-accent text-white shadow-md shadow-brand-accent/20 hover:bg-brand-accent/90'
                                  }`}
                                >
                                  {isGraded ? (
                                    <>
                                      <Edit3 size={11} />
                                      Review
                                    </>
                                  ) : (
                                    <>
                                      <Award size={11} />
                                      Mark Now
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MARKING MODAL / DRAWER */}
      <AnimatePresence>
        {activeSubmission && activeAssignmentForModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-bg/80 backdrop-blur-md"
              onClick={() => setActiveSubmission(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[92vh] bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Modal Top Header */}
              <div className="p-6 md:p-8 border-b border-brand-border bg-brand-surface shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-accent to-brand-accent/60 flex items-center justify-center text-white font-black text-xl shrink-0">
                    {activeSubmission.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black tracking-tight text-brand-text truncate">
                        {activeSubmission.student_name}
                      </h3>
                      {activeAssignmentForModal.is_broadcast && (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          <School size={8} /> School Broadcast
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-muted font-medium mt-0.5 truncate">
                      {activeAssignmentForModal.title} • {activeAssignmentForModal.subject} • {activeAssignmentForModal.grade}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Running Total Badge */}
                  <div className="hidden sm:flex flex-col items-end bg-brand-bg border border-brand-border px-4 py-2 rounded-2xl">
                    <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted">Running Score</span>
                    <span className="text-base font-black text-brand-accent">
                      {modalCalculations.totalScore} / {modalCalculations.maxScore} ({modalCalculations.percentage}%)
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveSubmission(null)}
                    className="w-10 h-10 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Content - Questions & Answers to Mark */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {/* Parent Feedback Alert (if any) */}
                {activeSubmission.parent_feedback && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                      <MessageSquare size={14} />
                      <span>Parent Note / Feedback:</span>
                    </div>
                    <p className="text-xs font-semibold text-brand-text italic pl-5">
                      "{activeSubmission.parent_feedback}"
                    </p>
                    <div className="pt-2 pl-5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted block mb-1">
                        Reply to Parent (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Reply message sent to parent..."
                        value={parentReply}
                        onChange={(e) => setParentReply(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-accent"
                      />
                    </div>
                  </div>
                )}

                {/* Questions Evaluation Section */}
                <div className="space-y-6">
                  {parseQuestions(activeAssignmentForModal.questions).map((q, qIdx) => {
                    const qId = q.id || `q_${qIdx}`;
                    const qMax = q.max_marks || q.marks || q.points || 10;
                    const studentAns = extractStudentAnswer(activeSubmission.answers, q, qIdx);
                    const currentGrade = questionGrades[qId] || { score: '', comment: '' };

                    return (
                      <div 
                        key={qId}
                        className="bg-brand-bg/50 border border-brand-border rounded-3xl p-5 md:p-6 space-y-4"
                      >
                        {/* Question Prompt */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent font-black text-xs shrink-0 mt-0.5">
                              {qIdx + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-brand-text leading-snug">
                                {q.text || q.question || `Question ${qIdx + 1}`}
                              </h4>
                              <span className="inline-block text-[8px] font-black uppercase tracking-widest text-brand-muted mt-1">
                                Type: {q.type === 'photo' ? '📸 Photo Upload' : q.type === 'mcq' ? '📝 Multiple Choice' : '✍️ Short Answer'} • Max Marks: {qMax}
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-black text-brand-accent bg-brand-surface px-3 py-1.5 rounded-xl border border-brand-border shrink-0">
                            {qMax} Pts
                          </span>
                        </div>

                        {/* Student's Answer Presentation */}
                        <div className="pl-10 space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-wider text-brand-muted">
                            Student Answer:
                          </p>

                          {q.type === 'mcq' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                                  parseInt(studentAns) === q.correct_option 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
                                    : 'bg-red-500/10 border-red-500/20 text-red-700'
                                }`}>
                                  {q.options?.[parseInt(studentAns)] || studentAns || 'No option chosen'}
                                </div>
                                {parseInt(studentAns) === q.correct_option ? (
                                  <CheckCircle2 size={16} className="text-emerald-500" />
                                ) : (
                                  <XCircle size={16} className="text-red-500" />
                                )}
                              </div>
                              <p className="text-[9px] font-black uppercase tracking-wider text-brand-muted">
                                Auto-Calculated: <span className="text-brand-accent font-bold">{currentGrade.score}</span> / {qMax} marks
                              </p>
                            </div>
                          ) : q.type === 'photo' ? (
                            <div className="space-y-2">
                              {studentAns ? (
                                <div className="space-y-2">
                                  <div className="relative inline-block group">
                                    <img
                                      src={studentAns}
                                      alt="Student work submission"
                                      className="rounded-2xl border border-brand-border max-w-full md:max-w-md max-h-72 object-contain bg-black/5 cursor-zoom-in hover:opacity-95 transition-opacity"
                                      onClick={() => setZoomPhotoUrl(studentAns)}
                                      referrerPolicy="no-referrer"
                                    />
                                    <button
                                      onClick={() => setZoomPhotoUrl(studentAns)}
                                      className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ZoomIn size={12} />
                                      Click to Enlarge
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs font-semibold text-brand-muted italic">No photo uploaded</p>
                              )}
                            </div>
                          ) : (
                            <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border/60">
                              <p className="font-bold text-xs text-brand-text whitespace-pre-wrap">
                                {studentAns || 'No answer provided'}
                              </p>
                            </div>
                          )}

                          {/* Marking Toolbar */}
                          <div className="pt-3 border-t border-brand-border/40 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              {/* Quick Mark Buttons */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuestionGrades(prev => ({
                                      ...prev,
                                      [qId]: { score: qMax, comment: prev[qId]?.comment || '' }
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                    Number(currentGrade.score) === qMax 
                                      ? 'bg-emerald-600 text-white shadow-sm' 
                                      : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text'
                                  }`}
                                >
                                  <Check size={11} /> Full Marks ({qMax})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuestionGrades(prev => ({
                                      ...prev,
                                      [qId]: { score: Math.round(qMax / 2), comment: prev[qId]?.comment || '' }
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                    Number(currentGrade.score) === Math.round(qMax / 2) && currentGrade.score !== ''
                                      ? 'bg-amber-600 text-white shadow-sm' 
                                      : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text'
                                  }`}
                                >
                                  Half ({Math.round(qMax / 2)})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuestionGrades(prev => ({
                                      ...prev,
                                      [qId]: { score: 0, comment: prev[qId]?.comment || '' }
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                    currentGrade.score === 0 
                                      ? 'bg-red-600 text-white shadow-sm' 
                                      : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text'
                                  }`}
                                >
                                  <X size={11} /> 0 Marks
                                </button>
                              </div>

                              {/* Manual Numeric Score Input */}
                              <div className="flex items-center gap-2">
                                <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted">
                                  Marks:
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qMax}
                                    value={currentGrade.score}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                      const sanitized = val === '' ? '' : isNaN(val) ? 0 : Math.min(Math.max(0, val), qMax);
                                      setQuestionGrades(prev => ({
                                        ...prev,
                                        [qId]: { score: sanitized, comment: prev[qId]?.comment || '' }
                                      }));
                                    }}
                                    className="w-16 px-2.5 py-1.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-black text-center text-brand-text outline-none focus:border-brand-accent"
                                  />
                                  <span className="text-xs font-bold text-brand-muted">/ {qMax}</span>
                                </div>
                              </div>
                            </div>

                            {/* Optional Question Feedback Input */}
                            <input
                              type="text"
                              placeholder="Optional note for this question..."
                              value={currentGrade.comment}
                              onChange={(e) => {
                                const comment = e.target.value;
                                setQuestionGrades(prev => ({
                                  ...prev,
                                  [qId]: { score: prev[qId]?.score ?? '', comment }
                                }));
                              }}
                              className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-medium text-brand-text outline-none focus:border-brand-accent/50"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall Feedback Section */}
                <div className="bg-brand-bg/60 border border-brand-border rounded-3xl p-5 md:p-6 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted block">
                    Overall Teacher Remarks & Feedback
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Write a constructive summary message for the student..."
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-2xl p-4 text-xs font-bold text-brand-text outline-none focus:border-brand-accent resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-6 md:p-8 border-t border-brand-border bg-brand-surface shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-muted">
                  <span>Score:</span>
                  <span className="text-brand-accent font-black text-sm">
                    {modalCalculations.totalScore} / {modalCalculations.maxScore} ({modalCalculations.percentage}%)
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveSubmission(null)}
                    className="flex-1 sm:flex-none px-5 py-3 border border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-muted hover:bg-brand-bg transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={savingGrade}
                    onClick={() => handleSaveGrade(false)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-brand-surface border border-brand-border hover:border-brand-accent text-brand-text rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {savingGrade ? <Loader2 size={13} className="animate-spin text-brand-accent" /> : <Check size={13} />}
                    Save Marks
                  </button>

                  <button
                    type="button"
                    disabled={savingGrade}
                    onClick={() => handleSaveGrade(true)}
                    className="flex-1 sm:flex-none px-7 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/20 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {savingGrade ? <Loader2 size={13} className="animate-spin text-white" /> : <Sparkles size={13} />}
                    Save & Grade Next
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PHOTO LIGHTBOX */}
      <AnimatePresence>
        {zoomPhotoUrl && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
            >
              <button
                onClick={() => setZoomPhotoUrl(null)}
                className="absolute -top-12 right-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <X size={16} /> Close Preview
              </button>

              <img
                src={zoomPhotoUrl}
                alt="Enlarged student work"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
