import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Smartphone, Info, CheckCircle2 } from 'lucide-react';
import { PaymentForm } from '../components/PaymentForm';

interface PayProps {
  plan: 'daily' | 'weekly' | 'monthly';
  lessonId?: string;
  lessonTitle?: string;
  onBack: () => void;
}

export const Pay: React.FC<PayProps> = ({ plan, lessonId, lessonTitle, onBack }) => {
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

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <div className="max-w-2xl mx-auto px-6 pt-12">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-text/60 hover:text-brand-accent transition-colors mb-8 group"
        >
          <div className="p-2 bg-brand-surface/20 rounded-xl group-hover:bg-brand-accent/10 transition-colors">
            <ChevronLeft size={20} />
          </div>
          <span className="font-bold">Back to Lessons</span>
        </button>

        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tighter mb-4">Payment Instructions</h1>
            <p className="text-brand-text/60">
              Unlock {getPlanName()} {lessonTitle ? `for "${lessonTitle}"` : ''} for KES {amount}.
            </p>
          </div>

          {/* Instructions Card */}
          <div className="bg-brand-accent text-white rounded-[2.5rem] p-8 shadow-2xl shadow-brand-accent/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Smartphone size={24} />
                </div>
                <span className="font-black uppercase tracking-widest text-xs opacity-60">Lipa na M-Pesa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-widest font-black mb-1">Till Number</p>
                  <p className="text-4xl font-black tracking-tighter">{TILL_NUMBER}</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-widest font-black mb-1">Amount</p>
                  <p className="text-4xl font-black tracking-tighter">KES {amount}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-bold text-sm">Business Name: <span className="opacity-80">FOURINE SHIHAFFU</span></p>
                <div className="h-px bg-white/20 w-full" />
                <ol className="text-sm space-y-2 opacity-90">
                  <li className="flex gap-3">
                    <span className="font-black opacity-40">01</span>
                    <span>Open M-Pesa on your phone</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-black opacity-40">02</span>
                    <span>Select <strong>Lipa na M-Pesa</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-black opacity-40">03</span>
                    <span>Select <strong>Buy Goods and Services</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-black opacity-40">04</span>
                    <span>Enter Till Number: <strong>{TILL_NUMBER}</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-black opacity-40">05</span>
                    <span>Enter Amount: <strong>KES {amount}</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-black opacity-40">06</span>
                    <span>Enter your M-Pesa PIN and confirm</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-brand-accent/10 rounded-xl">
                <Info className="text-brand-accent" size={20} />
              </div>
              <h2 className="text-xl font-bold">Submit Transaction Code</h2>
            </div>

            <PaymentForm 
              plan={plan} 
              lessonId={lessonId} 
              amount={amount} 
              onSuccess={() => {}} 
            />
          </div>

          <div className="flex items-center gap-3 p-6 bg-brand-surface/10 rounded-3xl border border-brand-surface/20">
            <CheckCircle2 className="text-brand-text/20 shrink-0" size={20} />
            <p className="text-xs text-brand-text/40 leading-relaxed">
              Once submitted, our team will verify your payment within 30 minutes. 
              Keep your M-Pesa SMS for reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
