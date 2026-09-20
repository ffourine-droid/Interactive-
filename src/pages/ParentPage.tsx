import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  ChevronRight,
  GraduationCap,
  LockKeyhole,
  LogOut,
  User,
  Building2,
  Hash,
  BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ParentStudentDashboard } from '../components/ParentStudentDashboard';

interface ParentPageProps {
  onBack?: () => void;
}

const ParentPage: React.FC<ParentPageProps> = ({ onBack }) => {
  const { showToast } = useToast();
  
  // Transition steps: 'lookup' | 'set_pin' | 'enter_pin'
  const [step, setStep] = useState<'lookup' | 'set_pin' | 'enter_pin'>('lookup');
  
  // Storage of student ID and details after successful lookup
  const [studentId, setStudentId] = useState<string>('');
  const [student, setStudent] = useState<any>(null);
  
  // PIN states
  const [pinValue, setPinValue] = useState<string>('');
  const [confirmPinValue, setConfirmPinValue] = useState<string>('');
  
  // Look up details
  const [formData, setFormData] = useState({
    studentName: '',
    schoolName: '',
    grade: '',
    indexNumber: ''
  });
  
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentName.trim() || !formData.schoolName.trim() || !formData.grade || !formData.indexNumber.trim()) {
      showToast("Please fill in all student details", "error");
      return;
    }

    setLoading(true);
    try {
      // Direct call to Postgres view:
      const { data, error } = await supabase
        .from('students_public')
        .select('*')
        .ilike('school_name', formData.schoolName.trim())
        .eq('grade', formData.grade)
        .eq('index_number', formData.indexNumber.trim())
        .ilike('name', `%${formData.studentName.trim()}%`)
        .maybeSingle();

      if (error) {
        showToast(error.message || "Error searching child. Try again.", "error");
        return;
      }

      if (!data) {
        showToast("Student not found. Please verify the Details.", "error");
        return;
      }

      // Successful lookup
      const resolvedStudentId = data.id;
      if (!resolvedStudentId) {
        showToast("Unable to resolve Student ID. Contact teacher.", "error");
        return;
      }

      setStudentId(resolvedStudentId);
      setPinValue('');
      setConfirmPinValue('');

      if (data.pin_set === false) {
        setStep('set_pin');
        showToast("Student found! Create your 4-digit parent PIN.", "success");
      } else {
        setStep('enter_pin');
        showToast("Student found! Enter your 4-digit PIN.", "success");
      }
    } catch (err: any) {
      showToast("Error searching. Try again later.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Submits first-time PIN to set_parent_pin RPC
  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pinValue.length !== 4 || confirmPinValue.length !== 4) {
      showToast("PIN must be exactly 4 digits", "error");
      return;
    }

    if (pinValue !== confirmPinValue) {
      showToast("PINs do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('set_parent_pin', {
        p_student_id: studentId,
        p_pin: pinValue
      });

      if (error) {
        showToast(error.message || "Failed to set PIN", "error");
        return;
      }

      const isSuccess = data === true || data?.success === true || (data !== false);
      if (!isSuccess) {
        showToast("Could not set PIN. Please try again.", "error");
        return;
      }

      showToast("PIN set successfully!", "success");
      await loginParent(studentId);
    } catch (err: any) {
      showToast("Error setting PIN", "error");
    } finally {
      setLoading(false);
    }
  };

  // Submits returning parent's PIN to verify_parent_pin RPC
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pinValue.length !== 4) {
      showToast("Please enter 4 digits", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_parent_pin', {
        p_student_id: studentId,
        p_pin: pinValue
      });

      if (error) {
        showToast(error.message || "Verification failed. Try again.", "error");
        return;
      }

      const isSuccess = data === true || data?.success === true;
      if (!isSuccess) {
        if (data?.attempts_left !== undefined) {
          showToast(`Incorrect PIN. ${data.attempts_left} attempts left.`, "error");
        } else {
          showToast("Incorrect PIN. Please try again.", "error");
        }
        return;
      }

      showToast("Access granted!", "success");
      await loginParent(studentId);
    } catch (err: any) {
      showToast("Error verifying PIN", "error");
    } finally {
      setLoading(false);
    }
  };

  // Pulls full student data from the database and displays the dashboard
  const loginParent = async (resolvedStudentId: string) => {
    try {
      let primaryStudent: any = null;
      let companions: any[] = [];

      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('parent_get_dashboard', {
          p_student_id: resolvedStudentId
        });

        if (!rpcErr && rpcRes && rpcRes.success !== false) {
          primaryStudent = rpcRes.student;
          companions = rpcRes.companions || [];
        }
      } catch (e) {
        console.warn("parent_get_dashboard RPC notice:", e);
      }

      if (!primaryStudent) {
        const { data: directStudent } = await supabase
          .from('students')
          .select('*, classes:class_id(name)')
          .eq('id', resolvedStudentId)
          .maybeSingle();

        if (directStudent) {
          primaryStudent = directStudent;
        } else {
          const { data: pubStudent } = await supabase
            .from('students_public')
            .select('*')
            .eq('id', resolvedStudentId)
            .maybeSingle();
          primaryStudent = pubStudent;
        }
      }

      if (!primaryStudent || !primaryStudent.id) {
        showToast("Error launching dashboard: student data missing", "error");
        return;
      }

      const allStudentIds = companions && companions.length > 0 
        ? companions.map((c: any) => c.id) 
        : [primaryStudent.id];
      const allClassIds = companions && companions.length > 0 
        ? companions.map((c: any) => c.class_id) 
        : [primaryStudent.class_id];

      setStudent({
        ...primaryStudent,
        all_student_ids: allStudentIds,
        all_class_ids: allClassIds
      });
    } catch (err: any) {
      showToast("Error launching dashboard", "error");
    }
  };

  const handleResetToLookup = () => {
    setStep('lookup');
    setStudentId('');
    setPinValue('');
    setConfirmPinValue('');
  };

  const grades = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-4 sm:p-6 pb-16">
      <div className={`${student ? 'max-w-5xl' : 'max-w-md'} mx-auto`}>
        
        {/* Navigation / Back Header */}
        {!student && onBack && (
          <div className="mb-6">
            <button 
              type="button"
              onClick={step === 'lookup' ? onBack : handleResetToLookup}
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors py-2 px-3 rounded-lg hover:bg-brand-surface border border-transparent hover:border-brand-border"
            >
              <ArrowLeft size={16} />
              <span>{step === 'lookup' ? 'Back to Portals' : 'Back to Search'}</span>
            </button>
          </div>
        )}

        {/* Transition forms layout */}
        <AnimatePresence mode="wait">
          {!student ? (
            <div className="space-y-6">
              
              {/* Clean Brand Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 items-center justify-center text-brand-accent mb-1 shadow-sm">
                  <GraduationCap size={26} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-brand-text">Parent Portal</h1>
                <p className="text-xs text-brand-muted max-w-xs mx-auto leading-relaxed">
                  View your child's assignments, test scores, study progress, and teacher remarks.
                </p>
              </div>

              {/* Form container card */}
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 shadow-sm">
                {step === 'lookup' && (
                  <motion.div
                    key="lookup"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    <div className="pb-1 border-b border-brand-border/60">
                      <h2 className="text-sm font-bold text-brand-text">Student Search</h2>
                      <p className="text-xs text-brand-muted mt-0.5">Enter details as registered with the school</p>
                    </div>

                    <form onSubmit={handleLookup} className="space-y-4">
                      {/* Name input */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-text">
                          <User size={14} className="text-brand-muted" />
                          Child's Full Name
                        </label>
                        <input 
                          type="text"
                          value={formData.studentName}
                          onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                          placeholder="e.g. John Mwangi"
                          className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 px-3.5 text-sm font-medium text-brand-text focus:border-brand-accent focus:bg-brand-surface outline-none transition-all placeholder:text-brand-muted/40"
                        />
                      </div>

                      {/* School Name input */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-text">
                          <Building2 size={14} className="text-brand-muted" />
                          School Name
                        </label>
                        <input 
                          type="text"
                          value={formData.schoolName}
                          onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                          placeholder="e.g. Starehe Boys"
                          className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 px-3.5 text-sm font-medium text-brand-text focus:border-brand-accent focus:bg-brand-surface outline-none transition-all placeholder:text-brand-muted/40"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Grade selection dropdown */}
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-text">
                            <BookOpen size={14} className="text-brand-muted" />
                            Grade / Level
                          </label>
                          <select 
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                            className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 px-3 text-sm font-medium text-brand-text focus:border-brand-accent focus:bg-brand-surface outline-none transition-all cursor-pointer"
                          >
                            <option value="">Select Grade</option>
                            {grades.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                            <option value="KCSE Revision">KCSE Revision</option>
                          </select>
                        </div>

                        {/* Student index number input */}
                        <div className="space-y-1.5">
                          <label className="flex items-center justify-between text-xs font-semibold text-brand-text">
                            <span className="flex items-center gap-1.5">
                              <Hash size={14} className="text-brand-muted" />
                              Index No.
                            </span>
                          </label>
                          <input 
                            type="text"
                            value={formData.indexNumber}
                            onChange={(e) => setFormData({ ...formData, indexNumber: e.target.value.replace(/\s/g, '') })}
                            placeholder="e.g. 042"
                            className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 px-3.5 text-sm font-semibold text-brand-text focus:border-brand-accent focus:bg-brand-surface outline-none transition-all text-center tracking-wider"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 bg-brand-accent text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Locating Student...</span>
                          </>
                        ) : (
                          <>
                            <span>Find Progress Records</span>
                            <ChevronRight size={16} />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="pt-3 border-t border-brand-border/60 flex items-center justify-center gap-2 text-xs text-brand-muted">
                      <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                      <span>Protected with 4-digit Parent Security PIN</span>
                    </div>
                  </motion.div>
                )}

                {step === 'set_pin' && (
                  <motion.div
                    key="set_pin"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    <div className="text-center pb-2">
                      <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-2">
                        <ShieldCheck size={20} />
                      </div>
                      <h2 className="text-base font-bold text-brand-text">Create Access PIN</h2>
                      <p className="text-xs text-brand-muted mt-1 max-w-xs mx-auto">
                        Choose a 4-digit PIN to secure future access to {formData.studentName}'s records.
                      </p>
                    </div>

                    <form onSubmit={handleSetPin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-brand-text text-center">
                          Choose 4-Digit PIN
                        </label>
                        <input 
                          type="password"
                          name="pin_setup"
                          id="pin_setup"
                          maxLength={4}
                          value={pinValue}
                          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          autoFocus
                          className="w-full max-w-[200px] mx-auto block bg-brand-bg border-2 border-brand-border rounded-xl py-2.5 text-center text-xl font-bold tracking-[0.4em] text-brand-accent focus:border-brand-accent focus:bg-brand-surface outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-brand-text text-center">
                          Confirm 4-Digit PIN
                        </label>
                        <input 
                          type="password"
                          name="confirm_pin_setup"
                          id="confirm_pin_setup"
                          maxLength={4}
                          value={confirmPinValue}
                          onChange={(e) => setConfirmPinValue(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full max-w-[200px] mx-auto block bg-brand-bg border-2 border-brand-border rounded-xl py-2.5 text-center text-xl font-bold tracking-[0.4em] text-brand-accent focus:border-brand-accent focus:bg-brand-surface outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2 pt-2">
                        <button 
                          type="submit"
                          disabled={loading || pinValue.length !== 4 || confirmPinValue.length !== 4}
                          className="w-full bg-brand-accent text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <span>Save PIN & Open Dashboard</span>
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>

                        <button 
                          type="button"
                          onClick={handleResetToLookup}
                          className="w-full bg-transparent text-brand-muted hover:text-brand-text py-2 text-xs font-medium transition-colors"
                        >
                          Cancel & return to search
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {step === 'enter_pin' && (
                  <motion.div
                    key="enter_pin"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    <div className="text-center pb-2">
                      <div className="mx-auto w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent mb-2">
                        <LockKeyhole size={20} />
                      </div>
                      <h2 className="text-base font-bold text-brand-text">Enter Security PIN</h2>
                      <p className="text-xs text-brand-muted mt-1 max-w-xs mx-auto">
                        Enter your 4-digit parent PIN for <span className="font-semibold text-brand-text">{formData.studentName}</span>
                      </p>
                    </div>

                    <form onSubmit={handleVerifyPin} className="space-y-4">
                      <div className="space-y-1.5">
                        <input 
                          type="password"
                          name="pin_verify"
                          id="pin_verify"
                          maxLength={4}
                          value={pinValue}
                          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          autoFocus
                          className="w-full max-w-[200px] mx-auto block bg-brand-bg border-2 border-brand-border rounded-xl py-2.5 text-center text-xl font-bold tracking-[0.4em] text-brand-accent focus:border-brand-accent focus:bg-brand-surface outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2 pt-2">
                        <button 
                          type="submit"
                          disabled={loading || pinValue.length !== 4}
                          className="w-full bg-brand-accent text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <span>Verify & Open Records</span>
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>

                        <button 
                          type="button"
                          onClick={handleResetToLookup}
                          className="w-full bg-transparent text-brand-muted hover:text-brand-text py-2 text-xs font-medium transition-colors"
                        >
                          Find another student
                        </button>
                      </div>

                      <p className="text-[11px] text-center text-brand-muted pt-3 border-t border-brand-border/60">
                        Forgot PIN? Contact the student's class teacher to reset your credentials.
                      </p>
                    </form>
                  </motion.div>
                )}

              </div>
            </div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Top Navigation Bar */}
              <div className="flex items-center justify-between py-2 border-b border-brand-border">
                <button 
                  type="button"
                  onClick={() => setStudent(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-brand-accent transition-colors py-1.5 px-3 rounded-lg hover:bg-brand-surface"
                >
                  <ArrowLeft size={15} />
                  <span>Switch Student</span>
                </button>

                {onBack && (
                  <button 
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors py-1.5 px-3 rounded-lg hover:bg-brand-surface"
                  >
                    <span>Exit Portal</span>
                    <LogOut size={15} />
                  </button>
                )}
              </div>

              <ParentStudentDashboard student={student} parentPin={pinValue} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ParentPage;

