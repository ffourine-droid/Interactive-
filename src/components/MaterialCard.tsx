import React from 'react';
import { PlayCircle, Mic2, FileText, ExternalLink, Download, ChevronRight } from 'lucide-react';
import { Experiment } from '../types';

export const MaterialCard: React.FC<{ exp: Experiment; onClick: (e: any) => void }> = ({ exp, onClick }) => {
  return (
    <div 
      id={`material-card-${exp.id}`}
      onClick={(e) => onClick(e)}
      className={`bg-brand-surface rounded-2xl p-4 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden border group cursor-pointer border-brand-border/40`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
        exp.slides?.length ? 'bg-brand-accent/10 text-brand-accent' : 
        exp.audio_url ? 'bg-indigo-500/10 text-indigo-500' : 
        exp.pdf_url ? 'bg-red-500/10 text-red-500' :
        exp.ppt_url ? 'bg-orange-500/10 text-orange-500' :
        'bg-emerald-500/10 text-emerald-500'
      }`}>
        {exp.slides?.length ? <PlayCircle size={24} /> : 
         exp.audio_url ? <Mic2 size={24} /> : 
         exp.pdf_url ? <FileText size={24} /> :
         exp.ppt_url ? <ExternalLink size={24} /> : 
         <FileText size={24} />}
      </div>
      <div className={`flex-1 min-w-0`}>
        <div className="font-sans text-[15px] font-bold text-brand-text truncate">{exp.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">{exp.subject || 'Study Material'}</span>
          {(exp.pdf_url || exp.ppt_url) && (
            <span className="flex items-center gap-1 text-[9px] font-black bg-brand-accent/10 text-brand-accent px-1.5 py-0.5 rounded-md uppercase">
              <Download size={10} />
              Viewable
            </span>
          )}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted/20 group-hover:text-brand-accent transition-colors">
        <ChevronRight size={20} />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border/40 animate-pulse flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-brand-bg/50" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-brand-bg/50 rounded-lg w-3/4" />
        <div className="h-3 bg-brand-bg/30 rounded-lg w-1/2" />
      </div>
      <div className="w-8 h-8 rounded-full bg-brand-bg/20" />
    </div>
  );
}
