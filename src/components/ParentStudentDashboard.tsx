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
  Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

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
  teacher_comment?: string;
  parent_feedback?: string;
  teacher_reply?: string;
  status: 'pending' | 'graded';
  submitted_at: string;
  answers: Record<string, any>;
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

  const fetchData = async () => {
    if (!student) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const studentIds = student.all_student_ids || (student.id ? [student.id] : []);
      const classIds = student.all_class_ids || (student.class_id ? [student.class_id] : []);

      // Fetch assignments, exam attempts, and student progress securely via RPC
      const [assignmentsRes, progressRes, examsRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, subject, grade, due_date, class_id, questions, created_at')
          .in('class_id', classIds)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_student_progress_for_parent', {
          p_student_id: student.id || '',
          p_pin: parentPin
        }),
        supabase
          .from('exam_attempts')
          .select(`
            id, exam_id, score, total_marks, teacher_feedback, parent_feedback, teacher_reply, submitted_at, answers, grading,
            exam:exam_id (id, title, subject)
          `)
          .in('student_id', studentIds)
          .eq('is_submitted', true)
          .order('submitted_at', { ascending: false })
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (progressRes.error) throw progressRes.error;
      if (examsRes.error) throw examsRes.error;

      const progressData = progressRes.data || {};
      if (progressData.success === false) {
        throw new Error(progressData.error || "Wrong parent PIN / access denied.");
      }

      setAssignments(assignmentsRes.data || []);
      setSubmissions(progressData.submissions || []);
      setExamAttempts(examsRes.data || []);
      setAcknowledgements(progressData.acknowledgements || []);

      // Fetch dynamic note sessions progress
      const usernamesToQuery = student.name ? [student.name] : [];
      if ((student as any).username) {
        usernamesToQuery.push((student as any).username);
      }
      if (student.id) {
        usernamesToQuery.push(student.id);
      }

      if (usernamesToQuery.length > 0) {
        const { data: noteSessionsData, error: noteSessionsError } = await supabase
          .from('student_note_sessions')
          .select('*')
          .in('username', usernamesToQuery)
          .order('updated_at', { ascending: false });

        if (!noteSessionsError && noteSessionsData) {
          setNoteSessions(noteSessionsData);
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-brand-accent rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-brand-accent/20">
            {(student.name || '').charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-brand-text">{student.name || 'Student'}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-brand-bg border border-brand-border rounded-full text-[10px] font-black uppercase tracking-widest text-brand-muted">
                {student.grade || 'No Grade'}
              </span>
              <span className="px-3 py-1 bg-brand-surface border border-brand-accent/30 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-accent font-mono">
                Index: {student.parent_code || 'N/A'}
              </span>
              <span className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-accent">
                {(Array.isArray(student.classes) ? student.classes[0]?.name : student.classes?.name) || 'Assigned Class'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
            <Award size={14} />
            Assessment Results
          </h2>
          <span className="text-[10px] font-black text-brand-muted shrink-0">{examAttempts.length} completed</span>
        </div>

        {examAttempts.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] p-8 text-center text-brand-muted">
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">No assessment scores yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {examAttempts.map((attempt) => (
              <div key={attempt.id} className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">{attempt.exam?.subject || 'Assessment'}</span>
                      <div className="w-1 h-1 bg-brand-border rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                        Completed {new Date(attempt.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-brand-text mb-4 leading-tight">{attempt.exam?.title}</h3>

                    <div className="flex items-center gap-3 mb-4">
                       <button 
                         onClick={() => setSelectedExam(attempt)}
                         className="px-4 py-2 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                       >
                         <FileText size={14} />
                         View Detailed Assessment Answers
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {attempt.teacher_feedback && (
                        <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Award size={14} className="text-brand-accent" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Teacher's Feedback</span>
                          </div>
                          <p className="text-xs font-bold text-brand-text italic leading-relaxed">
                            "{attempt.teacher_feedback}"
                          </p>
                        </div>
                      )}

                      {attempt.parent_feedback ? (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">My Response to Teacher</span>
                          </div>
                          <p className="text-xs font-bold text-brand-text italic leading-relaxed">
                            "{attempt.parent_feedback}"
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-brand-bg border-2 border-dashed border-brand-border rounded-2xl">
                          {activeFeedbackId === attempt.id ? (
                            <div className="space-y-3">
                              <textarea 
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Response to assessment results..."
                                className="w-full bg-brand-surface border border-brand-accent/20 rounded-xl p-3 text-xs font-bold outline-none focus:border-brand-accent"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleSaveParentFeedback(attempt.id, 'exam')}
                                  disabled={savingFeedback}
                                  className="flex-1 bg-brand-accent text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                >
                                  Send Response
                                </button>
                                <button 
                                  onClick={() => {
                                    setActiveFeedbackId(null);
                                    setFeedbackText('');
                                  }}
                                  className="px-3 bg-brand-bg border border-brand-border rounded-lg text-[10px] font-black uppercase"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setActiveFeedbackId(attempt.id)}
                              className="w-full py-4 text-brand-muted hover:text-brand-accent transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              Respond to Results +
                            </button>
                          )}
                        </div>
                      )}

                      {attempt.teacher_reply && (
                        <div className="p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl md:col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText size={14} className="text-brand-accent" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Teacher's Reply</span>
                          </div>
                          <p className="text-xs font-bold text-brand-text leading-relaxed">
                            "{attempt.teacher_reply}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-brand-bg rounded-2xl border border-brand-border min-w-[100px]">
                    <Trophy className="text-brand-accent mb-1" size={24} />
                    <span className="text-2xl font-black text-brand-text">
                      {Math.round(((attempt.score || 0) / (attempt.total_marks || 1)) * 100)}%
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted">Final Grade</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
            <FileText size={14} />
            Assessments & Progress
          </h2>
          <span className="text-[10px] font-black text-brand-muted">{assignments.length} total</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {assignments.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] p-12 text-center text-brand-muted">
              <p className="font-bold">No assignments found for this class.</p>
            </div>
          ) : (
            assignments.map((assignment) => {
              const submission = submissions.find(s => s.assignment_id === assignment.id);
              const acknowledgement = acknowledgements.find(a => a.assignment_id === assignment.id);
              const isOverdue = !submission && new Date(assignment.due_date) < new Date();

              return (
                <div 
                  key={assignment.id} 
                  className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">{assignment.subject}</span>
                        <div className="w-1 h-1 bg-brand-border rounded-full" />
                        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-brand-muted'}`}>
                          <Calendar size={10} />
                          Due {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-brand-text mb-4 leading-tight">{assignment.title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {submission ? (
                          <div className="flex flex-col gap-3 w-full">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${submission.score !== null ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600' : 'bg-brand-accent/5 border-brand-accent/10 text-brand-accent'}`}>
                                {submission.score !== null ? <CheckCircle2 size={14} /> : <Hourglass size={14} className="animate-pulse" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                  {submission.score !== null ? `Submitted • ${submission.score}%` : 'Awaiting Grade'}
                                </span>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubmission({ assignment, submission });
                                }}
                                className="px-3 py-1.5 rounded-xl border-2 border-brand-accent bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent/90 transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-brand-accent/20"
                              >
                                <FileText size={12} />
                                View My Full Work
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {submission.teacher_comment && (
                                <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Award size={14} className="text-brand-accent" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Teacher's Remark</span>
                                  </div>
                                  <p className="text-xs font-bold text-brand-text italic leading-relaxed">
                                    "{submission.teacher_comment}"
                                  </p>
                                </div>
                              )}

                              {submission.parent_feedback ? (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">My Feedback to Teacher</span>
                                  </div>
                                  <p className="text-xs font-bold text-brand-text italic leading-relaxed">
                                    "{submission.parent_feedback}"
                                  </p>
                                </div>
                              ) : submission.score !== null && (
                                <div className="p-4 bg-brand-bg border-2 border-dashed border-brand-border rounded-2xl">
                                  {activeFeedbackId === submission.id ? (
                                    <div className="space-y-3">
                                      <textarea 
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Write feedback to the teacher..."
                                        className="w-full bg-brand-surface border border-brand-accent/20 rounded-xl p-3 text-xs font-bold outline-none focus:border-brand-accent"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => handleSaveParentFeedback(submission.id, 'assignment')}
                                          disabled={savingFeedback}
                                          className="flex-1 bg-brand-accent text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                        >
                                          Send Feedback
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setActiveFeedbackId(null);
                                            setFeedbackText('');
                                          }}
                                          className="px-3 bg-brand-bg border border-brand-border rounded-lg text-[10px] font-black uppercase"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setActiveFeedbackId(submission.id)}
                                      className="w-full py-4 text-brand-muted hover:text-brand-accent transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                      Add Feedback for Teacher +
                                    </button>
                                  )}
                                </div>
                              )}

                              {submission.teacher_reply && (
                                <div className="p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl md:col-span-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText size={14} className="text-brand-accent" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Teacher's Reply</span>
                                  </div>
                                  <p className="text-xs font-bold text-brand-text leading-relaxed">
                                    "{submission.teacher_reply}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isOverdue ? 'bg-red-500/5 border-red-500/10 text-red-600' : 'bg-brand-muted/5 border-brand-border text-brand-muted'}`}>
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {isOverdue ? 'Missed Work' : 'Not Submitted Yet'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        {acknowledgement ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              Confirmed {new Date(acknowledgement.acknowledged_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAcknowledge(assignment.id)}
                            disabled={ackLoading === assignment.id}
                            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-600/10"
                          >
                            {ackLoading === assignment.id ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">I Have Seen This ✓</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {submission && submission.score !== null && (
                      <div className="flex flex-col items-center justify-center p-6 bg-brand-bg rounded-2xl border border-brand-border min-w-[100px]">
                        <Award className="text-brand-accent mb-1" size={24} />
                        <span className="text-2xl font-black text-brand-text">{submission.score}%</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted">Grade</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Curriculum Study & Revisions Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
            <CheckCircle2 size={14} className="text-brand-accent px-0" />
            Curriculum Study & Revision Progress
          </h2>
          <span className="text-[10px] font-black text-brand-muted shrink-0">
            {noteSessions.length} active {noteSessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {noteSessions.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] p-8 text-center text-brand-muted">
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">No study sessions logged yet</p>
            <p className="text-[10px] text-brand-muted mt-1 leading-relaxed max-w-sm mx-auto">
              When {student.name || 'the student'} opens, reads, and practices revision package topics, their dynamic progress and XP logs will show up here in real-time!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {noteSessions.map((session) => (
              <div key={session.id} className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#F97316]">
                        {session.subject}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-border" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-muted">
                        Grade {session.grade}
                      </span>
                      {session.version && (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-border" />
                          <span className="text-[10px] font-extrabold text-brand-muted">
                            Version: {session.version}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-brand-text mb-2 leading-tight">
                      {session.topic}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[10px]">
                      {session.completed || session.progress_pct >= 100 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full font-black uppercase tracking-wider">
                          <CheckCircle2 size={11} /> Completed ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-black uppercase tracking-wider">
                          <Hourglass size={11} className="animate-pulse" /> Studying ({session.progress_pct || 0}%)
                        </span>
                      )}

                      <span className="text-brand-muted font-bold">
                        Last Active: {new Date(session.updated_at || session.started_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Circular progress or score badge right side */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex flex-col items-center justify-center p-4 bg-brand-bg rounded-2xl border border-brand-border min-w-[90px]">
                      <span className="text-xl font-black text-brand-text font-mono">
                        {session.progress_pct || 0}%
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted">
                        Study Progress
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-brand-bg rounded-2xl border border-brand-border min-w-[90px]">
                      <span className="text-xl font-black text-[#FF6B2C] font-mono">
                        +{session.xp_earned || 0}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted">
                        XP Gained
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Work Modal */}
      <AnimatePresence>
        {(selectedSubmission || selectedExam) && (
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
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedSubmission?.assignment.title || selectedExam?.exam?.title}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{selectedSubmission?.assignment.subject || selectedExam?.exam?.subject} • Student Review</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSubmission(null);
                    setSelectedExam(null);
                  }}
                  className="p-3 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-brand-accent transition-colors"
                >
                  <ChevronRight size={18} className="rotate-180" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Remarks Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Teacher's Feedback (Read Only) */}
                   {(selectedSubmission?.submission.teacher_comment || selectedExam?.teacher_feedback) ? (
                    <section className="bg-brand-accent/5 border border-brand-accent/20 rounded-[2rem] p-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <Award className="text-brand-accent" size={20} />
                        <h3 className="text-sm font-black uppercase tracking-widest text-brand-accent">Teacher's Feedback</h3>
                      </div>
                      <p className="text-sm font-bold text-brand-text leading-relaxed">
                        "{selectedSubmission?.submission.teacher_comment || selectedExam?.teacher_feedback}"
                      </p>
                      
                      {(selectedSubmission?.submission.teacher_reply || selectedExam?.teacher_reply) && (
                        <div className="mt-4 pt-4 border-t border-brand-accent/10">
                          <p className="text-[9px] font-black uppercase tracking-widest text-brand-accent mb-2">Teacher's Reply to your Remarks</p>
                          <p className="font-bold text-xs text-brand-text italic">
                            "{selectedSubmission?.submission.teacher_reply || selectedExam?.teacher_reply}"
                          </p>
                        </div>
                      )}
                    </section>
                   ) : (
                    <div className="bg-brand-bg border border-brand-border border-dashed rounded-[2rem] p-6 flex items-center justify-center text-brand-muted text-[10px] font-black uppercase tracking-widest">
                      No teacher comments yet
                    </div>
                   )}

                   {/* Parent's Remarks (Editable) */}
                   <section className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <User className="text-emerald-600" size={20} />
                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600">My Remarks</h3>
                      </div>
                      <textarea 
                        placeholder="Add your notes or questions for the teacher..."
                        value={modalFeedbackText}
                        onChange={(e) => setModalFeedbackText(e.target.value)}
                        className="w-full bg-white dark:bg-brand-card border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px] resize-none transition-all"
                      />
                      <button 
                        onClick={() => handleSaveParentFeedback(selectedSubmission?.submission.id || selectedExam?.id || '', selectedSubmission ? 'assignment' : 'exam', true)}
                        disabled={savingFeedback}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                      >
                        {savingFeedback ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {savingFeedback ? 'Saving...' : 'Save Remarks'}
                      </button>
                   </section>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-2">Questions & Answers</h4>
                  
                  {loadingExamDetails && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-brand-accent" size={32} />
                    </div>
                  )}

                  {selectedSubmission && selectedSubmission.assignment.questions?.map((q: any, idx: number) => {
                    const submissionAnswers = selectedSubmission.submission?.answers || {};
                    const qAnswer = submissionAnswers[q.id] !== undefined
                      ? submissionAnswers[q.id]
                      : (submissionAnswers[idx] !== undefined ? submissionAnswers[idx] : submissionAnswers[String(idx)]);
                    return (
                      <div key={q.id} className="bg-brand-bg/50 rounded-3xl p-6 border border-brand-border/50">
                        <div className="flex items-start gap-4 mb-4">
                          <span className="text-[10px] font-black text-brand-accent bg-brand-accent/10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">{idx + 1}</span>
                          <h4 className="font-bold text-sm leading-tight pt-0.5">{q.text}</h4>
                        </div>
                        <div className="pl-10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Submitted Answer</p>
                          {q.type === 'mcq' ? (
                            <div className="flex items-center gap-2">
                               <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${parseInt(qAnswer) === q.correct_option ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                                 {q.options?.[parseInt(qAnswer)] || 'No choice selected'}
                               </div>
                               {parseInt(qAnswer) === q.correct_option ? (
                                 <CheckCircle2 size={16} className="text-emerald-500" />
                               ) : (
                                 <AlertTriangle size={16} className="text-red-500" />
                               )}
                            </div>
                          ) : q.type === 'photo' ? (
                            <div className="space-y-2">
                              {qAnswer ? (
                                <img 
                                  src={qAnswer} 
                                  alt="Work" 
                                  className="rounded-2xl border border-brand-border w-full max-w-sm object-cover shadow-sm"
                                  referrerPolicy="no-referrer"
                                />
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

                  {selectedExam && examData && examData.questions?.map((q: any, idx: number) => {
                    const studentAnswer = (selectedExam as any).answers?.[idx] !== undefined
                      ? (selectedExam as any).answers?.[idx]
                      : (selectedExam as any).answers?.[String(idx)];
                    
                    const gradingEntry = selectedExam.grading?.[idx] !== undefined
                      ? selectedExam.grading[idx]
                      : selectedExam.grading?.[String(idx)];
                    
                    const isGraded = q.type === 'mcq' || gradingEntry !== undefined;
                    
                    const isCorrect = q.type === 'mcq'
                      ? studentAnswer === q.correct_answer
                      : (typeof gradingEntry === 'object' && gradingEntry !== null
                          ? (gradingEntry.correct === true || gradingEntry.correct === 'true')
                          : false);
                    
                    const marksAwarded = typeof gradingEntry === 'object' && gradingEntry !== null
                      ? (gradingEntry.marks_awarded ?? 0)
                      : (typeof gradingEntry === 'number' ? gradingEntry : (isCorrect ? q.marks : 0));

                    return (
                      <div key={idx} className="bg-brand-bg/50 rounded-3xl p-6 border border-brand-border/50">
                        <div className="flex items-start gap-4 mb-4">
                          <span className="text-[10px] font-black text-brand-accent bg-brand-accent/10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">{idx + 1}</span>
                          <h4 className="font-bold text-sm leading-tight pt-0.5">{q.question}</h4>
                        </div>
                        <div className="pl-10 space-y-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Student Response</p>
                            {q.type === 'image' ? (
                              <div className="space-y-2">
                                {studentAnswer ? (
                                  <img 
                                    src={studentAnswer} 
                                    alt="Student's submission" 
                                    className="rounded-2xl border-2 border-brand-border max-w-full max-h-64 object-contain shadow-sm bg-brand-surface"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <p className="text-xs font-bold text-brand-muted bg-brand-surface p-4 rounded-xl border border-dashed border-brand-border/50">
                                    No upload provided
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className={`p-4 rounded-xl text-sm font-bold border-2 ${
                                q.type === 'mcq' 
                                  ? isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 'bg-red-500/5 border-red-500/20 text-red-600'
                                  : isGraded 
                                    ? isCorrect 
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' 
                                      : 'bg-red-500/5 border-red-500/20 text-red-600'
                                    : 'bg-brand-surface border-brand-border/50 text-brand-text'
                              }`}>
                                {studentAnswer || 'No response'}
                              </div>
                            )}
                          </div>
                          
                          {q.type === 'mcq' && (
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Correct Solution</p>
                               <div className="p-4 rounded-xl text-sm font-bold bg-emerald-500/5 border-2 border-emerald-500/20 text-emerald-600">
                                 {q.correct_answer}
                               </div>
                            </div>
                          )}

                          {q.type !== 'mcq' && (
                            <div className="mt-2 flex items-center gap-2">
                              {gradingEntry !== undefined ? (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest w-fit ${
                                  isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
                                }`}>
                                  <Star size={12} />
                                  Marks: {marksAwarded} / {q.marks}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit animate-pulse">
                                  <Hourglass size={12} />
                                  Awaiting Teacher's Grading
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
