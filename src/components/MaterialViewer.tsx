import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2, Maximize2, ExternalLink, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface MaterialViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileType: string;
  fileUrl: string;
  fileName: string;
}

export const MaterialViewer: React.FC<MaterialViewerProps> = ({
  isOpen,
  onClose,
  title,
  fileType,
  fileUrl,
  fileName,
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [txtContent, setTxtContent] = useState<string | null>(null);
  const [txtLoading, setTxtLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIframeLoading(true);
    setTxtContent(null);

    // If file type is txt, attempt to fetch the text content for an even better inline experience!
    if (fileType === 'txt' || fileName.endsWith('.txt')) {
      setTxtLoading(true);
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch text content');
          return res.text();
        })
        .then((text) => {
          setTxtContent(text);
        })
        .catch((err) => {
          console.error(err);
          setTxtContent(null);
        })
        .finally(() => {
          setTxtLoading(false);
        });
    }
  }, [isOpen, fileUrl, fileType, fileName]);

  if (!isOpen) return null;

  const isIframeType = ['pdf', 'pptx', 'docx', 'xlsx'].includes(fileType);
  
  // Microsoft Office Embed URL for pptx, docx, xlsx
  const getEmbedUrl = () => {
    if (fileType === 'pdf') return fileUrl;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  };

  return (
    <div id="material-viewer-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-bg/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-5xl h-[85vh] md:h-[90vh] bg-brand-surface border border-brand-border/80 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/40 shrink-0 bg-brand-surface">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-brand-accent/15 text-brand-accent border border-brand-accent/20">
                {fileType}
              </span>
              <span className="text-[10px] font-bold text-brand-muted truncate max-w-[200px]" title={fileName}>
                {fileName}
              </span>
            </div>
            <h3 className="text-sm md:text-base font-display font-black text-brand-text truncate mt-0.5">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Download Button */}
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-brand-bg hover:bg-brand-border/40 border border-brand-border/60 text-brand-text rounded-xl transition-all active:scale-95 shadow-sm"
              title="Download original file"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-brand-bg hover:bg-brand-border/50 text-brand-text rounded-xl border border-brand-border/40 transition-colors active:scale-95"
              title="Close viewer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 min-h-0 bg-brand-bg/30 relative flex items-center justify-center p-4">
          
          {/* Loader for Iframes */}
          {isIframeType && iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-surface/90 z-20 gap-3">
              <Loader2 className="animate-spin text-brand-accent" size={32} />
              <p className="text-xs font-bold text-brand-text animate-pulse">Preparing document view...</p>
              <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider max-w-[280px] text-center leading-relaxed">
                Using secure cloud rendering helper to open {fileType.toUpperCase()} file
              </p>
            </div>
          )}

          {/* PDF & Office Web Viewer (pptx, docx, xlsx) */}
          {isIframeType && (
            <iframe
              src={getEmbedUrl()}
              className="w-full h-full rounded-xl bg-white shadow-inner"
              frameBorder="0"
              onLoad={() => setIframeLoading(false)}
              allowFullScreen
              title={title}
            />
          )}

          {/* Image Files */}
          {fileType === 'image' && (
            <div className="max-w-full max-h-full overflow-auto flex items-center justify-center">
              <img
                src={fileUrl}
                alt={title}
                className="max-w-full max-h-[75vh] md:max-h-[80vh] rounded-xl object-contain shadow-md border border-brand-border/30 bg-checkered"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Video Files */}
          {fileType === 'video' && (
            <div className="w-full max-w-4xl rounded-xl overflow-hidden border border-brand-border/30 shadow-md bg-black flex items-center justify-center">
              <video
                src={fileUrl}
                controls
                autoPlay
                className="w-full max-h-[70vh]"
              />
            </div>
          )}

          {/* Audio Files */}
          {fileType === 'audio' && (
            <div className="w-full max-w-md p-8 bg-brand-surface border border-brand-border/50 rounded-3xl shadow-lg flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 animate-pulse">
                <FileText size={30} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-text mb-1">Audio Track Player</h4>
                <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">{fileName}</p>
              </div>
              <audio
                src={fileUrl}
                controls
                autoPlay
                className="w-full mt-2"
              />
            </div>
          )}

          {/* TXT Files */}
          {(fileType === 'txt' || fileName.endsWith('.txt')) && (
            <div className="w-full h-full max-w-4xl bg-brand-surface border border-brand-border/40 rounded-2xl p-5 flex flex-col shadow-inner">
              <div className="flex items-center justify-between border-b border-brand-border/20 pb-2.5 mb-3">
                <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Text Document Preview</span>
                <span className="text-[10px] text-brand-accent font-mono">UTF-8 Plain Text</span>
              </div>
              {txtLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-brand-accent" size={24} />
                  <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Loading Text...</span>
                </div>
              ) : txtContent !== null ? (
                <pre className="flex-1 overflow-auto text-xs font-mono p-4 bg-brand-bg rounded-xl border border-brand-border/30 text-brand-text whitespace-pre-wrap leading-relaxed select-text">
                  {txtContent}
                </pre>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
                  <FileText className="text-brand-muted" size={40} />
                  <div>
                    <h5 className="text-xs font-bold text-brand-text">Unable to preview raw text</h5>
                    <p className="text-[10px] text-brand-muted mt-1">Please download the text file to read it on your device.</p>
                  </div>
                  <a
                    href={fileUrl}
                    download={fileName}
                    className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    Download File
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Other / Fallback Option */}
          {!['pdf', 'pptx', 'docx', 'xlsx', 'image', 'video', 'audio', 'txt'].includes(fileType) && !fileName.endsWith('.txt') && (
            <div className="w-full max-w-md p-8 bg-brand-surface border border-brand-border/50 rounded-3xl shadow-lg flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#FF6B2C]/10 border border-[#FF6B2C]/20 flex items-center justify-center text-[#FF6B2C]">
                <HelpCircle size={30} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-text mb-1">No Inline Preview Available</h4>
                <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider leading-relaxed">
                  This file type ({fileType.toUpperCase()}) cannot be opened inline natively.
                </p>
              </div>
              <a
                href={fileUrl}
                download={fileName}
                className="w-full py-3 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Download to device
              </a>
            </div>
          )}
          
        </div>
      </motion.div>
    </div>
  );
};
