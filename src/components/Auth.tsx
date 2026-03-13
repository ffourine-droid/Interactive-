import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Smartphone, ArrowRight, Loader2, FlaskConical } from 'lucide-react';

interface AuthProps {
  onSuccess: (profile: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login: Check if profile exists with this phone number
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone_number', phone.trim())
          .single();

        if (fetchError || !data) {
          throw new Error('Account not found. Please sign up first.');
        }

        sessionStorage.setItem('azilearn_phone', data.phone_number);
        sessionStorage.setItem('azilearn_username', data.username);
        onSuccess(data);
      } else {
        // Sign Up: Create new profile
        if (!username.trim()) throw new Error('Username is required');
        
        // Check if phone already exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone_number', phone.trim())
          .maybeSingle();

        if (existing) {
          throw new Error('Phone number already registered. Please login.');
        }

        const { data, error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            username: username.trim(), 
            phone_number: phone.trim() 
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        sessionStorage.setItem('azilearn_phone', data.phone_number);
        sessionStorage.setItem('azilearn_username', data.username);
        onSuccess(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-brand-surface/20 border border-brand-surface/40 rounded-[2.5rem] p-8 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center shadow-xl shadow-brand-accent/20 mb-4">
            <FlaskConical className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">AZILEARN</h1>
          <p className="text-brand-text/40 font-bold uppercase tracking-widest text-[10px] mt-1">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4">Username</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text/20" size={20} />
                <input 
                  type="text"
                  required
                  placeholder="e.g. JohnDoe"
                  className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4">Phone Number</label>
            <div className="relative">
              <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text/20" size={20} />
              <input 
                type="tel"
                required
                placeholder="e.g. 0712345678"
                className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-brand-accent/50 transition-all font-bold"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-xl text-center"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-accent/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Login' : 'Sign Up'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-bold text-brand-text/40 hover:text-brand-accent transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
