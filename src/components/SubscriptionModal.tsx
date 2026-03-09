import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, CreditCard, Phone, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Plan {
  id: 'daily' | 'weekly' | 'monthly';
  name: string;
  price: number;
  duration: string;
  days: number;
}

const plans: Plan[] = [
  { id: 'daily', name: 'Daily', price: 10, duration: '1 day', days: 1 },
  { id: 'weekly', name: 'Weekly', price: 40, duration: '7 days', days: 7 },
  { id: 'monthly', name: 'Monthly', price: 100, duration: '30 days', days: 30 },
];

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSubscriptionSuccess: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  phoneNumber,
  onSubscriptionSuccess 
}) => {
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [mpesaNumber, setMpesaNumber] = useState(phoneNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedPlan) throw new Error('No plan selected');
      if (!mpesaNumber) throw new Error('M-Pesa number is required');

      // Simulate M-Pesa STK Push
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful subscription entry in Supabase
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedPlan.days);

      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          phone_number: phoneNumber,
          plan_type: selectedPlan.id,
          amount_paid: selectedPlan.price,
          paid_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (subError) throw subError;

      onSubscriptionSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-brand-bg border border-brand-surface/60 rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-extrabold tracking-tighter">
              {step === 'plans' ? 'Choose a Plan' : 'M-Pesa Payment'}
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

            {step === 'plans' ? (
              <motion.div
                key="plans-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className="w-full p-6 bg-brand-surface/20 border border-brand-surface/40 rounded-2xl flex items-center justify-between hover:border-brand-accent/50 transition-all group"
                  >
                    <div className="text-left">
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      <p className="text-sm text-brand-text/40">{plan.duration} Access</p>
                    </div>
                    <div className="text-right">
                      <div className="text-brand-accent font-black text-xl">KES {plan.price}</div>
                      <div className="text-[10px] uppercase tracking-widest text-brand-text/20">One-time payment</div>
                    </div>
                  </button>
                ))}
                <div className="pt-4 text-center">
                  <p className="text-xs text-brand-text/40">
                    Unlock all study materials, past papers, and expert notes instantly.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="payment-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePayment}
                className="space-y-6"
              >
                <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-text/40">Selected Plan</p>
                    <p className="font-bold">{selectedPlan?.name} Access</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-brand-text/40">Amount</p>
                    <p className="font-bold text-brand-accent">KES {selectedPlan?.price}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-brand-text/40 mb-2 ml-1">
                    M-Pesa Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" size={18} />
                    <input
                      type="tel"
                      required
                      placeholder="+254..."
                      className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all"
                      value={mpesaNumber}
                      onChange={(e) => setMpesaNumber(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-brand-text/40 mt-2 ml-1 italic">
                    Enter your M-Pesa number to pay KES {selectedPlan?.price}
                  </p>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                  <Check className="shrink-0 mt-0.5 text-emerald-500" size={16} />
                  <p className="text-xs text-emerald-500/80">
                    An STK push will be sent to your phone. Enter your M-Pesa PIN to complete the payment.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('plans')}
                    className="flex-1 bg-brand-surface/20 text-brand-text/60 py-4 rounded-2xl font-bold hover:bg-brand-surface/40 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-brand-accent/20"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Pay Now'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
