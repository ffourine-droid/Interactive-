import React, { useEffect, useState } from "react";
import { 
  Users, 
  Mail, 
  GraduationCap, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Trash2, 
  X, 
  KeyRound, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck,
  Search
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "./Toast";
import { CANONICAL_SUBJECTS } from "../types";

interface SchoolTeachersListProps {
  schoolId: string;
}

interface ClassOption {
  class_id: string;
  name: string;
  grade: string;
}

interface AssignmentRow {
  classId: string;
  subject: string;
}

export default function SchoolTeachersList({ schoolId }: SchoolTeachersListProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Teaching assignments data from admin_get_school_teaching_assignments
  const [teachingData, setTeachingData] = useState<{
    classes: any[];
    teachers: any[];
  } | null>(null);

  // Classes list for dropdown
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);

  // Shared Teacher PIN management
  const [sharedPin, setSharedPin] = useState("");
  const [savingSharedPin, setSavingSharedPin] = useState(false);
  const [sharedPinSuccess, setSharedPinSuccess] = useState(false);
  const [isSharedPinEditorOpen, setIsSharedPinEditorOpen] = useState(false);

  // Add Teacher Modal
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState<AssignmentRow[]>([
    { classId: "", subject: "" }
  ]);
  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [addTeacherError, setAddTeacherError] = useState<string | null>(null);

  // Quick Assign Modal for existing teachers
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);
  const [assigningTeacherName, setAssigningTeacherName] = useState<string>("");
  const [quickClassId, setQuickClassId] = useState("");
  const [quickSubject, setQuickSubject] = useState("");
  const [submittingQuickAssign, setSubmittingQuickAssign] = useState(false);

  // View toggle: 'by_teacher' | 'by_class'
  const [viewMode, setViewMode] = useState<'by_teacher' | 'by_class'>('by_teacher');
  const [searchQuery, setSearchQuery] = useState("");

  // Load all initial data
  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Load teaching assignments and teachers
      const { data: assignData, error: assignErr } = await supabase.rpc(
        "admin_get_school_teaching_assignments",
        { p_school_id: schoolId }
      );

      if (assignErr) throw assignErr;

      if (assignData && assignData.success) {
        setTeachingData({
          classes: assignData.classes || [],
          teachers: assignData.teachers || []
        });
      } else {
        // Fallback direct queries if RPC is not available
        const { data: dbTeachers } = await supabase
          .from("teachers")
          .select("id, name, email")
          .eq("school_id", schoolId);

        setTeachingData({
          classes: [],
          teachers: (dbTeachers || []).map((t: any) => ({
            teacher_id: t.id,
            teacher_name: t.name,
            email: t.email,
            assignments: []
          }))
        });
      }

      // 2. Load classes for the assignment dropdown
      const { data: classesData, error: classesErr } = await supabase.rpc(
        "admin_get_school_classes",
        { p_school_id: schoolId }
      );

      if (!classesErr && classesData?.classes) {
        setAvailableClasses(
          classesData.classes.map((c: any) => ({
            class_id: c.class_id || c.id,
            name: c.name,
            grade: c.grade
          }))
        );
      } else {
        // Fallback classes query
        const { data: dbClasses } = await supabase
          .from("classes")
          .select("id, name, grade")
          .eq("school_id", schoolId);

        setAvailableClasses(
          (dbClasses || []).map((c: any) => ({
            class_id: c.id,
            name: c.name,
            grade: c.grade
          }))
        );
      }
    } catch (err: any) {
      console.error("Error loading teaching assignments:", err);
      setError(err.message || "Failed to load school teachers and assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  // Handle setting shared school PIN (Requirement 5)
  const handleSaveSharedPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharedPin.trim() || sharedPin.trim().length !== 4) {
      showToast("PIN must be exactly 4 digits", "error");
      return;
    }

    setSavingSharedPin(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("school_set_teacher_pin", {
        p_school_id: schoolId,
        p_pin: sharedPin.trim()
      });

      if (rpcErr) throw rpcErr;

      if (data && data.success === false) {
        throw new Error(data.message || "Failed to update shared PIN");
      }

      setSharedPinSuccess(true);
      showToast("School's shared teacher PIN updated successfully!", "success");
      setTimeout(() => setSharedPinSuccess(false), 4000);
      setIsSharedPinEditorOpen(false);
    } catch (err: any) {
      console.error("Error setting shared teacher PIN:", err);
      showToast(err.message || "Failed to update shared PIN", "error");
    } finally {
      setSavingSharedPin(false);
    }
  };

  // Add another assignment row in the Add Teacher modal
  const handleAddAssignmentRow = () => {
    setSelectedAssignments([...selectedAssignments, { classId: "", subject: "" }]);
  };

  // Remove an assignment row
  const handleRemoveAssignmentRow = (index: number) => {
    setSelectedAssignments(selectedAssignments.filter((_, i) => i !== index));
  };

  // Update assignment row value
  const handleAssignmentRowChange = (index: number, field: keyof AssignmentRow, value: string) => {
    const updated = [...selectedAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedAssignments(updated);
  };

  // Handle Add Teacher Submission (Requirement 4)
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTeacherError(null);

    const cleanName = teacherName.trim();
    if (!cleanName) {
      setAddTeacherError("Teacher full name is required.");
      return;
    }

    setSubmittingTeacher(true);
    try {
      // 1. Call admin_add_teacher (without PIN)
      const { data: addResult, error: addErr } = await supabase.rpc("admin_add_teacher", {
        p_name: cleanName,
        p_school_id: schoolId,
        p_email: null
      });

      if (addErr) throw addErr;

      if (addResult && addResult.success === false) {
        throw new Error(addResult.message || "Failed to add teacher.");
      }

      const teacherId = addResult?.id || addResult?.teacher_id || addResult?.teacher?.id;

      // 2. Loop and assign classes + subjects
      if (teacherId) {
        for (const { classId, subject } of selectedAssignments) {
          if (classId && subject.trim()) {
            try {
              await supabase.rpc("admin_assign_teacher_subject", {
                p_teacher_id: teacherId,
                p_class_id: classId,
                p_subject: subject.trim()
              });
            } catch (assignErr) {
              console.warn("Failed to assign subject:", assignErr);
            }
          }
        }
      }

      showToast(`Teacher ${cleanName} added successfully!`, "success");
      // Reset form & reload
      setTeacherName("");
      setSelectedAssignments([{ classId: "", subject: "" }]);
      setIsAddTeacherOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("Error adding teacher:", err);
      setAddTeacherError(err.message || "An error occurred while adding the teacher.");
    } finally {
      setSubmittingTeacher(false);
    }
  };

  // Handle removing an assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to unassign this teacher from this subject?")) return;

    try {
      const { data, error: rpcErr } = await supabase.rpc("admin_remove_teacher_subject", {
        p_assignment_id: assignmentId
      });

      if (rpcErr) throw rpcErr;
      if (data && data.success === false) {
        throw new Error(data.message || "Failed to unassign subject");
      }

      showToast("Teaching assignment removed", "success");
      await loadData();
    } catch (err: any) {
      console.error("Error removing assignment:", err);
      showToast(err.message || "Failed to remove assignment", "error");
    }
  };

  // Handle quick assigning an existing teacher to a class & subject
  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeacherId || !quickClassId || !quickSubject.trim()) {
      showToast("Please select a class and specify a subject", "error");
      return;
    }

    setSubmittingQuickAssign(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("admin_assign_teacher_subject", {
        p_teacher_id: assigningTeacherId,
        p_class_id: quickClassId,
        p_subject: quickSubject.trim()
      });

      if (rpcErr) throw rpcErr;
      if (data && data.success === false) {
        throw new Error(data.message || "Failed to assign subject");
      }

      showToast(`Assigned ${quickSubject} to ${assigningTeacherName}!`, "success");
      setAssigningTeacherId(null);
      setQuickClassId("");
      setQuickSubject("");
      await loadData();
    } catch (err: any) {
      console.error("Error assigning teacher subject:", err);
      showToast(err.message || "Failed to assign subject", "error");
    } finally {
      setSubmittingQuickAssign(false);
    }
  };

  const teachersList = teachingData?.teachers || [];
  const classesList = teachingData?.classes || [];

  // Group assignments by teacher for 'by_teacher' view
  const teachersWithAssignments = teachersList.map((t: any) => {
    const assignments: { assignment_id: string; subject: string; class_id: string; class_name: string; grade: string }[] = [];
    for (const cls of classesList) {
      for (const asg of cls.assignments || []) {
        if (asg.teacher_id === t.teacher_id || asg.teacher_name === t.teacher_name) {
          assignments.push({
            assignment_id: asg.assignment_id,
            subject: asg.subject,
            class_id: cls.class_id,
            class_name: cls.class_name,
            grade: cls.grade
          });
        }
      }
    }
    return {
      ...t,
      assignments
    };
  });

  const filteredTeachers = teachersWithAssignments.filter((t: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.teacher_name || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      t.assignments.some((a: any) => a.subject.toLowerCase().includes(q) || a.class_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── 1. Header & Actions ── */}
      <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text">Teachers & Teaching Assignments</h2>
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mt-0.5">
                Manage educators and assign subjects across classes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button
            onClick={() => setIsSharedPinEditorOpen(!isSharedPinEditorOpen)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-brand-bg border border-brand-border hover:border-brand-accent/40 rounded-xl text-xs font-black uppercase tracking-wider text-brand-text transition-all"
            title="Configure shared teacher PIN"
          >
            <KeyRound size={14} className="text-amber-500" />
            <span>Shared PIN</span>
          </button>

          <button
            onClick={() => setIsAddTeacherOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-brand-accent hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Add Teacher</span>
          </button>
        </div>
      </div>

      {/* ── 2. Prominent Shared Teacher PIN Banner / Editor (Requirement 5) ── */}
      {(isSharedPinEditorOpen || teachersList.length === 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-[2rem] p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2 text-amber-500">
                <ShieldCheck size={18} />
                <span className="text-xs font-black uppercase tracking-widest">
                  School's Shared Teacher PIN
                </span>
              </div>
              <h3 className="text-base font-black text-brand-text">
                {teachersList.length === 0 
                  ? "Set your school's common teacher PIN before onboarding" 
                  : "Update the shared PIN given to new educators"}
              </h3>
              <p className="text-xs text-brand-muted font-medium leading-relaxed">
                When you add teachers without a personal PIN, they log in using their name and this shared school PIN. Upon logging in, they are gently prompted to set their own personal PIN.
              </p>
            </div>

            <form onSubmit={handleSaveSharedPin} className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={sharedPin}
                  onChange={(e) => setSharedPin(e.target.value.replace(/\D/g, ''))}
                  className="w-32 bg-brand-surface border border-brand-border rounded-xl py-3 px-3 font-bold tracking-[0.3em] text-center text-brand-text outline-none focus:border-amber-500 transition-all text-sm placeholder-brand-muted/30"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={savingSharedPin || sharedPin.length !== 4}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {savingSharedPin ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                <span>Save PIN</span>
              </button>
            </form>
          </div>

          {sharedPinSuccess && (
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
              <CheckCircle2 size={14} />
              <span>School shared teacher PIN saved successfully! Teachers can now log in with this PIN.</span>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Search and View Mode Switcher ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/50" />
          <input
            type="text"
            placeholder="Search teachers, subjects, classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-brand-text outline-none focus:border-brand-accent/50 transition-all placeholder-brand-muted/40"
          />
        </div>

        <div className="flex items-center bg-brand-surface border border-brand-border p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('by_teacher')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'by_teacher' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            By Teacher ({teachersList.length})
          </button>
          <button
            onClick={() => setViewMode('by_class')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'by_class' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            By Class ({classesList.length})
          </button>
        </div>
      </div>

      {/* ── 4. Main Content (Loading / Empty / Lists) ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="animate-spin text-brand-accent" size={28} />
          <p className="text-xs font-black uppercase tracking-widest text-brand-muted">
            Loading teachers & teaching assignments...
          </p>
        </div>
      ) : teachersList.length === 0 ? (
        <div className="p-12 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2rem] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto">
            <Users size={28} />
          </div>
          <div>
            <h3 className="text-base font-black text-brand-text">No teachers added yet</h3>
            <p className="text-xs text-brand-muted font-medium mt-1 max-w-sm mx-auto">
              Add your school's teachers and assign their subjects. They will log in using your shared PIN.
            </p>
          </div>
          <button
            onClick={() => setIsAddTeacherOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand-accent text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Add First Teacher</span>
          </button>
        </div>
      ) : viewMode === 'by_teacher' ? (
        /* ── VIEW BY TEACHER ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeachers.map((t: any) => (
            <div
              key={t.teacher_id}
              className="p-5 bg-brand-surface border border-brand-border rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 group hover:border-brand-accent/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-brand-text text-base group-hover:text-brand-accent transition-colors">
                      {t.teacher_name}
                    </h3>
                    {t.email && (
                      <p className="text-xs text-brand-muted font-medium flex items-center gap-1.5 mt-0.5">
                        <Mail size={12} className="text-brand-muted/60" />
                        {t.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setAssigningTeacherId(t.teacher_id);
                      setAssigningTeacherName(t.teacher_name);
                    }}
                    className="px-2.5 py-1 bg-brand-accent/10 hover:bg-brand-accent hover:text-white text-brand-accent rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0"
                    title="Assign another subject/class"
                  >
                    + Assign
                  </button>
                </div>

                {/* Assigned Classes & Subjects Badges */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand-muted">
                    Assigned Subjects ({t.assignments?.length || 0})
                  </p>
                  {t.assignments && t.assignments.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {t.assignments.map((asg: any) => (
                        <div
                          key={asg.assignment_id}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text group/badge"
                        >
                          <span className="text-brand-accent font-black">{asg.subject}</span>
                          <span className="text-brand-muted text-[10px]">({asg.class_name || asg.grade})</span>
                          <button
                            onClick={() => handleRemoveAssignment(asg.assignment_id)}
                            className="w-4 h-4 rounded-full hover:bg-red-500/10 text-brand-muted hover:text-red-500 flex items-center justify-center transition-colors ml-0.5"
                            title="Remove assignment"
                          >
                            <X size={10} className="stroke-[3]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-amber-500/80 italic">
                      No subjects or classes assigned yet. Click "+ Assign" above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── VIEW BY CLASS ── */
        <div className="space-y-4">
          {classesList.map((cls: any) => {
            const hasAssignments = cls.assignments && cls.assignments.length > 0;
            const studentCount = cls.student_count ?? 0;

            return (
              <div
                key={cls.class_id}
                className="p-5 sm:p-6 bg-brand-surface border border-brand-border rounded-[2rem] shadow-sm space-y-4 hover:border-brand-accent/30 transition-all"
              >
                {/* Header: Class Name + Grade + Student Count */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-brand-text">{cls.class_name}</h3>
                        <span className="px-2 py-0.5 rounded-lg bg-brand-bg border border-brand-border text-[9px] font-black uppercase tracking-wider text-brand-muted">
                          Grade {cls.grade}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-brand-muted font-bold">
                        <Users size={12} className="text-brand-accent" />
                        <span>
                          {studentCount} {studentCount === 1 ? "student" : "students"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-2.5 py-1 bg-brand-bg rounded-lg border border-brand-border self-start sm:self-auto">
                    {cls.assignments?.length || 0} Educators
                  </span>
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
                        {cls.assignments.map((asg: any) => (
                          <tr key={asg.assignment_id} className="group hover:bg-brand-bg/60 transition-colors">
                            <td className="py-2 px-3">
                              <span className="font-black text-brand-accent">{asg.subject}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-brand-text">{asg.teacher_name}</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleRemoveAssignment(asg.assignment_id)}
                                className="inline-flex items-center justify-center p-1.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove assignment"
                                aria-label="Remove assignment"
                              >
                                <X size={14} className="stroke-[2.5]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-3 px-4 rounded-xl bg-brand-bg/60 border border-brand-border/60 text-xs font-semibold text-brand-muted italic">
                    No teachers assigned
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. ADD TEACHER MODAL (Requirement 4) ── */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsAddTeacherOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-brand-text">Add New Teacher</h2>
                <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mt-0.5">
                  Register educator and assign class subjects
                </p>
              </div>
            </div>

            {addTeacherError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs font-semibold text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{addTeacherError}</span>
              </div>
            )}

            <form onSubmit={handleAddTeacherSubmit} className="space-y-6">
              {/* Teacher Name */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-brand-muted ml-1 flex items-center gap-1.5">
                  <Users size={13} className="text-brand-accent" />
                  Teacher Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mr. John Doe"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 px-4 font-bold text-sm text-brand-text outline-none focus:border-brand-accent transition-all placeholder-brand-muted/30 shadow-sm"
                  required
                />
              </div>

              {/* Class & Subject Assignments (Spacious Repeatable Rows) */}
              <div className="space-y-4 pt-3 border-t border-brand-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-text flex items-center gap-1.5">
                      <BookOpen size={14} className="text-brand-accent" />
                      Teaching Assignments & Subjects
                    </h3>
                    <p className="text-[11px] text-brand-muted font-medium mt-0.5">
                      Select classes and enter subjects taught by this teacher
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-brand-muted bg-brand-bg border border-brand-border px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    {selectedAssignments.length} {selectedAssignments.length === 1 ? 'Assignment' : 'Assignments'}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {selectedAssignments.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 bg-brand-bg border border-brand-border rounded-2xl space-y-3 relative transition-all group hover:border-brand-accent/30"
                    >
                      <div className="flex items-center justify-between border-b border-brand-border/40 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-brand-accent/15 text-brand-accent text-[11px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-brand-text">
                            Assignment {idx + 1}
                          </span>
                        </div>
                        {selectedAssignments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignmentRow(idx)}
                            className="flex items-center gap-1 text-[11px] font-bold text-brand-muted hover:text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Remove this assignment"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Class Dropdown */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black uppercase tracking-wider text-brand-muted flex items-center gap-1.5 ml-0.5">
                            <GraduationCap size={13} className="text-brand-accent" />
                            Class / Grade <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={row.classId}
                            onChange={(e) => handleAssignmentRowChange(idx, 'classId', e.target.value)}
                            className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-3.5 text-xs font-bold text-brand-text outline-none focus:border-brand-accent transition-all shadow-sm"
                          >
                            <option value="">Select a class...</option>
                            {availableClasses.map((cls) => (
                              <option key={cls.class_id} value={cls.class_id}>
                                {cls.name} ({cls.grade})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Subject Input with Expanded Writing Area */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black uppercase tracking-wider text-brand-muted flex items-center gap-1.5 ml-0.5">
                            <BookOpen size={13} className="text-brand-accent" />
                            Subject Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            list="canonical-subjects"
                            placeholder="e.g. Mathematics, Science, English..."
                            value={row.subject}
                            onChange={(e) => handleAssignmentRowChange(idx, 'subject', e.target.value)}
                            className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-3.5 text-xs font-bold text-brand-text outline-none focus:border-brand-accent transition-all placeholder-brand-muted/40 shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Quick subject suggestion chips */}
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-brand-muted/70 mb-1.5">Quick select subject:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Mathematics', 'Science', 'English', 'Kiswahili', 'Social Studies', 'CRE', 'Agriculture'].map((sub) => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => handleAssignmentRowChange(idx, 'subject', sub)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                row.subject === sub
                                  ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                                  : 'bg-brand-surface hover:bg-brand-surface/80 text-brand-muted hover:text-brand-text border-brand-border'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddAssignmentRow}
                  className="w-full py-3 px-4 rounded-xl bg-brand-bg border border-dashed border-brand-accent/40 hover:border-brand-accent hover:bg-brand-accent/5 text-brand-accent text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Plus size={14} />
                  <span>+ Add Another Class & Subject</span>
                </button>
              </div>

              <datalist id="canonical-subjects">
                {CANONICAL_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>

              <div className="pt-4 flex items-center gap-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="flex-1 py-3.5 px-4 rounded-xl border border-brand-border text-xs font-black uppercase tracking-wider text-brand-muted hover:text-brand-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeacher || !teacherName.trim()}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-brand-accent text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-accent/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingTeacher ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>{submittingTeacher ? "Saving..." : "Save & Assign Teacher"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. QUICK ASSIGN MODAL FOR EXISTING TEACHERS ── */}
      {assigningTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setAssigningTeacherId(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-brand-text">Assign Subject</h2>
                <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mt-0.5">
                  To {assigningTeacherName}
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickAssignSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-brand-muted ml-1 flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-brand-accent" />
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={quickClassId}
                  onChange={(e) => setQuickClassId(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 px-4 text-xs font-bold text-brand-text outline-none focus:border-brand-accent transition-all shadow-sm"
                  required
                >
                  <option value="">Choose a Class...</option>
                  {availableClasses.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.name} ({cls.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-brand-muted ml-1 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-brand-accent" />
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="canonical-subjects"
                  placeholder="e.g. Mathematics, Science, English..."
                  value={quickSubject}
                  onChange={(e) => setQuickSubject(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 px-4 text-xs font-bold text-brand-text outline-none focus:border-brand-accent transition-all placeholder-brand-muted/40 shadow-sm"
                  required
                />
              </div>

              {/* Quick subject chips */}
              <div className="pt-0.5">
                <p className="text-[10px] font-bold text-brand-muted/70 mb-1.5">Quick select subject:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Mathematics', 'Science', 'English', 'Kiswahili', 'Social Studies', 'CRE', 'Agriculture'].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setQuickSubject(sub)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        quickSubject === sub
                          ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                          : 'bg-brand-bg hover:bg-brand-surface text-brand-muted hover:text-brand-text border-brand-border'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningTeacherId(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-brand-border text-xs font-black uppercase tracking-wider text-brand-muted hover:text-brand-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuickAssign || !quickClassId || !quickSubject.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-accent text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-accent/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingQuickAssign ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>{submittingQuickAssign ? "Assigning..." : "Assign"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
