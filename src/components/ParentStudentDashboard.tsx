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
  AlertTriangle
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

interface Submission {
  id: string;
  assignment_id: string;
  score: number | null;
  teacher_comment?: string;
  status: 'pending' | 'graded';
  submitted_at: string;
  answers: Record<string, any>;
}

interface Acknowledgement {
  assignment_id: string;
  acknowledged_at: string;
}

interface ParentStudentDashboardProps {
  student: Student;
}

export const ParentStudentDashboard: React.FC<ParentStudentDashboardProps> = ({ student }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [ackLoading, setAckLoading] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<{assignment: Assignment, submission: Submission} | null>(null);

  useEffect(() => {
    fetchData();
  }, [student.id, student.all_student_ids?.join(',')]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const studentIds = student.all_student_ids || [student.id];
      const classIds = student.all_class_ids || [student.class_id];

      // Fetch assignments for all the student's classes
      const [assignmentsRes, submissionsRes, acksRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, subject, grade, due_date, class_id, questions, created_at')
          .in('class_id', classIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('submissions')
          .select('id, assignment_id, score, teacher_comment, status, submitted_at, answers')
          .or(`student_id.in.(${studentIds.map(id => `"${id}"`).join(',')}),student_name.ilike."${student.name.trim()}"`),
        supabase
          .from('parent_acknowledgements')
          .select('assignment_id, acknowledged_at')
          .eq('parent_code', student.parent_code)
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (acksRes.error) throw acksRes.error;

      setAssignments(assignmentsRes.data || []);
      setSubmissions(submissionsRes.data || []);
      setAcknowledgements(acksRes.data || []);
    } catch (err: any) {
      showToast("Error loading dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (assignmentId: string) => {
    setAckLoading(assignmentId);
    try {
      const { error } = await supabase
        .from('parent_acknowledgements')
        .insert({
          parent_code: student.parent_code,
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-brand-accent rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-brand-accent/20">
            {student.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-brand-text">{student.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-brand-bg border border-brand-border rounded-full text-[10px] font-black uppercase tracking-widest text-brand-muted">
                {student.grade}
              </span>
              <span className="px-3 py-1 bg-brand-surface border border-brand-accent/30 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-accent font-mono">
                Index: {student.parent_code}
              </span>
              <span className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-accent">
                {student.classes?.name || 'Assigned Class'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted flex items-center gap-2">
            <FileText size={14} />
            Assignments & Progress
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

                            {submission.teacher_comment && (
                              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                  <Award size={14} className="text-emerald-600" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Teacher's Remark</span>
                                </div>
                                <p className="text-sm font-bold text-brand-text italic leading-relaxed">
                                  "{submission.teacher_comment}"
                                </p>
                              </div>
                            )}
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

      {/* Detailed Work Modal */}
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
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedSubmission.assignment.title}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{selectedSubmission.assignment.subject} • Student Review</p>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-3 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-brand-accent transition-colors"
                >
                  <ChevronRight size={18} className="rotate-180" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {selectedSubmission.submission.teacher_comment && (
                  <section className="bg-brand-accent/5 border border-brand-accent/20 rounded-[2rem] p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <Award className="text-brand-accent" size={20} />
                      <h3 className="text-sm font-black uppercase tracking-widest text-brand-accent">Teacher's Feedback</h3>
                    </div>
                    <p className="text-lg font-bold text-brand-text leading-relaxed">
                      "{selectedSubmission.submission.teacher_comment}"
                    </p>
                  </section>
                )}

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-2">Questions & Answers</h4>
                  {selectedSubmission.assignment.questions?.map((q: any, idx: number) => (
                    <div key={q.id} className="bg-brand-bg/50 rounded-3xl p-6 border border-brand-border/50">
                      <div className="flex items-start gap-4 mb-4">
                        <span className="text-[10px] font-black text-brand-accent bg-brand-accent/10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">{idx + 1}</span>
                        <h4 className="font-bold text-sm leading-tight pt-0.5">{q.text}</h4>
                      </div>
                      <div className="pl-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">Submitted Answer</p>
                        {q.type === 'mcq' ? (
                          <div className="flex items-center gap-2">
                             <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${parseInt(selectedSubmission.submission.answers[q.id]) === q.correct_option ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                               {q.options[parseInt(selectedSubmission.submission.answers[q.id])]}
                             </div>
                             {parseInt(selectedSubmission.submission.answers[q.id]) === q.correct_option ? (
                               <CheckCircle2 size={16} className="text-emerald-500" />
                             ) : (
                               <AlertTriangle size={16} className="text-red-500" />
                             )}
                          </div>
                        ) : q.type === 'photo' ? (
                          <div className="space-y-2">
                            <img 
                              src={selectedSubmission.submission.answers[q.id]} 
                              alt="Work" 
                              className="rounded-2xl border border-brand-border w-full max-w-sm object-cover shadow-sm"
                            />
                          </div>
                        ) : (
                          <p className="font-bold text-brand-text italic bg-brand-surface p-4 rounded-xl border border-brand-border/50">{selectedSubmission.submission.answers[q.id] || 'No answer provided'}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
