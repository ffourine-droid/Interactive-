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

/**
 * Flexible grade matching: Handles "Grade 4", "4", "Class 4", "Year 4", etc.
 */
export const isGradeMatch = (gradeA?: string | null, gradeB?: string | null): boolean => {
  if (!gradeA || !gradeB) return true;
  const a = gradeA.toLowerCase().trim();
  const b = gradeB.toLowerCase().trim();
  if (a === b) return true;
  if (a === 'all' || b === 'all' || a.includes('all') || b.includes('all')) return true;
  if (a.includes(b) || b.includes(a)) return true;
  
  // Compare digits e.g. "Grade 4" vs "4"
  const digitsA = a.match(/\d+/)?.[0];
  const digitsB = b.match(/\d+/)?.[0];
  if (digitsA && digitsB && digitsA === digitsB) return true;
  return false;
};

/**
 * Flexible school matching: Handles punctuation/spacing differences
 */
export const isSchoolMatch = (schoolA?: string | null, schoolB?: string | null): boolean => {
  if (!schoolA || !schoolB) return true;
  const a = schoolA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = schoolB.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
};

/**
 * Checks whether an assignment was created by the School Admin / Broadcast,
 * versus created by an individual classroom teacher.
 */
export const isSchoolAdminAssignment = (asgn: any): boolean => {
  if (!asgn) return false;
  return (
    asgn.is_broadcast === true ||
    asgn.is_broadcast === 'true' ||
    asgn.created_by_admin === true ||
    asgn.created_by_admin === 'true' ||
    asgn.class_name === 'School Broadcast' ||
    asgn.author_role === 'admin' ||
    asgn.created_by_role === 'admin' ||
    asgn.is_school_admin === true ||
    asgn.is_school_admin === 'true' ||
    Boolean(asgn.broadcast_id) ||
    Boolean(asgn.target_school_name) ||
    Boolean(asgn.target_teacher_name) ||
    Boolean(asgn.target_teacher_id) ||
    (!asgn.class_id && (asgn.school_name || asgn.target_school_name) && !asgn.teacher_id)
  );
};

/**
 * Checks whether an assignment was created directly by the specified teacher (or by a teacher).
 */
export const isTeacherCreatedAssignment = (asgn: any, teacherId?: string): boolean => {
  if (!asgn) return false;
  if (isSchoolAdminAssignment(asgn)) return false;
  if (teacherId && asgn.teacher_id) {
    return asgn.teacher_id === teacherId;
  }
  return !!asgn.teacher_id;
};

/**
 * Core Scoping Function:
 * Determines if a teacher is authorized and linked to an assignment:
 * 1. If created by the teacher themselves -> true
 * 2. If directly targeted to the teacher by ID or Name -> true
 * 3. If school admin/broadcast -> matches school and teacher's class grade/subject
 * 4. If regular class assignment -> matches teacher's classes
 */
