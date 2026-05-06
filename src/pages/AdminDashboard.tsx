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
  Database
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assessments' | 'assignments'>('assessments');
  const [sharedWorks, setSharedWorks] = useState<any[]>([]);
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

  useEffect(() => {
    fetchSharedWorks();
  }, [activeTab]);

  const fetchSharedWorks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(activeTab === 'assessments' ? 'exams' : 'assignments')
        .select('*')
        .eq('created_by_admin', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSharedWorks(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'AZ-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 2; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleSaveAssessment = async () => {
    if (!examTitle || questions.length === 0) {
      showToast("Title and at least one question required", "error");
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      const { error } = await supabase
        .from('exams')
        .insert({
          title: examTitle,
          subject: examSubject,
          grade: examGrade,
          duration_minutes: examDuration,
          questions: questions,
          share_code: code,
          created_by_admin: true,
          is_published: true,
          target_teacher_name: targetTeacher,
          target_school_name: targetSchool
        });

      if (error) throw error;
      showToast(`Assessment created with code: ${code}`, "success");
      setIsCreating(false);
      resetForms();
      fetchSharedWorks();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignTitle || !assignContent) {
      showToast("Title and content required", "error");
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      const { error } = await supabase
        .from('assignments')
        .insert({
          title: assignTitle,
          subject: assignSubject,
          grade: assignGrade,
          content: assignContent,
          share_code: code,
          created_by_admin: true,
          target_teacher_name: targetTeacher,
          target_school_name: targetSchool
        });

      if (error) throw error;
      showToast(`Assignment created with code: ${code}`, "success");
      setIsCreating(false);
      resetForms();
      fetchSharedWorks();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJSON = async () => {
    try {
      const data = JSON.parse(jsonInput);
      const code = generateCode();
      const table = activeTab === 'assessments' ? 'exams' : 'assignments';
      
      const payload = {
        ...data,
        share_code: code,
        created_by_admin: true,
      };

      if (activeTab === 'assessments') payload.is_published = true;

      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;

      showToast(`Shared work created with code: ${code}`, "success");
      setIsCreating(false);
      setJsonInput('');
      fetchSharedWorks();
    } catch (err: any) {
      showToast("Invalid JSON or DB Error: " + err.message, "error");
    }
  };

  const resetForms = () => {
    setExamTitle('');
    setExamSubject('');
    setQuestions([]);
    setAssignTitle('');
    setAssignContent('');
    setJsonInput('');
    setTargetTeacher('');
    setTargetSchool('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the shared template.")) return;
    try {
      const { error } = await supabase
        .from(activeTab === 'assessments' ? 'exams' : 'assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast("Deleted successfully", "success");
      fetchSharedWorks();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-brand-surface border-b border-brand-border h-16 sticky top-0 z-50 px-4">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
               <Database className="text-brand-accent" size={20} />
               <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none">ADMIN TERMINAL</h1>
                  <p className="text-[8px] font-bold text-brand-muted uppercase tracking-widest mt-0.5">Workforce Creator & Shared Assets</p>
               </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('assessments')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assessments' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
            >
              Assessments
            </button>
            <button 
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assignments' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-accent'}`}
            >
              Assignments
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8 space-y-8">
        {!isCreating ? (
          <>
            <div className="flex items-center justify-between px-2">
               <div>
                  <h2 className="text-2xl font-black tracking-tight">{activeTab === 'assessments' ? 'Shared Assessments' : 'Shared Assignments'}</h2>
                  <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">Active share codes available for teachers</p>
               </div>
               <button 
                 onClick={() => setIsCreating(true)}
                 className="bg-brand-accent text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-accent/20 flex items-center gap-2 active:scale-95 transition-all"
               >
                 <Plus size={16} />
                 Create New Shared Work
               </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>
              ) : sharedWorks.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-brand-border rounded-[2.5rem] bg-brand-surface">
                   <p className="text-brand-muted font-bold">No shared {activeTab} yet.</p>
                </div>
              ) : (
                sharedWorks.map(work => (
                  <div key={work.id} className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-brand-accent/40 transition-colors">
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">{work.subject}</span>
                           <div className="w-1 h-1 bg-brand-border rounded-full" />
                           <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{work.grade}</span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight">{work.title}</h3>
                        {(work.target_teacher_name || work.target_school_name) && (
                          <p className="text-[9px] font-black text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-md inline-block mt-2 border border-emerald-500/10 uppercase tracking-widest">
                            For: {work.target_teacher_name} • {work.target_school_name}
                          </p>
                        )}
                     </div>
                     
                     <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="bg-brand-bg border-2 border-brand-accent/20 px-4 py-2 rounded-xl flex items-center gap-2 group cursor-pointer hover:border-brand-accent transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(work.share_code);
                            showToast("Code copied!", "success");
                          }}
                        >
                           <span className="text-sm font-black tracking-[0.2em]">{work.share_code}</span>
                           <Copy size={14} className="text-brand-muted group-hover:text-brand-accent" />
                        </div>
                        <button 
                          onClick={() => handleDelete(work.id)}
                          className="text-red-500 hover:text-red-600 p-2 opacity-50 hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8">
             <div className="flex items-center justify-between px-2">
                <div>
                   <h2 className="text-2xl font-black tracking-tight uppercase">New Shared {activeTab === 'assessments' ? 'Assessment' : 'Assignment'}</h2>
                   <div className="flex items-center gap-4 mt-2">
                      <button 
                        onClick={() => setCreationMode('manual')}
                        className={`text-[10px] font-black uppercase tracking-widest ${creationMode === 'manual' ? 'text-brand-accent' : 'text-brand-muted'}`}
                      >
                        Manual Entry
                      </button>
                      <button 
                        onClick={() => setCreationMode('json')}
                        className={`text-[10px] font-black uppercase tracking-widest ${creationMode === 'json' ? 'text-brand-accent' : 'text-brand-muted'}`}
                      >
                        JSON Import
                      </button>
                   </div>
                </div>
                <button onClick={() => setIsCreating(false)} className="text-brand-muted text-xs font-bold uppercase tracking-widest">Cancel</button>
             </div>

             {creationMode === 'json' ? (
               <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-brand-border">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Target Teacher (Optional)</label>
                        <input value={targetTeacher} placeholder="Teacher to receive code" onChange={e => setTargetTeacher(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Target School (Optional)</label>
                        <input value={targetSchool} placeholder="School Name" onChange={e => setTargetSchool(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest px-1">Raw JSON Content</label>
                    <textarea 
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='{ "title": "Example", "subject": "Math", ... }'
                      className="w-full bg-brand-bg border-2 border-brand-border rounded-xl p-6 font-mono text-xs h-96 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleSaveJSON}
                    className="w-full bg-brand-text text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Code size={20} />
                    Publish via JSON
                  </button>
               </div>
             ) : activeTab === 'assessments' ? (
               <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-brand-border">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Target Teacher (Optional)</label>
                        <input value={targetTeacher} placeholder="Teacher to receive code" onChange={e => setTargetTeacher(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Target School (Optional)</label>
                        <input value={targetSchool} placeholder="School Name" onChange={e => setTargetSchool(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Title</label>
                        <input value={examTitle} onChange={e => setExamTitle(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Subject</label>
                        <input value={examSubject} onChange={e => setExamSubject(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Grade</label>
                        <input value={examGrade} onChange={e => setExamGrade(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Duration (Mins)</label>
                        <input type="number" value={examDuration} onChange={e => setExamDuration(Number(e.target.value))} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-brand-border">
                     <div className="flex justify-between items-center">
                        <h3 className="font-black text-xs uppercase tracking-widest">Questions ({questions.length})</h3>
                        <button 
                          onClick={() => setQuestions([...questions, { text: '', type: 'mcq', marks: 5, options: ['', '', '', ''], correct_answer: '' }])}
                          className="text-brand-accent text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Question
                        </button>
                     </div>
                     
                     <div className="space-y-4">
                        {questions.map((q, idx) => (
                           <div key={idx} className="bg-brand-bg p-6 rounded-2xl space-y-4">
                              <input 
                                placeholder="Question Text"
                                value={q.text}
                                onChange={e => {
                                   const newQ = [...questions];
                                   newQ[idx].text = e.target.value;
                                   setQuestions(newQ);
                                }}
                                className="w-full bg-brand-surface border border-brand-border p-3 rounded-lg text-sm font-bold"
                              />
                              <div className="grid grid-cols-2 gap-4">
                                 {q.options.map((opt: string, oi: number) => (
                                    <input 
                                      key={oi}
                                      placeholder={`Option ${oi + 1}`}
                                      value={opt}
                                      onChange={e => {
                                         const newQ = [...questions];
                                         newQ[idx].options[oi] = e.target.value;
                                         setQuestions(newQ);
                                      }}
                                      className="bg-brand-surface border border-brand-border p-2 rounded-lg text-xs"
                                    />
                                 ))}
                              </div>
                              <input 
                                placeholder="Correct Answer (Exact text or A/B/C/D)"
                                value={q.correct_answer}
                                onChange={e => {
                                   const newQ = [...questions];
                                   newQ[idx].correct_answer = e.target.value;
                                   setQuestions(newQ);
                                }}
                                className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-lg text-xs"
                              />
                           </div>
                        ))}
                     </div>
                  </div>

                  <button 
                    onClick={handleSaveAssessment}
                    className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all"
                  >
                    Generate Share Code & Publish
                  </button>
               </div>
             ) : (
               <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-brand-border">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Target Teacher (Optional)</label>
                        <input value={targetTeacher} placeholder="Teacher to receive code" onChange={e => setTargetTeacher(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Target School (Optional)</label>
                        <input value={targetSchool} placeholder="School Name" onChange={e => setTargetSchool(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Title</label>
                        <input value={assignTitle} onChange={e => setAssignTitle(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Subject</label>
                        <input value={assignSubject} onChange={e => setAssignSubject(e.target.value)} className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold" />
                     </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest px-1">Assignment Content</label>
                    <textarea 
                      value={assignContent}
                      onChange={(e) => setAssignContent(e.target.value)}
                      placeholder='Instructions, questions, etc...'
                      className="w-full bg-brand-bg border-2 border-brand-border rounded-xl p-6 text-sm h-48 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleSaveAssignment}
                    className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all"
                  >
                    Generate Share Code & Publish
                  </button>
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
}
