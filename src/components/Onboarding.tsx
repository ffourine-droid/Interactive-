import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Smartphone, ShieldCheck, ArrowRight, X, CheckCircle2, FlaskConical } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to AziLearn",
    description: "Your premium destination for high-quality study materials, interactive slides, and audio lessons.",
    icon: FlaskConical,
    color: "bg-brand-accent",
  },
  {
    title: "Flexible Plans",
    description: "Choose a plan that fits your schedule: Daily (KES 10), Weekly (KES 50), or Monthly (KES 120).",
    icon: BookOpen,
    color: "bg-indigo-500",
  },
  {
    title: "Easy M-Pesa Payment",
    description: "Pay securely via M-Pesa Till Number. Once you submit your code, you get instant access while we verify.",
    icon: Smartphone,
    color: "bg-emerald-500",
  },
  {
    title: "Verified Learning",
    description: "Our team verifies every transaction to ensure you have uninterrupted access to your materials.",
    icon: ShieldCheck,
    color: "bg-amber-500",
  }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[1000] bg-brand-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Background Decoration */}
        <div className={`absolute top-0 right-0 w-32 h-32 ${steps[currentStep].color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-colors duration-500`} />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex justify-between w-full mb-8">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? `w-8 ${steps[currentStep].color}` : 'w-2 bg-brand-border'
                  }`} 
                />
              ))}
            </div>
            <button 
              onClick={onComplete}
              className="text-brand-muted hover:text-brand-text transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className={`w-20 h-20 ${steps[currentStep].color} rounded-3xl flex items-center justify-center text-white shadow-lg mb-8`}>
                <StepIcon size={40} />
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-4 font-sans">
                {steps[currentStep].title}
              </h2>
              
              <p className="text-brand-muted leading-relaxed mb-12 font-sans text-sm">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <button 
            onClick={nextStep}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${steps[currentStep].color}`}
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
            <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
