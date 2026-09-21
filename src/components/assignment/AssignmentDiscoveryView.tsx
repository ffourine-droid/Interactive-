import React, { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  School, 
  User, 
  Calendar, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Loader2, 
  ArrowRight,
  HelpCircle,
  FileText,
  Bookmark,
  AlertCircle,
  GraduationCap
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
  const [activeTab, setActiveTab] = useState<'my_work' | 'search_all' | 'direct_code'>('my_work');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  
  // Direct find local states
  const [directSchool, setDirectSchool] = useState(searchSchool || '');
  const [directTitle, setDirectTitle] = useState('');
  const [directGrade, setDirectGrade] = useState(searchGrade || 'Grade 7');

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
                <span className="text-[11px] font-bold text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md border border-brand-border">
                  {searchGrade}
                </span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-brand-border/60">
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
              <span>Ready to search assignments for {searchSchool}</span>
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

      {/* ── TAB SELECTOR ── */}
      <div className="flex items-center gap-1 bg-brand-surface p-1 rounded-2xl border border-brand-border shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('my_work')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'my_work'
              ? 'bg-brand-accent text-white shadow-xs'
              : 'text-brand-muted hover:text-brand-text'
          }`}
        >
          <Bookmark size={14} />
          <span>My Assignments ({assignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search_all')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'search_all'
              ? 'bg-brand-accent text-white shadow-xs'
              : 'text-brand-muted hover:text-brand-text'
          }`}
        >
          <Search size={14} />
          <span>Find by Teacher / School</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('direct_code')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'direct_code'
              ? 'bg-brand-accent text-white shadow-xs'
              : 'text-brand-muted hover:text-brand-text'
          }`}
        >
          <School size={14} />
          <span>Direct Title Lookup</span>
        </button>
      </div>

      {/* ──────────────── TAB 1: MY ASSIGNMENTS ──────────────── */}
      {activeTab === 'my_work' && (
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Status pills */}
            <div className="flex items-center gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border">
              {(['all', 'todo', 'completed'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${
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
                  No assignments will load until you write your name, your teacher's name, and your school name above. This ensures only your searched school's assignments are loaded.
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
                  onSelect={onSelectAssignment}
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
                  {assignments.length === 0 ? "No assignments loaded yet" : "No assignments found"}
                </h4>
                <p className="text-xs text-brand-muted max-w-xs mx-auto mt-1 leading-relaxed">
                  {assignments.length === 0
                    ? `Click below to load assignments for ${searchSchool}.`
                    : `We couldn't find any assignments for ${searchSchool} (${searchGrade}). Check the spelling of teacher or school name.`}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onSearch}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-brand-accent text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  <span>{assignments.length === 0 ? "Load School Assignments" : "Search Again"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('search_all')}
                  className="px-4 py-2 rounded-xl bg-brand-bg border border-brand-border text-brand-text font-bold text-xs hover:bg-brand-surface transition-all"
                >
                  Advanced Search →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: ADVANCED SEARCH BY TEACHER / SCHOOL ──────────────── */}
      {activeTab === 'search_all' && (
        <div className="space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-black text-base text-brand-text">
                Find Teacher's Assignments
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Search assignments across any school or teacher in your grade.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Assignment Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                  Assignment Title
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <input
                    type="text"
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    placeholder="e.g. Fractions Quiz, Essay..."
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text"
                  />
                </div>
              </div>

              {/* Teacher Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                  Teacher Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <input
                    type="text"
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    placeholder="e.g. Mr. Otieno, Ms. Sarah..."
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text"
                  />
                </div>
              </div>

              {/* School Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                  School Name
                </label>
                <div className="relative">
                  <School className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <input
                    type="text"
                    value={searchSchool}
                    onChange={(e) => setSearchSchool(e.target.value)}
                    placeholder="e.g. Greenfield Academy..."
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text"
                  />
                </div>
              </div>

              {/* Grade */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                  Grade Level
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <select
                    value={searchGrade}
                    onChange={(e) => setSearchGrade(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text appearance-none"
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {!isProfileComplete && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>Please enter your name, teacher's name, and school name above before searching.</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!isProfileComplete) return;
                onSearch();
                setActiveTab('my_work');
              }}
              disabled={loading || !isProfileComplete}
              className="w-full py-3.5 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-wider text-xs shadow-md shadow-brand-accent/20 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              <span>Search School Assignments</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: DIRECT TITLE & SCHOOL LOOKUP ──────────────── */}
      {activeTab === 'direct_code' && (
        <div className="space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-black text-base text-brand-text">
                Direct School Assignment Lookup
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                If your teacher gave you a specific assignment title (e.g. for a school-wide test or broadcast), enter it below.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                  School Name *
                </label>
                <div className="relative">
                  <School className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <input
                    type="text"
                    value={directSchool}
                    onChange={(e) => setDirectSchool(e.target.value)}
                    placeholder="e.g. Greenfield Academy"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                  Exact Assignment Name *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <input
                    type="text"
                    value={directTitle}
                    onChange={(e) => setDirectTitle(e.target.value)}
                    placeholder="e.g. Term Two Mathematics Assessment"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                  Grade Level
                </label>
                <select
                  value={directGrade}
                  onChange={(e) => setDirectGrade(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-border focus:border-brand-accent outline-none text-xs font-semibold text-brand-text appearance-none"
                >
                  {GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {directFindError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold">
                  {directFindError}
                </div>
              )}

              {(!studentName.trim() || !searchTeacher.trim() || !directSchool.trim()) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Please write your name, teacher's name, and school before getting the assignment.</span>
                </div>
              )}

              <button
                type="button"
                disabled={directFindLoading || !directSchool.trim() || !directTitle.trim() || !studentName.trim() || !searchTeacher.trim()}
                onClick={() => {
                  if (onDirectSchoolFind) {
                    onDirectSchoolFind(directSchool, directTitle, directGrade);
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-wider text-xs shadow-md shadow-brand-accent/20 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {directFindLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Locating Assignment...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    <span>Find & Start Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
