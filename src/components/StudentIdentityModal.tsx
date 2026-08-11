import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, X, Loader2, BookOpen, GraduationCap, AlertCircle, CheckCircle, UserPlus, Search } from 'lucide-react';
import { useToast } from './Toast';
import { useStudent } from '../contexts/StudentContext';
import { resolveStudentIdentity, createNewGuestStudent, StudentRecord } from '../services/studentIdentityService';

interface StudentIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: { id: string; name: string; grade?: string; class_id?: string | null }) => void;
  grade?: string;
  classId?: string | null;
}

export const StudentIdentityModal: React.FC<StudentIdentityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  grade = 'Grade 7',
  classId = null
}) => {
  const { showToast } = useToast();
  const { identifyStudent } = useStudent();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState(grade);
  
  // Modal sub-steps: 'INPUT' | 'NOT_FOUND_CONFIRM' | 'PICKER'
  const [modalStep, setModalStep] = useState<'INPUT' | 'NOT_FOUND_CONFIRM' | 'PICKER'>('INPUT');
  const [candidates, setCandidates] = useState<StudentRecord[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<StudentRecord | null>(null);

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  const resetState = () => {
    setModalStep('INPUT');
    setCandidates([]);
    setSelectedCandidate(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleApplyStudent = async (studentData: StudentRecord) => {
    try {
      const studentObj = await identifyStudent(studentData.name, studentData.grade || selectedGrade || 'Grade 7', studentData.class_id || classId);
      onSuccess({
        id: studentData.id,
        name: studentData.name,
        grade: studentData.grade || selectedGrade,
        class_id: studentData.class_id || classId
      });
      handleClose();
    } catch (err: any) {
      // Fallback: use studentData directly
      onSuccess({
        id: studentData.id,
        name: studentData.name,
        grade: studentData.grade || selectedGrade,
        class_id: studentData.class_id || classId
      });
      handleClose();
    }
  };

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
      // 1. Query roster using resolveStudentIdentity (no device_id lookup used)
      const res = await resolveStudentIdentity(name.trim(), classId, selectedGrade);

      if (res.status === 'EXACT_MATCH' && res.student) {
        // 2. Exact match found -> use directly, no confirmation needed
        await handleApplyStudent(res.student);
      } else if (res.status === 'MULTIPLE_MATCHES' && res.candidates && res.candidates.length > 0) {
        // 4. Multiple / near matches found -> show picker
        setCandidates(res.candidates);
        setSelectedCandidate(res.candidates[0]);
        setModalStep('PICKER');
      } else {
        // 3. Not found on roster -> show explicit confirmation ("is this your first time here?")
        setModalStep('NOT_FOUND_CONFIRM');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to check roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNewStudent = async () => {
    setLoading(true);
    try {
      // "Yes, I'm new" -> explicit self registration
      const newStudent = await createNewGuestStudent(name.trim(), selectedGrade || 'Grade 7', classId);
      await handleApplyStudent(newStudent);
      showToast('Welcome! Your guest profile has been created.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create guest profile', 'error');
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
            onClick={handleClose}
            className="absolute inset-0 bg-brand-text/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-brand-surface w-full max-w-md rounded-[3rem] p-8 md:p-10 border border-brand-border shadow-2xl relative z-10 overflow-hidden"
          >
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 text-brand-muted hover:text-brand-accent transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                {modalStep === 'NOT_FOUND_CONFIRM' ? <UserPlus size={32} /> : <BookOpen size={32} />}
              </div>

              {/* STEP 1: INPUT NAME */}
              {modalStep === 'INPUT' && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-black text-2xl text-brand-text uppercase tracking-tighter">Enter Your Name</h3>
                    <p className="text-xs font-bold text-brand-muted max-w-[260px]">
                      Enter your full name and grade so your teacher can identify you on the roster.
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
                        autoFocus
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
                          Continue
                          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: NOT FOUND CONFIRMATION */}
              {modalStep === 'NOT_FOUND_CONFIRM' && (
                <div className="w-full space-y-6 text-center">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">
                      <AlertCircle size={14} />
                      <span>Name Not Found</span>
                    </div>
                    <h3 className="font-black text-xl text-brand-text">
                      We couldn't find "<span className="text-brand-accent">{name.trim()}</span>" in this class roster.
                    </h3>
                    <p className="text-xs font-semibold text-brand-muted leading-relaxed">
                      Is this your first time joining this class?
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Option 1: Yes, I'm new */}
                    <button
                      onClick={handleConfirmNewStudent}
                      disabled={loading}
                      className="w-full bg-brand-accent text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                      Yes, I'm new (Create Guest Profile)
                    </button>

                    {/* Option 2: No, let me check my name */}
                    <button
                      onClick={() => setModalStep('INPUT')}
                      disabled={loading}
                      className="w-full bg-brand-bg border border-brand-border text-brand-text py-4 rounded-2xl font-bold text-xs transition-all hover:bg-brand-border/40 active:scale-95 disabled:opacity-50"
                    >
                      No, let me check my name for typos
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CANDIDATE PICKER */}
              {modalStep === 'PICKER' && (
                <div className="w-full space-y-6 text-left">
                  <div className="text-center space-y-2">
                    <h3 className="font-black text-xl text-brand-text uppercase tracking-tight">Select Your Name</h3>
                    <p className="text-xs font-semibold text-brand-muted">
                      Multiple roster entries matched "<span className="text-brand-accent">{name.trim()}</span>". Please select which student is you:
                    </p>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {candidates.map(cand => (
                      <div
                        key={cand.id}
                        onClick={() => setSelectedCandidate(cand)}
                        className={`p-4 rounded-2xl border text-sm font-bold cursor-pointer flex items-center justify-between transition-all ${
                          selectedCandidate?.id === cand.id
                            ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-sm'
                            : 'bg-brand-bg border-brand-border text-brand-text hover:border-brand-accent/50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-black">{cand.name}</span>
                          <span className="text-[11px] font-normal text-brand-muted">
                            {cand.grade || selectedGrade} {cand.index_number ? `• Index: ${cand.index_number}` : ''}
                          </span>
                        </div>
                        {selectedCandidate?.id === cand.id && (
                          <CheckCircle className="text-brand-accent shrink-0" size={18} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => selectedCandidate && handleApplyStudent(selectedCandidate)}
                      disabled={loading || !selectedCandidate}
                      className="w-full bg-brand-accent text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Selection'}
                    </button>

                    <button
                      onClick={handleConfirmNewStudent}
                      disabled={loading}
                      className="w-full bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text py-3 rounded-2xl font-bold text-xs transition-all text-center"
                    >
                      None of these — I'm a new student
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

