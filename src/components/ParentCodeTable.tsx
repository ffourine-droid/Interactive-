import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, RotateCcw } from 'lucide-react';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  grade?: string;
  parent_code?: string;
}

interface Teacher {
  id: string;
  name: string;
  school_name: string;
}

interface ParentCodeTableProps {
  students: Student[];
  className: string;
  teacher: Teacher | null;
  onUpdate?: () => void;
}

export const ParentCodeTable: React.FC<ParentCodeTableProps> = ({ students: initialStudents, className, teacher, onUpdate }) => {
  const { showToast } = useToast();
  const [students, setStudents] = useState(initialStudents);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const assignmentAttempted = React.useRef(false);

  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  const handleResetPin = async (studentId: string) => {
    if (!teacher?.id) {
      showToast("Teacher information is missing.", "error");
      return;
    }
    
    if (!window.confirm("Are you sure you want to reset this student's parent access PIN? This will unlock the account and let the parent set a new PIN next time they visit.")) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('reset_parent_pin', {
        p_student_id: studentId,
        p_teacher_id: teacher.id
      });

      if (error) {
        throw error;
      }

      showToast("Parent security PIN successfully reset!", "success");
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error("Error resetting parent PIN:", err);
      showToast(err.message || "Failed to reset parent PIN", "error");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Copied!", "success");
  };

  const copyAllCodes = () => {
    const header = `*AziLearn Parent Portal Login - ${className}*\n\n`;
    const codes = students.map(s => `👤 ${s.name}\nGrade: ${s.grade || className}\nIndex No: ${s.parent_code || '----'}`).join('\n\n');
    const footer = `\n\nLogin at the AziLearn Parent Portal using the details above.`;
    
    navigator.clipboard.writeText(header + codes + footer);
    showToast("WhatsApp message copied!", "success");
  };

  if (students.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-0.5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted">Parent Access PINs</h3>
          <p className="text-[9px] text-brand-muted italic">Share these with parents for the portal</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={copyAllCodes}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-accent/10 rounded-full text-[9px] font-black uppercase tracking-widest text-brand-accent hover:bg-brand-accent hover:text-white transition-all"
          >
            <Share2 size={10} />
            Copy All for WhatsApp
          </button>
        </div>
      </div>
      
      <div className="bg-brand-bg rounded-3xl border border-brand-border divide-y divide-brand-border overflow-hidden">
        {students.map((student) => {
          const pin = student.parent_code || '----';
          return (
            <div key={student.id} className="flex items-center justify-between p-4 hover:bg-brand-surface transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-surface border border-brand-border rounded-lg flex items-center justify-center text-[10px] font-black text-brand-muted">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text">{student.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-brand-muted uppercase tracking-[0.15em]">Grade: {className.split(' ')[0]} {className.split(' ')[1]}</span>
                    <div className="w-1 h-1 bg-brand-border rounded-full" />
                    <span className="text-[9px] font-black text-brand-muted uppercase tracking-[0.15em]">Index No:</span>
                    <span className="text-[12px] font-black text-brand-accent tracking-[0.2em]">{pin}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleResetPin(student.id)}
                  title="Reset Parent security PIN"
                  className="p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95"
                >
                  <RotateCcw size={14} />
                </button>
                <button 
                  onClick={() => copyToClipboard(`Child: ${student.name}\nGrade: ${className}\nIndex Number: ${pin}`, student.id)}
                  className="p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-brand-accent transition-all active:scale-95"
                >
                  {copiedId === student.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
