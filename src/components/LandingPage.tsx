import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, BarChart3, GraduationCap, School } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (portal: 'student' | 'teacher' | 'parent' | 'school') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-dvh bg-brand-bg flex flex-col items-center justify-center px-4 py-8 overflow-hidden relative transition-colors duration-500">
      {/* Subtle background blobs — contained, no overflow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6B2C]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center text-center gap-6 relative z-10"
      >
        {/* Logo row */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-[#FF6B2C] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF6B2C]/25 rotate-12">
            <GraduationCap size={22} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-black text-brand-text tracking-tight leading-none">AziLearn</h1>
            <p className="text-[9px] text-brand-muted font-bold uppercase tracking-widest mt-0.5">Study Materials Platform</p>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-brand-text tracking-tight leading-tight">
            Welcome to <span className="text-[#FF6B2C]">AziLearn.</span>
          </h2>
          <p className="text-brand-muted text-sm font-medium">
            Select your portal to continue
          </p>
        </div>

        {/* Portal cards — vertical stack on mobile */}
        <div className="flex flex-col gap-3 w-full">
          <PortalCard
            onClick={() => onNavigate('teacher')}
            icon={<GraduationCap size={22} />}
            iconBg="bg-emerald-500/10 text-emerald-600"
            iconHoverBg="group-active:bg-emerald-500 group-active:text-white"
            label="Teacher"
            sub="Manage classes, grade work, track metrics."
            badge="Enter Portal"
            badgeColor="text-emerald-600 bg-emerald-500/8"
          />
          <PortalCard
            onClick={() => onNavigate('student')}
            icon={<BookOpen size={22} />}
            iconBg="bg-brand-accent/10 text-brand-accent"
            iconHoverBg="group-active:bg-brand-accent group-active:text-white"
            label="Student"
            sub="Access materials, take assessments, view progress."
            badge="Start Learning"
            badgeColor="text-brand-accent bg-brand-accent/8"
          />
          <PortalCard
            onClick={() => onNavigate('parent')}
            icon={<BarChart3 size={22} />}
            iconBg="bg-[#FF6B2C]/10 text-[#FF6B2C]"
            iconHoverBg="group-active:bg-[#FF6B2C] group-active:text-white"
            label="Parent"
            sub="Monitor grades, view remarks, acknowledge tasks."
            badge="Check Progress"
            badgeColor="text-[#FF6B2C] bg-[#FF6B2C]/8"
          />
          <PortalCard
            onClick={() => onNavigate('school')}
            icon={<School size={22} />}
            iconBg="bg-indigo-500/10 text-indigo-600"
            iconHoverBg="group-active:bg-indigo-500 group-active:text-white"
            label="School"
            sub="Publish school-wide holiday assignments and track teachers."
            badge="Admin Portal"
            badgeColor="text-indigo-600 bg-indigo-500/8"
          />
        </div>

        <p className="text-[9px] font-bold text-brand-muted uppercase tracking-[0.25em]">
          Version 2.0 · Empowering Education
        </p>
      </motion.div>
    </div>
  );
}

interface PortalCardProps {
  onClick: () => void;
  icon: React.ReactNode;
  iconBg: string;
  iconHoverBg: string;
  label: string;
  sub: string;
  badge: string;
  badgeColor: string;
}

function PortalCard({ onClick, icon, iconBg, iconHoverBg, label, sub, badge, badgeColor }: PortalCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full bg-brand-surface border border-brand-border rounded-2xl px-4 py-4 flex items-center gap-4 text-left shadow-sm active:scale-[0.98] transition-transform"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${iconBg} ${iconHoverBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-brand-text leading-tight">{label}</h3>
        <p className="text-[11px] text-brand-muted font-medium leading-tight mt-0.5 truncate-2">{sub}</p>
      </div>
      <span className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${badgeColor}`}>
        {badge}
      </span>
    </button>
  );
}
