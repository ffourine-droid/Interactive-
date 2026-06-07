import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Send, 
  Camera, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  User, 
  FileText, 
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
  Trophy,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { assignmentService } from '../services/assignmentService';

interface Question {
  id: string;
  type: 'mcq' | 'short_answer' | 'photo';
  text: string;
  options: string[];
  correct_option: number | null;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  class_id?: string;
  class_name: string;
  due_date: string;
  questions: Question[];
}

export const StudentAssignmentView: React.FC<{ 
  onBack: () => void, 
  onExamsClick?: () => void,
  preSelectedAssignmentId?: string 
}> = ({ onBack, onExamsClick, preSelectedAssignmentId }) => {
  const [step, setStep] = useState<'entry' | 'taking' | 'success'>('entry');
  const [searchCode, setSearchCode] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [searchGrade, setSearchGrade] = useState('Grade 7');
  const [hasSearched, setHasSearched] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [studentName, setStudentName] = useState(sessionStorage.getItem('azilearn_student_name') || '');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [submission, setSubmission] = useState<any | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (step === 'entry') {
      const studentStr = localStorage.getItem('azilearn_student');
      if (studentStr) {
        const student = JSON.parse(studentStr);
        setSearchGrade(student.grade || 'Grade 7');
        if (!preSelectedAssignmentId) {
          fetchAssignments();
        }
      } else {
        setLoading(false);
      }
    }
  }, [step]);

  useEffect(() => {
    if (preSelectedAssignmentId && step === 'entry') {
      handleJoinAssignment(preSelectedAssignmentId);
    }
  }, [preSelectedAssignmentId, step]);

  const fetchAssignments = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await assignmentService.searchAssignments(searchGrade, searchTeacher, searchSchool, searchCode);
      setAssignments(data);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAssignment = async (id: string) => {
    if (!studentName.trim()) {
      showToast("Please enter your name first.", "error");
      return;
    }

    setLoading(true);
    try {
      const { assignment: data, studentId: sid } = await assignmentService.joinAssignment(id, studentName);
      setAssignment(data as Assignment);
      setStudentId(sid);
      sessionStorage.setItem('azilearn_student_name', studentName);

      // Check if already submitted
      const { data: subData } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id', sid)
        .maybeSingle();
      
      if (subData) {
        setSubmission(subData);
        setStep('success'); // Show the success/result screen
      } else {
        setStep('taking');
        showToast("Assignment joined! Good luck! 🎉", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const handleFileChange = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [questionId]: file }));
      // Generate a preview local URL if needed, but here we just store the file
      handleAnswerChange(questionId, file.name); 
    }
  };

  const submitAssignment = async () => {
    if (!assignment) return;
    
    // Check if all questions are answered
    const unanswered = assignment.questions.find(q => !answers[q.id] && !files[q.id]);
    if (unanswered) {
      showToast("Please answer all questions before submitting.", "info");
      return;
    }

    setSubmitting(true);
    try {
      const finalAnswers: Record<string, any> = { ...answers };
      
      // 1. Upload photos if any
      for (const qId of Object.keys(files)) {
        const file = files[qId];
        const fileExt = file.name.split('.').pop();
        const fileName = `${assignment.id}/${studentName.replace(/\s+/g, '_')}_${qId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('assignment-photos')
          .upload(fileName, file);
        
        if (uploadError) throw new Error("Failed to upload photo work. Please try again.");
        
        const { data: publicUrlData } = supabase.storage
          .from('assignment-photos')
          .getPublicUrl(fileName);
          
        finalAnswers[qId] = publicUrlData.publicUrl;
      }

      // 2. Calculate score for MCQs
      let mcqCount = 0;
      let correctCount = 0;
      
      assignment.questions.forEach(q => {
        if (q.type === 'mcq') {
          mcqCount++;
          if (parseInt(answers[q.id]) === q.correct_option) {
            correctCount++;
          }
        }
      });

      const score = mcqCount > 0 ? Math.round((correctCount / mcqCount) * 100) : null;

      // 3. Insert submission
      const { error: submitError } = await supabase
        .from('assignment_submissions')
        .insert([{
          assignment_id: assignment.id,
          student_id: studentId || studentName,
          student_name: studentName,
          answers: finalAnswers,
          score: score,
          status: 'pending'
        }]);

      if (submitError) throw submitError;

      setStep('success');
      showToast("Assignment submitted! Excellent work! 🎉", "success");
    } catch (err: any) {
      console.error('Submission error:', err);
      showToast(err.message || "Failed to submit assignment.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format due date
  const getDueStatus = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return "Overdue";
    if (days === 0) return "Due Today";
    if (days === 1) return "Due Tomorrow";
    return `Due in ${days} days`;
  };

  if (step === 'success') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Trophy className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">Great Job!</h2>
          <p className="text-brand-text/60 font-bold mb-8">Your work has been submitted! 🎉</p>
          
          <div className="bg-brand-bg/50 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Assignment</p>
              <p className="font-bold text-sm">{assignment?.title}</p>
            </div>
            {submission?.score !== undefined && submission?.score !== null && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-1">Grade</p>
                <p className="text-2xl font-black text-brand-accent">{submission.score}%</p>
              </div>
            )}
            {submission?.teacher_comment && (
              <div className="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-1">Teacher Feedback</p>
                <p className="text-sm font-bold text-brand-text italic">"{submission.teacher_comment}"</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Submitted At</p>
              <p className="font-bold text-sm">
                {submission?.created_at ? new Date(submission.created_at).toLocaleString() : new Date().toLocaleString()}
              </p>
            </div>
          </div>

          <button 
            onClick={onBack}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all"
          >
            Back to Lessons
          </button>

          {onExamsClick && (
            <button 
              onClick={onExamsClick}
              className="w-full mt-4 bg-brand-bg border-2 border-brand-accent text-brand-accent py-5 rounded-2xl font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
            >
              Take a Timed Assessment
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (step === 'taking' && assignment) {
    return (
      <div className="max-w-[420px] mx-auto pb-12">
        <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-brand-surface rounded-xl transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="font-black text-sm tracking-tight truncate max-w-[150px]">{assignment.title}</h2>
              <p className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">{assignment.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-full border border-amber-500/10">
            <Clock size={12} className="shrink-0" />
            <span className="text-[10px] font-bold whitespace-nowrap">{getDueStatus(assignment.due_date)}</span>
          </div>
        </header>

        <main className="p-4 space-y-6">
          <div className="bg-brand-accent/5 border border-brand-accent/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white font-black">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent/40 leading-none mb-1">Student</p>
              <p className="font-bold text-sm tracking-tight">{studentName}</p>
            </div>
          </div>

          <div className="space-y-4">
            {assignment.questions.map((q, idx) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-sm"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent font-black text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <h3 className="font-bold text-lg leading-tight pt-1">{q.text}</h3>
                </div>

                <div className="pl-12">
                  {q.type === 'mcq' && (
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => handleAnswerChange(q.id, optIdx.toString())}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                            answers[q.id] === optIdx.toString()
                              ? 'bg-brand-accent border-brand-accent text-white'
                              : 'bg-brand-bg border-brand-border hover:border-brand-accent/50 text-brand-text/80'
                          }`}
                        >
                          <span className="font-bold text-[15px]">{opt}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            answers[q.id] === optIdx.toString() ? 'border-white' : 'border-brand-border/40 group-hover:border-brand-accent/40'
                          }`}>
                            {answers[q.id] === optIdx.toString() && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <textarea 
                      placeholder="Type your answer here..."
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 outline-none focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5 transition-all font-bold text-sm min-h-[100px] resize-none"
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                    />
                  )}

                  {q.type === 'photo' && (
                    <div className="space-y-4">
                      {files[q.id] ? (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                              <Camera className="text-emerald-500" size={20} />
                            </div>
                            <div className="max-w-[150px]">
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/40 leading-none mb-1">Uploaded</p>
                              <p className="text-xs font-bold truncate">{files[q.id].name}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const newFiles = { ...files };
                              delete newFiles[q.id];
                              setFiles(newFiles);
                              const newAnswers = { ...answers };
                              delete newAnswers[q.id];
                              setAnswers(newAnswers);
                            }}
                            className="p-2 text-brand-muted hover:text-red-500 transition-colors"
                          >
                            <AlertCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-brand-border rounded-3xl cursor-pointer hover:bg-brand-accent/5 hover:border-brand-accent/30 transition-all group">
                          <Camera className="text-brand-muted group-hover:text-brand-accent transition-colors" size={32} />
                          <div className="text-center">
                            <p className="text-sm font-bold text-brand-text">Capture Work</p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-brand-muted">Camera or Upload</p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                            onChange={e => handleFileChange(q.id, e)}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <button 
            onClick={submitAssignment}
            disabled={submitting}
            className="w-full bg-brand-accent text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-brand-accent/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Submitting Work...
              </>
            ) : (
              <>
                <Send size={20} />
                Submit Assignment
              </>
            )}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-brand-card/80 backdrop-blur-xl border-b border-brand-accent/10 sticky top-0 z-50 p-4">
        <div className="max-w-[420px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center hover:bg-brand-accent/10 rounded-full transition-colors"
            >
              <ChevronLeft size={20} className="text-brand-accent" />
            </button>
            <h1 className="font-sans font-bold text-xl text-brand-text">Assignments</h1>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full max-w-[420px] mx-auto p-4 space-y-6">
        <div className="space-y-4">
          <div className="group">
            <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">My Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
              <input 
                type="text"
                placeholder="e.g. John Kamau"
                className="w-full bg-white dark:bg-brand-card border border-brand-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all shadow-sm"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent/50 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Assignment Code (Optional)"
                value={searchCode}
                onChange={e => setSearchCode(e.target.value)}
                className="w-full bg-white dark:bg-brand-card border border-brand-accent/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all shadow-sm placeholder:text-brand-muted/70"
              />
              <span className="absolute left-10 -top-2 px-2 bg-white dark:bg-brand-card text-[8px] font-black uppercase text-brand-accent tracking-widest transition-all rounded-md border border-brand-accent/30">Assignment Code</span>
            </div>

            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Teacher's Name"
                value={searchTeacher}
                onChange={e => setSearchTeacher(e.target.value)}
                className="w-full bg-white dark:bg-brand-card border border-brand-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all shadow-sm"
              />
              <span className="absolute left-10 -top-2 px-2 bg-white dark:bg-brand-card text-[8px] font-black uppercase text-brand-muted tracking-widest transition-all group-focus-within:text-brand-accent rounded-md border border-brand-accent/30">Teacher Name</span>
            </div>

            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input 
                type="text"
                placeholder="School Name"
                value={searchSchool}
                onChange={e => setSearchSchool(e.target.value)}
                className="w-full bg-white dark:bg-brand-card border border-brand-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all shadow-sm"
              />
              <span className="absolute left-10 -top-2 px-2 bg-white dark:bg-brand-card text-[8px] font-black uppercase text-brand-muted tracking-widest transition-all group-focus-within:text-brand-accent rounded-md border border-brand-accent/30">School</span>
            </div>

            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <select 
                value={searchGrade}
                onChange={e => setSearchGrade(e.target.value)}
                className="w-full bg-white dark:bg-brand-card border border-brand-accent/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all shadow-sm appearance-none"
              >
                {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <span className="absolute left-10 -top-2 px-2 bg-white dark:bg-brand-card text-[8px] font-black uppercase text-brand-muted tracking-widest transition-all group-focus-within:text-brand-accent rounded-md border border-brand-accent/30">Grade</span>
            </div>
            
            <button
              onClick={fetchAssignments}
              disabled={loading}
              className="w-full bg-brand-text text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-brand-text/10 flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              Search for Assignments
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
            <Loader2 className="animate-spin text-brand-accent mb-4" size={32} />
            <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">Checking assignments...</p>
          </div>
        ) : !hasSearched ? (
           <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-brand-accent/5 flex items-center justify-center text-brand-accent/30">
                 <Search size={32} />
              </div>
              <div className="space-y-1">
                 <p className="font-bold text-brand-text">Find Your Assignment</p>
                 <p className="text-xs text-brand-muted max-w-[200px]">Enter details above to find your assignments.</p>
              </div>
           </div>
        ) : assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((asgn, idx) => (
              <motion.div
                key={asgn.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-brand-card rounded-3xl p-5 border border-brand-accent/5 shadow-xl shadow-brand-accent/5 overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => handleJoinAssignment(asgn.id)}
              >
                <div className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">{asgn.subject}</span>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded-lg">{getDueStatus(asgn.due_date)}</span>
                    </div>
                    <h3 className="font-sans font-bold text-lg text-brand-text truncate">{asgn.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                      <span className="font-black text-brand-accent">{asgn.teacher?.name}</span>
                      <span className="w-1 h-1 rounded-full bg-brand-muted/30" />
                      <span className="italic">{asgn.teacher?.school_name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-accent">
                      Start Assignment <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-brand-accent/5 flex items-center justify-center text-brand-accent/30">
                <AlertCircle size={32} />
             </div>
             <div className="space-y-1">
                <p className="font-bold text-brand-text">No Assignments Found</p>
                <p className="text-xs text-brand-muted max-w-[200px]">Try searching for your teacher's name or school.</p>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentAssignmentView;
