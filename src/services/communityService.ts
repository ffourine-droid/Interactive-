import { supabase } from '../lib/supabase';

export interface Board {
  id: string;
  class_id: string;
  subject: string;
  name: string;
  created_at: string;
}

export interface Post {
  id: string;
  board_id: string;
  author_id: string;
  title: string;
  content: string;
  tag: 'question' | 'discussion' | 'study_tip' | 'resource';
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  author_name: string;
  author_role: 'student' | 'teacher';
  upvote_count: number;
  reply_count: number;
  has_upvoted: boolean;
}

export interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  author_name: string;
  author_role: 'student' | 'teacher';
}

export interface Flag {
  id: string;
  post_id: string;
  flagged_by: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  post_title: string;
  board_name: string;
}

export interface Warning {
  id: string;
  student_id: string;
  teacher_id: string;
  reason: string;
  created_at: string;
  student_name: string;
  teacher_name: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'flag_alert' | 'warning_received' | 'post_pinned';
  message: string;
  is_read: boolean;
  created_at: string;
}

// Memory caching for authors to avoid redundant DB queries
const authorCache: Record<string, { name: string; role: 'student' | 'teacher' }> = {};

// Direct fallback mock databases in case table is not fully set up
let mockBoards: Board[] = [];
let mockPosts: Post[] = [];
let mockReplies: Reply[] = [];
let mockUpvotes: { post_id: string; user_id: string }[] = [];
let mockFlags: Flag[] = [];
let mockWarnings: Warning[] = [];
let mockNotifications: Notification[] = [];

// Initialize default mock data for high-fidelity offline/non-database testing
const initMockData = () => {
  if (mockBoards.length > 0) return;

  const prebuiltBoards: Board[] = [
    { id: 'b1', class_id: 'Grade 7', subject: 'Mathematics', name: '🧮 Grade 7 Maths Quest', created_at: new Date().toISOString() },
    { id: 'b2', class_id: 'Grade 7', subject: 'Science', name: '🧪 Grade 7 Science Laboratory', created_at: new Date().toISOString() },
    { id: 'b3', class_id: 'Grade 8', subject: 'Mathematics', name: '📐 Grade 8 Algebra & Geometry', created_at: new Date().toISOString() },
    { id: 'b4', class_id: 'Grade 8', subject: 'Science', name: '🧬 Grade 8 Chemistry & Biology', created_at: new Date().toISOString() },
    { id: 'b5', class_id: 'Grade 6', subject: 'Mathematics', name: '📊 Grade 6 Math Corner', created_at: new Date().toISOString() },
  ];
  mockBoards = prebuiltBoards;

  // Add mock posts
  mockPosts = [
    {
      id: 'p1',
      board_id: 'b1',
      author_id: 'student-sam',
      title: 'How do you solve linear equations with fractions?',
      content: 'Hello guys! Anyone who knows a quick method or study tip for solving equations like (2/3)x + 5 = 11? I keep getting the fraction conversion wrong in my homework assignments.',
      tag: 'question',
      is_pinned: true,
      is_deleted: false,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      author_name: 'Samuel Kiprop',
      author_role: 'student',
      upvote_count: 5,
      reply_count: 2,
      has_upvoted: false
    },
    {
      id: 'p2',
      board_id: 'b1',
      author_id: 'teacher-dan',
      title: '📌 Mathematics Revision Guides for Term 1 Exams',
      content: 'I have uploaded the exam revision guidelines in PDF format into the files repository. Please study chapters on ratio, percentages, and algebraic expressions. Feel free to ask your questions here.',
      tag: 'resource',
      is_pinned: true,
      is_deleted: false,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      author_name: 'Teacher Daniel Mwangi',
      author_role: 'teacher',
      upvote_count: 14,
      reply_count: 1,
      has_upvoted: true
    },
    {
      id: 'p3',
      board_id: 'b2',
      author_id: 'student-ann',
      title: 'Is baking soda acidic or basic?',
      content: 'We did an experiment with indicators in class yesterday and I want to confirm if baking soda is alkaline or acid. My blue litmus paper did not change color.',
      tag: 'discussion',
      is_deleted: false,
      is_pinned: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      author_name: 'Ann Wambui',
      author_role: 'student',
      upvote_count: 3,
      reply_count: 0,
      has_upvoted: false
    }
  ];

  mockReplies = [
    {
      id: 'r1',
      post_id: 'p1',
      author_id: 'teacher-dan',
      content: 'Great question Samuel! The best trick is to multiply BOTH sides of the equation by the denominator (which is 3) to clear the fraction. This turns the equation into: 2x + 15 = 33! Then simply solve for x, which is (33 - 15)/2 = 9.',
      is_deleted: false,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      author_name: 'Teacher Daniel Mwangi',
      author_role: 'teacher'
    },
    {
      id: 'r2',
      post_id: 'p1',
      author_id: 'student-ann',
      content: 'Thanks Teacher Dan! That is so much easier than matching decimals.',
      is_deleted: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      author_name: 'Ann Wambui',
      author_role: 'student'
    }
  ];

  mockUpvotes = [];
};

