import { supabase } from '../lib/supabase';

export interface ForumProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  grade?: string;
  class_id?: string;
  school?: string;
  is_admin?: boolean;
}

export interface ForumPost {
  id: string;
  board_id?: string;
  author_id: string;
  title: string;
  content: string;
  tag: 'question' | 'discussion' | 'study_tip' | 'resource' | 'announcement';
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  
  // Custom joined fields
  username?: string;
  author_full_name?: string;
  author_role?: string;
  like_count: number;
  repost_count: number;
  share_count: number;
  reply_count: number;
  has_liked?: boolean;
  has_reposted?: boolean;
  
  // If this is loaded as a repost, we identify the spacer
  is_repost_item?: boolean;
  reposted_by_user?: string;
}

export interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  username?: string;
  author_full_name?: string;
  author_role?: string;
}

export interface ForumFlag {
  id: string;
  post_id: string;
  flagged_by: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  
  // Joined fields
  post_content?: string;
  post_title?: string;
  flagger_username?: string;
}

export interface ForumWarning {
  id: string;
  student_id: string;
  admin_id: string;
  reason: string;
  created_at: string;
  
  // Joined fields
  student_username?: string;
  admin_username?: string;
  student_full_name?: string;
}

// ─── HIGH FIDELITY MEMORY FALLBACK ───
let localProfiles: ForumProfile[] = [
  { id: 'admin-1', username: 'admin_joseph', full_name: 'Joseph Kariuki', role: 'admin', is_admin: true, school: 'AziLearn Academy' },
  { id: 'student-sam', username: 'kiprop_sam', full_name: 'Samuel Kiprop', role: 'student', grade: 'Grade 7', class_id: 'C1', school: 'AziLearn Academy', is_admin: false },
  { id: 'student-ann', username: 'wambui_ann', full_name: 'Ann Wambui', role: 'student', grade: 'Grade 7', class_id: 'C2', school: 'Kikuyu School', is_admin: false },
  { id: 'student-brian', username: 'brian_mwangi', full_name: 'Brian Mwangi', role: 'student', grade: 'Grade 8', class_id: 'C3', school: 'Nairobi Academy', is_admin: false },
];

let localPosts: ForumPost[] = [
  {
    id: 'fp-1',
    author_id: 'student-sam',
    title: 'Solving Linear Equations Easily',
    content: 'Can anyone share a quick formula to solve basic fractions under 30 seconds? 📐 The timed exams section keeps timing me out!',
    tag: 'question',
    is_pinned: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    username: 'kiprop_sam',
    author_full_name: 'Samuel Kiprop',
    author_role: 'student',
    like_count: 5,
    repost_count: 1,
    share_count: 2,
    reply_count: 2,
    has_liked: false,
    has_reposted: false
  },
  {
    id: 'fp-2',
    author_id: 'student-ann',
    title: 'Acid Base indicator litmus trick!',
    content: 'If you want to remember blue litmus reactions, think: "B-lue remains B-lue in B-ase"! "R-ed turns R-ed in R-adical Acid" 🧪 hope this helps for your chemistry revision!',
    tag: 'study_tip',
    is_pinned: false,
    is_deleted: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    username: 'wambui_ann',
    author_full_name: 'Ann Wambui',
    author_role: 'student',
    like_count: 12,
    repost_count: 4,
    share_count: 6,
    reply_count: 1,
    has_liked: true,
    has_reposted: false
  }
];

let localReplies: ForumReply[] = [
  {
    id: 'fr-1',
    post_id: 'fp-1',
    author_id: 'student-ann',
    content: 'Just multiply both sides by the denominator! It eliminates the fraction instantly and turns it into simple integers.',
    is_deleted: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    username: 'wambui_ann',
    author_full_name: 'Ann Wambui',
    author_role: 'student'
  }
];

let localLikes: { post_id: string; user_id: string }[] = [
  { post_id: 'fp-2', user_id: 'student-sam' }
];

