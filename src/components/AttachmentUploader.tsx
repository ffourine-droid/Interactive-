import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, X, FileText, Image, FileCode, AlertCircle } from 'lucide-react';

interface AttachmentUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  files,
  onFilesChange,
  maxFiles = 3,
  maxSizeMB = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setError(null);

    const validFiles: File[] = [...files];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];

      // Check count
      if (validFiles.length >= maxFiles) {
        setError(`You can only upload up to ${maxFiles} files.`);
        break;
      }

      // Check size
      if (file.size > maxSizeBytes) {
        setError(`"${file.name}" is larger than ${maxSizeMB}MB.`);
        continue;
      }

      // Check file extensions allowed
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'pptx', 'ppt', 'docx', 'doc'];
      if (!ext || !allowed.includes(ext)) {
        setError(`"${file.name}" has an unsupported format. Allowed: JPG, PNG, GIF, PDF, PPTX, DOCX.`);
        continue;
      }

      validFiles.push(file);
    }

    onFilesChange(validFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updated = files.filter((_, idx) => idx !== indexToRemove);
    onFilesChange(updated);
    setError(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      return <Image size={16} className="text-emerald-500" />;
    }
    if (ext === 'pdf') {
      return <FileText size={16} className="text-red-500" />;
    }
    if (ext === 'pptx' || ext === 'ppt') {
      return <FileCode size={16} className="text-orange-500" />;
    }
    return <FileText size={16} className="text-blue-500" />; // docx/doc defaults
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-3" id="attachment-uploader">
      {/* DRAG AND DROP AREA */}
      {files.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`relative w-full border border-dashed rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#FF6B35] bg-[#FF6B35]/5 scale-[0.99]'
              : 'border-brand-border hover:border-[#FF6B35]/50 bg-brand-surface/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.pptx,.ppt,.docx,.doc"
            onChange={handleChange}
          />
          <div className="flex items-center gap-2 text-brand-muted text-[11px] font-bold">
            <Paperclip size={14} className="text-[#FF6B35]" />
            <span>Attach file (e.g. PDF, slides, homework images, Max 10MB)</span>
          </div>
        </div>
      )}

      {/* ERROR DISPLAY */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider"
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREVIEW LIST */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 gap-2"
          >
            {files.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              const localPreviewUrl = isImage ? URL.createObjectURL(file) : '';

              return (
                <motion.div
                  key={`${file.name}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between p-2 rounded-xl bg-brand-surface border border-brand-border/40 hover:border-brand-border transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3 w-[80%]">
                    {isImage ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-brand-border/40 shrink-0 bg-brand-bg flex items-center justify-center">
                        <img
                          src={localPreviewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-brand-bg border border-brand-border/40 flex items-center justify-center shrink-0">
                        {getFileIcon(file.name)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-brand-text truncate leading-tight">
                        {file.name}
                      </p>
                      <p className="text-[9px] font-semibold text-brand-muted mt-0.5">
                        {formatSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="w-7 h-7 bg-brand-bg hover:bg-red-500/10 border border-brand-border hover:border-red-500/20 rounded-lg flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors active:scale-90"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
