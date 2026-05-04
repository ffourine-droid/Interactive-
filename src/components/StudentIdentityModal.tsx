import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Hash, ArrowRight, X, Loader2, BookOpen } from 'lucide-react';
import { examService } from '../services/examService';
import { useToast } from './Toast';

interface StudentIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: { id: string; name: string; index?: string; grade?: string }) => void;
  grade?: string;
}

export const StudentIdentityModal: React.FC<StudentIdentityModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  grade = 'Grade 7'
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [index, setIndex] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }

    setLoading(true);
    try {
      // Find or create student
      const student = await examService.identifyStudent(name, index, grade);
      localStorage.setItem('azilearn_student', JSON.stringify(student));
      onSuccess(student);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to identify student', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-text/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-brand-surface dark:bg-brand-card w-full max-w-sm rounded-[3rem] p-10 border border-brand-border shadow-2xl relative z-10 overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-brand-muted hover:text-brand-accent transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                <BookOpen size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-2xl text-brand-text uppercase tracking-tighter">Student Entry</h3>
                <p className="text-xs font-bold text-brand-muted max-w-[200px]">Identify yourself to begin the assessment.</p>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 transition-colors group-focus-within:text-brand-accent" size={18} />
                  <input 
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-0 focus:border-brand-accent outline-none text-brand-text"
                  />
                  {!name && <span className="absolute left-12 top-1/2 -translate-y-1/2 text-brand-muted/30 text-xs font-bold pointer-events-none uppercase tracking-widest">Full Name</span>}
                </div>

                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 transition-colors group-focus-within:text-brand-accent" size={18} />
                  <input 
                    type="text"
                    value={index}
                    onChange={e => setIndex(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-0 focus:border-brand-accent outline-none text-brand-text"
                  />
                  {!index && <span className="absolute left-12 top-1/2 -translate-y-1/2 text-brand-muted/30 text-xs font-bold pointer-events-none uppercase tracking-widest">Index Number (Optional)</span>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full group bg-brand-accent text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95 disabled:grayscale"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Begin Session
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
