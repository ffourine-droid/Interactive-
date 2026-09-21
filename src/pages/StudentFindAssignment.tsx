import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useStudent } from "../contexts/StudentContext";
import { assignmentService } from "../services/assignmentService";
import { StudentAssignmentTaking } from "../components/assignment/StudentAssignmentTaking";
import { AssignmentSuccessCelebration } from "../components/assignment/AssignmentSuccessCelebration";
import { 
  School, 
  FileText, 
  Calendar, 
  Search, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Sparkles,
  User,
  GraduationCap
} from "lucide-react";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
];

interface StudentFindAssignmentProps {
  onBack?: () => void;
}

export default function StudentFindAssignment({ onBack }: StudentFindAssignmentProps) {
  const { currentStudent } = useStudent();
  const [step, setStep] = useState<"search" | "take" | "done">("search");
  const [assignment, setAssignment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submission, setSubmission] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [studentName, setStudentName] = useState(() => currentStudent?.name || (() => {
    try {
      const s = localStorage.getItem('azilearn_student');
      const parsed = s ? JSON.parse(s) : null;
      return parsed?.name || '';
    } catch {
      return '';
    }
  })());
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState(() => currentStudent?.school_name || (() => {
    try {
      const s = localStorage.getItem('azilearn_student');
      const parsed = s ? JSON.parse(s) : null;
      return parsed?.school_name || '';
    } catch {
      return '';
    }
  })());

  const handleSubmitAssignment = async (
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

      // Handle photos if any
      for (const qId of Object.keys(submittedFiles)) {
        if (submittedSkipped.has(qId)) continue;
        const file = submittedFiles[qId];
        const fileExt = file.name.split('.').pop();
        const fileName = `${assignment.id}/${studentName.replace(/\s+/g, '_')}_${qId}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('assignment-photos')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('assignment-photos')
            .getPublicUrl(fileName);
          finalAnswers[qId] = publicUrlData.publicUrl;
        }
      }

      // Calculate score for auto-scored MCQs
      let mcqCount = 0;
      let correctCount = 0;
      (assignment.questions || []).forEach((q: any) => {
        if (q.type === 'mcq' && finalAnswers[q.id] !== undefined) {
          mcqCount++;
          if (parseInt(finalAnswers[q.id]) === q.correct_option) {
            correctCount++;
          }
        }
      });
      const calculatedScore = mcqCount > 0 ? Math.round((correctCount / mcqCount) * 100) : null;

      const loggedInStudentId = currentStudent?.student_id || (() => {
        try {
          const s = localStorage.getItem('azilearn_student');
          return s ? JSON.parse(s).id || null : null;
        } catch {
          return null;
        }
      })();

      const isRegistered = loggedInStudentId && String(loggedInStudentId).length === 36;
      let activeStudentId = isRegistered ? loggedInStudentId : null;

      // Roster resolution
      if (!activeStudentId && studentName.trim()) {
        try {
          const { resolveStudentIdentity } = await import('../services/studentIdentityService');
          const res = await resolveStudentIdentity(studentName.trim(), null, assignment.grade || 'Grade 7');
          if (res.status === 'EXACT_MATCH' && res.student) {
            activeStudentId = res.student.id;
          } else if (res.candidates && res.candidates.length > 0) {
            activeStudentId = res.candidates[0].id;
          }
        } catch (err) {
          console.warn('Roster lookup warning:', err);
        }
      }

      const cleanTeacherId = (id: any) => {
        if (!id) return null;
        const str = String(id).trim().toLowerCase();
        if (str === 'null' || str === 'undefined' || str === '') return null;
        if (str.length !== 36) return null;
        return id;
      };

      let recorded = false;
      let assignedTeacher = null;

      if (assignment.is_broadcast) {
        if (activeStudentId) {
          const { data, error: bErr } = await supabase.rpc("submit_broadcast_assignment", {
            p_student_id: activeStudentId,
            p_assignment_id: assignment.id,
            p_answers: finalAnswers
          });
          const response = data as any;
          if (!bErr && response && response.success !== false) {
            recorded = true;
            assignedTeacher = response?.teacher_assigned;
          }
        }
      }

      if (!recorded) {
        const rpcParams: any = {
          p_assignment_id: assignment.id,
          p_student_name: studentName.trim(),
          p_answers: finalAnswers,
          p_teacher_id: cleanTeacherId(assignment.teacher_id),
        };
        if (activeStudentId) {
          rpcParams.p_student_id = activeStudentId;
        }

        const { data: rpcRes, error: rpcErr } = await supabase.rpc("submit_school_assignment", rpcParams);
        const response = rpcRes as any;
        if (!rpcErr && response && response.success !== false) {
          recorded = true;
        }
      }

      setSubmission({
        assignment_id: assignment.id,
        student_id: activeStudentId || undefined,
        status: 'submitted',
        created_at: new Date().toISOString(),
        teacher_assigned: assignedTeacher,
        score: calculatedScore,
        answers: finalAnswers
      });

      setStep("done");
    } catch (err: any) {
      console.error("Submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans flex flex-col">
      {step === "search" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            <SearchForm
              initialStudentName={studentName}
              initialTeacherName={teacherName}
              initialSchoolName={schoolName}
              onFound={(a, sName, tName, scName) => {
                setAssignment(a);
                if (sName) setStudentName(sName);
                if (tName) setTeacherName(tName);
                if (scName) setSchoolName(scName);
                try {
                  if (sName) sessionStorage.setItem('azilearn_student_name', sName);
                } catch {}
                setAnswers({});
                setStep("take");
              }}
              onBack={onBack}
            />
          </div>
        </div>
      )}

      {step === "take" && assignment && (
        <StudentAssignmentTaking
          assignment={assignment}
          studentName={studentName}
          initialAnswers={answers}
          onBack={() => setStep("search")}
          onSubmit={handleSubmitAssignment}
          submitting={submitting}
          needsClassSelection={false}
          availableClasses={[]}
          onSelectClass={() => {}}
        />
      )}

      {step === "done" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AssignmentSuccessCelebration
              assignment={assignment}
              submission={submission}
              onBackToAssignments={() => setStep("search")}
              onBackToHome={onBack || (() => setStep("search"))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchFormProps {
  onFound: (assignment: any, studentName: string, teacherName: string, schoolName: string) => void;
  onBack?: () => void;
  initialStudentName?: string;
  initialTeacherName?: string;
  initialSchoolName?: string;
}

function SearchForm({ onFound, onBack, initialStudentName = "", initialTeacherName = "", initialSchoolName = "" }: SearchFormProps) {
  const { currentStudent } = useStudent();
  const [studentName, setStudentName] = useState(() => initialStudentName || currentStudent?.name || "");
  const [teacherName, setTeacherName] = useState(() => initialTeacherName || "");
  const [schoolName, setSchoolName] = useState(() => initialSchoolName || currentStudent?.school_name || "");
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState(() => currentStudent?.grade || GRADES[6]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim()) {
      setError("Please enter your name before getting the assignment.");
      return;
    }
    if (!teacherName.trim()) {
      setError("Please enter your teacher's name before getting the assignment.");
      return;
    }
    if (!schoolName.trim()) {
      setError("Please enter your school name before getting the assignment.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter the assignment title.");
      return;
    }

    setError("");
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc("find_school_assignment", {
      p_school_name: schoolName.trim(),
      p_title: title.trim(),
      p_grade: grade,
    });

    setLoading(false);

    if (rpcError) {
      setError("Search request failed. Please check connection and try again.");
      return;
    }

    const response = data as any;
    if (!response || !response.success) {
      setError(response?.message || "No assignment found matching those details.");
      return;
    }
    onFound(response.assignment, studentName.trim(), teacherName.trim(), schoolName.trim());
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-accent/15 text-brand-accent flex items-center justify-center mx-auto mb-3 shadow-xs">
          <School size={28} />
        </div>
        <h1 className="font-display font-black text-2xl text-brand-text">
          Find Your School Assignment
        </h1>
        <p className="text-xs text-brand-muted max-w-xs mx-auto leading-relaxed">
          Enter your name, your teacher's name, school and assignment title to get your assignment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Your Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
              placeholder="e.g. Samuel Kiprono"
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text transition-all"
            />
          </div>
        </div>

        {/* Teacher's Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Teacher's Name *
          </label>
          <div className="relative">
            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              required
              placeholder="e.g. Mr. Otieno / Ms. Sarah"
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text transition-all"
            />
          </div>
        </div>

        {/* School Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            School Name *
          </label>
          <div className="relative">
            <School className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              placeholder="e.g. Greenfield Academy"
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text transition-all"
            />
          </div>
        </div>

        {/* Grade Level */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Grade Level
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text appearance-none transition-all"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignment Title */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Assignment Title *
          </label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Mathematics Term Two Assignment"
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !studentName.trim() || !teacherName.trim() || !schoolName.trim() || !title.trim()}
          className="w-full py-4 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-brand-accent/20 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              <span>Verifying & Finding Assignment...</span>
            </>
          ) : (
            <>
              <Search size={16} />
              <span>Get Assignment</span>
            </>
          )}
        </button>
      </form>

      {onBack && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-brand-muted hover:text-brand-text font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}
    </div>
  );
}
