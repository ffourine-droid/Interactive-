import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface RegisterModalProps {
  onClose: () => void;
}

export default function RegisterModal({ onClose }: RegisterModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-brand-brown/20 border border-brand-brown/40 rounded-3xl p-8 relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-brand-cream/50 hover:text-brand-cream transition-colors"
        >
          <X size={24} />
        </button>

        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-brand-orange/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-orange/30">
            <User className="text-brand-orange" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-brand-cream">Create Account</h2>
          <p className="text-brand-cream/50 mt-2 text-sm">Join AziLearn to save your experiments</p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <CheckCircle2 className="text-emerald-500 w-16 h-16 mb-4" />
            <h3 className="text-xl font-bold text-brand-cream mb-2">Registration Successful!</h3>
            <p className="text-brand-cream/60">You can now log in with your new account.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm"
              >
                <AlertCircle className="shrink-0 w-5 h-5" />
                <p>{error}</p>
              </motion.div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-cream/60 uppercase tracking-wider pl-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-cream/40">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-brand-black/50 border border-brand-brown/50 rounded-xl py-3 pl-11 pr-4 text-brand-cream placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-orange/50 transition-colors"
                  placeholder="Choose a unique username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-cream/60 uppercase tracking-wider pl-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-cream/40">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-black/50 border border-brand-brown/50 rounded-xl py-3 pl-11 pr-4 text-brand-cream placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-orange/50 transition-colors"
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-cream/60 uppercase tracking-wider pl-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-cream/40">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-brand-black/50 border border-brand-brown/50 rounded-xl py-3 pl-11 pr-4 text-brand-cream placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-orange/50 transition-colors"
                  placeholder="Repeat your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange text-white py-3.5 rounded-xl font-bold mt-6 hover:bg-brand-orange/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
