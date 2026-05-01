import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, BookOpen, MessageCircle, BarChart3, GraduationCap } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (portal: 'student' | 'teacher' | 'parent') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden relative transition-colors duration-500">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] aspect-square bg-[#FF6B2C]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] aspect-square bg-brand-accent/5 rounded-full blur-3xl" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full flex flex-col items-center text-center space-y-12 relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-[#FF6B2C] rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-[#FF6B2C]/20 transform rotate-12">
            <GraduationCap size={32} />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black text-brand-text tracking-tighter leading-none italic">AziLearn</h1>
            <p className="text-[10px] text-brand-muted font-black uppercase tracking-widest mt-1">Study Materials Platform</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl sm:text-6xl font-black text-brand-text tracking-tight leading-[1.1]">
            Welcome to <br />
            <span className="text-[#FF6B2C]">AziLearn.</span>
          </h2>
          <p className="text-brand-muted font-medium text-lg max-w-md mx-auto">
            Select your portal to continue your learning journey
          </p>
        </div>

        {/* Portal Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {/* Teacher Portal */}
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('teacher')}
            className="group relative bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-xl shadow-brand-text/5 hover:border-emerald-500/30 transition-all flex flex-col items-center text-center space-y-4"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <GraduationCap size={32} />
            </div>
            <h3 className="text-xl font-black text-brand-text">Teacher</h3>
            <p className="text-sm text-brand-muted font-medium">Manage classes, grade work, and track metrics.</p>
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-3 py-1 bg-emerald-500/5 rounded-full">Enter Portal</span>
            </div>
          </motion.button>

          {/* Student Portal */}
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('student')}
            className="group relative bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-xl shadow-brand-text/5 hover:border-brand-accent/30 transition-all flex flex-col items-center text-center space-y-4"
          >
            <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-colors">
              <BookOpen size={32} />
            </div>
            <h3 className="text-xl font-black text-brand-text">Student</h3>
            <p className="text-sm text-brand-muted font-medium">Access materials, take quizzes, and view progress.</p>
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent px-3 py-1 bg-brand-accent/5 rounded-full">Start Learning</span>
            </div>
          </motion.button>

          {/* Parent Portal */}
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('parent')}
            className="group relative bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-xl shadow-brand-text/5 hover:border-[#FF6B2C]/30 transition-all flex flex-col items-center text-center space-y-4"
          >
            <div className="w-16 h-16 bg-[#FF6B2C]/10 rounded-2xl flex items-center justify-center text-[#FF6B2C] group-hover:bg-[#FF6B2C] group-hover:text-white transition-colors">
              <BarChart3 size={32} />
            </div>
            <h3 className="text-xl font-black text-brand-text">Parent</h3>
            <p className="text-sm text-brand-muted font-medium">Monitor grades, view remarks, and acknowledge tasks.</p>
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B2C] px-3 py-1 bg-[#FF6B2C]/5 rounded-full">Check Progress</span>
            </div>
          </motion.button>
        </div>

        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.3em] pt-8">
          Version 2.0 • Empowering Education
        </p>
      </motion.div>
    </div>
  );
}
