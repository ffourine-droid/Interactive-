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
  AlertCircle,
  FileUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { Experiment } from '../types';
import { FileUploadZone } from './FileUploadZone';

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
        .select('id, title, subject, grade, html_content, slides, created_at')
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
              <h3 className="text-xl font-bold text-brand-text">Material Library</h3>
              <p className="text-sm font-medium text-brand-muted mt-1">Manage interactive materials and lessons</p>
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
              className="bg-brand-accent text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-brand-accent/20 flex items-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Plus size={18} /> New Material
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
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-1">Title</label>
                                <input 
                                    value={editingMaterial?.title || ''} 
                                    onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})}
                                    placeholder="Enter title..." 
                                    className="w-full bg-brand-bg border border-brand-border p-3.5 rounded-xl font-medium text-sm focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-1">Subject</label>
                                <input 
                                    value={editingMaterial?.subject || ''} 
                                    onChange={e => setEditingMaterial({...editingMaterial, subject: e.target.value})}
                                    placeholder="e.g. Science" 
                                    className="w-full bg-brand-bg border border-brand-border p-3.5 rounded-xl font-medium text-sm focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all" 
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-1">Grade Level</label>
                                <select 
                                    value={editingMaterial?.grade || ''} 
                                    onChange={e => setEditingMaterial({...editingMaterial, grade: e.target.value})}
                                    className="w-full bg-brand-bg border border-brand-border p-3.5 rounded-xl font-medium text-sm appearance-none outline-none focus:ring-2 focus:ring-brand-accent/20"
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i} value={`Grade ${i+1}`}>Grade {i+1}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2.5 mt-7">
                                <div 
                                    onClick={() => setEditingMaterial({...editingMaterial, is_free: !editingMaterial?.is_free})}
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${editingMaterial?.is_free ? 'bg-brand-accent' : 'bg-brand-border'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${editingMaterial?.is_free ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Free Material</span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-1">Content Block (HTML)</label>
                                <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border">
                                    <button 
                                        onClick={() => setPreviewMode('edit')}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${previewMode === 'edit' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-muted'}`}
                                    >
                                        Editor
                                    </button>
                                    <button 
                                        onClick={() => setPreviewMode('preview')}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${previewMode === 'preview' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-muted'}`}
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                            
                            {previewMode === 'edit' ? (
                                <textarea 
                                    value={editingMaterial?.html_content || ''}
                                    onChange={e => setEditingMaterial({...editingMaterial, html_content: e.target.value})}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-mono text-sm h-64 outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all resize-none"
                                    placeholder="Enter HTML content..."
                                />
                            ) : (
                                <div 
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-6 h-64 overflow-y-auto prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: editingMaterial?.html_content || '' }}
                                />
                            )}
                        </div>
                    </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-1">Interactive Slides</label>
                        <button 
                          id="add-slide-btn"
                          onClick={addNewSlide}
                          className="bg-brand-bg border border-brand-border p-2 rounded-lg text-brand-accent hover:bg-brand-accent/10 transition-colors"
                          title="Add Slide"
                        >
                          <Plus size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <FileUploadZone 
                          label="Main Lesson Slides (Images)"
                          multiple={true}
                          onUploadComplete={(urls) => {
                            if (Array.isArray(urls)) {
                                const slides = [...(editingMaterial?.slides || []), ...urls];
                                setEditingMaterial({...editingMaterial, slides});
                            }
                          }}
                          onClear={() => setEditingMaterial({...editingMaterial, slides: []})}
                          currentUrl={editingMaterial?.slides && editingMaterial.slides.length > 0 ? "Multiple Files Selected" : undefined}
                          accept="image/*"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-1">Attached Files</label>
                    <div className="grid grid-cols-1 gap-4">
                        <FileUploadZone 
                          label="PDF Attachment"
                          onUploadComplete={(url) => setEditingMaterial({...editingMaterial, pdf_url: url})}
                          currentUrl={editingMaterial?.pdf_url}
                          onClear={() => setEditingMaterial({...editingMaterial, pdf_url: ''})}
                          accept=".pdf"
                        />
                        <FileUploadZone 
                          label="PowerPoint (PPT)"
                          onUploadComplete={(url) => setEditingMaterial({...editingMaterial, ppt_url: url})}
                          currentUrl={editingMaterial?.ppt_url}
                          onClear={() => setEditingMaterial({...editingMaterial, ppt_url: ''})}
                          accept=".ppt,.pptx"
                        />
                        <FileUploadZone 
                          label="Audio Lesson"
                          onUploadComplete={(url) => setEditingMaterial({...editingMaterial, audio_url: url})}
                          currentUrl={editingMaterial?.audio_url}
                          onClear={() => setEditingMaterial({...editingMaterial, audio_url: ''})}
                          accept="audio/*"
                        />
                    </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-brand-accent text-white py-4 rounded-xl font-bold text-sm shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {editingMaterial?.id ? 'Update Changes' : 'Create Material'}
                </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
