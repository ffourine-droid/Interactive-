import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, MessageCircle, BookOpen, 
  GraduationCap, Hash, Layout, 
  Loader2, CheckCircle2, AlertCircle,
  Clock, X, History, FileText, Award, Users, Copy, Download, Sparkles
} from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from './Toast';

interface QuestionRequestFormProps {
  teacher: {
    id: string;
    name: string;
    school_name: string;
  };
  onClose: () => void;
  onImportCode?: (code: string) => void;
}

export const QuestionRequestForm: React.FC<QuestionRequestFormProps> = ({ teacher, onClose, onImportCode }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form fields
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [description, setDescription] = useState('');
  const [questionTypes, setQuestionTypes] = useState('Multiple Choice');
  const [requestType, setRequestType] = useState<'assignment' | 'exam' | 'competition_questions' | 'group_work' | 'other'>('assignment');

  // History fields
  const [pastRequests, setPastRequests] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async (silent = false) => {
    if (!silent) setLoadingHistory(true);
    try {
      await setTeacherConfig(teacher.id);

      // Try reading from teacher_admin_requests first
      const { data: data1, error: err1 } = await supabase
        .from('teacher_admin_requests')
        .select('*')
        .eq('teacher_id', teacher.id)
        .order('created_at', { ascending: false });

      if (err1 && (err1.message?.includes('relation "public.teacher_admin_requests" does not exist') || err1.message?.includes('does not exist') || err1.code === 'PGRST116')) {
        // Fallback to question_requests
        const { data: data2, error: err2 } = await supabase
          .from('question_requests')
          .select('*')
          .eq('teacher_id', teacher.id)
          .order('created_at', { ascending: false });
        
        if (err2) throw err2;
        // Map back
        const mapped = (data2 || []).map(r => ({
          ...r,
          question_count: r.num_questions,
          request_type: r.request_type === 'assessment' ? 'exam' : (r.request_type === 'groupwork' ? 'group_work' : r.request_type)
        }));
        setPastRequests(mapped);
      } else {
        if (err1) throw err1;
        setPastRequests(data1 || []);
      }
    } catch (e: any) {
      console.error(e);
      if (!silent) showToast("Error loading request history", "error");
    } finally {
      if (!silent) setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
      const interval = setInterval(() => {
        fetchHistory(true);
      }, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !grade || !topic || !description) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      await setTeacherConfig(teacher.id);

      const payload = {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        school_name: teacher.school_name,
        request_type: requestType, // assignment | exam | competition_questions | group_work | other
        subject,
        grade,
        topic,
        description,
        question_count: numQuestions,
        question_types: questionTypes || 'Multiple Choice',
        status: 'pending'
      };

      let insertError = null;
      // 1. Try teacher_admin_requests
      const { data: data1, error: err1 } = await supabase
        .from('teacher_admin_requests')
        .insert([payload])
        .select();

      if (err1 && (err1.code === 'PGRST116' || err1.message?.includes('relation "public.teacher_admin_requests" does not exist') || err1.message?.includes('does not exist'))) {
        // Fallback to question_requests with mapped columns
        const fallbackPayload = {
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          school_name: teacher.school_name,
          subject,
          grade,
          topic,
          num_questions: numQuestions,
          description,
          status: 'pending',
          request_type: requestType === 'exam' ? 'assessment' : (requestType === 'group_work' ? 'groupwork' : requestType)
        };
        const { error: err2 } = await supabase
          .from('question_requests')
          .insert([fallbackPayload]);
        insertError = err2;
      } else if (err1) {
        insertError = err1;
      }

      if (insertError) throw insertError;
      
      setSubmitted(true);
      showToast("Request sent to Admin!", "success");
      setTimeout(() => {
        setSubmitted(false);
        setActiveTab('history');
        // Clear form
        setSubject('');
        setGrade('');
        setTopic('');
        setNumQuestions(10);
        setDescription('');
        setQuestionTypes('Multiple Choice');
        setRequestType('assignment');
      }, 1500);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Code copied to clipboard!", "success");
  };

  return (
    <div className="relative font-sans text-brand-text">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase leading-none">Request Material</h2>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mt-2">Let our team build professional content for you</p>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-brand-bg border border-brand-border p-1 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'new' ? 'bg-brand-surface text-brand-text border border-brand-border shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
        >
          <MessageCircle size={14} />
          New Request
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-brand-surface text-brand-text border border-brand-border shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
        >
          <History size={14} />
          Request History
          {pastRequests.length > 0 && (
            <span className="w-4 h-4 bg-brand-accent text-white rounded-full flex items-center justify-center text-[8px] font-black">
              {pastRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 text-center"
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 size={40} className="text-white animate-bounce" />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">Request Received!</h3>
            <p className="text-brand-muted font-bold text-sm">Our admin team is reviewing your request.</p>
          </motion.div>
        ) : activeTab === 'new' ? (
          <motion.form 
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit} 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar"
          >
            {/* Request Type Selector */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">
                Requested Material Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestType('assignment')}
                  className={`py-3.5 px-2 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition-all ${requestType === 'assignment' ? 'bg-brand-accent/5 border-brand-accent text-brand-accent shadow-lg shadow-brand-accent/5' : 'bg-brand-bg border-brand-border text-brand-muted hover:text-brand-text'}`}
                >
                  <FileText size={16} />
                  <span className="text-[8px] font-black uppercase tracking-tight">Assignment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('exam')}
                  className={`py-3.5 px-2 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition-all ${requestType === 'exam' ? 'bg-brand-accent/5 border-brand-accent text-brand-accent shadow-lg shadow-brand-accent/5' : 'bg-brand-bg border-brand-border text-brand-muted hover:text-brand-text'}`}
                >
                  <Award size={16} />
                  <span className="text-[8px] font-black uppercase tracking-tight">Exam</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('competition_questions')}
                  className={`py-3.5 px-2 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition-all ${requestType === 'competition_questions' ? 'bg-brand-accent/5 border-[#FF6B2C] text-[#FF6B2C] shadow-lg shadow-brand-accent/5' : 'bg-brand-bg border-brand-border text-brand-muted hover:text-brand-text'}`}
                >
                  <Sparkles size={16} />
                  <span className="text-[8px] font-black uppercase tracking-tight">Competition</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('group_work')}
                  className={`py-3.5 px-2 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition-all ${requestType === 'group_work' ? 'bg-brand-accent/5 border-brand-accent text-brand-accent shadow-lg shadow-brand-accent/5' : 'bg-brand-bg border-brand-border text-brand-muted hover:text-brand-text'}`}
                >
                  <Users size={16} />
                  <span className="text-[8px] font-black uppercase tracking-tight">Group Work</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('other')}
                  className={`py-3.5 px-2 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition-all ${requestType === 'other' ? 'bg-brand-accent/5 border-brand-accent text-brand-accent shadow-lg shadow-brand-accent/5' : 'bg-brand-bg border-brand-border text-brand-muted hover:text-brand-text'}`}
                >
                  <MessageCircle size={16} />
                  <span className="text-[8px] font-black uppercase tracking-tight">Other</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
                <BookOpen size={10} /> Subject
              </label>
              <input 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Mathematics" 
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
                <GraduationCap size={10} /> Grade Level
              </label>
              <input 
                value={grade} 
                onChange={e => setGrade(e.target.value)}
                placeholder="e.g. Grade 9" 
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
                <Layout size={10} /> Topic / Area
              </label>
              <input 
                value={topic} 
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Quadratic Equations" 
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
                <Hash size={10} /> Question Count
              </label>
              <input 
                type="number"
                value={isNaN(numQuestions) ? '' : numQuestions} 
                onChange={e => setNumQuestions(parseInt(e.target.value) || 0)}
                min={1}
                max={50}
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Specific Instructions / Subtopics</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                placeholder="Mention any specific focus points, curriculum links, or instruction preferences..." 
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50 h-24" 
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="md:col-span-2 w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {loading ? 'Sending Request...' : 'Send Request to Admin'}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar"
          >
            {loadingHistory ? (
              <div className="py-20 text-center text-brand-muted">
                <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                <p className="text-[10px] font-black uppercase tracking-wider">Accessing request vault...</p>
              </div>
            ) : pastRequests.length === 0 ? (
              <div className="py-20 text-center text-brand-muted border-2 border-dashed border-brand-border rounded-3xl bg-brand-bg/50">
                <MessageCircle size={32} className="mx-auto mb-4 opacity-40" />
                <p className="font-bold text-sm">No requests sent yet.</p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-1">Your requested resources will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastRequests.map((req) => {
                  const getCategoryLabel = (type: string) => {
                    const t = type?.toLowerCase() || 'assignment';
                    if (t === 'assessment' || t === 'exam') return { name: 'Exam', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
                    if (t === 'groupwork' || t === 'group_work') return { name: 'Group Work', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
                    if (t === 'competition_questions') return { name: 'Competition', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
                    if (t === 'other') return { name: 'Other Content', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
                    return { name: 'Assignment', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
                  };
                  const label = getCategoryLabel(req.request_type);

                  return (
                    <div 
                      key={req.id} 
                      className="p-5 bg-brand-surface border border-brand-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${label.color}`}>
                            {label.name}
                          </span>
                          <span className="text-xs font-black text-brand-text">{req.topic}</span>
                          <span className="text-[10px] font-bold text-brand-muted">({req.subject} • {req.grade})</span>
                        </div>
                        <p className="text-[10px] text-brand-muted line-clamp-1">{req.description}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-[8px] font-black text-brand-muted uppercase tracking-wider">
                          <span>Requested: {new Date(req.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Size: {req.question_count || req.num_questions || 10} questions</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {req.status === 'completed' ? (
                          <div className="flex flex-col items-end gap-1 w-full md:w-auto">
                            <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 select-none">
                              Completed ✓
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-brand-muted mb-1">
                              Category: {label.name}
                            </span>
                            {req.share_code ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  onClick={() => copyToClipboard(req.share_code)}
                                  className="bg-brand-bg border border-brand-border px-3 py-2 rounded-xl text-xs font-mono font-black tracking-widest text-brand-accent cursor-pointer flex items-center gap-2 hover:bg-brand-accent/5 transition-colors"
                                  title="Click to copy code"
                                >
                                  {req.share_code}
                                  <Copy size={12} className="text-brand-muted hover:text-brand-accent" />
                                </div>
                                {onImportCode && (
                                  <button
                                    onClick={() => onImportCode(req.share_code)}
                                    className="px-3 py-2 bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                                    title="Import code directly"
                                  >
                                    <Download size={12} />
                                    Quick Import
                                  </button>
                                )}
                              </div>
                            ) : req.request_type === 'groupwork' || req.request_type === 'group_work' ? (
                              <span className="text-[8px] font-black uppercase tracking-wider text-brand-muted italic mt-1 text-right">
                                Live directly in Groups tab! 🚀
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
