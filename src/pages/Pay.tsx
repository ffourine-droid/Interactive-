import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Smartphone, Info, CheckCircle2, Clock, ArrowRight, MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { PaymentForm } from '../components/PaymentForm';

interface PayProps {
  plan: 'daily' | 'weekly' | 'monthly';
  lessonId?: string;
  lessonTitle?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export const Pay: React.FC<PayProps> = ({ plan, lessonId, lessonTitle, onSuccess, onBack }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const getAmount = () => {
    switch (plan) {
      case 'daily': return 10;
      case 'weekly': return 50;
      case 'monthly': return 120;
      default: return 10;
    }
  };

  const amount = getAmount();
  const TILL_NUMBER = "3400897"; 

  const getPlanName = () => {
    switch (plan) {
      case 'daily': return '1 Day Access';
      case 'weekly': return '7 Days Access';
      case 'monthly': return '30 Days Access';
      default: return 'Access';
    }
  };

  const handleFormSuccess = () => {
    setIsSubmitted(true);
    setShowForm(false);
    // Call onSuccess immediately to redirect to home/lesson
    setTimeout(() => {
      onSuccess();
    }, 1500); // Small delay to show the "Submitted" state if any, but we'll mostly rely on the home screen banner
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-32">
      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div 
            key="instructions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-[420px] mx-auto px-6 pt-12"
          >
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-brand-muted hover:text-brand-accent transition-colors mb-8 group"
            >
              <div className="p-2 bg-brand-surface rounded-xl group-hover:bg-brand-accent/10 transition-colors border border-brand-border shadow-sm">
                <ChevronLeft size={20} />
              </div>
              <span className="font-bold font-sans">Back</span>
            </button>

            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-black tracking-tighter mb-2 font-sans text-brand-text">Payment</h1>
                <p className="text-brand-muted text-sm font-bold font-sans">
                  Unlock {getPlanName()} for <span className="text-brand-accent">KES {amount}</span>
                </p>
              </div>

              {/* Instructions Card */}
              <div className="bg-brand-accent text-white rounded-[2.5rem] p-8 shadow-2xl shadow-brand-accent/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-white/20 rounded-2xl">
                      <Smartphone size={28} />
                    </div>
                    <div>
                      <span className="font-black uppercase tracking-[0.2em] text-[10px] opacity-60 block mb-1">M-Pesa Till</span>
                      <p className="text-3xl font-black tracking-tighter">{TILL_NUMBER}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                      <p className="text-white/60 text-[10px] uppercase tracking-widest font-black mb-1">Amount to Pay</p>
                      <p className="text-2xl font-black tracking-tight">KES {amount}</p>
                    </div>

                    <div className="bg-white/10 rounded-2xl p-5 border border-white/20">
                      <p className="font-black text-xs uppercase tracking-widest opacity-60 mb-3">Quick Steps</p>
                      <ol className="text-sm space-y-3 font-bold">
                        <li className="flex gap-3 items-center">
                          <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-[10px]">1</span>
                          <span>Go to <strong>Lipa na M-Pesa</strong></span>
                        </li>
                        <li className="flex gap-3 items-center">
                          <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-[10px]">2</span>
                          <span>Select <strong>Buy Goods</strong></span>
                        </li>
                        <li className="flex gap-3 items-center">
                          <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-[10px]">3</span>
                          <span>Enter Till: <strong>{TILL_NUMBER}</strong></span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 bg-brand-surface rounded-3xl border border-brand-border shadow-sm">
                <Info className="text-brand-accent shrink-0" size={20} />
                <p className="text-[11px] text-brand-muted font-bold leading-relaxed">
                  After paying, click the button below to enter your phone number and transaction code.
                </p>
              </div>
            </div>

            {/* FLOATING ACTION BUTTON */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[380px] px-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowForm(true)}
                className="w-full bg-brand-text text-brand-bg py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 group"
              >
                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Enter Payment Details
              </motion.button>
            </div>

            {/* FORM MODAL */}
            <AnimatePresence>
              {showForm && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowForm(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md bg-brand-bg border border-brand-border rounded-t-[3rem] p-8 shadow-2xl pb-12"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-black tracking-tighter text-brand-text">Submit Details</h2>
                        <p className="text-brand-muted text-[10px] font-black uppercase tracking-widest">Verify your transaction</p>
                      </div>
                      <button 
                        onClick={() => setShowForm(false)}
                        className="p-3 bg-brand-surface rounded-2xl text-brand-muted hover:text-brand-text transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <PaymentForm 
                      plan={plan} 
                      lessonId={lessonId} 
                      amount={amount} 
                      onSuccess={handleFormSuccess} 
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-[420px] mx-auto px-6 pt-24 text-center space-y-8"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-brand-accent rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 relative z-10 shadow-2xl shadow-brand-accent/20">
                <CheckCircle2 className="text-white" size={48} />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl" />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter font-sans text-brand-text">Success!</h1>
              <p className="text-brand-muted font-bold leading-relaxed font-sans">
                Your payment details have been submitted.
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 text-center space-y-4 shadow-sm">
              <Loader2 className="animate-spin text-brand-accent mx-auto" size={32} />
              <p className="text-sm font-black tracking-tight text-brand-text">Unlocking Materials...</p>
              <p className="text-xs text-brand-muted font-bold italic">Redirecting you to start learning now.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
