export const normalizeSubject = (sub?: string | null): string => {
  return (sub || '').toLowerCase().trim();
};

export const isSubjectMatch = (subjA?: string | null, subjB?: string | null): boolean => {
  const a = normalizeSubject(subjA);
  const b = normalizeSubject(subjB);
  if (!a || !b) return true;
  if (a === 'general' || b === 'general') return true;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
};

export const isTeacherLinkedToAssignment = (
  asgn: any,
  teacherSubjects: { class_id?: string; subject?: string }[],
  teacherClasses?: { id: string; grade?: string }[]
): boolean => {
  if (!asgn) return false;
  
  const isBroadcast = asgn.is_broadcast === true || asgn.class_name === 'School Broadcast' || !asgn.class_id;
  if (!isBroadcast) {
    return true;
  }

  const asgnClassId = asgn.class_id;
  const asgnGradeNorm = (asgn.grade || '').toLowerCase().trim();
  const asgnSubj = asgn.subject;

  return teacherSubjects.some(ts => {
    if (!isSubjectMatch(ts.subject, asgnSubj)) {
      return false;
    }

    // Direct Class ID match
    if (asgnClassId && ts.class_id === asgnClassId) {
      return true;
    }

    // Grade match via class taught by teacher
    if (teacherClasses && teacherClasses.length > 0) {
      const cls = teacherClasses.find(c => c.id === ts.class_id);
      if (cls && cls.grade && cls.grade.toLowerCase().trim() === asgnGradeNorm) {
        return true;
      }
    }

    return false;
  });
};
