import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  HelpCircle,
  ChevronRight,
  GraduationCap,
  Lock,
  LockKeyhole
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
      showToast("Please fill in all details", "error");
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
        showToast("Student found! Please set a 4-digit access PIN.", "success");
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
          showToast(`Incorrect PIN. ${data.attempts_left} attempts left before account lockout.`, "error");
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
      // Fetch full student and companions securely using parent_get_dashboard RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('parent_get_dashboard', {
        p_student_id: resolvedStudentId
      });

      if (rpcErr || !rpcRes) {
        throw rpcErr || new Error("Retrieval failed");
      }

      const primaryStudent = rpcRes.primary_student || rpcRes;
      const companions = rpcRes.companions || [];

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
    <div className="min-h-screen bg-brand-bg text-brand-text p-4 pb-12">
      <main className="max-w-md mx-auto py-6">
        
        {/* Navigation / Back Header */}
        {!student && onBack && step === 'lookup' && (
          <button 
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-accent transition-colors mb-6 group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center group-hover:border-brand-accent group-hover:bg-brand-accent/5">
              <ArrowLeft size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Go Back</span>
          </button>
        )}

        {/* Transition forms layout */}
        <AnimatePresence mode="wait">
          {!student ? (
            <div className="space-y-6">
              
              {/* Logo / Brand Header */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-[#FF6B2C] rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-[#FF6B2C]/20 transform rotate-12">
                  <GraduationCap size={32} />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight leading-none">AziLearn</h1>
                  <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em]">Parent Progress Check</p>
                </div>
              </div>

              {/* Form container card */}
              <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-2xl shadow-brand-accent/5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B2C]/5 rounded-full -mr-12 -mt-12 blur-3xl" />
                
                {step === 'lookup' && (
                  <motion.div
                    key="lookup"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2 text-center pb-1">
                      <h2 className="text-lg font-black tracking-tight">Parent Access</h2>
                      <p className="text-brand-muted text-[10px] font-medium px-4">Enter details as registered in school.</p>
                    </div>

                    <form onSubmit={handleLookup} className="space-y-5 relative z-10">
                      {/* Name input */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
                          Child's Full Name
                        </label>
                        <input 
                          type="text"
                          value={formData.studentName}
                          onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                          placeholder="e.g. John Mwangi"
                          className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-5 font-bold text-sm text-brand-text focus:border-[#FF6B2C] outline-none transition-all placeholder:text-brand-muted/30"
                        />
                      </div>

                      {/* School Name input */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
                          School Name
                        </label>
                        <input 
                          type="text"
                          value={formData.schoolName}
                          onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                          placeholder="e.g. Starehe Boys"
                          className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-5 font-bold text-sm text-brand-text focus:border-[#FF6B2C] outline-none transition-all placeholder:text-brand-muted/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Grade selection dropdown */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
                            Grade
                          </label>
                          <select 
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                            className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-4 font-bold text-sm text-brand-text focus:border-[#FF6B2C] outline-none appearance-none transition-all"
                          >
                            <option value="">Select...</option>
                            {grades.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                            <option value="KCSE Revision">KCSE</option>
                          </select>
                        </div>

                        {/* Student index number input */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2 text-right">
                            Index Number
                          </label>
                          <input 
                            type="text"
                            value={formData.indexNumber}
                            onChange={(e) => setFormData({ ...formData, indexNumber: e.target.value.replace(/\s/g, '') })}
                            placeholder="e.g. 042"
                            className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-4 font-black text-sm text-brand-text focus:border-[#FF6B2C] outline-none transition-all text-center"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6B2C] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#FF6B2C]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <>
                            Check Progress
                            <ChevronRight size={18} />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-6 p-5 bg-brand-bg/50 rounded-2xl border border-brand-border/50 border-dashed flex items-start gap-4">
                      <HelpCircle className="text-brand-muted shrink-0" size={18} />
                      <div>
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-0.5">Dual-layer Access</h4>
                        <p className="text-[10px] font-medium text-brand-muted/80 leading-relaxed">
                          Enter your child's index number to lookup their profile, then authenticate with your secure parent PIN.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'set_pin' && (
                  <motion.div
                    key="set_pin"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2 text-center pb-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                        <ShieldCheck size={24} />
                      </div>
                      <h2 className="text-lg font-black tracking-tight text-emerald-500 leading-tight">PIN Setup Required</h2>
                      <p className="text-brand-muted text-[10px] font-medium px-2">
                        First-time parent detected. Create a 4-digit PIN to secure future access to {formData.studentName}'s records.
                      </p>
                    </div>

                    <form onSubmit={handleSetPin} className="space-y-5 relative z-10">
                      {/* PIN Selection */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
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
                          className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-5 font-black text-center text-xl tracking-[0.3em] text-[#FF6B2C] focus:border-[#FF6B2C] outline-none transition-all"
                        />
                      </div>

                      {/* PIN Confirmation */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
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
                          className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-5 font-black text-center text-xl tracking-[0.3em] text-[#FF6B2C] focus:border-[#FF6B2C] outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2 pt-2">
                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full bg-[#FF6B2C] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#FF6B2C]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <>
                              Save PIN & View progress
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>

                        <button 
                          type="button"
                          onClick={handleResetToLookup}
                          className="w-full bg-transparent border border-brand-border text-brand-muted py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] hover:text-brand-text transition-all mt-1 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {step === 'enter_pin' && (
                  <motion.div
                    key="enter_pin"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2 text-center pb-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-[#FF6B2C]/10 flex items-center justify-center text-[#FF6B2C] mb-2">
                        <LockKeyhole size={22} />
                      </div>
                      <h2 className="text-lg font-black tracking-tight text-brand-text leading-tight">Secure Access Required</h2>
                      <p className="text-brand-muted text-[10px] font-medium px-4">
                        Please enter your secure 4-digit parent PIN to authorize viewing {formData.studentName}'s records.
                      </p>
                    </div>

                    <form onSubmit={handleVerifyPin} className="space-y-5 relative z-10">
                      {/* Enter PIN */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
                          Enter 4-Digit Parent PIN
                        </label>
                        <input 
                          type="password"
                          name="pin_verify"
                          id="pin_verify"
                          maxLength={4}
                          value={pinValue}
                          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-5 font-black text-center text-xl tracking-[0.3em] text-[#FF6B2C] focus:border-[#FF6B2C] outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2 pt-2">
                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full bg-[#FF6B2C] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#FF6B2C]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <>
                              Verify PIN & View
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>

                        <button 
                          type="button"
                          onClick={handleResetToLookup}
                          className="w-full bg-transparent border border-brand-border text-brand-muted py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] hover:text-brand-text transition-all mt-1 cursor-pointer"
                        >
                          Find another student
                        </button>
                      </div>

                      <p className="text-[10px] text-center font-semibold text-brand-muted leading-relaxed pt-2 border-t border-brand-border/30">
                        Forgot your parent PIN? Please contact {formData.studentName}'s class teacher to reset your parent security credentials.
                      </p>
                    </form>
                  </motion.div>
                )}

              </div>
            </div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2 px-2">
                <button 
                  type="button"
                  onClick={() => setStudent(null)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-accent transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center group-hover:border-brand-accent group-hover:bg-brand-accent/5">
                    <ArrowLeft size={14} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Switch Student</span>
                </button>
              </div>
              <ParentStudentDashboard student={student} parentPin={pinValue} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ParentPage;
