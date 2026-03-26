import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Smartphone, ArrowRight, Loader2, FlaskConical, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from './Toast';
import { checkAccess, AccessResult } from '../utils/checkAccess';

interface AuthProps {
  onSuccess: (profile: any, access?: AccessResult) => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [view, setView] = useState<'selection' | 'login' | 'signup'>('selection');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedPhone = phone.trim();
    const trimmedUsername = username.trim();

    try {
      if (view === 'login') {
        // Login: Fetch existing profile and access status in parallel for speed
        const [profileRes, accessRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('phone_number', trimmedPhone)
            .maybeSingle(),
          checkAccess(trimmedPhone)
        ]);

        const { data, error: fetchError } = profileRes;
        if (fetchError) throw fetchError;
        if (!data) {
          throw new Error('Account not found. Please sign up first.');
        }

        // Sync to session storage (fast)
        sessionStorage.setItem('azilearn_phone', data.phone_number);
        sessionStorage.setItem('azilearn_username', data.username);
        
        // Call onSuccess immediately to trigger transition
        onSuccess(data, accessRes);
        showToast(`Welcome back, ${data.username}!`, "success");
      } else {
        // Sign Up / Update: Create or update profile in Supabase
        if (!trimmedUsername) throw new Error('Username is required');
        
        // Parallelize upsert and access check
        const [upsertRes, accessRes] = await Promise.all([
          supabase
            .from('profiles')
            .upsert(
              { 
                phone_number: trimmedPhone, 
                username: trimmedUsername,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'phone_number' }
            )
            .select()
            .single(),
          checkAccess(trimmedPhone)
        ]);

        const { data, error: upsertError } = upsertRes;
        if (upsertError) throw upsertError;

        // Sync to session storage
        sessionStorage.setItem('azilearn_phone', data.phone_number);
        sessionStorage.setItem('azilearn_username', data.username);
        
        onSuccess(data, accessRes);
        showToast("Account ready!", "success");
      }
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (view === 'selection') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-brand-accent rounded-[2rem] flex items-center justify-center shadow-xl shadow-brand-accent/20 mx-auto mb-6"
            >
              <FlaskConical className="text-white" size={40} />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tighter text-brand-text">AZILEARN</h1>
            <p className="text-brand-muted font-bold text-sm">Pick an option to start learning!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setView('signup')}
              className="bg-brand-surface border-4 border-brand-accent/20 hover:border-brand-accent p-8 rounded-[3rem] text-center space-y-4 transition-all shadow-xl group"
            >
              <div className="w-20 h-20 bg-brand-accent/10 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-brand-accent group-hover:text-white transition-colors">
                <User size={40} className="text-brand-accent group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-text">New User</h3>
                <p className="text-brand-muted text-sm font-medium">I'm new here, let's sign up!</p>
              </div>
              <div className="pt-4">
                <span className="bg-brand-accent text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">Start Here</span>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setView('login')}
              className="bg-brand-surface border-4 border-emerald-500/20 hover:border-emerald-500 p-8 rounded-[3rem] text-center space-y-4 transition-all shadow-xl group"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 size={40} className="text-emerald-500 group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-text">Already Signed Up</h3>
                <p className="text-brand-muted text-sm font-medium">Welcome back! Log in here.</p>
              </div>
              <div className="pt-4">
                <span className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">Login</span>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface border border-brand-border rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={() => setView('selection')}
          className="absolute left-6 top-6 p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-muted"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex flex-col items-center mb-10 pt-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 ${
            view === 'login' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-brand-accent shadow-brand-accent/20'
          }`}>
            {view === 'login' ? <CheckCircle2 className="text-white" size={32} /> : <User className="text-white" size={32} />}
          </div>
          <h1 className="text-3xl font-black tracking-tighter">
            {view === 'login' ? 'Welcome Back' : 'Join AziLearn'}
          </h1>
          <p className="text-brand-muted font-bold uppercase tracking-widest text-[10px] mt-1">
            {view === 'login' ? 'Enter your details to login' : 'Create your student profile'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {view === 'signup' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-4">Student Name</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-muted/40" size={20} />
                <input 
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-brand-bg border-2 border-brand-border rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-brand-accent transition-all font-bold text-lg"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-4">Phone Number</label>
            <div className="relative">
              <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-muted/40" size={20} />
              <input 
                type="tel"
                required
                placeholder="e.g. 0712345678"
                className={`w-full bg-brand-bg border-2 border-brand-border rounded-2xl py-4 pl-14 pr-6 outline-none transition-all font-bold text-lg ${
                  view === 'login' ? 'focus:border-emerald-500' : 'focus:border-brand-accent'
                }`}
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-2xl text-center"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all shadow-xl disabled:opacity-50 text-white ${
              view === 'login' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-brand-accent shadow-brand-accent/20'
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                {view === 'login' ? 'Login Now' : 'Create Profile'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
            className="text-xs font-black text-brand-muted hover:text-brand-accent transition-colors uppercase tracking-widest"
          >
            {view === 'login' ? "Need an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
