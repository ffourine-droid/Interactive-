import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useStudent } from "../contexts/StudentContext";

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

  function setAnswer(questionId: string, value: any) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const unanswered = (assignment.questions || []).filter((q: any) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`Please answer all questions (${unanswered.length} left).`);
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
    const { data, error: rpcError } = await supabase.rpc("submit_school_assignment", rpcParams);
    setLoading(false);

    if (rpcError) {
      setError("Something went wrong submitting. Try again.");
      return;
    }
    
    const response = data as any;
    if (!response || !response.success) {
      setError(response?.message || "Failed to submit assignment.");
      return;
    }
    onSubmitted();
  }

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

      {(assignment.questions || []).map((q: any, i: number) => (
        <QuestionField key={q.id} index={i} question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
      ))}

      <label style={labelStyle as React.CSSProperties}>Your name</label>
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
  onChange: (val: any) => void;
}

function QuestionField({ index, question, value, onChange }: QuestionFieldProps) {
  const isMcq = Array.isArray(question.options) && question.options.length > 0;

  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        {index + 1}. {question.text}
      </p>

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
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ ...(inputStyle as React.CSSProperties), resize: "vertical" }}
        />
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
