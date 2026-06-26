import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, MessageSquare, ThumbsUp, Flag, Pin, PlusCircle, Send, 
  HelpCircle, MessageCircle, Sparkles, BookOpen, Search,
  GraduationCap, UserCheck, AlertOctagon, RefreshCw, Bookmark, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { communityService, Board, Post, Reply } from '../services/communityService';
import { NotificationBell } from '../components/NotificationBell';
import { useStudent } from '../contexts/StudentContext';
import { AttachmentUploader } from '../components/AttachmentUploader';
import { AttachmentDisplay } from '../components/AttachmentDisplay';
import { attachmentService, PostAttachment } from '../services/attachmentService';

interface CommunityPageProps {
  onBack: () => void;
}

export default function CommunityPage({ onBack }: CommunityPageProps) {
  const { showToast } = useToast();
  const { currentStudent, setIsIdentityModalOpen } = useStudent();
  const student = currentStudent ? {
    id: currentStudent.student_id,
    name: currentStudent.name,
    grade: currentStudent.grade
  } : null;

  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState<'question' | 'discussion' | 'study_tip' | 'resource'>('question');
  const [newReplyContent, setNewReplyContent] = useState('');
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);

  // Reporting/Flag State
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagPostId, setFlagPostId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 1. Resolve Student login info on startup
  useEffect(() => {
    if (!currentStudent) {
      setIsIdentityModalOpen(true);
    }
  }, [currentStudent]);

  // 2. Fetch Boards when student information is resolved
  useEffect(() => {
    if (student) {
      fetchBoards();
    }
  }, [student]);

  // 3. Keep updating posts inside selected board
  useEffect(() => {
    if (selectedBoard && student) {
      fetchPosts(selectedBoard.id);
    }
  }, [selectedBoard, student]);

  const fetchBoards = async () => {
    if (!student) return;
    setLoading(true);
    try {
      // Fetch all boards across all grades combined so students can learn from each other
      const fetched = await communityService.getAllBoards();
      setBoards(fetched || []);
      if (fetched && fetched.length > 0) {
        setSelectedBoard(fetched[0]);
      }
    } catch (e: any) {
      showToast('Error loading forum boards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (boardId: string) => {
    if (!student) return;
    setPostsLoading(true);
    try {
      const data = await communityService.getPosts(boardId, student.id);
      setPosts(data || []);
    } catch (e: any) {
      showToast('Error retrieving posts', 'error');
    } finally {
      setPostsLoading(false);
    }
  };

  const handlePostSelection = async (post: Post) => {
    if (post.is_deleted) return; // Ignore removed posts
    setSelectedPost(post);
    setLoading(true);
    try {
      const data = await communityService.getReplies(post.id);
      setReplies(data || []);
    } catch (e) {
      showToast('Error fetching comments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedBoard) return;
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('Please key in both title and detail content', 'error');
      return;
    }

    setSubmitLoading(true);
    try {
      const created = await communityService.createPost(
        selectedBoard.id,
        student.id,
        newTitle.trim(),
        newContent.trim(),
        newTag
      );

      // Upload files if present
      if (postFiles.length > 0) {
        await Promise.all(
          postFiles.map(file =>
            attachmentService.uploadAttachment(file, selectedBoard.id, created.id, null)
          )
        );
      }

      setPosts(prev => [created, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setPostFiles([]);
      showToast('Post shared with the board! 🚀', 'success');
    } catch (err) {
      showToast('Failed to share post', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedPost || !newReplyContent.trim()) return;

    setSubmitLoading(true);
    try {
      const reply = await communityService.createReply(selectedPost.id, student.id, newReplyContent.trim());

      // Upload reply files if present
      if (replyFiles.length > 0) {
        await Promise.all(
          replyFiles.map(file =>
            attachmentService.uploadAttachment(file, selectedPost.board_id, null, reply.id, selectedPost.id)
          )
        );
      }

      setReplies(prev => [...prev, reply]);
      setNewReplyContent('');
      setReplyFiles([]);
      setSelectedPost(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);
      
      // Update in local posts list
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, reply_count: p.reply_count + 1 } : p));
      
      showToast('Reply shared successfully!', 'success');
    } catch (err) {
      showToast('Failed to add reply', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVoteToggle = async (postId: string) => {
    if (!student) return;
    try {
      const updatedCount = await communityService.toggleUpvote(postId, student.id);
      
      // Update locally
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            upvote_count: p.has_upvoted ? p.upvote_count - 1 : p.upvote_count + 1,
            has_upvoted: !p.has_upvoted
          };
        }
        return p;
      }));

      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => prev ? {
          ...prev,
          upvote_count: prev.has_upvoted ? prev.upvote_count - 1 : prev.upvote_count + 1,
          has_upvoted: !prev.has_upvoted
        } : null);
      }
    } catch (e) {
      showToast('Failed to upvote', 'error');
    }
  };

  const handleFlagSubmit = async () => {
    if (!student || !flagPostId || !flagReason.trim()) return;
    setSubmitLoading(true);
    try {
      await communityService.flagPost(flagPostId, student.id, flagReason.trim());
      showToast('Post reported safely to moderation! 🛡️', 'success');
      setShowFlagModal(false);
      setFlagReason('');
      setFlagPostId(null);
    } catch (e) {
      showToast('Failed to flag post', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Time stamp calculator
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

  // Style attributes per tag
  const getTagBadgeStyles = (tag: string) => {
    switch (tag) {
      case 'question':
        return 'border-rose-500/20 bg-rose-500/5 text-rose-500';
      case 'discussion':
        return 'border-violet-500/20 bg-violet-500/5 text-violet-500';
      case 'study_tip':
        return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500';
      case 'resource':
        return 'border-sky-500/20 bg-sky-500/5 text-sky-500';
      default:
        return 'border-brand-border bg-brand-bg text-brand-text';
    }
  };

  const getTagLabel = (tag: string) => {
    switch (tag) {
      case 'question': return '❓ Question';
      case 'discussion': return '💬 Discussion';
      case 'study_tip': return '💡 Study Tip';
      case 'resource': return '📚 Class Resource';
      default: return tag;
    }
  };

  // Search filter
  const filteredPosts = posts.filter(post => {
    const q = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q) ||
      (post.author_name && post.author_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans pb-10">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-[100] bg-brand-surface/95 backdrop-blur-md border-b border-brand-border px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedPost) {
                setSelectedPost(null);
                fetchPosts(selectedBoard?.id || '');
              } else {
                onBack();
              }
            }}
            className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-text active:scale-90 transition-transform shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-black tracking-tight leading-none text-brand-text uppercase">
              {selectedPost ? 'Post Discussion' : 'School Forum'}
            </h1>
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mt-1">
              {selectedPost ? 'Back to Board' : 'All-Grades Combined Forum'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {student && (
            <div className="hidden sm:flex items-center gap-1 bg-brand-bg border border-brand-border px-3 py-1.5 rounded-full text-[10px] font-bold">
              <User size={12} className="text-brand-accent" />
              <span>{student.name.split(' ')[0]} ({student.grade})</span>
            </div>
          )}
          {student && (
            <NotificationBell userId={student.id} />
          )}
        </div>
      </header>

      {/* BODY FEED GRID */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-6 flex-1 flex flex-col">
        
        {/* IDENTITY MISSING BLOCKED STATE */}
        {!student ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <UserCheck className="text-brand-muted mb-4 animate-bounce" size={48} />
            <h2 className="text-lg font-black tracking-tight">Accessing Forum...</h2>
            <p className="text-xs text-brand-muted mt-2 max-w-xs">We need to know your student identity details before entering the community boards.</p>
            <button 
              onClick={() => setIsIdentityModalOpen(true)}
              className="mt-6 bg-[#FF6B35] text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Verify Profile
            </button>
          </div>
        ) : selectedPost ? (
          
          /* ─── SINGLE POST DISCUSSION VIEW ─── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Thread Original Post */}
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${getTagBadgeStyles(selectedPost.tag)}`}>
                    {getTagLabel(selectedPost.tag)}
                  </span>
                  {selectedPost.is_pinned && (
                    <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full border border-amber-500/20">
                      <Pin size={10} /> PINNED
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-brand-muted/70">{calcTimeAgo(selectedPost.created_at)}</span>
              </div>

              <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug mb-3">
                {selectedPost.title}
              </h2>

              <p className="text-xs sm:text-sm text-brand-text/90 leading-relaxed font-semibold whitespace-pre-wrap mb-6">
                {selectedPost.content}
              </p>

              {/* Attachment displays */}
              <AttachmentDisplay postId={selectedPost.id} className="mb-5" />

              {/* Author & Actions line */}
              <div className="flex items-center justify-between pt-4 border-t border-brand-border/40">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    selectedPost.author_role === 'teacher' ? 'bg-[#FF6B35]/10 text-[#FF6B35]' : 'bg-brand-bg text-brand-muted'
                  }`}>
                    {selectedPost.author_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black leading-none">{selectedPost.author_name}</p>
                    <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mt-1">
                      {selectedPost.author_role === 'teacher' ? '‍🏫 TEACHER' : '🎓 STUDENT'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleVoteToggle(selectedPost.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                      selectedPost.has_upvoted 
                        ? 'bg-[#FF6B35]/10 border-[#FF6B35]/30 text-[#FF6B35]' 
                        : 'bg-brand-bg border-brand-border hover:border-brand-accent/30 text-brand-muted'
                    }`}
                  >
                    <ThumbsUp size={12} className={selectedPost.has_upvoted ? 'fill-[#FF6B35]' : ''} />
                    <span>{selectedPost.upvote_count}</span>
                  </button>

                  <button 
                    onClick={() => { setFlagPostId(selectedPost.id); setShowFlagModal(true); }}
                    className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border hover:border-red-500/20 hover:text-red-500 flex items-center justify-center text-brand-muted transition-all"
                  >
                    <Flag size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Replies section */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-brand-muted px-2">
                💬 Community Comments ({replies.length})
              </h3>

              <div className="space-y-3">
                {replies.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-5 bg-brand-surface border border-brand-border rounded-3xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          r.author_role === 'teacher' ? 'bg-[#FF6B35]/10 text-[#FF6B35]' : 'bg-brand-bg text-brand-muted'
                        }`}>
                          {r.author_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black leading-none">{r.author_name}</p>
                          <span className="text-[8px] font-black text-brand-muted uppercase tracking-wider">
                            {r.author_role === 'teacher' ? '‍🏫 Teacher' : '🎓 Student'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-brand-muted/70">{calcTimeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-brand-text/95 pl-8">
                      {r.content}
                    </p>
                    <AttachmentDisplay replyId={r.id} className="pl-8" />
                  </motion.div>
                ))}

                {replies.length === 0 && (
                  <div className="py-8 bg-brand-surface/30 border border-brand-border border-dashed rounded-[2rem] text-center">
                    <p className="text-xs font-bold text-brand-muted">No replies yet.</p>
                    <p className="text-[10px] text-brand-muted/70 mt-1">Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Reply creator */}
            <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-4 space-y-3">
              <form onSubmit={handleReplySubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newReplyContent}
                  onChange={e => setNewReplyContent(e.target.value)}
                  placeholder="Write a friendly reply..."
                  className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs font-semibold focus:border-brand-accent outline-none text-brand-text transition-all"
                />
                <button
                  type="submit"
                  disabled={submitLoading || !newReplyContent.trim()}
                  className="bg-[#FF6B35] text-white px-4 rounded-xl flex items-center justify-center hover:brightness-115 active:scale-95 transition-all text-xs font-black tracking-widest uppercase disabled:opacity-40"
                >
                  {submitLoading ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                </button>
              </form>
              <div className="border-t border-brand-border/30 pt-2">
                <AttachmentUploader files={replyFiles} onFilesChange={setReplyFiles} />
              </div>
            </div>

          </motion.div>
        ) : (
          
          /* ─── FORUM GENERAL FEED VIEW ─── */
          <div className="space-y-6">
            
            {/* Board Selector Navigation */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {boards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBoard(b)}
                  className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-tight transition-all shrink-0 active:scale-95 ${
                    selectedBoard?.id === b.id
                      ? 'bg-[#FF6B35] border-[#FF6B35] text-white shadow-md'
                      : 'bg-brand-surface border-brand-border text-brand-muted'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            {/* Quick stats and Search toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-brand-surface border border-brand-border p-4 rounded-[2rem]">
              <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/50 group-focus-within:text-brand-accent transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Search discussion topics..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-2 pl-10 pr-4 text-xs font-semibold outline-none focus:border-brand-accent text-brand-text transition-all"
                />
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto bg-[#FF6B35] text-white py-2.5 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B35]/15 transition-all active:scale-95 hover:brightness-105 shrink-0"
              >
                <PlusCircle size={14} />
                New Topic
              </button>
            </div>

            {/* Feed List */}
            <div className="space-y-4">
              {postsLoading ? (
                <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="animate-spin text-brand-accent" size={30} />
                  <p className="text-xs font-bold text-brand-muted">Fetching board discussions...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="py-20 text-center bg-brand-surface border border-brand-border rounded-[2.5rem]">
                  <HelpCircle className="mx-auto text-brand-muted/40 mb-4 animate-bounce" size={40} />
                  <h3 className="text-base font-black">No discussions found</h3>
                  <p className="text-xs text-brand-muted px-10 mt-1">Be the first to spark a conversation in this forum board!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((p) => {
                    const isRemoved = p.is_deleted;
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handlePostSelection(p)}
                        className={`bg-brand-surface border rounded-[2rem] p-5 transition-all hover:border-[#FF6B35]/20 hover:shadow-lg relative text-left group ${
                          isRemoved ? 'opacity-50' : 'cursor-pointer active:scale-[0.99]'
                        } ${p.is_pinned ? 'border-amber-500/30 shadow-sm' : 'border-brand-border'}`}
                      >
                        {isRemoved ? (
                          <div className="flex items-center gap-2 text-rose-500 font-mono text-xs font-semibold py-2">
                            <AlertOctagon size={14} />
                            <span>[Post removed]</span>
                          </div>
                        ) : (
                          <>
                            {/* Pinned label or category badge */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTagBadgeStyles(p.tag)}`}>
                                  {getTagLabel(p.tag)}
                                </span>
                                {p.is_pinned && (
                                  <span className="flex items-center gap-1 text-[8px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    <Pin size={8} /> PINNED
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] font-bold text-brand-muted font-mono uppercase">{calcTimeAgo(p.created_at)}</span>
                            </div>

                            {/* Title & snippet */}
                            <h3 className="text-xs sm:text-sm font-black tracking-tight leading-snug text-brand-text mb-1.5 group-hover:text-brand-accent transition-colors">
                              {p.title}
                            </h3>
                            <p className="text-[11px] leading-relaxed font-semibold text-brand-muted line-clamp-2 mb-4">
                              {p.content}
                            </p>

                            {/* Feed inline attachments */}
                            <div onClick={(e) => e.stopPropagation()} className="mb-4">
                              <AttachmentDisplay postId={p.id} />
                            </div>

                            {/* Author details & Stats bar */}
                            <div className="flex items-center justify-between pt-3 border-t border-brand-border/40">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-brand-text">{p.author_name}</span>
                                <span className="text-[8px] font-bold text-brand-muted uppercase">
                                  {p.author_role === 'teacher' ? '‍🏫 Teacher' : '🎓 Student'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Upvotes stat */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVoteToggle(p.id);
                                  }}
                                  className={`flex items-center gap-1 py-1 px-2.5 rounded-full text-[10px] font-bold transition-all hover:bg-brand-bg ${
                                    p.has_upvoted ? 'text-[#FF6B35]' : 'text-brand-muted'
                                  }`}
                                >
                                  <ThumbsUp size={11} className={p.has_upvoted ? 'fill-[#FF6B35]' : ''} />
                                  <span>{p.upvote_count}</span>
                                </button>

                                {/* Replies stats */}
                                <div className="flex items-center gap-1 text-brand-muted text-[10px] font-bold">
                                  <MessageSquare size={11} />
                                  <span>{p.reply_count}</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* NEW POST DIALOG/MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-brand-text/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 sm:p-8 w-full max-w-md relative z-10 shadow-2xl overflow-hidden"
            >
              <h2 className="text-base font-black tracking-tight uppercase mb-4">🆕 Start a Forum Topic</h2>
              
              <form onSubmit={handleCreatePostSubmit} className="space-y-4 text-left">
                {/* Board info */}
                <div className="p-3 bg-brand-bg border border-brand-border rounded-xl">
                  <span className="text-[10px] font-bold text-brand-muted uppercase block leading-none">POSTING BOARD</span>
                  <span className="text-xs font-black text-[#FF6B35] tracking-tight mt-1 inline-block">{selectedBoard?.name}</span>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-1">Topic Title</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Help understanding photosynthesis equation"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:border-brand-accent text-brand-text"
                  />
                </div>

                {/* Tag Selection grid */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-1.5">Category Tag</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'question', label: '❓ Question' },
                      { id: 'discussion', label: '💬 Discussion' },
                      { id: 'study_tip', label: '💡 Study Tip' },
                      { id: 'resource', label: '📚 Study resource' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewTag(t.id as any)}
                        className={`py-2 px-3 border rounded-xl text-[10px] font-bold text-center uppercase tracking-tight transition-all ${
                          newTag === t.id 
                            ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-[#FF6B35]' 
                            : 'bg-brand-bg border-brand-border text-brand-muted'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-1">Details Context</label>
                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Describe your question or discussion details clearly so friends can help..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:border-brand-accent text-brand-text resize-none"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-1">Attachments (Up to 3 files, Max 10MB each)</label>
                  <AttachmentUploader files={postFiles} onFilesChange={setPostFiles} />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 border border-brand-border text-brand-text py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 bg-[#FF6B35] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#FF6B35]/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {submitLoading ? <RefreshCw className="animate-spin" size={14} /> : 'Share Topic'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPORT FLAG MODAL */}
      <AnimatePresence>
        {showFlagModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFlagModal(false)}
              className="absolute inset-0 bg-brand-text/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm relative z-10 shadow-2xl overflow-hidden"
            >
              <h2 className="text-base font-black tracking-tight text-red-500 uppercase mb-2 flex items-center gap-2">
                <Flag size={18} /> Report inappropriate content
              </h2>
              <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-4">
                This flag is private and reported directly to your teachers.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-1">Reason for Flagging</label>
                  <input
                    type="text"
                    required
                    value={flagReason}
                    onChange={e => setFlagReason(e.target.value)}
                    placeholder="e.g. Unkind language, off-topic spam, etc."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:border-red-500 text-brand-text"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFlagModal(false)}
                    className="flex-1 border border-brand-border text-brand-text py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFlagSubmit}
                    disabled={submitLoading || !flagReason.trim()}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 disabled:opacity-40"
                  >
                    {submitLoading ? <RefreshCw className="animate-spin" size={14} /> : 'Submit Flag'}
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
