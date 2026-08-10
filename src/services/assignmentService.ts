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

    // Resolve student ID: check class roster first, fallback to student_self_register
    let studentId = studentName;
    if (typeof window !== 'undefined') {
      let deviceId = localStorage.getItem('azilearn_device_id');
      if (!deviceId) {
        deviceId = 'dev-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('azilearn_device_id', deviceId);
      }

      if (data.class_id && studentName.trim()) {
        try {
          const { data: rosterStudents } = await supabase
            .from('students')
            .select('id, name')
            .eq('class_id', data.class_id);

          if (rosterStudents && rosterStudents.length > 0) {
            const trimmedName = studentName.trim().toLowerCase();
            const matchedStudent = rosterStudents.find(
              s => s.name && s.name.trim().toLowerCase() === trimmedName
            );
            if (matchedStudent?.id) {
              studentId = matchedStudent.id;
            }
          }
        } catch (lookupErr) {
          console.warn('Roster lookup warning:', lookupErr);
        }
      }

      if (studentId === studentName) {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('student_self_register', {
          p_name: studentName.trim(),
          p_grade: data.grade || 'Grade 7',
          p_device_id: deviceId,
          p_class_id: data.class_id || null
        });

        if (!rpcErr && rpcRes) {
          studentId = rpcRes.id || rpcRes.student_id || studentId;
        }
      }
    }

    return { assignment: data, studentId };
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
