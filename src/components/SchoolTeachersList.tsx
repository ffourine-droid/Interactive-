import React, { useEffect, useState } from "react";
import { Users, Mail, GraduationCap, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Teacher {
  id: string;
  name: string;
  email?: string;
  classes?: { id: string; name: string; grade: string }[];
}

interface SchoolTeachersListProps {
  schoolId: string;
}

/**
 * Drop this into the school admin dashboard (the one they reach after
 * school_login). Pass the school id you already have in state from login.
 *
 *   <SchoolTeachersList schoolId={school.id} />
 */
export default function SchoolTeachersList({ schoolId }: SchoolTeachersListProps) {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    setLoading(true);

    async function loadTeachers() {
      try {
        // 1. Try RPC call
        const { data, error: rpcError } = await supabase.rpc("school_get_teachers", {
          p_school_id: schoolId,
        });

        if (cancelled) return;

        if (!rpcError && data?.success && data?.teachers) {
          setTeachers(data.teachers);
          setLoading(false);
          return;
        }

        console.warn("school_get_teachers RPC call failed or returned success=false, trying direct fallback query:", rpcError?.message || data?.message);

        // 2. Direct Query Fallback
        const { data: dbData, error: dbError } = await supabase
          .from("teachers")
          .select(`
            id,
            name,
            email,
            classes (
              id,
              name,
              grade
            )
          `)
          .eq("school_id", schoolId);

        if (cancelled) return;

        if (dbError) {
          console.error("Direct fallback query failed as well:", dbError.message);
          setError("Couldn't load teachers.");
        } else {
          setTeachers(dbData || []);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("Exception loading school teachers:", err);
        setError("An unexpected error occurred while loading teachers.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeachers();

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-xl space-y-4">
      <div>
        <h2 className="text-lg font-black text-brand-text flex items-center gap-2">
          <Users className="text-brand-accent" size={20} />
          Teachers at your school
        </h2>
        <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mt-1">
          Teachers appear here once they search for your school and link their account during signup.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <Loader2 className="animate-spin text-brand-accent" size={24} />
          <p className="text-xs font-black uppercase tracking-widest text-brand-muted animate-pulse">Loading teachers…</p>
        </div>
      )}

      {!loading && teachers !== null && teachers.length === 0 && (
        <div className="p-8 text-center bg-brand-bg/50 border border-brand-border border-dashed rounded-2xl text-brand-muted">
          <p className="text-xs font-bold uppercase tracking-wider">No teachers linked yet</p>
          <p className="text-[11px] font-semibold mt-1">Provide teachers with your school name so they can link up!</p>
        </div>
      )}

      {!loading && teachers && teachers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {teachers.map((t) => {
            const grades = Array.from(
              new Set((t.classes || []).map((c) => c?.grade).filter(Boolean))
            );
            const gradesDisplay = grades.length > 0 ? grades.join(", ") : null;
            const classesCount = t.classes?.length || 0;

            return (
              <div
                key={t.id}
                className="p-5 bg-brand-bg border border-brand-border hover:border-brand-accent/50 rounded-2xl transition-all duration-300 flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black text-brand-text text-base group-hover:text-brand-accent transition-colors">
                      {t.name}
                    </h3>
                    {classesCount > 0 && (
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-brand-accent/10 text-brand-accent rounded-full">
                        {classesCount} {classesCount === 1 ? "Class" : "Classes"}
                      </span>
                    )}
                  </div>

                  {t.email && (
                    <p className="text-xs text-brand-muted font-semibold flex items-center gap-1.5 mt-1">
                      <Mail size={12} className="text-brand-muted/60" />
                      {t.email}
                    </p>
                  )}
                </div>

                {gradesDisplay && (
                  <div className="flex items-center gap-1.5 border-t border-brand-border/40 pt-3">
                    <GraduationCap size={13} className="text-brand-accent/70" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand-muted">
                      Grades: <span className="text-brand-text">{gradesDisplay}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
