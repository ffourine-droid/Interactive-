import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Hash,
  Search,
  Loader2,
  Info
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let fetchedStudents: Student[] = [];
      
      const teacherStr = localStorage.getItem('azilearn_teacher');
      if (teacherStr) {
        const teacher = JSON.parse(teacherStr);
        const { data: rpcData, error: rpcError } = await supabase.rpc('teacher_get_class_students', {
          p_teacher_id: teacher.id,
          p_class_id: classId
        });
        
        if (!rpcError && rpcData) {
          if (Array.isArray(rpcData)) {
            fetchedStudents = rpcData;
          } else if (typeof rpcData === 'object') {
            const innerArray = Object.values(rpcData).find(v => Array.isArray(v));
            if (innerArray) {
              fetchedStudents = innerArray as any[];
            } else if ((rpcData as any).id) {
              fetchedStudents = [rpcData];
            }
          }
        }
      }

      const sorted = [...fetchedStudents].sort((a, b) => {
        return (a.parent_code || '').localeCompare(b.parent_code || '');
      });

      setStudents(sorted);
    } catch (err: any) {
      showToast("Error loading student roster", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const q = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(q) ||
      (student.parent_code || '').includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Users size={18} className="text-brand-accent" />
            Class Roster
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
            Total Enrolled: {students.length} students
          </p>
        </div>
        
        <div className="text-[9px] font-bold text-brand-muted bg-brand-surface border px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center gap-1.5">
          <Info size={12} className="text-brand-muted" />
          Roster is read-only for educators
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={18} />
        <input 
          type="text"
          placeholder="Search students by name or index code..."
          className="w-full bg-brand-bg border border-brand-border rounded-2xl py-3 pl-12 pr-4 font-bold text-sm outline-none focus:border-brand-accent/50 transition-all text-brand-text placeholder-brand-muted/40"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
                <th className="px-6 py-4 w-24">Index</th>
                <th className="px-6 py-4">Full Student Name</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border font-medium text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-brand-muted font-bold uppercase tracking-wider">
                    {searchQuery ? `No students matched "${searchQuery}"` : "Roster is currently empty."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-brand-surface/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-brand-accent font-mono text-sm">
                        {student.parent_code || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-brand-text">{student.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500">
                        Registered
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Helpful Hint */}
      <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl flex items-start gap-4">
        <Hash className="text-brand-accent shrink-0" size={18} />
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text mb-1">Index Number Authentication</h4>
          <p className="text-[11px] font-medium text-brand-muted leading-relaxed">
            Students use their unique registered 4-digit code to access and attempt assignments. If you notice a name or code missing, please request your school administrator to update the official register.
          </p>
        </div>
      </div>
    </div>
  );
};