// Author resolution utility
async function resolveAuthor(authorId: string): Promise<{ name: string; role: 'student' | 'teacher' }> {
  if (authorCache[authorId]) {
    return authorCache[authorId];
  }

  try {
    // 1. Check if they are a teacher
    const { data: teacher } = await supabase
      .from('teachers')
      .select('name')
      .eq('id', authorId)
      .maybeSingle();

    if (teacher) {
      authorCache[authorId] = { name: teacher.name, role: 'teacher' };
      return authorCache[authorId];
    }

    // 2. Check if they are a student
    const { data: student } = await supabase
      .from('students')
      .select('name')
      .eq('id', authorId)
      .maybeSingle();

    if (student) {
      authorCache[authorId] = { name: student.name, role: 'student' };
      return authorCache[authorId];
    }
  } catch (e) {
    console.warn('Error resolving author database profile:', e);
  }

  // Handle mock fallback user mapping
  if (authorId === 'student-sam') return { name: 'Samuel Kiprop', role: 'student' };
  if (authorId === 'student-ann') return { name: 'Ann Wambui', role: 'student' };
  if (authorId === 'teacher-dan') return { name: 'Teacher Daniel Mwangi', role: 'teacher' };

  // Absolute fallback
  return { name: 'AziLearn User', role: 'student' };
}

