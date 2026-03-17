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
  { id: 'weekly', name: 'Weekly', price: 50, duration: '7 days', days: 7 },
  { id: 'monthly', name: 'Monthly', price: 120, duration: '30 days', days: 30 },
];

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSubscriptionSuccess: () => void;
  onManualPay: (plan: 'daily' | 'weekly' | 'monthly') => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  onManualPay
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-brand-bg border border-brand-border rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Choose a Plan</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-brand-surface rounded-xl transition-colors text-brand-muted"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  onManualPay(plan.id);
                  onClose();
                }}
                className="w-full p-6 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-between hover:border-brand-accent/50 transition-all group shadow-sm text-left"
              >
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-sm text-brand-muted">{plan.duration} Access</p>
                </div>
                <div className="text-right">
                  <div className="text-brand-accent font-bold text-xl">KES {plan.price}</div>
                  <div className="text-[10px] uppercase tracking-widest text-brand-muted/40">Manual Payment</div>
                </div>
              </button>
            ))}
            
            <div className="pt-6 p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/10">
              <div className="flex items-start gap-3">
                <Smartphone className="text-brand-accent shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-brand-muted leading-relaxed">
                  Select a plan to view the <strong>Lipa na M-Pesa</strong> Till Number and instructions for manual payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
