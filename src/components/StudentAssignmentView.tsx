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
  Calendar
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
  title: string;
  subject: string;
  grade: string;
  class_id?: string;
  class_name: string;
  due_date: string;
  questions: Question[];
}

export const StudentAssignmentView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<'entry' | 'taking' | 'success'>('entry');
  const [assignmentCode, setAssignmentCode] = useState('');
  const [studentName, setStudentName] = useState(sessionStorage.getItem('azilearn_student_name') || '');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const { showToast } = useToast();

  const handleFetchAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !assignmentCode.trim()) {
      showToast("Please enter your name and the assignment code.", "error");
      return;
    }

    setLoading(true);
    try {
      // In a real app, we'd have a specific column for the short code.
      // For this prototype, we query by checking if the start of the UUID matches the 6-char code.
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('short_code', assignmentCode.toUpperCase().trim())
        .single();

      if (error || !data) {
        throw new Error("Assignment not found. Please check the code.");
      }

      setAssignment(data as Assignment);
      
      // Look for the student in the class
      if (data.class_id) {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', data.class_id)
          .ilike('name', studentName.trim())
          .maybeSingle();
        
        if (studentData) {
          setStudentId(studentData.id);
        } else {
          setStudentId(studentName); // Fallback to name if not found
        }
      } else {
        setStudentId(studentName);
      }

      sessionStorage.setItem('azilearn_student_name', studentName);
      setStep('taking');
      showToast("Assignment joined! Good luck! 🎉", "success");
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
        .from('submissions')
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
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Submitted At</p>
              <p className="font-bold text-sm">{new Date().toLocaleString()}</p>
            </div>
          </div>

          <button 
            onClick={onBack}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all"
          >
            Back to Lessons
          </button>
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-brand-bg">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="text-brand-accent" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">Assignments</h1>
          <p className="text-brand-muted font-medium text-sm">Enter the code from your teacher.</p>
        </div>

        <form onSubmit={handleFetchAssignment} className="space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2 group-focus-within:text-brand-accent transition-colors">Your Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                <input 
                  type="text"
                  required
                  placeholder="e.g. John Kamau"
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5 transition-all font-bold"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2 group-focus-within:text-brand-accent transition-colors">Assignment Code</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                <input 
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-character code"
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5 transition-all font-bold uppercase tracking-widest"
                  value={assignmentCode}
                  onChange={e => setAssignmentCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            Enter Classroom
          </button>
        </form>
        
        <button 
          onClick={onBack}
          className="w-full py-4 text-brand-muted font-bold text-xs uppercase tracking-widest hover:text-brand-accent transition-colors"
        >
          Cancel
        </button>
      </motion.div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-brand-muted/40">
          <HelpCircle size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Need help? Ask your teacher</span>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignmentView;
