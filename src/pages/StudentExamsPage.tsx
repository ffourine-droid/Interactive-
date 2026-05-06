import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Clock, BookOpen, AlertCircle, 
  CheckCircle2, PlayCircle, Loader2, Search,
  Filter, Calendar, Star, Trophy, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { examService } from '../services/examService';
import { Exam, ExamAttempt } from '../types';
import { useToast } from '../components/Toast';
import { StudentIdentityModal } from '../components/StudentIdentityModal';

interface StudentExamsPageProps {
  onBack: () => void;
  onStartExam: (examId: string) => void;
  onSelectAssignment: (assignmentId: string) => void;
  grade?: string;
  classId?: string;
}

export default function StudentExamsPage({ onBack, onStartExam, onSelectAssignment, grade = 'Grade 7', classId }: StudentExamsPageProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, ExamAttempt>>({});
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchGrade, setSearchGrade] = useState(grade);
  const [viewType, setViewType] = useState<'timed' | 'assignments'>('timed');
  const [filter, setFilter] = useState('all');
  const [showIdentity, setShowIdentity] = useState(false);
  const [pendingExamId, setPendingExamId] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const studentStr = localStorage.getItem('azilearn_student');
    if (studentStr) {
      fetchExamsAndAttempts();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchExamsAndAttempts = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const studentStr = localStorage.getItem('azilearn_student');
      const student = studentStr ? JSON.parse(studentStr) : null;
      
      const effectiveGrade = searchGrade || student?.grade || grade;

      await examService.seedPrebuiltExams();

      // Fetch exams and assignments in parallel
      const [examData, assignmentData] = await Promise.all([
        examService.searchExams(effectiveGrade, searchTeacher, searchSchool, searchCode),
        import('../services/assignmentService').then(m => m.assignmentService.searchAssignments(effectiveGrade, searchTeacher, searchSchool, searchCode))
      ]);

      setExams(examData);
      setAssignments(assignmentData);

      if (student?.id) {
        const attemptPromises = examData.map(e => examService.getAttempt(e.id, student.id));
        const attemptData = await Promise.all(attemptPromises);
        const attemptMap: Record<string, ExamAttempt> = {};
        attemptData.forEach(a => {
          if (a) attemptMap[a.exam_id] = a;
        });
        setAttempts(attemptMap);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load work', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExamClick = (id: string) => {
    const studentStr = localStorage.getItem('azilearn_student');
    if (!studentStr) {
      setPendingExamId(id);
      setShowIdentity(true);
    } else {
      onStartExam(id);
    }
  };

  const handleAssignmentClick = (id: string) => {
    onSelectAssignment(id);
  };

  const currentList = viewType === 'timed' ? exams : assignments;

  const filteredItems = currentList.filter(e => {
    if (viewType === 'timed') {
      const matchesFilter = filter === 'all' || 
                           (filter === 'completed' && attempts[e.id]?.is_submitted) ||
                           (filter === 'pending' && !attempts[e.id]?.is_submitted);
      return matchesFilter;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-brand-accent blur-[100px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-brand-accent blur-[100px]" />
      </div>

      {/* Header */}
      <div className="bg-white/80 dark:bg-brand-card/80 backdrop-blur-2xl border-b border-brand-border sticky top-0 z-50 p-4">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center bg-brand-bg hover:bg-brand-accent/10 border border-brand-border rounded-xl transition-all active:scale-95 group"
            >
              <ArrowLeft size={18} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
            </button>
            <div>
              <h1 className="font-black text-xl text-brand-text leading-none tracking-tighter">LEARNING HUB</h1>
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mt-1">Timed Assessments & Homework</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
            <Trophy size={20} className="text-brand-accent" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-[480px] mx-auto p-4 space-y-8 relative z-10">
        {/* View Switcher */}
        <div className="flex bg-brand-surface dark:bg-brand-card p-1 rounded-2xl border border-brand-border shadow-sm">
          <button 
            onClick={() => setViewType('timed')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'timed' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-muted hover:text-brand-accent'}`}
          >
            Timed Exams
          </button>
          <button 
            onClick={() => setViewType('assignments')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'assignments' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-muted hover:text-brand-accent'}`}
          >
            Homework
          </button>
        </div>

        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input 
                type="text"
                value={searchTeacher}
                onChange={e => setSearchTeacher(e.target.value)}
                className="w-full bg-brand-surface dark:bg-brand-card border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-0 focus:border-brand-accent outline-none transition-all shadow-sm shadow-brand-accent/5 text-brand-text"
                placeholder="Search by Teacher Name"
              />
              <span className="absolute left-10 -top-2 px-2 bg-brand-surface dark:bg-brand-card text-[8px] font-black uppercase text-brand-muted tracking-widest transition-all group-focus-within:text-brand-accent rounded-md border border-brand-border/30">Teacher Name</span>
            </div>

            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input 
                type="text"
                value={searchSchool}
                onChange={e => setSearchSchool(e.target.value)}
                className="w-full bg-brand-surface dark:bg-brand-card border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-0 focus:border-brand-accent outline-none transition-all shadow-sm shadow-brand-accent/5 text-brand-text"
                placeholder="Search by School Name"
              />
              <span className="absolute left-10 -top-2 px-2 bg-brand-surface dark:bg-brand-card text-[8px] font-black uppercase text-brand-muted tracking-widest transition-all group-focus-within:text-brand-accent rounded-md border border-brand-border/30">School</span>
            </div>

            {viewType === 'timed' && (
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
                <input 
                  type="text"
                  value={searchCode}
                  onChange={e => setSearchCode(e.target.value)}
                  className="w-full bg-brand-surface dark:bg-brand-card border border-brand-border border-2 rounded-2xl py-4 pl-12 pr-4 text-sm font-black focus:ring-0 focus:border-brand-accent outline-none transition-all shadow-sm shadow-brand-accent/5 text-brand-accent uppercase tracking-widest"
                  placeholder="OR Enter Share Code"
                />
                <span className="absolute left-10 -top-2 px-2 bg-brand-surface dark:bg-brand-card text-[8px] font-black uppercase text-brand-muted tracking-widest transition-all group-focus-within:text-brand-accent rounded-md border border-brand-border/30">Direct Access</span>
              </div>
            )}

            <div className="relative group">
              <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
              <select 
                value={searchGrade}
                onChange={e => setSearchGrade(e.target.value)}
                className="w-full bg-brand-surface dark:bg-brand-card border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-0 focus:border-brand-accent outline-none transition-all shadow-sm shadow-brand-accent/5 appearance-none text-brand-text"
              >
                {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <span className="absolute left-10 -top-2 px-2 bg-brand-surface dark:bg-brand-card text-[8px] font-black uppercase text-brand-muted tracking-widest transition-all group-focus-within:text-brand-accent rounded-md border border-brand-border/30">Grade</span>
            </div>
          </div>

          <button
            onClick={fetchExamsAndAttempts}
            disabled={loading}
            className="w-full bg-brand-text text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-brand-text/10 flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Search for {viewType === 'timed' ? 'Assessments' : 'Homework'}
          </button>

          {viewType === 'timed' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {['all', 'pending', 'completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all border ${
                    filter === f 
                      ? 'bg-brand-accent text-white border-brand-accent shadow-xl shadow-brand-accent/20' 
                      : 'bg-white dark:bg-brand-card text-brand-muted hover:text-brand-accent border-brand-border hover:border-brand-accent/30'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <Loader2 className="animate-spin text-brand-accent" size={40} />
              <div className="absolute inset-0 blur-lg bg-brand-accent/20 animate-pulse" />
            </div>
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.3em]">Synching with server...</p>
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
             <div className="w-24 h-24 rounded-[3rem] bg-brand-accent/5 flex items-center justify-center text-brand-accent/20">
                <Search size={48} />
             </div>
             <div className="space-y-2">
                <h3 className="font-black text-xl text-brand-text uppercase tracking-tighter">Locate Your Hub</h3>
                <p className="text-xs text-brand-muted max-w-[240px] font-bold mx-auto leading-relaxed">
                   Enter your school, teacher or grade level above to view and begin your {viewType === 'timed' ? 'assessments' : 'assignments'}.
                </p>
             </div>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-brand-border">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Available {viewType === 'timed' ? 'Assessments' : 'Homework'}</span>
              <span className="text-[10px] font-black text-brand-accent">{filteredItems.length} Total</span>
            </div>

            {filteredItems.map((item: any, idx: number) => {
              if (viewType === 'timed') {
                const exam = item as Exam;
                const attempt = attempts[exam.id];
                const isCompleted = attempt?.is_submitted;
                const isStarted = attempt && !isCompleted;
                
                let statusText = 'Begin Assessment';
                let statusColor = 'bg-brand-accent';
                let statusIcon = <PlayCircle size={18} />;

                if (isCompleted) {
                  statusText = attempt.has_overtime ? 'Submitted with Overtime' : 'Assessment Completed';
                  statusColor = attempt.has_overtime ? 'bg-orange-500' : 'bg-emerald-500';
                  statusIcon = <CheckCircle2 size={18} />;
                } else if (isStarted) {
                  statusText = 'Resume Session';
                  statusColor = 'bg-orange-500';
                  statusIcon = <Loader2 className="animate-spin" size={18} />;
                }

                return (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, ease: "easeOut" }}
                    className="bg-white dark:bg-brand-card rounded-[2.5rem] p-6 border border-brand-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-[0.98]"
                  >
                    <div className="absolute top-0 right-0 p-2">
                      <div className="bg-brand-bg px-3 py-1 rounded-full border border-brand-border">
                        <span className="text-[8px] font-black uppercase text-brand-muted tracking-widest">{exam.grade}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(244,123,32,0.4)]" />
                          <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.15em]">{exam.subject}</span>
                        </div>
                        
                        <h3 className="font-black text-2xl text-brand-text leading-tight tracking-tighter group-hover:text-brand-accent transition-colors">
                          {exam.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-brand-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center">
                              <Star size={12} className="text-brand-accent" />
                            </div>
                            <span className="text-[10px] font-bold text-brand-muted uppercase">{(exam as any).teacher?.name || 'Academic Core'}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-60">
                            <BookOpen size={12} className="text-brand-muted" />
                            <span className="text-[10px] font-bold text-brand-muted uppercase">{exam.questions.length} Items</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-brand-bg/50 rounded-2xl p-4 border border-brand-border flex flex-col gap-1 items-start">
                           <div className="flex items-center gap-2 text-brand-muted opacity-50 mb-1">
                              <Clock size={12} />
                              <span className="text-[8px] font-black uppercase tracking-widest">Testing Time</span>
                           </div>
                           <span className="text-lg font-black text-brand-text tracking-tighter">{exam.duration_minutes} Mins</span>
                        </div>
                        <div className="bg-brand-bg/50 rounded-2xl p-4 border border-brand-border flex flex-col gap-1 items-start">
                           <div className="flex items-center gap-2 text-brand-muted opacity-50 mb-1">
                              <Star size={12} />
                              <span className="text-[8px] font-black uppercase tracking-widest">Total Weight</span>
                           </div>
                           <span className="text-lg font-black text-brand-text tracking-tighter">{exam.questions.reduce((s: number,q: any) => s + (q.marks || 0), 0)} Pts</span>
                        </div>
                      </div>

                      {isCompleted ? (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-500/20 flex items-center justify-between">
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase text-emerald-600/60 tracking-widest leading-none mb-1">Final Result</span>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-2xl text-emerald-600 tracking-tighter tabular-nums">
                                  {Math.round((attempt.score! / attempt.total_marks!) * 100)}%
                                </span>
                                <div className="h-4 w-px bg-emerald-500/20" />
                                <span className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest italic">
                                  {attempt.score}/{attempt.total_marks}
                                </span>
                              </div>
                           </div>
                           <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                              <CheckCircle2 size={20} />
                           </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartExamClick(exam.id)}
                          className={`w-full group flex items-center justify-center gap-3 py-5 rounded-[2rem] text-white font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-[0.97] hover:brightness-105 ${statusColor} shadow-brand-accent/20`}
                        >
                          {statusIcon}
                          {statusText}
                          <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              } else {
                const assignment = item;
                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, ease: "easeOut" }}
                    className="bg-white dark:bg-brand-card rounded-[2.5rem] p-6 border border-brand-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-[0.98]"
                    onClick={() => handleAssignmentClick(assignment.id)}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em]">{assignment.subject}</span>
                        </div>
                        <div className="bg-brand-bg px-3 py-1 rounded-full border border-brand-border">
                          <span className="text-[8px] font-black uppercase text-brand-muted tracking-widest">{assignment.grade}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-black text-2xl text-brand-text leading-tight tracking-tighter group-hover:text-brand-accent transition-colors">
                        {assignment.title}
                      </h3>

                      <div className="flex items-center justify-between pt-4 border-t border-brand-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                             <BookOpen size={14} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">{assignment.teacher?.name || 'TEACHER'}</p>
                            <p className="text-[7px] font-bold text-brand-muted/60 uppercase">{assignment.teacher?.school_name || 'SCHOOL'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-brand-muted">
                           <Calendar size={12} />
                           <span className="text-[9px] font-black uppercase">Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <button className="w-full mt-2 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 group-hover:bg-emerald-500 transition-colors">
                        Open Homework
                      </button>
                    </div>
                  </motion.div>
                );
              }
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
             <div className="w-24 h-24 rounded-[3rem] bg-brand-accent/5 flex items-center justify-center text-brand-accent/20 relative">
                <AlertCircle size={48} />
                <div className="absolute inset-0 bg-brand-accent/10 blur-2xl rounded-full scale-150 animate-pulse" />
             </div>
             <div className="space-y-2">
                <h3 className="font-black text-xl text-brand-text uppercase tracking-tighter">No {viewType === 'timed' ? 'Assessments' : 'Homework'} Found</h3>
                <p className="text-xs text-brand-muted max-w-[240px] font-bold mx-auto leading-relaxed">
                   Currently there are no {viewType === 'timed' ? 'timed assessments' : 'homework tasks'} listed for {searchGrade}.
                </p>
             </div>
          </div>
        )}

        <footer className="pt-20 pb-8 text-center space-y-4">
           <div className="flex items-center justify-center gap-2 opacity-20">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
           </div>
           <p className="text-[9px] font-black text-brand-muted uppercase tracking-[0.5em]">AZILEARN HUB VER 2.0</p>
        </footer>
      </div>

      <StudentIdentityModal 
        isOpen={showIdentity}
        onClose={() => setShowIdentity(false)}
        grade={searchGrade}
        onSuccess={() => {
          if (pendingExamId) {
            onStartExam(pendingExamId);
            setPendingExamId(null);
          }
        }}
      />
    </div>
  );
}
