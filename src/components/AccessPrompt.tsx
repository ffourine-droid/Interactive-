import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { checkAccess } from '../utils/checkAccess';

interface AccessPromptProps {
  lessonId?: string;
  onSuccess: (code: string) => void;
  onPayClick: () => void;
}

export const AccessPrompt: React.FC<AccessPromptProps> = ({ lessonId, onSuccess, onPayClick }) => {
  const [phone, setPhone] = useState(sessionStorage.getItem('azilearn_phone') || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await checkAccess(phone);

    if (result.access) {
      sessionStorage.setItem('azilearn_phone', phone.trim());
      window.dispatchEvent(new Event('storage'));
      onSuccess(phone.trim());
    } else {
      // For any failure (not found, expired, rejected), lead directly to payment instructions
      // as requested to avoid confusing error messages for children.
      onPayClick();
    }
    setLoading(false);
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-3xl p-8 max-w-md mx-auto text-center shadow-lg">
      <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Smartphone className="text-brand-accent" size={32} />
      </div>
      
      <h2 className="text-2xl font-bold tracking-tight mb-2">Premium Content</h2>
      <p className="text-brand-muted mb-8">Enter the phone number you used for payment to unlock this material.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="tel"
            required
            placeholder="e.g. 0712345678"
            className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all text-center font-bold text-lg"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Unlock Content'}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-brand-border">
        <p className="text-sm text-brand-muted mb-4">Don't have a code yet?</p>
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
