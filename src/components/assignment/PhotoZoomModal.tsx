import React from 'react';
import { X, ZoomIn, Download, ExternalLink } from 'lucide-react';

interface PhotoZoomModalProps {
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export const PhotoZoomModal: React.FC<PhotoZoomModalProps> = ({
  imageUrl,
  onClose,
  title = 'Work Photo Preview'
}) => {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-3xl w-full bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-bg/80">
          <div className="flex items-center gap-2">
            <ZoomIn size={16} className="text-brand-accent" />
            <span className="font-bold text-sm text-brand-text">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-accent hover:bg-brand-surface transition-colors"
              title="Open full size in new tab"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/10 min-h-[300px]">
          <img
            src={imageUrl}
            alt="Work submission"
            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-brand-border bg-brand-surface text-center">
          <p className="text-[11px] text-brand-muted">
            Check that all handwriting, formulas, and diagrams are clearly readable.
          </p>
        </div>
      </div>
    </div>
  );
};
