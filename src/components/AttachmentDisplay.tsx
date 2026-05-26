import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, ExternalLink, Image, FileCode, Check, Copy } from 'lucide-react';
import { attachmentService, PostAttachment } from '../services/attachmentService';

interface AttachmentDisplayProps {
  attachments?: PostAttachment[];
  postId?: string;
  replyId?: string;
  className?: string;
}

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments: initialAttachments,
  postId,
  replyId,
  className = '',
}) => {
  const [list, setList] = useState<PostAttachment[]>(initialAttachments || []);
  const [loading, setLoading] = useState(false);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialAttachments) {
      setList(initialAttachments);
      return;
    }

    const fetchFiles = async () => {
      setLoading(true);
      try {
        if (postId) {
          const files = await attachmentService.getAttachmentsForPost(postId);
          setList(files);
        } else if (replyId) {
          const files = await attachmentService.getAttachmentsForReply(replyId);
          setList(files);
        }
      } catch (e) {
        console.warn('Error loading attachments for display:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [initialAttachments, postId, replyId]);

  if (loading) {
    return (
      <div className="flex gap-2 py-1 items-center animate-pulse">
        <div className="h-4 w-4 rounded bg-brand-border/60"></div>
        <div className="h-3 w-28 rounded bg-brand-border/40"></div>
      </div>
    );
  }

  if (list.length === 0) return null;

  const handleDownload = (file: PostAttachment) => {
    const url = attachmentService.getPublicUrl(file.storage_path, file.previewUrl);
    if (!url) return;
    
    // Open in new tab which either triggers download or displays in native viewer
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getFileIconAndColor = (type: string) => {
    switch (type) {
      case 'image':
        return { icon: <Image size={18} />, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10' };
      case 'pdf':
        return { icon: <FileText size={18} />, color: 'text-red-500 bg-red-500/10 border-red-500/10' };
      case 'pptx':
        return { icon: <FileCode size={18} />, color: 'text-[#FF6B35] bg-[#FF6B35]/10 border-[#FF6B35]/10' };
      default:
        return { icon: <FileText size={18} />, color: 'text-blue-500 bg-blue-500/10 border-blue-500/10' };
    }
  };

  const handleShareLink = (file: PostAttachment, idx: number) => {
    const url = attachmentService.getPublicUrl(file.storage_path, file.previewUrl);
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <div className={`mt-3 space-y-2 select-text ${className}`} id="attachment-display">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((file, idx) => {
          const { icon, color } = getFileIconAndColor(file.file_type);
          const rawUrl = attachmentService.getPublicUrl(file.storage_path, file.previewUrl);

          if (file.file_type === 'image') {
            return (
              <div key={file.id} className="col-span-1 sm:col-span-2 group/img relative rounded-2xl overflow-hidden border border-brand-border/40 bg-brand-surface max-h-[220px]">
                <img
                  src={rawUrl}
                  alt={file.file_name}
                  className="w-full max-h-[218px] object-cover cursor-zoom-in group-hover:scale-[1.01] transition-all duration-300"
                  onClick={() => setActiveZoomImage(rawUrl)}
                  referrerPolicy="no-referrer"
                />
                
                {/* Image Actions bar on Hover */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-brand-surface/90 backdrop-blur-md border border-brand-border p-1 rounded-xl shadow-md">
                  <button
                    onClick={() => handleShareLink(file, idx)}
                    className="w-7 h-7 hover:bg-brand-bg rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors"
                    title="Copy Image URL"
                  >
                    {copiedIndex === idx ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="w-7 h-7 hover:bg-[#FF6B35]/10 rounded-lg flex items-center justify-center text-brand-muted hover:text-[#FF6B35] transition-colors"
                    title="Open Image"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] font-black text-white truncate max-w-full">
                    {file.file_name}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={file.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-brand-surface border border-brand-border/40 hover:border-[#FF6B35]/30 hover:bg-brand-surface/80 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0 flex-grow">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] font-extrabold text-brand-text truncate leading-tight group-hover:text-[#FF6B35] transition-colors">
                    {file.file_name}
                  </h4>
                  <p className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider mt-0.5">
                    {file.file_type} File
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={() => handleShareLink(file, idx)}
                  className="w-8 h-8 rounded-xl bg-brand-bg hover:bg-brand-border/20 border border-brand-border/40 flex items-center justify-center text-brand-muted hover:text-brand-text active:scale-90 transition-transform"
                  title="Copy link"
                >
                  {copiedIndex === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>

                <button
                  onClick={() => handleDownload(file)}
                  className="w-8 h-8 rounded-xl bg-[#FF6B35]/5 hover:bg-[#FF6B35]/15 border border-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35] active:scale-90 transition-transform"
                  title="Download File"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL-IMAGE INTERACTIVE MODAL ZOOM */}
      <AnimatePresence>
        {activeZoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveZoomImage(null)}
            className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activeZoomImage}
                alt="expanded zoom view"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setActiveZoomImage(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-black/50 hover:bg-black/75 rounded-full flex items-center justify-center text-white border border-white/20 active:scale-95 transition-transform"
              >
                &times;
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
