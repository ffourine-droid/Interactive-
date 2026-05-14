import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, FileCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface FileUploadZoneProps {
  onUploadComplete: (url: string | string[]) => void;
  label: string;
  accept?: string;
  currentUrl?: string; // Can be a comma-separated string or a special indicator
  onClear: () => void;
  folder?: string;
  multiple?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ 
  onUploadComplete, 
  label, 
  accept = "*", 
  currentUrl, 
  onClear,
  folder = "materials",
  multiple = false
}) => {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFiles = async (files: FileList) => {
    try {
      setUploading(true);
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('study-materials')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('study-materials')
          .getPublicUrl(filePath);

        return data.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      
      if (multiple) {
        onUploadComplete(urls);
      } else {
        onUploadComplete(urls[0]);
      }
      
      showToast(`${urls.length} file(s) uploaded successfully`, "success");
    } catch (err: any) {
      console.error("Upload error:", err);
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-1">{label}</label>
      
      {!currentUrl ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
            ${dragActive ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border bg-brand-bg hover:border-brand-accent/40'}
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            className="hidden"
          />
          
          {uploading ? (
            <>
              <Loader2 className="animate-spin text-brand-accent" size={20} />
              <span className="text-[10px] font-medium text-brand-muted">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="text-brand-muted" size={20} />
              <span className="text-[10px] font-medium text-brand-muted">Drop file or click to upload</span>
            </>
          )}
        </div>
      ) : (
        <div className="h-24 bg-brand-bg border border-brand-border rounded-2xl p-4 flex items-center justify-between group">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FileCheck size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-brand-text truncate">File Uploaded</p>
              <p className="text-[9px] text-brand-muted truncate max-w-[150px]">{currentUrl.split('/').pop()}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="w-8 h-8 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
