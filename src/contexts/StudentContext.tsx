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
    const deviceId = getOrCreateDeviceId();
    
    try {
      // 1. Try to fetch using get_student_by_device RPC
      const { data, error } = await supabase.rpc('get_student_by_device', {
        p_device_id: deviceId
      });

      if (!error && data && data.success) {
        const studentObj: Student = {
          student_id: data.student_id,
          name: data.name,
          grade: data.grade,
          school_name: data.school_name,
          class_id: data.class_id,
          index_number: data.index_number,
          total_xp: data.total_xp
        };
        setCurrentStudent(studentObj);
        localStorage.setItem('azilearn_student', JSON.stringify({
          id: studentObj.student_id,
          name: studentObj.name,
          grade: studentObj.grade,
          class_id: studentObj.class_id,
          school_name: studentObj.school_name
        }));
        setLoading(false);
        return;
      }
    } catch (rpcErr) {
      console.warn("RPC get_student_by_device failed or not found, trying query fallback...", rpcErr);
    }

    // 2. Query fallback: Try direct select on students table using device_id
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (!error && data) {
        const studentObj: Student = {
          student_id: data.id,
          name: data.name,
          grade: data.grade || 'Grade 7',
          school_name: data.school_name || '',
          class_id: data.class_id,
          index_number: data.index_number || '',
          total_xp: data.total_xp || 0
        };
        setCurrentStudent(studentObj);
        localStorage.setItem('azilearn_student', JSON.stringify({
          id: studentObj.student_id,
          name: studentObj.name,
          grade: studentObj.grade,
          class_id: studentObj.class_id,
          school_name: studentObj.school_name
        }));
        setLoading(false);
        return;
      }
    } catch (selectErr) {
      console.warn("Direct query of device_id failed, trying local storage fallback...", selectErr);
    }

    // 3. Local Storage fallback for existing guest profile
    const cached = localStorage.getItem('azilearn_student');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) {
          const studentObj: Student = {
            student_id: parsed.id,
            name: parsed.name,
            grade: parsed.grade || 'Grade 7',
            class_id: parsed.class_id || null,
            school_name: parsed.school_name || '',
            index_number: parsed.index_number || '',
            total_xp: parsed.total_xp || 0
          };
          setCurrentStudent(studentObj);
          
          // Try to update their device_id in Supabase background to link the device
          try {
            await supabase
              .from('students')
              .update({ device_id: deviceId })
              .eq('id', parsed.id);
          } catch (updateErr) {
            console.warn("Could not bind device_id in background:", updateErr);
          }
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

  const identifyStudent = useCallback(async (name: string, grade: string) => {
    const deviceId = getOrCreateDeviceId();
    
    // Check if student with name + grade already exists
    const { data: existing, error: fetchErr } = await supabase
      .from('students')
      .select('*')
      .ilike('name', name.trim())
      .eq('grade', grade);

    let studentRecord: any = null;

    if (!fetchErr && existing && existing.length > 0) {
      // Update existing student record with device_id
      studentRecord = existing[0];
      try {
        const { data: updated, error: updateErr } = await supabase
          .from('students')
          .update({ device_id: deviceId })
          .eq('id', studentRecord.id)
          .select()
          .single();
        if (!updateErr && updated) {
          studentRecord = updated;
        }
      } catch (e) {
        console.warn("Error updating existing student device_id:", e);
      }
    } else {
      // Insert new student with device_id
      try {
        const { data: created, error: createErr } = await supabase
          .from('students')
          .insert({
            name: name.trim(),
            grade: grade,
            device_id: deviceId,
            parent_code: null
          })
          .select()
          .single();

        if (createErr || !created) {
          // fallback insertion without device_id if column missing or RLS error
          const { data: createdFallback, error: fallbackErr } = await supabase
            .from('students')
            .insert({
              name: name.trim(),
              grade: grade,
              parent_code: null
            })
            .select()
            .single();

          if (fallbackErr) throw fallbackErr;
          studentRecord = createdFallback;
        } else {
          studentRecord = created;
        }
      } catch (insertErr: any) {
        throw new Error(insertErr.message || 'Failed to register student.');
      }
    }

    if (!studentRecord) {
      throw new Error('Student record could not be resolved.');
    }

    const studentObj: Student = {
      student_id: studentRecord.id,
      name: studentRecord.name,
      grade: studentRecord.grade || grade,
      school_name: studentRecord.school_name || '',
      class_id: studentRecord.class_id,
      index_number: studentRecord.index_number || '',
      total_xp: studentRecord.total_xp || 0
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
    sessionStorage.removeItem('azilearn_student_name');
    setCurrentStudent(null);
    setIsIdentityModalOpen(true);
    showToast('Logged out student portal 👋', 'success');
  }, [showToast]);

  const refreshStudent = useCallback(async () => {
    const deviceId = getOrCreateDeviceId();
    try {
      const { data } = await supabase.rpc('get_student_by_device', { p_device_id: deviceId });
      if (data && data.success) {
        setCurrentStudent({
          student_id: data.student_id,
          name: data.name,
          grade: data.grade,
          school_name: data.school_name,
          class_id: data.class_id,
          index_number: data.index_number,
          total_xp: data.total_xp
        });
      }
    } catch {}
  }, []);

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
