import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, 
  Loader2, Filter, Download, User, BarChart3, Star,
  Search, ExternalLink, Calendar, Save, MessageCircle,
  FileText, Camera, Check, School, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { GradeBadge, getGradeLabel, getGradeColors } from '../utils/grading';

interface AssignmentResultsPageProps {
  assignmentId: string;
  onBack: () => void;
}

export default function AssignmentResultsPage({ assignmentId, onBack }: AssignmentResultsPageProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [feedback, setFeedback] = useState('');
  const [parentFeedback, setParentFeedback] = useState('');
  const [teacherReply, setTeacherReply] = useState('');
  const [score, setScore] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [savingReply, setSavingReply] = useState(false);
  const [questionGrades, setQuestionGrades] = useState<Record<string, { score: number | '', comment: string; is_correct?: boolean }>>({});
  const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`assignment-${assignmentId}-results`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignment_submissions',
        filter: `assignment_id=eq.${assignmentId}`
      }, () => {
        fetchData();
        showToast("Updates received!", "info");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignmentId]);

  useEffect(() => {
    if (selectedSubmission) {
      setFeedback(selectedSubmission.teacher_comment || '');
      setParentFeedback(selectedSubmission.parent_feedback || '');
      setTeacherReply(selectedSubmission.teacher_reply || '');
      setScore((selectedSubmission.score === null || isNaN(selectedSubmission.score)) ? '' : selectedSubmission.score);

      const initialGrades: Record<string, { score: number | '', comment: string; is_correct?: boolean }> = {};
      if (assignment && assignment.questions) {
        assignment.questions.forEach((q: any) => {
          if (q.type !== 'mcq') {
            const gradingEntry = selectedSubmission.grading?.[q.id];
            const existingScore = (gradingEntry && gradingEntry.marks_awarded !== null && gradingEntry.marks_awarded !== undefined) 
              ? gradingEntry.marks_awarded 
              : '';
            const existingComment = (gradingEntry && gradingEntry.comment) ? gradingEntry.comment : '';
            const isCorrect = gradingEntry?.correct !== undefined
              ? Boolean(gradingEntry.correct)
              : (existingScore !== '' ? Number(existingScore) > 0 : undefined);
            initialGrades[q.id] = {
              score: existingScore,
              is_correct: isCorrect,
              comment: existingComment
            };
          }
        });
      }
      setQuestionGrades(initialGrades);
    }
  }, [selectedSubmission, assignment]);

  const handleGradeSingleQuestion = async (questionId: string | number, isCorrect: boolean) => {
    if (!selectedSubmission) return;
    const qIdStr = questionId.toString();
    const teacherData = localStorage.getItem('azilearn_teacher');
    const teacherId = teacherData ? JSON.parse(teacherData).id : null;
    if (!teacherId) {
      showToast("Teacher profile not found", "error");
      return;
    }

    const currentComment = questionGrades[qIdStr]?.comment || '';
    setGradingQuestionId(qIdStr);

    const q = assignment?.questions?.find((x: any) => x.id?.toString() === qIdStr);
    const maxMarks = q?.max_marks || q?.marks || q?.points || 10;
    const marksAwarded = isCorrect ? maxMarks : 0;

    // Optimistically update question grades state
    setQuestionGrades(prev => ({
      ...prev,
      [qIdStr]: {
        score: marksAwarded,
        is_correct: isCorrect,
        comment: currentComment
      }
    }));

    try {
      const { data, error } = await supabase.rpc('teacher_grade_question', {
        p_teacher_id: teacherId,
        p_submission_id: selectedSubmission.id,
        p_question_id: qIdStr,
        p_correct: isCorrect,
        p_comment: currentComment || null
      });

      if (error) {
        console.warn("RPC teacher_grade_question fallback:", error.message);
        const updatedGrading = {
          ...(selectedSubmission.grading || {}),
          [qIdStr]: {
            correct: isCorrect,
            marks_awarded: marksAwarded,
            comment: currentComment || null
          }
        };
        await supabase
          .from('assignment_submissions')
          .update({ grading: updatedGrading })
          .eq('id', selectedSubmission.id);

        showToast(isCorrect ? "Marked Correct" : "Marked Incorrect", "info");
      } else {
        const fullyGraded = data?.fully_graded === true;
        const returnedPct = data?.percentage !== undefined && data?.percentage !== null ? Number(data.percentage) : null;
        const returnedLabel = data?.grade_label || (returnedPct !== null ? getGradeLabel(returnedPct) : null);

        setSelectedSubmission((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            percentage: returnedPct !== null ? returnedPct : prev.percentage,
            grade_label: returnedLabel || prev.grade_label,
            status: fullyGraded ? 'graded' : prev.status,
            grading: {
              ...(prev.grading || {}),
              [qIdStr]: {
                correct: isCorrect,
                marks_awarded: marksAwarded,
                comment: currentComment || null
              }
            }
          };
        });

        setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? {
          ...s,
          percentage: returnedPct !== null ? returnedPct : s.percentage,
          grade_label: returnedLabel || s.grade_label,
          status: fullyGraded ? 'graded' : s.status
        } : s));

        if (fullyGraded && returnedPct !== null) {
          showToast(`All questions graded! ${returnedPct}% — ${returnedLabel || 'Complete'}`, 'success');
        } else {
          showToast(isCorrect ? "Marked as Correct ✓" : "Marked as Incorrect ✗", "info");
        }
      }
    } catch (err: any) {
      console.error("Error in handleGradeSingleQuestion:", err);
      showToast("Error updating question grade: " + err.message, "error");
    } finally {
      setGradingQuestionId(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: asgnData, error: asgnError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .maybeSingle();

      if (asgnError) throw asgnError;
      setAssignment(asgnData);

      const { data: subData, error: subError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (subError) {
        console.error("Could not load submissions:", subError);
        showToast("Could not load submissions", 'error');
      } else {
        setSubmissions(subData || []);
      }

      // Fetch students in this class to see who hasn't submitted
      if (asgnData?.class_id) {
        let studentsData: any[] = [];
        try {
          const teacherStr = localStorage.getItem('azilearn_teacher');
          if (teacherStr) {
            const teacher = JSON.parse(teacherStr);
            const { data: rpcData, error: rpcError } = await supabase.rpc('teacher_get_class_students', {
              p_teacher_id: teacher.id,
              p_class_id: asgnData.class_id
            });
            if (!rpcError && rpcData) {
              if (Array.isArray(rpcData)) {
                studentsData = rpcData;
              } else if (typeof rpcData === 'object') {
                const innerArray = Object.values(rpcData).find(v => Array.isArray(v));
                if (innerArray) {
                  studentsData = innerArray as any[];
                } else if ((rpcData as any).id) {
                  studentsData = [rpcData];
                }
              }
            }
          }
        } catch (e) {
          console.warn("RPC fetch failed in AssignmentResultsPage:", e);
        }

        setClassStudents(studentsData);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveFeedback = async () => {
    if (!selectedSubmission) return;
    setSaving(true);
    try {
      const teacherData = localStorage.getItem('azilearn_teacher');
      if (!teacherData) throw new Error("No teacher profile found");
      const tData = JSON.parse(teacherData);
      const teacherId = tData.id;

      // 1. Calculate updated grading map
      const updatedGrading = { ...(selectedSubmission.grading || {}) };
      Object.entries(questionGrades).forEach(([qId, qg]: [string, any]) => {
        if (qg && qg.score !== '') {
          updatedGrading[qId] = {
            correct: qg.is_correct ?? (Number(qg.score) > 0),
            marks_awarded: Number(qg.score),
            comment: qg.comment || null
          };
        }
      });

      const computedPercentage = maxTotalMarks > 0 ? Math.round((runningTotal / maxTotalMarks) * 100) : 0;
      const computedGradeLabel = getGradeLabel(computedPercentage);

      // 2. Perform atomic single update to assignment_submissions
      const updatePayload: any = {
        score: runningTotal,
        percentage: computedPercentage,
        grade_label: computedGradeLabel,
        status: 'graded',
        grading: updatedGrading,
        graded_at: new Date().toISOString(),
        teacher_comment: feedback || null,
        teacher_reply: teacherReply || null,
        teacher_id: teacherId
      };

      const { error: updateErr } = await supabase
        .from('assignment_submissions')
        .update(updatePayload)
        .eq('id', selectedSubmission.id);

      if (updateErr) throw updateErr;

      // 3. Secondary RPC calls
      try {
        await supabase.rpc('teacher_grade_submission', {
          p_teacher_id: teacherId,
          p_submission_id: selectedSubmission.id,
          p_score: runningTotal,
          p_comment: feedback || null
        });
      } catch (rpcErr) {
        console.warn('Secondary RPC grading call warning:', rpcErr);
      }

      // Update local submissions state immediately
      setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? {
        ...s,
        ...updatePayload
      } : s));

      showToast(`Marks updated: ${computedPercentage}% — ${computedGradeLabel}`, 'success');
      setSelectedSubmission(null);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveTeacherReply = async () => {
    if (!selectedSubmission) return;
    setSavingReply(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({ 
          teacher_reply: teacherReply
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      showToast('Reply to parent saved!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingReply(false);
    }
  };

  const maxTotalMarks = assignment?.questions?.reduce((sum: number, q: any) => sum + (q.max_marks || q.marks || q.points || 10), 0) || 0;

  const openSubmission = async (sub: any) => {
    let freshSub = sub;
    try {
      const { data: dbSub } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('id', sub.id)
        .maybeSingle();
      if (dbSub) freshSub = dbSub;
    } catch (err) {
      console.warn("Could not fetch fresh submission:", err);
    }
    setSelectedSubmission(freshSub);
    setFeedback(freshSub.teacher_comment || '');
    setTeacherReply(freshSub.teacher_reply || '');
    
    const initialGrades: Record<string, { score: number | '', comment: string; is_correct?: boolean }> = {};
    if (assignment && assignment.questions) {
      assignment.questions.forEach((q: any) => {
        if (q.type !== 'mcq') {
          const gradingEntry = freshSub.grading?.[q.id];
          const existingScore = (gradingEntry && gradingEntry.marks_awarded !== null && gradingEntry.marks_awarded !== undefined) 
            ? gradingEntry.marks_awarded 
            : '';
          const existingComment = (gradingEntry && gradingEntry.comment) ? gradingEntry.comment : '';
          const isCorrect = gradingEntry?.correct !== undefined
            ? Boolean(gradingEntry.correct)
            : (existingScore !== '' ? Number(existingScore) > 0 : undefined);
          initialGrades[q.id] = {
            score: existingScore,
            is_correct: isCorrect,
            comment: existingComment
          };
        }
      });
    }
    setQuestionGrades(initialGrades);
  };

  const runningTotal = assignment?.questions?.reduce((sum: number, q: any) => {
    if (q.type === 'mcq') {
      const gradingEntry = selectedSubmission?.grading?.[q.id];
      if (gradingEntry && gradingEntry.marks_awarded !== null && gradingEntry.marks_awarded !== undefined) {
        return sum + Number(gradingEntry.marks_awarded);
      }
      const answer = selectedSubmission?.answers?.[q.id];
      const isCorrect = answer !== undefined && parseInt(answer) === q.correct_option;
      return sum + (isCorrect ? (q.max_marks || q.marks || q.points || 10) : 0);
    } else {
      const scoreState = questionGrades[q.id]?.score;
      const scoreNum = (scoreState !== undefined && scoreState !== '') ? Number(scoreState) : 0;
      return sum + scoreNum;
    }
  }, 0) || 0;

  const hasUngradedQuestions = assignment?.questions?.some((q: any) => {
    if (q.type === 'mcq') return false;
    const scoreState = questionGrades[q.id]?.score;
    return scoreState === undefined || scoreState === '';
  });

  const submittedCount = submissions.length;
  const pendingStudents = classStudents.filter(s =>
    !submissions.some(sub => {
      if (sub.student_id && s.id && sub.student_id === s.id) return true;
      if (sub.student_name && s.name) {
        const sName = sub.student_name.trim().toLowerCase();
        const stName = s.name.trim().toLowerCase();
        if (sName === stName) {
          if (sub.student_id && classStudents.some(other => other.id === sub.student_id && other.id !== s.id)) {
            return false;
          }
          return true;
        }
      }
      return false;
    })
  );
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  if (loading || !assignment) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-brand-accent mb-4" size={40} />
        <p className="text-xs font-black text-brand-muted uppercase tracking-widest">Loading Assignment Results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col p-4 sm:p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border border-b-[3px] border-b-brand-border/85 flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all real-press cursor-pointer shrink-0"
          >
            <ArrowLeft size={20} className="text-brand-accent" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-sans font-bold text-xl text-brand-text truncate">{assignment.title}</h1>
              {assignment.is_broadcast && (
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/15">
                  <School size={8} />
                  School-wide
                </span>
              )}
            </div>
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Assignment Results • {assignment.subject}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-brand-card rounded-3xl border border-brand-accent/5 shadow-xl shadow-brand-accent/5 overflow-hidden">
              <div className="p-6 border-b border-brand-accent/5">
                <h3 className="font-sans font-bold text-lg text-brand-text">Student Submissions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-brand-bg/50">
                      <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Student</th>
                      <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Submitted</th>
                      <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Score</th>
                      <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-accent/5">
                    {submissions.length === 0 && pendingStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-brand-muted font-bold uppercase text-xs tracking-widest">No candidates found</td>
                      </tr>
                    ) : (
                      <>
                        {submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-brand-bg/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-xs uppercase">
                                  {sub.student_name?.charAt(0)}
                                </div>
                                <span className="font-bold text-sm text-brand-text">{sub.student_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-brand-muted font-bold">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4">
                              {((sub.percentage !== null && sub.percentage !== undefined) || sub.score !== null) ? (
                                <GradeBadge 
                                  percentage={sub.percentage ?? sub.score} 
                                  gradeLabel={sub.grade_label} 
                                  size="xs" 
                                />
                              ) : (
                                <span className="font-black text-brand-muted text-xs">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                sub.status === 'graded' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                {sub.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => openSubmission(sub)}
                                className="p-2 hover:bg-brand-accent/10 text-brand-accent rounded-xl transition-all"
                              >
                                <ExternalLink size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pendingStudents.map((student) => (
                           <tr key={student.id} className="bg-red-500/5 hover:bg-red-500/10 transition-colors opacity-75">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                                      {student.name.charAt(0)}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="font-bold text-sm text-red-900">{student.name}</span>
                                      <span className="text-[10px] text-red-600 uppercase font-black tracking-widest">Awaiting Work</span>
                                   </div>
                                </div>
                              </td>
                              <td colSpan={2} className="px-6 py-4">
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-pulse flex items-center gap-2">
                                  <AlertCircle size={12}/> NO SUBMISSION
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                  Missing
                                </span>
                              </td>
                              <td className="px-6 py-4"></td>
                           </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-brand-accent/5 rounded-3xl p-6 border border-brand-accent/10">
              <h3 className="font-black text-xs uppercase tracking-widest text-brand-accent mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-muted font-bold">Total Students</span>
                  <span className="font-black text-brand-text">{classStudents.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-muted font-bold">Submissions</span>
                  <span className="font-black text-brand-text">{submittedCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-muted font-bold">Pending</span>
                  <span className="font-black text-orange-500">{pendingStudents.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-muted font-bold">Graded</span>
                  <span className="font-black text-green-600">{gradedCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubmission(null)}
              className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-white dark:bg-brand-card w-full max-w-2xl h-full shadow-2xl relative z-10 flex flex-col border-l border-brand-accent/10"
            >
              <div className="p-6 border-b border-brand-accent/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted"><ArrowLeft size={20}/></button>
                  <div>
                    <h2 className="font-bold text-lg text-brand-text">{selectedSubmission.student_name}</h2>
                    <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Reviewing Assignments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-brand-bg px-3 py-1.5 rounded-xl border border-brand-accent/10">
                    <span className="text-[10px] font-black text-brand-muted uppercase">Score:</span>
                    <span className="font-black text-sm text-brand-accent">{runningTotal}</span>
                    <span className="text-[10px] font-black text-brand-muted uppercase">/ {maxTotalMarks} Pts</span>
                    {maxTotalMarks > 0 && (
                      <span className="text-[10px] font-black text-brand-accent ml-1 bg-brand-accent/10 px-1.5 py-0.5 rounded">
                        {Math.round((runningTotal / maxTotalMarks) * 100)}%
                      </span>
                    )}
                  </div>
                  {selectedSubmission?.grade_label && (
                    <GradeBadge 
                      percentage={selectedSubmission.percentage ?? (maxTotalMarks > 0 ? Math.round((runningTotal / maxTotalMarks) * 100) : 0)} 
                      gradeLabel={selectedSubmission.grade_label} 
                      size="sm" 
                    />
                  )}
                  <button 
                    onClick={saveFeedback}
                    disabled={saving}
                    className="bg-brand-accent px-4 py-2 rounded-xl text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-sm"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-brand-bg">
                  {/* Overall Grade Banner if available */}
                  {(selectedSubmission?.grade_label || selectedSubmission?.percentage !== undefined) && (
                    <div className="p-4 bg-white dark:bg-brand-card rounded-2xl border-2 border-brand-accent/20 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                          <Award size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Performance Assessment</p>
                          <p className="font-black text-base text-brand-text">
                            {selectedSubmission.percentage !== undefined && selectedSubmission.percentage !== null 
                              ? `${selectedSubmission.percentage}% — ` 
                              : ''}
                            {selectedSubmission.grade_label || getGradeLabel(selectedSubmission.percentage ?? 0)}
                          </p>
                        </div>
                      </div>
                      <GradeBadge 
                        percentage={selectedSubmission.percentage ?? (maxTotalMarks > 0 ? Math.round((runningTotal / maxTotalMarks) * 100) : 0)} 
                        gradeLabel={selectedSubmission.grade_label} 
                        size="md" 
                      />
                    </div>
                  )}

                  {/* Teacher Remarks */}
                  <div className="bg-white dark:bg-brand-card p-6 rounded-[2rem] border-2 border-brand-accent/10 shadow-lg space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-brand-accent/10 text-brand-accent shadow-sm">
                        <MessageCircle size={18} />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-brand-accent">Teacher Remarks</h3>
                    </div>
                    <textarea 
                      placeholder="Type your final feedback for the student..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full bg-brand-bg border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 min-h-[120px] resize-none transition-all"
                    />
                    
                    {parentFeedback && (
                      <div className="pt-2 border-t border-brand-accent/5 space-y-3">
                         <div className="flex items-center gap-2">
                           <User size={14} className="text-emerald-600" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Parent's View & Response</span>
                         </div>
                         <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                            <p className="text-xs font-bold text-brand-text italic">"{parentFeedback}"</p>
                         </div>
                         <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-brand-muted">My Reply to Parent</p>
                            <textarea 
                              placeholder="Message for parent..."
                              value={teacherReply}
                              onChange={(e) => setTeacherReply(e.target.value)}
                              className="w-full bg-brand-bg border-none rounded-xl p-3 font-bold text-xs outline-none focus:ring-2 focus:ring-brand-accent/20 min-h-[60px] resize-none"
                            />
                            <button 
                              onClick={saveTeacherReply}
                              disabled={savingReply}
                              className="w-full py-2 bg-emerald-600 text-white rounded-lg font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2"
                            >
                              {savingReply ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                              Update Reply
                            </button>
                         </div>
                      </div>
                    )}

                    <button 
                      onClick={saveFeedback}
                      disabled={saving}
                      className="w-full py-4 bg-brand-accent text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Student Grade & Remarks
                    </button>
                  </div>

                <div className="h-px bg-brand-accent/10 w-full" />

                <div className="space-y-6">
                  {assignment.questions.map((q: any, idx: number) => {
                    const submissionAnswers = selectedSubmission?.answers || {};
                    const qAnswer = submissionAnswers[q.id];
                    const currentGrade = questionGrades[q.id];
                    const isQuestionGrading = gradingQuestionId === q.id.toString();
                    const isMarkedCorrect = currentGrade?.is_correct === true || Number(currentGrade?.score) === (q.max_marks || q.marks || q.points || 10);
                    const isMarkedIncorrect = currentGrade?.is_correct === false || currentGrade?.score === 0;

                    return (
                      <div key={idx} className="bg-white dark:bg-brand-card p-6 rounded-3xl border border-brand-accent/5 space-y-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent font-black text-xs shrink-0 mt-1">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-brand-text mb-2 text-lg">{q.text}</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-brand-muted shrink-0 bg-brand-bg px-2.5 py-1 rounded-lg border border-brand-border/30 font-mono">
                            {q.max_marks || q.marks || q.points || 10} Pts
                          </span>
                        </div>
                        <div className="pl-12">
                          <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-2">Student's Answer</p>
                          {q.type === 'photo' ? (
                            <div className="relative rounded-2xl overflow-hidden border border-brand-border bg-brand-bg w-full max-w-sm">
                              {qAnswer ? (
                                <>
                                  <img 
                                    src={qAnswer} 
                                    alt="Student work" 
                                    className="w-full h-auto max-h-[400px] object-contain cursor-zoom-in"
                                    onClick={() => window.open(qAnswer, '_blank')}
                                    referrerPolicy="no-referrer"
                                  />
                                  <p className="p-2 text-[10px] italic text-brand-muted border-t border-brand-border/50 bg-brand-surface text-center">Click image to expand</p>
                                </>
                              ) : (
                                <p className="p-4 text-xs font-semibold text-brand-muted">No photo uploaded</p>
                              )}
                            </div>
                          ) : q.type === 'mcq' ? (
                            <div className="space-y-2">
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
                              <div className="text-[10px] font-black uppercase tracking-widest text-brand-muted mt-1">
                                Auto-Graded: <span className="text-brand-accent">{selectedSubmission.grading?.[q.id]?.marks_awarded ?? (parseInt(qAnswer) === q.correct_option ? (q.max_marks || q.marks || q.points || 10) : 0)}</span> / {q.max_marks || q.marks || q.points || 10} marks
                              </div>
                            </div>
                          ) : (
                            <p className="font-bold text-brand-text italic bg-brand-bg p-4 rounded-xl border border-brand-border/50">{qAnswer || 'No answer provided'}</p>
                          )}

                          {/* Grading controls for short_answer and photo questions */}
                          {q.type !== 'mcq' && (
                            <div className="mt-6 pt-4 border-t border-brand-border/30 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                {/* Single tap Correct / Incorrect Toggles */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isQuestionGrading}
                                    onClick={() => handleGradeSingleQuestion(q.id, true)}
                                    className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                                      isMarkedCorrect
                                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-500/30 shadow-emerald-500/20'
                                        : 'bg-brand-surface border border-brand-border hover:bg-emerald-50 text-brand-text hover:text-emerald-600'
                                    }`}
                                  >
                                    {isQuestionGrading && isMarkedCorrect ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={14} className={isMarkedCorrect ? 'text-white' : 'text-emerald-500'} />
                                    )}
                                    Correct (+{q.max_marks || q.marks || q.points || 10})
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isQuestionGrading}
                                    onClick={() => handleGradeSingleQuestion(q.id, false)}
                                    className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                                      isMarkedIncorrect
                                        ? 'bg-red-500 text-white ring-2 ring-red-500/30 shadow-red-500/20'
                                        : 'bg-brand-surface border border-brand-border hover:bg-red-50 text-brand-text hover:text-red-600'
                                    }`}
                                  >
                                    {isQuestionGrading && isMarkedIncorrect ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <XCircle size={14} className={isMarkedIncorrect ? 'text-white' : 'text-red-500'} />
                                    )}
                                    Incorrect (0)
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Marks Awarded:</span>
                                  <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                                    isMarkedCorrect 
                                      ? 'bg-emerald-500/10 text-emerald-600' 
                                      : isMarkedIncorrect 
                                      ? 'bg-red-500/10 text-red-600' 
                                      : 'bg-brand-surface text-brand-muted border border-brand-border'
                                  }`}>
                                    {isMarkedCorrect ? (q.max_marks || q.marks || q.points || 10) : isMarkedIncorrect ? 0 : '—'} / {q.max_marks || q.marks || q.points || 10}
                                  </span>
                                </div>
                              </div>

                              {/* Question Feedback Comment */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                  Question Feedback (Optional)
                                </label>
                                <textarea
                                  value={questionGrades[q.id]?.comment || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setQuestionGrades(prev => ({
                                      ...prev,
                                      [q.id]: {
                                        score: prev[q.id]?.score ?? '',
                                        is_correct: prev[q.id]?.is_correct,
                                        comment: val
                                      }
                                    }));
                                  }}
                                  placeholder="Add optional notes or correction comments for this question..."
                                  className="w-full bg-brand-surface border border-brand-border/50 rounded-xl p-3 text-xs font-semibold text-brand-text outline-none focus:border-brand-accent transition-all min-h-[50px] resize-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasUngradedQuestions && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-3 text-amber-600 my-4">
                    <Clock size={18} className="shrink-0 animate-pulse" />
                    <div className="text-xs font-bold leading-normal">
                      Some non-MCQ questions are still unscored. You can still finalize, and the overall score will only include completed marks.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
