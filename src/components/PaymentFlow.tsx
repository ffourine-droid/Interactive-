import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Phone, CreditCard, MessageCircle, X, CheckCircle2, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// --- CONFIGURATION ---
// Replace these with your actual details
const TILL_NUMBER = "543210"; 
const OWNER_WHATSAPP = "254700000000"; 

const PLANS = [
  { id: 'daily', name: 'Daily Access', amount: 10, duration: '1 Day' },
  { id: 'weekly', name: 'Weekly Access', amount: 50, duration: '7 Days' },
  { id: 'monthly', name: 'Monthly Access', amount: 120, duration: '30 Days' },
];

/**
 * PaymentFlow Component
 * Handles content locking, payment modal with two options, 
 * and optimistic unlocking for AziLearn.
 */
const PaymentFlow = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [activeTab, setActiveTab] = useState<'direct' | 'prompt'>('direct');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // --- LOCKING LOGIC ---
  // Check Supabase 'payments' for a row where phone_number matches AND status = "active"
  useEffect(() => {
    const checkAccess = async () => {
      const storedPhone = localStorage.getItem('azilearn_user_phone');
      if (!storedPhone) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('payments')
          .select('status')
          .eq('phone_number', storedPhone)
          .eq('status', 'active')
          .maybeSingle();

        if (data) {
          setIsUnlocked(true);
        } else {
          // If not found or status is not active (e.g., rejected), keep locked
          setIsUnlocked(false);
        }
      } catch (err) {
        console.error('Error checking access:', err);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, []);

  // --- OPTION A: PAY DIRECTLY (Self-service) ---
  const handleDirectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !mpesaCode) {
      setError('Please enter both your phone number and transaction code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('payments').insert([
        {
          phone_number: phoneNumber,
          amount: selectedPlan.amount,
          plan: selectedPlan.id,
          method: 'self',
          mpesa_code: mpesaCode.toUpperCase(),
          status: 'pending',
        },
      ]);

      if (insertError) throw insertError;

      // Optimistic Unlock
      setIsUnlocked(true);
      localStorage.setItem('azilearn_user_phone', phoneNumber);
      setShowSuccess(true);
      
      // Close modal after success message
      setTimeout(() => {
        setIsModalOpen(false);
        setShowSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- OPTION B: REQUEST PAYMENT PROMPT ---
  const handleRequestPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError('Please enter your M-Pesa phone number.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('payments').insert([
        {
          phone_number: phoneNumber,
          amount: selectedPlan.amount,
          plan: selectedPlan.id,
          method: 'prompt',
          status: 'pending',
        },
      ]);

      if (insertError) throw insertError;

      // Send WhatsApp Message to Owner
      const message = `AziLearn payment request:\nPhone: ${phoneNumber}\nAmount: KES ${selectedPlan.amount}\nPlan: ${selectedPlan.name}\nSend STK push now.`;
      const waUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      // Optimistic Unlock
      setIsUnlocked(true);
      localStorage.setItem('azilearn_user_phone', phoneNumber);
      setShowSuccess(true);

      // Close modal after success message
      setTimeout(() => {
        setIsModalOpen(false);
        setShowSuccess(false);
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to request prompt. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text overflow-x-hidden">
      {/* --- TOP NAVIGATION --- */}
      <nav className="bg-brand-surface border-b border-brand-border px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <span className="font-bold text-xl">A</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-brand-text">AziLearn</h1>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
          {isUnlocked ? 'Unlocked' : 'Locked'}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {/* --- CONTENT AREA --- */}
        <div className="relative bg-brand-surface rounded-[2.5rem] shadow-xl shadow-brand-accent/5 overflow-hidden border border-brand-border">
          {/* Content Placeholder (Blurred if locked) */}
          <div className={`p-8 md:p-12 transition-all duration-1000 ${!isUnlocked ? 'blur-xl grayscale opacity-50 pointer-events-none select-none' : ''}`}>
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-brand-accent font-bold text-sm uppercase tracking-widest">Grade 4 • Mathematics</span>
                <h2 className="text-4xl font-black text-brand-text leading-tight">Understanding Fractions & Decimals</h2>
              </div>
              
              <div className="aspect-video bg-brand-bg rounded-[2rem] flex items-center justify-center overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-brand-accent rounded-full flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform">
                  <ChevronRight size={40} fill="currentColor" />
                </div>
                <p className="absolute bottom-6 left-6 text-white font-bold text-lg">Watch Lesson Video</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-brand-bg/50 rounded-3xl space-y-4 text-brand-text">
                  <h4 className="font-bold text-xl">Study Notes</h4>
                  <div className="space-y-2">
                    <div className="h-3 bg-brand-border rounded-full w-full" />
                    <div className="h-3 bg-brand-border rounded-full w-5/6" />
                    <div className="h-3 bg-brand-border rounded-full w-4/6" />
                  </div>
                </div>
                <div className="p-6 bg-brand-bg/50 rounded-3xl space-y-4 text-brand-text">
                  <h4 className="font-bold text-xl">Practice Quiz</h4>
                  <div className="space-y-2">
                    <div className="h-3 bg-brand-border rounded-full w-full" />
                    <div className="h-3 bg-brand-border rounded-full w-full" />
                    <div className="h-3 bg-brand-border rounded-full w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- LOCK OVERLAY --- */}
          {!isUnlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-brand-bg/10 backdrop-blur-[2px]">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-brand-surface p-10 rounded-[3rem] shadow-2xl border border-brand-border text-center max-w-sm w-full"
              >
                <div className="w-24 h-24 bg-amber-100 rounded-[2rem] flex items-center justify-center text-amber-600 mx-auto mb-8 rotate-3">
                  <Lock size={48} />
                </div>
                <h3 className="text-3xl font-black text-brand-text mb-4">Unlock Access</h3>
                <p className="text-brand-muted mb-10 leading-relaxed font-medium">
                  Get full access to all CBC lessons, videos, and quizzes for Grade 1-8.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Unlock Now <ChevronRight size={24} />
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      {/* --- PAYMENT MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-brand-surface w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-brand-border"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-bg/30">
                <div>
                  <h2 className="text-2xl font-black text-brand-text">Unlock AziLearn</h2>
                  <p className="text-brand-muted font-medium">Choose how you want to pay</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-brand-bg hover:bg-brand-border/40 rounded-2xl transition-colors text-brand-text"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto p-8 space-y-10">
                {/* Plan Selection */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-brand-muted uppercase tracking-[0.2em]">1. Select Your Plan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-5 rounded-[2rem] border-4 transition-all text-center flex flex-col items-center gap-1 ${
                          selectedPlan.id === plan.id 
                            ? 'border-brand-accent bg-brand-accent/10 text-brand-accent shadow-lg shadow-brand-accent/5' 
                            : 'border-brand-bg hover:border-brand-border/50 text-brand-muted'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-tighter">{plan.id}</span>
                        <span className="text-2xl font-black">KES {plan.amount}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-brand-bg p-2 rounded-[2rem] border border-brand-border">
                  <button
                    onClick={() => setActiveTab('direct')}
                    className={`flex-1 py-4 rounded-[1.5rem] font-black text-sm transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'direct' ? 'bg-brand-surface text-brand-accent shadow-md border border-brand-border' : 'text-brand-muted'
                    }`}
                  >
                    <CreditCard size={20} /> Pay Directly
                  </button>
                  <button
                    onClick={() => setActiveTab('prompt')}
                    className={`flex-1 py-4 rounded-[1.5rem] font-black text-sm transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'prompt' ? 'bg-brand-surface text-brand-accent shadow-md border border-brand-border' : 'text-brand-muted'
                    }`}
                  >
                    <Phone size={20} /> Request Prompt
                  </button>
                </div>

                {/* Forms */}
                <div className="min-h-[350px]">
                  {activeTab === 'direct' ? (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      <div className="bg-brand-accent/5 p-8 rounded-[2.5rem] border-2 border-brand-accent/10 space-y-6">
                        <div className="flex justify-between items-center">
                          <span className="text-brand-accent font-bold uppercase tracking-widest text-xs">M-Pesa Till Number</span>
                          <span className="text-3xl font-black text-brand-accent">{TILL_NUMBER}</span>
                        </div>
                        <div className="h-0.5 bg-brand-accent/10" />
                        <ol className="text-sm text-brand-text space-y-3 font-bold">
                          <li className="flex gap-3"><span className="w-5 h-5 bg-brand-accent/20 rounded-full flex items-center justify-center text-[10px]">1</span> Go to M-Pesa &gt; Lipa na M-Pesa</li>
                          <li className="flex gap-3"><span className="w-5 h-5 bg-brand-accent/20 rounded-full flex items-center justify-center text-[10px]">2</span> Select Buy Goods & Services</li>
                          <li className="flex gap-3"><span className="w-5 h-5 bg-brand-accent/20 rounded-full flex items-center justify-center text-[10px]">3</span> Enter Till: {TILL_NUMBER}</li>
                          <li className="flex gap-3"><span className="w-5 h-5 bg-brand-accent/20 rounded-full flex items-center justify-center text-[10px]">4</span> Enter Amount: KES {selectedPlan.amount}</li>
                          <li className="flex gap-3"><span className="w-5 h-5 bg-brand-accent/20 rounded-full flex items-center justify-center text-[10px]">5</span> Enter PIN and confirm</li>
                        </ol>
                      </div>

                      <form onSubmit={handleDirectPayment} className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-xs font-black text-brand-muted uppercase tracking-widest ml-4">Your Phone Number</label>
                          <input
                            type="tel"
                            placeholder="e.g. 0712345678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full p-6 bg-brand-bg border-2 border-brand-border rounded-[2rem] focus:border-brand-accent outline-none transition-all font-bold text-lg placeholder:text-brand-muted/30 text-brand-text"
                            required
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs font-black text-brand-muted uppercase tracking-widest ml-4">M-Pesa Transaction Code</label>
                          <input
                            type="text"
                            placeholder="e.g. SBC123XYZ"
                            value={mpesaCode}
                            onChange={(e) => setMpesaCode(e.target.value)}
                            className="w-full p-6 bg-brand-bg border-2 border-brand-border rounded-[2rem] focus:border-brand-accent outline-none transition-all font-bold text-lg uppercase placeholder:text-brand-muted/30 text-brand-text"
                            required
                          />
                        </div>
                        {error && (
                          <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl font-bold text-sm">
                            <AlertCircle size={18} /> {error}
                          </div>
                        )}
                        <button
                          disabled={isLoading}
                          className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                          {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm My Payment'}
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      <div className="bg-brand-accent/5 p-8 rounded-[2.5rem] border-2 border-brand-accent/10 flex gap-6 items-start">
                        <div className="p-4 bg-brand-accent text-white rounded-[1.5rem] shadow-lg shadow-brand-accent/20">
                          <MessageCircle size={32} />
                        </div>
                        <div>
                          <h4 className="font-black text-xl text-brand-text mb-1">Easy Prompt</h4>
                          <p className="text-sm text-brand-muted leading-relaxed font-medium">
                            Enter your number below. We'll send a payment prompt directly to your phone. Just enter your PIN!
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleRequestPrompt} className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-xs font-black text-brand-muted uppercase tracking-widest ml-4">M-Pesa Phone Number</label>
                          <input
                            type="tel"
                            placeholder="e.g. 0712345678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full p-6 bg-brand-bg border-2 border-brand-border rounded-[2rem] focus:border-brand-accent outline-none transition-all font-bold text-lg placeholder:text-brand-muted/30 text-brand-text"
                            required
                          />
                        </div>
                        {error && (
                          <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl font-bold text-sm">
                            <AlertCircle size={18} /> {error}
                          </div>
                        )}
                        <button
                          disabled={isLoading}
                          className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                          {isLoading ? <Loader2 className="animate-spin" /> : 'Request Payment Prompt'}
                        </button>
                      </form>

                      {showSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center p-6 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 text-emerald-800 font-bold leading-relaxed"
                        >
                          A payment prompt will appear on your phone shortly. Enter your M-Pesa PIN to complete.
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Success Overlay for Direct Payment */}
              <AnimatePresence>
                {showSuccess && activeTab === 'direct' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-emerald-100"
                    >
                      <CheckCircle2 size={64} />
                    </motion.div>
                    <h3 className="text-4xl font-black text-slate-800 mb-4">Payment Sent!</h3>
                    <p className="text-slate-500 font-bold text-lg leading-relaxed">
                      We've unlocked your content optimistically. Happy learning!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FOOTER --- */}
      <footer className="max-w-4xl mx-auto mt-12 mb-20 text-center text-brand-muted font-bold text-sm uppercase tracking-widest">
        <p>© 2026 AziLearn EdTech • Secure M-Pesa Payments</p>
      </footer>
    </div>
  );
};

export default PaymentFlow;
