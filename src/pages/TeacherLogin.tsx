import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowLeft, Loader2, User, Lock } from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from '../components/Toast';

interface TeacherLoginProps {
  onBack: () => void;
  onSuccess: () => void;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ onBack, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    pin: ''
  });
  const [dbError, setDbError] = useState<string | null>(null);

  React.useEffect(() => {
    const testDbConnection = async () => {
      try {
        const { error } = await supabase
          .from('teachers')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error("Supabase connection issue:", error);
          setDbError(error.message);
        }
      } catch (err: any) {
        console.error("Supabase connection issue:", err);
        setDbError(err.message || String(err));
      }
    };
    testDbConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.pin.trim()) {
      showToast("Please enter your name and 4-digit PIN", "error");
      return;
    }

    if (formData.pin.length !== 4) {
      showToast("PIN must be 4 digits", "error");
      return;
    }

    setLoading(true);
    try {
      // Calls teacher_login(p_name, p_pin). If no personal PIN is set, backend checks school shared PIN
      const { data, error } = await supabase.rpc('teacher_login', {
        p_name: formData.name.trim(),
        p_pin: formData.pin.trim()
      });

      if (error) {
        throw error;
      }

      if (!data || !data.success) {
        showToast(data?.message || "Incorrect name or PIN. Check spelling or ask your school admin.", "error");
        return;
      }

      localStorage.setItem('azilearn_teacher', JSON.stringify({
        id: data.id,
        name: data.name,
        school_name: data.school_name,
        school_id: data.school_id,
        using_shared_pin: Boolean(data.using_shared_pin)
      }));

      await setTeacherConfig(data.id);
      showToast(`Welcome back, Teacher ${data.name.split(' ')[0]}!`, "success");
      onSuccess();
    } catch (err: any) {
      console.error("Teacher login exception:", err);
      showToast(err.message || "Failed to log in", "error");
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
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Teacher Login</h1>
            <p className="text-brand-muted text-xs font-bold uppercase tracking-widest">Access your portal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
              <input 
                type="text"
                placeholder="e.g. Mrs. Jane Smith"
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm text-brand-text placeholder-brand-muted/40"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold tracking-[0.3em] text-brand-text placeholder-brand-muted/40"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
            <p className="text-[10px] text-brand-muted font-medium ml-1">
              Use your personal PIN or your school's common teacher PIN.
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Continue to Dashboard"}
          </button>
        </form>

        {/* Database Diagnostic and Quick Login Helper */}
        {dbError && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-medium">
            <p className="font-bold mb-1">⚠️ Database Connection Issue:</p>
            <p>{dbError}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TeacherLogin;