export const communityService = {
  // ─── BOARDS ────────────────────────────────────────────────────────────────
  async getBoards(classId: string): Promise<Board[]> {
    initMockData();
    try {
      // Boards are filtered by class_id or grade. Can match e.g. "Grade 7" or a select UUID
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .or(`class_id.eq.${classId},class_id.ilike.${classId}`);

      if (error) throw error;
      if (data && data.length > 0) return data as Board[];

      // Fallback to match mock boards by grade
      const filteredMocks = mockBoards.filter(b => 
        b.class_id.toLowerCase().includes(classId.toLowerCase()) || 
        classId.toLowerCase().includes(b.class_id.toLowerCase())
      );
      if (filteredMocks.length > 0) return filteredMocks;
      return mockBoards;
    } catch (e) {
      console.warn('Failed to fetch boards from Supabase, applying mock data:', e);
      return mockBoards.filter(b => 
        b.class_id.toLowerCase().includes(classId.toLowerCase()) || 
        classId.toLowerCase().includes(b.class_id.toLowerCase())
      );
    }
  },

  async getAllBoards(): Promise<Board[]> {
    initMockData();
    try {
      const { data, error } = await supabase.from('boards').select('*');
      if (error) throw error;
      if (data && data.length > 0) return data as Board[];
      return mockBoards;
    } catch (e) {
      return mockBoards;
    }
  },

  async createBoard(classId: string, subject: string, name: string): Promise<Board> {
    const newBoard: Board = {
      id: crypto.randomUUID(),
      class_id: classId,
      subject,
      name,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({ class_id: classId, subject, name })
        .select()
        .single();
      if (error) throw error;
      return data as Board;
    } catch (e) {
      console.warn('DB creation of board bypassed. Saved locally.');
      mockBoards.unshift(newBoard);
      return newBoard;
    }
  },

  // ─── POSTS ─────────────────────────────────────────────────────────────────
  async getPosts(boardId: string, currentUserId?: string): Promise<Post[]> {
    initMockData();
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('board_id', boardId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const fullPosts = await Promise.all(data.map(async (p) => {
          const author = await resolveAuthor(p.author_id);
          
          // Get counters
          const { count: upvotes } = await supabase
            .from('post_upvotes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', p.id);

          const { count: replies } = await supabase
            .from('replies')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', p.id);

          let hasUpvoted = false;
          if (currentUserId) {
            const { data: vote } = await supabase
              .from('post_upvotes')
              .select('*')
              .eq('post_id', p.id)
              .eq('user_id', currentUserId)
              .maybeSingle();
            hasUpvoted = !!vote;
          }

          return {
            ...p,
            author_name: author.name,
            author_role: author.role,
            upvote_count: upvotes || 0,
            reply_count: replies || 0,
            has_upvoted: hasUpvoted
          };
        }));

        // Merge local mock posts that are not already present in Supabase DB output
        const localOnlyPosts = mockPosts
          .filter(mockP => mockP.board_id === boardId && !fullPosts.some(dbP => dbP.id === mockP.id))
          .map(mockP => {
            const isUpvoted = mockUpvotes.some(v => v.post_id === mockP.id && v.user_id === currentUserId);
            const r_count = mockReplies.filter(r => r.post_id === mockP.id).length;
            return {
              ...mockP,
              upvote_count: mockP.upvote_count + (isUpvoted && !mockP.has_upvoted ? 1 : 0),
              reply_count: r_count,
              has_upvoted: isUpvoted || mockP.has_upvoted
            };
          });

        return [...localOnlyPosts, ...fullPosts] as Post[];
      }
    } catch (e) {
      console.warn('Failed to load posts from Supabase, returning mocks:', e);
    }

    // High fidelity mock returns
    const postsInBoard = mockPosts.filter(p => p.board_id === boardId);
    return postsInBoard.map(p => {
      const isUpvoted = mockUpvotes.some(v => v.post_id === p.id && v.user_id === currentUserId);
      const vote_count = p.upvote_count + (isUpvoted && !p.has_upvoted ? 1 : 0);
      const r_count = mockReplies.filter(r => r.post_id === p.id).length;
      return {
        ...p,
        upvote_count: vote_count,
        reply_count: r_count,
        has_upvoted: isUpvoted || p.has_upvoted
      };
    });
  },

  async createPost(boardId: string, authorId: string, title: string, content: string, tag: 'question' | 'discussion' | 'study_tip' | 'resource' | any): Promise<Post> {
    const authorInfo = await resolveAuthor(authorId);
    const newPost: Post = {
      id: crypto.randomUUID(),
      board_id: boardId,
      author_id: authorId,
      title,
      content,
      tag,
      is_pinned: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      author_name: authorInfo.name,
      author_role: authorInfo.role,
      upvote_count: 0,
      reply_count: 0,
      has_upvoted: false
    };

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({ board_id: boardId, author_id: authorId, title, content, tag })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        author_name: authorInfo.name,
        author_role: authorInfo.role,
        upvote_count: 0,
        reply_count: 0,
        has_upvoted: false
      };
    } catch (e) {
      console.warn('DB creation of post bypassed. Saved locally.');
      mockPosts.unshift(newPost);
      return newPost;
    }
  },

  async pinPost(postId: string, isPinned: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: isPinned })
        .eq('id', postId);
      if (error) throw error;
      return true;
    } catch (e) {
      const post = mockPosts.find(p => p.id === postId);
      if (post) post.is_pinned = isPinned;
      return true;
    }
  },

  async deletePost(postId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', postId);
      if (error) throw error;
      return true;
    } catch (e) {
      const post = mockPosts.find(p => p.id === postId);
      if (post) post.is_deleted = true;
      return true;
    }
  },

  // ─── REPLIES ───────────────────────────────────────────────────────────────
  async getReplies(postId: string): Promise<Reply[]> {
    try {
      const { data, error } = await supabase
        .from('replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        return Promise.all(data.map(async (r) => {
          const author = await resolveAuthor(r.author_id);
          return {
            ...r,
            author_name: author.name,
            author_role: author.role
          };
        })) as Promise<Reply[]>;
      }
    } catch (e) {
      console.warn('Failed to load replies, fetching mocks:', e);
    }

    return mockReplies.filter(r => r.post_id === postId);
  },

  async createReply(postId: string, authorId: string, content: string): Promise<Reply> {
    const authorInfo = await resolveAuthor(authorId);
    const newReply: Reply = {
      id: crypto.randomUUID(),
      post_id: postId,
      author_id: authorId,
      content,
      is_deleted: false,
      created_at: new Date().toISOString(),
      author_name: authorInfo.name,
      author_role: authorInfo.role
    };

    try {
      const { data, error } = await supabase
        .from('replies')
        .insert({ post_id: postId, author_id: authorId, content, is_deleted: false })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        author_name: authorInfo.name,
        author_role: authorInfo.role
      };
    } catch (e) {
      console.warn('DB creation of reply bypassed. Saved locally.');
      mockReplies.push(newReply);
      return newReply;
    }
  },

  // ─── UPVOTES ───────────────────────────────────────────────────────────────
  async toggleUpvote(postId: string, userId: string): Promise<number> {
    try {
      const { data: existing, error: queryError } = await supabase
        .from('post_upvotes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (queryError) throw queryError;

      if (existing) {
        await supabase
          .from('post_upvotes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('post_upvotes')
          .insert({ post_id: postId, user_id: userId });
      }

      const { count } = await supabase
        .from('post_upvotes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      return count || 0;
    } catch (e) {
      const index = mockUpvotes.findIndex(v => v.post_id === postId && v.user_id === userId);
      if (index !== -1) {
        mockUpvotes.splice(index, 1);
      } else {
        mockUpvotes.push({ post_id: postId, user_id: userId });
      }
      return mockPosts.find(p => p.id === postId)?.upvote_count || 0;
    }
  },

  // ─── FLAGS ─────────────────────────────────────────────────────────────────
  async flagPost(postId: string, flaggedBy: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('flags')
        .insert({ post_id: postId, flagged_by: flaggedBy, reason, resolved: false });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('Saving flag locally', e);
      const matchedPost = mockPosts.find(p => p.id === postId);
      mockFlags.unshift({
        id: crypto.randomUUID(),
        post_id: postId,
        flagged_by: flaggedBy,
        reason,
        resolved: false,
        created_at: new Date().toISOString(),
        post_title: matchedPost?.title || 'Unknown Post Title',
        board_name: 'Grade 7 Forum'
      });
      return true;
    }
  },

  async getUnresolvedFlags(): Promise<Flag[]> {
    initMockData();
    try {
      const { data, error } = await supabase
        .from('flags')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        return Promise.all(data.map(async (f) => {
          const { data: post } = await supabase.from('posts').select('title, board_id').eq('id', f.post_id).maybeSingle();
          const { data: board } = post ? await supabase.from('boards').select('name').eq('id', post.board_id).maybeSingle() : { data: null };
          
          return {
            ...f,
            post_title: post?.title || 'Unknown Post',
            board_name: board?.name || 'Kenyan Board'
          };
        })) as Promise<Flag[]>;
      }
    } catch (e) {
      console.warn('Failed to fetch flags from DB, using mock flags:', e);
    }
    return mockFlags.filter(f => !f.resolved);
  },

  async resolveFlag(flagId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('flags')
        .update({ resolved: true })
        .eq('id', flagId);
      if (error) throw error;
      return true;
    } catch (e) {
      const flag = mockFlags.find(f => f.id === flagId);
      if (flag) flag.resolved = true;
      return true;
    }
  },

  // ─── WARNINGS ──────────────────────────────────────────────────────────────
  async warnStudent(studentId: string, teacherId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('warnings')
        .insert({ student_id: studentId, teacher_id: teacherId, reason });
      if (error) throw error;
      return true;
    } catch (e) {
      const teacher = await resolveAuthor(teacherId);
      const student = await resolveAuthor(studentId);
      mockWarnings.unshift({
        id: crypto.randomUUID(),
        student_id: studentId,
        teacher_id: teacherId,
        reason,
        created_at: new Date().toISOString(),
        student_name: student.name,
        teacher_name: teacher.name
      });
      return true;
    }
  },

  async getWarningsForTeacher(teacherId: string): Promise<Warning[]> {
    try {
      const { data, error } = await supabase
        .from('warnings')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        return Promise.all(data.map(async (w) => {
          const studentProfile = await resolveAuthor(w.student_id);
          const teacherProfile = await resolveAuthor(w.teacher_id);
          return {
            ...w,
            student_name: studentProfile.name,
            teacher_name: teacherProfile.name
          };
        })) as Promise<Warning[]>;
      }
    } catch (e) {
      console.warn('Error fetching warnings', e);
    }
    return mockWarnings.filter(w => w.teacher_id === teacherId);
  },

  async getWarningsForStudent(studentId: string): Promise<Warning[]> {
    try {
      const { data, error } = await supabase
        .from('warnings')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        return Promise.all(data.map(async (w) => {
          const studentProfile = await resolveAuthor(w.student_id);
          const teacherProfile = await resolveAuthor(w.teacher_id);
          return {
            ...w,
            student_name: studentProfile.name,
            teacher_name: teacherProfile.name
          };
        })) as Promise<Warning[]>;
      }
    } catch (e) {
      console.warn('Error fetching student warnings', e);
    }
    return mockWarnings.filter(w => w.student_id === studentId);
  },

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Notification[];
    } catch (e) {
      // Simulate warnings and pins triggering notifications inside local memory if tables aren't setup yet
      // This happens dynamically during actions
      return mockNotifications.filter(n => n.user_id === userId);
    }
  },

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
      return true;
    } catch (e) {
      const notif = mockNotifications.find(n => n.id === notificationId);
      if (notif) notif.is_read = true;
      return true;
    }
  },

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    } catch (e) {
      mockNotifications.forEach(n => {
        if (n.user_id === userId) n.is_read = true;
      });
      return true;
    }
  },

  // Facilitates programmatic notification generation in client fallback
  addLocalNotification(userId: string, type: 'flag_alert' | 'warning_received' | 'post_pinned', message: string) {
    mockNotifications.unshift({
      id: crypto.randomUUID(),
      user_id: userId,
      type,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    });
  }
};
