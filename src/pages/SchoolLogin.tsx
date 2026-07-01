import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowLeft, Loader2, School, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

interface SchoolLoginProps {
  onBack: () => void;
  onSuccess: (schoolName: string) => void;
  onNavigateToTeacher: () => void;
  onNavigateToStudent: () => void;
}

export const SchoolLogin: React.FC<SchoolLoginProps> = ({
  onBack,
  onSuccess,
  onNavigateToTeacher,
  onNavigateToStudent
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    pin: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.schoolName || !formData.pin) {
      showToast("Please fill all fields", "error");
      return;
    }

    if (formData.pin.length !== 4) {
      showToast("PIN must be 4 digits", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('school_login', {
        p_name: formData.schoolName.trim(),
        p_pin: formData.pin.trim()
      });

      if (error) {
        showToast(`Database error: ${error.message}`, "error");
        setLoading(false);
        return;
      }

      if (data && data.success) {
        // Successfully logged in as school!
        localStorage.setItem('azilearn_school', JSON.stringify({
          school_id: data.id,
          school_name: data.name,
          pin: formData.pin.trim()
        }));
        showToast(`Welcome back to ${data.name}!`, "success");
        onSuccess(data.name);
      } else {
        showToast(data?.message || "Incorrect School Name or PIN. Please try again.", "error");
      }
    } catch (err: any) {
      console.error("School login error:", err);
      showToast(`Login exception: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.schoolName.trim().length > 0 && formData.pin.length === 4;

  return (
    <div className="min-h-screen bg-brand-bg p-4 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm"
      >
        <button 
          onClick={onBack}
          className="mb-8 p-3 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-brand-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent">
            <School size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">School Sign In</h1>
            <p className="text-brand-muted text-xs font-bold uppercase tracking-widest">Access school broadcasts</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1">School Name</label>
            <div className="relative">
              <School className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
              <input 
                type="text"
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm text-brand-text"
                placeholder="e.g. Abc Academy"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1">4-Digit PIN</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
              <input 
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold tracking-[0.2em] text-brand-text"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
          </button>
        </form>

        <div className="mt-8 border-t border-brand-border/40 pt-6 space-y-3">
          <button 
            onClick={onNavigateToTeacher}
            className="w-full flex items-center justify-between text-xs font-bold text-brand-muted hover:text-brand-accent transition-colors p-2 rounded-lg hover:bg-brand-bg/50"
          >
            <span>Are you a teacher?</span>
            <ArrowRight size={14} />
          </button>
          <button 
            onClick={onNavigateToStudent}
            className="w-full flex items-center justify-between text-xs font-bold text-brand-muted hover:text-brand-accent transition-colors p-2 rounded-lg hover:bg-brand-bg/50"
          >
            <span>Are you a student?</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
