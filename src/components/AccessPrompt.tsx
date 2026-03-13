import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Smartphone, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { checkAccess } from '../utils/checkAccess';

interface AccessPromptProps {
  lessonId?: string;
  onSuccess: (code: string) => void;
  onPayClick: () => void;
}

export const AccessPrompt: React.FC<AccessPromptProps> = ({ lessonId, onSuccess, onPayClick }) => {
  const [phone, setPhone] = useState(sessionStorage.getItem('azilearn_phone') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await checkAccess(phone);

    if (result.access) {
      sessionStorage.setItem('azilearn_phone', phone.trim());
      window.dispatchEvent(new Event('storage'));
      onSuccess(phone.trim());
    } else {
      switch (result.reason) {
        case 'pending':
          setError("Your payment is still being verified. Please check back in 30 minutes.");
          break;
        case 'rejected':
          setError(`Access Denied. Your payment was not verified. Reason: ${result.rejection_reason || 'Invalid transaction'}. Please confirm your payment and try again.`);
          break;
        case 'expired':
          setError("Your access has expired. Please make a new payment.");
          break;
        case 'not_found':
        default:
          setError("No approved payment found for this phone number. Please ensure you have submitted your payment details.");
          break;
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-3xl p-8 max-w-md mx-auto text-center">
      <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Smartphone className="text-brand-accent" size={32} />
      </div>
      
      <h2 className="text-2xl font-extrabold tracking-tighter mb-2">Premium Content</h2>
      <p className="text-brand-text/60 mb-8">Enter the phone number you used for payment to unlock this material.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="tel"
            required
            placeholder="e.g. 0712345678"
            className="w-full bg-brand-bg border border-brand-surface/60 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all text-center font-bold"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm text-left"
          >
            <AlertCircle className="shrink-0 mt-0.5" size={16} />
            <p>{error}</p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-brand-accent/20"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Unlock Content'}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-brand-surface/40">
        <p className="text-sm text-brand-text/40 mb-4">Don't have a code yet?</p>
        <button
          onClick={onPayClick}
          className="text-brand-accent font-bold hover:underline"
        >
          View Payment Instructions
        </button>
      </div>
    </div>
  );
};
