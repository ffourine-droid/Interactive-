import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface TeacherChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  usingSharedPin?: boolean;
  onSuccess?: () => void;
}

export const TeacherChangePinModal: React.FC<TeacherChangePinModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  usingSharedPin = false,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCurrent = currentPin.trim();
    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanCurrent || !cleanNew || !cleanConfirm) {
      setError('Please fill in all PIN fields.');
      return;
    }

    if (cleanCurrent.length !== 4 || cleanNew.length !== 4 || cleanConfirm.length !== 4) {
      setError('PINs must be exactly 4 digits.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('New PIN and confirmation PIN do not match.');
      return;
    }

    if (cleanCurrent === cleanNew) {
      setError('Your new PIN cannot be the same as your current PIN.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('teacher_change_pin', {
        p_teacher_id: teacherId,
        p_current_pin: cleanCurrent,
        p_new_pin: cleanNew
      });

      if (rpcError) {
        throw rpcError;
      }

      if (!data || !data.success) {
        setError(data?.message || 'Failed to update PIN. Please check your current PIN.');
        return;
      }

      // Successfully updated personal PIN
      try {
        const stored = localStorage.getItem('azilearn_teacher');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.using_shared_pin = false;
          localStorage.setItem('azilearn_teacher', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Error updating local teacher storage:', e);
      }

      showToast(data.message || 'Personal PIN updated successfully!', 'success');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Error changing teacher PIN:', err);
      setError(err.message || 'An error occurred while updating your PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-brand-surface border border-brand-border rounded-[2rem] p-6 sm:p-8 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <KeyRound size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text">
                {usingSharedPin ? 'Set Personal PIN' : 'Change Teacher PIN'}
              </h2>
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mt-0.5">
                {usingSharedPin ? 'Upgrade from school shared PIN' : 'Update your 4-digit security code'}
              </p>
            </div>
          </div>

          {usingSharedPin && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-500 leading-relaxed">
              You are currently logged in with your school's common PIN. Setting your personal PIN keeps your educator portal secure.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs font-semibold text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">
                {usingSharedPin ? "Current Shared PIN" : "Current PIN"}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={16} />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 pl-11 pr-4 font-bold tracking-[0.3em] text-brand-text outline-none focus:border-brand-accent/50 transition-all text-sm placeholder-brand-muted/30"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">
                New 4-Digit PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={16} />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 pl-11 pr-4 font-bold tracking-[0.3em] text-brand-text outline-none focus:border-brand-accent/50 transition-all text-sm placeholder-brand-muted/30"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">
                Confirm New PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={16} />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 pl-11 pr-4 font-bold tracking-[0.3em] text-brand-text outline-none focus:border-brand-accent/50 transition-all text-sm placeholder-brand-muted/30"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 px-4 rounded-xl border border-brand-border text-xs font-black uppercase tracking-wider text-brand-muted hover:text-brand-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 px-4 rounded-xl bg-brand-accent text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-accent/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {loading ? 'Updating...' : 'Save PIN'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
