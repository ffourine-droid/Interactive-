import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { assignmentService } from '../services/assignmentService';
import { useStudent } from '../contexts/StudentContext';
import { AssignmentDiscoveryView } from './assignment/AssignmentDiscoveryView';
import { StudentAssignmentTaking } from './assignment/StudentAssignmentTaking';
import { AssignmentSuccessCelebration } from './assignment/AssignmentSuccessCelebration';
import { ChevronLeft } from 'lucide-react';

interface Question {
  id: string;
  type: 'mcq' | 'short_answer' | 'photo';
  text: string;
  options: string[];
  correct_option: number | null;
  max_marks?: number;
  marks?: number;
  points?: number;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  class_id?: string;
  class_name: string;
  due_date: string;
  questions: Question[];
  is_broadcast?: boolean;
  teacher_id?: string;
  teacher?: {
    name?: string;
    school_name?: string;
  };
}

export const StudentAssignmentView: React.FC<{ 
  onBack: () => void, 
  onExamsClick?: () => void,
  preSelectedAssignmentId?: string 
}> = ({ onBack, onExamsClick, preSelectedAssignmentId }) => {
  const { currentStudent } = useStudent();
  const [step, setStep] = useState<'entry' | 'taking' | 'success'>('entry');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchSchool, setSearchSchool] = useState(() => {
    if (currentStudent?.school_name) return currentStudent.school_name;
    try {
      const studentStr = localStorage.getItem('azilearn_student');
      if (studentStr) {
        const parsed = JSON.parse(studentStr);
        return parsed.school_name || '';
      }
    } catch {}
    return '';
  });
  const [searchTitle, setSearchTitle] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  
  const [studentName, setStudentName] = useState(() => {
    if (currentStudent?.name) return currentStudent.name;
    try {
      const studentStr = localStorage.getItem('azilearn_student');
      if (studentStr) {
        const parsed = JSON.parse(studentStr);
        return parsed.name || '';
      }
    } catch {}
    return '';
  });

  const [searchGrade, setSearchGrade] = useState(() => {
    if (currentStudent?.grade) return currentStudent.grade;
    try {
      const studentStr = localStorage.getItem('azilearn_student');
      if (studentStr) {
        const parsed = JSON.parse(studentStr);
        return parsed.grade || 'Grade 7';
      }
    } catch {}
    return 'Grade 7';
  });

  const [studentId, setStudentId] = useState<string | null>(() => {
    if (currentStudent?.student_id) return currentStudent.student_id;
    try {
      const studentStr = localStorage.getItem('azilearn_student');
      if (studentStr) {
        const parsed = JSON.parse(studentStr);
        return parsed.id || null;
      }
    } catch {}
    return null;
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [needsClassSelection, setNeedsClassSelection] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submission, setSubmission] = useState<any | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  
  // Direct find states
  const [directFindLoading, setDirectFindLoading] = useState(false);
  const [directFindError, setDirectFindError] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (!isInitialized) {
      if (currentStudent) {
        setStudentName(currentStudent.name || '');
        setStudentId(currentStudent.student_id || null);
        setSearchGrade(currentStudent.grade || 'Grade 7');
        setSearchSchool(currentStudent.school_name || '');
        setIsInitialized(true);
      } else {
        const studentStr = localStorage.getItem('azilearn_student');
        if (studentStr) {
          try {
            const parsed = JSON.parse(studentStr);
            setStudentName(parsed.name || '');
            setStudentId(parsed.id || null);
            setSearchGrade(parsed.grade || 'Grade 7');
            setSearchSchool(parsed.school_name || '');
          } catch {}
        }
        setIsInitialized(true);
      }
    }
  }, [currentStudent, isInitialized]);

  useEffect(() => {
    // STRICT: No assignment should load before a student puts their information (name, teacher, school).
    // This prevents loading all assignments from the database.
    if (step === 'entry' && isInitialized && !preSelectedAssignmentId) {
      if (studentName.trim() && searchTeacher.trim() && searchSchool.trim()) {
        fetchAssignments();
      }
    }
  }, [step, isInitialized, preSelectedAssignmentId]);

  useEffect(() => {
    if (preSelectedAssignmentId && step === 'entry') {
      handleJoinAssignment(preSelectedAssignmentId);
    }
  }, [preSelectedAssignmentId, step]);

  const fetchAssignments = async () => {
    // STRICT: No assignment should load before a student puts their information.
    // This enables the app to load only the searched school assignment instead of all assignments in the database.
    if (!studentName.trim() || !searchTeacher.trim() || !searchSchool.trim()) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Search only for the searched school (and teacher if provided)
      const data = await assignmentService.searchAssignments(searchGrade, searchTeacher, searchSchool, searchTitle);
      setAssignments(data || []);
      if (!data || data.length === 0) {
        showToast(`No assignments found for ${searchSchool.trim()} (${searchGrade}).`, "info");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load assignments.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSchoolFind = async (school: string, title: string, grade: string) => {
    if (!studentName.trim()) {
      showToast("Please write your name before getting the assignment.", "error");
      return;
    }
    if (!searchTeacher.trim()) {
      showToast("Please write your teacher's name before getting the assignment.", "error");
      return;
    }
    if (!school.trim()) {
      showToast("Please write your school name before getting the assignment.", "error");
      return;
    }

    setDirectFindLoading(true);
    setDirectFindError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("find_school_assignment", {
        p_school_name: school.trim(),
        p_title: title.trim(),
        p_grade: grade,
      });

      if (rpcError) throw new Error("Could not search for assignment. Please try again.");
      
      const response = data as any;
      if (!response || !response.success || !response.assignment) {
        throw new Error(response?.message || "No assignment found matching those exact details.");
      }

      showToast("Assignment found! Opening...", "success");
      await handleJoinAssignment(response.assignment.id);
    } catch (err: any) {
      setDirectFindError(err.message);
      showToast(err.message, "error");
    } finally {
      setDirectFindLoading(false);
    }
  };

  const handleJoinAssignment = async (id: string) => {
    if (!studentName.trim()) {
      showToast("Please write your name before getting the assignment.", "error");
      return;
    }
    if (!searchTeacher.trim()) {
      showToast("Please write your teacher's name before getting the assignment.", "error");
      return;
    }
    if (!searchSchool.trim()) {
      showToast("Please write your school before getting the assignment.", "error");
      return;
    }

    setLoading(true);
    try {
      const { assignment: data, studentId: sid } = await assignmentService.joinAssignment(id, studentName);
      setAssignment(data as Assignment);
      setStudentId(sid);
      sessionStorage.setItem('azilearn_student_name', studentName);

      // For broadcast assignments, resolve/ask for class right away
      if ((data as Assignment).is_broadcast) {
        let existingClassId: string | null = null;

        if (studentName) {
          try {
            const { resolveStudentIdentity } = await import('../services/studentIdentityService');
            const res = await resolveStudentIdentity(studentName, null, (data as Assignment).grade);
            if (res.student?.class_id) existingClassId = res.student.class_id;
          } catch {}
        }

        if (!existingClassId) {
          let schoolId = (data as any).school_id || (data as any).target_school_id;
          if (!schoolId && (data as any).teacher_id) {
            const { data: teacherRow } = await supabase
              .from('teachers')
              .select('school_id')
              .eq('id', (data as any).teacher_id)
              .maybeSingle();
            if (teacherRow?.school_id) schoolId = teacherRow.school_id;
          }

          let query = supabase.from('classes').select('id, name').eq('grade', (data as Assignment).grade || 'Grade 7');
          if (schoolId) query = query.eq('school_id', schoolId);

          const { data: classes } = await query;

          if (classes && classes.length > 1) {
            setAvailableClasses(classes);
            setNeedsClassSelection(true);
          } else if (classes && classes.length === 1) {
            setSelectedClassId(classes[0].id);
          }
        } else {
          setSelectedClassId(existingClassId);
        }
      }

      // Check draft & submission via get_or_create_draft for registered students
      const isUuid = (v: any) => v && String(v).length === 36 && String(v).includes('-');
      if (isUuid(sid)) {
        const draftRes = await assignmentService.getOrCreateDraft(sid, id);
        if (draftRes) {
          if (draftRes.already_submitted) {
            const { data: subData } = await supabase
              .from('assignment_submissions')
              .select('*')
              .eq('assignment_id', id)
              .eq('student_id', sid)
              .maybeSingle();

            setSubmission(subData || {
              assignment_id: id,
              student_id: sid,
              status: 'submitted',
            });
            setStep('success');
            setLoading(false);
            return;
          }

          if (draftRes.submission_id || draftRes.id) {
            setSubmissionId(draftRes.submission_id || draftRes.id);
          }

          if (draftRes.draft_answers && typeof draftRes.draft_answers === 'object') {
            setAnswers(draftRes.draft_answers);
          }

          if (draftRes.skipped_questions) {
            if (Array.isArray(draftRes.skipped_questions)) {
              setSkippedQuestions(new Set(draftRes.skipped_questions));
            } else if (typeof draftRes.skipped_questions === 'object') {
              setSkippedQuestions(new Set(Object.keys(draftRes.skipped_questions)));
            }
          }
        }
      }

      setStep('taking');
      showToast("Assignment ready! Good luck! ✨", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const saveAnswerDraft = async (questionId: string, val: any) => {
    const activeStudentId = currentStudent?.student_id || studentId;
    const isUuid = (v: any) => v && String(v).length === 36 && String(v).includes('-');

    if (!submissionId || !activeStudentId || !isUuid(activeStudentId)) return;

    await assignmentService.saveDraftAnswer(activeStudentId, submissionId, questionId, val);
  };

  const handleSkipQuestionRemote = async (questionId: string) => {
    const activeStudentId = currentStudent?.student_id || studentId;
    const isUuid = (v: any) => v && String(v).length === 36 && String(v).includes('-');

    if (submissionId && activeStudentId && isUuid(activeStudentId)) {
      await assignmentService.skipQuestion(activeStudentId, submissionId, questionId);
    }
  };

  const ensureClassSelected = async (): Promise<string | null> => {
    if (!assignment) return null;

    if (currentStudent?.class_id) return currentStudent.class_id;
    const effectiveName = studentName.trim() || currentStudent?.name;
    if (effectiveName) {
      try {
        const { resolveStudentIdentity } = await import('../services/studentIdentityService');
        const res = await resolveStudentIdentity(effectiveName, null, assignment.grade);
        if (res.student?.class_id) return res.student.class_id;
      } catch {}
    }

    if (selectedClassId) return selectedClassId;

    let schoolId = (assignment as any).school_id || (assignment as any).target_school_id;

    if (!schoolId && assignment.teacher_id) {
      const { data: teacherRow } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('id', assignment.teacher_id)
        .maybeSingle();
      if (teacherRow?.school_id) {
        schoolId = teacherRow.school_id;
      }
    }

    let query = supabase.from('classes').select('id, name').eq('grade', assignment.grade);
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data: classes, error } = await query;

    if (error || !classes || classes.length === 0) {
      return null;
    }

    if (classes.length === 1) {
      setSelectedClassId(classes[0].id);
      return classes[0].id;
    }

    setAvailableClasses(classes);
    setNeedsClassSelection(true);
    return 'PENDING';
  };

  const submitAssignment = async (
    submittedAnswers: Record<string, any>, 
    submittedFiles: Record<string, File>, 
    submittedSkipped: Set<string>
  ) => {
    if (!assignment) return;
    
    setSubmitting(true);
    try {
      const finalAnswers: Record<string, any> = {};
      for (const [qId, val] of Object.entries(submittedAnswers)) {
        if (!submittedSkipped.has(qId) && val !== undefined && val !== '') {
          finalAnswers[qId] = val;
        }
      }
      
      // Upload photos if any
      for (const qId of Object.keys(submittedFiles)) {
        if (submittedSkipped.has(qId)) continue;
        const file = submittedFiles[qId];
        const fileExt = file.name.split('.').pop();
        const fileName = `${assignment.id}/${studentName.replace(/\s+/g, '_')}_${qId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('assignment-photos')
          .upload(fileName, file);
        
        if (uploadError) throw new Error("Failed to upload photo work. Please try again.");
        
        const { data: publicUrlData } = supabase.storage
          .from('assignment-photos')
          .getPublicUrl(fileName);
          
        finalAnswers[qId] = publicUrlData.publicUrl;
      }

      // Calculate score for MCQs based on submitted answers
      let mcqCount = 0;
      let correctCount = 0;
      
      assignment.questions.forEach(q => {
        if (q.type === 'mcq' && finalAnswers[q.id] !== undefined) {
          mcqCount++;
          if (parseInt(finalAnswers[q.id]) === q.correct_option) {
            correctCount++;
          }
        }
      });

      const score = mcqCount > 0 ? Math.round((correctCount / mcqCount) * 100) : null;

      let submissionRecorded = false;
      let assignedTeacherName = null;
      let activeStudentId = currentStudent?.student_id || studentId;
      const isUuid = (id: any) => id && String(id).length === 36 && String(id).includes('-');
      const effectiveStudentName = studentName.trim() || currentStudent?.name || 'Student';

      const findRosterStudentId = async (classId: string | null) => {
        if (!effectiveStudentName) return null;
        try {
          const { resolveStudentIdentity } = await import('../services/studentIdentityService');
          const res = await resolveStudentIdentity(effectiveStudentName, classId, assignment?.grade || 'Grade 7');
          if (res.status === 'EXACT_MATCH' && res.student) {
            return res.student.id;
          }
          if (res.candidates && res.candidates.length > 0) {
            return res.candidates[0].id;
          }
        } catch (err) {
          console.warn('Roster lookup warning:', err);
        }
        return null;
      };

      if (assignment.is_broadcast) {
        const classId = await ensureClassSelected();
        if (classId === 'PENDING') {
          setSubmitting(false);
          return;
        }

        if (!isUuid(activeStudentId)) {
          const rosterMatchId = await findRosterStudentId(classId);
          if (rosterMatchId) {
            activeStudentId = rosterMatchId;
          }
        }

        if (activeStudentId && isUuid(activeStudentId)) {
          const { data, error: submitError } = await supabase.rpc('submit_broadcast_assignment', {
            p_student_id: activeStudentId,
            p_assignment_id: assignment.id,
            p_answers: finalAnswers
          });

          const response = data as any;
          if (!submitError && response && response.success !== false) {
            submissionRecorded = true;
            assignedTeacherName = response?.teacher_assigned;
          }
        }

        if (!submissionRecorded) {
          const cleanTeacherId = (id: any) => {
            if (!id) return null;
            const str = String(id).trim().toLowerCase();
            if (str === 'null' || str === 'undefined' || str === '') return null;
            if (str.length !== 36) return null;
            return id;
          };

          const rpcParams: any = {
            p_assignment_id: assignment.id,
            p_student_name: effectiveStudentName,
            p_answers: finalAnswers,
            p_teacher_id: cleanTeacherId(assignment.teacher_id),
          };

          if (activeStudentId && isUuid(activeStudentId)) {
            rpcParams.p_student_id = activeStudentId;
          }

          const { data: rpcRes, error: submitError } = await supabase.rpc('submit_school_assignment', rpcParams);
          const response = rpcRes as any;
          if (!submitError && response && response.success !== false) {
            submissionRecorded = true;
          }
        }
      } else {
        const cleanTeacherId = (id: any) => {
          if (!id) return null;
          const str = String(id).trim().toLowerCase();
          if (str === 'null' || str === 'undefined' || str === '') return null;
          if (str.length !== 36) return null;
          return id;
        };

        if (!isUuid(activeStudentId)) {
          const rosterMatchId = await findRosterStudentId(assignment.class_id || null);
          if (rosterMatchId) {
            activeStudentId = rosterMatchId;
          }
        }

        const isRegisteredStudent = isUuid(activeStudentId);

        const rpcParams: any = {
          p_assignment_id: assignment.id,
          p_student_name: effectiveStudentName,
          p_answers: finalAnswers,
          p_teacher_id: cleanTeacherId(assignment.teacher_id),
        };

        if (isRegisteredStudent) {
          rpcParams.p_student_id = activeStudentId;
        }

        const { data: rpcRes, error: submitError } = await supabase.rpc('submit_school_assignment', rpcParams);
        const response = rpcRes as any;
        if (!submitError && response && response.success !== false) {
          submissionRecorded = true;
        }
      }

      if (submissionRecorded) {
        const applySubmissionTeacherId = async () => {
          let tid = assignment.teacher_id && String(assignment.teacher_id).trim() !== 'null' ? assignment.teacher_id : null;
          let cid = typeof selectedClassId === 'string' && selectedClassId !== 'PENDING' ? selectedClassId : null;

          if (!cid && effectiveStudentName) {
            try {
              const { resolveStudentIdentity } = await import('../services/studentIdentityService');
              const res = await resolveStudentIdentity(effectiveStudentName, null, assignment?.grade);
              if (res.student?.class_id) cid = res.student.class_id;
            } catch {}
          }

          if (cid && !tid) {
            if (assignment.subject) {
              const { data: ts } = await supabase.from('teacher_subjects').select('teacher_id').eq('class_id', cid).ilike('subject', assignment.subject.trim()).maybeSingle();
              if (ts?.teacher_id) tid = ts.teacher_id;
            }
            if (!tid) {
              const { data: tsAny } = await supabase.from('teacher_subjects').select('teacher_id').eq('class_id', cid).limit(1).maybeSingle();
              if (tsAny?.teacher_id) tid = tsAny.teacher_id;
            }
            if (!tid) {
              const { data: cl } = await supabase.from('classes').select('teacher_id').eq('id', cid).maybeSingle();
              if (cl?.teacher_id) tid = cl.teacher_id;
            }
          }

          const updatePayload: any = { is_broadcast: assignment.is_broadcast === true };
          if (tid) updatePayload.teacher_id = tid;

          if (activeStudentId && isUuid(activeStudentId)) {
            await supabase.from('assignment_submissions').update(updatePayload).eq('assignment_id', assignment.id).eq('student_id', String(activeStudentId));
          } else if (effectiveStudentName) {
            await supabase.from('assignment_submissions').update(updatePayload).eq('assignment_id', assignment.id).eq('student_name', effectiveStudentName);
          }
        };
        applySubmissionTeacherId().catch(() => {});
      }

      if (!submissionRecorded) {
        const isUuidId = (id: any) => id && String(id).length === 36 && String(id).includes('-');
        const fallbackStudentId = isUuidId(activeStudentId)
          ? activeStudentId
          : (isUuidId(currentStudent?.student_id) ? currentStudent?.student_id : (isUuidId(studentId) ? studentId : null));

        if (!fallbackStudentId) {
          throw new Error("We couldn't confirm your student record, so this submission wasn't saved. Please check your name matches the class roster exactly, then try again.");
        }

        const { error: directError } = await supabase
          .from('assignment_submissions')
          .upsert({
            assignment_id: assignment.id,
            teacher_id: assignment.teacher_id || null,
            student_id: String(fallbackStudentId),
            student_name: effectiveStudentName,
            answers: finalAnswers,
            score: score,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          }, { onConflict: 'assignment_id,student_id' });

        if (directError) {
          const { error: insertError } = await supabase
            .from('assignment_submissions')
            .insert({
              assignment_id: assignment.id,
              teacher_id: assignment.teacher_id || null,
              student_id: String(fallbackStudentId),
              student_name: effectiveStudentName,
              answers: finalAnswers,
              score: score,
              status: 'submitted',
              submitted_at: new Date().toISOString()
            });

          if (insertError) {
            throw new Error('Failed to record assignment submission.');
          }
        }
      }

      setSubmission({
        assignment_id: assignment.id,
        student_id: activeStudentId || studentId || undefined,
        status: 'submitted',
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        teacher_assigned: assignedTeacherName,
        score: score,
        answers: finalAnswers
      });

      setStep('success');
      showToast('Assignment submitted! Fantastic effort! 🎉', 'success');
    } catch (err: any) {
      console.error('Submission error:', err);
      showToast(err.message || "Failed to submit assignment.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── STEP 1: SUCCESS CELEBRATION ──
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-brand-bg">
        <header className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-md border-b border-brand-border px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={() => {
                setStep('entry');
                fetchAssignments();
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-muted hover:text-brand-text transition-colors"
            >
              <ChevronLeft size={16} />
              <span>All Assignments</span>
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600">
              Handed In
            </span>
          </div>
        </header>

        <main className="max-w-md mx-auto pt-4">
          <AssignmentSuccessCelebration
            assignment={assignment}
            submission={submission}
            onBackToAssignments={() => {
              setStep('entry');
              fetchAssignments();
            }}
            onBackToHome={onBack}
            onExamsClick={onExamsClick}
          />
        </main>
      </div>
    );
  }

  // ── STEP 2: ASSIGNMENT TAKING ──
  if (step === 'taking' && assignment) {
    return (
      <StudentAssignmentTaking
        assignment={assignment}
        studentName={studentName}
        initialAnswers={answers}
        initialSkipped={skippedQuestions}
        onBack={() => setStep('entry')}
        onSubmit={submitAssignment}
        onSaveDraftAnswer={saveAnswerDraft}
        onSkipQuestionRemote={handleSkipQuestionRemote}
        submitting={submitting}
        needsClassSelection={needsClassSelection}
        availableClasses={availableClasses}
        onSelectClass={(cid) => {
          setSelectedClassId(cid);
          setNeedsClassSelection(false);
        }}
      />
    );
  }

  // ── STEP 3: DISCOVERY & ENTRY VIEW ──
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
      {/* App bar */}
      <header className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-md border-b border-brand-border px-4 py-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors"
              title="Return to home"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-display font-black text-base sm:text-lg text-brand-text leading-none">
                Assignments & Homework
              </h1>
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mt-0.5">
                Practice, Exercises & Assessments
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full px-4 pt-5 flex-1">
        <AssignmentDiscoveryView
          studentName={studentName}
          onStudentNameChange={setStudentName}
          assignments={assignments}
          loading={loading}
          onRefresh={fetchAssignments}
          onSelectAssignment={handleJoinAssignment}
          searchTitle={searchTitle}
          setSearchTitle={setSearchTitle}
          searchTeacher={searchTeacher}
          setSearchTeacher={setSearchTeacher}
          searchSchool={searchSchool}
          setSearchSchool={setSearchSchool}
          searchGrade={searchGrade}
          setSearchGrade={setSearchGrade}
          onSearch={fetchAssignments}
          onDirectSchoolFind={handleDirectSchoolFind}
          directFindLoading={directFindLoading}
          directFindError={directFindError}
        />
      </main>
    </div>
  );
};

export default StudentAssignmentView;
