import { supabase } from '../lib/supabase';

export const assignmentService = {
  async searchAssignments(grade: string, teacherName?: string, schoolName?: string, title?: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        teacher:teacher_id (
          name,
          school_name
        ),
        class:class_id (
          name
        )
      `)
      .eq('grade', grade)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    let filtered = data;

    if (teacherName) {
      const term = teacherName.toLowerCase().trim();
      if (term) {
        filtered = filtered.filter((asgn: any) => 
          asgn.teacher?.name?.toLowerCase().includes(term)
        );
      }
    }

    if (schoolName) {
      const term = schoolName.toLowerCase().trim();
      if (term) {
        filtered = filtered.filter((asgn: any) => 
          asgn.teacher?.school_name?.toLowerCase().includes(term)
        );
      }
    }

    if (title) {
      const term = title.toLowerCase().trim();
      if (term) {
        filtered = filtered.filter((asgn: any) => 
          asgn.title?.toLowerCase().includes(term)
        );
      }
    }

    return filtered;
  },

  async joinAssignment(assignmentId: string, studentName: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Assignment not found.");

    // Students are added to the roster by the school admin — never self-registered.
    // A student must resolve to an exact roster match here or they cannot proceed.
    if (!studentName.trim()) {
      throw new Error("Please enter your name.");
    }

    const { resolveStudentIdentity } = await import('./studentIdentityService');
    const res = await resolveStudentIdentity(studentName, data.class_id || null, data.grade || null);

    if (res.status !== 'EXACT_MATCH' || !res.student) {
      throw new Error("We couldn't find your name on the class roster. Ask your school admin to add you, or check the spelling of your name.");
    }

    return { assignment: data, studentId: res.student.id };
  },

  async getOrCreateDraft(studentId: string, assignmentId: string) {
    const { data, error } = await supabase.rpc('get_or_create_draft', {
      p_student_id: studentId,
      p_assignment_id: assignmentId
    });

    if (error) {
      console.warn('get_or_create_draft RPC notice:', error.message);
      return null;
    }

    return typeof data === 'string' ? JSON.parse(data) : data;
  },

  async saveDraftAnswer(studentId: string, submissionId: string, questionId: string, answer: any) {
    const { data, error } = await supabase.rpc('save_draft_answer', {
      p_student_id: studentId,
      p_submission_id: submissionId,
      p_question_id: questionId,
      p_answer: answer
    });

    if (error) {
      console.warn('save_draft_answer RPC notice:', error.message);
    }

    return data;
  },

  async skipQuestion(studentId: string, submissionId: string, questionId: string) {
    const { data, error } = await supabase.rpc('skip_question', {
      p_student_id: studentId,
      p_submission_id: submissionId,
      p_question_id: questionId
    });

    if (error) {
      console.warn('skip_question RPC notice:', error.message);
    }

    return data;
  }
};
