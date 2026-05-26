import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  GraduationCap, 
  School, 
  ShieldAlert, 
  Sparkles, 
  Calendar, 
  AlertTriangle,
  User,
  CheckCircle,
  Clock
} from 'lucide-react';
import { forumService, ForumProfile, ForumWarning } from '../services/forumService';
import { useToast } from './Toast';

interface UserProfileCardProps {
  userId: string;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onWarningIssued?: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  userId,
  currentUserId,
  isAdmin,
  onClose,
  onWarningIssued,
}) => {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ForumProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [submittingWarning, setSubmittingWarning] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await forumService.getProfile(userId);
        setProfile(data);
      } catch (err) {
        showToast('Could not fetch user profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId]);

  const handleWarnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningReason.trim()) {
      showToast('Please state a reason for the warning', 'error');
      return;
    }

    setSubmittingWarning(true);
    try {
      const ok = await forumService.warnStudent(userId, currentUserId, warningReason.trim());
      if (ok) {
        showToast(`Official administrative warning registered for @${profile?.username || 'student'}`, 'success');
        setWarningReason('');
        setShowWarningForm(false);
        if (onWarningIssued) onWarningIssued();
      } else {
        throw new Error();
      }
    } catch (err) {
      showToast('Could not issue student warning', 'error');
    } finally {
      setSubmittingWarning(false);
    }
  };

  return (
    <div id="user-profile-card" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1a1a2e]/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        className="w-full max-w-sm rounded-3xl bg-brand-surface border border-brand-border overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with high design orange color gradient background */}
        <div className="h-20 bg-gradient-to-r from-[#FF6B35] to-[#ff8c5a] relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center active:scale-90 transition-all z-10"
          >
            <X size={15} />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-6 pb-6 pt-0 relative select-text">
          {/* Avatar overlap */}
          <div className="relative -mt-10 mb-3 flex justify-between items-end">
            <div className="w-20 h-20 bg-brand-surface border-4 border-brand-surface rounded-2xl overflow-hidden shadow-md flex items-center justify-center text-white text-2xl font-black bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4d]">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
            </div>
            
            {/* Role Badge */}
            <div className="pb-1">
              {profile?.is_admin || profile?.role === 'admin' ? (
                <span className="bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/25 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={8} className="animate-pulse" />
                  Admin Moderator
                </span>
              ) : (
                <span className="bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  <User size={8} />
                  Student Member
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 py-6 animate-pulse">
              <div className="h-5 w-32 bg-brand-border/65 rounded"></div>
              <div className="h-3 w-24 bg-brand-border/45 rounded"></div>
              <div className="space-y-2 pt-2">
                <div className="h-8 bg-brand-border/30 rounded-xl"></div>
                <div className="h-8 bg-brand-border/30 rounded-xl"></div>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-4">
              {/* Names and handle */}
              <div>
                <h3 className="text-sm font-black text-brand-text leading-tight">{profile.full_name}</h3>
                <p className="text-[10px] text-[#FF6B35] font-black tracking-wider mt-0.5 mt-0.5">@{profile.username}</p>
              </div>

              {/* Bio / Meta-details */}
              <div className="space-y-2 pt-1 border-t border-brand-border/40 text-[11px] font-bold text-brand-muted">
                {profile.school && (
                  <div className="flex items-center gap-2.5 leading-snug">
                    <School size={14} className="text-brand-muted shrink-0" />
                    <span>{profile.school}</span>
                  </div>
                )}
                {profile.grade && (
                  <div className="flex items-center gap-2.5 leading-snug">
                    <GraduationCap size={14} className="text-brand-muted shrink-0" />
                    <span>{profile.grade} {profile.class_id ? `• Class ${profile.class_id}` : ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 leading-snug mt-1">
                  <Calendar size={14} className="text-brand-muted shrink-0" />
                  <span>AziLearn verified profile status</span>
                </div>
              </div>

              {/* Warnings System (Admin Only action on Student Profiles) */}
              {isAdmin && profile?.id !== currentUserId && !profile?.is_admin && profile?.role !== 'admin' && (
                <div className="pt-3 border-t border-brand-border/40 mt-3 select-none">
                  {!showWarningForm ? (
                    <button
                      onClick={() => setShowWarningForm(true)}
                      className="w-full bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <ShieldAlert size={12} />
                      Warn Student Account
                    </button>
                  ) : (
                    <motion.form
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleWarnSubmit}
                      className="bg-brand-bg/50 border border-brand-border/60 p-3 rounded-2xl space-y-2.5 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-red-500 tracking-widest flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Issue Academic Warning
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowWarningForm(false)}
                          className="text-[9px] font-black text-brand-muted hover:text-brand-text uppercase transition-colors"
                        >
                          Cancel
                        </button>
                      </div>

                      <textarea
                        value={warningReason}
                        onChange={(e) => setWarningReason(e.target.value)}
                        placeholder="State violation reason clearly (e.g. offensive comments, sharing quiz answers...)"
                        rows={2}
                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-2.5 py-2 text-[10px] font-semibold text-brand-text outline-none focus:border-red-500/50 transition-all resize-none leading-relaxed"
                      />

                      <button
                        type="submit"
                        disabled={submittingWarning || !warningReason.trim()}
                        className="w-full bg-red-500 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                      >
                        {submittingWarning ? 'Registering...' : 'Register Official Warning'}
                      </button>
                    </motion.form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[11px] font-black text-brand-muted uppercase tracking-wider">AziLearn Profile not loaded</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
