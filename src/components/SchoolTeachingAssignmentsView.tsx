import React, { useEffect, useState } from "react";
import {
  GraduationCap,
  Users,
  X,
  Plus,
  Loader2,
  AlertCircle,
  BookOpen,
  Search,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "./Toast";
import { CANONICAL_SUBJECTS } from "../types";

export interface TeachingAssignment {
  assignment_id: string;
  teacher_id: string;
  teacher_name: string;
  subject: string;
}

export interface TeachingClass {
  class_id: string;
  class_name: string;
  grade: string | number;
  student_count?: number;
  assignments: TeachingAssignment[];
}

export interface TeachingTeacher {
  teacher_id: string;
  teacher_name: string;
  email?: string;
}

export interface SchoolTeachingAssignmentsData {
  success: boolean;
  classes: TeachingClass[];
  teachers: TeachingTeacher[];
}

interface SchoolTeachingAssignmentsViewProps {
  schoolId: string;
  onOpenAddTeacher?: () => void;
}

export default function SchoolTeachingAssignmentsView({
  schoolId,
  onOpenAddTeacher
}: SchoolTeachingAssignmentsViewProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SchoolTeachingAssignmentsData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Quick Assign Modal state
  const [assigningClass, setAssigningClass] = useState<TeachingClass | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Fetch teaching assignments
  const fetchAssignments = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: resData, error: resErr } = await supabase.rpc(
        "admin_get_school_teaching_assignments",
        { p_school_id: schoolId }
      );

      if (resErr) throw resErr;

      if (resData && (resData.classes || resData.success !== false)) {
        setData({
          success: resData.success ?? true,
          classes: resData.classes || [],
          teachers: resData.teachers || []
        });
      } else {
        setData({
          success: false,
          classes: [],
          teachers: []
        });
      }
    } catch (err: any) {
      console.error("Error loading teaching assignments:", err);
      setError(err.message || "Failed to load teaching assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [schoolId]);

  // Remove a teacher-subject assignment
  const handleRemoveAssignment = async (assignmentId: string, subject: string, teacherName: string) => {
    if (!confirm(`Are you sure you want to remove ${teacherName} from teaching ${subject}?`)) {
      return;
    }

    setRemovingId(assignmentId);
    try {
      const { data: res, error: rpcErr } = await supabase.rpc(
        "admin_remove_teacher_subject",
        { p_assignment_id: assignmentId }
      );

      if (rpcErr) throw rpcErr;
      if (res && res.success === false) {
        throw new Error(res.message || "Failed to remove assignment.");
      }

      showToast(`Removed assignment for ${subject}`, "success");
      await fetchAssignments();
    } catch (err: any) {
      console.error("Error removing assignment:", err);
      showToast(err.message || "Failed to remove assignment.", "error");
    } finally {
      setRemovingId(null);
    }
  };

  // Submit Quick Assign
  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningClass || !selectedTeacherId || !selectedSubject.trim()) {
      showToast("Please select a teacher and specify a subject", "error");
      return;
    }

    setSubmittingAssign(true);
    try {
      const { data: res, error: rpcErr } = await supabase.rpc(
        "admin_assign_teacher_subject",
        {
          p_teacher_id: selectedTeacherId,
          p_class_id: assigningClass.class_id,
          p_subject: selectedSubject.trim()
        }
      );

      if (rpcErr) throw rpcErr;
      if (res && res.success === false) {
        throw new Error(res.message || "Failed to assign teacher to subject");
      }

      showToast(`Assigned ${selectedSubject.trim()} to ${assigningClass.class_name}!`, "success");
      setAssigningClass(null);
      setSelectedTeacherId("");
      setSelectedSubject("");
      await fetchAssignments();
    } catch (err: any) {
      console.error("Error assigning teacher subject:", err);
      showToast(err.message || "Failed to assign subject", "error");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const classes = data?.classes || [];
  const teachers = data?.teachers || [];

  // Filter classes by search query
  const filteredClasses = classes.filter((cls) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = cls.class_name.toLowerCase().includes(q);
    const gradeMatch = String(cls.grade).toLowerCase().includes(q);
    const assignmentMatch = cls.assignments?.some(
      (a) =>
        a.subject.toLowerCase().includes(q) ||
        a.teacher_name.toLowerCase().includes(q)
    );
    return nameMatch || gradeMatch || assignmentMatch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text">Teaching Assignments</h2>
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mt-0.5">
                Class Rosters & Assigned Subject Educators
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onOpenAddTeacher && (
            <button
              onClick={onOpenAddTeacher}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-brand-accent hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
            >
              <Plus size={16} />
              <span>Add Teacher</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/50" />
          <input
            type="text"
            placeholder="Search class, subject, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-brand-text outline-none focus:border-brand-accent/50 transition-all placeholder-brand-muted/40"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-brand-muted">
          <span className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-xl">
            {classes.length} {classes.length === 1 ? "Class" : "Classes"}
          </span>
          <span className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-xl">
            {teachers.length} {teachers.length === 1 ? "Teacher" : "Teachers"}
          </span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="animate-spin text-brand-accent" size={28} />
          <p className="text-xs font-black uppercase tracking-widest text-brand-muted">
            Loading teaching assignments...
          </p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2rem] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto">
            <GraduationCap size={28} />
          </div>
          <div>
            <h3 className="text-base font-black text-brand-text">No Classes Found</h3>
            <p className="text-xs text-brand-muted font-medium mt-1 max-w-sm mx-auto">
              Classes created in your school will appear here along with their student rosters and subject assignments.
            </p>
          </div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-10 text-center bg-brand-surface border border-brand-border rounded-[2rem] space-y-2">
          <p className="text-sm font-bold text-brand-text">No classes matching "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs font-bold text-brand-accent hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Layout: one card/row per class — class name + grade + student count as header, then small table underneath */
        <div className="space-y-4">
          {filteredClasses.map((cls) => {
            const hasAssignments = cls.assignments && cls.assignments.length > 0;
            const studentCount = cls.student_count ?? 0;

            return (
              <div
                key={cls.class_id}
                className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 sm:p-6 shadow-sm space-y-4 hover:border-brand-accent/30 transition-all"
              >
                {/* Class Header: class name + grade + student count */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-brand-text">{cls.class_name}</h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-brand-bg border border-brand-border text-[10px] font-black uppercase tracking-wider text-brand-muted">
                          Grade {cls.grade}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-brand-muted font-bold">
                        <Users size={13} className="text-brand-accent" />
                        <span>
                          {studentCount} {studentCount === 1 ? "student" : "students"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => {
                        setAssigningClass(cls);
                        setSelectedTeacherId(teachers[0]?.teacher_id || "");
                        setSelectedSubject("");
                      }}
                      className="px-3 py-1.5 bg-brand-accent/10 hover:bg-brand-accent hover:text-white text-brand-accent rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Assign Subject</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Table or 'No teachers assigned' notice */}
                {hasAssignments ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border/40 text-[10px] font-black uppercase tracking-wider text-brand-muted">
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3">Assigned Teacher</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/20 text-xs font-bold text-brand-text">
                        {cls.assignments.map((asg) => (
                          <tr key={asg.assignment_id} className="group hover:bg-brand-bg/60 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-black text-brand-accent">{asg.subject}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-brand-text">{asg.teacher_name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleRemoveAssignment(asg.assignment_id, asg.subject, asg.teacher_name)}
                                disabled={removingId === asg.assignment_id}
                                className="inline-flex items-center justify-center p-1.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove assignment"
                                aria-label="Remove assignment"
                              >
                                {removingId === asg.assignment_id ? (
                                  <Loader2 size={14} className="animate-spin text-red-500" />
                                ) : (
                                  <X size={15} className="stroke-[2.5]" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-3 px-4 rounded-xl bg-brand-bg/60 border border-brand-border/60 text-xs font-semibold text-brand-muted italic flex items-center justify-between">
                    <span>No teachers assigned</span>
                    <button
                      onClick={() => {
                        setAssigningClass(cls);
                        setSelectedTeacherId(teachers[0]?.teacher_id || "");
                        setSelectedSubject("");
                      }}
                      className="text-[11px] font-black text-brand-accent hover:underline uppercase tracking-wider"
                    >
                      + Assign Now
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Assign Modal */}
      {assigningClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setAssigningClass(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-brand-text">Assign Subject</h2>
                <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mt-0.5">
                  To {assigningClass.class_name} ({assigningClass.student_count ?? 0} students)
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickAssign} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">
                  Select Teacher
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-3.5 text-xs font-bold text-brand-text outline-none focus:border-brand-accent"
                  required
                >
                  <option value="">Choose Teacher...</option>
                  {teachers.map((t) => (
                    <option key={t.teacher_id} value={t.teacher_id}>
                      {t.teacher_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  list="teaching-assignment-canonical-subjects"
                  placeholder="e.g. Mathematics"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-xs font-bold text-brand-text outline-none focus:border-brand-accent placeholder-brand-muted/40"
                  required
                />
              </div>

              <datalist id="teaching-assignment-canonical-subjects">
                {CANONICAL_SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningClass(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-brand-border text-xs font-black uppercase tracking-wider text-brand-muted hover:text-brand-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || !selectedTeacherId || !selectedSubject.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-accent text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-accent/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingAssign ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>{submittingAssign ? "Saving..." : "Assign"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
