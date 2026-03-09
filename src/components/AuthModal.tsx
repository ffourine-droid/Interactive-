import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, User, LogOut, AlertCircle, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (phoneNumber: string | null) => void;
  hasActiveSubscription?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuthSuccess,
  hasActiveSubscription = false
}) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedPhone, setStoredPhone] = useState<string | null>(localStorage.getItem('azilearn_phone'));

  useEffect(() => {
    if (storedPhone) {
      onAuthSuccess(storedPhone);
    }
  }, [storedPhone, onAuthSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedPhone = phone.trim();
      if (!trimmedPhone) throw new Error('Phone number is required');
      
      // Simple validation for phone number
      if (!trimmedPhone.startsWith('+') && trimmedPhone.length < 10) {
        throw new Error('Please enter a valid phone number (e.g. +254...)');
      }

      localStorage.setItem('azilearn_phone', trimmedPhone);
      setStoredPhone(trimmedPhone);
      onAuthSuccess(trimmedPhone);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('azilearn_phone');
    setStoredPhone(null);
    onAuthSuccess(null);
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
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-extrabold tracking-tighter">
              {storedPhone ? 'Your Account' : 'Welcome to AZILEARN'}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-brand-surface/40 rounded-xl transition-colors text-brand-text/60"
            >
              <X size={24} />
            </button>
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

            {!storedPhone ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleLogin}
                className="space-y-6"
              >
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
                    Enter your phone number to access study materials
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-brand-accent/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Continue'}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="profile-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 bg-brand-accent/10 border-2 border-brand-accent/20 rounded-[2rem] flex items-center justify-center text-brand-accent">
                    <User size={48} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{storedPhone}</h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      {hasActiveSubscription ? (
                        <span className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle2 size={12} />
                          Active Subscription
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                          <AlertCircle size={12} />
                          No Active Plan
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
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
