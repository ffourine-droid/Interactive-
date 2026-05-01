import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  Search,
  FlaskConical,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ParentStudentDashboard } from '../components/ParentStudentDashboard';

interface ParentPageProps {
  onBack?: () => void;
}

const ParentPage: React.FC<ParentPageProps> = ({ onBack }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    studentName: '',
    schoolName: '',
    grade: '',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentName || !formData.schoolName || !formData.grade || !formData.pin) {
      showToast("Please fill in all details", "error");
      return;
    }

    if (formData.pin.length !== 4) {
      showToast("Code must be 4 digits", "error");
      return;
    }

    setLoading(true);
    try {
      // Find all students matching name, grade and PIN part of parent_code
      // A student might be in multiple classes (English, Math, etc.)
      const { data: studentRecords, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          classes (
            name,
            teachers (
              school_name
            )
          )
        `)
        .ilike('name', formData.studentName.trim())
        .eq('grade', formData.grade)
        .eq('parent_code', formData.pin.padStart(4, '0'));

      if (studentError) throw studentError;

      if (studentRecords && studentRecords.length > 0) {
        // Verify school name matches on at least one record
        const inputSchoolName = formData.schoolName.trim().toLowerCase();
        const validRecords = studentRecords.filter(record => {
          const dbSchoolName = record.classes?.teachers?.school_name || '';
          return dbSchoolName.toLowerCase().includes(inputSchoolName);
        });
        
        if (validRecords.length > 0) {
          // We found valid records. We take the "first" one as the primary profile
          // but our dashboard will need to know about all of them to show all classes.
          // For now, let's pass all valid student IDs to the dashboard.
          setStudent({
            ...validRecords[0],
            all_student_ids: validRecords.map(r => r.id),
            all_class_ids: validRecords.map(r => r.class_id)
          });
          showToast(`Welcome! Viewing results for ${validRecords[0].name}`, "success");
        } else {
          showToast("School name does not match our records for this student.", "error");
        }
      } else {
        showToast("Student not found. Please verify the Name, Grade, and 4-digit Code.", "error");
      }
    } catch (err: any) {
      showToast("Error searching. Try again later.", "error");
    } finally {
      setLoading(false);
    }
  };

  const grades = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-4 pb-12">
      <main className="max-w-md mx-auto py-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-accent transition-colors mb-6 group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center group-hover:border-brand-accent group-hover:bg-brand-accent/5">
              <ArrowLeft size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Go Back</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {!student ? (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-[#FF6B2C] rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-[#FF6B2C]/20 transform rotate-12">
                  <GraduationCap size={32} />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight leading-none">AziLearn</h1>
                  <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em]">Parent Progress Check</p>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-2xl shadow-brand-accent/5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B2C]/5 rounded-full -mr-12 -mt-12 blur-3xl" />
                
                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                  <div className="space-y-2 text-center">
                    <h2 className="text-lg font-black tracking-tight">Parent Access</h2>
                    <p className="text-brand-muted text-[10px] font-medium px-4">Enter details as registered in school.</p>
                  </div>
                    
                  <div className="grid grid-cols-1 gap-4">
                    {/* Student Name */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
                        Child's Full Name
                      </label>
                      <input 
                        type="text"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        placeholder="e.g. Brian Odhiambo"
                        className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-5 font-bold text-sm text-brand-text focus:border-[#FF6B2C] outline-none transition-all placeholder:text-brand-muted/30"
                      />
                    </div>

                    {/* School Name */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2">
                        School Name
                      </label>
                      <input 
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        placeholder="e.g. Hillcrest School"
                        className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-5 font-bold text-sm text-brand-text focus:border-[#FF6B2C] outline-none transition-all placeholder:text-brand-muted/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Grade Selection */}
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

                      {/* 4-digit Access Code */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted px-2 text-right">
                          4-Digit Code
                        </label>
                        <input 
                          type="text"
                          maxLength={4}
                          value={formData.pin}
                          onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                          placeholder="0000"
                          className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-3 px-2 font-black text-xl tracking-[0.2em] text-[#FF6B2C] focus:border-[#FF6B2C] outline-none transition-all text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FF6B2C] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#FF6B2C]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        Check Progress
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 p-5 bg-brand-bg/50 rounded-2xl border border-brand-border/50 border-dashed flex items-start gap-4">
                  <HelpCircle className="text-brand-muted shrink-0" size={18} />
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-0.5">Simple Access</h4>
                    <p className="text-[10px] font-medium text-brand-muted/80 leading-relaxed">
                      Enter the 4-digit code from the teacher to view child's progress.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
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
                  onClick={() => setStudent(null)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-accent transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center group-hover:border-brand-accent group-hover:bg-brand-accent/5">
                    <ArrowLeft size={14} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Switch Student</span>
                </button>
              </div>
              <ParentStudentDashboard student={student} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ParentPage;
