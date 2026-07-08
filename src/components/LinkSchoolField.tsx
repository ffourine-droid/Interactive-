import React, { useEffect, useState } from "react";
import { School } from "lucide-react";
import { supabase } from "../lib/supabase";

interface LinkSchoolFieldProps {
  teacherId?: string;
  currentSchoolName?: string;
  onLinked?: (school: { id: string; name: string }) => void;
  onChangeText?: (text: string) => void;
  label?: string;
}

/**
 * Drop this into the teacher signup form (after they type their name/PIN)
 * AND into teacher settings, so teachers who already have an account but
 * never linked can do it retroactively.
 *
 * Usage:
 *   <LinkSchoolField
 *     teacherId={teacher.id}
 *     currentSchoolName={teacher.school_name}
 *     onLinked={(school) => setTeacher(t => ({ ...t, school_id: school.id, school_name: school.name }))}
 *   />
 */
export default function LinkSchoolField({ teacherId, currentSchoolName, onLinked, onChangeText, label }: LinkSchoolFieldProps) {
  const [query, setQuery] = useState(currentSchoolName || "");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkedName, setLinkedName] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Debounced search as the teacher types
  useEffect(() => {
    if (!query.trim() || query.trim() === linkedName) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error: rpcError } = await supabase.rpc("search_schools", { p_query: query.trim() });
        setSearching(false);
        if (!rpcError && data?.success) {
          setResults(data.schools || []);
        } else {
          // Fallback if RPC fails/doesn't exist
          setResults([]);
        }
      } catch (err) {
        setSearching(false);
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, linkedName]);

  async function handleSelect(school: any) {
    setError("");
    if (!teacherId) {
      // Signup flow: no teacher ID exists yet, just select locally and pass to parent signup form
      setLinkedName(school.name);
      setQuery(school.name);
      setResults([]);
      onChangeText?.(school.name);
      onLinked?.({ id: school.id, name: school.name });
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc("link_teacher_school", {
        p_teacher_id: teacherId,
        p_school_id: school.id,
      });

      if (rpcError || !data?.success) {
        setError(data?.message || rpcError?.message || "Couldn't link to that school. Try again.");
        return;
      }

      setLinkedName(data.school_name);
      setQuery(data.school_name);
      setResults([]);
      onChangeText?.(data.school_name);
      onLinked?.({ id: school.id, name: data.school_name });
    } catch (err: any) {
      setError(err?.message || "An error occurred. Please try again.");
    }
  }

  return (
    <div className="relative font-sans w-full">
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted ml-1 mb-2">{label || "School Name"}</label>
      <div className="relative">
        <School className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
        <input
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setLinkedName(null);
            onChangeText?.(val);
          }}
          placeholder="Start typing your school's name…"
          className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-brand-text"
          autoComplete="off"
        />
      </div>

      {linkedName && (
        <p className="text-green-400 text-[11px] font-bold mt-2">
          ✓ Linked to {linkedName}. Your school admin will see you on their dashboard.
        </p>
      )}

      {error && (
        <p className="text-red-400 text-[11px] font-bold mt-2">
          ✕ {error}
        </p>
      )}

      {searching && (
        <p className="text-brand-muted text-[11px] font-bold mt-2 animate-pulse">
          Searching schools…
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-2 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden absolute w-full z-50 shadow-2xl divide-y divide-brand-border/30 max-h-60 overflow-y-auto no-scrollbar">
          {results.map((school) => (
            <button
              key={school.id}
              type="button"
              onClick={() => handleSelect(school)}
              className="block w-full text-left bg-transparent border-none text-brand-text text-sm py-3 px-4 cursor-pointer hover:bg-brand-accent/10 transition-colors font-medium outline-none"
            >
              <span className="font-bold text-brand-text">{school.name}</span>
              {school.county && <span className="text-brand-muted font-medium"> · {school.county}</span>}
            </button>
          ))}
        </div>
      )}

      {!linkedName && query.trim() && results.length === 0 && !searching && (
        <p className="text-brand-muted text-[11px] font-medium leading-relaxed mt-2 pl-1">
          Can't find your school? It may not be on AziLearn yet — you can still use your account, and link it later once your school is onboarded.
        </p>
      )}
    </div>
  );
}
