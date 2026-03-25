import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Smartphone, Info, CheckCircle2, Clock, ArrowRight, MessageSquare } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'whatsapp'>('mpesa');

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
  const WHATSAPP_NUMBER = "254799426863";

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
    // We don't call the parent onSuccess yet, we show the local success view first
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
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
              <span className="font-bold font-sans">Back to Lessons</span>
            </button>

            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans">Payment Options</h1>
                <p className="text-brand-muted text-sm font-sans">
                  Unlock {getPlanName()} {lessonTitle ? `for "${lessonTitle}"` : ''} for KES {amount}.
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="flex p-1 bg-brand-surface border border-brand-border rounded-2xl shadow-sm">
                <button
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    paymentMethod === 'mpesa' 
                      ? 'bg-brand-accent text-white shadow-md' 
                      : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  <Smartphone size={18} />
                  Lipa na M-Pesa
                </button>
                <button
                  onClick={() => setPaymentMethod('whatsapp')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    paymentMethod === 'whatsapp' 
                      ? 'bg-[#25D366] text-white shadow-md' 
                      : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  <MessageSquare size={18} />
                  WhatsApp
                </button>
              </div>

              {paymentMethod === 'mpesa' ? (
                <>
                  {/* Instructions Card */}
                  <div className="bg-brand-accent text-white rounded-[2rem] p-8 shadow-lg shadow-brand-accent/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <Smartphone size={24} />
                        </div>
                        <span className="font-bold uppercase tracking-widest text-[10px] opacity-60 font-sans">Lipa na M-Pesa</span>
                      </div>

                      <div className="grid grid-cols-1 gap-6 mb-10">
                        <div>
                          <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-1 font-sans">Till Number</p>
                          <p className="text-4xl font-bold tracking-tight font-sans">{TILL_NUMBER}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-1 font-sans">Amount</p>
                          <p className="text-4xl font-bold tracking-tight font-sans">KES {amount}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="font-bold text-sm font-sans">Business Name: <span className="opacity-80">FOURINE SHIHAFFU</span></p>
                        <div className="h-px bg-white/20 w-full" />
                        <ol className="text-sm space-y-2 opacity-90 font-sans">
                          <li className="flex gap-3">
                            <span className="font-bold opacity-40">01</span>
                            <span>Open M-Pesa on your phone</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-bold opacity-40">02</span>
                            <span>Select <strong>Lipa na M-Pesa</strong></span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-bold opacity-40">03</span>
                            <span>Select <strong>Buy Goods and Services</strong></span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-bold opacity-40">04</span>
                            <span>Enter Till Number: <strong>{TILL_NUMBER}</strong></span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-bold opacity-40">05</span>
                            <span>Enter Amount: <strong>KES {amount}</strong></span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-bold opacity-40">06</span>
                            <span>Enter your M-Pesa PIN and confirm</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-brand-accent/10 rounded-xl">
                        <Info className="text-brand-accent" size={20} />
                      </div>
                      <h2 className="text-xl font-bold font-sans">Submit Transaction Code</h2>
                    </div>

                    <PaymentForm 
                      plan={plan} 
                      lessonId={lessonId} 
                      amount={amount} 
                      onSuccess={handleFormSuccess} 
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-[#25D366] text-white rounded-[2rem] p-8 shadow-lg shadow-[#25D366]/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <MessageSquare size={24} />
                        </div>
                        <span className="font-bold uppercase tracking-widest text-[10px] opacity-60 font-sans">WhatsApp Payment</span>
                      </div>

                      <div className="space-y-6 mb-8">
                        <div>
                          <h3 className="text-2xl font-bold mb-2 font-sans">Request Payment Prompt</h3>
                          <p className="text-white/80 text-sm leading-relaxed font-sans">
                            Click the button below to send a message to our support team on WhatsApp. 
                            We will send a payment prompt directly to your phone.
                          </p>
                        </div>
                        
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white/60 text-[10px] uppercase tracking-widest font-bold font-sans">Plan</span>
                            <span className="font-bold font-sans">{getPlanName()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-[10px] uppercase tracking-widest font-bold font-sans">Amount</span>
                            <span className="font-bold font-sans">KES {amount}</span>
                          </div>
                        </div>
                      </div>

                      <a 
                        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                          `Hello, I would like to request a payment prompt for the ${getPlanName()} plan. Amount: KES ${amount}. ${lessonTitle ? `Lesson: ${lessonTitle}` : ''}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white text-[#25D366] py-5 rounded-2xl font-bold hover:bg-white/90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 font-sans"
                      >
                        <MessageSquare size={24} />
                        Request on WhatsApp
                      </a>
                    </div>
                  </div>

                  <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-brand-accent/10 rounded-xl">
                        <Info className="text-brand-accent" size={20} />
                      </div>
                      <h2 className="text-xl font-bold font-sans">Already Paid?</h2>
                    </div>
                    <p className="text-brand-muted text-sm mb-6 font-sans">
                      If you've already received the prompt and paid, please submit your phone number below to gain access.
                    </p>

                    <PaymentForm 
                      plan={plan} 
                      lessonId={lessonId} 
                      amount={amount} 
                      onSuccess={handleFormSuccess} 
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-6 bg-brand-surface rounded-2xl border border-brand-border shadow-sm">
                <CheckCircle2 className="text-brand-muted/40 shrink-0" size={20} />
                <p className="text-xs text-brand-muted leading-relaxed font-sans">
                  Once submitted, our team will verify your payment within 30 minutes. 
                  Keep your M-Pesa SMS for reference.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-[420px] mx-auto px-6 pt-24 text-center space-y-8"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative z-10">
                <Clock className="text-amber-500 animate-pulse" size={48} />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight font-sans">Awaiting Verification</h1>
              <p className="text-brand-muted leading-relaxed font-sans">
                Your payment for the <span className="text-brand-text font-bold">{getPlanName()}</span> has been submitted successfully.
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 text-left space-y-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                  <CheckCircle2 className="text-emerald-500" size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold font-sans">Immediate Access Granted</p>
                  <p className="text-xs text-brand-muted font-sans">You can start learning while we verify your transaction.</p>
                </div>
              </div>
              <div className="h-px bg-brand-border" />
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                  <Info className="text-amber-500" size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold font-sans">Verification in Progress</p>
                  <p className="text-xs text-brand-muted font-sans">Our team typically verifies payments within 15 minutes.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={onSuccess}
              className="w-full bg-brand-accent text-white py-5 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 group font-sans"
            >
              Start Learning Now
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
