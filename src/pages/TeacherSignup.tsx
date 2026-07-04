import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowLeft, Loader2, User, School, Lock } from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from '../components/Toast';
import LinkSchoolField from '../components/LinkSchoolField';

interface TeacherSignupProps {
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

const TeacherSignup: React.FC<TeacherSignupProps> = ({ onBack, onSuccess, onNavigateToLogin }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    schoolName: '',
    schoolId: '',
    pin: '',
    confirmPin: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.schoolName || !formData.pin || !formData.confirmPin) {
      showToast("Please fill all fields", "error");
      return;
    }

    if (formData.pin.length !== 4) {
      showToast("PIN must be 4 digits", "error");
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      showToast("PINs do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('teacher_register', {
        p_name: formData.name.trim(),
        p_pin: formData.pin,
        p_school_name: formData.schoolName.trim(),
        p_email: null
      });

      if (error) throw error;

      if (!data || !data.success) {
        throw new Error(data?.message || "Signup failed");
      }

      localStorage.setItem('azilearn_teacher', JSON.stringify({
        id: data.id,
        name: data.name,
        school_name: data.school_name,
        school_id: data.school_id
      }));
      await setTeacherConfig(data.id);
      showToast("Welcome to AziLearn!", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message || "Signup failed", "error");
    } finally {
      setLoading(false);
    }
  };

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
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Teacher Signup</h1>
            <p className="text-brand-muted text-xs font-bold uppercase tracking-widest">Join our community</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
              <input 
                type="text"
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-brand-text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <LinkSchoolField
              currentSchoolName={formData.schoolName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, schoolName: text }))}
              onLinked={(school) => setFormData(prev => ({ ...prev, schoolId: school.id, schoolName: school.name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1">4-Digit PIN</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                <input 
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold tracking-[0.2em] text-brand-text"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1">Confirm PIN</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                <input 
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold tracking-[0.2em] text-brand-text"
                  value={formData.confirmPin}
                  onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Join AziLearn"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-bold text-brand-muted">
          Already have an account?{' '}
          <button 
            onClick={onNavigateToLogin}
            className="text-brand-accent hover:underline"
          >
            Login
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default TeacherSignup;
