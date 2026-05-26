import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Pin, Trash2, ShieldAlert, Award, CheckCircle2, AlertOctagon,
  RefreshCw, MessageSquare, Plus, AlertTriangle, ShieldCheck, HelpCircle,
  Clock, School, User, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { communityService, Board, Post, Flag, Warning } from '../services/communityService';
import { NotificationBell } from '../components/NotificationBell';
import { attachmentService } from '../services/attachmentService';

interface ModerationPageProps {
  onBack?: () => void;
  embedMode?: boolean;
}

export default function ModerationPage({ onBack, embedMode = false }: ModerationPageProps) {
  const { showToast } = useToast();
  const [teacher, setTeacher] = useState<{ id: string; name: string; school_name?: string } | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'boards' | 'flags' | 'warnings'>('boards');

  // Database lists
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // Modals & form fields
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTarget, setWarningTarget] = useState<{ id: string; name: string } | null>(null);
  const [warningReason, setWarningReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Load teacher state on load
  useEffect(() => {
    const cached = localStorage.getItem('azilearn_teacher');
    if (cached) {
      try {
        setTeacher(JSON.parse(cached));
      } catch (e) {
        setTeacher(null);
      }
    }
  }, []);

  // Simulate Teacher Account for easy debugging/testing
  const handleSimulateLogin = () => {
    const mockT = {
      id: 'teacher-dan',
      name: 'Teacher Daniel Mwangi',
      school_name: 'Amani Academy'
    };
    localStorage.setItem('azilearn_teacher', JSON.stringify(mockT));
    setTeacher(mockT);
    showToast('Simulated Teacher Daniel Mwangi successful login!', 'success');
  };

  // 2. Fetch boards & tools when teacher exists
  useEffect(() => {
    if (teacher) {
      fetchBoards();
      fetchFlags();
      fetchWarnings();
    }
  }, [teacher]);

  // 3. Keep posts in selected board up to date
  useEffect(() => {
    if (selectedBoard && teacher) {
      fetchPosts(selectedBoard.id);
    }
  }, [selectedBoard, teacher]);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const fetched = await communityService.getAllBoards();
      setBoards(fetched || []);
      if (fetched && fetched.length > 0) {
        setSelectedBoard(fetched[0]);
      }
    } catch (e) {
      showToast('Error loading boards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (boardId: string) => {
    try {
      const data = await communityService.getPosts(boardId);
      setPosts(data || []);
    } catch (e) {
      showToast('Error loading board feed', 'error');
    }
  };

  const fetchFlags = async () => {
    try {
      const data = await communityService.getUnresolvedFlags();
      setFlags(data || []);
    } catch (e) {
      console.warn('Error reading flags');
    }
  };

  const fetchWarnings = async () => {
    if (!teacher) return;
    try {
      const data = await communityService.getWarningsForTeacher(teacher.id);
      setWarnings(data || []);
    } catch (e) {
      console.warn('Error reading warnings history');
    }
  };

  // Moderation Handlers
  const handlePinToggle = async (post: Post) => {
    try {
      const nextPinState = !post.is_pinned;
      await communityService.pinPost(post.id, nextPinState);
      
      // Update locally
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: nextPinState } : p));
      showToast(nextPinState ? 'Post pinned on community board! 📌' : 'Post unpinned successfully', 'success');
      
      // Auto-trigger notification for student post pinned in mock client
      if (nextPinState) {
        communityService.addLocalNotification(
          post.author_id,
          'post_pinned',
          `Your post "${post.title.substring(0, 30)}" has been pinned by Teacher ${teacher?.name.split(' ').pop()}! 📌`
        );
      }
    } catch (e) {
      showToast('Action failed', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to remove this post from public boards?')) return;
    try {
      await communityService.deletePost(postId);
      await attachmentService.deleteAttachmentsForPost(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_deleted: true } : p));
      showToast('Post removed successfully and associated attachment files cleared! 🛡️', 'success');
    } catch (e) {
      showToast('Deletion failed', 'error');
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    try {
      await communityService.resolveFlag(flagId);
      setFlags(prev => prev.filter(f => f.id !== flagId));
      showToast('Report marked as resolved successfully!', 'success');
    } catch (e) {
      showToast('Failed to resolve flag', 'error');
    }
  };

  const openWarningSelector = (studentId: string, studentName: string) => {
    setWarningTarget({ id: studentId, name: studentName });
    setShowWarningModal(true);
  };

  const handleWarnSubmit = async () => {
    if (!teacher || !warningTarget || !warningReason.trim()) return;
    setSubmitting(true);
    try {
      await communityService.warnStudent(warningTarget.id, teacher.id, warningReason.trim());
      showToast(`Official warning shared with student ${warningTarget.name}`, 'success');
      
      // Auto-trigger warnings notification inside mock local system
      communityService.addLocalNotification(
        warningTarget.id,
        'warning_received',
        `Official warning received: "${warningReason.trim()}"`
      );

      setShowWarningModal(false);
      setWarningReason('');
      setWarningTarget(null);
      fetchWarnings();
    } catch (e) {
      showToast('Failed to write warning', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const calcTimeAgo = (dateString: string): string => {
    if (!dateString) return 'some time ago';
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={embedMode ? "w-full flex-grow flex flex-col font-sans" : "min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans pb-10"}>
      
      {/* HEADER BAR */}
      {!embedMode && (
        <header className="sticky top-0 z-[100] bg-brand-surface/95 backdrop-blur-md border-b border-brand-border px-4 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onBack?.()}
              className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-text active:scale-90 transition-transform shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none text-brand-text uppercase">
                🛡️ Teacher Moderation Terminal
              </h1>
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mt-1">
                Forum supervision & Student guidelines
              </p>
            </div>
          </div>

          {teacher && (
            <NotificationBell userId={teacher.id} />
          )}
        </header>
      )}

      {/* CONTENT PANEL */}
      <div className={embedMode ? "w-full flex-grow flex flex-col" : "max-w-2xl mx-auto w-full px-4 pt-6 flex-grow flex flex-col"}>
        
        {/* TEACHER AUTH DETECTOR/SIMULATOR */}
        {!teacher ? (
          <div className="text-center py-20 bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 flex flex-col items-center justify-center my-10 max-w-md mx-auto">
            <School className="text-brand-muted mb-4 animate-bounce" size={48} />
            <h2 className="text-lg font-black tracking-tight uppercase">Instructor Access Restricted</h2>
            <p className="text-xs text-brand-muted px-6 mt-2 leading-relaxed">
              Authenticate via the school workspace portal to access moderations, reports, pins, and warnings dashboard.
            </p>
            <button
              onClick={handleSimulateLogin}
              className="mt-6 w-full max-w-xs bg-[#FF6B35] text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#FF6B35]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              Simulate Teacher Login
            </button>
            <p className="text-[9px] text-brand-muted/70 uppercase font-black tracking-widest mt-3">
              Easy Evaluate Sandbox mode
            </p>
          </div>
        ) : (
          
          /* ACTIVE MODERARTION PORTAL */
          <div className="space-y-6 flex-grow">
            
            {/* Nav Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-brand-surface border border-brand-border p-1.5 rounded-2xl shadow-sm">
              {[
                { id: 'boards', label: 'Boards Feed', count: boards.length },
                { id: 'flags', label: 'Flagged Posts', count: flags.length },
                { id: 'warnings', label: 'Warnings Logs', count: warnings.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all text-center relative ${
                    activeTab === tab.id
                      ? 'bg-[#FF6B35] text-white shadow-sm'
                      : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  <span className="block truncate">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[8px] font-black rounded-full flex items-center justify-center px-1 border-2 ${
                      activeTab === tab.id ? 'bg-white text-[#FF6B35] border-[#FF6B35]' : 'bg-[#FF6B35] text-white border-brand-surface'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* TAB CONTENT SECTIONS */}
            {activeTab === 'boards' && (
              <div className="space-y-6">
                
                {/* Board Selector horizontal list */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBoard(b)}
                      className={`px-4 py-2 border rounded-full text-xs font-black uppercase tracking-tight transition-all shrink-0 active:scale-95 ${
                        selectedBoard?.id === b.id
                          ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-[#FF6B35]'
                          : 'bg-brand-surface border-brand-border text-brand-muted'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>

                {/* Posts inside Board */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-brand-muted uppercase tracking-wider px-2 flex items-center justify-between">
                    <span>📚 Board content feed:</span>
                    <span className="text-brand-accent">{selectedBoard?.subject}</span>
                  </h3>

                  {posts.length === 0 ? (
                    <div className="py-20 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2rem]">
                      <HelpCircle className="mx-auto text-brand-muted/40 mb-3 animate-bounce" size={32} />
                      <p className="text-xs font-bold text-brand-muted">This board feed is currently empty.</p>
                      <p className="text-[10px] text-brand-muted/70 mt-1">Share content in student view to see them populate here!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((p) => (
                        <div
                          key={p.id}
                          className={`bg-brand-surface border rounded-3xl p-5 text-left transition-all ${
                            p.is_deleted ? 'bg-red-500/5 border-red-500/10' : 'border-brand-border'
                          } ${p.is_pinned ? 'border-amber-500/40' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {p.is_pinned && (
                                <span className="flex items-center gap-1 text-[8px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  <Pin size={8} /> PINNED
                                </span>
                              )}
                              <span className="text-[8px] font-bold text-brand-muted uppercase">Author: {p.author_name}</span>
                            </div>
                            <span className="text-[8px] font-bold text-brand-muted font-mono uppercase">{calcTimeAgo(p.created_at)}</span>
                          </div>

                          <h4 className={`text-xs sm:text-sm font-black tracking-tight leading-snug mb-1 ${p.is_deleted ? 'line-through text-brand-muted/60' : ''}`}>
                            {p.title}
                          </h4>
                          <p className={`text-[11px] leading-relaxed font-semibold text-brand-muted mb-4 ${p.is_deleted ? 'italic text-red-500/50' : ''}`}>
                            {p.is_deleted ? '[This post has been removed as inappropriate]' : p.content}
                          </p>

                          {/* MODERATION ACTION PANEL */}
                          <div className="flex items-center justify-between pt-3 border-t border-brand-border/40">
                            <span className="text-[9px] font-black text-brand-muted uppercase">
                              {p.tag}
                            </span>

                            <div className="flex items-center gap-2">
                              {/* Pin Button */}
                              {!p.is_deleted && (
                                <button
                                  onClick={() => handlePinToggle(p)}
                                  className={`flex items-center gap-1 py-1.5 px-3 rounded-xl text-[9px] font-black uppercase transition-all ${
                                    p.is_pinned
                                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-500'
                                      : 'bg-brand-bg border border-brand-border hover:border-amber-500/30 text-brand-muted'
                                  }`}
                                  title={p.is_pinned ? 'Unpin Post' : 'Pin Post'}
                                >
                                  <Pin size={10} className={p.is_pinned ? 'fill-amber-500' : ''} />
                                  <span>{p.is_pinned ? 'Pinned' : 'Pin'}</span>
                                </button>
                              )}

                              {/* Warn Student Button */}
                              {!p.is_deleted && p.author_role === 'student' && (
                                <button
                                  onClick={() => openWarningSelector(p.author_id, p.author_name)}
                                  className="flex items-center gap-1 bg-brand-bg border border-brand-border hover:border-red-500/30 hover:bg-red-500/5 text-brand-muted hover:text-red-500 py-1.5 px-3 rounded-xl text-[9px] font-black uppercase transition-all"
                                  title="Warn Student"
                                >
                                  <ShieldAlert size={10} />
                                  <span>Warn Author</span>
                                </button>
                              )}

                              {/* Delete Soft Button */}
                              {!p.is_deleted && (
                                <button
                                  onClick={() => handleDeletePost(p.id)}
                                  className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-red-500 hover:border-red-500/20 flex items-center justify-center transition-all"
                                  title="Soft Delete Post"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'flags' && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-brand-muted uppercase tracking-wider px-2">
                  🚩 Flagged Reports ({flags.length})
                </h3>

                {flags.length === 0 ? (
                  <div className="py-20 text-center bg-brand-surface border border-brand-border rounded-[2.5rem] p-8">
                    <CheckCircle2 className="mx-auto text-emerald-500/50 mb-3 animate-pulse" size={40} />
                    <p className="text-xs font-bold text-brand-muted">Board is spotless!</p>
                    <p className="text-[10px] text-brand-muted/70 mt-1">There are no flagged contents requiring attention.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flags.map((f) => (
                      <div
                        key={f.id}
                        className="bg-brand-surface border border-brand-border rounded-3xl p-5 text-left flex flex-col sm:flex-row gap-4 justify-between items-start"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                              PENDING REVIEW
                            </span>
                            <span className="text-[9px] font-bold text-brand-muted uppercase">{f.board_name}</span>
                          </div>
                          
                          <p className="text-xs font-black truncate text-brand-text">
                            Post: "{f.post_title}"
                          </p>

                          <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                            <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider leading-none">REPORTED REASON:</p>
                            <p className="text-xs font-semibold text-brand-text/90 mt-1.5 italic leading-snug">
                              "{f.reason}"
                            </p>
                          </div>
                          <span className="text-[8px] font-bold text-brand-muted block font-mono">Reported {calcTimeAgo(f.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-2 justify-end w-full sm:w-auto shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-brand-border/40">
                          <button
                            onClick={() => handleResolveFlag(f.id)}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[9px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CheckCircle2 size={12} />
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'warnings' && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-brand-muted uppercase tracking-wider px-2">
                  ⚠️ WARNINGS ISSUED ({warnings.length})
                </h3>

                {warnings.length === 0 ? (
                  <div className="py-20 text-center bg-brand-surface border border-brand-border rounded-[2.5rem] p-8">
                    <ShieldCheck className="mx-auto text-brand-muted/40 mb-3 animate-pulse" size={32} />
                    <p className="text-xs font-bold text-brand-muted">Clean student history log!</p>
                    <p className="text-[10px] text-brand-muted/75 mt-1">You have not issued any warning cards to students yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {warnings.map((w) => (
                      <div
                        key={w.id}
                        className="bg-brand-surface border border-brand-border rounded-3xl p-5 text-left flex gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black leading-none">Student Named: {w.student_name}</p>
                          <p className="text-[10px] text-brand-muted/80 font-semibold">{w.reason}</p>
                          <p className="text-[8px] font-mono text-brand-muted/70 uppercase">ISSUED AT {new Date(w.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* NEW WARNING CREATION MODAL */}
      <AnimatePresence>
        {showWarningModal && warningTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWarningModal(false)}
              className="absolute inset-0 bg-brand-text/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm relative z-10 shadow-2xl overflow-hidden"
            >
              <h2 className="text-base font-black tracking-tight text-red-500 uppercase mb-2 flex items-center gap-1.5">
                <AlertTriangle size={18} /> Issue Formal Warning
              </h2>
              <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-4">
                Receiving students are alerted instantly via notifications.
              </p>

              <div className="space-y-4">
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-border text-left">
                  <span className="text-[9px] font-bold text-brand-muted uppercase block leading-none">TARGET STUDENT:</span>
                  <span className="text-xs font-black text-brand-text tracking-tight inline-block mt-1">{warningTarget.name}</span>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted text-left block mb-1">Warning Description</label>
                  <textarea
                    required
                    rows={3}
                    value={warningReason}
                    onChange={e => setWarningReason(e.target.value)}
                    placeholder="Provide a constructive, gentle description of correct behavioral guidelines here..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:border-red-500 text-brand-text resize-none"
                  />
                </div>

                <div className="flex gap-2 text-xs font-black uppercase tracking-widest">
                  <button
                    onClick={() => setShowWarningModal(false)}
                    className="flex-1 border border-brand-border text-brand-text py-3 rounded-xl text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWarnSubmit}
                    disabled={submitting || !warningReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-[10px] flex items-center justify-center gap-1"
                  >
                    {submitting ? <RefreshCw className="animate-spin" size={14} /> : 'Send Warning'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
