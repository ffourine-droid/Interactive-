import React from 'react';
import { Award, CheckCircle2, AlertTriangle } from 'lucide-react';

export type GradeLabel = 
  | 'Exceeding Expectation'
  | 'Meeting Expectation'
  | 'Approaching Expectation'
  | 'Below Expectation';

export function getGradeLabel(percentage: number | null | undefined): GradeLabel | null {
  if (percentage === null || percentage === undefined || isNaN(Number(percentage))) {
    return null;
  }
  const pct = Number(percentage);
  if (pct >= 80) return 'Exceeding Expectation';
  if (pct >= 65) return 'Meeting Expectation';
  if (pct >= 50) return 'Approaching Expectation';
  return 'Below Expectation';
}

export function getGradeColors(labelOrPercentage: string | number | null | undefined) {
  let label: string | null = null;
  if (typeof labelOrPercentage === 'number') {
    label = getGradeLabel(labelOrPercentage);
  } else if (typeof labelOrPercentage === 'string' && labelOrPercentage.trim()) {
    label = labelOrPercentage.trim();
  }

  switch (label) {
    case 'Exceeding Expectation':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/30',
        solidBg: 'bg-emerald-600',
        solidText: 'text-white',
        ring: 'ring-emerald-500/20',
        accentBorder: 'border-l-emerald-500',
        pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
      };
    case 'Meeting Expectation':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-500/30',
        solidBg: 'bg-blue-600',
        solidText: 'text-white',
        ring: 'ring-blue-500/20',
        accentBorder: 'border-l-blue-500',
        pill: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
      };
    case 'Approaching Expectation':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-500/30',
        solidBg: 'bg-amber-500',
        solidText: 'text-white',
        ring: 'ring-amber-500/20',
        accentBorder: 'border-l-amber-500',
        pill: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      };
    case 'Below Expectation':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-500/30',
        solidBg: 'bg-rose-600',
        solidText: 'text-white',
        ring: 'ring-rose-500/20',
        accentBorder: 'border-l-rose-500',
        pill: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      };
    default:
      return {
        bg: 'bg-brand-accent/10',
        text: 'text-brand-accent',
        border: 'border-brand-accent/30',
        solidBg: 'bg-brand-accent',
        solidText: 'text-white',
        ring: 'ring-brand-accent/20',
        accentBorder: 'border-l-brand-accent',
        pill: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
      };
  }
}

interface GradeBadgeProps {
  percentage?: number | null;
  gradeLabel?: string | null;
  score?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showPercentageOnly?: boolean;
  className?: string;
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({
  percentage,
  gradeLabel,
  score,
  size = 'sm',
  showPercentageOnly = false,
  className = ''
}) => {
  const effectivePct = (percentage !== null && percentage !== undefined && !isNaN(Number(percentage)))
    ? Math.round(Number(percentage))
    : (score !== null && score !== undefined && !isNaN(Number(score)) ? Math.round(Number(score)) : null);

  const effectiveLabel = gradeLabel || getGradeLabel(effectivePct);
  const colors = getGradeColors(effectiveLabel || effectivePct);

  if (effectivePct === null && !effectiveLabel) {
    return null;
  }

  if (showPercentageOnly && effectivePct !== null) {
    return (
      <span className={`inline-flex items-center gap-1 font-black rounded-lg ${colors.bg} ${colors.text} ${colors.border} border ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' :
        size === 'sm' ? 'px-2 py-0.5 text-xs' :
        size === 'md' ? 'px-2.5 py-1 text-sm' :
        'px-3.5 py-1.5 text-base'
      } ${className}`}>
        <Award size={size === 'xs' ? 10 : size === 'sm' ? 12 : 14} />
        {effectivePct}%
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-bold rounded-lg border shadow-xs ${colors.bg} ${colors.text} ${colors.border} ${
      size === 'xs' ? 'px-2 py-0.5 text-[10px]' :
      size === 'sm' ? 'px-2.5 py-1 text-xs' :
      size === 'md' ? 'px-3 py-1.5 text-sm' :
      'px-4 py-2 text-base'
    } ${className}`}>
      <Award size={size === 'xs' ? 11 : size === 'sm' ? 13 : size === 'md' ? 15 : 18} className="shrink-0" />
      {effectivePct !== null && (
        <span className="font-black font-mono">{effectivePct}%</span>
      )}
      {effectivePct !== null && effectiveLabel && (
        <span className="opacity-60">—</span>
      )}
      {effectiveLabel && (
        <span className="truncate">{effectiveLabel}</span>
      )}
    </div>
  );
};
