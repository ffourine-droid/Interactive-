import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  Download,
  User,
  BarChart3,
  Star,
  Search,
  ExternalLink,
  Calendar,
  Save,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import { Exam, ExamAttempt, Question, AnswerLog } from "../types";

interface ExamResultsPageProps {
  examId: string;
  onBack: () => void;
}

export default function ExamResultsPage({
  examId,
  onBack,
}: ExamResultsPageProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [gradingMarks, setGradingMarks] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState("");
  const [parentFeedback, setParentFeedback] = useState("");
  const [teacherReply, setTeacherReply] = useState("");
  const [savingGrading, setSavingGrading] = useState(false);
  const [savingReply, setSavingReply] = useState(false);

  // Manual grading system states
  const [isMarkingMode, setIsMarkingMode] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "single">("all");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [markingGrades, setMarkingGrades] = useState<
    Record<string, { correct: boolean; marks_awarded: number }>
  >({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [lastGradingResult, setLastGradingResult] = useState<{
    studentName: string;
    score: number;
    total_marks: number;
    score_percentage: number;
  } | null>(null);

  const attemptNeedsGrading = (attempt: any) => {
    if (!attempt || !attempt.is_submitted) return false;
    const grading = attempt.grading || {};
    return Object.values(grading).some(
      (g: any) => g && (g.needs_grading === true || g.needs_grading === "true"),
    );
  };

  useEffect(() => {
    fetchResults();

    const channel = supabase
      .channel(`exam-${examId}-results`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_attempts",
          filter: `exam_id=eq.${examId}`,
        },
        () => {
          fetchResults();
          showToast("Updates received!", "info");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [examId]);

  useEffect(() => {
    if (selectedAttempt) {
      setGradingMarks(selectedAttempt.grading || {});
      setFeedback(selectedAttempt.teacher_feedback || "");
      setParentFeedback(selectedAttempt.parent_feedback || "");
      setTeacherReply(selectedAttempt.teacher_reply || "");
    }
  }, [selectedAttempt]);

  useEffect(() => {
    if (selectedAttempt && exam) {
      const initialGrades: Record<
        string,
        { correct: boolean; marks_awarded: number }
      > = {};
      exam.questions.forEach((q, idx) => {
        const qIdxStr = String(idx);
        const existing =
          selectedAttempt.grading?.[qIdxStr] || selectedAttempt.grading?.[idx];
        if (
          existing &&
          existing.correct !== null &&
          existing.correct !== undefined
        ) {
          initialGrades[qIdxStr] = {
            correct: existing.correct === true || existing.correct === "true",
            marks_awarded:
              existing.marks_awarded !== undefined
                ? Number(existing.marks_awarded)
                : 0,
          };
        }
      });
      setMarkingGrades(initialGrades);
      setCurrentQuestionIndex(0);
    }
  }, [selectedAttempt, exam]);

  const saveMarking = async () => {
    if (!selectedAttempt || !exam) return;
    const teacherStr = localStorage.getItem("azilearn_teacher");
    if (!teacherStr) {
      showToast("Teacher session not found", "error");
      return;
    }
    const teacher = JSON.parse(teacherStr);

    setSavingGrades(true);
    try {
      // Build the p_grades array for the RPC call
      const p_grades = exam.questions.map((q, idx) => {
        const qIdxStr = String(idx);
        const decision = markingGrades[qIdxStr];
        return {
          question_index: qIdxStr,
          correct: decision ? decision.correct : false,
          marks_awarded: decision ? decision.marks_awarded : 0,
        };
      });

      const { data, error } = await supabase.rpc("teacher_grade_attempt", {
        p_teacher_id: teacher.id,
        p_attempt_id: selectedAttempt.id,
        p_grades,
        p_feedback: feedback || "",
      });

      if (error) throw error;

      // Result looks like: { success, score, total_marks, message }
      const res = (Array.isArray(data) ? data[0] : data) || {};
      if (res.success === false) {
        throw new Error(res.message || "Failed to grade attempt");
      }

      showToast(res.message || "Grading completed successfully!", "success");

      // Update local state and refresh
      await fetchResults();

      // Show the scoring results screen overlay
      setLastGradingResult({
        studentName: selectedAttempt.students?.name || "Student",
        score: res.score ?? 0,
        total_marks: res.total_marks ?? 0,
        score_percentage:
          res.score_percentage !== undefined
            ? res.score_percentage
            : Math.round(((res.score || 0) / (res.total_marks || 1)) * 100),
      });

      setSelectedAttempt(null);
      setIsMarkingMode(false);
    } catch (err: any) {
      showToast(err.message || "Error occurred while grading", "error");
    } finally {
      setSavingGrades(false);
    }
  };

  const fetchResults = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .maybeSingle();

      if (examError) throw examError;
      if (!examData) throw new Error("Assessment not found");
      setExam(examData);

      const { data: attemptData, error: attemptError } = await supabase
        .from("exam_attempts")
        .select(
          `
          *,
          students (
            name,
            grade
          )
        `,
        )
        .eq("exam_id", examId)
        .order("submitted_at", { ascending: false });

      if (attemptError) throw attemptError;
      setAttempts(attemptData || []);

      // Fetch students in this class to see who hasn't submitted
      if (examData.class_id) {
        let studentsData: any[] = [];
        try {
          const teacherStr = localStorage.getItem("azilearn_teacher");
          if (teacherStr) {
            const teacher = JSON.parse(teacherStr);
            const { data: rpcData, error: rpcError } = await supabase.rpc(
              "teacher_get_class_students",
              {
                p_teacher_id: teacher.id,
                p_class_id: examData.class_id,
              },
            );
            if (!rpcError && rpcData) {
              if (Array.isArray(rpcData)) {
                studentsData = rpcData;
              } else if (typeof rpcData === "object") {
                const innerArray = Object.values(rpcData).find((v) =>
                  Array.isArray(v),
                );
                if (innerArray) {
                  studentsData = innerArray as any[];
                } else if ((rpcData as any).id) {
                  studentsData = [rpcData];
                }
              }
            }
          }
        } catch (e) {
          console.warn("RPC fetch failed in ExamResultsPage:", e);
        }

        setClassStudents(studentsData);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to fetch results", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (qIdx: number, marks: number) => {
    setGradingMarks((prev) => ({ ...prev, [qIdx]: marks }));
  };

  const saveTeacherReply = async () => {
    if (!selectedAttempt) return;
    setSavingReply(true);
    try {
      const { error } = await supabase
        .from("exam_attempts")
        .update({
          teacher_reply: teacherReply,
        })
        .eq("id", selectedAttempt.id);

      if (error) throw error;
      showToast("Reply to parent saved!", "success");
      fetchResults();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSavingReply(false);
    }
  };

  const saveGrading = async () => {
    if (!selectedAttempt || !exam) return;
    setSavingGrading(true);
    try {
      // Calculate new score
      let newScore = 0;
      const answersSource = selectedAttempt.answers || {};
      exam.questions.forEach((q, idx) => {
        if (q.type === "mcq") {
          const ans = answersSource[idx] !== undefined ? answersSource[idx] : answersSource[String(idx)];
          if (ans === q.correct_answer) {
            newScore += q.marks;
          }
        } else {
          newScore +=
            gradingMarks[idx] !== undefined
              ? gradingMarks[idx]
              : selectedAttempt.grading?.[idx] || 0;
        }
      });

      const { error } = await supabase
        .from("exam_attempts")
        .update({
          score: newScore,
          grading: gradingMarks,
          teacher_feedback: feedback,
          teacher_reply: teacherReply,
        })
        .eq("id", selectedAttempt.id);

      if (error) throw error;
      showToast("Grading and feedback saved!", "success");
      fetchResults(); // Refresh list
      setSelectedAttempt(null);
    } catch (err: any) {
      showToast(err.message || "Failed to save grading", "error");
    } finally {
      setSavingGrading(false);
    }
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8">
        <Loader2 className="animate-spin text-brand-accent mb-4" size={40} />
        <p className="text-xs font-black text-brand-muted uppercase tracking-widest animate-pulse">
          Analyzing Assessment Results...
        </p>
      </div>
    );
  }

  // Summary stats
  const submittedCount = attempts.filter((a) => a.is_submitted).length;
  const pendingStudents = classStudents.filter(
    (s) => !attempts.some((a) => a.student_id === s.id),
  );
  const overtimeCount = attempts.filter((a) => a.has_overtime).length;
  const avgScore =
    attempts.length > 0
      ? (
          attempts.reduce((acc, a) => acc + (a.score || 0), 0) / attempts.length
        ).toFixed(1)
      : 0;
  const topScore =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.score || 0)) : 0;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col p-4 sm:p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-brand-card rounded-xl border border-brand-accent/10 hover:bg-brand-accent/10 transition-colors"
            >
              <ArrowLeft size={20} className="text-brand-accent" />
            </button>
            <div>
              <h1 className="font-sans font-bold text-xl text-brand-text truncate max-w-[300px]">
                {exam.title}
              </h1>
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                {exam.subject} • {exam.grade}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-brand-card rounded-xl border border-brand-accent/10 text-brand-muted hover:text-brand-text transition-all text-xs font-bold">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "Submissions",
              value: submittedCount,
              icon: CheckCircle2,
              color: "text-green-500",
            },
            {
              label: "Pending",
              value: pendingStudents.length,
              icon: Clock,
              color: "text-amber-500",
            },
            {
              label: "Avg. Score",
              value: avgScore,
              icon: BarChart3,
              color: "text-brand-accent",
            },
            {
              label: "Highest Score",
              value: topScore,
              icon: Star,
              color: "text-orange-500",
            },
            {
              label: "Overtime",
              value: overtimeCount,
              icon: Clock,
              color: "text-red-400",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white dark:bg-brand-card p-5 rounded-3xl border border-brand-accent/5 shadow-xl shadow-brand-accent/5 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center ${stat.color}`}
              >
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-xl font-sans font-black text-brand-text">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Attempts Table */}
        <div className="bg-white dark:bg-brand-card rounded-3xl border border-brand-accent/5 shadow-xl shadow-brand-accent/5 overflow-hidden">
          <div className="p-6 border-b border-brand-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-sans font-bold text-lg text-brand-text">
              Student Submissions
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"
                  size={14}
                />
                <input
                  placeholder="Search student..."
                  className="bg-brand-bg dark:bg-brand-card border border-brand-accent/10 rounded-xl py-2 pl-9 pr-4 text-xs text-brand-text focus:ring-1 focus:ring-brand-accent/30 outline-none w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-brand-bg/50">
                  <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    Student
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    Started At
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    Score
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-accent/5">
                {attempts.length === 0 && pendingStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-20 text-center text-brand-muted font-bold text-xs uppercase tracking-widest"
                    >
                      No candidates found
                    </td>
                  </tr>
                ) : (
                  <>
                    {attempts.map((attempt) => (
                      <tr
                        key={attempt.id}
                        className="hover:bg-brand-bg/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-xs">
                              {attempt.students?.name?.charAt(0) || "S"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-brand-text">
                                {attempt.students?.name || "Unknown Student"}
                              </span>
                              <span className="text-[10px] text-brand-muted uppercase tracking-wider">
                                {attempt.students?.grade}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-brand-muted font-bold">
                            <Calendar size={12} />{" "}
                            {new Date(attempt.started_at).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {attempt.is_submitted ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-brand-text font-bold">
                                {new Date(
                                  attempt.submitted_at,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="text-[9px] text-brand-muted uppercase font-black tracking-widest">
                                {new Date(
                                  attempt.submitted_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest italic animate-pulse">
                              In Progress
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-brand-accent text-base">
                              {attempt.score || 0} / {attempt.total_marks || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {attemptNeedsGrading(attempt) && (
                              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 mb-1 animate-pulse">
                                <AlertCircle size={10} /> Needs Grading
                              </span>
                            )}
                            {attempt.has_overtime ? (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                <Clock size={10} /> Overtime
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                <CheckCircle2 size={10} /> In Time
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedAttempt(attempt);
                              setIsMarkingMode(false);
                            }}
                            className="p-2 hover:bg-brand-accent/10 text-brand-accent rounded-xl transition-all"
                          >
                            <span className="flex items-center gap-2">
                              {attemptNeedsGrading(attempt) && (
                                <span
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedAttempt(attempt);
                                    setIsMarkingMode(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md transition-all cursor-pointer font-sans flex items-center gap-1 shrink-0"
                                >
                                  <Save size={12} /> Mark
                                </span>
                              )}
                              <ExternalLink size={18} />
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="bg-red-500/5 hover:bg-red-500/10 transition-colors opacity-75"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                              {student.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-red-900">
                                {student.name}
                              </span>
                              <span className="text-[10px] text-red-600 uppercase font-black tracking-widest">
                                Awaiting Attempt
                              </span>
                            </div>
                          </div>
                        </td>
                        <td colSpan={2} className="px-6 py-4">
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-pulse flex items-center gap-2">
                            <AlertCircle size={12} /> ASSESSMENT NOT STARTED
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-red-300">
                            0 /{" "}
                            {exam.questions.reduce(
                              (acc, q) => acc + q.marks,
                              0,
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
                            Pending
                          </span>
                        </td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>      {/* Attempt Review Modal */}
      <AnimatePresence>
        {selectedAttempt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedAttempt(null);
                setIsMarkingMode(false);
              }}
              className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-brand-card w-full max-w-2xl h-full shadow-2xl relative z-10 flex flex-col border-l border-brand-accent/10"
            >
              {isMarkingMode ? (
                // Marking Mode UI Header
                <div className="p-6 border-b border-brand-accent/5 flex items-center justify-between bg-white dark:bg-brand-card sticky top-0 z-20">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setSelectedAttempt(null);
                        setIsMarkingMode(false);
                      }}
                      className="p-2 hover:bg-brand-bg rounded-full text-brand-muted"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="font-bold text-lg text-brand-text truncate max-w-[240px]">
                        {selectedAttempt.students?.name}
                      </h2>
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                        Active Marking
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={saveMarking}
                    disabled={savingGrades}
                    className="bg-orange-500 hover:bg-orange-600 px-5 py-2.5 rounded-xl text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 font-sans"
                  >
                    {savingGrades ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    Save Marks
                  </button>
                </div>
              ) : (
                // Standard Review Mode Header
                <div className="p-6 border-b border-brand-accent/5 flex items-center justify-between bg-white dark:bg-brand-card sticky top-0 z-20">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedAttempt(null)}
                      className="p-2 hover:bg-brand-bg rounded-full text-brand-muted"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="font-bold text-lg text-brand-text truncate max-w-[240px]">
                        {selectedAttempt.students?.name}
                      </h2>
                      <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                        Reviewing Assessment Attempt
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={saveGrading}
                    disabled={savingGrading}
                    className="bg-brand-accent px-6 py-2.5 rounded-xl text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-brand-accent/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {savingGrading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    Save Marks
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-brand-bg">
                {isMarkingMode ? (
                  // Marking Mode Body
                  <>
                    {/* Teacher Overall Remarks */}
                    <div className="bg-white dark:bg-brand-card p-6 rounded-[2rem] border-2 border-brand-accent/10 shadow-lg space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 shadow-sm">
                          <MessageCircle size={18} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-brand-text">
                          Overall Assessment Feedback
                        </h3>
                      </div>
                      <textarea
                        placeholder="Write overall feedback or guidance for student here..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full bg-brand-bg border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[100px] resize-none transition-all"
                      />
                    </div>

                    {/* View Selector for Questions */}
                    <div className="flex items-center justify-between bg-white dark:bg-brand-card p-4 rounded-2xl border border-brand-accent/10 shadow-sm">
                      <p className="text-xs font-black text-brand-text uppercase tracking-widest font-sans">
                        Questions ({exam.questions.length})
                      </p>
                      <div className="flex bg-brand-bg p-1 rounded-xl border border-brand-border">
                        <button
                          type="button"
                          onClick={() => setViewMode("all")}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            viewMode === "all"
                              ? "bg-orange-500 text-white shadow-sm"
                              : "text-brand-muted hover:text-brand-text"
                          }`}
                        >
                          List View
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("single")}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            viewMode === "single"
                              ? "bg-orange-500 text-white shadow-sm"
                              : "text-brand-muted hover:text-brand-text"
                          }`}
                        >
                          Focus View
                        </button>
                      </div>
                    </div>

                    {/* Render Questions (List View or Single Focus View) */}
                    {viewMode === "all" ? (
                      <div className="space-y-6">
                        {exam.questions.map((q, idx) => {
                          const qIdxStr = String(idx);
                          const decision = markingGrades[qIdxStr];
                          const answersSource = selectedAttempt.answers || {};
                          const studentAns =
                            answersSource[idx] !== undefined
                              ? answersSource[idx]
                              : answersSource[qIdxStr];
                          const gradingEntry =
                            selectedAttempt.grading?.[qIdxStr] ||
                            selectedAttempt.grading?.[idx];
                          const mcqCorrectAns =
                            gradingEntry?.correct_answer || q.correct_answer;
                          const isCorrectActive = decision?.correct === true;
                          const isWrongActive = decision?.correct === false;

                          return (
                            <div
                              key={idx}
                              className="bg-white dark:bg-brand-card p-6 rounded-[2.5rem] border-2 border-brand-accent/5 shadow-xl shadow-brand-accent/5 space-y-4"
                            >
                              <div className="flex items-center justify-between border-b border-brand-accent/5 pb-3">
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-sans font-black text-xs">
                                    {idx + 1}
                                  </span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                    {q.type === "mcq"
                                      ? "Multiple Choice"
                                      : q.type === "image"
                                        ? "Image Work"
                                        : "Short Answer"}
                                  </span>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                  Value:{" "}
                                  <span className="text-orange-500 text-sm font-sans font-black">
                                    {q.marks}
                                  </span>{" "}
                                  Marks
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-brand-muted mb-1">
                                  Question
                                </p>
                                <p className="font-sans font-bold text-brand-text text-base leading-relaxed">
                                  {q.question}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                  Student's Answer
                                </p>
                                {q.type === "image" ? (
                                  <div className="space-y-2">
                                    {studentAns ? (
                                      <img
                                        src={studentAns}
                                        alt="Student's submission"
                                        className="rounded-2xl border-2 border-brand-accent/10 max-w-full max-h-64 object-contain shadow-sm bg-brand-bg transition-all hover:scale-[1.01]"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <p className="text-xs font-bold text-brand-muted bg-brand-bg/50 p-4 rounded-xl border border-dashed border-brand-border/50">
                                        No upload provided
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 rounded-2xl bg-brand-bg font-sans font-bold text-sm text-brand-text border border-brand-accent/10 whitespace-pre-wrap">
                                    {studentAns || "NO RESPONSE RECEIVED"}
                                  </div>
                                )}
                              </div>

                              {q.type === "mcq" && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-green-600">
                                    Correct Answer
                                  </p>
                                  <div className="p-4 rounded-2xl bg-green-500/5 font-sans font-bold text-sm text-green-700 border border-green-500/10">
                                    {mcqCorrectAns || "Not specified"}
                                  </div>
                                </div>
                              )}

                              <div className="border-t border-brand-accent/5 pt-4 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                  Decision
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMarkingGrades((prev) => ({
                                        ...prev,
                                        [qIdxStr]: {
                                          correct: true,
                                          marks_awarded: q.marks,
                                        },
                                      }));
                                    }}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                      isCorrectActive
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.01]"
                                        : "bg-brand-bg text-brand-muted hover:text-brand-text border border-brand-accent/10"
                                    }`}
                                  >
                                    Check Correct ({q.marks} pts)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMarkingGrades((prev) => ({
                                        ...prev,
                                        [qIdxStr]: {
                                          correct: false,
                                          marks_awarded: 0,
                                        },
                                      }));
                                    }}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                      isWrongActive
                                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20 scale-[1.01]"
                                        : "bg-brand-bg text-brand-muted hover:text-brand-text border border-brand-accent/10"
                                    }`}
                                  >
                                    Check Wrong (0 pts)
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {(() => {
                          const idx = currentQuestionIndex;
                          const q = exam.questions[idx];
                          if (!q) return null;

                          const qIdxStr = String(idx);
                          const decision = markingGrades[qIdxStr];
                          const answersSource = selectedAttempt.answers || {};
                          const studentAns =
                            answersSource[idx] !== undefined
                              ? answersSource[idx]
                              : answersSource[qIdxStr];
                          const gradingEntry =
                            selectedAttempt.grading?.[qIdxStr] ||
                            selectedAttempt.grading?.[idx];
                          const mcqCorrectAns =
                            gradingEntry?.correct_answer || q.correct_answer;
                          const isCorrectActive = decision?.correct === true;
                          const isWrongActive = decision?.correct === false;

                          return (
                            <div className="bg-white dark:bg-brand-card p-6 rounded-[2.5rem] border-2 border-brand-accent/5 shadow-xl shadow-brand-accent/5 space-y-4">
                              <div className="flex items-center justify-between border-b border-brand-accent/5 pb-3">
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-sans font-black text-xs">
                                    {idx + 1}
                                  </span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                    {q.type === "mcq"
                                      ? "Multiple Choice"
                                      : q.type === "image"
                                        ? "Image Work"
                                        : "Short Answer"}
                                  </span>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                  Value:{" "}
                                  <span className="text-orange-500 text-sm font-sans font-black">
                                    {q.marks}
                                  </span>{" "}
                                  Marks
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-brand-muted mb-1">
                                  Question
                                </p>
                                <p className="font-sans font-bold text-brand-text text-base leading-relaxed">
                                  {q.question}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                  Student's Answer
                                </p>
                                {q.type === "image" ? (
                                  <div className="space-y-2">
                                    {studentAns ? (
                                      <img
                                        src={studentAns}
                                        alt="Student's submission"
                                        className="rounded-2xl border-2 border-brand-accent/10 max-w-full max-h-64 object-contain shadow-sm bg-brand-bg transition-all hover:scale-[1.01]"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <p className="text-xs font-bold text-brand-muted bg-brand-bg/50 p-4 rounded-xl border border-dashed border-brand-border/50">
                                        No upload provided
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 rounded-2xl bg-brand-bg font-sans font-bold text-sm text-brand-text border border-brand-accent/10 whitespace-pre-wrap">
                                    {studentAns || "NO RESPONSE RECEIVED"}
                                  </div>
                                )}
                              </div>

                              {q.type === "mcq" && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-green-600">
                                    Correct Answer
                                  </p>
                                  <div className="p-4 rounded-2xl bg-green-500/5 font-sans font-bold text-sm text-green-700 border border-green-500/10">
                                    {mcqCorrectAns || "Not specified"}
                                  </div>
                                </div>
                              )}

                              <div className="border-t border-brand-accent/5 pt-4 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                  Decision
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMarkingGrades((prev) => ({
                                        ...prev,
                                        [qIdxStr]: {
                                          correct: true,
                                          marks_awarded: q.marks,
                                        },
                                      }));
                                    }}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                      isCorrectActive
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.01]"
                                        : "bg-brand-bg text-brand-muted hover:text-brand-text border border-brand-accent/10"
                                    }`}
                                  >
                                    Check Correct ({q.marks} pts)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMarkingGrades((prev) => ({
                                        ...prev,
                                        [qIdxStr]: {
                                          correct: false,
                                          marks_awarded: 0,
                                        },
                                      }));
                                    }}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                      isWrongActive
                                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20 scale-[1.01]"
                                        : "bg-brand-bg text-brand-muted hover:text-brand-text border border-brand-accent/10"
                                    }`}
                                  >
                                    Check Wrong (0 pts)
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex items-center justify-between pt-4 bg-white dark:bg-brand-card p-4 rounded-2xl border border-brand-border">
                          <button
                            type="button"
                            disabled={currentQuestionIndex === 0}
                            onClick={() =>
                              setCurrentQuestionIndex((prev) => prev - 1)
                            }
                            className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl font-bold text-xs text-brand-muted hover:text-brand-text hover:bg-brand-bg/80 disabled:opacity-50 flex items-center gap-2 transition-all"
                          >
                            <ArrowLeft size={16} /> Previous
                          </button>
                          <span className="text-xs font-black text-brand-muted uppercase tracking-widest">
                            Question {currentQuestionIndex + 1} of{" "}
                            {exam.questions.length}
                          </span>
                          <button
                            type="button"
                            disabled={
                              currentQuestionIndex === exam.questions.length - 1
                            }
                            onClick={() =>
                              setCurrentQuestionIndex((prev) => prev + 1)
                            }
                            className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl font-bold text-xs text-brand-muted hover:text-brand-text hover:bg-brand-bg/80 disabled:opacity-50 flex items-center gap-2 transition-all"
                          >
                            Next{" "}
                            <ArrowLeft className="rotate-180" size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Grading Summary Box */}
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-[2rem] p-6 space-y-3 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest text-orange-600">
                        Grading Summary
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand-muted font-bold">
                          Graded Questions:
                        </span>
                        <span className="text-xs font-black text-brand-text">
                          {Object.keys(markingGrades).length} /{" "}
                          {exam.questions.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand-muted font-bold">
                          Current Score Sum:
                        </span>
                        <span className="text-sm font-sans font-black text-orange-600">
                          {Object.values(markingGrades).reduce(
                            (sum, g: any) => sum + (g?.marks_awarded || 0),
                            0,
                          )}{" "}
                          /{" "}
                          {exam.questions.reduce((sum, q) => sum + q.marks, 0)}{" "}
                          Pts
                        </span>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={saveMarking}
                      disabled={savingGrades}
                      className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {savingGrades ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save & Publish Assessment Marks
                    </button>
                  </>
                ) : (
                  // Legacy Standard Review Mode Body
                  <>
                    {/* Remarks Section */}
                    <div className="grid grid-cols-1 gap-6">
                      {/* Teacher Remarks */}
                      <div className="bg-white dark:bg-brand-card p-6 rounded-[2rem] border-2 border-brand-accent/10 shadow-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-brand-accent/10 text-brand-accent shadow-sm">
                            <MessageCircle size={18} />
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-brand-accent">
                            Teacher Remarks
                          </h3>
                        </div>
                        <textarea
                          placeholder="Type your final feedback for the student..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full bg-brand-bg border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 min-h-[120px] resize-none transition-all"
                        />

                        {parentFeedback && (
                          <div className="pt-2 border-t border-brand-accent/5 space-y-3">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-emerald-600" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                Parent's View & Response
                              </span>
                            </div>
                            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                              <p className="text-xs font-bold text-brand-text italic">
                                "{parentFeedback}"
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-brand-muted">
                                My Reply to Parent
                              </p>
                              <textarea
                                placeholder="Message for parent..."
                                value={teacherReply}
                                onChange={(e) =>
                                  setTeacherReply(e.target.value)
                                }
                                className="w-full bg-brand-bg border-none rounded-xl p-3 font-bold text-xs outline-none focus:ring-2 focus:ring-brand-accent/20 min-h-[60px] resize-none"
                              />
                              <button
                                onClick={saveTeacherReply}
                                disabled={savingReply}
                                className="w-full py-2 bg-emerald-600 text-white rounded-lg font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2"
                              >
                                {savingReply ? (
                                  <Loader2
                                    size={10}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Save size={10} />
                                )}
                                Update Reply
                              </button>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={saveGrading}
                          disabled={savingGrading}
                          className="w-full py-4 bg-brand-accent text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2"
                        >
                          {savingGrading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Save size={16} />
                          )}
                          Save Student Marks & Remarks
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-brand-accent/10 w-full" />

                    {exam.questions.map((q, idx) => {
                      const answersSource = selectedAttempt.answers || {};
                      const studentAnswer = answersSource[idx] !== undefined ? answersSource[idx] : answersSource[String(idx)];
                      const isCorrect =
                        q.type === "mcq"
                          ? studentAnswer === q.correct_answer
                          : false;

                      return (
                        <div key={idx} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-brand-accent/10 flex items-center justify-center font-black text-xs text-brand-accent">
                                {idx + 1}
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase tracking-widest ${q.type === "mcq" ? "text-brand-accent" : "text-orange-500"}`}
                              >
                                {q.type === "mcq"
                                  ? "Multiple Choice"
                                  : q.type === "short_answer"
                                    ? "Short Answer"
                                    : q.type === "image"
                                      ? "Image Work"
                                      : "General Question"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {q.type === "mcq" ? (
                                <div
                                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${
                                    isCorrect
                                      ? "bg-green-500/10 text-green-500"
                                      : "bg-red-500/10 text-red-500"
                                  }`}
                                >
                                  {isCorrect ? (
                                    <CheckCircle2 size={12} />
                                  ) : (
                                    <XCircle size={12} />
                                  )}
                                  {isCorrect
                                    ? "AUTOGRADED: CORRECT"
                                    : "AUTOGRADED: WRONG"}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 bg-white dark:bg-brand-card p-1 rounded-xl border border-brand-accent/5">
                                  <span className="text-[10px] font-black text-brand-muted uppercase px-2">
                                    Marks:
                                  </span>
                                  <input
                                    type="number"
                                    value={
                                      gradingMarks[idx] ??
                                      selectedAttempt.grading?.[idx] ??
                                      0
                                    }
                                    onChange={(e) =>
                                      handleGradeChange(
                                        idx,
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="w-16 bg-brand-bg border-none rounded-lg p-1.5 text-center font-black text-xs text-brand-accent focus:ring-1 focus:ring-brand-accent/30 outline-none"
                                  />
                                  <span className="text-[10px] font-black text-brand-muted uppercase px-2">
                                    / {q.marks}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-white dark:bg-brand-card p-6 rounded-3xl border border-brand-accent/5 shadow-sm space-y-4">
                            <p className="font-bold text-brand-text leading-relaxed">
                              {q.question}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">
                                  Student Response
                                </p>
                                {q.type === "image" ? (
                                  <div className="relative rounded-2xl overflow-hidden border-2 border-brand-accent/5 bg-brand-bg">
                                    {studentAnswer ? (
                                      <img
                                        src={studentAnswer}
                                        alt="Student work"
                                        className="w-full h-auto max-h-[400px] object-contain animate-fadeIn"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <p className="p-4 text-xs font-semibold text-brand-muted">
                                        No photo uploaded
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className={`p-3 rounded-2xl text-sm font-bold border-2 ${
                                      q.type === "mcq"
                                        ? isCorrect
                                          ? "bg-green-500/5 border-green-500/20 text-green-600"
                                          : "bg-red-500/5 border-red-500/20 text-red-600"
                                        : "bg-brand-bg border-brand-accent/5 text-brand-text"
                                    }`}
                                  >
                                    {studentAnswer || "NO RESPONSE"}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">
                                  Correct Solution
                                </p>
                                <div className="p-3 rounded-2xl text-sm font-bold bg-green-500/5 border-2 border-green-500/20 text-green-600 font-sans">
                                  {q.correct_answer}
                                </div>
                              </div>
                            </div>
                          </div>
                          {idx < exam.questions.length - 1 && (
                            <div className="h-px bg-brand-accent/10 w-full" />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grading Success Result Modal Overlay */}
      <AnimatePresence>
        {lastGradingResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fadeIn">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLastGradingResult(null)}
              className="absolute inset-0 bg-brand-bg/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="bg-white dark:bg-brand-card w-full max-w-md p-8 rounded-[3rem] border border-orange-500/20 shadow-2xl relative z-10 flex flex-col items-center text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-[2.5rem] bg-orange-500/10 text-orange-500 flex items-center justify-center text-3xl font-black shadow-lg shadow-orange-500/10 scale-100 hover:scale-105 transition-all">
                🎉
              </div>
              <div>
                <h2 className="font-sans font-black text-xl text-brand-text mb-1">
                  Grading Published!
                </h2>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                  Updated Score For {lastGradingResult.studentName}
                </p>
              </div>

              <div className="w-full bg-brand-bg rounded-2xl p-6 border border-brand-border flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-muted">
                    Final Score:
                  </span>
                  <span className="text-base font-sans font-black text-brand-text">
                    {lastGradingResult.score} / {lastGradingResult.total_marks}{" "}
                    Marks
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-muted">
                    Percentage:
                  </span>
                  <span className="text-base font-sans font-black text-orange-500">
                    {lastGradingResult.score_percentage}%
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-brand-muted leading-relaxed font-bold">
                The updated grading details and overall feedback have been
                published instantly to the student and their parent dashboard.
              </p>

              <button
                type="button"
                onClick={() => setLastGradingResult(null)}
                className="w-full py-3.5 bg-brand-text text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Close Window
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
