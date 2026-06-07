import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  FileText, 
  Eye,
  Loader2,
  AlertCircle,
  FileCheck,
  Upload,
  Search,
  BookOpen,
  Filter,
  CheckCircle2,
  Database,
  ArrowRight,
  Edit2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface NotesTopicRow {
  id: string | number;
  topic_id: string;
  topic: string;
  chapter: string;
  subject: string;
  grade: string | number;
  sections: any[];
  html_content?: string;
  is_active?: boolean;
  created_at?: string;
}

export const CurriculumNotesManager: React.FC = () => {
  const { showToast } = useToast();
  const [topics, setTopics] = useState<NotesTopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // Upload & parse states
  const [jsonInput, setJsonInput] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editRow, setEditRow] = useState<Partial<NotesTopicRow> | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTopics(data || []);
    } catch (err: any) {
      showToast(err.message || 'Error fetching topics database', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper validation & normalization function
  const validateAndNormalize = (input: string): { valid: boolean; data: any[]; message: string } => {
    if (!input.trim()) {
      return { valid: false, data: [], message: 'Input JSON content is empty' };
    }

    try {
      const parsed = JSON.parse(input);
      let rawItems: any[] = [];

      // Check if it's an envelope object with a 'topics' array
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.topics)) {
        rawItems = parsed.topics.map((item: any) => ({
          ...item,
          grade: item.grade !== undefined && item.grade !== null ? item.grade : parsed.grade,
          subject: item.subject || parsed.subject
        }));
      } else {
        rawItems = Array.isArray(parsed) ? parsed : [parsed];
      }

      const validItems: any[] = [];

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const indexLabel = Array.isArray(parsed) ? `at position [${i}]` : '';

        // Check required fields
        const id = item.topic_id || item.id;
        if (!id) {
          return {
            valid: false,
            data: [],
            message: `Validation Error ${indexLabel}: Missing topic ID ('topic_id' or 'id' is required)`
          };
        }

        const topic = item.topic || item.title;
        if (!topic) {
          return {
            valid: false,
            data: [],
            message: `Validation Error ${indexLabel}: Missing topic template details ('topic' or 'title' is required)`
          };
        }

        if (!item.subject) {
          return {
            valid: false,
            data: [],
            message: `Validation Error ${indexLabel}: Missing academic 'subject' column`
          };
        }

        if (item.grade === undefined || item.grade === null) {
          return {
            valid: false,
            data: [],
            message: `Validation Error ${indexLabel}: Missing student target 'grade'`
          };
        }

        if (!item.sections || !Array.isArray(item.sections)) {
          return {
            valid: false,
            data: [],
            message: `Validation Error ${indexLabel}: 'sections' must be a valid JSON array of interactive blocks`
          };
        }

        // Keep content clean & mapped uniformly
        validItems.push({
          topic_id: String(id).trim(),
          topic: String(topic).trim(),
          chapter: String(item.chapter || 'General Syllabus').trim(),
          subject: String(item.subject).trim(),
          grade: String(item.grade),
          sections: item.sections,
          html_content: item.html_content || '',
          is_active: item.is_active !== false
        });
      }

      return {
        valid: true,
        data: validItems,
        message: `Parsed successfully! Detected ${validItems.length} curriculum note model${validItems.length > 1 ? 's' : ''} ready for deployment.`
      };
    } catch (err: any) {
      return { valid: false, data: [], message: `Invalid JSON format: ${err.message}` };
    }
  };

  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    if (!val.trim()) {
      setValidationStatus('idle');
      setValidationMessage('');
      setParsedData([]);
      return;
    }

    const res = validateAndNormalize(val);
    if (res.valid) {
      setValidationStatus('valid');
      setParsedData(res.data);
    } else {
      setValidationStatus('invalid');
      setParsedData([]);
    }
    setValidationMessage(res.message);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleJsonChange(text);
    };
    reader.readAsText(file);
  };

  const handleSaveAll = async () => {
    if (parsedData.length === 0) {
      showToast('No validated data available' , 'error');
      return;
    }

    try {
      setIsSaving(true);
      
      // Perform sequential upsertion query so existing entries update on matching 'topic_id'
      for (const item of parsedData) {
        // Query check to avoid duplicate keys conflict in notes_topics
        const { data: existing } = await supabase
          .from('notes_topics')
          .select('id')
          .eq('topic_id', item.topic_id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('notes_topics')
            .update({
              topic: item.topic,
              chapter: item.chapter,
              subject: item.subject,
              grade: item.grade,
              sections: item.sections,
              html_content: item.html_content,
              is_active: item.is_active
            })
            .eq('topic_id', item.topic_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('notes_topics')
            .insert([item]);
          if (error) throw error;
        }
      }

      showToast(`Success! Deployed ${parsedData.length} syllabus topics smoothly`, 'success');
      setJsonInput('');
      setValidationStatus('idle');
      setParsedData([]);
      setShowEditor(false);
      fetchTopics();
    } catch (err: any) {
      showToast(err.message || 'Error processing notes deployment', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm(`Are you sure you want to delete this curriculum note topic with ID: ${topicId}?`)) return;
    try {
      const { error } = await supabase
        .from('notes_topics')
        .delete()
        .eq('topic_id', topicId);
      
      if (error) throw error;
      showToast('Curriculum note removed successfully', 'success');
      fetchTopics();
    } catch (err: any) {
      showToast(err.message || 'Error deleting topic', 'error');
    }
  };

  // Filter entries
  const filteredTopics = topics.filter(row => {
    const matchSearch = String(row.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        String(row.topic_id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        String(row.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchGrade = !selectedGrade || String(row.grade).toLowerCase().includes(selectedGrade.toLowerCase());
    const matchSubject = !selectedSubject || String(row.subject).toLowerCase().includes(selectedSubject.toLowerCase());

    return matchSearch && matchGrade && matchSubject;
  });

  const getTopicSectionCounts = (sections: any[]) => {
    if (!Array.isArray(sections)) return '0 Blocks';
    const counts: Record<string, number> = {};
    sections.forEach(s => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([type, cnt]) => `${cnt} ${type}`)
      .join(', ') || '0 Blocks';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-xl font-black text-brand-text tracking-tight uppercase">Curriculum Notes Hub</h3>
          <p className="text-xs font-semibold text-brand-muted uppercase tracking-widest mt-1">Manage interactive syllabus models and classroom lessons</p>
        </div>
        
        {!showEditor && (
          <button 
            onClick={() => {
              setJsonInput('');
              setValidationStatus('idle');
              setParsedData([]);
              setShowEditor(true);
            }}
            className="bg-brand-accent text-white px-5 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-widest shadow-lg shadow-brand-accent/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={14} /> Import Notes Hub (JSON)
          </button>
        )}
      </div>

      {!showEditor ? (
        <>
          {/* Filters Slate */}
          <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, ID, or subject..."
                className="w-full bg-brand-bg border border-brand-border pl-10 pr-4 py-3 rounded-2xl text-xs font-semibold tracking-wide outline-none focus:ring-2 focus:ring-brand-accent/10 transition-all placeholder:text-brand-muted/70"
              />
            </div>

            <div>
              <select 
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border px-4 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase text-brand-muted outline-none appearance-none cursor-pointer"
              >
                <option value="">All Grades</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={`Grade ${i+1}`}>Grade {i+1}</option>
                ))}
              </select>
            </div>

            <div>
              <select 
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border px-4 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase text-brand-muted outline-none appearance-none cursor-pointer"
              >
                <option value="">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
                <option value="Kiswahili">Kiswahili</option>
                <option value="Social Studies">Social Studies</option>
                <option value="CRE">CRE</option>
                <option value="Agriculture and Nutrition">Agriculture and Nutrition</option>
                <option value="Creative Arts and Sports">Creative Arts and Sports</option>
              </select>
            </div>
          </div>

          {/* Table List of Database Entries */}
          <div className="bg-brand-surface border border-brand-border rounded-[2rem] overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-24 flex justify-center items-center">
                <Loader2 className="animate-spin text-brand-accent" size={32} />
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <Database className="text-brand-muted mb-3 opacity-40 animate-pulse" size={40} />
                <p className="text-xs font-black uppercase text-brand-muted tracking-widest">No active syllabus entries matching filter conditions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-brand-bg/60 border-b border-brand-border text-[9px] font-black uppercase tracking-widest text-brand-muted">
                    <tr>
                      <th className="px-6 py-4">Topic / Unique ID</th>
                      <th className="px-6 py-4">Academic Details</th>
                      <th className="px-6 py-4">Interactive Blocks Count</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-sm">
                    {filteredTopics.map((row) => (
                      <tr key={row.id} className="hover:bg-brand-bg/20 transition-all">
                        <td className="px-6 py-4">
                          <p className="font-extrabold text-brand-text leading-tight">{row.topic}</p>
                          <code className="text-[10px] font-mono font-bold text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 inline-block mt-1">{row.topic_id}</code>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-brand-accent leading-none mb-1">{row.subject}</p>
                          <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">{row.chapter} • Grade {row.grade}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-brand-text bg-brand-bg border border-brand-border px-3 py-1.5 rounded-xl uppercase tracking-wider">
                            {getTopicSectionCounts(row.sections)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleDelete(row.topic_id)}
                              className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:text-white hover:bg-red-500 transition-all flex items-center justify-center shadow-sm hover:shadow-red-500/20 active:scale-95"
                              title="Delete Topic"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* JSON Import Screen */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-8 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-brand-text uppercase tracking-tight">Deploy Curriculum Notes (JSON Upload)</h2>
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mt-1">Populate the client-side hub dynamically with verified metadata structures</p>
            </div>
            <button 
              onClick={() => {
                setShowEditor(false);
                setJsonInput('');
                setValidationStatus('idle');
                setParsedData([]);
              }}
              className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Side */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-brand-muted uppercase tracking-wider px-1">JSON Template Specifications</label>
                
                {/* File Upload Zone */}
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-brand-bg hover:bg-brand-accent/5 border border-brand-border hover:border-brand-accent/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text transition-all"
                  >
                    <Upload size={13} className="text-brand-accent animate-bounce" />
                    Load JSON File
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea 
                  value={jsonInput}
                  onChange={e => handleJsonChange(e.target.value)}
                  className="w-full h-96 bg-brand-bg border border-brand-border rounded-2rem p-5 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all resize-none shadow-sm"
                  placeholder={`Example Schema (now accepts both flat array items and nested topics format):
{
  "grade": 7,
  "subject": "Social Studies",
  "topics": [
    {
      "topic_id": "ss-grade7-self-exploration",
      "chapter": "Strand 1: Personal Development",
      "topic": "Self-Exploration",
      "sections": [
        {
          "type": "definition",
          "term": "Self-Exploration",
          "meaning": "The practice of examining your own thoughts, feelings, values..."
        },
        {
          "type": "keypoint",
          "content": "The purpose of self-exploration is to determine the gap between what you are and what you really want to be."
        }
      ]
    }
  ]
}`}
                />
              </div>
            </div>

            {/* Validation & Live Preview Side */}
            <div className="bg-brand-bg/30 border border-brand-border rounded-2rem p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <h4 className="text-[11px] font-black text-brand-muted uppercase tracking-wider">Validation Integrity Report</h4>

                {validationStatus === 'idle' ? (
                  <div className="bg-brand-surface/70 border border-brand-border p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2.5">
                    <FileText size={32} className="text-brand-muted animate-pulse" />
                    <p className="text-xs font-black uppercase text-brand-muted tracking-wide leading-tight">Waiting for JSON file upload or content input...</p>
                  </div>
                ) : validationStatus === 'valid' ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/20 p-5 flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black uppercase text-emerald-600 tracking-wider">JSON validation succeeded</p>
                        <p className="text-[11px] font-bold text-brand-muted mt-1 leading-relaxed">{validationMessage}</p>
                      </div>
                    </div>

                    {/* Compact Parsed Items Preview */}
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                      {parsedData.map((item, idx) => (
                        <div key={idx} className="bg-brand-surface border border-brand-border p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest">{item.subject}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grade {item.grade}</span>
                          </div>
                          <h5 className="font-extrabold text-sm tracking-tight text-brand-text leading-tight uppercase">{item.topic}</h5>
                          <div className="flex justify-between items-center text-[10px] font-bold text-brand-muted pt-1 border-t border-brand-border/40">
                            <span>Chapter: {item.chapter}</span>
                            <span>{item.sections.length} Active Blocks</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-5 flex items-start gap-4">
                    <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase text-red-600 tracking-wide">Validation failed</p>
                      <p className="text-[11px] font-bold text-brand-muted mt-1 leading-relaxed">{validationMessage}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-brand-border/40">
                <button 
                  onClick={handleSaveAll}
                  disabled={validationStatus !== 'valid' || isSaving}
                  className="w-full bg-brand-accent text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-accent/15 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Deploying to Database...
                    </>
                  ) : (
                    <>
                      <FileCheck size={16} />
                      Publish & Deploy Note Syllabus
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
