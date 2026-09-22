import React, { useState } from 'react';
import { 
  Search, 
  School, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  Loader2, 
  Bookmark, 
  AlertCircle, 
  GraduationCap, 
  ChevronDown 
} from 'lucide-react';
import { AssignmentCard, AssignmentItem } from './AssignmentCard';

interface AssignmentDiscoveryViewProps {
  studentName: string;
  onStudentNameChange: (name: string) => void;
  assignments: AssignmentItem[];
  loading: boolean;
  onRefresh: () => void;
  onSelectAssignment: (assignmentId: string) => void;
  
  // Search parameters
  searchTitle: string;
  setSearchTitle: (v: string) => void;
  searchTeacher: string;
  setSearchTeacher: (v: string) => void;
  searchSchool: string;
  setSearchSchool: (v: string) => void;
  searchGrade: string;
  setSearchGrade: (v: string) => void;
  onSearch: () => void;

  // Direct code or title find
  onDirectSchoolFind?: (school: string, title: string, grade: string) => Promise<void>;
  directFindLoading?: boolean;
  directFindError?: string | null;
}

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

export const AssignmentDiscoveryView: React.FC<AssignmentDiscoveryViewProps> = ({
  studentName,
  onStudentNameChange,
  assignments,
  loading,
  onRefresh,
  onSelectAssignment,
  searchTitle,
  setSearchTitle,
  searchTeacher,
  setSearchTeacher,
  searchSchool,
  setSearchSchool,
  searchGrade,
  setSearchGrade,
  onSearch,
  onDirectSchoolFind,
  directFindLoading,
  directFindError
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Extract distinct subjects for quick pills
  const availableSubjects = Array.from(new Set(assignments.map(a => a.subject).filter(Boolean)));

  // Filter assignments locally
  const filteredAssignments = assignments.filter(a => {
    // Status filter
    const isCompleted = a.has_submitted || a.submission_status === 'submitted' || a.submission_status === 'graded';
    if (statusFilter === 'todo' && isCompleted) return false;
    if (statusFilter === 'completed' && !isCompleted) return false;

    // Subject filter
    if (subjectFilter !== 'all' && a.subject !== subjectFilter) return false;

    // Title / keyword filter
    if (searchTitle && searchTitle.trim()) {
      const q = searchTitle.toLowerCase().trim();
      const matchTitle = a.title?.toLowerCase().includes(q);
      const matchSub = a.subject?.toLowerCase().includes(q);
      const matchTeacher = a.teacher_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchSub && !matchTeacher) return false;
    }

    return true;
  });

  const handleSelectAssignment = (assignmentId: string) => {
    onSelectAssignment(assignmentId);
  };

  const isProfileComplete = Boolean(studentName.trim() && searchTeacher.trim() && searchSchool.trim());

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* ── STUDENT IDENTITY BANNER ── */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-accent/15 text-brand-accent flex items-center justify-center font-black text-base shadow-xs shrink-0">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                Student Profile & Classroom Details
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => onStudentNameChange(e.target.value)}
                  placeholder="Enter your full name *"
                  className="font-display font-black text-base text-brand-text bg-transparent border-b border-dashed border-brand-border hover:border-brand-accent focus:border-brand-accent outline-none pb-0.5 max-w-[200px]"
                />
                <div className="relative inline-flex items-center">
                  <select
                    id="student-profile-grade-select"
                    value={searchGrade}
                    onChange={(e) => setSearchGrade(e.target.value)}
                    className="text-[11px] font-bold text-brand-accent bg-brand-bg pl-2 pr-6 py-1 rounded-lg border border-brand-border hover:border-brand-accent focus:border-brand-accent outline-none appearance-none cursor-pointer shadow-2xs transition-colors"
                    title="Switch your Grade level"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g} className="bg-brand-surface text-brand-text font-bold">
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-1.5 text-brand-muted pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || !isProfileComplete}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-brand-bg hover:bg-brand-surface text-xs font-bold text-brand-muted hover:text-brand-text flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Refresh assignments list"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-brand-accent' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Classroom details required before getting assignments */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-brand-border/60">
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={14} />
            <input
              type="text"
              value={searchTeacher}
              onChange={(e) => setSearchTeacher(e.target.value)}
              placeholder="Teacher's name *"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text placeholder:text-brand-muted/70 transition-all"
            />
          </div>
          <div className="relative">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={14} />
            <input
              type="text"
              value={searchSchool}
              onChange={(e) => setSearchSchool(e.target.value)}
              placeholder="School name *"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text placeholder:text-brand-muted/70 transition-all"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={14} />
            <select
              id="student-classroom-grade-select"
              value={searchGrade}
              onChange={(e) => setSearchGrade(e.target.value)}
              className="w-full pl-8 pr-7 py-2 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text appearance-none cursor-pointer transition-all"
              title="Select Grade Level"
            >
              {GRADES.map(g => (
                <option key={g} value={g} className="bg-brand-surface text-brand-text font-bold">
                  {g}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
          </div>
        </div>

        {!isProfileComplete ? (
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>Please write your full name, teacher's name, and school name above to load assignments for your school.</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-brand-border/60">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              <span>Ready to search assignments for {searchSchool} ({searchGrade})</span>
            </span>
            <button
              type="button"
              onClick={onSearch}
              disabled={loading}
              className="px-4 py-1.5 rounded-xl bg-brand-accent text-white font-bold text-xs shadow-xs hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              <span>{assignments.length > 0 ? "Refresh School Assignments" : "Load School Assignments"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ──────────────── MY ASSIGNMENTS SECTION ──────────────── */}
      <div className="space-y-4">
        {/* Section Header with Title & Quick Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-surface p-4 rounded-2xl border border-brand-border shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/15 text-brand-accent flex items-center justify-center shrink-0">
              <Bookmark size={16} />
            </div>
            <div>
              <h3 className="font-display font-black text-sm sm:text-base text-brand-text leading-tight">
                My Assignments
              </h3>
              <p className="text-[11px] font-semibold text-brand-muted">
                {assignments.length > 0 
                  ? `${assignments.length} ${assignments.length === 1 ? 'assignment' : 'assignments'} found for ${searchSchool || 'your school'}`
                  : 'Assigned homework and exercises'}
              </p>
            </div>
          </div>

          {assignments.length > 0 && (
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={13} />
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Filter assignments..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text placeholder:text-brand-muted/70 transition-all"
              />
              {searchTitle && (
                <button
                  type="button"
                  onClick={() => setSearchTitle('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text text-sm font-bold"
                  title="Clear filter"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status pills */}
          <div className="flex items-center gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border">
            {(['all', 'todo', 'completed'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-brand-text text-white shadow-xs'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                {st === 'all' ? 'All Tasks' : st === 'todo' ? 'To Do' : 'Submitted'}
              </button>
            ))}
          </div>

          {/* Subject pills if multiple exist */}
          {availableSubjects.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSubjectFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  subjectFilter === 'all'
                    ? 'bg-brand-accent text-white border-brand-accent'
                    : 'bg-brand-surface text-brand-muted border-brand-border hover:border-brand-accent/40'
                }`}
              >
                All Subjects
              </button>
              {availableSubjects.map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubjectFilter(sub)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                    subjectFilter === sub
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-brand-surface text-brand-muted border-brand-border hover:border-brand-accent/40'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assignments List */}
        {!isProfileComplete ? (
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <School size={28} />
            </div>
            <div>
              <h4 className="font-display font-black text-base text-brand-text">
                Input Details to Load Assignments
              </h4>
              <p className="text-xs text-brand-muted max-w-sm mx-auto mt-1 leading-relaxed">
                Please enter your name, teacher's name, and school name above. Your assignments will load automatically.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-brand-surface border border-brand-border rounded-3xl text-center space-y-3">
            <Loader2 className="animate-spin text-brand-accent" size={32} />
            <p className="text-xs font-bold text-brand-muted">
              Loading assignments for {searchSchool}...
            </p>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="space-y-3">
            {filteredAssignments.map((assignment, idx) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onSelect={handleSelectAssignment}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto">
              <School size={28} />
            </div>
            <div>
              <h4 className="font-display font-black text-base text-brand-text">
                {assignments.length === 0 ? "No assignments loaded yet" : "No matching assignments"}
              </h4>
              <p className="text-xs text-brand-muted max-w-xs mx-auto mt-1 leading-relaxed">
                {assignments.length === 0
                  ? `Click below to load assignments for ${searchSchool} (${searchGrade}).`
                  : `We couldn't find any assignments matching your current filters for ${searchSchool} (${searchGrade}).`}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={onSearch}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-brand-accent text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                <span>{assignments.length === 0 ? "Load School Assignments" : "Refresh List"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