export const isTeacherLinkedToAssignment = (
  asgn: any,
  teacherSubjects: { class_id?: string; subject?: string }[] = [],
  teacherClasses?: { id: string; name?: string; grade?: string }[],
  teacherId?: string,
  teacherSchoolName?: string,
  teacherName?: string
): boolean => {
  if (!asgn) return false;
  
  // 1. If this teacher created the assignment directly, they are always linked
  if (teacherId && asgn.teacher_id && asgn.teacher_id === teacherId) {
    return true;
  }

  // 2. If directly targeted to this teacher by ID or Name
  if (teacherId && asgn.target_teacher_id && asgn.target_teacher_id === teacherId) {
    return true;
  }
  if (teacherName && asgn.target_teacher_name) {
    const tName = teacherName.toLowerCase().trim();
    const asgnTName = asgn.target_teacher_name.toLowerCase().trim();
    if (tName === asgnTName || tName.includes(asgnTName) || asgnTName.includes(tName)) {
      return true;
    }
  }

  const isAdminBroadcast = isSchoolAdminAssignment(asgn);

  // 3. Handling for School Admin Broadcast assignments
  if (isAdminBroadcast) {
    // School Name validation (if both school names are available)
    const asgnSchool = asgn.school_name || asgn.target_school_name;
    if (teacherSchoolName && asgnSchool) {
      if (!isSchoolMatch(teacherSchoolName, asgnSchool)) {
        return false;
      }
    }

    const asgnClassId = asgn.class_id;
    const asgnGrade = asgn.grade;
    const asgnSubj = asgn.subject;

    // Direct Class ID match
    if (asgnClassId && teacherClasses && teacherClasses.some(c => c.id === asgnClassId)) {
      return true;
    }

    // Direct Class Name match
    if (asgn.class_name && asgn.class_name !== 'School Broadcast' && teacherClasses && teacherClasses.some(c => c.name?.toLowerCase().trim() === asgn.class_name?.toLowerCase().trim())) {
      return true;
    }

    // Check against teacher's classes: does teacher teach a class matching this grade?
    const classesForTeacher = teacherClasses || [];
    const matchingGradeClasses = classesForTeacher.filter(c => {
      return isGradeMatch(c.grade, asgnGrade) || isGradeMatch(c.name, asgnGrade);
    });

    if (matchingGradeClasses.length > 0) {
      // If teacher has defined subjects for these classes, check if any subject matches
      const matchingClassIds = new Set(matchingGradeClasses.map(c => c.id));
      const relevantSubjects = (teacherSubjects || []).filter(ts => ts.class_id && matchingClassIds.has(ts.class_id));

      if (relevantSubjects.length > 0) {
        const hasSubjMatch = relevantSubjects.some(ts => isSubjectMatch(ts.subject, asgnSubj));
        if (hasSubjMatch) return true;
        // If the assignment has no specific subject or is General
        if (!asgnSubj || isSubjectMatch(asgnSubj, 'General')) return true;
      } else {
        // Teacher teaches this grade without explicit subject restrictions
        return true;
      }
    }

    // Also check teacherSubjects directly (in case class_id list is separate)
    if (teacherSubjects && teacherSubjects.length > 0) {
      const subjectMatches = teacherSubjects.some(ts => {
        if (!isSubjectMatch(ts.subject, asgnSubj)) return false;
        if (asgnClassId && ts.class_id === asgnClassId) return true;
        const cls = classesForTeacher.find(c => c.id === ts.class_id);
        if (cls && (isGradeMatch(cls.grade, asgnGrade) || isGradeMatch(cls.name, asgnGrade))) {
          return true;
        }
        return false;
      });
      if (subjectMatches) return true;
    }

    // If teacher has no classes or subjects set up yet, allow seeing school broadcast assignments
    if (classesForTeacher.length === 0 && (!teacherSubjects || teacherSubjects.length === 0)) {
      return true;
    }

    // If assignment is general / all grades
    if (!asgnGrade || asgnGrade.toLowerCase().trim() === 'all' || asgnGrade.toLowerCase().trim() === 'all grades' || asgnGrade.toLowerCase().trim() === 'general') {
      return true;
    }

    // If the teacher belongs to the school and has matching grade in classes or subjects
    if (teacherSchoolName && asgnSchool && isSchoolMatch(teacherSchoolName, asgnSchool)) {
      if (matchingGradeClasses.length > 0) return true;
    }

    return false;
  }

  // 4. Handling for regular (non-broadcast) class assignments:
  // Must belong to one of the teacher's classes or have teacher_id match
  if (teacherClasses && teacherClasses.length > 0) {
    if (asgn.class_id && teacherClasses.some(c => c.id === asgn.class_id)) {
      return true;
    }
    if (asgn.class_name && teacherClasses.some(c => c.name?.toLowerCase().trim() === asgn.class_name?.toLowerCase().trim())) {
      return true;
    }
  }

  if (teacherSubjects && teacherSubjects.length > 0 && asgn.class_id) {
    if (teacherSubjects.some(ts => ts.class_id === asgn.class_id)) {
      return true;
    }
  }

  return false;
};

