import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Layout, 
  FileText, 
  Image as ImageIcon, 
  ChevronRight, 
  PlayCircle,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { Experiment } from '../types';

export const MaterialManager: React.FC = () => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Experiment> | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingMaterial?.title) {
        showToast("Title is required", "error");
        return;
    }

    try {
      setLoading(true);
      const payload = {
        title: editingMaterial.title,
        subject: editingMaterial.subject,
        grade: editingMaterial.grade,
        html_content: editingMaterial.html_content,
        slides: editingMaterial.slides || [],
        pdf_url: editingMaterial.pdf_url,
        ppt_url: editingMaterial.ppt_url,
        audio_url: editingMaterial.audio_url,
        keywords: editingMaterial.keywords || '',
        is_free: editingMaterial.is_free ?? false
      };

      if (editingMaterial.id) {
        const { error } = await supabase
          .from('experiments')
          .update(payload)
          .eq('id', editingMaterial.id);
        if (error) throw error;
        showToast("Material updated successfully", "success");
      } else {
        const { error } = await supabase
          .from('experiments')
          .insert([payload]);
        if (error) throw error;
        showToast("Material created successfully", "success");
      }

      setShowEditor(false);
      setEditingMaterial(null);
      fetchMaterials();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
      const { error } = await supabase
        .from('experiments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast("Deleted successfully", "success");
      fetchMaterials();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const addNewSlide = () => {
    const slides = [...(editingMaterial?.slides || []), ''];
    setEditingMaterial({ ...editingMaterial, slides });
  };

  const removeSlide = (index: number) => {
    const slides = (editingMaterial?.slides || []).filter((_, i) => i !== index);
    setEditingMaterial({ ...editingMaterial, slides });
  };

  const updateSlide = (index: number, val: string) => {
    const slides = [...(editingMaterial?.slides || [])];
    slides[index] = val;
    setEditingMaterial({ ...editingMaterial, slides });
  };

  if (loading && materials.length === 0) {
    return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      {!showEditor ? (
        <>
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">HTML Master Library</h3>
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-1">Manage interactive materials and slides</p>
            </div>
            <button 
              onClick={() => {
                setEditingMaterial({
                  title: '',
                  subject: '',
                  grade: 'Grade 7',
                  html_content: '<h1>New Topic</h1><p>Start typing here...</p>',
                  slides: [],
                  is_free: false
                });
                setShowEditor(true);
              }}
              className="bg-brand-accent text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center gap-2"
            >
              <Plus size={16} /> New Material
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {materials.map(mat => (
              <div key={mat.id} className="bg-brand-surface border border-brand-border p-5 rounded-3xl flex items-center justify-between group hover:border-brand-accent transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                        {mat.slides?.length ? <PlayCircle size={24} /> : <FileText size={24} />}
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest mb-1">{mat.subject} • {mat.grade}</p>
                        <h4 className="font-black text-lg tracking-tight leading-tight">{mat.title}</h4>
                        <div className="flex gap-2 mt-2">
                            {mat.html_content && <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20">HTML</span>}
                            {mat.slides?.length > 0 && <span className="text-[8px] font-black uppercase bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20">{mat.slides.length} Slides</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingMaterial(mat);
                      setShowEditor(true);
                    }}
                    className="p-2 text-brand-muted hover:text-brand-accent hover:bg-brand-accent/5 rounded-xl transition-all"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(mat.id)}
                    className="p-2 text-red-500/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight uppercase">{editingMaterial?.id ? 'Edit Material' : 'New HTML Material'}</h2>
            <button onClick={() => setShowEditor(false)} className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Title</label>
                        <input 
                            value={editingMaterial?.title || ''} 
                            onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})}
                            placeholder="Material Title" 
                            className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm" 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Subject</label>
                        <input 
                            value={editingMaterial?.subject || ''} 
                            onChange={e => setEditingMaterial({...editingMaterial, subject: e.target.value})}
                            placeholder="e.g. Science" 
                            className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm" 
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Grade</label>
                        <select 
                            value={editingMaterial?.grade || ''} 
                            onChange={e => setEditingMaterial({...editingMaterial, grade: e.target.value})}
                            className="w-full bg-brand-bg border border-brand-border p-4 rounded-xl font-bold text-sm"
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i} value={`Grade ${i+1}`}>Grade {i+1}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                        <input 
                            type="checkbox"
                            id="is_free"
                            checked={editingMaterial?.is_free || false}
                            onChange={e => setEditingMaterial({...editingMaterial, is_free: e.target.checked})}
                            className="w-5 h-5 accent-brand-accent"
                        />
                        <label htmlFor="is_free" className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Free Material</label>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">HTML Content</label>
                        <div className="flex bg-brand-bg rounded-lg p-1">
                            <button 
                                onClick={() => setPreviewMode('edit')}
                                className={`px-3 py-1 text-[8px] font-black uppercase rounded ${previewMode === 'edit' ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => setPreviewMode('preview')}
                                className={`px-3 py-1 text-[8px] font-black uppercase rounded ${previewMode === 'preview' ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>
                    
                    {previewMode === 'edit' ? (
                        <textarea 
                            value={editingMaterial?.html_content || ''}
                            onChange={e => setEditingMaterial({...editingMaterial, html_content: e.target.value})}
                            className="w-full bg-brand-bg border border-brand-border rounded-2xl p-6 font-mono text-xs h-64 outline-none focus:border-brand-accent transition-colors"
                            placeholder="<h1>HTML Content</h1>..."
                        />
                    ) : (
                        <div 
                            className="w-full bg-brand-bg border border-brand-border rounded-2xl p-6 h-64 overflow-y-auto prose prose-sm max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:font-bold prose-p:text-brand-muted"
                            dangerouslySetInnerHTML={{ __html: editingMaterial?.html_content || '' }}
                        />
                    )}
                </div>
            </div>

            <div className="space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Interactive Slides</label>
                        <button onClick={addNewSlide} className="text-brand-accent text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Plus size={12} /> Add Slide
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {editingMaterial?.slides?.map((url, i) => (
                            <div key={i} className="flex gap-2">
                                <div className="w-10 h-10 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center shrink-0">
                                    <ImageIcon size={16} className="text-brand-muted/40" />
                                </div>
                                <input 
                                    value={url}
                                    onChange={e => updateSlide(i, e.target.value)}
                                    placeholder="Image URL..."
                                    className="flex-1 bg-brand-bg border border-brand-border px-4 rounded-xl text-xs font-bold"
                                />
                                <button onClick={() => removeSlide(i)} className="p-2 text-red-500/40 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Media & Files</label>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-3">
                            <span className="w-20 text-[8px] font-black uppercase text-brand-muted/60">PDF URL</span>
                            <input 
                                value={editingMaterial?.pdf_url || ''} 
                                onChange={e => setEditingMaterial({...editingMaterial, pdf_url: e.target.value})}
                                placeholder="https://..." 
                                className="flex-1 bg-brand-bg border border-brand-border p-3 rounded-xl font-bold text-xs" 
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-20 text-[8px] font-black uppercase text-brand-muted/60">PPT URL</span>
                            <input 
                                value={editingMaterial?.ppt_url || ''} 
                                onChange={e => setEditingMaterial({...editingMaterial, ppt_url: e.target.value})}
                                placeholder="https://..." 
                                className="flex-1 bg-brand-bg border border-brand-border p-3 rounded-xl font-bold text-xs" 
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-20 text-[8px] font-black uppercase text-brand-muted/60">Audio URL</span>
                            <input 
                                value={editingMaterial?.audio_url || ''} 
                                onChange={e => setEditingMaterial({...editingMaterial, audio_url: e.target.value})}
                                placeholder="https://..." 
                                className="flex-1 bg-brand-bg border border-brand-border p-3 rounded-xl font-bold text-xs" 
                            />
                        </div>
                    </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {editingMaterial?.id ? 'Update Material' : 'Publish Material'}
                </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
