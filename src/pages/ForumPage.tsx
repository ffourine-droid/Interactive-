import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MessageSquare, 
  Heart, 
  Repeat, 
  Share2, 
  Flag, 
  Pin, 
  Send, 
  Search, 
  Sparkles, 
  AlertCircle,
  Plus,
  RefreshCw,
  User,
  MoreVertical,
  X,
  FileText
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { NotificationBell } from '../components/NotificationBell';
import { StudentIdentityModal } from '../components/StudentIdentityModal';
import { AttachmentUploader } from '../components/AttachmentUploader';
import { AttachmentDisplay } from '../components/AttachmentDisplay';
import { UserProfileCard } from '../components/UserProfileCard';
import { forumService, ForumPost, ForumReply, ForumProfile } from '../services/forumService';
import { attachmentService } from '../services/attachmentService';

interface ForumPageProps {
  onBack: () => void;
}

export default function ForumPage({ onBack }: ForumPageProps) {
  const { showToast } = useToast();
  
  // Account Information
  const [student, setStudent] = useState<ForumProfile | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [selectedUserForCard, setSelectedUserForCard] = useState<string | null>(null);

  // Feed State
  const [feed, setFeed] = useState<ForumPost[]>([]);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Thread details modal
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  
  // Posting parameters
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState<'question' | 'discussion' | 'study_tip' | 'resource'>('question');
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Reply variables
  const [newReply, setNewReply] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Flag/Report Modal State
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Load identity and sync credentials
  useEffect(() => {
    const cachedIdentity = localStorage.getItem('azilearn_student');
    if (!cachedIdentity) {
      setIsIdentityModalOpen(true);
    } else {
      try {
        const parsed = JSON.parse(cachedIdentity);
        
        // Ensure student has username formatted appropriately
        const formattedUser: ForumProfile = {
          id: parsed.id || 'st-' + Math.random().toString(36).slice(2, 7),
          username: parsed.username || (parsed.name || 'User').toLowerCase().replace(/[^a-z0-9]/g, '_'),
          full_name: parsed.name || 'AziLearn Student',
          role: parsed.is_admin ? 'admin' : 'student',
          grade: parsed.grade || 'Grade 7',
          class_id: parsed.class_id || 'C1',
          school: parsed.school || 'AziLearn Academy',
          is_admin: !!parsed.is_admin
        };
        
        setStudent(formattedUser);
        // Sync profile state with live Supabase or mock service
        forumService.upsertProfile(formattedUser);
      } catch (e) {
        setIsIdentityModalOpen(true);
      }
    }
  }, []);

  // Fetch unified public student board feed on activation
  useEffect(() => {
    if (student) {
      loadFeed();
    }
  }, [student]);

  const loadFeed = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const data = await forumService.getFeed(student.id);
      setFeed(data || []);
    } catch (err) {
      showToast('Error syncing student board feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!student) return;
    setRefreshing(true);
    try {
      const data = await forumService.getFeed(student.id);
      setFeed(data || []);
      showToast('Feed up to date! 🚀', 'success');
    } catch (err) {
      showToast('Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Like operations
  const handleLike = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!student) return;

    try {
      // Optimistic update
      setFeed(prev => prev.map(p => {
        if (p.id === postId) {
          const delta = p.has_liked ? -1 : 1;
          return {
            ...p,
            has_liked: !p.has_liked,
            like_count: Math.max(0, p.like_count + delta)
          };
        }
        return p;
      }));

      // In case we are looking inside an active thread detail view
      if (activePost && activePost.id === postId) {
        const delta = activePost.has_liked ? -1 : 1;
        setActivePost(prev => prev ? {
          ...prev,
          has_liked: !prev.has_liked,
          like_count: Math.max(0, prev.like_count + delta)
        } : null);
      }

      await forumService.toggleLike(postId, student.id);
    } catch (err) {
      console.warn('Like toggle sync bypassed:', err);
    }
  };

  // Repost operations
  const handleRepost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!student) return;

    try {
      // Optimistic update
      setFeed(prev => prev.map(p => {
        if (p.id === postId) {
          const delta = p.has_reposted ? -1 : 1;
          return {
            ...p,
            has_reposted: !p.has_reposted,
            repost_count: Math.max(0, p.repost_count + delta)
          };
        }
        return p;
      }));

      if (activePost && activePost.id === postId) {
        const delta = activePost.has_reposted ? -1 : 1;
        setActivePost(prev => prev ? {
          ...prev,
          has_reposted: !prev.has_reposted,
          repost_count: Math.max(0, prev.repost_count + delta)
        } : null);
      }

      const { reposted } = await forumService.toggleRepost(postId, student.id);
      showToast(reposted ? 'Post reposted to public feed!' : 'Repost removed', 'success');
      loadFeed(); // Refresh feed to show or remove the repost
    } catch (err) {
       showToast('Could not register repost action', 'error');
    }
  };

  // Share link copying
  const handleShare = async (e: React.MouseEvent, post: ForumPost) => {
    e.stopPropagation();
    if (!student) return;

    try {
      const shareUrl = `${window.location.origin}/forum/post/${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast('Feed link copied! Share with your classmates! 🔗', 'success');
      
      setFeed(prev => prev.map(p => p.id === post.id ? { ...p, share_count: p.share_count + 1 } : p));
      if (activePost && activePost.id === post.id) {
        setActivePost(prev => prev ? { ...prev, share_count: prev.share_count + 1 } : null);
      }

      await forumService.recordShare(post.id, student.id);
    } catch (err) {
      showToast('Shared via general clip', 'success');
    }
  };

  // Report triggers
  const handleOpenFlagModal = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    setReportingPostId(postId);
    setReportReason('');
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !reportingPostId || !reportReason.trim()) return;

    setSubmittingReport(true);
    try {
      await forumService.flagPost(reportingPostId, student.id, reportReason.trim());
      showToast('Thank you! Post flagged for our administrator review. 🛡️', 'success');
      setReportingPostId(null);
    } catch (err) {
      showToast('Could not report post at this moment', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Create post submission
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('Please type both title and body Content', 'error');
      return;
    }

    setSubmittingPost(true);
    try {
      // 1. Submit basic post meta
      const created = await forumService.createPost(
        student.id,
        newTitle.trim(),
        newContent.trim(),
        newTag
      );

      // 2. Upload attachments if present under boards/{board_id}/{post_id}/{filename}
      if (postFiles.length > 0) {
        await Promise.all(
          postFiles.map(file =>
            attachmentService.uploadAttachment(file, 'public_student_board', created.id, null)
          )
        );
      }

      showToast('Shared successfully with the student forum! 🌟', 'success');
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setPostFiles([]);
      loadFeed();
    } catch (err) {
      showToast('Post upload failed', 'error');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Render expanded replies thread
  const handleOpenThread = async (post: ForumPost) => {
    if (post.is_deleted) return;
    setActivePost(post);
    setReplies([]);
    setRepliesLoading(true);

    try {
      const data = await forumService.getReplies(post.id);
      setReplies(data || []);
    } catch (err) {
      showToast('Failed to load replies list', 'error');
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !activePost || !newReply.trim()) return;

    setSubmittingReply(true);
    try {
      // Submit textual comment
      const comment = await forumService.createReply(activePost.id, student.id, newReply.trim());

      // If binary files attached to comment
      if (replyFiles.length > 0) {
        await Promise.all(
          replyFiles.map(file =>
            attachmentService.uploadAttachment(file, 'public_student_board', null, comment.id, activePost.id)
          )
        );
      }

      showToast('Reply published!', 'success');
      setNewReply('');
      setReplyFiles([]);
      
      // Update local threads counter
      setFeed(prev => prev.map(p => p.id === activePost.id ? { ...p, reply_count: p.reply_count + 1 } : p));
      setActivePost(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);

      // Reload replies list
      const updated = await forumService.getReplies(activePost.id);
      setReplies(updated || []);
    } catch (err) {
      showToast('Reply submission failed', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Helper date duration formatter
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  // Username Click Profile Trigger
  const handleUserClick = (e: React.MouseEvent, authorId: string) => {
    e.stopPropagation();
    setSelectedUserForCard(authorId);
  };

  // Get localized class indicator tags
  const getTagBadgeStyle = (tag: string) => {
    switch (tag) {
      case 'question':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'discussion':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'study_tip':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'resource':
        return 'bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/25';
      default:
        return 'bg-brand-muted/10 text-brand-muted border-brand-border';
    }
  };

  // Filter & Search computation
  const filteredFeed = feed.filter(p => {
    const matchesTab = filterTag === 'all' || p.tag === filterTag;
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg relative select-none pb-20" id="forum-page-main">
      
      {/* ─── HEADER BAR ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-brand-surface border-b border-brand-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-brand-bg hover:bg-brand-border/20 border border-brand-border/30 flex items-center justify-center text-brand-muted hover:text-brand-text transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-black uppercase text-brand-text leading-tight tracking-wider flex items-center gap-1.5">
              <span>AziLearn Community</span>
              <Sparkles size={11} className="text-[#FF6B35] animate-pulse" />
            </h1>
            <p className="text-[9px] font-bold text-brand-muted tracking-wide">Unified Public Student Board</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {student && <NotificationBell userId={student.id} />}
          {student?.username && (
            <div 
              onClick={(e) => handleUserClick(e, student.id)}
              className="w-8 h-8 rounded-xl bg-[#FF6B35] text-white font-black cursor-pointer shadow-sm hover:brightness-110 active:scale-90 flex items-center justify-center text-xs tracking-tighter"
              title="My Profile"
            >
              {student.full_name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* ─── SEARCH & TOPICS TAB FILTERS ────────────────────────────────────────── */}
      <div className="p-3 bg-brand-surface border-b border-brand-border/20 space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search @handles, topics, homework help..."
            className="w-full bg-[#1a1a2e]/5 dark:bg-[#1a1a2e]/55 border border-brand-border rounded-2xl pl-9 pr-4 py-2 text-[11px] font-medium text-brand-text outline-none focus:border-[#FF6B35]/40 transition-all"
          />
        </div>

        {/* Categories Tab selectors */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All Feed' },
            { id: 'question', label: '❓ Questions' },
            { id: 'discussion', label: '💬 Discussions' },
            { id: 'study_tip', label: '💡 Study Tips' },
            { id: 'resource', label: '📂 Resources' }
          ].map(tab => {
            const isSelected = filterTag === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTag(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 border transition-all ${
                  isSelected 
                    ? 'bg-[#FF6B35] text-white border-transparent shadow-sm'
                    : 'bg-brand-bg text-brand-muted border-brand-border/40 hover:text-brand-text'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN FEED LIST ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-brand-muted text-xs font-black uppercase tracking-wider space-y-3 animate-pulse">
            <RefreshCw className="animate-spin text-[#FF6B35]" size={24} />
            <span>Syncing community hub...</span>
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="text-center py-20 bg-brand-surface/70 border border-brand-border/30 rounded-3xl p-6">
            <p className="text-xs font-black text-brand-muted uppercase tracking-wider leading-relaxed">No community posts found matching criteria</p>
            <p className="text-[10px] text-brand-muted/70 font-semibold mt-1 max-w-[240px] mx-auto">Be the first to share a question, resource, or study tip with other students!</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredFeed.map(post => {
              const isPinned = post.is_pinned && !post.is_repost_item;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleOpenThread(post)}
                  className={`relative p-3.5 rounded-3xl border transition-all ${
                    isPinned 
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30' 
                      : 'bg-brand-surface hover:bg-brand-surface/90 border-brand-border/40 hover:border-brand-border/85'
                  } group select-text cursor-pointer`}
                >
                  {/* Repost Header Accent (If X-repost) */}
                  {post.is_repost_item && (
                    <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-brand-muted mb-2 select-none">
                      <Repeat size={10} className="text-emerald-500" />
                      <span>@{post.reposted_by_user} reposted</span>
                    </div>
                  )}

                  {/* Profile Section */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        onClick={(e) => handleUserClick(e, post.author_id)}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4d] text-white font-black flex items-center justify-center shrink-0 border border-brand-border/20 shadow-sm cursor-pointer hover:scale-95 transition-transform"
                      >
                        {post.author_full_name ? post.author_full_name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-brand-text">{post.author_full_name}</span>
                          {post.author_role === 'admin' && (
                            <span className="bg-red-500/15 text-red-500 text-[7px] font-black uppercase tracking-widest px-1 rounded">Admin</span>
                          )}
                        </div>
                        <span 
                          onClick={(e) => handleUserClick(e, post.author_id)}
                          className="text-[10px] text-[#FF6B35] font-black hover:underline cursor-pointer"
                        >
                          @{post.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black tracking-widest uppercase shrink-0 ${getTagBadgeStyle(post.tag)}`}>
                        {post.tag.replace('_', ' ')}
                      </span>
                      {isPinned && (
                        <Pin size={12} className="text-amber-500 animate-bounce" />
                      )}
                    </div>
                  </div>

                  {/* Body Title & Text Content */}
                  <div className="mt-2.5">
                    <h3 className="text-xs font-black leading-snug text-brand-text group-hover:text-[#FF6B35] transition-colors">{post.title}</h3>
                    <p className="text-[11px] font-semibold text-brand-muted/95 mt-1 leading-relaxed break-words whitespace-pre-line">{post.content}</p>
                  </div>

                  {/* Inline Attachments Rendering */}
                  <div onClick={(e) => e.stopPropagation()} className="mt-2 select-none">
                    <AttachmentDisplay postId={post.id} />
                  </div>

                  {/* Post Footer Metadata & Icons Panel */}
                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-brand-border/20 text-brand-muted select-none">
                    <span className="text-[9px] font-semibold">{formatTimeAgo(post.created_at)}</span>

                    <div className="flex items-center gap-3">
                      {/* Interaction Likes count */}
                      <button
                        onClick={(e) => handleLike(e, post.id)}
                        className={`flex items-center gap-1 text-[10px] font-black transition-colors ${
                          post.has_liked ? 'text-red-500' : 'hover:text-red-500'
                        }`}
                        title="Like Post"
                      >
                        <Heart size={13} className={post.has_liked ? 'fill-current' : ''} />
                        <span>{post.like_count}</span>
                      </button>

                      {/* Interaction Repost Count */}
                      <button
                        onClick={(e) => handleRepost(e, post.id)}
                        className={`flex items-center gap-1 text-[10px] font-black transition-colors ${
                          post.has_reposted ? 'text-emerald-500' : 'hover:text-emerald-500'
                        }`}
                        title="Repost"
                      >
                        <Repeat size={13} />
                        <span>{post.repost_count}</span>
                      </button>

                      {/* Comment Count replies display */}
                      <div className="flex items-center gap-1 text-[10px] font-black hover:text-[#FF6B35] transition-colors">
                        <MessageSquare size={13} />
                        <span>{post.reply_count}</span>
                      </div>

                      {/* Share tracker and clipboard */}
                      <button
                        onClick={(e) => handleShare(e, post)}
                        className="flex items-center gap-1 text-[10px] font-black hover:text-brand-accent transition-colors"
                        title="Share Links"
                      >
                        <Share2 size={13} />
                      </button>

                      {/* Discreet Flag reporting */}
                      <button
                        onClick={(e) => handleOpenFlagModal(e, post.id)}
                        className="p-1 hover:bg-brand-bg rounded-lg hover:text-red-500 transition-colors"
                        title="Report/Flag Code Violation"
                      >
                        <Flag size={11} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </main>

      {/* ─── ADD CREATE NEW COMPLAINT FAB ───────────────────────────────────────── */}
      <button
        onClick={() => { setShowCreateModal(true); setPostFiles([]); }}
        className="fixed bottom-4 right-4 w-12 h-12 bg-[#FF6B35] hover:bg-[#ff8c5a] text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-[#FF6B35]/20 active:scale-90 transition-all z-40 animate-pulse"
      >
        <Plus size={24} />
      </button>

      {/* ─── STUDENT IDENTITY MODIFICATION MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {isIdentityModalOpen && (
          <StudentIdentityModal
            isOpen={isIdentityModalOpen}
            onClose={() => setIsIdentityModalOpen(false)}
            onSuccess={(updatedStudent) => {
              const userFormatted: ForumProfile = {
                id: updatedStudent.id || 'std_' + Math.random().toString(36).slice(2,6),
                username: (updatedStudent.name || 'member').toLowerCase().replace(/[^a-z0-9]/g, '_'),
                full_name: updatedStudent.name,
                role: 'student',
                grade: updatedStudent.grade,
                class_id: updatedStudent.class_id,
                school: updatedStudent.school || 'AziLearn Academy',
                is_admin: false
              };
              setStudent(userFormatted);
              localStorage.setItem('azilearn_student', JSON.stringify(updatedStudent));
              forumService.upsertProfile(userFormatted);
              setIsIdentityModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── USER PROFILE DETAILED CARD INTERACTIVE OVERLAY ─────────────────────────── */}
      <AnimatePresence>
        {selectedUserForCard && student && (
          <UserProfileCard
            userId={selectedUserForCard}
            currentUserId={student.id}
            isAdmin={!!student.is_admin}
            onClose={() => setSelectedUserForCard(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── REPORTING FLAG VALUE POPUP DRAWER ─────────────────────────────────────── */}
      <AnimatePresence>
        {reportingPostId && (
          <div className="fixed inset-0 z-50 bg-[#1a1a2e]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-brand-surface border border-brand-border p-5 text-left"
            >
              <h3 className="text-xs font-black uppercase text-red-500 tracking-wider flex items-center gap-1.5 leading-none">
                <AlertCircle size={14} />
                <span>Report Forum Violation</span>
              </h3>
              <p className="text-[10px] text-brand-muted mt-1 leading-snug font-semibold">Flagged concerns are delivered directly to the Admin console dashboard for instant validation.</p>

              <form onSubmit={handleFlagSubmit} className="mt-4 space-y-3">
                <textarea
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe your concern (e.g., spam, sharing exam solutions, inappropriate tone...)"
                  rows={3}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-[11px] font-medium text-brand-text outline-none focus:border-red-500/40 resize-none leading-relaxed"
                />

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReportingPostId(null)}
                    className="flex-1 bg-brand-bg text-brand-muted text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl border border-brand-border hover:text-brand-text active:scale-95 transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="flex-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    {submittingReport ? 'Reporting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EXPANDED THREAD COMMENT MODAL DRAWER ─────────────────────────────────── */}
      <AnimatePresence>
        {activePost && (
          <div className="fixed inset-0 z-40 bg-[#1a1a2e]/75 backdrop-blur-sm flex justify-center items-end select-text">
            <motion.div
              initial={{ y: '30%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-[88vh] bg-brand-surface rounded-t-[2.5rem] border-t border-brand-border flex flex-col overflow-hidden relative shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-3 border-b border-brand-border/40 bg-brand-surface flex items-center justify-between select-none shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">Classroom Discussion Thread</span>
                </div>
                <button
                  onClick={() => { setActivePost(null); setNewReply(''); setReplyFiles([]); }}
                  className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-border/30 hover:border-red-500/10 flex items-center justify-center text-brand-muted hover:text-red-500 active:scale-90 transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Thread Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                
                {/* Master OP Post Frame */}
                <div className="pb-4 border-b border-brand-border/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={(e) => handleUserClick(e, activePost.author_id)}
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4d] text-white font-black flex items-center justify-center shrink-0 border border-brand-border/20 shadow-sm cursor-pointer hover:scale-95 transition-transform"
                    >
                      {activePost.author_full_name ? activePost.author_full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="leading-tight">
                      <h4 className="text-xs font-black text-brand-text">{activePost.author_full_name}</h4>
                      <p 
                        onClick={(e) => handleUserClick(e, activePost.author_id)}
                        className="text-[9px] text-[#FF6B35] font-black hover:underline cursor-pointer"
                      >
                        @{activePost.username}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-black leading-snug text-brand-text">{activePost.title}</h3>
                    <p className="text-[10.5px] font-semibold text-brand-muted/95 leading-relaxed break-words whitespace-pre-line">{activePost.content}</p>
                  </div>

                  {/* Attachment render for OP */}
                  <div className="select-none">
                    <AttachmentDisplay postId={activePost.id} />
                  </div>

                  {/* Metadata line */}
                  <div className="flex items-center justify-between text-[9px] font-bold text-brand-muted/70 pt-2 select-none">
                    <span>{new Date(activePost.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Heart size={10} className="text-red-500 fill-current" /> {activePost.like_count} likes</span>
                      <span className="flex items-center gap-1"><Repeat size={10} className="text-emerald-500" /> {activePost.repost_count} reps</span>
                      <span className="flex items-center gap-1"><MessageSquare size={10} /> {activePost.reply_count} replies</span>
                    </div>
                  </div>
                </div>

                {/* Sub Replies List */}
                <div className="space-y-3.5">
                  <h3 className="text-[9px] font-black uppercase text-brand-muted tracking-wider select-none">Class Commentary</h3>
                  
                  {repliesLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-[10px] text-brand-muted font-black animate-pulse uppercase tracking-wider">
                      <RefreshCw className="animate-spin text-[#FF6B35]" size={14} />
                      <span>Retrieving remarks...</span>
                    </div>
                  ) : replies.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-brand-border/40 rounded-3xl bg-brand-bg/50">
                      <p className="text-[10px] font-black text-brand-muted uppercase tracking-wider">Empty classroom thread</p>
                      <p className="text-[8px] text-brand-muted/70 font-semibold mt-0.5">Share your reply comment with classmates below!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {replies.map(rep => (
                        <div key={rep.id} className="p-3 bg-brand-bg border border-brand-border/30 rounded-2xl space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <div 
                                onClick={(e) => handleUserClick(e, rep.author_id)}
                                className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1a1a2e ] to-[#2c2c4d] text-white font-black text-[10px] flex items-center justify-center shrink-0 border border-brand-border/20 cursor-pointer shadow-sm"
                              >
                                {rep.author_full_name ? rep.author_full_name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="leading-tight">
                                <span className="text-[10.5px] font-black text-brand-text block">{rep.author_full_name}</span>
                                <span 
                                  onClick={(e) => handleUserClick(e, rep.author_id)}
                                  className="text-[9px] text-[#FF6B35] font-black hover:underline cursor-pointer"
                                >
                                  @{rep.username}
                                </span>
                              </div>
                            </div>
                            <span className="text-[8px] font-semibold text-brand-muted shrink-0">{formatTimeAgo(rep.created_at)}</span>
                          </div>

                          <p className="text-[10.5px] leading-relaxed font-semibold text-brand-text/95 ml-1 break-words">{rep.content}</p>

                          {/* Render files attached on comment level */}
                          <div className="select-none py-1">
                            <AttachmentDisplay replyId={rep.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky bottom comment writer block with Attachment capabilities */}
              <div className="p-3 bg-brand-surface border-t border-brand-border/40 space-y-2 shrink-0 select-none">
                {/* Upload attachments queue for reply */}
                {replyFiles.length > 0 && (
                  <div className="max-h-[140px] overflow-y-auto pb-1 border-b border-brand-border/30">
                    <AttachmentUploader files={replyFiles} onFilesChange={setReplyFiles} />
                  </div>
                )}

                <form onSubmit={handleReplySubmit} className="flex gap-2">
                  <div className="flex-1 flex gap-1.5 items-center bg-brand-bg border border-brand-border/60 rounded-2xl px-3.5 py-1.5">
                    {/* Tiny clip icon to attach files */}
                    {replyFiles.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setReplyFiles([null as any].filter(Boolean))} // opens input via uploader trick
                        className="p-1.5 hover:bg-brand-border/30 rounded-xl text-brand-muted hover:text-[#FF6B35]"
                        title="Upload pdf/images"
                      >
                        <Plus size={15} />
                      </button>
                    )}
                    <input
                      type="text"
                      required
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Comment something friendly..."
                      className="flex-grow bg-transparent text-[11px] font-semibold text-brand-text outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReply || !newReply.trim()}
                    className="bg-[#FF6B35] hover:brightness-110 active:scale-95 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shadow-[#FF6B35]/10 disabled:opacity-45 transition-all text-xs font-black uppercase tracking-widest"
                  >
                    {submittingReply ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                  </button>
                </form>

                {replyFiles.length === 0 && (
                  <button
                    onClick={() => setReplyFiles([null as any].filter(Boolean))}
                    className="text-[9px] font-black text-[#FF6B35] pl-2 hover:underline uppercase tracking-wider block"
                  >
                    + Add homework sheets or slide file
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CREATE POST OVERLAY MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-[#1a1a2e]/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[2rem] bg-brand-surface border border-brand-border p-5 text-left flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-border/40 mb-3 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-text">Compose Forum Post</h3>
                <button onClick={() => { setShowCreateModal(false); setPostFiles([]); }} className="text-brand-muted hover:text-brand-text">&times;</button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted">Post Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="E.g., Formula help on Grade 8 Algebra exam!"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-[11px] font-semibold text-brand-text outline-none focus:border-[#FF6B35]/40 transition-all"
                  />
                </div>

                {/* Tag */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted">Board Topic Filter Badge</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'question', label: '❓ Question' },
                      { id: 'discussion', label: '💬 Discussion' },
                      { id: 'study_tip', label: '💡 Study Tip' },
                      { id: 'resource', label: '📂 Resource' }
                    ].map(tagOpt => {
                      const active = newTag === tagOpt.id;
                      return (
                        <button
                          key={tagOpt.id}
                          type="button"
                          onClick={() => setNewTag(tagOpt.id as any)}
                          className={`py-2 px-2.5 rounded-xl border text-[9px] font-black text-left transition-all ${
                            active 
                              ? 'bg-[#FF6B35] text-white border-transparent shadow-sm'
                              : 'bg-brand-bg text-brand-muted border-brand-border/60 hover:text-brand-text'
                          }`}
                        >
                          {tagOpt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted font-bold">Write description detailed text</label>
                  <textarea
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Share what's on your mind... Ask other students, link files or resources."
                    rows={4}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-[11px] font-medium text-brand-text outline-none focus:border-[#FF6B35]/40 resize-none leading-relaxed"
                  />
                </div>

                {/* Attachment Uploader */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted block">Files (Up to 3 sheets, Max 10MB each)</label>
                  <AttachmentUploader files={postFiles} onFilesChange={setPostFiles} />
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-2 border-t border-brand-border/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setPostFiles([]); }}
                    className="flex-1 bg-brand-bg text-brand-muted text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl border border-brand-border hover:text-brand-text active:scale-95 transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPost}
                    className="flex-1 bg-[#FF6B35] text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    {submittingPost ? 'Posting...' : 'Share Post'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
