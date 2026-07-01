import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, 
  Search, 
  Plus, 
  X, 
  ArrowLeft, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Phone, 
  MapPin, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import LinkSchoolField from './LinkSchoolField';

interface SchoolSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
  onSchoolLinked: (schoolId: string, schoolName: string) => void;
  canSkip?: boolean;
}

interface SchoolItem {
  id: string;
  name: string;
  county: string | null;
  match_score: number;
}

export const SchoolSetupModal: React.FC<SchoolSetupModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  teacherName,
  onSchoolLinked,
  canSkip = true
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<'search' | 'create' | 'confirmation'>('search');
  
  // Search step states
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Create step states
  const [schoolName, setSchoolName] = useState('');
  const [pin, setPin] = useState('');
  const [contactName, setContactName] = useState(teacherName || '');
  const [contactPhone, setContactPhone] = useState('');
  const [county, setCounty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success Confirmation state
  const [createdSchoolInfo, setCreatedSchoolInfo] = useState<{ id: string; name: string; pin: string } | null>(null);

  // Debounce search text input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Run search query
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchText) {
        setSchools([]);
        setHasSearched(false);
        return;
      }
      setSearching(true);
      try {
        const { data, error } = await supabase.rpc('search_schools', {
          p_query: debouncedSearchText
        });
        if (error) throw error;

        // Safely extract schools array
        let fetchedSchools: SchoolItem[] = [];
        if (data) {
          if (data.schools && Array.isArray(data.schools)) {
            fetchedSchools = data.schools;
          } else if (Array.isArray(data)) {
            fetchedSchools = data;
          } else if (typeof data === 'object' && Array.isArray((data as any).schools)) {
            fetchedSchools = (data as any).schools;
          }
        }
        setSchools(fetchedSchools);
        setHasSearched(true);
      } catch (err: any) {
        console.error('Error searching schools:', err);
        showToast(err.message || 'Fuzzy search failed', 'error');
      } finally {
        setSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchText]);

  // Automatically pre-fill the create form school name when entering step 2
  const handleGoToCreate = () => {
    setSchoolName(searchText.trim());
    setStep('create');
  };

  // Handle selecting an existing school from the search results list
  const handleSelectSchool = async (selectedSchool: SchoolItem) => {
    setSearching(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ school_id: selectedSchool.id })
        .eq('id', teacherId);

      if (error) throw error;

      showToast(`Successfully linked to ${selectedSchool.name}! 🏫`, 'success');
      onSchoolLinked(selectedSchool.id, selectedSchool.name);
      onClose();
    } catch (err: any) {
      console.error('Error linking school:', err);
      showToast(err.message || 'Failed to link school', 'error');
    } finally {
      setSearching(false);
    }
  };

  // Handle submitting the new school creation RPC
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = schoolName.trim();
    if (!trimmedName) {
      showToast('School name is required', 'error');
      return;
    }
    if (pin.length !== 4) {
      showToast('PIN must be exactly 4 digits', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('teacher_create_school', {
        p_name: trimmedName,
        p_pin: pin,
        p_contact_name: contactName.trim() || null,
        p_contact_phone: contactPhone.trim() || null,
        p_county: county.trim() || null
      });

      if (error) throw error;

      const response = data as any;
      if (response && response.success === false) {
        showToast(response.message || 'A school with this name already exists.', 'error');
        return;
      }

      const schoolId = response.school_id;
      const schoolNameReturned = response.school_name || trimmedName;

      // On success, backend already links the teacher to the school!
      // Store info to display in the two-part confirmation step
      setCreatedSchoolInfo({
        id: schoolId,
        name: schoolNameReturned,
        pin: pin
      });
      setStep('confirmation');
      showToast('School created successfully! 🏫🎉', 'success');
    } catch (err: any) {
      console.error('Error creating school:', err);
      showToast(err.message || 'Failed to create school', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishConfirmation = () => {
    if (createdSchoolInfo) {
      onSchoolLinked(createdSchoolInfo.id, createdSchoolInfo.name);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={canSkip ? onClose : undefined}
        className="absolute inset-0 bg-brand-text/40 backdrop-blur-sm"
        id="school-setup-backdrop"
      />

      {/* Main Panel Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-[420px] bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10 font-sans"
        id="school-setup-content"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-brand-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {step === 'create' && (
              <button 
                onClick={() => setStep('search')}
                className="p-1.5 -ml-1 text-brand-muted hover:text-brand-accent transition-colors"
                id="back-to-search-btn"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-brand-text flex items-center gap-1.5">
                <School size={14} className="text-brand-accent" />
                {step === 'search' && 'Link Your School'}
                {step === 'create' && 'Register New School'}
                {step === 'confirmation' && 'School Registered!'}
              </h2>
              <p className="text-[10px] text-brand-muted font-bold tracking-tight">
                {step === 'search' && 'Search and connect with your institution'}
                {step === 'create' && 'Enter your school details'}
                {step === 'confirmation' && 'Administrator onboarding overview'}
              </p>
            </div>
          </div>
          {canSkip && (
            <button 
              onClick={onClose}
              className="p-2 bg-brand-bg hover:bg-brand-border border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-colors"
              id="close-setup-modal-btn"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 no-scrollbar">
          <AnimatePresence mode="wait">
            {step === 'search' && (
              <motion.div
                key="search-step"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <LinkSchoolField
                  teacherId={teacherId}
                  currentSchoolName={searchText}
                  onChangeText={(text) => setSearchText(text)}
                  onLinked={(school) => {
                    showToast(`Successfully linked to ${school.name}! 🏫`, 'success');
                    onSchoolLinked(school.id, school.name);
                    onClose();
                  }}
                />

                {/* Lead to Step 2 (Create) */}
                <div className="pt-2">
                  <button
                    onClick={handleGoToCreate}
                    className="w-full py-3.5 px-4 bg-brand-accent/10 hover:bg-brand-accent/15 text-brand-accent border border-brand-accent/20 hover:border-brand-accent/40 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    id="cant-find-school-btn"
                  >
                    <Plus size={14} />
                    Can't find your school? Create It
                  </button>
                </div>

                {canSkip && (
                  <div className="text-center pt-2">
                    <button
                      onClick={onClose}
                      className="text-[9px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors"
                      id="skip-school-setup-btn"
                    >
                      Decide Later / Skip
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'create' && (
              <motion.div
                key="create-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Guidance Box */}
                <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-brand-accent">
                    <ShieldAlert size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Duplicate Prevention Warning</span>
                  </div>
                  <p className="text-[9px] font-bold text-brand-muted leading-relaxed">
                    Make sure this is really a new school. If a similar name showed up in your search, it might be the same school with slightly different spelling or punctuation — tap that one instead. If your school really isn't listed, you can create it below. Tip: include your school's town or area in the name if other schools share a similar name (e.g. 'St. Mary's — Kisumu').
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateSchool} className="space-y-3">
                  {/* Name Input */}
                  <div className="space-y-1">
                    <label htmlFor="create-school-name" className="block text-[8px] font-black uppercase tracking-widest text-brand-muted px-1">
                      School Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      id="create-school-name"
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. Riverside Junior School"
                      className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-medium focus:border-brand-accent outline-none transition-all"
                    />
                  </div>

                  {/* 4-Digit PIN */}
                  <div className="space-y-1">
                    <label htmlFor="create-school-pin" className="block text-[8px] font-black uppercase tracking-widest text-brand-muted px-1">
                      Choose 4-Digit School Admin PIN <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      id="create-school-pin"
                      required
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-2.5 px-4 font-black text-center text-lg tracking-[0.3em] text-brand-accent focus:border-brand-accent outline-none transition-all"
                    />
                    <p className="text-[7.5px] font-bold text-brand-muted px-1 mt-0.5">
                      Choose a 4-digit PIN for your school account. You'll use this to log in as the school admin.
                    </p>
                  </div>

                  {/* Contact Name */}
                  <div className="space-y-1">
                    <label htmlFor="create-contact-name" className="block text-[8px] font-black uppercase tracking-widest text-brand-muted px-1">
                      Contact Name (Optional)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        id="create-contact-name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-medium focus:border-brand-accent outline-none transition-all"
                      />
                      <User size={12} className="absolute left-3.5 top-3.5 text-brand-muted" />
                    </div>
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label htmlFor="create-contact-phone" className="block text-[8px] font-black uppercase tracking-widest text-brand-muted px-1">
                      Contact Phone (Optional)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        id="create-contact-phone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. +254 700 000000"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-medium focus:border-brand-accent outline-none transition-all"
                      />
                      <Phone size={12} className="absolute left-3.5 top-3.5 text-brand-muted" />
                    </div>
                  </div>

                  {/* County */}
                  <div className="space-y-1">
                    <label htmlFor="create-county" className="block text-[8px] font-black uppercase tracking-widest text-brand-muted px-1">
                      County (Optional)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        id="create-county"
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        placeholder="e.g. Nairobi / Kisumu"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-medium focus:border-brand-accent outline-none transition-all"
                      />
                      <MapPin size={12} className="absolute left-3.5 top-3.5 text-brand-muted" />
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('search')}
                      className="flex-1 py-3 border border-brand-border rounded-xl text-[9px] font-black uppercase tracking-widest text-brand-muted hover:bg-brand-bg transition-colors"
                      id="cancel-create-btn"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !schoolName.trim() || pin.length !== 4}
                      className="flex-1 py-3 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-colors"
                      id="submit-create-school-btn"
                    >
                      {submitting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        'Register School'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'confirmation' && (
              <motion.div
                key="confirmation-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 text-center"
              >
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto">
                  <CheckCircle2 size={32} />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">
                    School Created!
                  </h3>
                  <p className="text-[10px] text-brand-muted font-bold">
                    You're now the admin for <strong className="text-brand-text">{createdSchoolInfo?.name}</strong>.
                  </p>
                </div>

                <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl text-left space-y-2.5">
                  <p className="text-[9px] text-brand-muted font-bold leading-normal">
                    To manage school-wide settings, broadcasts, and see all teachers/students, sign in separately using:
                  </p>
                  
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between border-b border-brand-border pb-1">
                      <span className="font-black uppercase tracking-wider text-brand-muted text-[8px]">School Name:</span>
                      <span className="font-extrabold text-brand-text">{createdSchoolInfo?.name}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="font-black uppercase tracking-wider text-brand-muted text-[8px]">PIN:</span>
                      <span className="font-mono font-black text-brand-accent tracking-widest">{createdSchoolInfo?.pin}</span>
                    </div>
                  </div>

                  <p className="text-[8px] font-black text-brand-muted uppercase tracking-wider text-center border-t border-brand-border/60 pt-2">
                    ⚠️ Write this PIN down. It won't be displayed again!
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleFinishConfirmation}
                    className="w-full py-3.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-colors"
                    id="finish-confirmation-btn"
                  >
                    Continue as Teacher →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
