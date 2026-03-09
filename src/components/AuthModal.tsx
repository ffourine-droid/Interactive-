import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, Key, User, LogOut, AlertCircle, CheckCircle2, Loader2, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setStep('profile');
        onAuthSuccess(user);
      }
    };
    checkUser();
  }, [onAuthSuccess]);

  const handleBack = () => {
    setError(null);
    if (step === 'otp') {
      setStep('phone');
    } else {
      onClose();
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedPhone = phone.trim();
      const trimmedPassword = password.trim();
      const trimmedUsername = username.trim();

      if (!trimmedPhone.startsWith('+')) {
        throw new Error('Phone number must be in international format (e.g. +254...)');
      }
      if (trimmedPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (mode === 'signup') {
        if (!trimmedUsername) {
          throw new Error('Username is required for signup');
        }

        // Use custom server to send OTP
        const response = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: trimmedPhone }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send OTP');

        if (data.mock) {
          setError(`Development Mode: ${data.details || "Use code 123456 to verify."}`);
        }
        
        setStep('otp');
      } else {
        // Login mode
        const { error } = await supabase.auth.signInWithPassword({
          phone: trimmedPhone,
          password: trimmedPassword,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Incorrect phone number or password.');
          }
          throw error;
        }
        
        // If login successful, close modal
        onClose();
      }
    } catch (err: any) {
      let message = err.message;
      if (message.includes('Account SID') || message.includes('AC')) {
        message = "Twilio Configuration Error: Invalid Account SID. Please verify your Twilio credentials in the dashboard (must start with 'AC').";
      } else if (message.includes('Invalid parameter') || message.includes('INVALID_PARAMETER')) {
        message = "Invalid Phone Number: Please ensure you include the '+' and country code (e.g., +254712345678). No spaces or dashes.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedPhone = phone.trim();
      const trimmedOtp = otp.trim();
      const trimmedUsername = username.trim();

      // Verify OTP via custom server
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmedPhone, code: trimmedOtp }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid code');

      // If verified, we now create/sign in the user in Supabase
      // Note: In a real production app, you'd use a service role or 
      // custom claims, but for this demo we'll proceed to the profile step.
      
      // We'll simulate a user object for the UI
      const mockUser = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        phone: trimmedPhone,
        created_at: new Date().toISOString(),
        user_metadata: { username: trimmedUsername || 'Explorer' }
      };
      
      setUser(mockUser);
      setStep('profile');
      onAuthSuccess(mockUser);
      
    } catch (err: any) {
      let message = err.message;
      if (message.includes('Account SID') || message.includes('AC')) {
        message = "Twilio Configuration Error: Invalid Account SID. Please verify your Twilio credentials in the dashboard (must start with 'AC').";
      } else if (message.includes('Invalid parameter') || message.includes('INVALID_PARAMETER')) {
        message = "Invalid Phone Number: Please ensure you include the '+' and country code (e.g., +254712345678). No spaces or dashes.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setStep('phone');
      onAuthSuccess(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-brand-bg border border-brand-surface/60 rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={handleBack} 
              className="p-2 hover:bg-brand-surface/40 rounded-xl transition-colors text-brand-text/60 hover:text-brand-accent"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-extrabold tracking-tighter">
              {step === 'profile' ? 'Your Profile' : mode === 'signup' ? 'Join AZILEARN' : 'Welcome Back'}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>{error}</p>
              </motion.div>
            )}

            {step === 'phone' && (
              <motion.form
                key="phone-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOtp}
                className="space-y-6"
              >
                <div className="space-y-4">
                  {mode === 'signup' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-xs font-black uppercase tracking-widest text-brand-text/40 mb-2 ml-1">
                        Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" size={18} />
                        <input
                          type="text"
                          required={mode === 'signup'}
                          placeholder="e.g. science_explorer"
                          className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    </motion.div>
                  )}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-brand-text/40 mb-2 ml-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" size={18} />
                      <input
                        type="tel"
                        required
                        placeholder="+254..."
                        className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-brand-text/20 mt-2 ml-1 italic">
                      Include country code (e.g. +254 for Kenya)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-brand-text/40 mb-2 ml-1">
                      Unique Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" size={18} />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-brand-accent/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : mode === 'signup' ? 'Send OTP Code' : 'Sign In'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'signup' ? 'login' : 'signup');
                      setError(null);
                    }}
                    className="text-sm text-brand-text/40 hover:text-brand-accent transition-colors"
                  >
                    {mode === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'otp' && (
              <motion.form
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-brand-text/40 mb-2 ml-1">
                    Enter 6-digit Code
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" size={18} />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="000000"
                      className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all tracking-[0.5em] font-mono text-center text-xl"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-brand-accent/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Sign In'}
                </button>
              </motion.form>
            )}

            {step === 'profile' && user && (
              <motion.div
                key="profile-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 bg-brand-accent/10 border-2 border-brand-accent/20 rounded-[2rem] flex items-center justify-center text-brand-accent">
                    <User size={48} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {user.user_metadata?.username || 'Explorer'}
                    </h3>
                    <p className="text-sm text-brand-text/40">{user.phone}</p>
                  </div>
                </div>

                <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-text/40">Account Status</span>
                    <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                      <CheckCircle2 size={14} /> Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-text/40">Member Since</span>
                    <span className="font-bold">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
