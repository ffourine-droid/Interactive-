import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, X, Loader2, BookOpen, GraduationCap } from 'lucide-react';
import { examService } from '../services/examService';
import { useToast } from './Toast';

interface StudentIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: { id: string; name: string; grade?: string }) => void;
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
  const [selectedGrade, setSelectedGrade] = useState(grade);

  const grades = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (!selectedGrade) {
      showToast('Please select your grade', 'error');
      return;
    }

    setLoading(true);
    try {
      const student = await examService.identifyStudent(name.trim(), undefined, selectedGrade);
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
            className="bg-brand-surface w-full max-w-sm rounded-[3rem] p-10 border border-brand-border shadow-2xl relative z-10 overflow-hidden"
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
                <h3 className="font-black text-2xl text-brand-text uppercase tracking-tighter">Who Are You?</h3>
                <p className="text-xs font-bold text-brand-muted max-w-[200px]">
                  Enter your name and grade so your teacher can identify you.
                </p>
              </div>

              <div className="w-full space-y-4">
                {/* Name field */}
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 transition-colors group-focus-within:text-brand-accent" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none text-brand-text transition-all"
                    placeholder="Your Full Name"
                  />
                </div>

                {/* Grade selector */}
                <div className="relative group">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 transition-colors group-focus-within:text-brand-accent pointer-events-none" size={18} />
                  <select
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none text-brand-text appearance-none transition-all"
                  >
                    <option value="">Select Grade...</option>
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !name.trim() || !selectedGrade}
                  className="w-full group bg-brand-accent text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Begin Assessment
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
