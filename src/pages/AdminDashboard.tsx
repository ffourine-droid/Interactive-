import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Download, 
  Code, 
  FileText, 
  Award, 
  Loader2, 
  Trash2, 
  Copy,
  Check,
  RefreshCw,
  Layout,
  MessageCircle,
  Database,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Zap,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ArenaQuestionCreator } from '../components/ArenaQuestionCreator';
import { QuestionManager } from '../components/QuestionManager';
import { MaterialManager } from '../components/MaterialManager';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'shared' | 'system' | 'finance' | 'users' | 'arena' | 'requests'>('shared');
  const [subTab, setSubTab] = useState<'assessments' | 'assignments'>('assessments');
  const [sharedWorks, setSharedWorks] = useState<any[]>([]);
  
  // Requests State
  const [teacherRequests, setTeacherRequests] = useState<any[]>([]);
  
  // Finance State
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, revenueToday: 0, totalRevenue: 0 });
  
  // System State
  const [experiments, setExperiments] = useState<any[]>([]);

  // Users State
  const [profiles, setProfiles] = useState<any[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'json'>('manual');
  const [jsonInput, setJsonInput] = useState('');
  
  // Target tracking
  const [targetTeacher, setTargetTeacher] = useState('');
  const [targetSchool, setTargetSchool] = useState('');
  
  // Assessment Form
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examGrade, setExamGrade] = useState('Grade 7');
  const [examDuration, setExamDuration] = useState(30);
  const [questions, setQuestions] = useState<any[]>([]);

  // Assignment Form
  const [assignTitle, setAssignTitle] = useState('');
  const [assignSubject, setAssignSubject] = useState('');
  const [assignGrade, setAssignGrade] = useState('Grade 7');
  const [assignContent, setAssignContent] = useState('');

  const [isValidJson, setIsValidJson] = useState<boolean | null>(null);

  useEffect(() => {
    if (activeTab === 'shared') fetchSharedWorks();
    else if (activeTab === 'finance') fetchPayments();
    else if (activeTab === 'system') fetchExperiments();
    else if (activeTab === 'users') fetchProfiles();
    else if (activeTab === 'requests') fetchRequests();
  }, [activeTab, subTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTeacherRequests(data || []);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const fetchSharedWorks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_assignments')
        .select('*')
        .eq('type', subTab === 'assessments' ? 'assessment' : 'assignment')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSharedWorks(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments(data || []);
      
      const today = new Date().toISOString().split('T')[0];
      const pending = data?.filter((p: any) => p.status === 'pending').length || 0;
      const revenueToday = data?.filter((p: any) => p.status === 'approved' && p.verified_at?.startsWith(today)).reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      const totalRevenue = data?.filter((p: any) => p.status === 'approved').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      setStats({ pending, revenueToday, totalRevenue });
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('experiments').select('*').order('title');
      if (error) throw error;
      setExperiments(data || []);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const generateCode = (subj: string) => {
    const subjCode = subj.substring(0, 3).toUpperCase() || 'GEN';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ADM-${subjCode}-${randomPart}`;
  };

  const resetForms = () => {
    setExamTitle('');
    setExamSubject('');
    setQuestions([]);
    setAssignTitle('');
    setAssignSubject('');
    setAssignContent('');
    setJsonInput('');
    setTargetTeacher('');
    setTargetSchool('');
    setIsValidJson(null);
  };

  const handleSaveAssessment = async () => {
    if (!examTitle || questions.length === 0) {
      showToast("Title and at least one question required", "error");
      return;
    }
    setLoading(true);
    try {
      const code = generateCode(examSubject);
      const { error } = await supabase.from('admin_assignments').insert({
        title: examTitle,
        subject: examSubject,
        grade: examGrade,
        type: 'assessment',
        questions,
        share_code: code,
        target_teacher_name: targetTeacher,
        target_school_name: targetSchool
      });
      if (error) throw error;
      showToast(`Assessment published! Code: ${code}`, "success");
      setIsCreating(false);
      resetForms();
      fetchSharedWorks();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  const handleSaveAssignment = async () => {
    if (!assignTitle || !assignContent) {
      showToast("Title and content required", "error");
      return;
    }
    setLoading(true);
    try {
      const code = generateCode(assignSubject);
      const { error } = await supabase.from('admin_assignments').insert({
        title: assignTitle,
        subject: assignSubject,
        grade: assignGrade,
        type: 'assignment',
        questions: [{ id: 'q1', type: 'short_answer', text: assignContent }],
        share_code: code,
        target_teacher_name: targetTeacher,
        target_school_name: targetSchool
      });
      if (error) throw error;
      showToast(`Assignment published! Code: ${code}`, "success");
      setIsCreating(false);
      resetForms();
      fetchSharedWorks();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  const validateJson = (input: string) => {
    if (!input.trim()) { setIsValidJson(null); return; }
    try { JSON.parse(input); setIsValidJson(true); }
    catch { setIsValidJson(false); }
  };

  const handleSaveJSON = async () => {
    if (!isValidJson) { showToast("Invalid JSON", "error"); return; }
    try {
      let data = JSON.parse(jsonInput);
      if (Array.isArray(data)) {
        data = {
          title: examTitle || assignTitle || "Shared Work",
          subject: examSubject || assignSubject || "General",
          grade: examGrade || assignGrade || "Grade 7",
          questions: data
        };
      }
      const code = generateCode(data.subject);
      const { error } = await supabase.from('admin_assignments').insert({
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        type: subTab === 'assessments' ? 'assessment' : 'assignment',
        questions: data.questions,
        share_code: code,
        target_teacher_name: targetTeacher,
        target_school_name: targetSchool
      });
      if (error) throw error;
      showToast(`Master asset published! Code: ${code}`, "success");
      setIsCreating(false);
      resetForms();
      fetchSharedWorks();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const approvePayment = async (id: string, plan: string) => {
    try {
      const days = plan === 'weekly' ? 7 : (plan === 'monthly' ? 30 : 1);
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('payments').update({ status: 'approved', verified_at: new Date().toISOString(), expires_at: expiresAt }).eq('id', id);
      if (error) throw error;
      showToast("Approved", "success");
      fetchPayments();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const rejectPayment = async (id: string) => {
    try {
      const { error } = await supabase.from('payments').update({ status: 'rejected', verified_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      showToast("Rejected", "info");
      fetchPayments();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const deleteExperiment = async (id: string) => {
    if (!confirm("Delete permanently?")) return;
    try {
      const { error } = await supabase.from('experiments').delete().eq('id', id);
      if (error) throw error;
      showToast("Deleted", "success");
      fetchExperiments();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeleteWork = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.from('admin_assignments').delete().eq('id', id);
      if (error) throw error;
      showToast("Deleted", "success");
      fetchSharedWorks();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-brand-surface border-b border-brand-border h-16 sticky top-0 z-50 px-4">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter leading-none">ADMIN DASHBOARD</h1>
              <p className="text-[8px] font-bold text-brand-muted uppercase tracking-widest mt-0.5">Control Center</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {[
              { id: 'shared', icon: Layout, label: 'Shared' },
              { id: 'system', icon: Database, label: 'Materials' },
              { id: 'arena', icon: Zap, label: 'Arena' },
              { id: 'requests', icon: MessageCircle, label: 'Requests' },
              { id: 'finance', icon: Code, label: 'Finance' },
              { id: 'users', icon: Users, label: 'Users' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-muted hover:text-brand-accent'}`}
              >
                <tab.icon size={12} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8 space-y-8">
        {activeTab === 'shared' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button onClick={() => setSubTab('assessments')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'assessments' ? 'bg-brand-text text-white' : 'bg-brand-surface text-brand-muted'}`}>Assessments</button>
              <button onClick={() => setSubTab('assignments')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'assignments' ? 'bg-brand-text text-white' : 'bg-brand-surface text-brand-muted'}`}>Assignments</button>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>
            ) : !isCreating ? (
              <>
                <div className="flex items-center justify-between px-2">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{subTab === 'assessments' ? 'Shared Assessments' : 'Shared Assignments'}</h2>
                    <p className="text-xs font-bold text-brand-muted uppercase tracking-widest mt-1">Ready-to-use templates for teachers</p>
                  </div>
                  <button onClick={() => setIsCreating(true)} className="bg-brand-accent text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center gap-2">
                    <Plus size={16} /> Create New
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {sharedWorks.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-brand-border rounded-[2.5rem] bg-brand-surface">
                      <p className="text-brand-muted font-bold uppercase tracking-widest text-xs">No templates found</p>
                    </div>
                  ) : (
                    sharedWorks.map(work => (
                      <div key={work.id} className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">{work.subject} • {work.grade}</p>
                          <h3 className="text-xl font-black tracking-tight">{work.title}</h3>
                          {(work.target_teacher_name || work.target_school_name) && (
                            <p className="text-[9px] font-black text-brand-accent/60 mt-2 uppercase tracking-widest">Target: {work.target_teacher_name || 'All'} @ {work.target_school_name || 'All Schools'}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="bg-brand-bg border-2 border-brand-accent/20 px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:border-brand-accent transition-colors"
                               onClick={() => { navigator.clipboard.writeText(work.share_code); showToast("Copied!", "success"); }}>
                            <span className="text-sm font-black tracking-widest">{work.share_code}</span>
                            <Copy size={14} className="text-brand-muted" />
                          </div>
                          <button onClick={() => handleDeleteWork(work.id)} className="text-red-500/40 hover:text-red-500 p-2 transition-all"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-2xl font-black tracking-tight uppercase">New {subTab === 'assessments' ? 'Assessment' : 'Assignment'}</h2>
                  <button onClick={() => setIsCreating(false)} className="text-brand-muted text-xs font-black uppercase tracking-widest">Cancel</button>
                </div>
                
                <div className="flex gap-4 px-2">
                  <button onClick={() => setCreationMode('manual')} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${creationMode === 'manual' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted'}`}>Manual Entry</button>
                  <button onClick={() => setCreationMode('json')} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${creationMode === 'json' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted'}`}>JSON Upload</button>
                </div>

                {creationMode === 'json' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xs font-black uppercase tracking-widest text-brand-muted">Editor</h3>
                         {isValidJson === false && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded font-bold">Invalid JSON</span>}
                         {isValidJson === true && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold">Valid Format</span>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input value={targetTeacher} placeholder="Target Teacher" onChange={e => setTargetTeacher(e.target.value)} className="bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm" />
                        <input value={targetSchool} placeholder="Target School" onChange={e => setTargetSchool(e.target.value)} className="bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm" />
                      </div>
                      <textarea 
                        value={jsonInput}
                        onChange={e => { setJsonInput(e.target.value); validateJson(e.target.value); }}
                        placeholder='Paste JSON questions array or full object here...'
                        className="w-full bg-brand-bg border-2 border-brand-border rounded-2xl p-6 font-mono text-xs h-80 outline-none focus:border-brand-accent transition-colors"
                      />
                      <button onClick={handleSaveJSON} className="w-full bg-brand-text text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50" disabled={!isValidJson}>
                        <FileJson size={20} /> Publish Template
                      </button>
                    </div>

                    <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6 overflow-hidden">
                       <h3 className="text-xs font-black uppercase tracking-widest text-brand-muted">Live Preview</h3>
                       <div className="h-[500px] overflow-y-auto pr-2 space-y-4">
                          {isValidJson && jsonInput ? (
                             (() => {
                               try {
                                 const data = JSON.parse(jsonInput);
                                 const qList = Array.isArray(data) ? data : data.questions || [];
                                 return qList.length > 0 ? qList.map((q: any, i: number) => (
                                   <div key={i} className="bg-brand-bg p-4 rounded-2xl border border-brand-border/40">
                                      <p className="text-[10px] font-black text-brand-accent mb-1 uppercase tracking-widest">Question {i + 1}</p>
                                      <p className="text-sm font-bold text-brand-text mb-3">{q.text}</p>
                                      {q.options && (
                                         <div className="grid grid-cols-1 gap-2">
                                            {q.options.map((opt: string, oi: number) => (
                                               <div key={oi} className={`px-3 py-2 rounded-lg text-xs font-medium border ${oi === q.correct_option || oi === q.correct_answer ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-brand-surface border-brand-border text-brand-muted'}`}>
                                                  {opt}
                                               </div>
                                            ))}
                                         </div>
                                      )}
                                   </div>
                                 )) : <p className="text-center py-20 text-brand-muted font-bold text-xs uppercase tracking-widest">No questions found in JSON</p>
                               } catch { return null }
                             })()
                          ) : (
                             <div className="h-full flex flex-col items-center justify-center text-brand-muted animate-pulse">
                                <FileJson size={48} className="mb-4 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Waiting for valid JSON...</p>
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
                ) : subTab === 'assessments' ? (
                  <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <input value={examTitle} placeholder="Assessment Title" onChange={e => setExamTitle(e.target.value)} className="bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm" />
                      <input value={examSubject} placeholder="Subject (e.g. Science)" onChange={e => setExamSubject(e.target.value)} className="bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm" />
                    </div>
                    <div className="space-y-4 pt-4 border-t border-brand-border">
                      <div className="flex justify-between items-center px-1">
                        <h3 className="font-black text-xs uppercase tracking-widest">Questions ({questions.length})</h3>
                        <button onClick={() => setQuestions([...questions, { text: '', type: 'mcq', options: ['', '', '', ''], correct_answer: '' }])} className="text-brand-accent text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Plus size={14} /> Add</button>
                      </div>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {questions.map((q, idx) => (
                          <div key={idx} className="bg-brand-bg p-6 rounded-2xl space-y-4 border border-brand-border/50">
                            <input placeholder="Enter question..." value={q.text} onChange={e => { const n = [...questions]; n[idx].text = e.target.value; setQuestions(n); }} className="w-full bg-brand-surface border border-brand-border p-3 rounded-lg text-sm font-bold" />
                            <div className="grid grid-cols-2 gap-2">
                              {q.options.map((opt: string, oi: number) => (
                                <input key={oi} placeholder={`Option ${oi + 1}`} value={opt} onChange={e => { const n = [...questions]; n[idx].options[oi] = e.target.value; setQuestions(n); }} className="bg-brand-surface border border-brand-border p-2 rounded-lg text-xs" />
                              ))}
                            </div>
                            <input placeholder="Correct Answer" value={q.correct_answer} onChange={e => { const n = [...questions]; n[idx].correct_answer = e.target.value; setQuestions(n); }} className="w-full bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-lg text-xs font-bold text-emerald-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleSaveAssessment} className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all">Publish & Generate Code</button>
                  </div>
                ) : (
                  <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                    <input value={assignTitle} placeholder="Assignment Title" onChange={e => setAssignTitle(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm" />
                    <textarea value={assignContent} placeholder="Assignment instructions/questions..." onChange={e => setAssignContent(e.target.value)} className="w-full bg-brand-bg border border-brand-border rounded-xl p-6 text-sm h-48 outline-none focus:border-brand-accent" />
                    <button onClick={handleSaveAssignment} className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all">Publish & Generate Code</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border">
                <p className="text-[10px] font-black uppercase text-brand-muted mb-1">Today</p>
                <p className="text-2xl font-black leading-none">KES {stats.revenueToday}</p>
              </div>
              <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border">
                <p className="text-[10px] font-black uppercase text-brand-muted mb-1">Pending</p>
                <p className="text-2xl font-black leading-none">{stats.pending}</p>
              </div>
              <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border">
                <p className="text-[10px] font-black uppercase text-brand-muted mb-1">Lifetime</p>
                <p className="text-2xl font-black leading-none">KES {stats.totalRevenue}</p>
              </div>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-brand-bg/50 border-b border-brand-border text-[9px] font-black uppercase tracking-widest text-brand-muted">
                    <tr><th className="px-6 py-4">Transaction</th><th className="px-6 py-4">Plan</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-xs">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-brand-bg/40">
                        <td className="px-6 py-4 font-mono font-bold uppercase">{p.transaction_code}</td>
                        <td className="px-6 py-4 font-black uppercase tracking-widest text-[9px] text-brand-accent">{p.plan}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : p.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>{p.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {p.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => approvePayment(p.id, p.plan)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"><Check size={14}/></button>
                              <button onClick={() => rejectPayment(p.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14}/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'system' && (
          <MaterialManager />
        )}

        {!loading && activeTab === 'arena' && (
          <div className="space-y-12">
            <ArenaQuestionCreator />
            <QuestionManager />
          </div>
        )}

        {!loading && activeTab === 'requests' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black tracking-tight uppercase">Teacher Requests</h3>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{teacherRequests.length} Pending</p>
             </div>
             <div className="grid grid-cols-1 gap-4">
                {teacherRequests.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-brand-border rounded-[2.5rem] bg-brand-surface">
                    <p className="text-brand-muted font-bold uppercase tracking-widest text-xs">No pending requests</p>
                  </div>
                ) : (
                  teacherRequests.map(req => (
                    <div key={req.id} className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">{req.subject} • {req.grade}</p>
                          <h4 className="text-lg font-black tracking-tight uppercase">{req.topic}</h4>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${req.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-brand-muted italic">"{req.description}"</p>
                      <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-accent/5 flex items-center justify-center text-brand-accent font-black text-[10px]">
                            {req.teacher_name[0]}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">{req.teacher_name}</p>
                            <p className="text-[8px] font-bold text-brand-muted uppercase tracking-widest mt-0.5">{req.school_name || 'No School'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setActiveTab('shared');
                              setCreationMode('json');
                              setIsCreating(true);
                              setTargetTeacher(req.teacher_name);
                              setTargetSchool(req.school_name);
                              setExamSubject(req.subject);
                              setExamGrade(req.grade);
                              setExamTitle(`${req.topic} - For ${req.teacher_name}`);
                            }}
                            className="px-4 py-2 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                          >
                            Create for Teacher
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black tracking-tight uppercase">Platform Users</h3>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{profiles.length} Total</p>
             </div>
             <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-brand-bg/50 border-b border-brand-border text-[9px] font-black uppercase tracking-widest text-brand-muted">
                      <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Phone</th><th className="px-6 py-4">Joined</th></tr>
                   </thead>
                   <tbody className="divide-y divide-brand-border text-sm">
                      {profiles.map(u => (
                         <tr key={u.id} className="hover:bg-brand-bg/30">
                            <td className="px-6 py-4 font-black">{u.username || 'Anonymous'}</td>
                            <td className="px-6 py-4 font-bold text-brand-muted text-xs">{u.phone_number || '-'}</td>
                            <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-muted opacity-60">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
