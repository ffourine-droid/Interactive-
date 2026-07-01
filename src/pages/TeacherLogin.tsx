import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowLeft, Loader2, User, School, Lock } from 'lucide-react';
import { supabase, setTeacherConfig } from '../lib/supabase';
import { useToast } from '../components/Toast';

interface TeacherLoginProps {
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToSignup: () => void;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ onBack, onSuccess, onNavigateToSignup }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    schoolName: '',
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
    
    if (!formData.name || !formData.schoolName || !formData.pin) {
      showToast("Please fill all fields", "error");
      return;
    }

    setLoading(true);
    try {
      // 1. Try checking the credentials via our specialized PostgreSQL RPC
      const { data, error: rpcError } = await supabase.rpc('teacher_login', {
        p_name: formData.name.trim(),
        p_school: formData.schoolName.trim(),
        p_pin: formData.pin.trim()
      });

      const isFunctionMissing = rpcError && (
        rpcError.message.includes("could not find the public.teacher_login") ||
        rpcError.code === '42883' ||
        rpcError.code === 'P0001'
      );

      if (rpcError && !isFunctionMissing) {
        console.error("Teacher login RPC error:", rpcError);
        showToast(`Database error: ${rpcError.message}`, "error");
        return;
      }

      if (data) {
        const typedData = data as any;
        if (!typedData.success) {
          showToast(typedData.message || "Incorrect details.", "error");
          return;
        }

        localStorage.setItem('azilearn_teacher', JSON.stringify({
          id: typedData.id,
          name: typedData.name,
          school_name: typedData.school_name
        }));
        await setTeacherConfig(typedData.id);
        showToast(`Welcome back, Teacher ${typedData.name.split(' ')[0]}!`, "success");
        onSuccess();
        return;
      }

      // 2. Elegant fallback if RPC is not deployed in the database yet
      console.warn("teacher_login RPC not found. Falling back to direct select query...");
      const { data: fallbackData, error: selectError } = await supabase
        .from('teachers')
        .select('*')
        .ilike('name', formData.name.trim())
        .ilike('school_name', formData.schoolName.trim());

      if (selectError) {
        console.error("Teacher login select error:", selectError);
        showToast(`Database error: ${selectError.message}`, "error");
        return;
      }

      if (!fallbackData || fallbackData.length === 0) {
        showToast("No teacher account found with this Name and School on AziLearn.", "error");
        return;
      }

      const teacher = fallbackData.find(t => String(t.pin).trim() === formData.pin.trim());
      
      if (!teacher) {
        showToast("Incorrect 4-Digit PIN. Please try again.", "error");
        return;
      }

      localStorage.setItem('azilearn_teacher', JSON.stringify({
        id: teacher.id,
        name: teacher.name,
        school_name: teacher.school_name
      }));
      await setTeacherConfig(teacher.id);
      showToast(`Welcome back, Teacher ${teacher.name.split(' ')[0]}!`, "success");
      onSuccess();
    } catch (err: any) {
      console.error("Teacher login exception:", err);
      showToast(`Login exception: ${err.message || err}`, "error");
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
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm text-brand-text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1">School Name</label>
            <div className="relative">
              <School className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
              <input 
                type="text"
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm text-brand-text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
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
                className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold tracking-[0.2em] text-brand-text"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Continue to Dashboard"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-bold text-brand-muted">
          New teacher?{' '}
          <button 
            onClick={onNavigateToSignup}
            className="text-brand-accent hover:underline"
          >
            Create account
          </button>
        </p>

        {/* Database Diagnostic and Quick Login Helper */}
        {dbError && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-medium">
            <p className="font-bold mb-1">⚠️ Database Connection Issue:</p>
            <p>{dbError}</p>
            <p className="mt-2 text-[10px] text-red-300">
              Please ensure your Supabase parameters are correct and you have run the <span className="font-mono bg-red-950 px-1 py-0.5 rounded">supabase_setup.sql</span> script in your Supabase SQL Editor.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TeacherLogin;
