import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useStudent } from "../contexts/StudentContext";
import { assignmentService } from "../services/assignmentService";

const NAVY = "#0A1628";
const ORANGE = "#F97316";

const GRADES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

interface StudentFindAssignmentProps {
  onBack?: () => void;
}

/**
 * Route this at something like /school-assignment. This is intentionally
 * separate from the teacher/class assignment flow — no device account or
 * class membership is required. A student just needs to know their
 * school's name and the assignment title the school admin gave them.
 */
export default function StudentFindAssignment({ onBack }: StudentFindAssignmentProps) {
  const [step, setStep] = useState<"search" | "take" | "done">("search"); // search -> take -> done
  const [assignment, setAssignment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  return (
    <div
      style={{
        minHeight: "100vh",
        background: NAVY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {step === "search" && (
          <SearchForm
            onFound={(a) => {
              setAssignment(a);
              setAnswers({});
              setStep("take");
            }}
          />
        )}
        {step === "take" && (
          <TakeAssignment
            assignment={assignment}
            answers={answers}
            setAnswers={setAnswers}
            onBack={() => setStep("search")}
            onSubmitted={() => setStep("done")}
          />
        )}
        {step === "done" && <DoneScreen onRestart={() => setStep("search")} />}

        {onBack && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button
              onClick={onBack}
              style={{
                background: "none",
                border: "none",
                color: "#8C9BB5",
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface SearchFormProps {
  onFound: (assignment: any) => void;
}

function SearchForm({ onFound }: SearchFormProps) {
  const [schoolName, setSchoolName] = useState("");
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState(GRADES[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc("find_school_assignment", {
      p_school_name: schoolName.trim(),
      p_title: title.trim(),
      p_grade: grade,
    });

    setLoading(false);

    if (rpcError) {
      setError("Something went wrong. Try again.");
      return;
    }
    
    const response = data as any;
    if (!response || !response.success) {
      setError(response?.message || "Assignment not found.");
      return;
    }
    onFound(response.assignment);
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle as React.CSSProperties}>
      <h1 style={titleStyle as React.CSSProperties}>Find your assignment</h1>
      <p style={subtitleStyle as React.CSSProperties}>
        Your teacher or school admin will tell you the exact assignment name to enter.
      </p>

      <label style={labelStyle as React.CSSProperties}>School name</label>
      <input
        value={schoolName}
        onChange={(e) => setSchoolName(e.target.value)}
        required
        placeholder="e.g. Greenfield Academy"
        style={inputStyle as React.CSSProperties}
      />

      <label style={labelStyle as React.CSSProperties}>Grade</label>
      <select value={grade} onChange={(e) => setGrade(e.target.value)} style={inputStyle as React.CSSProperties}>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <label style={labelStyle as React.CSSProperties}>Assignment name</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="e.g. Mathematics Term Two Assignment"
        style={inputStyle as React.CSSProperties}
      />

      {error && <p style={errorStyle as React.CSSProperties}>{error}</p>}

      <button type="submit" disabled={loading} style={buttonStyle as React.CSSProperties}>
        {loading ? "Searching…" : "Find assignment"}
      </button>
    </form>
  );
}

interface TakeAssignmentProps {
  assignment: any;
  answers: Record<string, any>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onBack: () => void;
  onSubmitted: () => void;
}

function TakeAssignment({ assignment, answers, setAnswers, onBack, onSubmitted }: TakeAssignmentProps) {
  const { currentStudent } = useStudent();
  const [studentName, setStudentName] = useState(() => {
    if (currentStudent?.name) return currentStudent.name;
    try {
      const studentStr = localStorage.getItem('azilearn_student');
      if (studentStr) {
        const parsed = JSON.parse(studentStr);
        return parsed.name || "";
      }
    } catch {}
    return "";
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const saveDebounceTimers = useRef<Record<string, any>>({});

  useEffect(() => {
    async function loadDraft() {
      const activeStudentId = currentStudent?.student_id || (() => {
        try {
          const studentStr = localStorage.getItem('azilearn_student');
          if (studentStr) return JSON.parse(studentStr).id || null;
        } catch {}
        return null;
      })();

      if (activeStudentId && activeStudentId.length === 36 && assignment?.id) {
        const draftRes = await assignmentService.getOrCreateDraft(activeStudentId, assignment.id);
        if (draftRes) {
          if (draftRes.already_submitted) {
            onSubmitted();
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
    }
    loadDraft();
  }, [assignment?.id]);

  const saveAnswerDraft = async (questionId: string, val: any) => {
    const activeStudentId = currentStudent?.student_id || (() => {
      try {
        const studentStr = localStorage.getItem('azilearn_student');
        if (studentStr) return JSON.parse(studentStr).id || null;
      } catch {}
      return null;
    })();

    if (!submissionId || !activeStudentId || activeStudentId.length !== 36) return;

    await assignmentService.saveDraftAnswer(activeStudentId, submissionId, questionId, val);
  };

  function setAnswer(questionId: string, value: any, isText: boolean = false) {
    setAnswers((a) => ({ ...a, [questionId]: value }));

    setSkippedQuestions(prev => {
      if (prev.has(questionId)) {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      }
      return prev;
    });

    if (isText) {
      if (saveDebounceTimers.current[questionId]) {
        clearTimeout(saveDebounceTimers.current[questionId]);
      }
      saveDebounceTimers.current[questionId] = setTimeout(() => {
        saveAnswerDraft(questionId, value);
      }, 500);
    } else {
      if (saveDebounceTimers.current[questionId]) {
        clearTimeout(saveDebounceTimers.current[questionId]);
      }
      saveAnswerDraft(questionId, value);
    }
  }

  const handleSkipQuestion = async (qIndex: number, questionId: string) => {
    setSkippedQuestions(prev => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });

    const activeStudentId = currentStudent?.student_id || (() => {
      try {
        const studentStr = localStorage.getItem('azilearn_student');
        if (studentStr) return JSON.parse(studentStr).id || null;
      } catch {}
      return null;
    })();

    if (submissionId && activeStudentId && activeStudentId.length === 36) {
      await assignmentService.skipQuestion(activeStudentId, submissionId, questionId);
    }

    const nextEl = document.getElementById(`sq-${qIndex + 1}`);
    if (nextEl) {
      nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const unanswered = (assignment.questions || []).filter((q: any) => !answers[q.id]);
    if (unanswered.length > 0 && unanswered.length === assignment.questions.length) {
      setError(`Please answer at least one question.`);
      return;
    }

    const cleanTeacherId = (id: any) => {
      if (!id) return null;
      const str = String(id).trim().toLowerCase();
      if (str === 'null' || str === 'undefined' || str === '') return null;
      if (str.length !== 36) return null;
      return id;
    };

    const loggedInStudentId = (() => {
      if (currentStudent?.student_id) return currentStudent.student_id;
      try {
        const studentStr = localStorage.getItem('azilearn_student');
        if (studentStr) {
          const parsed = JSON.parse(studentStr);
          return parsed.id || null;
        }
      } catch {}
      return null;
    })();

    const isRegisteredStudent = loggedInStudentId && loggedInStudentId.length === 36;

    const rpcParams: any = {
      p_assignment_id: assignment.id,
      p_student_name: studentName.trim(),
      p_answers: answers,
      p_teacher_id: cleanTeacherId(assignment.teacher_id),
    };

    if (isRegisteredStudent) {
      rpcParams.p_student_id = loggedInStudentId;
    }

    setLoading(true);
    let response: any = null;
    let activeStudentId: string | null = loggedInStudentId;
    let resolvedClassId: string | null = null;

    if (assignment.is_broadcast) {

      if (studentName.trim()) {
        try {
          const { resolveStudentIdentity } = await import('../services/studentIdentityService');
          const res = await resolveStudentIdentity(studentName.trim(), null, assignment.grade || 'Grade 7');
          if (res.student?.class_id) resolvedClassId = res.student.class_id;
        } catch {}
      }

      if (!resolvedClassId) {
        let schoolId = assignment.school_id || assignment.target_school_id;
        if (!schoolId && assignment.teacher_id) {
          const { data: teacherRow } = await supabase
            .from('teachers')
            .select('school_id')
            .eq('id', assignment.teacher_id)
            .maybeSingle();
          if (teacherRow?.school_id) schoolId = teacherRow.school_id;
        }

        let query = supabase.from('classes').select('id, name').eq('grade', assignment.grade || 'Grade 7');
        if (schoolId) query = query.eq('school_id', schoolId);

        const { data: classes } = await query;
        if (classes && classes.length === 1) {
          resolvedClassId = classes[0].id;
        }
      }

      if (!activeStudentId || activeStudentId.length !== 36) {
        if (studentName.trim()) {
          try {
            const { resolveStudentIdentity } = await import('../services/studentIdentityService');
            const res = await resolveStudentIdentity(studentName.trim(), resolvedClassId, assignment.grade || 'Grade 7');
            if (res.status === 'EXACT_MATCH' && res.student) {
              activeStudentId = res.student.id;
            } else if (res.candidates && res.candidates.length > 0) {
              activeStudentId = res.candidates[0].id;
            }
          } catch (lookupErr) {
            console.warn('Roster lookup warning:', lookupErr);
          }
        }
      }

      if (activeStudentId && activeStudentId.length === 36) {
        const { data: bRes, error: rpcError } = await supabase.rpc("submit_broadcast_assignment", {
          p_student_id: activeStudentId,
          p_assignment_id: assignment.id,
          p_answers: answers
        });

        if (!rpcError && bRes && bRes.success !== false) {
          response = bRes;
        }
      }

      // Fallback: If broadcast submission RPC wasn't recorded, try submit_school_assignment RPC
      if (!response || !response.success) {
        const cleanTeacherId = (id: any) => {
          if (!id) return null;
          const str = String(id).trim().toLowerCase();
          if (str === 'null' || str === 'undefined' || str === '') return null;
          if (str.length !== 36) return null;
          return id;
        };

        const rpcParamsBroadcast: any = {
          p_assignment_id: assignment.id,
          p_student_name: studentName.trim(),
          p_answers: answers,
          p_teacher_id: cleanTeacherId(assignment.teacher_id),
        };
        if (activeStudentId && activeStudentId.length === 36) {
          rpcParamsBroadcast.p_student_id = activeStudentId;
        }

        const { data: sRes, error: rpcError } = await supabase.rpc("submit_school_assignment", rpcParamsBroadcast);
        if (!rpcError && sRes && sRes.success !== false) {
          response = sRes;
        }
      }
    } else {
      const { data: sRes, error: rpcError } = await supabase.rpc("submit_school_assignment", rpcParams);
      if (!rpcError && sRes && sRes.success !== false) {
        response = sRes;
      }
    }

    if (response && response.success) {
      const applySubmissionTeacherId = async () => {
        let tid = assignment.teacher_id && String(assignment.teacher_id).trim() !== 'null' ? assignment.teacher_id : null;
        let cid = resolvedClassId;

        if (!cid && studentName.trim()) {
          try {
            const { resolveStudentIdentity } = await import('../services/studentIdentityService');
            const res = await resolveStudentIdentity(studentName.trim(), null, assignment.grade || 'Grade 7');
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

        if (activeStudentId && activeStudentId.length === 36) {
          await supabase.from('assignment_submissions').update(updatePayload).eq('assignment_id', assignment.id).eq('student_id', String(activeStudentId));
        } else if (studentName.trim()) {
          await supabase.from('assignment_submissions').update(updatePayload).eq('assignment_id', assignment.id).eq('student_name', studentName.trim());
        }
      };
      applySubmissionTeacherId().catch(() => {});
    }

    if (!response || !response.success) {
      // Students are added to the roster by the school admin — never self-registered.
      // Without a real, roster-matched student_id we do not fabricate one or
      // write a submission under a made-up guest identity.
      setLoading(false);
      setError(
        activeStudentId
          ? "Failed to submit assignment. Please try again."
          : "We couldn't find your name on the roster. Ask your school admin to add you, then try again."
      );
      return;
    }

    setLoading(false);
    onSubmitted();
  }

  const totalQuestions = assignment.questions?.length || 0;
  const answeredCount = (assignment.questions || []).filter((q: any) => answers[q.id] !== undefined && answers[q.id] !== '' && !skippedQuestions.has(q.id)).length;
  const skippedCount = (assignment.questions || []).filter((q: any) => skippedQuestions.has(q.id)).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <form onSubmit={handleSubmit} style={cardStyle as React.CSSProperties}>
      <button type="button" onClick={onBack} style={linkButtonStyle as React.CSSProperties}>
        ← Search again
      </button>

      <h1 style={titleStyle as React.CSSProperties}>{assignment.title}</h1>
      <p style={subtitleStyle as React.CSSProperties}>
        {assignment.subject} · {assignment.grade}
        {assignment.due_date ? ` · Due ${new Date(assignment.due_date).toLocaleDateString()}` : ""}
      </p>

      {/* Progress Bar */}
      <div style={{ margin: "16px 0", padding: "12px", background: "#132338", borderRadius: 12, border: "1px solid #2A3B5C" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 6 }}>
          <span>{answeredCount}/{totalQuestions} answered {skippedCount > 0 ? `· ${skippedCount} skipped` : ''}</span>
          <span style={{ color: ORANGE }}>{progressPercent}% complete</span>
        </div>
        <div style={{ width: "100%", height: 6, background: "#0A1628", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", background: ORANGE, transition: "width 0.3s" }} />
        </div>
      </div>

      {(assignment.questions || []).map((q: any, i: number) => (
        <div key={q.id} id={`sq-${i}`}>
          <QuestionField 
            index={i} 
            question={q} 
            value={answers[q.id]} 
            isSkipped={skippedQuestions.has(q.id)}
            onChange={(v, isText) => setAnswer(q.id, v, isText)} 
            onSkip={() => handleSkipQuestion(i, q.id)}
          />
        </div>
      ))}

      <label style={{ ...labelStyle as React.CSSProperties, marginTop: 20 }}>Your name</label>
      <input
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        required
        placeholder="Full name"
        style={inputStyle as React.CSSProperties}
      />

      {error && <p style={errorStyle as React.CSSProperties}>{error}</p>}

      <button type="submit" disabled={loading} style={buttonStyle as React.CSSProperties}>
        {loading ? "Submitting…" : "Submit assignment"}
      </button>
    </form>
  );
}

interface QuestionFieldProps {
  key?: any;
  index: number;
  question: any;
  value: any;
  isSkipped?: boolean;
  onChange: (val: any, isText?: boolean) => void;
  onSkip?: () => void;
}

function QuestionField({ index, question, value, isSkipped, onChange, onSkip }: QuestionFieldProps) {
  const isMcq = Array.isArray(question.options) && question.options.length > 0;

  return (
    <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: isSkipped ? "#1E1B10" : "#0F1C2E", border: isSkipped ? "1px solid #D97706" : "1px solid #1E2D4A" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>
          {index + 1}. {question.text}
        </p>
        {isSkipped && (
          <span style={{ fontSize: 10, fontWeight: 800, color: "#F59E0B", background: "rgba(245, 158, 11, 0.15)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase" }}>
            Skipped
          </span>
        )}
      </div>

      {isMcq ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {question.options.map((opt: string) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#C5CEDD",
                fontSize: 14,
                background: value === opt ? "#1C2D4A" : "transparent",
                border: "1px solid #2A3B5C",
                borderRadius: 8,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt}
                onChange={() => onChange(opt, false)}
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value, true)}
          rows={3}
          style={{ ...(inputStyle as React.CSSProperties), resize: "vertical" }}
        />
      )}

      {onSkip && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: isSkipped ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.05)",
              border: isSkipped ? "1px solid #D97706" : "1px solid #2A3B5C",
              color: isSkipped ? "#F59E0B" : "#8C9BB5",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isSkipped ? "Skipped ✓" : "Skip question →"}
          </button>
        </div>
      )}
    </div>
  );
}

interface DoneScreenProps {
  onRestart: () => void;
}

function DoneScreen({ onRestart }: DoneScreenProps) {
  return (
    <div style={cardStyle as React.CSSProperties}>
      <h1 style={titleStyle as React.CSSProperties}>Submitted ✓</h1>
      <p style={subtitleStyle as React.CSSProperties}>Submitted — your teacher will see this in their grading queue.</p>
      <button type="button" onClick={onRestart} style={buttonStyle as React.CSSProperties}>
        Find another assignment
      </button>
    </div>
  );
}

const cardStyle = {
  background: "#101F38",
  border: "1px solid #1C2D4A",
  borderRadius: 16,
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const titleStyle = { color: "#fff", fontSize: 22, fontWeight: 700, margin: "10px 0 0 0" };
const subtitleStyle = { color: "#8C9BB5", fontSize: 14, marginTop: 6, marginBottom: 4 };
const labelStyle = { color: "#C5CEDD", fontSize: 13, marginTop: 14, marginBottom: 6 };
const inputStyle = {
  background: "#0A1628",
  border: "1px solid #2A3B5C",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 15,
  outline: "none",
  width: "100%",
  boxSizing: "border-box"
};
const buttonStyle = {
  marginTop: 22,
  background: ORANGE,
  color: "#0A1628",
  fontWeight: 700,
  fontSize: 15,
  border: "none",
  borderRadius: 8,
  padding: "12px 16px",
  cursor: "pointer",
  width: "100%"
};
const linkButtonStyle = {
  background: "none",
  border: "none",
  color: "#8C9BB5",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
  alignSelf: "flex-start",
  padding: 0,
};
const errorStyle = { color: "#FCA5A5", fontSize: 13, marginTop: 14 };
