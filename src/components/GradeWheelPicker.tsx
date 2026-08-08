import React, { useRef, useState, useEffect, useCallback } from "react";
import { FlaskConical, ArrowLeft, ClipboardList, MessageCircle, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

// Grade data — mirrors AziLearn's Primary / Junior / Senior structure
export interface LevelInfo {
  id: string;
  label: string;
  range: string;
  color: string;
  colorSoft: string;
  grades: number[];
}

export const LEVELS: LevelInfo[] = [
  {
    id: "primary",
    label: "Primary School",
    range: "Gr 1 – 6",
    color: "#10b981", // emerald
    colorSoft: "#d1fae5",
    grades: [1, 2, 3, 4, 5, 6],
  },
  {
    id: "junior",
    label: "Junior Secondary",
    range: "Gr 7 – 9",
    color: "#f97316", // orange
    colorSoft: "#ffedd5",
    grades: [7, 8, 9],
  },
  {
    id: "senior",
    label: "Senior Secondary",
    range: "Gr 10 – 12",
    color: "#a855f7", // purple
    colorSoft: "#f3e8ff",
    grades: [10, 11, 12],
  },
];

export const ALL_GRADES = LEVELS.flatMap((lvl) =>
  lvl.grades.map((g) => ({ grade: g, level: lvl }))
);

const ITEM_HEIGHT = 56; // px per wheel row

function ordinalWord(n: number): string {
  const words = [
    "", "First", "Second", "Third", "Fourth", "Fifth", "Sixth",
    "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth",
  ];
  return words[n] || `${n}th`;
}

interface GradeWheelPickerProps {
  onSelectGrade?: (gradeStr: string) => void;
  onBack?: () => void;
  onExamsClick?: () => void;
  onCommunityClick?: () => void;
  initialGrade?: number;
  studentName?: string;
  onLogout?: () => void;
}

export default function GradeWheelPicker({
  onSelectGrade,
  onBack,
  onExamsClick,
  onCommunityClick,
  initialGrade = 7,
  studentName,
  onLogout
}: GradeWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Find initial index matching initialGrade (default Grade 7 is index 6)
  const defaultIdx = ALL_GRADES.findIndex(item => item.grade === initialGrade);
  const [selectedIndex, setSelectedIndex] = useState(defaultIdx >= 0 ? defaultIdx : 6);
  const [isDragging, setIsDragging] = useState(false);
  const scrollTimeout = useRef<any>(null);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    // center the initial selection on mount
    scrollToIndex(selectedIndex, false);
  }, [scrollToIndex, selectedIndex]);

  const handleScroll = () => {
    setIsDragging(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const raw = el.scrollTop / ITEM_HEIGHT;
      const idx = Math.round(raw);
      const clamped = Math.max(0, Math.min(ALL_GRADES.length - 1, idx));
      setSelectedIndex(clamped);
      scrollToIndex(clamped, true);
      setIsDragging(false);
    }, 90);
  };

  const stepUp = useCallback(() => {
    setSelectedIndex((prev) => {
      const next = Math.max(0, prev - 1);
      scrollToIndex(next, true);
      return next;
    });
  }, [scrollToIndex]);

  const stepDown = useCallback(() => {
    setSelectedIndex((prev) => {
      const next = Math.min(ALL_GRADES.length - 1, prev + 1);
      scrollToIndex(next, true);
      return next;
    });
  }, [scrollToIndex]);

  const current = ALL_GRADES[selectedIndex] || ALL_GRADES[6];

  const handleConfirm = () => {
    if (onSelectGrade) {
      onSelectGrade(`Grade ${current.grade}`);
    }
  };

  return (
    <div
      style={{
        fontFamily:
          "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
      className="w-full max-w-sm mx-auto bg-brand-bg text-brand-text flex flex-col pb-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-2 pb-1">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border shadow-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-brand-text" strokeWidth={2.25} />
        </button>
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-200 text-white shrink-0">
          <FlaskConical className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-brand-text text-base leading-tight tracking-tight">
            AziLearn
          </div>
          <div className="text-[10px] font-bold text-brand-muted tracking-wider">
            STUDY MATERIALS
          </div>
        </div>
        {studentName && (
          <div className="bg-brand-surface border border-brand-border px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 max-w-[110px]">
            <span className="text-[10px] font-bold truncate text-brand-text">{studentName}</span>
          </div>
        )}
      </div>

      {/* Section label */}
      <div className="px-4 pt-2 pb-0.5 flex items-center gap-2">
        <div className="w-1 h-3 rounded-full bg-blue-500" />
        <span className="text-[11px] font-bold text-brand-muted tracking-wide uppercase">
          Select Grade
        </span>
      </div>
      <div className="px-4 pb-2 text-[11px] text-brand-muted/70 flex items-center justify-between">
        <span>Scroll or click ▲ / ▼ to choose grade</span>
      </div>

      {/* Wheel picker */}
      <div className="px-4">
        <div
          className="relative rounded-[32px] bg-brand-surface border border-brand-border shadow-sm overflow-hidden"
          style={{ height: ITEM_HEIGHT * 3 }}
        >
          {/* Mouse Up/Down stepper controls for desktop users */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 items-center">
            <button
              onClick={stepUp}
              disabled={selectedIndex === 0}
              title="Previous Grade (Up)"
              aria-label="Previous Grade"
              className="w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md border border-brand-border/80 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:scale-105 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button
              onClick={stepDown}
              disabled={selectedIndex === ALL_GRADES.length - 1}
              title="Next Grade (Down)"
              aria-label="Next Grade"
              className="w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md border border-brand-border/80 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:scale-105 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* selection window highlight - pill/circular shaped */}
          <div
            className="pointer-events-none absolute left-3 right-3 rounded-full z-10 transition-colors duration-200"
            style={{
              top: ITEM_HEIGHT,
              height: ITEM_HEIGHT,
              backgroundColor: current.level.colorSoft,
              border: `1.5px solid ${current.level.color}55`,
            }}
          />
          {/* top/bottom fade */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 z-20 bg-gradient-to-b from-brand-surface to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 z-20 bg-gradient-to-t from-brand-surface to-transparent" />

          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
            style={{
              scrollSnapType: "y mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* top padding row so first/last items can center */}
            <div style={{ height: ITEM_HEIGHT }} />
            {ALL_GRADES.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const distance = Math.abs(idx - selectedIndex);
              return (
                <button
                  key={item.grade}
                  ref={(r) => { itemRefs.current[idx] = r; }}
                  onClick={() => {
                    setSelectedIndex(idx);
                    scrollToIndex(idx, true);
                  }}
                  className="w-full flex items-center justify-center snap-center relative z-30 cursor-pointer"
                  style={{
                    height: ITEM_HEIGHT,
                    opacity: isSelected ? 1 : Math.max(0.35, 1 - distance * 0.35),
                    transform: `scale(${isSelected ? 1 : Math.max(0.85, 1 - distance * 0.1)})`,
                    transition: isDragging ? "none" : "opacity 0.2s, transform 0.2s",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold tabular-nums transition-all text-sm ${
                        isSelected ? "text-white shadow-sm" : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                      }`}
                      style={{
                        backgroundColor: isSelected ? item.level.color : undefined,
                      }}
                    >
                      {item.grade}
                    </span>
                    <span
                      className="font-extrabold tracking-wide"
                      style={{
                        fontSize: isSelected ? 13 : 11,
                        color: isSelected ? item.level.color : "#94a3b8",
                      }}
                    >
                      GRADE {item.grade}
                    </span>
                  </div>
                </button>
              );
            })}
            <div style={{ height: ITEM_HEIGHT }} />
          </div>
        </div>

        {/* level chip row under wheel */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all duration-200 cursor-pointer"
              onClick={() => {
                const targetIdx = ALL_GRADES.findIndex(g => g.level.id === lvl.id);
                if (targetIdx >= 0) {
                  setSelectedIndex(targetIdx);
                  scrollToIndex(targetIdx, true);
                }
              }}
              style={{
                backgroundColor: current.level.id === lvl.id ? lvl.color : "rgba(241, 245, 249, 0.8)",
                color: current.level.id === lvl.id ? "white" : "#94a3b8",
              }}
            >
              {lvl.label.split(" ")[0]}
              <span className="opacity-75 font-semibold">{lvl.range}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Confirm card - rounded pill shape */}
      <div className="px-4 mt-3">
        <button
          onClick={handleConfirm}
          className="w-full text-left rounded-full px-4 py-3 flex items-center justify-between shadow-md active:scale-[0.98] transition-all cursor-pointer"
          style={{ backgroundColor: current.level.color }}
        >
          <div className="pl-1">
            <div className="text-white/80 text-[10px] font-semibold tracking-wide">
              {ordinalWord(current.grade)} year selected
            </div>
            <div className="text-white text-base font-extrabold mt-0.5">
              Grade {current.grade} · {current.level.label}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
        </button>
      </div>

      {/* Quick access */}
      <div className="px-4 mt-3 flex items-center gap-2">
        <div className="w-1 h-3 rounded-full bg-blue-500" />
        <span className="text-[11px] font-bold text-brand-muted tracking-wide uppercase">
          Quick Access
        </span>
      </div>
      <div className="px-4 mt-2 space-y-2">
        <div 
          onClick={onExamsClick}
          className="bg-brand-surface rounded-full px-3.5 py-2.5 flex items-center gap-3 shadow-sm border border-brand-border cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-amber-500" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-brand-text text-[13px]">KCSE Revision</div>
            <div className="text-brand-muted text-[11px] truncate">National Assessment · Secondary</div>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-brand-muted" />
          </div>
        </div>

        <div 
          onClick={onCommunityClick}
          className="bg-brand-surface rounded-full px-3.5 py-2.5 flex items-center gap-3 shadow-sm border border-brand-border cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-blue-500" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-brand-text text-[13px]">School Forum</div>
            <div className="text-brand-muted text-[11px] truncate">Connect &amp; discuss with classmates</div>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-brand-muted" />
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
