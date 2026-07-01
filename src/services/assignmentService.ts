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

    // Look for student in class
    let studentId = studentName;
    if (data.class_id) {
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', data.class_id)
        .ilike('name', studentName.trim())
        .maybeSingle();
      
      if (studentData) studentId = studentData.id;
    }

    return { assignment: data, studentId };
  }
};
