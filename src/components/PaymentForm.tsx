import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Smartphone, Loader2, AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface PaymentFormProps {
  plan: 'daily' | 'weekly' | 'monthly';
  lessonId?: string;
  amount: number;
  onSuccess: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ plan, lessonId, amount, onSuccess }) => {
  const [phone, setPhone] = useState(sessionStorage.getItem('azilearn_phone') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!navigator.onLine) {
      setError("You are offline. Please check your internet connection.");
      showToast("No internet connection", "error");
      return;
    }

    setLoading(true);
    setError(null);

    const trimmedPhone = phone.trim();

    if (!trimmedPhone || trimmedPhone.length < 10) {
      setError("Please enter a valid phone number (at least 10 digits)");
      setLoading(false);
      return;
    }

    try {
      // Insert submission
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          transaction_code: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          amount,
          plan,
          lesson_id: lessonId,
          phone_number: trimmedPhone,
          status: 'pending'
        });

      if (insertError) {
        if (insertError.message.includes('network')) {
          throw new Error("Network error. Please check your connection and try again.");
        }
        throw insertError;
      }

      // Auto-login for immediate access
      sessionStorage.setItem('azilearn_phone', trimmedPhone);
      window.dispatchEvent(new Event('storage'));

      setSubmitted(true);
      showToast("Payment submitted successfully!", "success");
      onSuccess();
    } catch (err: any) {
      console.error('Submission error:', err);
      const msg = err.message || "Something went wrong. Please try again.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-emerald-500" size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-emerald-500">Access Granted!</h3>
        <p className="text-emerald-500/80 mb-6">
          You now have immediate access to the materials. Our admin will verify your payment shortly.
        </p>
        <button
          onClick={onSuccess}
          className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          Start Learning Now
        </button>
        <div className="mt-6 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
          <p className="text-xs uppercase tracking-widest font-bold text-emerald-500/40 mb-1">Your Phone Number</p>
          <p className="font-mono text-lg font-bold text-emerald-500 tracking-widest">{phone}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-brand-muted mb-2 ml-1">
            Phone Number (Used for Payment)
          </label>
          <div className="relative">
            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
            <input
              type="tel"
              required
              placeholder="e.g. 0712345678"
              className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500 text-sm"
        >
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <p>{error}</p>
        </motion.div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Payment'}
      </button>
    </form>
  );
};
