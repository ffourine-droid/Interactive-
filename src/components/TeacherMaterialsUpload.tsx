import React, { useRef, useState } from 'react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from './Toast';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, AlignLeft, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ACCEPTED_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 
  'ppt', 'pptx', 'doc', 'docx', 
  'xls', 'xlsx', 'csv', 'txt', 
  'mp4', 'mov', 'webm', 'avi', 
  'mp3', 'wav', 'm4a', 'ogg'
];

const getFileTypeByExtension = (fileName: string): 'pdf' | 'image' | 'docx' | 'pptx' | 'xlsx' | 'txt' | 'video' | 'audio' | null => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image';
  if (['doc', 'docx'].includes(ext || '')) return 'docx';
  if (['ppt', 'pptx'].includes(ext || '')) return 'pptx';
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'xlsx';
  if (ext === 'txt') return 'txt';
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext || '')) return 'audio';
  return null;
};

interface TeacherMaterialsUploadProps {
  teacherId: string;
  classId?: string | null;
  grade?: string | null;
  subject?: string | null;
  onUploaded?: () => void;
}

export const TeacherMaterialsUpload: React.FC<TeacherMaterialsUploadProps> = ({
  teacherId,
  classId,
  grade,
  subject: initialSubject,
  onUploaded,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(initialSubject || '');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    setError('');
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError('Only Notes (.docx, .txt), PDF, PowerPoint (.ppt, .pptx), and Images (.png, .jpg, .jpeg, .gif) are allowed.');
      showToast('Unsupported file type', 'error');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be under 10MB.');
      showToast('File too large', 'error');
      return;
    }

    setFile(selectedFile);
    // Auto-fill title with capitalized file name stripped of extension
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    setTitle(baseName.split(/[_\-\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setFile(null);
    setTitle('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Please select a file and enter a title.');
      return;
    }

    setLoading(true);
    setError('');

    const fileType = getFileTypeByExtension(file.name);
    if (!fileType) {
      setError('Could not identify file format.');
      setLoading(false);
      return;
    }

    try {
      // 1. Upload file to Supabase Storage inside 'materials' bucket
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const storagePath = `teacher-materials/${teacherId}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(storagePath, file, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (uploadError) throw uploadError;

      // 2. Save material metadata record via SECURITY DEFINER RPC
      // (direct table insert fails RLS — current_teacher_id() is unreliable
      // on PgBouncer pooled connections, so route through the RPC instead)
      const { error: dbError } = await supabase.rpc('teacher_upload_material', {
        p_teacher_id: teacherId,
        p_title: title.trim(),
        p_subject: subject.trim() || initialSubject || 'General',
        p_grade: grade || null,
        p_class_id: classId || null,
        p_description: description.trim() || null,
        p_file_name: file.name,
        p_file_type: fileType,
        p_storage_path: storagePath,
        p_file_size: file.size,
        p_material_category: fileType,
        p_is_visible: true
      });

      if (dbError) throw dbError;

      showToast('Material uploaded successfully!', 'success');
      
      // Reset state
      setFile(null);
      setTitle('');
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUploaded) onUploaded();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Upload failed. Please try again.');
      showToast('Upload failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="w-9 h-9 bg-[#FF6B2C]/10 rounded-xl flex items-center justify-center text-[#FF6B2C]">
          <UploadCloud size={18} />
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-brand-text">Upload Materials</h3>
          <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Share study sheets, notes, or files</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Drag & Drop Zone */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-[#FF6B2C] bg-[#FF6B2C]/5 scale-[0.99]' 
                : 'border-brand-border/60 hover:border-brand-accent/40 bg-brand-bg/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.mp4,.mov,.webm,.avi,.mp3,.wav,.m4a,.ogg"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadCloud size={32} className="mx-auto text-brand-muted mb-2.5 transition-colors group-hover:text-brand-accent" />
            <h4 className="text-xs font-bold text-brand-text">Drag & drop your file here, or <span className="text-[#FF6B2C]">browse</span></h4>
            <p className="text-[9px] text-brand-muted font-bold mt-1 uppercase tracking-wider">PDF, Docs, Presentations, Sheets, Images, Videos, Audio, or Notes</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3.5 bg-brand-bg/50 border border-brand-border/60 rounded-xl"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[#FF6B2C]/10 rounded-xl flex items-center justify-center text-[#FF6B2C] shrink-0 font-bold text-xs uppercase">
                {file.name.split('.').pop() || 'file'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-brand-text truncate leading-tight">{file.name}</p>
                <p className="text-[9px] text-brand-muted font-bold tracking-wider uppercase mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeSelectedFile}
              className="p-1.5 hover:bg-brand-surface border border-transparent hover:border-brand-border rounded-lg text-brand-muted hover:text-red-500 transition-colors shrink-0"
              title="Remove file"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}

        {/* Title & Extra Inputs */}
        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4.5 overflow-hidden"
            >
              {/* Document Title input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-brand-muted tracking-wider pl-1">Document Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a friendly title"
                  className="w-full text-xs font-bold bg-brand-bg/50 border border-brand-border/50 focus:border-brand-accent/40 rounded-xl px-3.5 py-2.5 outline-none text-brand-text transition-colors"
                />
              </div>

              {/* Subject Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-brand-muted tracking-wider pl-1">Subject / Field</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Mathematics, Science"
                    className="w-full text-xs font-bold bg-brand-bg/50 border border-brand-border/50 focus:border-brand-accent/40 rounded-xl px-3.5 py-2.5 outline-none text-brand-text transition-colors"
                  />
                </div>
                {/* Visual indicator of designated filters */}
                <div className="bg-[#FF6B2C]/5 border border-[#FF6B2C]/10 rounded-xl p-2.5 flex items-start gap-2 h-full">
                  <Info size={12} className="text-[#FF6B2C] shrink-0 mt-0.5" />
                  <div className="text-[9px] font-bold text-brand-muted leading-tight">
                    <span className="text-brand-text">Class Filtering:</span> This will be shared with classes assigned to <span className="text-brand-accent">{grade || 'this grade'}</span> automatically.
                  </div>
                </div>
              </div>

              {/* Description textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-brand-muted tracking-wider pl-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what's inside this learning material..."
                  rows={2}
                  className="w-full text-xs font-medium bg-brand-bg/50 border border-brand-border/50 focus:border-brand-accent/40 rounded-xl px-3.5 py-2.5 outline-none text-brand-text transition-colors resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/10 text-red-500 rounded-xl text-[11px] font-bold leading-tight">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {file && (
          <button
            onClick={handleUpload}
            disabled={loading || !title.trim()}
            className="w-full py-3 rounded-2xl bg-[#FF6B2C] text-white font-black text-xs uppercase tracking-widest hover:bg-[#FF6B2C]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2C]/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {loading ? (
              <>Uploading document...</>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Publish Material
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
