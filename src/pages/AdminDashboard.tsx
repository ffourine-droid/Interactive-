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
  Users,
  BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ArenaQuestionCreator } from '../components/ArenaQuestionCreator';
import { QuestionManager } from '../components/QuestionManager';
import { MaterialManager } from '../components/MaterialManager';
import StoryQuestManager from '../components/StoryQuestManager';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'shared' | 'system' | 'teachers' | 'arena' | 'requests' | 'stories'>('overview');
  const [subTab, setSubTab] = useState<'assessments' | 'assignments'>('assessments');
  const [sharedWorks, setSharedWorks] = useState<any[]>([]);
  
  // Daily clock representation for an immersive control CLI feel
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Requests State
  const [teacherRequests, setTeacherRequests] = useState<any[]>([]);
  
  // System State
  const [experiments, setExperiments] = useState<any[]>([]);

  // Teachers State
  const [teachersList, setTeachersList] = useState<any[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'json'>('manual');
  const [jsonInput, setJsonInput] = useState('');
  const [prefillArena, setPrefillArena] = useState<any>(null);
  
  // Target tracking
  const [targetTeacher, setTargetTeacher] = useState('');
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [targetSchool, setTargetSchool] = useState('');
  const [targetRequestId, setTargetRequestId] = useState('');

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

  // Live ticking clock
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Concurrent stats hydration on load, and tab changes
  useEffect(() => {
    const hydrateAll = async () => {
      setLoading(true);
      try {
        await Promise.allSettled([
          fetchSharedWorks(),
          fetchRequests(),
          fetchExperiments(),
          fetchTeachersList()
        ]);
      } catch (err) {
        console.error("Hydration Error:", err);
      } finally {
        setLoading(false);
      }
    };
    hydrateAll();
  }, [subTab]);

  useEffect(() => {
    if (activeTab === 'shared') fetchSharedWorks();
    else if (activeTab === 'system') fetchExperiments();
    else if (activeTab === 'teachers') fetchTeachersList();
    else if (activeTab === 'requests') fetchRequests();
  }, [activeTab]);

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
        .select('id, title, subject, grade, type, share_code, created_at, target_teacher_name, target_school_name')
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

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('experiments').select('*').order('title');
      if (error) throw error;
      setExperiments(data || []);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const fetchTeachersList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTeachersList(data || []);
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
      
      // Save to admin_assignments as master template
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

      // Automatically save to specific teacher's dashboard if ID is known
      if (targetTeacherId) {
        await supabase.from('exams').insert({
          title: examTitle,
          subject: examSubject,
          grade: examGrade,
          questions,
          created_by: targetTeacherId,
          is_published: false,
          share_code: code,
          created_by_admin: true
        });

        // Mark request as completed
        if (targetRequestId) {
          await supabase.from('question_requests').update({ status: 'completed', share_code: code }).eq('id', targetRequestId);
        }
      }

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
      
      // Save to admin_assignments
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

      // Auto-save to teacher
      if (targetTeacherId) {
         await supabase.from('assignments').insert({
            title: assignTitle,
            subject: assignSubject,
            grade: assignGrade,
            content: assignContent,
            teacher_id: targetTeacherId,
            share_code: code,
            created_by_admin: true
         });

         if (targetRequestId) {
          await supabase.from('question_requests').update({ status: 'completed', share_code: code }).eq('id', targetRequestId);
        }
      }

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

      // Auto-save to teacher
      if (targetTeacherId) {
        if (subTab === 'assessments') {
          await supabase.from('exams').insert({
            title: data.title,
            subject: data.subject,
            grade: data.grade,
            questions: data.questions,
            created_by: targetTeacherId,
            is_published: false,
            share_code: code,
            created_by_admin: true
          });
        } else {
          await supabase.from('assignments').insert({
            title: data.title,
            subject: data.subject,
            grade: data.grade,
            content: typeof data.questions[0] === 'string' ? data.questions[0] : (data.questions[0].text || JSON.stringify(data.questions)),
            teacher_id: targetTeacherId,
            share_code: code,
            created_by_admin: true
          });
        }

        if (targetRequestId) {
          await supabase.from('question_requests').update({ status: 'completed', share_code: code }).eq('id', targetRequestId);
        }
      }

      showToast(`Master asset published! Code: ${code}`, "success");
      setIsCreating(false);
      resetForms();
      fetchSharedWorks();
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
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row font-sans">
      
      {/* ─── DESKTOP OPERATIONS SIDEBAR ─── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-brand-surface border-r border-brand-border h-screen sticky top-0 px-6 py-6 space-y-6 z-30 select-none">
        <div className="flex items-center gap-3 bg-brand-bg/50 border border-brand-border/40 p-4 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent font-black text-sm">
            ⚙️
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider text-brand-text leading-tight">AZILEARN ADMIN</h1>
            <p className="text-[8.5px] font-bold text-brand-muted uppercase tracking-widest leading-none mt-0.5">Control Center</p>
          </div>
        </div>

        {/* Live Admin Operational Clock */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-white space-y-1">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            OPERATIONS DESK CLOCK
          </p>
          <p className="text-sm font-mono font-bold tracking-tight text-brand-accent">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-[8px] font-black block text-slate-400 mt-1 uppercase tracking-wider opacity-60">
            {currentTime.toISOString().substring(0, 10).replace(/-/g, '/')} UTC
          </p>
        </div>

        {/* Left Side Tab Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar py-2">
          {[
            { id: 'overview' as const, icon: Layout, label: 'Overview', badge: 0 },
            { id: 'shared' as const, icon: FileText, label: 'Templates', badge: 0 },
            { id: 'system' as const, icon: Database, label: 'Materials', badge: 0 },
            { id: 'arena' as const, icon: Zap, label: 'Arena & Qns', badge: 0 },
            { id: 'stories' as const, icon: BookOpen, label: 'Story Quest', badge: 0 },
            { id: 'requests' as const, icon: MessageCircle, label: 'Requests', badge: teacherRequests.filter(r => r.status === 'pending').length },
            { id: 'teachers' as const, icon: Users, label: 'Teachers', badge: 0 }
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (isCreating) setIsCreating(false); }}
                className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group ${
                  isSelected 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/15' 
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <tab.icon size={14} className={isSelected ? 'text-white' : 'text-brand-muted group-hover:text-brand-accent transition-colors'} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                    isSelected ? 'bg-white text-brand-accent' : 'bg-brand-accent/10 text-brand-accent'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="pt-4 border-t border-brand-border">
          <button 
            onClick={onBack} 
            className="w-full bg-brand-bg hover:bg-red-500/5 border border-brand-border hover:border-red-500/20 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-brand-muted hover:text-red-600 flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft size={13} />
            Exit Console
          </button>
        </div>
      </aside>

      {/* ─── MOBILE VIEW AND MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header: Sticky, scrollable tabs */}
        <header className="md:hidden bg-brand-surface border-b border-brand-border h-16 sticky top-0 z-50 px-4">
          <div className="h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors shrink-0">
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-xs font-black uppercase tracking-tighter leading-none">ADMIN DASHBOARD</h1>
            </div>

            {/* Scrollable Mobile Tabs panel */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[60%]">
              {[
                { id: 'overview' as const, label: 'Overview', badge: 0 },
                { id: 'shared' as const, label: 'Templates', badge: 0 },
                { id: 'system' as const, label: 'Materials', badge: 0 },
                { id: 'arena' as const, label: 'Arena', badge: 0 },
                { id: 'stories' as const, label: 'Story Quest', badge: 0 },
                { id: 'requests' as const, label: 'Requests', badge: teacherRequests.filter(r => r.status === 'pending').length },
                { id: 'teachers' as const, label: 'Teachers', badge: 0 }
              ].map(tab => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); if (isCreating) setIsCreating(false); }}
                    className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shrink-0 transition-all flex items-center gap-1 ${
                      isSelected ? 'bg-brand-accent text-white shadow-md' : 'text-brand-muted bg-brand-bg'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge > 0 && <span className={`${isSelected ? 'bg-white text-brand-accent' : 'bg-brand-accent text-white'} px-1 rounded-[4px] text-[7px]`}>{tab.badge}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Master body view area */}
        <main className="max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen">
          
          {/* ────── TABS: OVERVIEW LANDING ────── */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Slate welcoming header card */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-12 transform opacity-10 translate-x-12 -translate-y-12 shrink-0 pointer-events-none">
                  <Database size={200} className="text-brand-accent animate-pulse" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight leading-none text-white">Console Command Center</h2>
                    <p className="text-xs text-slate-400 mt-2.5 font-medium max-w-xl leading-relaxed">
                      Welcome to the Operations Hub. Process lesson material requests, dispatch teacher shared assets, and administer platform overrides.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-5 border-t border-slate-800 text-slate-300">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">OPERATIONAL TIME</p>
                      <p className="text-xs font-mono font-bold mt-1 text-brand-accent font-sans">
                        {currentTime.toISOString().replace('T', ' ').substring(0, 19)} UTC
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">SYSTEM STATS</p>
                      <p className="text-xs font-bold mt-1 text-indigo-400">
                        v2.7 CLI Ready
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">DESK GATEWAY</p>
                      <p className="text-xs font-bold mt-1 text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        SECURE OVER SSL PORT
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bento dashboard stats block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-brand-surface border border-brand-border p-6 rounded-[2rem] flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex justify-between items-center text-brand-muted">
                    <span className="text-[9px] font-black uppercase tracking-widest">Active Teachers</span>
                    <Users size={16} className="text-blue-500" />
                  </div>
                  <div className="pt-4">
                    <p className="text-2xl font-black tracking-tight text-brand-text">{teachersList.length}</p>
                    <p className="text-[8px] font-black text-brand-muted uppercase tracking-widest mt-1">Educators registered</p>
                  </div>
                </div>

                <div className="bg-brand-surface border border-brand-border p-6 rounded-[2rem] flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden">
                  {teacherRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-brand-accent rounded-full animate-ping m-4 text-xs font-black flex items-center justify-center text-white" />
                  )}
                  <div className="flex justify-between items-center text-brand-muted">
                    <span className="text-[9px] font-black uppercase tracking-widest">Teacher Requests</span>
                    <MessageCircle size={16} className="text-brand-accent" />
                  </div>
                  <div className="pt-4">
                    <p className="text-2xl font-black tracking-tight text-brand-text">
                      {teacherRequests.filter(r => r.status === 'pending').length}
                    </p>
                    <p className="text-[8px] font-black text-brand-accent uppercase tracking-widest mt-1">
                      {teacherRequests.filter(r => r.status === 'completed').length} completed total
                    </p>
                  </div>
                </div>

                <div className="bg-brand-surface border border-brand-border p-6 rounded-[2rem] flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex justify-between items-center text-brand-muted">
                    <span className="text-[9px] font-black uppercase tracking-widest">Published Materials</span>
                    <Database size={16} className="text-emerald-500" />
                  </div>
                  <div className="pt-4">
                    <p className="text-2xl font-black tracking-tight text-brand-text">{experiments.length}</p>
                    <p className="text-[8px] font-black text-brand-muted uppercase tracking-widest mt-1 font-sans">Active items in catalog</p>
                  </div>
                </div>
              </div>

              {/* Operations queue grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Pending Requests Stream */}
                <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-brand-text">Awaiting Material Dispatch</h3>
                      <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Teacher Inbox Request Stream</p>
                    </div>
                    <button onClick={() => setActiveTab('requests')} className="text-brand-accent text-[9px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                      View All <Plus size={12} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {teacherRequests.filter(r => r.status === 'pending').length === 0 ? (
                      <div className="py-12 text-center bg-brand-bg/40 rounded-3xl border border-dashed border-brand-border flex flex-col items-center justify-center p-6">
                        <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Queue is currently clear</p>
                        <p className="text-[8px] text-brand-muted/70 uppercase tracking-wider mt-1">All teacher requests processed successfully</p>
                      </div>
                    ) : (
                      teacherRequests.filter(r => r.status === 'pending').slice(0, 3).map(req => (
                        <div key={req.id} className="bg-brand-bg/50 border border-brand-border rounded-2xl p-4 space-y-3 hover:border-brand-accent/30 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">{req.subject} • {req.grade}</p>
                              <h4 className="text-xs font-black text-brand-text uppercase leading-tight mt-0.5">{req.topic}</h4>
                            </div>
                            <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent rounded text-[7px] font-black uppercase tracking-wider inline-block">
                              {req.request_type || 'assessment'}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-brand-muted italic leading-relaxed line-clamp-2">
                            "{req.description || 'No direct custom instructions provided.'}"
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t border-brand-border/50 text-[9px]">
                            <span className="font-bold text-brand-muted">{req.teacher_name}</span>
                            <button
                              onClick={() => {
                                setActiveTab('shared');
                                const reqType = req.request_type || 'assessment';
                                setSubTab(reqType === 'assignment' ? 'assignments' : 'assessments');
                                setCreationMode('manual');
                                setIsCreating(true);
                                setTargetTeacher(req.teacher_name);
                                setTargetTeacherId(req.teacher_id);
                                setTargetSchool(req.school_name);
                                setTargetRequestId(req.id);
                                setExamSubject(req.subject);
                                setAssignSubject(req.subject);
                                setExamGrade(req.grade);
                                setAssignGrade(req.grade);
                                setExamTitle(`${req.topic} - For ${req.teacher_name}`);
                                setAssignTitle(`${req.topic} - For ${req.teacher_name}`);
                              }}
                              className="bg-brand-accent text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md shadow-brand-accent/10 hover:scale-105 active:scale-95 transition-all"
                            >
                              Fulfill Request
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Teachers Roster stream */}
                <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-brand-text">Active Teachers Roster</h3>
                      <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Registered Platform Educators</p>
                    </div>
                    <button onClick={() => setActiveTab('teachers')} className="text-brand-accent text-[9px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                      Full Directory <Plus size={12} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {teachersList.length === 0 ? (
                      <div className="py-12 text-center bg-brand-bg/40 rounded-3xl border border-dashed border-brand-border flex flex-col items-center justify-center p-6">
                        <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">No registered teachers yet</p>
                        <p className="text-[8px] text-brand-muted/70 uppercase tracking-wider mt-1">Registered teachers will appear here</p>
                      </div>
                    ) : (
                      teachersList.slice(0, 3).map(teacher => (
                        <div key={teacher.id} className="bg-brand-bg/50 border border-brand-border rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-brand-accent/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-xs">
                              {teacher.name ? teacher.name[0].toUpperCase() : 'T'}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-brand-text uppercase leading-none">{teacher.name}</p>
                              <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mt-1">🏫 {teacher.school_name || 'No school specified'}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-[8px] font-semibold text-brand-muted uppercase tracking-wider">
                              {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ────── TABS: SHARED TEMPLATES ────── */}
          {activeTab === 'shared' && (
            <div className="space-y-6 animate-in fade-in duration-300">
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
                  <div className="grid grid-cols-1 gap-4 overflow-hidden">
                    {sharedWorks.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-brand-border rounded-[2.5rem] bg-brand-surface">
                        <p className="text-brand-muted font-bold uppercase tracking-widest text-xs">No templates found</p>
                      </div>
                    ) : (
                      sharedWorks.map(work => (
                        <div key={work.id} className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-md transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">{work.subject} • {work.grade}</p>
                            <h3 className="text-xl font-black tracking-tight text-brand-text truncate">{work.title}</h3>
                            {(work.target_teacher_name || work.target_school_name) && (
                              <p className="text-[9px] font-black text-brand-accent/60 mt-2 uppercase tracking-widest">Target: {work.target_teacher_name || 'All'} @ {work.target_school_name || 'All Schools'}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="bg-brand-bg border-2 border-brand-accent/20 px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:border-brand-accent transition-colors"
                                 onClick={() => { navigator.clipboard.writeText(work.share_code); showToast("Copied!", "success"); }}>
                              <span className="text-sm font-black tracking-widest text-brand-text leading-none">{work.share_code}</span>
                              <Copy size={14} className="text-brand-muted" />
                            </div>
                            <button onClick={() => handleDeleteWork(work.id)} className="text-red-500/40 hover:text-red-500 p-2 transition-all" title="Delete template"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black tracking-tight uppercase">New {subTab === 'assessments' ? 'Assessment' : 'Assignment'}</h2>
                    <button onClick={() => { setIsCreating(false); setTargetRequestId(''); }} className="text-brand-muted text-xs font-black uppercase tracking-widest hover:text-brand-text transition-colors">Cancel</button>
                  </div>

                  {targetRequestId && (
                    <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-3xl p-5 mb-4 flex items-start gap-4 animate-in slide-in-from-top-4 duration-300 mx-2">
                      <div className="w-10 h-10 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent shrink-0 font-bold text-lg">
                        🎯
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Currently Processing Teacher Request</p>
                        <h4 className="text-sm font-black text-brand-text uppercase leading-tight">
                          {targetTeacher} • {examSubject || assignSubject} ({examGrade || assignGrade})
                        </h4>
                        {teacherRequests && teacherRequests.find(r => r.id === targetRequestId) && (
                          <>
                            <p className="text-xs font-bold text-brand-muted italic mt-1 bg-brand-bg/60 p-3 rounded-xl border border-brand-border/40">
                              "{teacherRequests.find(r => r.id === targetRequestId)?.description || 'No instructions'}"
                            </p>
                            <div className="flex gap-4 mt-2 text-[8px] font-black uppercase tracking-wider text-brand-muted">
                              <span>🔢 Requested: {teacherRequests.find(r => r.id === targetRequestId)?.num_questions || 10} Questions</span>
                              <span>•</span>
                              <span>Requested Format: <span className="text-brand-accent">{teacherRequests.find(r => r.id === targetRequestId)?.request_type || 'assessment'}</span></span>
                            </div>
                          </>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          setTargetRequestId('');
                          setTargetTeacher('');
                          setTargetTeacherId('');
                          setTargetSchool('');
                        }}
                        className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline whitespace-nowrap shrink-0 border border-red-500/10 hover:border-red-500/20 px-3 py-1.5 rounded-xl"
                      >
                        Clear Lock
                      </button>
                    </div>
                  )}
                  
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

          {/* ────── TABS: LAB MATERIALS ────── */}
          {!loading && activeTab === 'system' && (
            <div className="animate-in fade-in duration-300">
              <MaterialManager />
            </div>
          )}

          {/* ────── TABS: ARENA BUILDER ────── */}
          {!loading && activeTab === 'arena' && (
            <div className="space-y-12 animate-in fade-in duration-300">
              <ArenaQuestionCreator initialData={prefillArena} />
              <QuestionManager />
            </div>
          )}

          {/* ────── TABS: INBOX REQUESTS ────── */}
          {!loading && activeTab === 'requests' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="flex items-center justify-between px-2">
                  <div>
                    <h3 className="text-xl font-black tracking-tight uppercase text-brand-text">Teacher Material Requests</h3>
                    <p className="text-xs font-bold text-brand-muted uppercase tracking-widest mt-1">Deploy worksheets and tests on-demand</p>
                  </div>
                  <p className="text-[10px] font-black text-brand-muted bg-brand-surface border px-3 py-1.5 rounded-xl uppercase tracking-widest">{teacherRequests.length} Total</p>
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {teacherRequests.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-brand-border rounded-[2.5rem] bg-brand-surface">
                      <p className="text-brand-muted font-bold uppercase tracking-widest text-xs">No pending requests</p>
                    </div>
                  ) : (
                    teacherRequests.map(req => (
                      <div key={req.id} className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 space-y-4 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">{req.subject} • {req.grade}</p>
                            <h4 className="text-lg font-black tracking-tight uppercase text-brand-text">{req.topic}</h4>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider inline-block ${req.request_type === 'groupwork' ? 'bg-sky-500/10 text-sky-600' : req.request_type === 'assignment' ? 'bg-amber-500/10 text-amber-600' : 'bg-purple-500/10 text-purple-600'}`}>
                              {req.request_type || 'assessment'}
                            </span>
                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest inline-block ${req.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {req.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-brand-muted italic">"{req.description}"</p>
                        <div className="flex items-center justify-between pt-4 border-t border-brand-border text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-accent/5 flex items-center justify-center text-brand-accent font-black text-[10px] shrink-0">
                              {req.teacher_name ? req.teacher_name[0] : 'T'}
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest leading-none text-brand-text">{req.teacher_name}</p>
                              <p className="text-[8px] font-bold text-brand-muted uppercase tracking-widest mt-0.5">{req.school_name || 'No School'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => {
                                setActiveTab('arena');
                                setPrefillArena({
                                  subject: req.subject,
                                  grade: req.grade,
                                  topic: req.topic,
                                  teacher_id: req.teacher_id,
                                  teacher_name: req.teacher_name,
                                  request_id: req.id
                                });
                              }}
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${req.request_type === 'groupwork' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10 ring-2 ring-sky-500 ring-offset-2 ring-offset-brand-surface' : 'bg-brand-bg text-brand-muted hover:text-brand-text border border-brand-border'}`}
                            >
                              Game / Arena
                            </button>
                            <button 
                              onClick={() => {
                                setActiveTab('shared');
                                const reqType = req.request_type || 'assessment';
                                setSubTab(reqType === 'assignment' ? 'assignments' : 'assessments');
                                setCreationMode('manual');
                                setIsCreating(true);
                                setTargetTeacher(req.teacher_name);
                                setTargetTeacherId(req.teacher_id);
                                setTargetSchool(req.school_name);
                                setTargetRequestId(req.id);
                                setExamSubject(req.subject);
                                setAssignSubject(req.subject);
                                setExamGrade(req.grade);
                                setAssignGrade(req.grade);
                                setExamTitle(`${req.topic} - For ${req.teacher_name}`);
                                setAssignTitle(`${req.topic} - For ${req.teacher_name}`);
                              }}
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${req.request_type !== 'groupwork' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/10 ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-surface' : 'bg-brand-bg text-brand-muted hover:text-brand-text border border-brand-border'}`}
                            >
                              Process {req.request_type === 'assignment' ? 'Assignment' : 'Assessment'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

          {/* ────── TABS: PLATFORM ROSTER ────── */}
          {!loading && activeTab === 'teachers' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="flex items-center justify-between px-2">
                  <div>
                    <h3 className="text-xl font-black tracking-tight uppercase text-brand-text font-sans">Teachers Directory</h3>
                    <p className="text-xs font-bold text-brand-muted uppercase tracking-widest mt-1">List of registered teacher profiles and active schools</p>
                  </div>
                  <p className="text-[10px] font-black text-brand-muted bg-brand-surface border px-3 py-1.5 rounded-xl uppercase tracking-widest">{teachersList.length} Active</p>
               </div>
               <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-brand-bg/50 border-b border-brand-border text-[9px] font-black uppercase tracking-widest text-brand-muted">
                        <tr>
                          <th className="px-6 py-4">Teacher Name</th>
                          <th className="px-6 py-4">School</th>
                          <th className="px-6 py-4">Credentials (PIN)</th>
                          <th className="px-6 py-4">Joined Date</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-brand-border text-sm">
                        {teachersList.map(t => (
                           <tr key={t.id} className="hover:bg-brand-bg/30">
                              <td className="px-6 py-4 font-black text-brand-text flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs uppercase">
                                  {t.name ? t.name[0] : 'T'}
                                </div>
                                {t.name}
                              </td>
                              <td className="px-6 py-4 font-bold text-brand-muted text-xs">🏫 {t.school_name}</td>
                              <td className="px-6 py-4 font-mono text-xs font-black text-indigo-500">{t.pin}</td>
                              <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-muted opacity-60">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* ────── TABS: STORIES QUEST CONTENT MANAGER ────── */}
          {!loading && activeTab === 'stories' && (
            <div className="animate-in fade-in duration-300">
              <StoryQuestManager />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
