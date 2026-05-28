import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { 
  FileText, 
  Image as ImageIcon, 
  File, 
  Eye, 
  EyeOff, 
  Trash2, 
  ExternalLink, 
  FolderOpen, 
  CircleDot, 
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Material {
  id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  description: string | null;
  file_name: string;
  file_type: 'pdf' | 'image' | 'docx' | string;
  storage_path: string;
  file_size: number;
  grade: string | null;
  subject: string | null;
  is_visible: boolean;
  created_at: string;
}

interface MaterialsListProps {
  teacherId?: string;
  classId?: string | null;
  grade?: string | null;
  subject?: string | null;
  isTeacher?: boolean;
  refreshKey?: number;
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const MaterialsList: React.FC<MaterialsListProps> = ({
  teacherId,
  classId,
  grade,
  subject,
  isTeacher = false,
  refreshKey = 0,
}) => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('teacher_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (teacherId) query = query.eq('teacher_id', teacherId);
      
      // Filter logically:
      // If we are showing class-specific material:
      if (classId) {
        query = query.eq('class_id', classId);
      } else if (grade) {
        // If loaded for general grade:
        query = query.eq('grade', grade);
      }
      
      if (subject && subject !== 'All' && subject !== 'all') {
        query = query.eq('subject', subject);
      }

      if (!isTeacher) {
        query = query.eq('is_visible', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMaterials(data || []);
    } catch (err: any) {
      console.error('Error fetching teacher materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [teacherId, classId, grade, subject, refreshKey]);

  const getFileUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('materials').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleOpen = (material: Material) => {
    const publicUrl = getFileUrl(material.storage_path);
    if (!publicUrl) {
      showToast('Could not fetch public download link.', 'error');
      return;
    }
    window.open(publicUrl, '_blank', 'noreferrer,noopener');
  };

  const handleToggleVisibility = async (material: Material) => {
    try {
      const nextVisible = !material.is_visible;
      const { error } = await supabase
        .from('teacher_materials')
        .update({ is_visible: nextVisible })
        .eq('id', material.id);

      if (error) throw error;
      
      showToast(
        nextVisible ? 'Material is now visible to students!' : 'Material is now hidden from students.',
        'success'
      );
      // Local state update for immediate physical update
      setMaterials(prev => prev.map(m => m.id === material.id ? { ...m, is_visible: nextVisible } : m));
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
    }
  };

  const handleDelete = async (material: Material) => {
    if (!window.confirm(`Are you sure you want to delete "${material.title}"?`)) return;
    setDeletingId(material.id);
    try {
      // 1. Delete from storage bucket
      const { error: storageError } = await supabase.storage
        .from('materials')
        .remove([material.storage_path]);

      if (storageError) {
        console.warn('Storage delete warning:', storageError);
      }

      // 2. Delete metadata from Database
      const { error: dbError } = await supabase
        .from('teacher_materials')
        .delete()
        .eq('id', material.id);

      if (dbError) throw dbError;

      showToast('Material deleted successfully.', 'success');
      setMaterials(prev => prev.filter(m => m.id !== material.id));
    } catch (err: any) {
      showToast(err.message || 'Error deleting material', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIconAndBadge = (type: string) => {
    const norm = type.toLowerCase();
    if (norm === 'pdf') {
      return {
        icon: <FileText className="text-red-500" size={20} />,
        bg: 'bg-red-500/10 border-red-500/20 text-red-500',
        label: 'PDF Document',
      };
    }
    if (norm === 'image') {
      return {
        icon: <ImageIcon className="text-blue-500" size={20} />,
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
        label: 'Graphic Image',
      };
    }
    if (norm === 'docx' || norm === 'notes') {
      return {
        icon: <File className="text-emerald-500" size={20} />,
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
        label: 'Notes Document',
      };
    }
    if (norm === 'pptx') {
      return {
        icon: <File className="text-amber-500" size={20} />,
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
        label: 'PPT Presentation',
      };
    }
    return {
      icon: <File className="text-[#FF6B2C]" size={20} />,
      bg: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
      label: 'Attachment',
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-brand-muted">
        <Loader2 className="animate-spin text-brand-accent" size={28} />
        <p className="text-xs font-bold uppercase tracking-wider">Loading Shared Materials...</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-14 bg-brand-surface/40 border border-brand-border/40 rounded-[2rem]">
        <div className="w-16 h-16 bg-brand-bg/50 border border-brand-border/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-muted/70">
          <FolderOpen size={30} />
        </div>
        <h4 className="text-xs font-bold text-brand-text mb-1">No shared materials yet</h4>
        <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Notes, slides, and shared documents will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {materials.map((mat) => {
        const meta = getFileIconAndBadge(mat.file_type);
        const isDeleting = deletingId === mat.id;

        return (
          <motion.div
            key={mat.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between p-4 bg-brand-surface border border-brand-border/40 hover:border-brand-accent/25 rounded-2xl transition-all shadow-sm ${
              !mat.is_visible && isTeacher ? 'opacity-65 bg-brand-bg/25 border-dashed' : ''
            }`}
          >
            {/* Top tiny colored highlight stripe for design consistency */}
            <div className={`absolute top-0 left-0 bottom-0 w-[4px] ${
              mat.file_type === 'pdf' ? 'bg-red-500' : mat.file_type === 'image' ? 'bg-blue-500' : mat.file_type === 'pptx' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />

            <div className="flex items-start gap-3.5 min-w-0 flex-1 pl-1">
              <div className="w-11 h-11 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center shrink-0 shadow-sm">
                {meta.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-sm font-bold text-brand-text leading-tight truncate">
                    {mat.title}
                  </h4>
                  {!mat.is_visible && isTeacher && (
                    <span className="text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                      Hidden
                    </span>
                  )}
                  {mat.subject && (
                    <span className="text-[8px] font-black uppercase tracking-wider bg-brand-accent/15 text-brand-accent border border-brand-accent/15 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                      {mat.subject}
                    </span>
                  )}
                </div>

                {mat.description && (
                  <p className="text-xs text-brand-muted font-medium mt-1 truncate max-w-lg leading-normal">
                    {mat.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] font-bold text-brand-muted uppercase tracking-widest mt-1.5">
                  <span className={`px-1.5 py-0.5 rounded border ${meta.bg}`}>{mat.file_type}</span>
                  <span>•</span>
                  <span>{formatBytes(mat.file_size)}</span>
                  <span>•</span>
                  <span>{new Date(mat.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Actions panel */}
            <div className="flex items-center gap-2 mt-4 md:mt-0 shrink-0 md:pl-4">
              <button
                onClick={() => handleOpen(mat)}
                className="px-4 py-2 bg-brand-surface hover:bg-brand-bg border border-brand-border text-xs font-bold rounded-xl text-brand-text active:scale-95 transition-all shadow-sm flex items-center gap-1.5 leading-none shrink-0"
                title="Open download link"
              >
                <ExternalLink size={12} />
                Open
              </button>

              {isTeacher && (
                <>
                  <button
                    onClick={() => handleToggleVisibility(mat)}
                    className={`p-2 rounded-xl border active:scale-95 transition-all shrink-0 ${
                      mat.is_visible 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                    }`}
                    title={mat.is_visible ? 'Hide from students' : 'Make visible to students'}
                  >
                    {mat.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>

                  <button
                    onClick={() => handleDelete(mat)}
                    disabled={isDeleting}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/15 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="Delete document permanently"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