let localReposts: { id: string; original_post_id: string; reposted_by: string; created_at: string }[] = [];
let localShares: { id: string; post_id: string; shared_by: string; created_at: string }[] = [];
let localFlags: ForumFlag[] = [];
let localWarnings: ForumWarning[] = [];

// Storage keys
const saveForumMocks = () => {
  localStorage.setItem('azilearn_forum_profiles', JSON.stringify(localProfiles));
  localStorage.setItem('azilearn_forum_posts', JSON.stringify(localPosts));
  localStorage.setItem('azilearn_forum_replies', JSON.stringify(localReplies));
  localStorage.setItem('azilearn_forum_likes', JSON.stringify(localLikes));
  localStorage.setItem('azilearn_forum_reposts', JSON.stringify(localReposts));
  localStorage.setItem('azilearn_forum_flags', JSON.stringify(localFlags));
  localStorage.setItem('azilearn_forum_warnings', JSON.stringify(localWarnings));
};

const loadForumMocks = () => {
  try {
    const profs = localStorage.getItem('azilearn_forum_profiles');
    if (profs) localProfiles = JSON.parse(profs);
    const p = localStorage.getItem('azilearn_forum_posts');
    if (p) localPosts = JSON.parse(p);
    const r = localStorage.getItem('azilearn_forum_replies');
    if (r) localReplies = JSON.parse(r);
    const l = localStorage.getItem('azilearn_forum_likes');
    if (l) localLikes = JSON.parse(l);
    const rep = localStorage.getItem('azilearn_forum_reposts');
    if (rep) localReposts = JSON.parse(rep);
    const fl = localStorage.getItem('azilearn_forum_flags');
    if (fl) localFlags = JSON.parse(fl);
    const w = localStorage.getItem('azilearn_forum_warnings');
    if (w) localWarnings = JSON.parse(w);
  } catch (e) {
    console.warn('Error loading mock storage for forum', e);
  }
};

loadForumMocks();

// Utility helper to fetch full joined user info
async function resolveProfile(userId: string): Promise<ForumProfile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return data as ForumProfile;
    }
  } catch (e) {
    // Try other tables or continue
  }
  
  // Try fallback
  const found = localProfiles.find(p => p.id === userId);
  if (found) return found;

  return {
    id: userId,
    username: `user_${userId.substring(0, 5)}`,
    full_name: 'AziLearn Member',
    role: 'student',
    is_admin: false
  };
}

