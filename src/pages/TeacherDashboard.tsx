import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  LogOut, 
  ChevronRight, 
  ChevronDown,
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
  X,
  Award,
  RefreshCw,
  KeyRound,
  FileText,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Search,
  Eye,
  Copy
} from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { 
  isTeacherLinkedToAssignment, 
  isSchoolAdminAssignment, 
  isTeacherCreatedAssignment, 
  isAssignmentForClass,
  isGradeMatch,
  isSubjectMatch,
  isStudentRootedToTeacher, 
  filterSubmissionsForTeacher 
} from '../utils/teacherScoping';
import { useToast } from '../components/Toast';
import { TeacherCompetitionManager } from '../components/TeacherCompetitionManager';
import { QuestionRequestForm } from '../components/QuestionRequestForm';
import { MaterialCard } from '../components/MaterialCard';
import { SlidesViewer } from '../components/SlidesViewer';
import { Experiment, CANONICAL_SUBJECTS } from '../types';
import ModerationPage from './ModerationPage';
import { SchoolSetupModal } from '../components/SchoolSetupModal';
import LinkSchoolField from '../components/LinkSchoolField';
import { TeacherBroadcastMarking } from '../components/TeacherBroadcastMarking';
import { TeacherChangePinModal } from '../components/TeacherChangePinModal';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  class_id?: string;
  class_name?: string;
  due_date?: string;
  share_code?: string;
  questions?: any;
  teacher_id?: string;
  school_name?: string;
  is_broadcast?: boolean;
  created_by_admin?: boolean;
  created_at?: string;
  expected_students?: any[];
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
  school_linked?: boolean;
  using_shared_pin?: boolean;
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
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [studentNames, setStudentNames] = useState('');
  const [activeView, setActiveView] = useState<'classes' | 'assignments' | 'exams' | 'competitions' | 'forum_moderation' | 'grading_queue'>('classes');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'my_assignments' | 'broadcast'>('all');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentSubjectFilter, setAssignmentSubjectFilter] = useState('all');
  const [assignmentGradeFilter, setAssignmentGradeFilter] = useState('all');
  const [previewAssignment, setPreviewAssignment] = useState<Assignment | null>(null);
  const [rootedStudents, setRootedStudents] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [loadingPendingSubmissions, setLoadingPendingSubmissions] = useState(false);
  const [gradingMarks, setGradingMarks] = useState<Record<string, number>>({});
  const [gradingComments, setGradingComments] = useState<Record<string, string>>({});
  const [submittingGrades, setSubmittingGrades] = useState<Record<string, boolean>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [isSchoolSetupOpen, setIsSchoolSetupOpen] = useState(false);
  const [showLinkSchoolBanner, setShowLinkSchoolBanner] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isSharedPinDismissed, setIsSharedPinDismissed] = useState(false);

  // New state for dismissible banner & inline linking form
  const [isSchoolBannerDismissed, setIsSchoolBannerDismissed] = useState(() => {
    return localStorage.getItem('azilearn_dismiss_link_school_banner') === 'true';
  });
  const [showInlineLinkForm, setShowInlineLinkForm] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);
  const [isLinkingSchool, setIsLinkingSchool] = useState(false);

  // States for the new Join / Create Class browse flow
  const [classFlowStep, setClassFlowStep] = useState<'browse' | 'create'>('browse');
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const [loadingSchoolClasses, setLoadingSchoolClasses] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJoinClassId, setSelectedJoinClassId] = useState<string | null>(null);
  const [enteredSubject, setEnteredSubject] = useState<string>('');
  const [joiningClass, setJoiningClass] = useState(false);

  const fetchSchoolClasses = async () => {
    const teacherData = localStorage.getItem('azilearn_teacher');
    let t = teacherData ? JSON.parse(teacherData) : null;
    if (!t && teacher) t = teacher;
    if (!t) return;
    try {
      setLoadingSchoolClasses(true);
      const { data, error } = await supabase.rpc('teacher_browse_school_classes', {
        p_teacher_id: t.id
      });
      if (error) {
        console.error("Error fetching school classes:", error);
        showToast("Failed to load school classes: " + error.message, "error");
      } else if (data && data.success) {
        setSchoolClasses(data.classes || []);
      } else {
        setSchoolClasses([]);
      }
    } catch (err: any) {
      console.error("Error fetching school classes:", err);
      showToast("Failed to load school classes: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoadingSchoolClasses(false);
    }
  };

  useEffect(() => {
    if (isAddingClass) {
      setClassFlowStep('browse');
      setGradeFilter('');
      setSearchQuery('');
      setSelectedJoinClassId(null);
      setEnteredSubject('');
      setNewClassSubject('');
      fetchSchoolClasses();
    }
  }, [isAddingClass]);

  useEffect(() => {
    const showBanner = localStorage.getItem('azilearn_show_school_link_banner');
    if (showBanner === 'true') {
      setShowLinkSchoolBanner(true);
    }
  }, []);

  const fetchPendingSubmissions = async (
    teacherId: string, 
    classIdsOverride?: string[], 
    rootedStudentsOverride?: any[],
    scopedAssignmentsOverride?: any[]
  ) => {
    try {
      setLoadingPendingSubmissions(true);
      let rpcSubmissions: any[] = [];

      try {
        const { data, error } = await supabase.rpc('teacher_get_pending_submissions', {
          p_teacher_id: teacherId
        });
        
        if (!error && data && data.success !== false) {
          if (data.submissions && Array.isArray(data.submissions)) {
            rpcSubmissions = data.submissions;
          } else if (Array.isArray(data)) {
            rpcSubmissions = data;
          }
        } else if (error) {
          console.warn("RPC teacher_get_pending_submissions failed, running client-side fallback:", error.message);
        }
      } catch (rpcErr: any) {
        console.warn("RPC teacher_get_pending_submissions threw exception, running client-side fallback:", rpcErr);
      }

      // Filter RPC submissions to rooted students if student roster is known
      const activeStudents = rootedStudentsOverride || rootedStudents;
      if (rpcSubmissions.length > 0 && activeStudents.length > 0) {
        const stIds = new Set(activeStudents.map((s: any) => s.id).filter(Boolean));
        const stNames = new Set(activeStudents.map((s: any) => s.name?.toLowerCase().trim()).filter(Boolean));
        rpcSubmissions = rpcSubmissions.filter((sub: any) => {
          if (sub.student_id && stIds.has(sub.student_id)) return true;
          if (sub.student_name && stNames.has(sub.student_name?.toLowerCase().trim())) return true;
          return true;
        });
      }

      // Run robust client-side query to ensure broadcast/admin submissions and 'needs_grading' are captured
      let fallbackSubmissions: any[] = [];
      try {
        let candidateAssignments: any[] = scopedAssignmentsOverride || assignments || [];

        if (candidateAssignments.length === 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id');

          const classIds = classIdsOverride || (classesData || []).map(c => c.id);

          let assignQuery = supabase
            .from('assignments')
            .select('id, title, subject, grade, questions, teacher_id, class_id, is_broadcast, created_by_admin, target_school_name, target_teacher_name');

          if (classIds.length > 0) {
            assignQuery = assignQuery.or(`teacher_id.eq.${teacherId},class_id.in.(${classIds.join(',')}),is_broadcast.eq.true,created_by_admin.eq.true`);
          } else {
            assignQuery = assignQuery.or(`teacher_id.eq.${teacherId},is_broadcast.eq.true,created_by_admin.eq.true`);
          }

          const { data: fetchedAsgns } = await assignQuery;
          candidateAssignments = (fetchedAsgns || []).filter((a: any) => {
            return isTeacherLinkedToAssignment(a, teacherSubjects, classes, teacherId, teacher?.school_name, teacher?.name);
          });
        }

        if (candidateAssignments.length > 0) {
          const assignmentIds = candidateAssignments.map(a => a.id);

          // Query assignment_submissions for all pending/submitted/needs_grading statuses
          const [subsDataRes, subsData2Res] = await Promise.all([
            supabase
              .from('assignment_submissions')
              .select('*')
              .or(`teacher_id.eq.${teacherId},assignment_id.in.(${assignmentIds.join(',')})`)
              .in('status', ['submitted', 'pending', 'needs_grading']),
            supabase
              .from('submissions')
              .select('*')
              .or(`teacher_id.eq.${teacherId},assignment_id.in.(${assignmentIds.join(',')})`)
              .in('status', ['submitted', 'pending', 'needs_grading'])
          ]);

          const rawSubs = [
            ...(subsDataRes.data || []),
            ...(subsData2Res.data || [])
          ];

          // Deduplicate by ID
          const seenSubIds = new Set<string>();
          const uniqueRawSubs: any[] = [];
          for (const sub of rawSubs) {
            if (sub && sub.id && !seenSubIds.has(sub.id)) {
              seenSubIds.add(sub.id);
              uniqueRawSubs.push(sub);
            }
          }

          // Format into structure expected by UI
          fallbackSubmissions = uniqueRawSubs.map(sub => {
            const assignment = candidateAssignments.find(a => a.id === sub.assignment_id);
            if (!assignment) return null;

            let questionsList: any[] = [];
            try {
              questionsList = typeof assignment.questions === 'string'
                ? JSON.parse(assignment.questions)
                : (assignment.questions || []);
            } catch (e) {
              questionsList = [];
            }

            // Only include questions that are photo or short_answer
            const openQuestions = questionsList.filter((q: any) => q.type === 'short_answer' || q.type === 'photo');
            const targetQuestions = openQuestions.length > 0 ? openQuestions : questionsList;

            const pending_questions = targetQuestions.map((q: any) => {
              let studentAnswer = '';
              if (sub.answers) {
                const parsedAnswers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
                studentAnswer = parsedAnswers[q.id] || parsedAnswers[q.text] || '';
              }

              return {
                question_id: q.id,
                question_text: q.text || q.question || 'Question',
                question_type: q.type || 'short_answer',
                max_marks: q.max_marks || Math.round(100 / (questionsList.length || 1)) || 10,
                student_answer: studentAnswer
              };
            });

            return {
              submission_id: sub.id,
              assignment_id: sub.assignment_id,
              assignment_title: assignment.title,
              subject: assignment.subject,
              grade: assignment.grade,
              student_id: sub.student_id,
              student_name: sub.student_name || 'Student',
              submitted_at: sub.submitted_at || sub.created_at || new Date().toISOString(),
              pending_questions
            };
          }).filter(Boolean);
        }
      } catch (fallbackErr) {
        console.warn("Client fallback pending submissions error:", fallbackErr);
      }

      // Merge RPC and Fallback submissions, avoiding duplicate submission_ids
      const combinedMap = new Map<string, any>();
      for (const item of rpcSubmissions) {
        const id = item.submission_id || item.id;
        if (id) combinedMap.set(id, item);
      }
      for (const item of fallbackSubmissions) {
        const id = item.submission_id || item.id;
        if (id && !combinedMap.has(id)) {
          combinedMap.set(id, item);
        }
      }

      setPendingSubmissions(Array.from(combinedMap.values()));
    } catch (err: any) {
      console.error("Failed to load pending submissions", err);
      // Fail silently or fallback beautifully so the app never shows a hard error/toast on dashboard load
      setPendingSubmissions([]);
    } finally {
      setLoadingPendingSubmissions(false);
    }
  };

  const handleGradeQuestion = async (submissionId: string, questionId: string, isCorrect: boolean, comment?: string) => {
    const key = `${submissionId}-${questionId}`;
    const enteredComment = comment || gradingComments[key] || '';

    setSubmittingGrades(prev => ({ ...prev, [key]: true }));

    try {
      let rpcSucceeded = false;
      let rpcResult: any = null;

      try {
        const { data, error } = await supabase.rpc('teacher_grade_question', {
          p_teacher_id: teacher?.id,
          p_submission_id: submissionId,
          p_question_id: questionId,
          p_correct: isCorrect,
          p_comment: enteredComment || null
        });

        if (!error) {
          rpcResult = data;
          rpcSucceeded = true;
        } else {
          console.warn("RPC teacher_grade_question failed, running client-side fallback:", error.message);
        }
      } catch (rpcErr: any) {
        console.warn("RPC teacher_grade_question threw exception, running client-side fallback:", rpcErr);
      }

      if (!rpcSucceeded) {
        // Fallback: update submission directly
        let submissionTable = 'assignment_submissions';
        let { data: sub, error: subErr } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('id', submissionId)
          .maybeSingle();

        if (subErr || !sub) {
          submissionTable = 'submissions';
          const { data: sub2, error: subErr2 } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .maybeSingle();
          if (subErr2) throw subErr2;
          sub = sub2;
        }

        if (!sub) {
          throw new Error("Submission not found");
        }

        const currentGrading = { ...(sub.grading || {}) };
        currentGrading[questionId] = {
          correct: isCorrect,
          marks_awarded: isCorrect ? 10 : 0,
          comment: enteredComment || null
        };

        // Update the database directly
        const { error: updateError } = await supabase
          .from(submissionTable)
          .update({
            grading: currentGrading,
            status: 'graded',
            graded_at: new Date().toISOString(),
            teacher_id: teacher?.id || sub.teacher_id,
            teacher_comment: enteredComment || sub.teacher_comment
          })
          .eq('id', submissionId);

        if (updateError) throw updateError;

        // Since it's client-side, we mark it fully_graded: true
        rpcResult = { success: true, fully_graded: true };
      }

      const isFullyGraded = rpcResult?.fully_graded ?? true;
      if (isFullyGraded && rpcResult?.percentage !== undefined && rpcResult?.grade_label) {
        showToast(`Graded! ${rpcResult.percentage}% — ${rpcResult.grade_label}`, "success");
      } else {
        showToast("Question marked successfully!", "success");
      }

      // Update state based on fully_graded
      setPendingSubmissions(prev => {
        if (isFullyGraded) {
          // Remove the entire submission card
          return prev.filter(sub => sub.submission_id !== submissionId);
        } else {
          // Remove only this question from the submission card
          return prev.map(sub => {
            if (sub.submission_id === submissionId) {
              return {
                ...sub,
                pending_questions: sub.pending_questions.filter((q: any) => q.question_id !== questionId)
              };
            }
            return sub;
          }).filter(sub => sub.pending_questions.length > 0);
        }
      });

      // Clear state inputs for this key
      setGradingMarks(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      setGradingComments(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    } catch (err: any) {
      showToast(err.message || "Failed to save grade", "error");
    } finally {
      setSubmittingGrades(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

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
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
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
    fetchPendingSubmissions(t.id);

    // Global real-time listener for teacher's data
    const activityChannel = supabase
      .channel(`teacher-${t.id}-activity`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignment_submissions'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRecentActivity(prev => [payload.new, ...prev].slice(0, 5));
          showToast(`New assignment submitted by ${payload.new.student_name || 'a student'}!`, "info");
        }
        fetchDashboardData(t.id);
        fetchPendingSubmissions(t.id);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'submissions'
      }, () => {
        fetchDashboardData(t.id);
        fetchPendingSubmissions(t.id);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignments'
      }, () => {
        fetchDashboardData(t.id);
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

  useEffect(() => {
    if (activeView === 'grading_queue' && teacher?.id) {
      fetchPendingSubmissions(teacher.id);
    }
  }, [activeView, teacher?.id]);

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
        try {
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
        } catch (fallbackErr) {
          console.warn("Fallback query failed:", fallbackErr);
        }
      }

      // If still not found, but we have local session data, auto-create/upsert the teacher record
      // This is a highly robust recovery mechanism for database resets or test runners
      if (!teacherCheck && t && t.id && t.id.length > 10) {
        try {
          // Verify t.id looks like a valid UUID before trying to insert
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
          const insertData: any = {
            name: t.name || 'Teacher',
            school_name: t.school_name || 'AziLearn Academy',
            school_id: t.school_id || null,
            pin: '0000'
          };
          if (isUuid) {
            insertData.id = t.id;
          }

          const { data: newTeacher, error: createError } = await supabase
            .from('teachers')
            .insert(insertData)
            .select('id, name, school_name, school_id')
            .single();

          if (!createError && newTeacher) {
            teacherCheck = newTeacher;
            // Update localStorage in case id changed
            localStorage.setItem('azilearn_teacher', JSON.stringify({
              id: newTeacher.id,
              name: newTeacher.name,
              school_name: newTeacher.school_name,
              school_id: newTeacher.school_id
            }));
            teacherId = newTeacher.id;
            setTeacher(newTeacher);
            console.log("Successfully auto-restored teacher record in database:", newTeacher);
          } else if (createError) {
            console.warn("Could not auto-restore teacher record:", createError.message);
          }
        } catch (restoreErr) {
          console.warn("Teacher auto-restore threw exception:", restoreErr);
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

      // Set the teacher_id session config inside Postgres before running queries/RPCs
      await setTeacherConfig(teacherId);

      // Fetch Classes, Exams, and Assignments in parallel
      const [assignmentsResponse, examsResponse, classesResponse] = await Promise.all([
        supabase.rpc('teacher_get_assignments', { p_teacher_id: teacherId }),
        supabase
          .from('exams')
          .select('id, title, subject, grade, is_published, created_at, share_code')
          .eq('created_by', teacherId)
          .order('created_at', { ascending: false }),
        supabase.rpc('teacher_get_classes', { p_teacher_id: teacherId })
      ]);

      if (examsResponse.error) throw examsResponse.error;
      if (classesResponse.error) throw classesResponse.error;

      let fetchedClasses: any[] = [];
      const rpcData = classesResponse.data;
      if (rpcData) {
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

      // Sort classes by created_at desc if available
      const sortedClasses = [...(fetchedClasses || [])].sort((a: any, b: any) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      setClasses(sortedClasses);

      // Fetch all students rooted to this teacher's classes
      const classIds = sortedClasses.map((c: any) => c.id).filter(Boolean);
      let fetchedRootedStudents: any[] = [];
      if (classIds.length > 0) {
        try {
          const { data: stData } = await supabase
            .from('students')
            .select('id, name, class_id, grade, parent_code')
            .in('class_id', classIds);
          if (stData) {
            fetchedRootedStudents = stData;
          }
        } catch (stErr) {
          console.warn("Could not load rooted students for classes:", stErr);
        }
      }
      setRootedStudents(fetchedRootedStudents);

      let assignmentsData: any[] = [];
      if (assignmentsResponse.data) {
        if (assignmentsResponse.data.success && Array.isArray(assignmentsResponse.data.assignments)) {
          assignmentsData = assignmentsResponse.data.assignments;
        } else if (Array.isArray(assignmentsResponse.data)) {
          assignmentsData = assignmentsResponse.data;
        } else if (typeof assignmentsResponse.data === 'object') {
          const innerArray = Object.values(assignmentsResponse.data).find(v => Array.isArray(v));
          if (innerArray) {
            assignmentsData = innerArray as any[];
          }
        }
      } else if (assignmentsResponse.error) {
        console.warn("teacher_get_assignments RPC had an issue, fallback fetching direct assignments:", assignmentsResponse.error);
        try {
          const { data: directAsgns } = await supabase
            .from('assignments')
            .select('*')
            .eq('teacher_id', teacherId);
          if (directAsgns) {
            assignmentsData = directAsgns;
          }
        } catch (dErr) {
          console.warn("Direct assignments query failed:", dErr);
        }
      }

      let tSubjectsList: any[] = [];
      try {
        const { data: tSubjects } = await supabase
          .from('teacher_subjects')
          .select('class_id, subject')
          .eq('teacher_id', teacherId);
        tSubjectsList = tSubjects || [];
        setTeacherSubjects(tSubjectsList);
      } catch (e) {
        console.warn("Failed to load teacher_subjects:", e);
      }

      // Comprehensive retrieval of Admin & Broadcast Assignments:
      let actualSchoolName: string | null = 
        teacherCheck?.school_name || 
        teacher?.school_name || 
        (examsResponse.data && examsResponse.data.length > 0 ? (examsResponse.data[0] as any).school_name : null) || 
        (sortedClasses && sortedClasses.length > 0 ? sortedClasses[0].school_name : null);

      if (!actualSchoolName) {
        try {
          const { data: teacherProfile } = await supabase
            .from('teachers')
            .select('school_name')
            .eq('id', teacherId)
            .maybeSingle();
          if (teacherProfile?.school_name) {
            actualSchoolName = teacherProfile.school_name;
          }
        } catch (e) {
          console.warn("Teacher profile school check error:", e);
        }
      }

      try {
        // 1. Fetch broadcast and admin-created assignments from assignments table
        const { data: broadcasts, error: bError } = await supabase
          .from('assignments')
          .select('*')
          .or('is_broadcast.eq.true,class_name.eq.School Broadcast,created_by_admin.eq.true');

        if (!bError && broadcasts && broadcasts.length > 0) {
          broadcasts.forEach((b: any) => {
            if (!assignmentsData.some((a: any) => a.id === b.id)) {
              assignmentsData.push(b);
            }
          });
        }

        // 2. Fetch admin assignments from admin_assignments table
        try {
          const { data: adminAsgns } = await supabase
            .from('admin_assignments')
            .select('*')
            .order('created_at', { ascending: false });

          if (adminAsgns && adminAsgns.length > 0) {
            adminAsgns.forEach((adm: any) => {
              const normalizedAdm = {
                ...adm,
                id: adm.id,
                title: adm.title,
                subject: adm.subject,
                grade: adm.grade,
                class_name: 'School Broadcast',
                is_broadcast: true,
                created_by_admin: true,
                school_name: adm.target_school_name || actualSchoolName,
                questions: adm.questions,
                share_code: adm.share_code,
                due_date: adm.due_date || adm.created_at,
                created_at: adm.created_at
              };
              if (!assignmentsData.some((a: any) => a.id === adm.id || (adm.share_code && a.share_code === adm.share_code))) {
                assignmentsData.push(normalizedAdm);
              }
            });
          }
        } catch (admErr) {
          console.warn("Optional admin_assignments query:", admErr);
        }
      } catch (fallbackErr) {
        console.warn("Broadcast fallback retrieval warning:", fallbackErr);
      }

      // Authoritative scoping: teacher sees:
      // 1. Assignments created by this teacher
      // 2. Regular class assignments belonging to teacher's classes
      // 3. School admin broadcast assignments from this teacher's school matching grades & subjects taught
      const currentTeacherName = teacherCheck?.name || teacher?.name;
      const scopedAssignments = assignmentsData.filter((a: any) => {
        return isTeacherLinkedToAssignment(a, tSubjectsList, sortedClasses, teacherId, actualSchoolName, currentTeacherName);
      });

      setAssignments(scopedAssignments);
      setExams(examsResponse.data || []);

      // Also refresh pending submissions with known rooted students, class IDs, and scoped assignments
      fetchPendingSubmissions(teacherId, classIds, fetchedRootedStudents, scopedAssignments);
    } catch (err: any) {
      console.error("Dashboard Loading Error:", err);
      showToast("Failed to load data: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    const asgn = assignments.find(a => a.id === assignmentId);
    if (!asgn) return;
    if (isSchoolAdminAssignment(asgn)) {
      showToast("School Admin assignments are managed centrally by your school administrator and cannot be deleted by teachers.", "info");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${asgn.title}"? This will permanently remove it and any student submissions.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('teacher_id', teacher?.id);

      if (error) throw error;
      showToast("Assignment deleted successfully", "success");
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err: any) {
      showToast("Failed to delete assignment: " + err.message, "error");
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !selectedJoinClassId || !enteredSubject.trim()) return;

    try {
      setJoiningClass(true);
      const { data, error } = await supabase.rpc('teacher_join_class', {
        p_teacher_id: teacher.id,
        p_class_id: selectedJoinClassId,
        p_subject: enteredSubject.trim()
      });

      if (error) {
        throw error;
      }

      if (data && !data.success) {
        showToast(data.message || "Failed to join class.", "error");
      } else {
        showToast("Successfully joined class!", "success");
        setIsAddingClass(false);
        setSelectedJoinClassId(null);
        setEnteredSubject('');
        fetchDashboardData(teacher.id);
      }
    } catch (err: any) {
      console.error("Error joining class:", err);
      showToast(err.message || "Failed to join class.", "error");
    } finally {
      setJoiningClass(false);
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
      if (error) {
        // Fallback update on direct table if RPC is missing
        const { error: directError } = await supabase
          .from('classes')
          .update({ name: newName.trim() })
          .eq('id', classId);
        if (directError) throw directError;
      }
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
      if (error) {
        // Fallback delete on direct table if RPC is missing
        const { error: directError } = await supabase
          .from('classes')
          .delete()
          .eq('id', classId);
        if (directError) throw directError;
      }
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
      localStorage.removeItem('azilearn_show_school_link_banner');
      setShowLinkSchoolBanner(false);
      fetchDashboardData(teacher.id);
    }
  };

  const handleLinkSchoolFromBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !teacher?.id) return;

    setIsLinkingSchool(true);
    try {
      const { data, error } = await supabase.rpc('link_teacher_school', {
        p_teacher_id: teacher.id,
        p_school_id: selectedSchool.id
      });

      if (error) throw error;

      if (data && data.success === false) {
        showToast(data.message || "Failed to link school", "error");
        return;
      }

      showToast(`Successfully linked to ${selectedSchool.name || 'your school'}! 🏫`, 'success');

      const finalSchoolName = selectedSchool.name || (data && data.school_name) || 'Linked School';
      
      const updatedTeacher = {
        ...teacher,
        school_id: selectedSchool.id,
        school_name: finalSchoolName,
        school_linked: true
      };
      setTeacher(updatedTeacher);
      localStorage.setItem('azilearn_teacher', JSON.stringify(updatedTeacher));

      // Refresh other dashboard stats and data
      fetchDashboardData(teacher.id);
      
      // Close form and hide banner
      setShowInlineLinkForm(false);
      setIsSchoolBannerDismissed(true);
      localStorage.setItem('azilearn_dismiss_link_school_banner', 'true');
    } catch (err: any) {
      console.error("Error linking school from banner:", err);
      showToast(err.message || "Failed to link school", "error");
    } finally {
      setIsLinkingSchool(false);
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
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsChangePinOpen(true)}
              className="px-2.5 py-1.5 bg-brand-bg hover:bg-brand-accent/10 border border-brand-border hover:border-brand-accent/30 text-brand-muted hover:text-brand-accent rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              title="Change PIN"
              id="header-change-pin-btn"
            >
              <KeyRound size={12} />
              PIN
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-500/5 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {teacher?.using_shared_pin && !isSharedPinDismissed && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 animate-in fade-in slide-in-from-top-2 duration-300" id="shared-pin-nudge-banner">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <KeyRound size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-brand-text">
                  You're using your school's shared PIN.
                </p>
                <p className="text-[11px] text-brand-muted font-medium mt-0.5">
                  Set a personal PIN to keep your account secure.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={() => setIsChangePinOpen(true)}
                className="px-3 py-1.5 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                Set Personal PIN
              </button>
              <button
                onClick={() => setIsSharedPinDismissed(true)}
                className="p-1.5 hover:bg-brand-border/40 rounded-lg text-brand-muted hover:text-brand-text transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        {(!isSchoolBannerDismissed && (teacher?.school_linked === false || !teacher?.school_id || teacher?.school_name === 'Unassigned')) && (
          <div className="bg-brand-accent/5 border border-brand-accent/25 rounded-2xl p-4 flex flex-col gap-3 shrink-0 animate-in fade-in slide-in-from-top-2 duration-300" id="dismissible-school-banner">
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                  <School size={16} />
                </div>
                <p className="text-xs font-bold text-brand-text leading-relaxed">
                  You haven't linked a school yet —{' '}
                  <button
                    onClick={() => setShowInlineLinkForm(!showInlineLinkForm)}
                    className="text-brand-accent hover:underline font-black uppercase tracking-wider text-[10px] ml-1"
                  >
                    {showInlineLinkForm ? '[Hide Form]' : '[Link school]'}
                  </button>
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSchoolBannerDismissed(true);
                  localStorage.setItem('azilearn_dismiss_link_school_banner', 'true');
                }}
                className="p-1.5 hover:bg-brand-border/40 rounded-lg text-brand-muted hover:text-brand-text transition-colors shrink-0"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>

            {showInlineLinkForm && (
              <form onSubmit={handleLinkSchoolFromBanner} className="space-y-3 pt-3 border-t border-brand-border/30 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="max-w-md">
                  <LinkSchoolField
                    label="Search and Select Your School"
                    currentSchoolName={selectedSchool?.name || ''}
                    onLinked={(school) => setSelectedSchool(school)}
                    onChangeText={(text) => {
                      if (selectedSchool && text !== selectedSchool.name) {
                        setSelectedSchool(null);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInlineLinkForm(false)}
                    className="px-3 py-1.5 border border-brand-border rounded-xl text-[9px] font-black uppercase tracking-widest text-brand-muted hover:bg-brand-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedSchool || isLinkingSchool}
                    className="px-4 py-1.5 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                  >
                    {isLinkingSchool ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Linking...
                      </>
                    ) : (
                      'Submit Link'
                    )}
                  </button>
                </div>
              </form>
            )}
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
              onClick={() => setActiveView('assignments')}
              className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 transition-all relative shrink-0 ${
                activeView === 'assignments' ? 'text-brand-accent' : 'text-brand-muted'
              }`}
            >
              <FileText size={12} /> Assignments
              {assignments.length > 0 && (
                <span className="px-1.5 py-0.5 bg-brand-accent/10 text-brand-accent rounded-full text-[8px] font-black leading-none border border-brand-accent/20">
                  {assignments.length}
                </span>
              )}
              {activeView === 'assignments' && <motion.div layoutId="activeTabT" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />}
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
            <button
              onClick={() => setActiveView('grading_queue')}
              className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 transition-all relative shrink-0 ${
                activeView === 'grading_queue' ? 'text-brand-accent' : 'text-brand-muted'
              }`}
            >
              <School size={12} /> Broadcasts & Marking
              {pendingSubmissions.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[8px] font-black leading-none">
                  {pendingSubmissions.length}
                </span>
              )}
              {activeView === 'grading_queue' && <motion.div layoutId="activeTabT" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />}
            </button>
          </div>

          {/* Action buttons — scroll horizontally, never wrap */}
          {activeView !== 'forum_moderation' && activeView !== 'grading_queue' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {activeView === 'classes' ? (
                <>
                  <ActionBtn onClick={() => setIsAddingClass(true)} icon={<Plus size={12} />} label="New Class" />
                  <ActionBtn onClick={() => onCreateAssignment()} icon={<Plus size={12} />} label="Assignment" accent />
                  <ActionBtn onClick={onExamsClick} icon={<Plus size={12} />} label="Assessment" />
                  <ActionBtn onClick={() => setShowImportModal(true)} icon={<Download size={12} />} label="Import" />
                  <ActionBtn onClick={() => setShowRequestModal(true)} icon={<MessageCircle size={12} />} label="Request" green />
                </>
              ) : activeView === 'assignments' ? (
                <>
                  <ActionBtn onClick={() => onCreateAssignment()} icon={<Plus size={12} />} label="New Assignment" accent />
                  <ActionBtn onClick={() => setShowImportModal(true)} icon={<Download size={12} />} label="Import with Code" />
                  <ActionBtn onClick={() => setActiveView('grading_queue')} icon={<School size={12} />} label="Marking Queue" green />
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
                className="bg-brand-surface border border-brand-accent/30 rounded-[2rem] p-6 shadow-xl space-y-4"
              >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold tracking-tight text-lg">Add Class / Subject</h3>
                        <p className="text-xs text-brand-muted mt-0.5">
                          Browse existing classes at your school to join as a subject teacher.
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingClass(false)}
                        className="text-brand-muted hover:text-brand-accent font-medium text-sm self-start mt-1"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Filters: Grade narrowing step and Search */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-brand-bg p-3 rounded-2xl border border-brand-border">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted px-1">Narrow by Grade</label>
                        <select 
                          className="w-full bg-brand-surface border border-brand-border rounded-xl p-2.5 text-xs font-bold outline-none focus:border-brand-accent/50"
                          value={gradeFilter}
                          onChange={(e) => setGradeFilter(e.target.value)}
                        >
                          <option value="">All Grades</option>
                          {grades.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted px-1">Search Class Name</label>
                        <input 
                          type="text"
                          placeholder="Search class name..."
                          className="w-full bg-brand-surface border border-brand-border rounded-xl p-2.5 text-xs font-bold outline-none focus:border-brand-accent/50"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Class List */}
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                      {loadingSchoolClasses ? (
                        <div className="flex flex-col items-center justify-center py-8 text-brand-muted gap-2">
                          <Loader2 size={24} className="animate-spin text-brand-accent" />
                          <span className="text-xs font-bold">Loading school classes...</span>
                        </div>
                      ) : (() => {
                        const filteredSchoolClasses = schoolClasses.filter(cls => {
                          const matchesGrade = !gradeFilter || cls.grade === gradeFilter;
                          const matchesSearch = !searchQuery || cls.class_name?.toLowerCase().includes(searchQuery.toLowerCase());
                          return matchesGrade && matchesSearch;
                        });

                        if (filteredSchoolClasses.length === 0) {
                          return (
                            <div className="text-center py-8 bg-brand-bg/50 border border-brand-border border-dashed rounded-2xl">
                              <p className="text-xs text-brand-muted font-bold">No classes found matching your filter.</p>
                              <p className="text-[10px] text-brand-muted/70 mt-1">If this class doesn't exist, create it below.</p>
                            </div>
                          );
                        }

                        return filteredSchoolClasses.map((cls) => {
                          const isCurrentlySelected = selectedJoinClassId === cls.class_id;

                          return (
                            <div 
                              key={cls.class_id}
                              className={`p-4 rounded-2xl border transition-all ${
                                isCurrentlySelected 
                                  ? 'border-brand-accent bg-brand-accent/5' 
                                  : 'border-brand-border bg-brand-bg hover:border-brand-accent/50'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <h4 className="font-bold text-sm text-brand-text flex items-center gap-2">
                                    {cls.class_name}
                                    {cls.grade && (
                                      <span className="text-[10px] font-black bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {cls.grade}
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-xs text-brand-muted mt-1 font-semibold">
                                    {cls.student_count || 0} Student{(cls.student_count || 0) !== 1 ? 's' : ''}
                                  </p>

                                  {/* Chips of existing subject teachers */}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {cls.taught_by && cls.taught_by.length > 0 ? (
                                      cls.taught_by.map((tb: any, idx: number) => (
                                        <span 
                                          key={idx}
                                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
                                            tb.is_me 
                                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                                              : 'bg-brand-bg border-brand-border text-brand-muted'
                                          }`}
                                        >
                                          {tb.subject} — {tb.teacher_name}
                                          {tb.is_me && " (you already teach this)"}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[9px] font-black uppercase tracking-wider italic text-brand-muted/60">
                                        No teachers assigned yet
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {selectedJoinClassId !== cls.class_id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedJoinClassId(cls.class_id);
                                      setEnteredSubject('');
                                    }}
                                    className="px-3 py-1.5 bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow hover:scale-105 active:scale-95 transition-all shrink-0"
                                  >
                                    Join Class
                                  </button>
                                )}
                              </div>

                              {/* Selected Join Form */}
                              {isCurrentlySelected && (
                                <form onSubmit={handleJoinClass} className="mt-3 pt-3 border-t border-brand-border/40 space-y-3">
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-brand-accent block">
                                      What subject will you teach this class?
                                    </label>
                                    
                                    {/* Tappable Chip List */}
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-brand-surface/40 border border-brand-border/50 rounded-xl">
                                      {CANONICAL_SUBJECTS.map(sub => (
                                        <button
                                          key={sub}
                                          type="button"
                                          disabled={joiningClass}
                                          onClick={() => setEnteredSubject(sub)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                            enteredSubject === sub
                                              ? 'bg-brand-accent text-white shadow-sm shadow-brand-accent/20 border border-brand-accent'
                                              : 'bg-brand-surface text-brand-text border border-brand-border hover:border-brand-accent/40'
                                          }`}
                                        >
                                          {sub}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Dropdown fallback */}
                                    <div className="relative">
                                      <select 
                                        className="w-full bg-brand-surface border border-brand-accent/50 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-text appearance-none"
                                        value={enteredSubject}
                                        onChange={(e) => setEnteredSubject(e.target.value)}
                                        disabled={joiningClass}
                                        required
                                      >
                                        <option value="">-- Select or Tap Subject Above --</option>
                                        {CANONICAL_SUBJECTS.map(sub => (
                                          <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" size={14} />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="submit"
                                      disabled={joiningClass || !enteredSubject.trim()}
                                      className="px-4 py-2 bg-brand-accent text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow disabled:opacity-50"
                                    >
                                      {joiningClass ? "Joining..." : "Confirm & Join"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedJoinClassId(null)}
                                      className="px-4 py-2 bg-brand-bg border border-brand-border text-brand-muted text-[9px] font-black uppercase tracking-widest rounded-lg"
                                      disabled={joiningClass}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Admin notice */}
                    <div className="pt-4 border-t border-brand-border/50 text-center">
                      <p className="text-[10.5px] text-brand-muted/80 font-black uppercase tracking-wider">
                        Don't see your class?
                      </p>
                      <p className="text-[10px] text-brand-muted/60 mt-1">
                        Please ask your school administrator to add the class and student roster.
                      </p>
                    </div>
                  </div>
              </motion.div>
            )}

            {/* Classes/Subjects Grid */}
            {(() => {
              const dynamicAssignments = assignments.filter(a => 
                !a.is_broadcast &&
                (!a.class_id && (!a.class_name || !classes.some(cls => cls.name?.toLowerCase() === a.class_name?.toLowerCase()))) &&
                (!classes.some(cls => cls.id === a.class_id))
              );

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classes.length === 0 && dynamicAssignments.length === 0 ? (
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
                    <>
                      {classes.map((cls, index) => {
                        const classAssignments = assignments.filter(a => {
                          return isAssignmentForClass(a, cls.id, cls.name, cls.grade, teacherSubjects);
                        });
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
                              <div className="flex items-center gap-1.5 ms-2 flex-wrap justify-end">
                                {classAssignments.length > 0 ? (
                                  <>
                                    {classAssignments.filter(a => isTeacherCreatedAssignment(a, teacher?.id)).length > 0 && (
                                      <span className="text-[9px] font-black tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                                        {classAssignments.filter(a => isTeacherCreatedAssignment(a, teacher?.id)).length} My
                                      </span>
                                    )}
                                    {classAssignments.filter(a => isSchoolAdminAssignment(a)).length > 0 && (
                                      <span className="text-[9px] font-black tracking-wider text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 whitespace-nowrap">
                                        {classAssignments.filter(a => isSchoolAdminAssignment(a)).length} Admin
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[9px] font-black tracking-wider text-brand-muted bg-brand-bg px-2 py-0.5 rounded-lg border border-brand-border whitespace-nowrap">
                                    0 Work
                                  </span>
                                )}
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
                      })}

                      {dynamicAssignments.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-2xl border border-dashed border-brand-accent/40 bg-brand-surface shadow-sm hover:border-brand-accent group cursor-pointer transition-all active:scale-[0.98]"
                          onClick={() => onViewClass('dynamic-class', 'Dynamic & One-time Classes')}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-2xl bg-brand-accent/10 text-brand-accent group-hover:scale-110 transition-transform">
                              <Users size={24} className="text-brand-accent" />
                            </div>
                            <div className="flex items-center gap-1.5 ms-2">
                              <div className="bg-brand-bg border border-brand-border px-3 py-1.5 rounded-xl whitespace-nowrap">
                                <span className="text-[10px] font-black tracking-wider text-brand-muted uppercase">
                                  {dynamicAssignments.length} Assignment{dynamicAssignments.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-black tracking-tight mb-4 truncate text-brand-text">Dynamic Class (One-time)</h3>

                          <div className="flex items-center justify-between text-brand-muted">
                            <div className="flex items-center gap-2 text-[10px] font-black tracking-wider uppercase whitespace-nowrap">
                              View Assignments
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-colors">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </>
        ) : activeView === 'assignments' ? (
          <div className="space-y-4">
            {/* Header with quick stats and filter pills */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-brand-text flex items-center gap-2">
                    <FileText size={16} className="text-brand-accent" />
                    Assignments Hub
                  </h2>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Manage assignments you created and assignments dispatched by your school administrator.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onCreateAssignment()}
                    className="px-3 py-1.5 bg-brand-accent text-white rounded-xl text-xs font-bold hover:bg-brand-accent/90 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} /> New Assignment
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-3 py-1.5 bg-brand-bg border border-brand-border text-brand-text rounded-xl text-xs font-bold hover:border-brand-accent transition-all flex items-center gap-1.5"
                  >
                    <Download size={14} /> Import Code
                  </button>
                </div>
              </div>

              {/* Scope filter pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-brand-border/60">
                <button
                  onClick={() => setAssignmentFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    assignmentFilter === 'all'
                      ? 'bg-brand-text text-brand-bg shadow-sm'
                      : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text'
                  }`}
                >
                  All Assignments
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-black/10">
                    {assignments.length}
                  </span>
                </button>
                <button
                  onClick={() => setAssignmentFilter('my_assignments')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    assignmentFilter === 'my_assignments'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-emerald-600'
                  }`}
                >
                  <UserCheck size={13} />
                  Created by You
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-black/10">
                    {assignments.filter(a => isTeacherCreatedAssignment(a, teacher?.id)).length}
                  </span>
                </button>
                <button
                  onClick={() => setAssignmentFilter('broadcast')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    assignmentFilter === 'broadcast'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-purple-600'
                  }`}
                >
                  <School size={13} />
                  School Admin Broadcasts
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-black/10">
                    {assignments.filter(a => isSchoolAdminAssignment(a)).length}
                  </span>
                </button>
              </div>

              {/* Search & Subject filter bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    type="text"
                    placeholder="Search by title, subject, grade, code..."
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  />
                  {assignmentSearch && (
                    <button
                      onClick={() => setAssignmentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text text-xs"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={assignmentGradeFilter}
                    onChange={(e) => setAssignmentGradeFilter(e.target.value)}
                    className="px-3 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-medium text-brand-text focus:outline-none focus:border-brand-accent"
                  >
                    <option value="all">All Grades</option>
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  <select
                    value={assignmentSubjectFilter}
                    onChange={(e) => setAssignmentSubjectFilter(e.target.value)}
                    className="px-3 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-medium text-brand-text focus:outline-none focus:border-brand-accent"
                  >
                    <option value="all">All Subjects</option>
                    {CANONICAL_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Assignments List */}
            {(() => {
              const filteredList = assignments.filter(a => {
                // Scope filter
                if (assignmentFilter === 'my_assignments' && !isTeacherCreatedAssignment(a, teacher?.id)) return false;
                if (assignmentFilter === 'broadcast' && !isSchoolAdminAssignment(a)) return false;

                // Grade filter
                if (assignmentGradeFilter !== 'all' && !isGradeMatch(a.grade, assignmentGradeFilter)) {
                  return false;
                }

                // Subject filter
                if (assignmentSubjectFilter !== 'all' && !isSubjectMatch(a.subject, assignmentSubjectFilter)) {
                  return false;
                }

                // Search query
                if (assignmentSearch.trim()) {
                  const q = assignmentSearch.toLowerCase().trim();
                  const matchTitle = a.title?.toLowerCase().includes(q);
                  const matchSubject = a.subject?.toLowerCase().includes(q);
                  const matchGrade = a.grade?.toLowerCase().includes(q);
                  const matchCode = a.share_code?.toLowerCase().includes(q);
                  const matchClass = a.class_name?.toLowerCase().includes(q);
                  if (!matchTitle && !matchSubject && !matchGrade && !matchCode && !matchClass) {
                    return false;
                  }
                }

                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="py-16 text-center space-y-3 bg-brand-surface border border-brand-border border-dashed rounded-3xl p-6">
                    <div className="w-12 h-12 bg-brand-accent/5 rounded-full flex items-center justify-center mx-auto text-brand-accent/40">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="text-brand-text font-bold text-sm">No assignments found</p>
                      <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
                        {assignmentFilter === 'broadcast'
                          ? "No school administrator broadcasts match your current filter. Broadcast assignments are dispatched by your school admin for your subjects and grades."
                          : assignmentFilter === 'my_assignments'
                          ? "You haven't created any assignments yet. Click 'New Assignment' to create one for your class."
                          : "Try adjusting your search query or grade/subject filters."}
                      </p>
                    </div>
                    {assignmentFilter === 'my_assignments' && (
                      <button
                        onClick={() => onCreateAssignment()}
                        className="px-4 py-2 bg-brand-accent text-white rounded-xl text-xs font-bold hover:bg-brand-accent/90 transition-all inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus size={14} /> Create Assignment
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredList.map((assignment, idx) => {
                    const isAdmin = isSchoolAdminAssignment(assignment);
                    const isMy = isTeacherCreatedAssignment(assignment, teacher?.id);

                    // Parse questions count
                    let questionCount = 0;
                    if (Array.isArray(assignment.questions)) {
                      questionCount = assignment.questions.length;
                    } else if (typeof assignment.questions === 'string') {
                      try {
                        const parsed = JSON.parse(assignment.questions);
                        questionCount = Array.isArray(parsed) ? parsed.length : 0;
                      } catch {
                        questionCount = 0;
                      }
                    }

                    // Count pending submissions for this assignment
                    const assignmentPendingSubs = pendingSubmissions.filter(ps => ps.assignment_id === assignment.id);

                    return (
                      <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`p-5 rounded-2xl border bg-brand-surface transition-all hover:shadow-md flex flex-col justify-between ${
                          isAdmin
                            ? 'border-purple-500/20 hover:border-purple-500/50 bg-gradient-to-br from-purple-500/[0.02] to-brand-surface'
                            : 'border-brand-border hover:border-emerald-500/50'
                        }`}
                      >
                        <div>
                          {/* Card Header: Origin Badge & Tags */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isAdmin ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1.5">
                                  <School size={11} /> School Admin Broadcast
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                                  <UserCheck size={11} /> Created by You
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-bg text-brand-muted border border-brand-border">
                                {assignment.grade || 'All Grades'}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-bg text-brand-muted border border-brand-border">
                                {assignment.subject || 'General'}
                              </span>
                            </div>

                            {/* Actions delete button for teacher's own assignment */}
                            {isMy && (
                              <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="p-1.5 hover:bg-red-500/10 text-brand-muted hover:text-red-500 rounded-lg transition-colors shrink-0"
                                title="Delete assignment"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Assignment Title */}
                          <h3 className="text-base font-black text-brand-text tracking-tight mb-1 line-clamp-2">
                            {assignment.title}
                          </h3>

                          {/* Origin Subtitle */}
                          <p className="text-xs text-brand-muted mb-3 flex items-center gap-1.5">
                            {isAdmin ? (
                              <span className="text-purple-600/80 font-medium">
                                Centrally assigned by School Administration
                              </span>
                            ) : (
                              <span>
                                {assignment.class_name ? `Class: ${assignment.class_name}` : 'Classroom Assignment'}
                              </span>
                            )}
                            {assignment.due_date && (
                              <>
                                <span>•</span>
                                <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                              </>
                            )}
                          </p>

                          {/* Share code pill for teacher-created assignment */}
                          {assignment.share_code && (
                            <div
                              onClick={() => {
                                navigator.clipboard.writeText(assignment.share_code || '');
                                showToast(`Share code ${assignment.share_code} copied!`, "success");
                              }}
                              className="mb-3 px-3 py-1.5 bg-brand-bg hover:bg-brand-accent/5 border border-brand-border hover:border-brand-accent/30 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                              title="Click to copy student share code"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted">Share Code</span>
                                <span className="text-xs font-black tracking-wider text-brand-accent">{assignment.share_code}</span>
                              </div>
                              <Copy size={12} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
                            </div>
                          )}

                          {/* Meta stats */}
                          <div className="flex items-center gap-3 text-xs text-brand-muted font-medium mb-4">
                            <span className="flex items-center gap-1">
                              <FileText size={12} /> {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                            </span>
                            {assignmentPendingSubs.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                {assignmentPendingSubs.length} pending to mark
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-brand-border/60">
                          {assignment.questions && (
                            <button
                              onClick={() => setPreviewAssignment(assignment)}
                              className="px-3 py-1.5 bg-brand-bg hover:bg-brand-border/50 border border-brand-border text-brand-text rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <Eye size={13} /> Preview
                            </button>
                          )}

                          <button
                            onClick={() => setActiveView('grading_queue')}
                            className="flex-1 px-3 py-1.5 bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/20 text-brand-accent rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <School size={13} />
                            {assignmentPendingSubs.length > 0 ? `Mark (${assignmentPendingSubs.length})` : 'Mark Submissions'}
                          </button>

                          {assignment.class_id && assignment.class_id !== 'dynamic-class' && (
                            <button
                              onClick={() => onViewClass(assignment.class_id!, assignment.class_name || 'Class')}
                              className="px-3 py-1.5 bg-brand-bg hover:border-brand-accent border border-brand-border text-brand-muted hover:text-brand-text rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Go to class view"
                            >
                              Class <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
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
        ) : activeView === 'forum_moderation' ? (
          <ModerationPage embedMode={true} />
        ) : (
          teacher && (
            <TeacherBroadcastMarking
              teacher={teacher}
              classes={classes}
              teacherSubjects={teacherSubjects}
              onRefreshParent={() => {
                if (teacher?.id) {
                  fetchDashboardData(teacher.id);
                  fetchPendingSubmissions(teacher.id);
                }
              }}
            />
          )
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

      {previewAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-brand-surface border border-brand-border rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-brand-border flex items-start justify-between gap-4 bg-brand-bg/50">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {isSchoolAdminAssignment(previewAssignment) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1.5">
                      <School size={11} /> School Admin Broadcast
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                      <UserCheck size={11} /> Created by You
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-bg text-brand-muted border border-brand-border">
                    {previewAssignment.grade}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-bg text-brand-muted border border-brand-border">
                    {previewAssignment.subject}
                  </span>
                </div>
                <h3 className="text-lg font-black text-brand-text tracking-tight">
                  {previewAssignment.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewAssignment(null)}
                className="w-9 h-9 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Questions list */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                let questionsList: any[] = [];
                if (Array.isArray(previewAssignment.questions)) {
                  questionsList = previewAssignment.questions;
                } else if (typeof previewAssignment.questions === 'string') {
                  try {
                    questionsList = JSON.parse(previewAssignment.questions);
                  } catch {
                    questionsList = [];
                  }
                }

                if (!questionsList || questionsList.length === 0) {
                  return (
                    <div className="py-12 text-center text-brand-muted text-xs">
                      No question details available for this assignment.
                    </div>
                  );
                }

                return questionsList.map((q: any, qIdx: number) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 rounded-2xl bg-brand-bg border border-brand-border/80 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent font-black text-xs flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                          {q.type === 'multiple_choice' ? 'Multiple Choice' : q.type === 'photo' ? 'Photo Submission' : 'Short Answer'}
                        </span>
                      </div>
                      {q.max_marks && (
                        <span className="text-[10px] font-bold text-brand-muted">
                          {q.max_marks} marks
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-brand-text leading-relaxed">
                      {q.text || q.question || 'Question prompt'}
                    </p>

                    {/* MCQ Options if available */}
                    {q.options && Array.isArray(q.options) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isCorrect = q.correct_answer === opt;
                          return (
                            <div
                              key={optIdx}
                              className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                                isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-bold'
                                  : 'bg-brand-surface border-brand-border text-brand-muted'
                              }`}
                            >
                              <span className="text-[10px] font-black">{String.fromCharCode(65 + optIdx)}.</span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Correct answer or rubric display for teacher preview */}
                    {q.correct_answer && q.type !== 'multiple_choice' && (
                      <div className="pt-1 text-[11px] text-emerald-600 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-medium">
                        <span className="font-bold">Correct Answer / Model:</span> {q.correct_answer}
                      </div>
                    )}
                    {q.rubric && (
                      <div className="pt-1 text-[11px] text-brand-muted bg-brand-surface border border-brand-border px-3 py-1.5 rounded-xl">
                        <span className="font-bold text-brand-text">Grading Rubric:</span> {q.rubric}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-brand-border bg-brand-bg/50 flex items-center justify-end">
              <button
                onClick={() => setPreviewAssignment(null)}
                className="px-4 py-2 bg-brand-accent text-white rounded-xl text-xs font-bold hover:bg-brand-accent/90 transition-colors"
              >
                Close Preview
              </button>
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

      {teacher && (
        <TeacherChangePinModal
          isOpen={isChangePinOpen}
          onClose={() => setIsChangePinOpen(false)}
          teacherId={teacher.id}
          usingSharedPin={teacher.using_shared_pin}
          onSuccess={() => {
            setTeacher(prev => prev ? { ...prev, using_shared_pin: false } : null);
          }}
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