/**
 * Checks whether an assignment belongs to a specific class in the Teacher Class View.
 */
export const isAssignmentForClass = (
  asgn: any,
  classId: string,
  className?: string | null,
  classGrade?: string | null,
  teacherSubjects: { class_id?: string; subject?: string }[] = []
): boolean => {
  if (!asgn) return false;
  if (classId === 'dynamic-class') return true;
  if (asgn.class_id === classId) return true;
  if (asgn.class_name && className && asgn.class_name.toLowerCase().trim() === className.toLowerCase().trim()) {
    return true;
  }

  // School Admin Broadcast / Grade-level assignment
  if (isSchoolAdminAssignment(asgn)) {
    // Grade match
    if (!asgn.grade || !classGrade || isGradeMatch(asgn.grade, classGrade) || (className && isGradeMatch(asgn.grade, className))) {
      // Check subject restrictions if teacher has specific subjects configured for this class
      const classSubjects = teacherSubjects.filter(ts => ts.class_id === classId);
      if (classSubjects.length > 0) {
        return classSubjects.some(ts => isSubjectMatch(ts.subject, asgn.subject));
      }
      // If no specific subject restrictions, all broadcasts for this grade belong to the class
      return true;
    }
  }

  return false;
};

/**
 * Checks whether a given student or submission belongs to students rooted to the teacher.
 */
export const isStudentRootedToTeacher = (
  student: { id?: string; name?: string; class_id?: string },
  teacherClassIds: string[],
  rootedStudents?: { id?: string; name?: string; class_id?: string }[]
): boolean => {
  if (!student) return false;

  // Direct class_id match
  if (student.class_id && teacherClassIds.includes(student.class_id)) {
    return true;
  }

  // Roster match by id or name
  if (rootedStudents && rootedStudents.length > 0) {
    if (student.id && rootedStudents.some(s => s.id === student.id)) {
      return true;
    }
    if (student.name) {
      const cleanName = student.name.toLowerCase().trim();
      if (rootedStudents.some(s => s.name?.toLowerCase().trim() === cleanName)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Filter submissions strictly to students rooted to this teacher.
 */
export const filterSubmissionsForTeacher = (
  submissions: any[],
  options: {
    teacherId?: string;
    teacherClassIds?: string[];
    rootedStudents?: { id?: string; name?: string; class_id?: string }[];
    classId?: string;
  }
): any[] => {
  if (!Array.isArray(submissions)) return [];
  const { teacherId, teacherClassIds = [], rootedStudents = [], classId } = options;

  return submissions.filter(sub => {
    if (!sub) return false;

    // If specific classId is provided (e.g. inside class view), strict class filtering
    if (classId) {
      if (sub.class_id && sub.class_id === classId) return true;
      if (rootedStudents.length > 0) {
        const idMatch = sub.student_id && rootedStudents.some(s => s.id === sub.student_id);
        const nameMatch = sub.student_name && rootedStudents.some(s => s.name?.toLowerCase().trim() === sub.student_name?.toLowerCase().trim());
        return idMatch || nameMatch;
      }
      return false;
    }

    // Direct student match to teacher's rooted student roster
    if (rootedStudents.length > 0) {
      if (sub.student_id && rootedStudents.some(s => s.id === sub.student_id)) return true;
      if (sub.student_name && rootedStudents.some(s => s.name?.toLowerCase().trim() === sub.student_name?.toLowerCase().trim())) return true;
    }

    // Student class_id match
    if (sub.class_id && teacherClassIds.includes(sub.class_id)) {
      return true;
    }

    // Direct teacher assignment match (if student roster hasn't loaded yet)
    if (teacherId && sub.teacher_id === teacherId && !sub.is_broadcast) {
      return true;
    }

    return false;
  });
};

