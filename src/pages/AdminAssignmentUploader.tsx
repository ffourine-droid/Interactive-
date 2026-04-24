import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronRight,
  Code,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
  Clock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

interface Question {
  id: string;
  type: 'mcq' | 'short_answer' | 'photo';
  text: string;
  options?: string[];
  correct_option?: string | number;
}

interface AssignmentForm {
  title: string;
  subject: string;
  grade: string;
  class_name: string;
  due_date: string;
  expected_students: string;
  json_questions: string;
}

export const AdminAssignmentUploader: React.FC<{ onBack: () => void; hideHeader?: boolean }> = ({ onBack, hideHeader }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ title: string; count: number; code: string } | null>(null);

  const [form, setForm] = useState<AssignmentForm>({
    title: '',
    subject: 'Mathematics',
    grade: '7',
    class_name: '',
    due_date: '',
    expected_students: '',
    json_questions: '[]'
  });

  const subjects = ['Mathematics', 'Science', 'English', 'Kiswahili', 'Social Studies'];
  const grades = ['6', '7', '8', '9'];

  const validateJson = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        setJsonError("JSON must be an array of questions");
        return null;
      }
      
      // Transform MCQ correct_option from A,B,C,D to 0,1,2,3 for compatibility
      const transformed = parsed.map((q: any) => {
        if (q.type === 'mcq' && typeof q.correct_option === 'string') {
          const letterMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
          const letter = q.correct_option.toUpperCase();
          if (letterMap.hasOwnProperty(letter)) {
            return { ...q, correct_option: letterMap[letter] };
          }
        }
        return q;
      });

      setJsonError(null);
      return transformed;
    } catch (e) {
      setJsonError("Invalid JSON — check your format");
      return null;
    }
  };

  const handlePreview = () => {
    const questions = validateJson(form.json_questions);
    if (questions) {
      setParsedQuestions(questions);
      setPreviewMode(true);
    }
  };

  const handleSave = async () => {
    const questions = validateJson(form.json_questions);
    if (!questions) return;

    if (!form.title || !form.class_name || !form.due_date) {
      showToast("Please fill in all details", "error");
      return;
    }

    setLoading(true);
    try {
      const studentArray = form.expected_students
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '');

      type SupabaseAssignment = {
        id: string;
        teacher_id: string;
        title: string;
        subject: string;
        grade: string;
        class_name: string;
        due_date: string;
        questions: Question[];
        expected_students: string[];
        short_code?: string;
      };

      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          teacher_id: 'admin',
          title: form.title,
          subject: form.subject,
          grade: `Grade ${form.grade}`,
          class_name: form.class_name,
          due_date: new Date(form.due_date).toISOString(),
          questions: questions,
          expected_students: studentArray
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // According to instructions: 6-char assignment code (first 6 chars of UUID)
        const code = data.id.substring(0, 6).toUpperCase();
        
        try {
          // Attempt to update the short_code column for future lookups
          // We wrap this because if the column doesn't exist yet, we still want to show success
          await supabase
            .from('assignments')
            .update({ short_code: code })
            .eq('id', data.id);
        } catch (updateErr) {
          console.warn("Could not update short_code column. Ensure it exists in your Supabase schema.", updateErr);
        }

        setSuccessData({
          title: data.title,
          count: questions.length,
          code: code
        });
        showToast("Assignment saved successfully!", "success");
      }
    } catch (err: any) {
      console.error('Save error:', err);
      showToast("Failed to save: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-10 shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-2">Assignment Ready!</h2>
          <p className="text-brand-muted font-bold mb-8">Generated successfully for {successData.title}</p>
          
          <div className="bg-brand-bg/50 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Assignment Code</p>
              <p className="text-3xl font-black tracking-tighter text-brand-accent">{successData.code}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Questions</p>
              <p className="font-bold text-sm">{successData.count} items created</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => {
                setSuccessData(null);
                setForm({
                  title: '',
                  subject: 'Mathematics',
                  grade: '7',
                  class_name: '',
                  due_date: '',
                  expected_students: '',
                  json_questions: '[]'
                });
                setPreviewMode(false);
              }}
              className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all"
            >
              Upload Another
            </button>
            <button 
              onClick={onBack}
              className="w-full py-4 text-brand-muted font-bold text-xs uppercase tracking-widest hover:text-brand-accent transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`${hideHeader ? '' : 'min-h-screen'} bg-brand-bg text-brand-text flex flex-col`}>
      {!hideHeader && (
        <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-brand-surface rounded-xl transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h1 className="font-black text-xl tracking-tight">Assignment Uploader</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-brand-accent/10 rounded-full border border-brand-accent/10">
                <span className="text-[10px] font-black tracking-widest text-brand-accent uppercase">Admin Portal</span>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 ${hideHeader ? 'max-w-full' : 'max-w-6xl'} w-full mx-auto p-4 md:p-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Metadata Form */}
          <section className="space-y-8">
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted mb-6 flex items-center gap-2">
                <BookOpen size={14} />
                Assignment Metadata
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. Percentage Profit Homework"
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Subject</label>
                    <select 
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-bold appearance-none"
                      value={form.subject}
                      onChange={e => setForm({...form, subject: e.target.value})}
                    >
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Grade</label>
                    <select 
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-bold appearance-none"
                      value={form.grade}
                      onChange={e => setForm({...form, grade: e.target.value})}
                    >
                      {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Class Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. 7B"
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                      value={form.class_name}
                      onChange={e => setForm({...form, class_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2">Due Date</label>
                    <input 
                      type="date"
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                      value={form.due_date}
                      onChange={e => setForm({...form, due_date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1 mb-2 flex justify-between items-center">
                    <span>Expected Students</span>
                    <span className="text-brand-muted/40 font-bold lowercase italic">comma separated</span>
                  </label>
                  <textarea 
                    placeholder="John Kamau, Sarah Wambui, Kevin Otieno..."
                    rows={3}
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm resize-none"
                    value={form.expected_students}
                    onChange={e => setForm({...form, expected_students: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted mb-6 flex items-center gap-2">
                <Code size={14} />
                JSON Payload
              </h2>
              
              <div className="space-y-4">
                <textarea 
                  placeholder="Paste your JSON question array here..."
                  rows={12}
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 outline-none focus:border-brand-accent/50 transition-all font-mono text-xs resize-none"
                  value={form.json_questions}
                  onChange={e => setForm({...form, json_questions: e.target.value})}
                />
                
                {jsonError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-black uppercase tracking-widest">
                    <AlertCircle size={16} />
                    {jsonError}
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={handlePreview}
                    className="flex-1 bg-brand-surface border border-brand-border py-4 rounded-xl font-black uppercase tracking-widest text-brand-text flex items-center justify-center gap-2 hover:bg-brand-bg transition-all"
                  >
                    <Eye size={18} />
                    Preview
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-[2] bg-brand-accent text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    Save Assignment
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Live Preview */}
          <section className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted px-2 flex items-center gap-2">
              <Eye size={14} />
              Student Preview {previewMode ? '' : '(Paste JSON and click preview)'}
            </h2>

            <div className="bg-brand-surface/40 border border-brand-border border-dashed rounded-[2.5rem] min-h-[600px] p-6 lg:p-8 space-y-6 overflow-y-auto max-h-[85vh]">
              {!previewMode ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 text-brand-muted/40">
                  <FileText size={48} className="mb-4 opacity-10" />
                  <p className="font-bold">No preview available.</p>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1">Data will appear here once parsed</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {parsedQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-sm opacity-80 pointer-events-none">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent font-black text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <h3 className="font-bold text-lg leading-tight pt-1">{q.text}</h3>
                      </div>

                      <div className="pl-12 space-y-4">
                        {q.type === 'mcq' && q.options && (
                          <div className="space-y-2">
                            {q.options.map((opt: string, optIdx: number) => (
                              <div 
                                key={optIdx}
                                className="w-full text-left p-4 rounded-2xl border border-brand-border bg-brand-bg flex items-center justify-between"
                              >
                                <span className="font-bold text-[15px]">{opt}</span>
                                <div className="w-5 h-5 rounded-full border-2 border-brand-border/40" />
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'short_answer' && (
                          <div className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 font-bold text-sm min-h-[100px] text-brand-muted/40">
                            Student answer area...
                          </div>
                        )}

                        {q.type === 'photo' && (
                          <div className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-brand-border rounded-3xl text-brand-muted/40">
                            <Plus size={32} className="opacity-10" />
                            <p className="text-[10px] uppercase font-black tracking-widest">Image Upload Area</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {parsedQuestions.length === 0 && (
                    <div className="text-center py-12 text-brand-muted">
                      <p className="font-bold italic">Parsed JSON contains no questions.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminAssignmentUploader;
