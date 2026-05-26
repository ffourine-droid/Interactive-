import { supabase } from '../lib/supabase';

export interface PostAttachment {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  file_name: string;
  file_type: 'image' | 'pdf' | 'pptx' | 'docx';
  storage_path: string;
  created_at: string;
  // Local object URL for instant offline preview (only in memory)
  previewUrl?: string;
  // Simulated file size for display
  file_size?: number;
}

// Memory database for local fallback testing
let mockAttachments: PostAttachment[] = [];

// Load attachments from localStorage if available
try {
  const saved = localStorage.getItem('azilearn_forum_attachments');
  if (saved) {
    mockAttachments = JSON.parse(saved);
  }
} catch (e) {
  console.warn('Could not load mock attachments from localStorage', e);
}

const saveLocal = () => {
  try {
    localStorage.setItem('azilearn_forum_attachments', JSON.stringify(mockAttachments));
  } catch (e) {
    console.warn('Could not save mock attachments to localStorage', e);
  }
};

export const attachmentService = {
  /**
   * Determine file type category based on extension
   */
  getFileType(fileName: string): 'image' | 'pdf' | 'pptx' | 'docx' {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return 'image';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    if (ext === 'pptx' || ext === 'ppt') {
      return 'pptx';
    }
    return 'docx'; // Fallback / word document default
  },

  /**
   * Upload file to Supabase storage and record metadata in post_attachments
   */
  async uploadAttachment(
    file: File,
    boardId: string,
    postId: string | null,
    replyId: string | null,
    targetPostIdForReply?: string | null // For replies, folder is still under the post's folder
  ): Promise<PostAttachment> {
    const fileType = this.getFileType(file.name);
    const filenameSecured = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.__-]/g, '_')}`;
    
    // Path template: boards/{board_id}/{post_id}/{filename}
    // If reply, use the targetPostIdForReply, otherwise use the postId, or replyId fallback if somehow not passed
    const activePostFolder = targetPostIdForReply || postId || replyId || 'unassigned';
    const storagePath = `boards/${boardId}/${activePostFolder}/${filenameSecured}`;

    try {
      // 1. Upload to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('community-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. Insert metadata into post_attachments table
      const newRecord = {
        post_id: postId,
        reply_id: replyId,
        file_name: file.name,
        file_type: fileType,
        storage_path: storagePath
      };

      const { data: dbData, error: dbError } = await supabase
        .from('post_attachments')
        .insert(newRecord)
        .select()
        .single();

      if (dbError) throw dbError;

      return dbData as PostAttachment;
    } catch (e) {
      console.warn('Supabase attachment upload failed, falling back to local simulation:', e);

      // Offline simulation fallback
      const mockId = crypto.randomUUID();
      const localUrl = URL.createObjectURL(file);
      
      const newMockAttachment: PostAttachment = {
        id: mockId,
        post_id: postId,
        reply_id: replyId,
        file_name: file.name,
        file_type: fileType,
        storage_path: storagePath,
        created_at: new Date().toISOString(),
        previewUrl: localUrl,
        file_size: file.size
      };

      mockAttachments.push(newMockAttachment);
      saveLocal();

      return newMockAttachment;
    }
  },

  /**
   * Fetch attachments for specific post or multiple posts
   */
  async getAttachmentsForPost(postId: string): Promise<PostAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('post_attachments')
        .select('*')
        .eq('post_id', postId);

      if (error) throw error;
      if (data && data.length > 0) return data as PostAttachment[];
    } catch (e) {
      console.warn(`Failed to fetch attachments for post ${postId} from SB, using mock:`, e);
    }

    return mockAttachments.filter(att => att.post_id === postId);
  },

  /**
   * Fetch attachments for specific reply
   */
  async getAttachmentsForReply(replyId: string): Promise<PostAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('post_attachments')
        .select('*')
        .eq('reply_id', replyId);

      if (error) throw error;
      if (data && data.length > 0) return data as PostAttachment[];
    } catch (e) {
      console.warn(`Failed to fetch attachments for reply ${replyId} from SB, using mock:`, e);
    }

    return mockAttachments.filter(att => att.reply_id === replyId);
  },

  /**
   * Retrieves public URL for attachment download or display
   */
  getPublicUrl(storagePath: string, localPreviewUrl?: string): string {
    if (localPreviewUrl) {
      return localPreviewUrl;
    }
    try {
      const { data } = supabase.storage
        .from('community-attachments')
        .getPublicUrl(storagePath);
      
      return data.publicUrl;
    } catch (e) {
      return '';
    }
  },

  /**
   * Deletes a record and its file from Storage
   */
  async deleteAttachment(attachmentId: string): Promise<boolean> {
    const matchedMockIndex = mockAttachments.findIndex(att => att.id === attachmentId);
    let pathToDelete = '';
    
    if (matchedMockIndex !== -1) {
      pathToDelete = mockAttachments[matchedMockIndex].storage_path;
      mockAttachments.splice(matchedMockIndex, 1);
      saveLocal();
    }

    try {
      // Fetch DB metadata if not fully matching locally or to make sure we query SB
      const { data: dbItem } = await supabase
        .from('post_attachments')
        .select('storage_path')
        .eq('id', attachmentId)
        .maybeSingle();

      const finalPath = dbItem?.storage_path || pathToDelete;

      if (finalPath) {
        // Delete from Storage first
        await supabase.storage
          .from('community-attachments')
          .remove([finalPath]);

        // Delete from database
        await supabase
          .from('post_attachments')
          .delete()
          .eq('id', attachmentId);
      }

      return true;
    } catch (e) {
      console.warn('Deletions failed from live DB:', e);
      return true;
    }
  },

  /**
   * Deletes all files linked to a post during a teacher deletion event
   */
  async deleteAttachmentsForPost(postId: string): Promise<boolean> {
    try {
      // Find both DB and offline matches
      const localMatches = mockAttachments.filter(att => att.post_id === postId);
      mockAttachments = mockAttachments.filter(att => att.post_id !== postId);
      saveLocal();

      // Query database for all attachments related to this post or its replies
      const { data: dbAttachments } = await supabase
        .from('post_attachments')
        .select('id, storage_path')
        .eq('post_id', postId);

      const itemsToDelete = dbAttachments || localMatches;

      if (itemsToDelete && itemsToDelete.length > 0) {
        const paths = itemsToDelete.map(item => item.storage_path);
        
        // Remove from Storage
        await supabase.storage
          .from('community-attachments')
          .remove(paths);

        // Remove from DB table
        await supabase
          .from('post_attachments')
          .delete()
          .in('id', itemsToDelete.map(item => item.id));
      }

      return true;
    } catch (e) {
      console.warn(`Error clearing attachments for post ${postId}:`, e);
      return true;
    }
  }
};
