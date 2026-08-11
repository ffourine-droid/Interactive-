import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

export interface Student {
  student_id: string;
  name: string;
  grade: string;
  school_name?: string;
  class_id?: string | null;
  index_number?: string;
  total_xp?: number;
}

interface StudentContextType {
  currentStudent: Student | null;
  loading: boolean;
  isIdentityModalOpen: boolean;
  setIsIdentityModalOpen: (open: boolean) => void;
  identifyStudent: (name: string, grade: string) => Promise<Student>;
  logoutStudent: () => void;
  refreshStudent: () => Promise<void>;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('azilearn_device_id');
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'd-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem('azilearn_device_id', deviceId);
  }
  return deviceId;
}

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState<boolean>(false);
  const { showToast } = useToast();

  const loadStudent = async () => {
    // Check cached student profile in Local Storage
    const cached = localStorage.getItem('azilearn_student');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.id || parsed.student_id)) {
          const studentObj: Student = {
            student_id: parsed.id || parsed.student_id,
            name: parsed.name,
            grade: parsed.grade || 'Grade 7',
            class_id: parsed.class_id || null,
            school_name: parsed.school_name || '',
            index_number: parsed.index_number || '',
            total_xp: parsed.total_xp || 0
          };
          setCurrentStudent(studentObj);
        } else {
          setIsIdentityModalOpen(true);
        }
      } catch (e) {
        setIsIdentityModalOpen(true);
      }
    } else {
      setIsIdentityModalOpen(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStudent();
  }, []);

  const identifyStudent = useCallback(async (name: string, grade: string, classId?: string | null) => {
    // Rely on explicit roster lookup or guest registration elsewhere
    let deviceId = localStorage.getItem('azilearn_device_id');
    if (!deviceId) {
      deviceId = 'dev-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('azilearn_device_id', deviceId);
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('student_self_register', {
      p_name: name.trim(),
      p_grade: grade,
      p_device_id: deviceId,
      p_class_id: classId || null
    });

    if (rpcErr) throw rpcErr;

    const studentId = rpcRes?.id || rpcRes?.student_id;
    if (!studentId) {
      throw new Error('Student record could not be resolved.');
    }

    const studentObj: Student = {
      student_id: String(studentId),
      name: rpcRes.name || name.trim(),
      grade: rpcRes.grade || grade,
      school_name: rpcRes.school_name || '',
      class_id: rpcRes.class_id || classId || null,
      index_number: rpcRes.index_number || '',
      total_xp: rpcRes.total_xp || 0
    };

    setCurrentStudent(studentObj);
    localStorage.setItem('azilearn_student', JSON.stringify({
      id: studentObj.student_id,
      name: studentObj.name,
      grade: studentObj.grade,
      class_id: studentObj.class_id,
      school_name: studentObj.school_name
    }));
    setIsIdentityModalOpen(false);
    return studentObj;
  }, []);

  const logoutStudent = useCallback(() => {
    localStorage.removeItem('azilearn_student');
    localStorage.removeItem('azilearn_student_profile');
    localStorage.removeItem('azilearn_arena_player');
    localStorage.removeItem('azilearn_device_id');
    sessionStorage.removeItem('azilearn_student_name');
    setCurrentStudent(null);
    setIsIdentityModalOpen(true);
    showToast('Logged out student portal 👋', 'success');
  }, [showToast]);

  const refreshStudent = useCallback(async () => {
    if (!currentStudent?.student_id) return;
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', currentStudent.student_id)
        .maybeSingle();

      if (!error && data) {
        setCurrentStudent({
          student_id: data.id,
          name: data.name,
          grade: data.grade,
          school_name: data.school_name,
          class_id: data.class_id,
          index_number: data.index_number,
          total_xp: data.total_xp
        });
      }
    } catch {}
  }, [currentStudent?.student_id]);

  return (
    <StudentContext.Provider value={{
      currentStudent,
      loading,
      isIdentityModalOpen,
      setIsIdentityModalOpen,
      identifyStudent,
      logoutStudent,
      refreshStudent
    }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
