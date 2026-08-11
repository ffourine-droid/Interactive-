import { supabase } from '../lib/supabase';

export interface StudentRecord {
  id: string;
  name: string;
  grade?: string;
  class_id?: string | null;
  school_name?: string;
  index_number?: string;
  total_xp?: number;
}

export interface StudentIdentityResult {
  status: 'EXACT_MATCH' | 'MULTIPLE_MATCHES' | 'NOT_FOUND';
  student?: StudentRecord;
  candidates?: StudentRecord[];
  typedName: string;
}

/**
 * Resolves a student's identity against the class roster or students table.
 * Does NOT use device_id for lookup or matching anywhere.
 */
export async function resolveStudentIdentity(
  typedName: string,
  classId?: string | null,
  grade?: string | null
): Promise<StudentIdentityResult> {
  const nameTrimmed = typedName.trim();
  if (!nameTrimmed) {
    return { status: 'NOT_FOUND', typedName: '' };
  }

  const nameLower = nameTrimmed.toLowerCase();
  let roster: any[] = [];

  try {
    if (classId) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId);
      if (!error && data) {
        roster = data;
      }
    } else {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .ilike('name', `%${nameTrimmed}%`);
      if (!error && data) {
        roster = data;
      }
    }
  } catch (err) {
    console.warn('Roster lookup warning:', err);
  }

  // Exact match filter (case-insensitive, trimmed)
  const exactMatches = roster.filter(
    s => s.name && s.name.trim().toLowerCase() === nameLower
  );

  if (exactMatches.length === 1) {
    const s = exactMatches[0];
    return {
      status: 'EXACT_MATCH',
      student: {
        id: s.id || s.student_id,
        name: s.name,
        grade: s.grade || grade || 'Grade 7',
        class_id: s.class_id || classId || null,
        school_name: s.school_name || '',
        index_number: s.index_number || '',
        total_xp: s.total_xp || 0
      },
      typedName: nameTrimmed
    };
  }

  if (exactMatches.length > 1) {
    return {
      status: 'MULTIPLE_MATCHES',
      candidates: exactMatches.map(s => ({
        id: s.id || s.student_id,
        name: s.name,
        grade: s.grade || grade || 'Grade 7',
        class_id: s.class_id || classId || null,
        school_name: s.school_name || '',
        index_number: s.index_number || '',
        total_xp: s.total_xp || 0
      })),
      typedName: nameTrimmed
    };
  }

  // If 0 exact matches, check near/partial matches in roster
  const nearMatches = roster.filter(
    s => s.name && (
      s.name.trim().toLowerCase().includes(nameLower) || 
      nameLower.includes(s.name.trim().toLowerCase())
    )
  );

  if (nearMatches.length > 0) {
    return {
      status: 'MULTIPLE_MATCHES',
      candidates: nearMatches.map(s => ({
        id: s.id || s.student_id,
        name: s.name,
        grade: s.grade || grade || 'Grade 7',
        class_id: s.class_id || classId || null,
        school_name: s.school_name || '',
        index_number: s.index_number || '',
        total_xp: s.total_xp || 0
      })),
      typedName: nameTrimmed
    };
  }

  return {
    status: 'NOT_FOUND',
    typedName: nameTrimmed
  };
}

/**
 * Creates a new guest student explicitly when user confirms "Yes, I'm new".
 * Passes device_id ONLY as a reference field at creation time.
 */
export async function createNewGuestStudent(
  typedName: string,
  grade: string = 'Grade 7',
  classId?: string | null
): Promise<StudentRecord> {
  let deviceId = typeof window !== 'undefined' ? localStorage.getItem('azilearn_device_id') : null;
  if (!deviceId) {
    deviceId = 'dev-' + Math.random().toString(36).substring(2, 15);
    if (typeof window !== 'undefined') {
      localStorage.setItem('azilearn_device_id', deviceId);
    }
  }

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('student_self_register', {
    p_name: typedName.trim(),
    p_grade: grade,
    p_device_id: deviceId,
    p_class_id: classId || null
  });

  if (rpcErr) throw rpcErr;

  const studentId = rpcRes?.id || rpcRes?.student_id;
  if (!studentId) {
    throw new Error('Failed to create new guest student profile.');
  }

  return {
    id: String(studentId),
    name: typedName.trim(),
    grade,
    class_id: classId || null
  };
}
