import { supabase } from '../lib/supabase';

export const assignmentService = {
  async searchAssignments(grade: string, searchTerm: string) {
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
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((item: any) => 
      item.title.toLowerCase().includes(term) ||
      item.subject.toLowerCase().includes(term) ||
      item.teacher?.name?.toLowerCase().includes(term) ||
      item.teacher?.school_name?.toLowerCase().includes(term) ||
      item.class?.name?.toLowerCase().includes(term)
    );
  },

  async joinAssignment(assignmentId: string, studentName: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (error || !data) throw new Error("Assignment not found.");

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
