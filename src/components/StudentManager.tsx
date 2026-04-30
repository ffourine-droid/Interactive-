import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Loader2,
  Hash,
  Search,
  ArrowRight,
  Sparkles,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface Student {
  id: string;
  name: string;
  parent_code: string;
  grade: string;
}

interface StudentManagerProps {
  classId: string;
  grade?: string;
  schoolName?: string;
  onUpdate?: () => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ classId, grade, schoolName, onUpdate }) => {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const assignmentAttempted = React.useRef(false);

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('id, name, parent_code, grade')
        .eq('class_id', classId)
        .order('parent_code', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      showToast("Error loading students", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !grade) return;

    try {
      setAdding(true);
      
      let parent_code = newStudentCode.trim();

      // Get school students to check for duplicates
      const { data: schoolStudents } = await supabase
        .from('students')
        .select(`
          name,
          parent_code,
          classes!inner (
            teachers!inner (
              school_name
            )
          )
        `)
        .eq('classes.teachers.school_name', schoolName)
        .eq('grade', grade);

      // Check if student with this name already exists in this school/grade
      const existingStudent = (schoolStudents || []).find(s => s.name.toLowerCase() === newStudentName.trim().toLowerCase());
      
      if (existingStudent) {
        parent_code = existingStudent.parent_code;
        showToast(`Student ${newStudentName} already exists with Index #${parent_code}. Re-using it.`, "info");
      } else if (!parent_code) {
        let nextIndex = 1;
        if (schoolStudents && schoolStudents.length > 0) {
          const indices = schoolStudents
            .map(s => parseInt(s.parent_code))
            .filter(n => !isNaN(n));
          if (indices.length > 0) {
            nextIndex = Math.max(...indices) + 1;
          }
        }
        
        parent_code = nextIndex.toString().padStart(4, '0');
      }

      const { error } = await supabase
        .from('students')
        .insert([{
          name: newStudentName.trim(),
          class_id: classId,
          grade: grade,
          parent_code: parent_code
        }]);

      if (error) throw error;

      showToast(`Added ${newStudentName} with Code ${parent_code}`, "success");
      setNewStudentName('');
      setNewStudentCode('');
      fetchStudents();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast("Failed to add student. Code might be taken.", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStudent = async (studentId: string) => {
    if (!editName.trim() || !editCode.trim()) return;
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          name: editName.trim(),
          parent_code: editCode.trim().padStart(4, '0')
        })
        .eq('id', studentId);

      if (error) throw error;
      showToast("Student updated", "success");
      setEditingId(null);
      fetchStudents();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast("Error updating student. Code might be taken.", "error");
    }
  };

  const handleDelete = async (studentId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}? This will delete all their submissions.`)) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      showToast("Student removed", "success");
      fetchStudents();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast("Error deleting student", "error");
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.parent_code?.includes(searchQuery)
  );

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNames.trim() || !grade || !schoolName) return;

    const lines = bulkNames
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (lines.length === 0) return;

    try {
      setAdding(true);
      
      const { data: schoolStudents, error: fetchError } = await supabase
        .from('students')
        .select(`
          name,
          parent_code,
          classes!inner (
            teachers!inner (
              school_name
            )
          )
        `)
        .eq('classes.teachers.school_name', schoolName)
        .eq('grade', grade);

      if (fetchError) throw fetchError;

      const existingCodes = new Set(
        (schoolStudents || [])
          .map(s => parseInt(s.parent_code))
          .filter(n => !isNaN(n))
      );

      let currentCode = 1;
      const newStudents = [];

      for (const line of lines) {
        let name = line;
        let parent_code = '';

        if (line.includes(',')) {
          const parts = line.split(',');
          name = parts[0].trim();
          parent_code = parts[1].trim().replace(/\D/g, '').padStart(4, '0');
        }

        // Check if student with this name already exists in this school/grade
        const existingStudent = (schoolStudents || []).find(s => s.name.toLowerCase() === name.toLowerCase());
        
        if (existingStudent) {
          parent_code = existingStudent.parent_code;
        } else if (!parent_code || existingCodes.has(parseInt(parent_code))) {
          while (existingCodes.has(currentCode)) {
            currentCode++;
          }
          parent_code = currentCode.toString().padStart(4, '0');
          existingCodes.add(parseInt(parent_code));
        } else {
          existingCodes.add(parseInt(parent_code));
        }
        
        newStudents.push({
          name,
          class_id: classId,
          grade: grade,
          parent_code: parent_code
        });
      }

      const { error } = await supabase
        .from('students')
        .insert(newStudents);

      if (error) throw error;

      showToast(`Successfully added ${newStudents.length} students`, "success");
      setBulkNames('');
      setShowBulkAdd(false);
      fetchStudents();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast("Failed to add students in bulk", "error");
    } finally {
      setAdding(false);
    }
  };
  const handleAutoAssign = async (silent = false) => {
    if (!grade || !schoolName || students.length === 0) return;
    
    const studentsWithoutCode = students.filter(s => !s.parent_code || s.parent_code === '----');
    if (studentsWithoutCode.length === 0) {
      if (!silent) showToast("All students already have index numbers", "info");
      return;
    }

    try {
      setAutoAssigning(true);
      
      const { data: schoolStudents, error: schoolFetchError } = await supabase
        .from('students')
        .select(`
          parent_code,
          classes!inner (
            teachers!inner (
              school_name
            )
          )
        `)
        .eq('classes.teachers.school_name', schoolName)
        .eq('grade', grade);

      if (schoolFetchError) throw schoolFetchError;

      const existingCodes = new Set(
        (schoolStudents || [])
          .map(s => parseInt(s.parent_code))
          .filter(n => !isNaN(n))
      );

      let currentCode = 1;
      const updates = [];

      for (const student of studentsWithoutCode) {
        while (existingCodes.has(currentCode)) {
          currentCode++;
        }
        const newCode = currentCode.toString().padStart(4, '0');
        existingCodes.add(currentCode);
        
        updates.push(
          supabase
            .from('students')
            .update({ parent_code: newCode })
            .eq('id', student.id)
        );
      }

      await Promise.all(updates);
      if (!silent) showToast(`Automatically assigned ${updates.length} index numbers!`, "success");
      fetchStudents();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error(err);
      if (!silent) showToast("Error auto-assigning codes", "error");
    } finally {
      setAutoAssigning(false);
    }
  };

  // Removed automatic assignment trigger to respect manual control preference

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight">Class Roster</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Total: {students.length} students</p>
        </div>
        
        <button 
          onClick={handleAutoAssign}
          disabled={autoAssigning || students.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-accent/10 border border-brand-accent/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-accent hover:bg-brand-accent hover:text-white transition-all disabled:opacity-50"
        >
          {autoAssigning ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
          {autoAssigning ? 'Assigning...' : 'Auto-Assign Codes'}
        </button>
      </div>

      {/* Bulk Add Section */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-sm">
        <button 
          onClick={() => setShowBulkAdd(!showBulkAdd)}
          className="w-full flex items-center justify-between p-6 hover:bg-brand-bg/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-accent/10 rounded-xl text-brand-accent">
              <ClipboardList size={20} />
            </div>
            <div className="text-left">
              <h4 className="font-black text-sm tracking-tight">Bulk Add Students</h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Add "Name, Index" (e.g. John Doe, 0001) - One per line</p>
            </div>
          </div>
          {showBulkAdd ? <ChevronUp size={20} className="text-brand-muted" /> : <ChevronDown size={20} className="text-brand-muted" />}
        </button>
        
        <AnimatePresence>
          {showBulkAdd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6"
            >
              <form onSubmit={handleBulkAdd} className="space-y-4">
                <textarea 
                  placeholder="Enter students (one per line)...&#10;John Kamau, 0001&#10;Sarah Wambui, 0002&#10;James Ochieng (auto-indexes)"
                  rows={5}
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 outline-none focus:border-brand-accent/50 transition-all font-bold text-sm resize-none"
                  value={bulkNames}
                  onChange={(e) => setBulkNames(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={adding || !bulkNames.trim()}
                  className="w-full bg-brand-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Add {bulkNames.split('\n').filter(n => n.trim()).length || ''} Students with Codes
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search and Add Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={18} />
          <input 
            type="text"
            placeholder="Search name or index..."
            className="w-full bg-brand-bg border border-brand-border rounded-2xl py-3 pl-12 pr-4 font-bold text-sm outline-none focus:border-brand-accent/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <form onSubmit={handleAddStudent} className="flex gap-2">
          <input 
            type="text"
            placeholder="Name..."
            className="flex-[2] bg-brand-bg border border-brand-border rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:border-brand-accent/50 transition-all"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
          />
          <input 
            type="text"
            placeholder="Index (Optional)"
            maxLength={4}
            className="flex-1 bg-brand-bg border border-brand-border rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:border-brand-accent/50 transition-all text-center"
            value={newStudentCode}
            onChange={(e) => setNewStudentCode(e.target.value.replace(/\D/g, ''))}
          />
          <button 
            type="submit"
            disabled={adding || !newStudentName.trim()}
            className="bg-brand-accent text-white p-3 rounded-2xl shadow-lg shadow-brand-accent/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {adding ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-brand-accent/20" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Fetching Student List...</p>
        </div>
      ) : (
        <div className="bg-brand-bg/50 rounded-3xl border border-brand-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-surface border-b border-brand-border font-black text-[9px] uppercase tracking-widest text-brand-muted">
                <th className="px-6 py-4 w-16">Index</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-brand-muted font-bold">
                    No students found matching "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-brand-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === student.id ? (
                        <input 
                          type="text"
                          value={editCode}
                          maxLength={4}
                          onChange={(e) => setEditCode(e.target.value.replace(/\D/g, ''))}
                          className="w-16 bg-brand-bg border border-brand-accent rounded-lg px-2 py-1 font-black text-xs text-brand-accent text-center outline-none"
                        />
                      ) : (
                        <span className="font-black text-brand-accent font-mono">{student.parent_code}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === student.id ? (
                        <input 
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-brand-bg border border-brand-accent rounded-lg px-3 py-1 font-bold text-sm outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-bold text-sm">{student.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {editingId === student.id ? (
                          <>
                            <button 
                              onClick={() => handleUpdateStudent(student.id)}
                              className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                setEditingId(student.id);
                                setEditName(student.name);
                                setEditCode(student.parent_code);
                              }}
                              className="p-2 text-brand-muted hover:text-brand-accent transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(student.id, student.name)}
                              className="p-2 text-brand-muted hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Helpful Hint */}
      <div className="p-4 bg-[#FF6B2C]/5 rounded-2xl border border-[#FF6B2C]/10 flex items-start gap-4">
        <Hash className="text-[#FF6B2C] shrink-0" size={18} />
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF6B2C] mb-1">About Index Numbers</h4>
          <p className="text-[11px] font-medium text-brand-muted leading-relaxed">
            Students use these 4-digit codes to access their results. Index numbers are assigned automatically per grade level and school.
          </p>
        </div>
      </div>
    </div>
  );
};
