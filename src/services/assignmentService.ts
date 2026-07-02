import { supabase } from '../lib/supabase';

export const assignmentService = {
  async searchAssignments(grade: string, teacherName?: string, schoolName?: string, code?: string, title?: string) {
    // If a code is provided, try to find that specific assignment first (using share_code)
    if (code?.trim()) {
      const { data: codeAsgn, error: codeError } = await supabase
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
        .eq('share_code', code.trim().toUpperCase())
        .maybeSingle();
      
      if (codeAsgn) return [codeAsgn];
      // If code was provided but not found, return empty (don't fall back to grade search if code was intended)
      return [];
    }

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

    // Look for student in class using RPC
    let studentId = studentName;
    if (data.class_id) {
      if (typeof window !== 'undefined') {
        let deviceId = localStorage.getItem('azilearn_device_id');
        if (!deviceId) {
          deviceId = 'dev-' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('azilearn_device_id', deviceId);
        }

        const { data: rpcRes, error: rpcErr } = await supabase.rpc('student_self_register', {
          p_name: studentName.trim(),
          p_grade: data.grade || 'Grade 7',
          p_device_id: deviceId,
          p_class_id: data.class_id
        });

        if (!rpcErr && rpcRes) {
          studentId = rpcRes.id || rpcRes.student_id || studentId;
        }
      }
    }

    return { assignment: data, studentId };
  }
};
