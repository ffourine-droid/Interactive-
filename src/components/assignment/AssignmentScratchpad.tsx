import React, { useState, useRef, useEffect } from 'react';
import { 
  PenTool, 
  Type, 
  Trash2, 
  X, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  Check
} from 'lucide-react';

interface AssignmentScratchpadProps {
  assignmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignmentScratchpad: React.FC<AssignmentScratchpadProps> = ({
  assignmentId,
  isOpen,
  onClose
}) => {
  const [tab, setTab] = useState<'sketch' | 'text'>('sketch');
  const [scratchText, setScratchText] = useState(() => {
    return localStorage.getItem(`scratch_text_${assignmentId}`) || '';
  });
  const [color, setColor] = useState('#2563EB');
  const [lineWidth, setLineWidth] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Auto-save text
  useEffect(() => {
    localStorage.setItem(`scratch_text_${assignmentId}`, scratchText);
  }, [scratchText, assignmentId]);

  // Handle canvas drawing
  useEffect(() => {
    if (!isOpen || tab !== 'sketch') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      // Save content before resize
      const data = canvas.toDataURL();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      const img = new Image();
      img.src = data;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }
  }, [isOpen, tab, isMaximized]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className={`w-full bg-brand-surface border border-brand-border rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized ? 'h-[94vh] max-w-4xl' : 'h-[500px] max-w-lg'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-bg/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-brand-text">Scratchpad / Rough Work</span>
            <span className="text-[10px] font-bold text-brand-muted bg-brand-border/40 px-2 py-0.5 rounded-full">
              Private
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode tabs */}
            <div className="flex bg-brand-surface rounded-xl p-0.5 border border-brand-border mr-1">
              <button
                type="button"
                onClick={() => setTab('sketch')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  tab === 'sketch' 
                    ? 'bg-brand-accent text-white shadow-xs' 
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                <PenTool size={12} />
                <span>Draw</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('text')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  tab === 'text' 
                    ? 'bg-brand-accent text-white shadow-xs' 
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                <Type size={12} />
                <span>Notes</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors hidden sm:block"
              title={isMaximized ? "Restore size" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-brand-bg/40 flex flex-col">
          {tab === 'sketch' ? (
            <div className="flex-1 relative flex flex-col">
              {/* Drawing Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border/60 bg-brand-surface/80 text-xs">
                <div className="flex items-center gap-2">
                  {/* Colors */}
                  {['#0F172A', '#2563EB', '#DC2626', '#059669', '#D97706'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-brand-accent ring-offset-1' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}

                  <div className="h-4 w-px bg-brand-border mx-1" />

                  {/* Line widths */}
                  {[2, 4, 6].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setLineWidth(w)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        lineWidth === w ? 'bg-brand-accent/20 text-brand-accent' : 'text-brand-muted'
                      }`}
                    >
                      {w === 2 ? 'Fine' : w === 4 ? 'Med' : 'Thick'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 p-1 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              </div>

              {/* Canvas element */}
              <canvas
                ref={canvasRef}
                className="flex-1 w-full h-full cursor-crosshair touch-none bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          ) : (
            <div className="flex-1 p-4 flex flex-col">
              <textarea
                value={scratchText}
                onChange={(e) => setScratchText(e.target.value)}
                placeholder="Jot down rough notes, formulas, or working steps here... Your notes auto-save."
                className="flex-1 w-full p-4 bg-brand-surface border border-brand-border rounded-2xl font-mono text-xs sm:text-sm text-brand-text outline-none focus:border-brand-accent resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-brand-muted pt-2 px-1">
                <span>Scratchpad is not graded or submitted.</span>
                <button
                  type="button"
                  onClick={() => setScratchText('')}
                  className="text-rose-500 hover:underline font-bold"
                >
                  Clear Notes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-brand-border bg-brand-surface flex items-center justify-between text-xs">
          <span className="text-brand-muted text-[11px]">
            Use this space for calculations or rough drafts.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-brand-accent text-white font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
