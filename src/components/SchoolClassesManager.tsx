import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  GraduationCap, 
  Loader2, 
  Search, 
  AlertCircle, 
  Check, 
  Sparkles,
  UserPlus,
  FileSpreadsheet,
  HelpCircle,
  Hash,
  School
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface ClassItem {
  id: string;
  name: string;
  grade: string;
  school_id: string;
  created_at?: string;
  student_count?: number;
}

interface StudentItem {
  id: string;
  name: string;
  parent_code: string;
  grade: string;
  class_id: string;
  school_name?: string;
}

interface SchoolClassesManagerProps {
  schoolId: string;
}

export const SchoolClassesManager: React.FC<SchoolClassesManagerProps> = ({ schoolId }) => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Class creation state
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Grade 7');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // Student creation state
  const [singleStudentName, setSingleStudentName] = useState('');
  const [singleStudentIndex, setSingleStudentIndex] = useState('');
  const [isAddingSingleStudent, setIsAddingSingleStudent] = useState(false);

  // Bulk student state
  const [bulkStudentsInput, setBulkStudentsInput] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkAddResults, setBulkAddResults] = useState<{ added: number; failed: number } | null>(null);

  // Filter & Search
  const [classSearch, setClassSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const gradesList = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
  ];

  useEffect(() => {
    if (schoolId) {
      fetchClasses();
    }
  }, [schoolId]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_school_classes', {
        p_school_id: schoolId
      });

      if (error) throw error;
      
      const classesList = (data && data.success && data.classes) ? data.classes : [];
      const mappedClasses = classesList.map((c: any) => ({
        ...c,
        id: c.class_id,
        school_id: schoolId
      }));
      setClasses(mappedClasses);
      
      // Auto-select first class if none is selected
      if (mappedClasses && mappedClasses.length > 0) {
        const stillValid = selectedClassId && mappedClasses.some(c => c.id === selectedClassId);
        const targetClassId = stillValid ? selectedClassId : mappedClasses[0].id;
        setSelectedClassId(targetClassId);
        fetchStudents(targetClassId);
      } else {
        setSelectedClassId('');
        setStudents([]);
      }
    } catch (err: any) {
      console.error("Error fetching classes:", err);
      showToast(err.message || "Failed to load classes", "error");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStudents = async (classId: string) => {
    if (!classId) return;
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_class_roster', {
        p_class_id: classId
      });

      if (error) throw error;

      const studentsList = (data && data.success && data.students) ? data.students : [];
      const mappedStudents = studentsList.map((s: any) => ({
        ...s,
        id: s.student_id || s.id,
        parent_code: s.parent_code || s.index_number
      }));
      setStudents(mappedStudents);
    } catch (err: any) {
      console.error("Error fetching students:", err);
      showToast(err.message || "Failed to load student roster", "error");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setBulkAddResults(null);
    fetchStudents(classId);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassGrade) {
      showToast("Class name and grade are required", "error");
      return;
    }

    setIsCreatingClass(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_class', {
        p_school_id: schoolId,
        p_name: newClassName.trim(),
        p_grade: newClassGrade
      });

      if (error) {
        throw error;
      } else if (data && data.success === false) {
        showToast(data.message || "Failed to create class", "error");
      } else {
        showToast(`Class "${newClassName.trim()}" created successfully!`, "success");
        setNewClassName('');
        await fetchClasses();
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred", "error");
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete the class "${className}"? This will delete all student records in this class and cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      showToast(`Class "${className}" deleted`, "info");
      await fetchClasses();
    } catch (err: any) {
      showToast(err.message || "Failed to delete class", "error");
    }
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      showToast("Please select or create a class first", "error");
      return;
    }
    if (!singleStudentName.trim() || !singleStudentIndex.trim()) {
      showToast("Student name and index number are required", "error");
      return;
    }

    setIsAddingSingleStudent(true);
    try {
      const formattedIndex = singleStudentIndex.trim().replace(/\D/g, '').padStart(4, '0');
      if (formattedIndex.length !== 4) {
        showToast("Index number must be a number up to 4 digits", "error");
        setIsAddingSingleStudent(false);
        return;
      }

      const { data, error } = await supabase.rpc('admin_add_student', {
        p_class_id: selectedClassId,
        p_name: singleStudentName.trim(),
        p_index_number: formattedIndex
      });

      if (error) {
        throw error;
      } else if (data && data.success === false) {
        showToast(data.message || "Failed to add student. Index code might be taken.", "error");
      } else {
        showToast(`Student "${singleStudentName.trim()}" added successfully!`, "success");
        setSingleStudentName('');
        setSingleStudentIndex('');
        await fetchStudents(selectedClassId);
        await fetchClasses();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add student. Index code may be in use.", "error");
    } finally {
      setIsAddingSingleStudent(false);
    }
  };

  const handleBulkAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      showToast("Please select a class first", "error");
      return;
    }
    if (!bulkStudentsInput.trim()) {
      showToast("Please enter student register data first", "error");
      return;
    }

    setIsBulkAdding(true);
    setBulkAddResults(null);

    const lines = bulkStudentsInput.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedStudents: { name: string; index_number: string }[] = [];

    for (const line of lines) {
      let name = '';
      let index = '';
      
      if (line.includes(',')) {
        const parts = line.split(',');
        name = parts[0].trim();
        index = parts[1].trim().replace(/\D/g, '').padStart(4, '0');
      } else if (line.includes('\t')) {
        const parts = line.split('\t');
        name = parts[0].trim();
        index = parts[1].trim().replace(/\D/g, '').padStart(4, '0');
      } else {
        // Look for numbers at the end of the line
        const match = line.match(/(.*?)\s+(\d+)$/);
        if (match) {
          name = match[1].trim();
          index = match[2].trim().replace(/\D/g, '').padStart(4, '0');
        } else {
          name = line;
          index = '';
        }
      }
      
      if (name && index) {
        parsedStudents.push({ name, index_number: index });
      }
    }

    if (parsedStudents.length === 0) {
      showToast("No valid student records found. Format must include Name and a 4-digit Index code (e.g. John Doe, 0001)", "error");
      setIsBulkAdding(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_bulk_add_students', {
        p_class_id: selectedClassId,
        p_students: parsedStudents
      });

      if (error) {
        throw error;
      } else if (data && data.success === false) {
        showToast(data.message || "Bulk import failed", "error");
      } else {
        const result = data as any;
        showToast(`Processed bulk import! Added: ${result.added}, Failed: ${result.failed}`, result.failed > 0 ? "info" : "success");
        setBulkAddResults({ added: result.added, failed: result.failed });
        if (result.added > 0) {
          setBulkStudentsInput('');
          await fetchStudents(selectedClassId);
          await fetchClasses();
        }
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred during import", "error");
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      showToast(`Removed student ${studentName}`, "info");
      await fetchStudents(selectedClassId);
      await fetchClasses();
    } catch (err: any) {
      showToast(err.message || "Failed to remove student", "error");
    }
  };

  // Filtered lists
  const filteredClasses = classes.filter(c => {
    const query = classSearch.toLowerCase();
    return c.name.toLowerCase().includes(query) || c.grade.toLowerCase().includes(query);
  });

  const filteredStudents = students.filter(s => {
    const query = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(query) || (s.parent_code || '').includes(query);
  });

  const currentClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: Classes List & Create Class */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Create Class Card */}
        <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5">
            <Plus size={16} className="text-brand-accent animate-pulse" />
            Create Class
          </h2>
          
          <form onSubmit={handleCreateClass} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted px-1">Class Name</label>
              <input 
                type="text"
                placeholder="e.g. 7 West, 11 Science"
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold text-xs outline-none focus:border-brand-accent/50 text-brand-text transition-all"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-brand-muted px-1">Grade Level</label>
              <select 
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold text-xs outline-none focus:border-brand-accent/50 text-brand-text appearance-none"
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value)}
                required
              >
                {gradesList.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              disabled={isCreatingClass || !newClassName.trim()}
              className="w-full py-3 bg-brand-accent text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand-accent/10 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isCreatingClass ? <Loader2 className="animate-spin" size={12} /> : null}
              Create New Class
            </button>
          </form>
        </div>

        {/* Classes Explorer Card */}
        <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5">
              <School size={16} className="text-brand-accent" />
              Classes ({classes.length})
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted/50" size={14} />
            <input 
              type="text"
              placeholder="Filter classes..."
              className="w-full bg-brand-bg border border-brand-border rounded-xl py-2 pl-9 pr-3 font-bold text-xs outline-none focus:border-brand-accent/30 text-brand-text placeholder-brand-muted/40"
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
            />
          </div>

          {loadingClasses ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-brand-accent" size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Fetching Classes...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="py-8 text-center text-brand-muted font-bold text-xs border border-dashed border-brand-border rounded-2xl">
              No classes match search
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-brand-border">
              {filteredClasses.map((c) => {
                const isSelected = c.id === selectedClassId;
                return (
                  <div 
                    key={c.id}
                    onClick={() => handleClassSelect(c.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-brand-accent/5 border-brand-accent/30 text-brand-accent shadow-sm' 
                        : 'bg-brand-bg border-brand-border hover:border-brand-accent/20 text-brand-text'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-black text-xs truncate">{c.name}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-brand-accent/70' : 'text-brand-muted'}`}>
                        {c.grade} — {c.student_count ?? 0} students
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(c.id, c.name);
                      }}
                      className="p-1.5 text-brand-muted hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Selected Class Roster & Student Input */}
      <div className="lg:col-span-8 space-y-6">
        
        {currentClass ? (
          <div className="space-y-6">
            
            {/* Header / Meta */}
            <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent bg-brand-accent/5 px-2.5 py-1 rounded-full border border-brand-accent/15">
                  {currentClass.grade}
                </span>
                <h1 className="text-xl font-black text-brand-text mt-2 flex items-center gap-2">
                  Class Roster: <span className="text-brand-accent">{currentClass.name}</span>
                </h1>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-wider mt-1.5">
                  Total Enrolled: <span className="text-brand-text">{students.length} students</span>
                </p>
              </div>

              <div className="text-[10px] font-black text-brand-muted bg-brand-bg border px-3 py-2 rounded-xl uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-500" />
                Durable register sync
              </div>
            </div>

            {/* Student Rosters & Add options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Add Students Form Panel */}
              <div className="space-y-6">
                
                {/* Single Student Add */}
                <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 shadow-xl space-y-4">
                  <h2 className="text-xs font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5">
                    <UserPlus size={15} className="text-brand-accent" />
                    Add Single Student
                  </h2>
                  
                  <form onSubmit={handleAddSingleStudent} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted px-1">Full Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. John Doe"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brand-accent/50 text-brand-text transition-all"
                        value={singleStudentName}
                        onChange={(e) => setSingleStudentName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted px-1">Index Code (Official Register #)</label>
                      <div className="relative">
                        <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted/40" />
                        <input 
                          type="text"
                          placeholder="e.g. 0021"
                          maxLength={4}
                          className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 pl-8 pr-3 font-bold text-xs outline-none focus:border-brand-accent/50 text-brand-text transition-all"
                          value={singleStudentIndex}
                          onChange={(e) => setSingleStudentIndex(e.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isAddingSingleStudent || !singleStudentName.trim() || !singleStudentIndex.trim()}
                      className="w-full py-2.5 bg-brand-accent text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand-accent/10 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {isAddingSingleStudent ? <Loader2 className="animate-spin" size={12} /> : null}
                      Add Student to Register
                    </button>
                  </form>
                </div>

                {/* Bulk Student Upload */}
                <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 shadow-xl space-y-4">
                  <h2 className="text-xs font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5">
                    <FileSpreadsheet size={15} className="text-indigo-500 animate-pulse" />
                    Bulk Register Import
                  </h2>
                  
                  <form onSubmit={handleBulkAddStudents} className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-brand-muted">Student Name, Index Number</label>
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          CSV Format
                        </span>
                      </div>
                      <textarea 
                        rows={4}
                        placeholder="John Doe, 0001&#10;Jane Smith, 0002&#10;Mary Wambui, 0003"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 font-bold text-xs outline-none focus:border-brand-accent/50 text-brand-text placeholder-brand-muted/30 resize-none font-mono"
                        value={bulkStudentsInput}
                        onChange={(e) => setBulkStudentsInput(e.target.value)}
                        required
                      />
                      <p className="text-[8.5px] text-brand-muted/70 italic px-1">
                        Use one student per line. Provide their registered index code to lock parent portals.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      disabled={isBulkAdding || !bulkStudentsInput.trim()}
                      className="w-full py-2.5 bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-indigo-500/10 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {isBulkAdding ? <Loader2 className="animate-spin" size={12} /> : null}
                      Import Roster List
                    </button>
                  </form>

                  {bulkAddResults && (
                    <div className="p-3.5 bg-brand-bg border border-brand-border rounded-2xl space-y-1 text-[11px] font-bold">
                      <p className="text-brand-text uppercase tracking-wider text-[9px] font-black">Import complete:</p>
                      <p className="text-emerald-500 flex items-center gap-1.5">
                        <Check size={12} /> {bulkAddResults.added} students added successfully
                      </p>
                      {bulkAddResults.failed > 0 && (
                        <p className="text-red-500 flex items-center gap-1.5">
                          <AlertCircle size={12} /> {bulkAddResults.failed} records skipped (duplicate index code)
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Roster Display Panel */}
              <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 shadow-xl space-y-4 flex flex-col h-[550px]">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h2 className="text-xs font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={15} className="text-brand-accent" />
                    Enrolled Students ({students.length})
                  </h2>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted/50" size={14} />
                  <input 
                    type="text"
                    placeholder="Search students..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-2 pl-9 pr-3 font-bold text-xs outline-none focus:border-brand-accent/30 text-brand-text placeholder-brand-muted/40"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                {loadingStudents ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-brand-accent" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Fetching students...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-brand-muted border border-dashed border-brand-border rounded-2xl">
                    <Users size={32} className="opacity-10 mb-2 text-brand-accent" />
                    <p className="font-bold text-xs uppercase tracking-wider">Empty Roster</p>
                    <p className="text-[10px] text-brand-muted/70 max-w-[180px] mt-1">
                      No students registered. Use single or bulk import options.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-brand-border">
                    {filteredStudents.map((student) => (
                      <div 
                        key={student.id}
                        className="p-3 bg-brand-bg border border-brand-border rounded-xl flex items-center justify-between group hover:border-brand-accent/30 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 text-[10px] font-black text-brand-accent bg-brand-accent/5 px-2 py-1 rounded border border-brand-accent/10 font-mono">
                            {student.parent_code || '----'}
                          </span>
                          <span className="text-xs font-bold text-brand-text truncate">
                            {student.name}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="p-1.5 text-brand-muted hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-brand-bg border border-brand-border rounded-xl text-[10px] font-semibold text-brand-muted flex items-start gap-2">
                  <HelpCircle size={14} className="shrink-0 text-brand-accent" />
                  <p className="leading-relaxed">
                    Students use their unique 4-digit code to access homework assignments.
                  </p>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-12 text-center text-brand-muted space-y-4">
            <School size={48} className="mx-auto opacity-10 text-brand-accent" />
            <div className="space-y-1">
              <p className="font-bold text-brand-text text-sm uppercase tracking-wider">No Classes Configured</p>
              <p className="text-xs max-w-sm mx-auto">
                Create your first class in the left panel to begin enrolling students.
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
