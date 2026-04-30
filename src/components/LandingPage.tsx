import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, BookOpen, MessageCircle, BarChart3, GraduationCap } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden relative">
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

        {/* Hero Card */}
        <div className="w-full bg-white border border-white/50 rounded-[3rem] p-8 sm:p-16 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-brand-accent/5 opacity-50" />
          
          <div className="relative z-10 flex flex-col items-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-6xl font-black text-brand-text tracking-tight leading-[1.1]">
                Better Learning <br />
                <span className="text-[#FF6B2C]">Together.</span>
              </h2>
              <p className="text-brand-muted font-medium text-lg max-w-md mx-auto">
                Connecting Teachers, Parents, and Students in one seamless digital classroom.
              </p>
            </div>

            {/* Illustration Mockup with Floating UI */}
            <div className="relative w-full max-w-lg aspect-[4/3] bg-brand-bg/50 rounded-[2.5rem] flex items-center justify-center border border-brand-border/40 overflow-visible group">
              {/* This represents the 3D Illustration space */}
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop" 
                alt="Collaboration" 
                className="w-full h-full object-cover rounded-[2.5rem] opacity-20 grayscale brightness-110"
              />
              
              {/* Floating Labels - Parent */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-4 sm:left-12 px-6 py-3 bg-white shadow-xl rounded-2xl border border-brand-border flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="w-2 h-2 bg-[#FF6B2C] rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-[#FF6B2C]">Parent</span>
              </motion.div>

              {/* Floating Labels - Student */}
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-1/3 right-4 sm:right-12 px-6 py-3 bg-white shadow-xl rounded-2xl border border-brand-border flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-brand-accent">Student</span>
              </motion.div>

              {/* Floating Labels - Teacher */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-1/4 left-1/2 -translate-x-1/2 px-6 py-3 bg-white shadow-xl rounded-2xl border border-brand-border flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Teacher</span>
              </motion.div>

              {/* Decorative Icons */}
              <motion.div animate={{ rotate: [0, 10, 0], y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-10 right-20 text-brand-accent/40"><BookOpen size={32} /></motion.div>
              <motion.div animate={{ rotate: [0, -15, 0], y: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} className="absolute bottom-20 left-20 text-[#FF6B2C]/40"><MessageCircle size={24} /></motion.div>
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-1/2 left-10 text-emerald-500/40"><BarChart3 size={28} /></motion.div>
              
              <div className="absolute inset-0 flex items-center justify-center p-12 text-center pointer-events-none">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-muted/40">Collaborative Learning Environment</p>
              </div>
            </div>

            <button 
              onClick={onGetStarted}
              className="px-10 py-5 bg-[#FF6B2C] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#FF6B2C]/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 slant" />
              <span>Get Started</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.3em]">
          Version 2.0 • Empowering Education
        </p>
      </motion.div>
    </div>
  );
}