export const forumService = {
  /**
   * Create profile (or sync)
   */
  async upsertProfile(profile: ForumProfile): Promise<ForumProfile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single();
      if (error) throw error;
      return data as ForumProfile;
    } catch (e) {
      const idx = localProfiles.findIndex(p => p.id === profile.id);
      if (idx !== -1) {
        localProfiles[idx] = { ...localProfiles[idx], ...profile };
      } else {
        localProfiles.push(profile);
      }
      saveForumMocks();
      return profile;
    }
  },

  /**
   * Fetch profile by username or id
   */
  async getProfile(userId: string): Promise<ForumProfile | null> {
    return resolveProfile(userId);
  },

  async getProfileByUsername(username: string): Promise<ForumProfile | null> {
    const cleanUsername = username.toLowerCase().replace('@', '').trim();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as ForumProfile;
    } catch (e) {
      //
    }
    const found = localProfiles.find(p => p.username.toLowerCase() === cleanUsername);
    return found || null;
  },

  /**
   * Fetch unified community feed containing both original posts and reposts
   */
  async getFeed(currentUserId?: string): Promise<ForumPost[]> {
    loadForumMocks();
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (posts) {
        // Fetch counters and meta
        const parsed = await Promise.all(posts.map(async (p) => {
          const profile = await resolveProfile(p.author_id);
          
          const { count: likes } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id);
          const { count: reps } = await supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('original_post_id', p.id);
          const { count: shares } = await supabase.from('post_shares').select('*', { count: 'exact', head: true }).eq('post_id', p.id);
          const { count: replies } = await supabase.from('replies').select('*', { count: 'exact', head: true }).eq('post_id', p.id);

          let hasLiked = false;
          let hasReposted = false;

          if (currentUserId) {
            const { data: l } = await supabase.from('post_likes').select('*').eq('post_id', p.id).eq('user_id', currentUserId).maybeSingle();
            hasLiked = !!l;
            
            const { data: r } = await supabase.from('reposts').select('*').eq('original_post_id', p.id).eq('reposted_by', currentUserId).maybeSingle();
            hasReposted = !!r;
          }

          return {
            ...p,
            username: profile.username || `user_${p.author_id.slice(0, 5)}`,
            author_full_name: profile.full_name,
            author_role: profile.role,
            like_count: likes || 0,
            repost_count: reps || 0,
            share_count: shares || 0,
            reply_count: replies || 0,
            has_liked: hasLiked,
            has_reposted: hasReposted
          };
        }));

        // Merge in any local posts (such as those saved in local storage fallback) that are not already present in the remote Supabase DB
        const localOnlyPosts = localPosts.filter(localP => !localP.is_deleted && !parsed.some(dbP => dbP.id === localP.id));
        const mergedPosts = [...localOnlyPosts, ...parsed];

        // Fetch remote Reposts to mix into feed (X-style)
        try {
          const { data: allReposts } = await supabase
            .from('reposts')
            .select('*')
            .order('created_at', { ascending: false });

          if (allReposts && allReposts.length > 0) {
            const repostItems: ForumPost[] = [];
            for (const rep of allReposts) {
              const basePostIdx = mergedPosts.findIndex(p => p.id === rep.original_post_id);
              if (basePostIdx !== -1) {
                const basePost = mergedPosts[basePostIdx];
                const repUser = await resolveProfile(rep.reposted_by);
                repostItems.push({
                  ...basePost,
                  id: `repost-${rep.id}`, // Unique ID for key mapping
                  is_repost_item: true,
                  reposted_by_user: repUser.username,
                  created_at: rep.created_at // Repost time dictates feed placement
                });
              }
            }
            return [...mergedPosts, ...repostItems].sort((a,b) => {
              // Pinned items stay on top unless it is a repost
              if (a.is_pinned && !a.is_repost_item && (!b.is_pinned || b.is_repost_item)) return -1;
              if (b.is_pinned && !b.is_repost_item && (!a.is_pinned || a.is_repost_item)) return 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
          }
        } catch (repError) {
          console.warn('Failed to resolve mixed reposts database items', repError);
        }

        return mergedPosts;
      }
    } catch (e) {
      console.warn('DB load feed failed, loading high-fidelity offline system:', e);
    }

    // Offline logic
    let feed = [...localPosts].filter(p => !p.is_deleted);
    
    // Mix in local reposts
    const injectedReposts = localReposts.map(rep => {
      const base = localPosts.find(p => p.id === rep.original_post_id);
      if (base) {
        const repUser = localProfiles.find(u => u.id === rep.reposted_by);
        return {
          ...base,
          id: `repost-${rep.id}`,
          is_repost_item: true,
          reposted_by_user: repUser?.username || 'someone',
          created_at: rep.created_at
        };
      }
      return null;
    }).filter(Boolean) as ForumPost[];

    let joinedFeed = [...feed, ...injectedReposts];

    // Enhance statistics
    return joinedFeed.map(post => {
      const baseId = post.is_repost_item ? (localReposts.find(r => `repost-${r.id}` === post.id)?.original_post_id || post.id) : post.id;
      const likesCount = localLikes.filter(l => l.post_id === baseId).length;
      const repostsCount = localReposts.filter(r => r.original_post_id === baseId).length;
      const sharesCount = localShares.filter(s => s.post_id === baseId).length;
      const repliesCount = localReplies.filter(r => r.post_id === baseId).length;

      const hasLiked = currentUserId ? localLikes.some(l => l.post_id === baseId && l.user_id === currentUserId) : false;
      const hasReposted = currentUserId ? localReposts.some(r => r.original_post_id === baseId && r.reposted_by === currentUserId) : false;

      // Author detail join
      const originalPostObj = localPosts.find(p => p.id === baseId) || post;
      const author = localProfiles.find(u => u.id === originalPostObj.author_id) || { username: 'unknown', full_name: 'Unknown User', role: 'student' as const };

      return {
        ...post,
        username: author.username,
        author_full_name: author.full_name,
        author_role: author.role,
        like_count: likesCount + (post.like_count || 0),
        repost_count: repostsCount + (post.repost_count || 0),
        share_count: sharesCount + (post.share_count || 0),
        reply_count: repliesCount + (post.reply_count || 0),
        has_liked: hasLiked,
        has_reposted: hasReposted
      };
    }).sort((a,b) => {
      if (a.is_pinned && !a.is_repost_item && (!b.is_pinned || b.is_repost_item)) return -1;
      if (b.is_pinned && !b.is_repost_item && (!a.is_pinned || a.is_repost_item)) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  /**
   * Submit post to public board
   */
  async createPost(authorId: string, title: string, content: string, tag: any): Promise<ForumPost> {
    const profile = await resolveProfile(authorId);
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          board_id: 'public_student_board',
          author_id: authorId,
          title,
          content,
          tag,
          is_pinned: false,
          is_deleted: false
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        username: profile.username,
        author_full_name: profile.full_name,
        author_role: profile.role,
        like_count: 0,
        repost_count: 0,
        share_count: 0,
        reply_count: 0,
        has_liked: false,
        has_reposted: false
      };
    } catch (e) {
      // Local fallback
      const newPost: ForumPost = {
        id: `fp-${Date.now()}`,
        author_id: authorId,
        title,
        content,
        tag,
        is_pinned: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        username: profile.username,
        author_full_name: profile.full_name,
        author_role: profile.role,
        like_count: 0,
        repost_count: 0,
        share_count: 0,
        reply_count: 0,
        has_liked: false,
        has_reposted: false
      };

      localPosts.unshift(newPost);
      saveForumMocks();
      return newPost;
    }
  },

  /**
   * Toggle Like (post_likes)
   */
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
    // Standardize ID in case it was a UI repackaged repost
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    try {
      const { data: existing, error: findError } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', cleanPostId)
        .eq('user_id', userId)
        .maybeSingle();

      if (findError) throw findError;

      let liked = false;
      if (existing) {
        await supabase.from('post_likes').delete().eq('post_id', cleanPostId).eq('user_id', userId);
        liked = false;
      } else {
        await supabase.from('post_likes').insert({ post_id: cleanPostId, user_id: userId });
        liked = true;

        // Custom trigger notifications inside Supabase database if like count reaches threshold (e.g. 10 likes)
        const { count } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', cleanPostId);
        if (count && count >= 10) {
          const { data: postRef } = await supabase.from('posts').select('author_id').eq('id', cleanPostId).maybeSingle();
          if (postRef) {
            await supabase.from('notifications').insert({
              user_id: postRef.author_id,
              type: 'warning_received', // Repurpose warning field or standard layout if notifications has specific type
              message: `🔥 High praise! Your post received over 10 likes!`,
              is_read: false
            });
          }
        }
      }

      const { count } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', cleanPostId);
      return { liked, count: count || 0 };
    } catch (e) {
      const likeIdx = localLikes.findIndex(l => l.post_id === cleanPostId && l.user_id === userId);
      let liked = false;
      if (likeIdx !== -1) {
        localLikes.splice(likeIdx, 1);
        liked = false;
      } else {
        localLikes.push({ post_id: cleanPostId, user_id: userId });
        liked = true;

        // Simulate 10 like threshold logic
        const sameLikes = localLikes.filter(l => l.post_id === cleanPostId).length;
        if (sameLikes >= 10) {
          const authorRef = localPosts.find(p => p.id === cleanPostId)?.author_id;
          if (authorRef) {
            // we will simulate NotificationBell trigger
            const { count: loadedCount } = await supabase.from('notifications').select('*', { count: 'exact' });
            // Add via communityService local handler
            try {
              const { communityService } = await import('./communityService');
              communityService.addLocalNotification(authorRef, 'warning_received', `🔥 High praise! Your post has received over 10 likes!`);
            } catch (err) {}
          }
        }
      }
      saveForumMocks();

      const totalCount = localLikes.filter(l => l.post_id === cleanPostId).length + (localPosts.find(p => p.id === cleanPostId)?.like_count || 0);

      return { liked, count: totalCount };
    }
  },

  /**
   * Action: Repost (Twitter/X style)
   */
  async toggleRepost(postId: string, userId: string): Promise<{ reposted: boolean; count: number }> {
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    try {
      const { data: existing, error: findError } = await supabase
        .from('reposts')
        .select('*')
        .eq('original_post_id', cleanPostId)
        .eq('reposted_by', userId)
        .maybeSingle();

      if (findError) throw findError;

      let reposted = false;
      if (existing) {
        await supabase.from('reposts').delete().eq('original_post_id', cleanPostId).eq('reposted_by', userId);
        reposted = false;
      } else {
        await supabase.from('reposts').insert({ original_post_id: cleanPostId, reposted_by: userId });
        reposted = true;
      }

      const { count } = await supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('original_post_id', cleanPostId);
      return { reposted, count: count || 0 };
    } catch (e) {
      const repIdx = localReposts.findIndex(r => r.original_post_id === cleanPostId && r.reposted_by === userId);
      let reposted = false;
      if (repIdx !== -1) {
        localReposts.splice(repIdx, 1);
        reposted = false;
      } else {
        localReposts.push({
          id: `rep-${Date.now()}`,
          original_post_id: cleanPostId,
          reposted_by: userId,
          created_at: new Date().toISOString()
        });
        reposted = true;
      }
      saveForumMocks();

      const totalCount = localReposts.filter(r => r.original_post_id === cleanPostId).length + (localPosts.find(p => p.id === cleanPostId)?.repost_count || 0);
      return { reposted, count: totalCount };
    }
  },

  /**
   * Action: Share Tracking
   */
  async recordShare(postId: string, userId: string): Promise<number> {
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    try {
      await supabase.from('post_shares').insert({ post_id: cleanPostId, shared_by: userId });
      const { count } = await supabase.from('post_shares').select('*', { count: 'exact', head: true }).eq('post_id', cleanPostId);
      return count || 0;
    } catch (e) {
      localShares.push({
        id: `sh-${Date.now()}`,
        post_id: cleanPostId,
        shared_by: userId,
        created_at: new Date().toISOString()
      });
      saveForumMocks();
      return localShares.filter(s => s.post_id === cleanPostId).length + (localPosts.find(p => p.id === cleanPostId)?.share_count || 0);
    }
  },

  /**
   * Post Pins (Admin Only)
   */
  async togglePin(postId: string, isPinned: boolean): Promise<boolean> {
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    try {
      const { error } = await supabase.from('posts').update({ is_pinned: isPinned }).eq('id', cleanPostId);
      if (error) throw error;
      
      // Notify user of pin event
      if (isPinned) {
        const { data: postRef } = await supabase.from('posts').select('author_id').eq('id', cleanPostId).maybeSingle();
        if (postRef) {
          await supabase.from('notifications').insert({
            user_id: postRef.author_id,
            type: 'post_pinned',
            message: `📌 Special Award! Your community post has been highlighted and pinned on the student boards!`,
            is_read: false
          });
        }
      }
      return true;
    } catch (e) {
      const post = localPosts.find(p => p.id === cleanPostId);
      if (post) {
        post.is_pinned = isPinned;
        
        if (isPinned) {
          try {
            const { communityService } = await import('./communityService');
            communityService.addLocalNotification(post.author_id, 'post_pinned', `📌 Special Award! Your community post has been highlighted and pinned on the student boards!`);
          } catch (err) {}
        }
      }
      saveForumMocks();
      return true;
    }
  },

  /**
   * Delete post (Admin/Owner)
   */
  async deletePost(postId: string): Promise<boolean> {
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    try {
      const { error } = await supabase.from('posts').update({ is_deleted: true }).eq('id', cleanPostId);
      if (error) throw error;
      return true;
    } catch (e) {
      const p = localPosts.find(x => x.id === cleanPostId);
      if (p) p.is_deleted = true;
      saveForumMocks();
      return true;
    }
  },

  /**
   * Fetch replies for thread
   */
  async getReplies(postId: string): Promise<ForumReply[]> {
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    try {
      const { data, error } = await supabase
        .from('replies')
        .select('*')
        .eq('post_id', cleanPostId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        const remoteReplies = await Promise.all(data.map(async (r) => {
          const profile = await resolveProfile(r.author_id);
          return {
            ...r,
            username: profile.username || 'member',
            author_full_name: profile.full_name,
            author_role: profile.role
          };
        }));

        // Merge in any helper local replies that aren't represented in Supabase DB (or on a local post)
        const localOnlyReplies = localReplies
          .filter(r => r.post_id === cleanPostId && !remoteReplies.some(dbR => dbR.id === r.id))
          .map(r => {
            const profile = localProfiles.find(p => p.id === r.author_id);
            return {
              ...r,
              username: profile?.username || 'member',
              author_full_name: profile?.full_name || 'Member',
              author_role: profile?.role || 'student'
            };
          });

        return [...remoteReplies, ...localOnlyReplies];
      }
    } catch (e) {
      //
    }

    return localReplies.filter(r => r.post_id === cleanPostId).map(r => {
      const profile = localProfiles.find(p => p.id === r.author_id);
      return {
        ...r,
        username: profile?.username || 'member',
        author_full_name: profile?.full_name || 'Member',
        author_role: profile?.role || 'student'
      };
    });
  },

  async createReply(postId: string, authorId: string, content: string): Promise<ForumReply> {
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    const profile = await resolveProfile(authorId);

    try {
      const { data, error } = await supabase
        .from('replies')
        .insert({
          post_id: cleanPostId,
          author_id: authorId,
          content,
          is_deleted: false
        })
        .select()
        .single();
      
      if (error) throw error;

      return {
        ...data,
        username: profile.username,
        author_full_name: profile.full_name,
        author_role: profile.role
      };
    } catch (e) {
      const newReply: ForumReply = {
        id: `fr-${Date.now()}`,
        post_id: cleanPostId,
        author_id: authorId,
        content,
        is_deleted: false,
        created_at: new Date().toISOString(),
        username: profile.username,
        author_full_name: profile.full_name,
        author_role: profile.role
      };
      localReplies.push(newReply);
      saveForumMocks();
      return newReply;
    }
  },

  // ─── ADMIN FLAGS & WARNINGS ────────────────────────────────────────────────

  /**
   * Report/Flag Post (Discreet)
   */
  async flagPost(postId: string, flaggedByUserId: string, reason: string): Promise<boolean> {
    const cleanPostId = postId.startsWith('repost-') 
      ? (localReposts.find(r => `repost-${r.id}` === postId)?.original_post_id || postId)
      : postId;

    try {
      const { error } = await supabase
        .from('flags')
        .insert({
          post_id: cleanPostId,
          flagged_by: flaggedByUserId,
          reason,
          resolved: false
        });
      if (error) throw error;

      // Notify actual admin of flag alert
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      if (admins && admins.length > 0) {
        await Promise.all(admins.map(adm => 
          supabase.from('notifications').insert({
            user_id: adm.id,
            type: 'flag_alert',
            message: `⚠️ System Flag: A community post has been flagged for review: "${reason}"`,
            is_read: false
          })
        ));
      }
      return true;
    } catch (e) {
      const basePost = localPosts.find(p => p.id === cleanPostId);
      const flagger = localProfiles.find(p => p.id === flaggedByUserId);
      
      const newFlag: ForumFlag = {
        id: `flg-${Date.now()}`,
        post_id: cleanPostId,
        flagged_by: flaggedByUserId,
        reason,
        resolved: false,
        created_at: new Date().toISOString(),
        post_content: basePost?.content || 'Unresolved Post Content',
        post_title: basePost?.title || 'Flagged Post',
        flagger_username: flagger?.username || 'member'
      };

      localFlags.unshift(newFlag);
      
      // Simulate Notification alert to admins
      localProfiles.filter(p => p.is_admin).forEach(adm => {
        try {
          import('./communityService').then(mod => {
            mod.communityService.addLocalNotification(adm.id, 'flag_alert', `⚠️ System Flag: A community post has been flagged for review: "${reason}"`);
          });
        } catch (err) {}
      });

      saveForumMocks();
      return true;
    }
  },

  async getUnresolvedFlags(): Promise<ForumFlag[]> {
    try {
      const { data, error } = await supabase
        .from('flags')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        return Promise.all(data.map(async (f) => {
          const post = await supabase.from('posts').select('title, content').eq('id', f.post_id).maybeSingle();
          const flagger = await resolveProfile(f.flagged_by);
          return {
            ...f,
            post_title: post.data?.title || 'Post Attachment Content',
            post_content: post.data?.content || '',
            flagger_username: flagger.username
          };
        }));
      }
    } catch (e) {
      //
    }
    
    return localFlags.filter(f => !f.resolved).map(f => {
      const basePost = localPosts.find(p => p.id === f.post_id);
      return {
        ...f,
        post_title: f.post_title || basePost?.title || 'Flagged Post',
        post_content: f.post_content || basePost?.content || ''
      };
    });
  },

  async resolveFlag(flagId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('flags').update({ resolved: true }).eq('id', flagId);
      if (error) throw error;
      return true;
    } catch (e) {
      const f = localFlags.find(x => x.id === flagId);
      if (f) f.resolved = true;
      saveForumMocks();
      return true;
    }
  },

  /**
   * Warnings system (Admin only)
   */
  async warnStudent(studentId: string, adminId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('warnings')
        .insert({
          student_id: studentId,
          admin_id: adminId,
          reason
        });
      if (error) throw error;

      // Insert real notification to targeted student
      await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'warning_received',
        message: `⚠️ Student Warning Issued: ${reason}. Please follow AziLearn Forum Guidelines.`,
        is_read: false
      });
      return true;
    } catch (e) {
      const studProf = await resolveProfile(studentId);
      const admProf = await resolveProfile(adminId);

      const newWarning: ForumWarning = {
        id: `wrn-${Date.now()}`,
        student_id: studentId,
        admin_id: adminId,
        reason,
        created_at: new Date().toISOString(),
        student_username: studProf.username,
        admin_username: admProf.username,
        student_full_name: studProf.full_name
      };

      localWarnings.unshift(newWarning);

      // Add local state notification on the target client
      try {
        const { communityService } = await import('./communityService');
        communityService.addLocalNotification(studentId, 'warning_received', `⚠️ Student Warning Issued: ${reason}. Please follow AziLearn Forum Guidelines.`);
      } catch (err) {}

      saveForumMocks();
      return true;
    }
  },

  async getWarnings(): Promise<ForumWarning[]> {
    try {
      const { data, error } = await supabase
        .from('warnings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        return Promise.all(data.map(async (w) => {
          const student = await resolveProfile(w.student_id);
          const admin = await resolveProfile(w.admin_id);
          return {
            ...w,
            student_username: student.username,
            admin_username: admin.username,
            student_full_name: student.full_name
          };
        }));
      }
    } catch (e) {
      //
    }

    return localWarnings.map(w => {
      const stud = localProfiles.find(p => p.id === w.student_id);
      const adm = localProfiles.find(p => p.id === w.admin_id);
      return {
        ...w,
        student_username: stud?.username || w.student_username || 'student',
        admin_username: adm?.username || w.admin_username || 'admin',
        student_full_name: stud?.full_name || w.student_full_name || 'Student Name'
      };
    });
  }
};
