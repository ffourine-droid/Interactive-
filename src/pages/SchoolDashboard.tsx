import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, 
  LogOut, 
  Users, 
  Radio, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  BookOpen, 
  GraduationCap, 
  ChevronDown,
  LayoutDashboard,
  Type,
  Image as ImageIcon,
  Check,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import SchoolTeachersList from '../components/SchoolTeachersList';

interface SchoolDashboardProps {
  schoolName: string;
  onLogout: () => void;
}

interface Teacher {
  id: string;
  name: string;
  email?: string;
  classes?: { id: string; name: string; grade: string }[];
}

interface BroadcastAssignment {
  id: string;
  title: string;
  due_date: string;
  share_code: string;
  created_at: string;
}

interface GradeBlock {
  id: string;
  grade: string;
  subject: string;
  questions: any[];
  totalMarks: number;
}

export const SchoolDashboard: React.FC<SchoolDashboardProps> = ({ schoolName, onLogout }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string>('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastAssignment[]>([]);
  
  // Navigation & Creation states
  const [activeTab, setActiveTab] = useState<'teachers' | 'broadcasts'>('teachers');
  const [creationStep, setCreationStep] = useState<null | 'details' | 'grades' | 'review' | 'success'>(null);
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [editingGradeBlockId, setEditingGradeBlockId] = useState<string | null>(null);

  // Broadcast creation form state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastDueDate, setBroadcastDueDate] = useState('');
  const [gradeBlocks, setGradeBlocks] = useState<GradeBlock[]>([]);
  const [publishedCodes, setPublishedCodes] = useState<{ grade: string; subject?: string; code: string; teacherName?: string | null; hasWarning?: boolean }[]>([]);

  // Individual Grade block builder state
  const [blockGrade, setBlockGrade] = useState('');
  const [blockSubject, setBlockSubject] = useState('');
  const [blockTotalMarks, setBlockTotalMarks] = useState<number>(20);
  const [blockQuestions, setBlockQuestions] = useState<any[]>([
    {
      id: 'q-1',
      type: 'mcq',
      text: '',
      options: ['', '', '', ''],
      correct_option: 0
    }
  ]);

  const gradesList = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const subjectsList = ['Mathematics', 'Science', 'English', 'Kiswahili', 'Social Studies'];

  useEffect(() => {
    fetchDashboardData();
  }, [schoolName]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get school_id from localStorage
      const schoolSessionStr = localStorage.getItem('azilearn_school');
      let schoolId = '';
      if (schoolSessionStr) {
        try {
          const parsed = JSON.parse(schoolSessionStr);
          schoolId = parsed.school_id || '';
          setSchoolId(schoolId);
        } catch (err) {}
      }

      // 1. Fetch teachers and nested classes
      let teachersData: any[] = [];
      try {
        if (schoolId) {
          const { data, error } = await supabase
            .from('teachers')
            .select('id, name, email, classes(id, name, grade)')
            .eq('school_id', schoolId);

          if (!error && data) {
            teachersData = data;
          } else {
            console.warn("First teachers query failed or returned empty, falling back:", error?.message);
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('teachers')
              .select('id, name, school_name')
              .ilike('school_name', schoolName.trim());

            if (!fallbackError && fallbackData) {
              const teacherIds = fallbackData.map(t => t.id);
              let clsData: any[] = [];
              let tsData: any[] = [];
              if (teacherIds.length > 0) {
                const { data: mappingData, error: mappingError } = await supabase
                  .from('teacher_subjects')
                  .select('class_id, teacher_id')
                  .in('teacher_id', teacherIds);
                if (!mappingError && mappingData) {
                  tsData = mappingData;
                  const classIds = mappingData.map((x: any) => x.class_id).filter(Boolean);
                  if (classIds.length > 0) {
                    const { data: classesResult, error: clsError } = await supabase
                      .from('classes')
                      .select('id, name, grade')
                      .in('id', classIds);
                    if (!clsError && classesResult) {
                      clsData = classesResult;
                    }
                  }
                }
              }
              teachersData = fallbackData.map(t => {
                const teacherClassIds = tsData
                  .filter((x: any) => x.teacher_id === t.id)
                  .map((x: any) => x.class_id);
                const teacherClasses = clsData.filter((c: any) => teacherClassIds.includes(c.id));
                return {
                  ...t,
                  classes: teacherClasses
                };
              });
            }
          }
        } else {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('teachers')
            .select('id, name, school_name')
            .ilike('school_name', schoolName.trim());

          if (!fallbackError && fallbackData) {
            const teacherIds = fallbackData.map(t => t.id);
            let clsData: any[] = [];
            let tsData: any[] = [];
            if (teacherIds.length > 0) {
              const { data: mappingData, error: mappingError } = await supabase
                .from('teacher_subjects')
                .select('class_id, teacher_id')
                .in('teacher_id', teacherIds);
              if (!mappingError && mappingData) {
                tsData = mappingData;
                const classIds = mappingData.map((x: any) => x.class_id).filter(Boolean);
                if (classIds.length > 0) {
                  const { data: classesResult, error: clsError } = await supabase
                    .from('classes')
                    .select('id, name, grade')
                    .in('id', classIds);
                  if (!clsError && classesResult) {
                    clsData = classesResult;
                  }
                }
              }
            }
            teachersData = fallbackData.map(t => {
              const teacherClassIds = tsData
                .filter((x: any) => x.teacher_id === t.id)
                .map((x: any) => x.class_id);
              const teacherClasses = clsData.filter((c: any) => teacherClassIds.includes(c.id));
              return {
                ...t,
                classes: teacherClasses
              };
            });
          }
        }
      } catch (teacherErr) {
        console.error("Error fetching teachers/classes:", teacherErr);
      }
      setTeachers(teachersData);

      // 2. Fetch active broadcast assignments
      let broadcastsData: any[] = [];
      try {
        if (schoolId) {
          const { data, error } = await supabase
            .from('assignment_broadcasts')
            .select('id, title, due_date, share_code, created_at')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            broadcastsData = data;
          } else {
            console.log("Error querying assignment_broadcasts, falling back to assignments table:", error?.message);
            const { data: bDataAlt, error: bErrorAlt } = await supabase
              .from('assignments')
              .select('id, title, due_date, share_code, created_at')
              .eq('is_broadcast', true)
              .ilike('school_name', schoolName.trim())
              .order('created_at', { ascending: false });

            if (!bErrorAlt && bDataAlt) {
              broadcastsData = bDataAlt;
            } else {
              console.log("Trying broader fallback query on assignments table...");
              const { data: bDataAlt2, error: bErrorAlt2 } = await supabase
                .from('assignments')
                .select('id, title, due_date, created_at')
                .limit(50);
              if (!bErrorAlt2 && bDataAlt2) {
                broadcastsData = bDataAlt2;
              }
            }
          }
        } else {
          const { data, error } = await supabase
            .from('assignments')
            .select('id, title, due_date, share_code, created_at')
            .eq('is_broadcast', true)
            .ilike('school_name', schoolName.trim())
            .order('created_at', { ascending: false });

          if (!error && data) {
            broadcastsData = data;
          } else {
            console.log("No schoolId and query failed, trying basic select on assignments:");
            const { data: bDataAlt2, error: bErrorAlt2 } = await supabase
              .from('assignments')
              .select('id, title, due_date, created_at')
              .limit(50);
            if (!bErrorAlt2 && bDataAlt2) {
              broadcastsData = bDataAlt2;
            }
          }
        }
      } catch (broadcastErr) {
        console.error("Error fetching broadcasts:", broadcastErr);
      }
      setBroadcasts(broadcastsData);

    } catch (err: any) {
      console.error("Dashboard load error:", err);
      showToast(`Error loading dashboard: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreateBroadcast = () => {
    setBroadcastTitle('');
    setBroadcastDueDate('');
    setGradeBlocks([]);
    setCreationStep('details');
  };

  const handleNextStep1 = () => {
    if (!broadcastTitle.trim() || !broadcastDueDate) {
      showToast("Please fill all details", "error");
      return;
    }
    setCreationStep('grades');
  };

  const handleOpenAddGrade = () => {
    setBlockGrade('');
    setBlockSubject('');
    setBlockTotalMarks(20);
    setBlockQuestions([
      {
        id: crypto.randomUUID(),
        type: 'mcq',
        text: '',
        options: ['', '', '', ''],
        correct_option: 0
      }
    ]);
    setEditingGradeBlockId(null);
    setIsAddingGrade(true);
  };

  const handleOpenEditGrade = (block: GradeBlock) => {
    setBlockGrade(block.grade);
    setBlockSubject(block.subject);
    setBlockTotalMarks(block.totalMarks);
    setBlockQuestions(block.questions);
    setEditingGradeBlockId(block.id);
    setIsAddingGrade(true);
  };

  const handleRemoveGradeBlock = (id: string) => {
    setGradeBlocks(prev => prev.filter(b => b.id !== id));
    showToast("Grade block removed", "success");
  };

  // Questions Builder actions
  const handleAddQuestion = () => {
    setBlockQuestions(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'mcq',
        text: '',
        options: ['', '', '', ''],
        correct_option: 0
      }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (blockQuestions.length <= 1) {
      showToast("Keep at least 1 question", "error");
      return;
    }
    setBlockQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, updates: any) => {
    setBlockQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleOptionChange = (qId: string, optIdx: number, val: string) => {
    setBlockQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optIdx] = val;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSaveGradeBlock = () => {
    if (!blockGrade || !blockSubject) {
      showToast("Grade and Subject are required", "error");
      return;
    }

    // Verify all questions have text
    const hasEmptyText = blockQuestions.some(q => !q.text.trim());
    if (hasEmptyText) {
      showToast("Please enter question text for all questions", "error");
      return;
    }

    // Verify MCQs have options filled
    const hasEmptyMCQ = blockQuestions.some(q => 
      q.type === 'mcq' && q.options.some((o: string) => !o.trim())
    );
    if (hasEmptyMCQ) {
      showToast("Please fill in all MCQ options", "error");
      return;
    }

    if (editingGradeBlockId) {
      setGradeBlocks(prev => prev.map(b => b.id === editingGradeBlockId ? {
        id: b.id,
        grade: blockGrade,
        subject: blockSubject,
        questions: blockQuestions,
        totalMarks: blockTotalMarks
      } : b));
      showToast("Grade block updated successfully", "success");
    } else {
      // Check if this grade is already added
      if (gradeBlocks.some(b => b.grade === blockGrade)) {
        showToast(`Questions for ${blockGrade} have already been added!`, "error");
        return;
      }

      setGradeBlocks(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          grade: blockGrade,
          subject: blockSubject,
          questions: blockQuestions,
          totalMarks: blockTotalMarks
        }
      ]);
      showToast("Grade block added successfully", "success");
    }

    setIsAddingGrade(false);
  };

  const handlePublishBroadcast = async () => {
    if (gradeBlocks.length === 0) {
      showToast("Please add at least one grade block", "error");
      return;
    }

    // Validation: each grade block must have both grade and subject filled in, and at least one question.
    for (const block of gradeBlocks) {
      if (!block.grade || !block.subject) {
        showToast("Each grade block must have a grade and subject selected", "error");
        return;
      }
      if (!block.questions || block.questions.length === 0) {
        showToast(`Grade block ${block.grade} must have at least one question`, "error");
        return;
      }
    }

    setLoading(true);
    try {
      // Get schoolSession from localStorage
      const schoolSessionStr = localStorage.getItem('azilearn_school');
      let schoolId = '';
      let activeSchoolName = schoolName;

      if (schoolSessionStr) {
        try {
          const parsed = JSON.parse(schoolSessionStr);
          schoolId = parsed.school_id || '';
          if (!activeSchoolName) {
            activeSchoolName = parsed.school_name || '';
          }
        } catch (err) {}
      }

      const cleanSchoolName = (activeSchoolName || 'AziLearn School').trim();

      let formattedDueDate = broadcastDueDate;
      try {
        if (broadcastDueDate) {
          formattedDueDate = new Date(broadcastDueDate).toISOString();
        }
      } catch (e) {
        console.warn("Invalid due date format:", broadcastDueDate);
      }

      // Helper to find teacher for a grade
      const findTeacherForGrade = (g: string) => {
        const matchedTeacher = teachers.find(t => 
          t.classes && Array.isArray(t.classes) && t.classes.some((cls: any) => cls.grade === g)
        );
        return matchedTeacher ? matchedTeacher.name : null;
      };

      // Try RPC first as instructed
      const { data, error } = await supabase.rpc('create_assignment_broadcast', {
        p_title: broadcastTitle,
        p_school_id: schoolId || '00000000-0000-0000-0000-000000000000', // fallback uuid if not loaded
        p_due_date: formattedDueDate,
        p_grade_assignments: gradeBlocks.map(block => ({
          grade: block.grade,
          subject: block.subject,
          total_marks: block.totalMarks,
          questions: block.questions
        }))
      });

      if (!error && data && data.success) {
        // Success using the RPC!
        const publishedList = gradeBlocks.map(block => {
          const teacherName = findTeacherForGrade(block.grade);
          return {
            grade: block.grade,
            subject: block.subject,
            code: data.share_code || 'N/A',
            teacherName: teacherName,
            hasWarning: !teacherName
          };
        });
        setPublishedCodes(publishedList);
        setCreationStep('success');
        showToast(`Broadcast holiday assignments published successfully! (${data.grades_created} grades created)`, "success");
        fetchDashboardData();
        return;
      }

      if (error) {
        console.warn("RPC failed, falling back to manual insertion:", error.message);
      } else if (data && !data.success) {
        console.warn("RPC success=false:", data.message);
        showToast(data.message || "Failed to create broadcast via RPC", "error");
        setLoading(false);
        return;
      }

      // Fallback manual insertion logic
      let teacherId = null;
      if (schoolSessionStr) {
        try {
          const parsed = JSON.parse(schoolSessionStr);
          teacherId = parsed.teacher_id;
        } catch {}
      }

      if (!teacherId && teachers && teachers.length > 0) {
        teacherId = teachers[0].id;
      }

      if (!teacherId) {
        // Find or create fallback Admin teacher for this school
        const { data: admins } = await supabase
          .from('teachers')
          .select('id')
          .eq('name', 'Admin')
          .ilike('school_name', cleanSchoolName)
          .limit(1);
        
        if (admins && admins.length > 0) {
          teacherId = admins[0].id;
        } else {
          // Try creating a fallback Admin teacher, but handle RLS/errors gracefully
          const tempId = crypto.randomUUID();
          const { error: teacherInsertErr } = await supabase.from('teachers').insert({
            id: tempId,
            name: 'Admin',
            school_name: cleanSchoolName,
            school_id: schoolId || null,
            pin: '1234'
          });
          
          if (!teacherInsertErr) {
            teacherId = tempId;
          } else {
            console.warn("Could not create fallback Admin teacher:", teacherInsertErr.message);
            // Try fetching literally any existing teacher from the DB to satisfy references
            const { data: anyTeacher } = await supabase.from('teachers').select('id').limit(1);
            if (anyTeacher && anyTeacher.length > 0) {
              teacherId = anyTeacher[0].id;
            } else {
              teacherId = null; // Set to null so foreign key is satisfied (nullable in table)
            }
          }
        }
      }

      const publishedList: { grade: string; subject?: string; code: string; teacherName?: string | null; hasWarning?: boolean }[] = [];

      for (const block of gradeBlocks) {
        // Generate code e.g. AC8102
        const randomCode = `AC${Math.floor(1000 + Math.random() * 9000)}`;

        const payload = {
          teacher_id: teacherId,
          title: broadcastTitle,
          subject: block.subject,
          grade: block.grade,
          class_name: 'School Broadcast',
          due_date: formattedDueDate,
          questions: block.questions,
          share_code: randomCode,
          is_broadcast: true,
          school_name: cleanSchoolName
        };

        const { error: insertError } = await supabase
          .from('assignments')
          .insert(payload);

        if (insertError) {
          console.warn("Direct insert failed, retrying with standard columns:", insertError.message);
          // Retry without custom columns is_broadcast and school_name
          const backupPayload = {
            teacher_id: teacherId,
            title: broadcastTitle,
            subject: block.subject,
            grade: block.grade,
            class_name: 'School Broadcast',
            due_date: formattedDueDate,
            questions: block.questions,
            share_code: randomCode
          };
          const { error: retryError } = await supabase
            .from('assignments')
            .insert(backupPayload);
          
          if (retryError) {
            console.warn("Retry failed, attempting with minimal columns:", retryError.message);
            // Retry with completely minimal payload to make sure it works
            const minimalPayload = {
              title: broadcastTitle,
              subject: block.subject,
              grade: block.grade,
              questions: block.questions,
              share_code: randomCode
            };
            const { error: minimalError } = await supabase
              .from('assignments')
              .insert(minimalPayload);
            if (minimalError) throw minimalError;
          }
        }
        const teacherName = findTeacherForGrade(block.grade);
        publishedList.push({
          grade: block.grade,
          subject: block.subject,
          code: randomCode,
          teacherName: teacherName,
          hasWarning: !teacherName
        });
      }

      setPublishedCodes(publishedList);
      setCreationStep('success');
      showToast("Broadcast holiday assignments published successfully!", "success");
      fetchDashboardData();
    } catch (err: any) {
      console.error("Publishing error:", err);
      showToast(`Publishing failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast assignment?")) return;
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast("Broadcast deleted", "success");
      fetchDashboardData();
    } catch (err: any) {
      showToast(`Deletion failed: ${err.message}`, "error");
    }
  };

  const getTeachersDisplay = (teachersList: Teacher[]) => {
    return teachersList.map(t => {
      const grades = Array.from(new Set((t.classes || []).map(c => c?.grade).filter(Boolean)));
      return {
        ...t,
        grades: grades.length > 0 ? grades.join(', ') : 'No grades assigned',
        classesCount: t.classes?.length || 0
      };
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
      {/* 1. Header Bar */}
      <header className="bg-brand-surface border-b border-brand-border px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center">
            <School size={20} />
          </div>
          <div>
            <h1 className="font-black text-brand-text text-base leading-none">{schoolName}</h1>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">Admin Dashboard</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 rounded-xl text-red-500 text-xs font-black uppercase tracking-wider transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </header>

      {/* 2. Main Area / Creation Multi-Step Views */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24 relative">
        <AnimatePresence mode="wait">
          {/* Dashboard Mode (Teachers or Broadcasts tabs) */}
          {creationStep === null && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Tab Toggles */}
              <div className="flex bg-brand-surface border border-brand-border p-1.5 rounded-2xl max-w-sm">
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'teachers' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
                >
                  <Users size={16} />
                  Teachers & Classes
                </button>
                <button
                  onClick={() => setActiveTab('broadcasts')}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'broadcasts' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
                >
                  <Radio size={16} />
                  Active Broadcasts
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-brand-accent mb-4" size={32} />
                  <p className="text-xs font-black uppercase tracking-widest text-brand-muted">Loading data...</p>
                </div>
              ) : activeTab === 'teachers' ? (
                <SchoolTeachersList schoolId={schoolId} />
              ) : (
                /* Active Broadcasts List */
                <div className="space-y-4">
                  <h2 className="text-xs font-black uppercase tracking-widest text-brand-muted px-1">Broadcast holiday assignments ({broadcasts.length})</h2>
                  {broadcasts.length === 0 ? (
                    <div className="bg-brand-surface border border-brand-border border-dashed rounded-[2rem] p-12 text-center text-brand-muted">
                      <p className="font-bold">No holiday assignments created yet. Create one below.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {broadcasts.map((b) => (
                        <div key={b.id} className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                {b.grade}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">
                                {b.subject}
                              </span>
                            </div>
                            <h3 className="font-black text-brand-text text-base truncate">{b.title}</h3>
                            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider flex items-center gap-1">
                              <Calendar size={12} /> Due {new Date(b.due_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-[9px] font-black text-brand-muted uppercase tracking-wider">Share Code</p>
                              <p className="text-sm font-mono font-black text-brand-text bg-brand-bg px-2 py-1 border border-brand-border rounded-lg mt-0.5">
                                {b.share_code}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleDeleteBroadcast(b.id)}
                              className="p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 rounded-xl transition-all"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Creation Step 1: Details */}
          {creationStep === 'details' && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCreationStep(null)}
                  className="flex items-center gap-1.5 text-xs font-black text-brand-muted hover:text-brand-text uppercase tracking-widest"
                >
                  <ArrowLeft size={16} /> Cancel
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Step 1 of 3</span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-brand-text">Broadcast Details</h2>
                <p className="text-xs text-brand-muted font-medium">Define the core parameters for this holiday assignment</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Assignment Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. August Holiday Assignment"
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-4 font-bold text-sm outline-none focus:border-brand-accent/40"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Due Date</label>
                  <input 
                    type="date"
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-4 font-bold text-sm outline-none focus:border-brand-accent/40"
                    value={broadcastDueDate}
                    onChange={(e) => setBroadcastDueDate(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleNextStep1}
                disabled={!broadcastTitle.trim() || !broadcastDueDate}
                className="w-full bg-brand-accent text-white py-4.5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/15 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                Next: Add Grades
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* Creation Step 2: Grade blocks list / Sub-screen */}
          {creationStep === 'grades' && !isAddingGrade && (
            <motion.div
              key="step-grades-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setCreationStep('details')}
                    className="flex items-center gap-1.5 text-xs font-black text-brand-muted hover:text-brand-text uppercase tracking-widest"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Step 2 of 3</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border/40">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-brand-text">Grade Blocks</h2>
                    <p className="text-xs text-brand-muted font-medium">Build distinct question sheets for each targeted grade</p>
                  </div>
                  <button 
                    onClick={handleOpenAddGrade}
                    className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/10 active:scale-95 transition-all shrink-0"
                  >
                    <Plus size={14} /> Add a Grade
                  </button>
                </div>

                {/* List of Grade summary cards */}
                {gradeBlocks.length === 0 ? (
                  <div className="py-12 border border-dashed border-brand-border rounded-[1.5rem] flex flex-col items-center justify-center text-center gap-2">
                    <Sparkles className="text-indigo-500/30 mb-1" size={28} />
                    <p className="font-bold text-brand-text text-sm">No grade blocks added yet</p>
                    <p className="text-xs text-brand-muted max-w-xs">Create questions per grade to send to matching students.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gradeBlocks.map((block) => (
                      <div key={block.id} className="bg-brand-bg/50 border border-brand-border rounded-xl p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg">{block.grade}</span>
                            <span className="text-xs font-bold text-brand-text">{block.subject}</span>
                          </div>
                          <p className="text-[10px] text-brand-muted font-black uppercase tracking-wider mt-1.5">
                            {block.questions.length} questions · {block.totalMarks} marks
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleOpenEditGrade(block)}
                            className="p-2 bg-brand-surface hover:bg-brand-border/35 text-brand-muted hover:text-brand-text rounded-lg border border-brand-border/40"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleRemoveGradeBlock(block.id)}
                            className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-lg border border-red-500/10"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={() => setCreationStep('review')}
                  disabled={gradeBlocks.length === 0}
                  className="w-full bg-brand-accent text-white py-4.5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/15 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Next: Review & Publish
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Creation Step 2 (Sub-screen): Adding/Editing Question Sheet for a Grade */}
          {creationStep === 'grades' && isAddingGrade && (
            <motion.div
              key="sub-screen-grade-builder"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setIsAddingGrade(false)}
                    className="flex items-center gap-1.5 text-xs font-black text-brand-muted hover:text-brand-text uppercase tracking-widest"
                  >
                    <ArrowLeft size={16} /> Back to List
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 font-mono">Grade Builder</span>
                </div>

                <div className="space-y-1 pb-4 border-b border-brand-border/40">
                  <h2 className="text-xl font-black text-brand-text">
                    {editingGradeBlockId ? 'Edit' : 'Add'} Grade Sheet
                  </h2>
                  <p className="text-xs text-brand-muted font-medium">Design questions and score criteria for this grade</p>
                </div>

                {/* Grade & Subject Selects */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Grade</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                      <select 
                        className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none appearance-none focus:border-brand-accent/50 transition-all font-bold"
                        value={blockGrade}
                        onChange={e => setBlockGrade(e.target.value)}
                      >
                        <option value="">Select</option>
                        {gradesList.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted/40 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Subject</label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                      <select 
                        className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 pl-12 pr-6 outline-none appearance-none focus:border-brand-accent/50 transition-all font-bold"
                        value={blockSubject}
                        onChange={e => setBlockSubject(e.target.value)}
                      >
                        <option value="">Select</option>
                        {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted/40 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Total Marks</label>
                    <input 
                      type="number"
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-4 font-bold text-sm outline-none focus:border-brand-accent/40"
                      value={blockTotalMarks}
                      onChange={(e) => setBlockTotalMarks(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Question Builder */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-muted">Questions Builder ({blockQuestions.length})</h3>
                    <button 
                      onClick={handleAddQuestion}
                      className="flex items-center gap-1 text-indigo-500 font-black tracking-widest text-[10px] uppercase hover:opacity-80 transition-opacity"
                    >
                      <Plus size={14} /> Add Question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {blockQuestions.map((q, idx) => (
                      <div 
                        key={q.id}
                        className="bg-brand-bg/50 border border-brand-border rounded-2xl p-5 space-y-4 relative group overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="p-1.5 text-red-500/40 hover:text-red-500 bg-red-500/5 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-500 text-white rounded-lg flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </div>
                            <span className="font-bold text-sm text-brand-text">Question {idx + 1}</span>
                          </div>
                          
                          <div className="flex bg-brand-surface p-1 rounded-xl border border-brand-border">
                            <button 
                              onClick={() => handleUpdateQuestion(q.id, { type: 'mcq' })}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${q.type === 'mcq' ? 'bg-indigo-500 text-white' : 'text-brand-muted hover:text-brand-text'}`}
                            >
                              <LayoutDashboard size={10} /> MCQ
                            </button>
                            <button 
                              onClick={() => handleUpdateQuestion(q.id, { type: 'short_answer' })}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${q.type === 'short_answer' ? 'bg-indigo-500 text-white' : 'text-brand-muted hover:text-brand-text'}`}
                            >
                              <Type size={10} /> Short
                            </button>
                            <button 
                              onClick={() => handleUpdateQuestion(q.id, { type: 'photo' })}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${q.type === 'photo' ? 'bg-indigo-500 text-white' : 'text-brand-muted hover:text-brand-text'}`}
                            >
                              <ImageIcon size={10} /> Photo
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <textarea 
                            placeholder="Enter question prompt here..."
                            rows={2}
                            className="w-full bg-transparent border-none outline-none resize-none font-sans text-sm font-bold placeholder:text-brand-text/10"
                            value={q.text}
                            onChange={e => handleUpdateQuestion(q.id, { text: e.target.value })}
                          />

                          {q.type === 'mcq' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {q.options.map((opt: string, optIdx: number) => (
                                <div 
                                  key={`${q.id}-opt-${optIdx}`} 
                                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${q.correct_option === optIdx ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-brand-surface border-brand-border'}`}
                                >
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateQuestion(q.id, { correct_option: optIdx })}
                                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${q.correct_option === optIdx ? 'bg-emerald-500 text-white' : 'bg-brand-bg border border-brand-border text-transparent'}`}
                                  >
                                    <Check size={12} />
                                  </button>
                                  <input 
                                    type="text"
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold transition-all"
                                    value={opt}
                                    onChange={e => handleOptionChange(q.id, optIdx, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'short_answer' && (
                            <div className="p-3 bg-brand-surface border border-brand-border border-dashed rounded-xl flex items-center justify-center text-brand-muted/40 italic text-xs">
                              Students will type their answer here
                            </div>
                          )}

                          {q.type === 'photo' && (
                            <div className="p-4 bg-brand-surface border border-brand-border border-dashed rounded-xl flex flex-col items-center justify-center gap-1">
                              <ImageIcon className="text-brand-muted/20" size={20} />
                              <span className="text-[9px] font-bold text-brand-muted/40 uppercase tracking-widest text-center">Students will upload a photo of their work</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleAddQuestion}
                    className="w-full py-4 border border-dashed border-brand-border rounded-xl flex items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-xs font-black uppercase tracking-wider text-brand-muted hover:text-indigo-500"
                  >
                    <Plus size={16} /> Add Another Question
                  </button>
                </div>

                <div className="flex gap-3 pt-4 border-t border-brand-border/40">
                  <button 
                    onClick={() => setIsAddingGrade(false)}
                    className="flex-1 bg-brand-bg border border-brand-border py-4 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-brand-border/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveGradeBlock}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-indigo-500/10 transition-colors"
                  >
                    Save Grade Sheet
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Creation Step 3: Review & Confirm */}
          {creationStep === 'review' && (
            <motion.div
              key="step-review"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCreationStep('grades')}
                  className="flex items-center gap-1.5 text-xs font-black text-brand-muted hover:text-brand-text uppercase tracking-widest"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Step 3 of 3</span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-brand-text">Review Broadcast</h2>
                <p className="text-xs text-brand-muted font-medium">Verify your school holiday assignment details before broadcasting</p>
              </div>

              <div className="p-5 bg-brand-bg/60 border border-brand-border rounded-2xl space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted">Broadcast Title</p>
                  <p className="text-base font-black text-brand-text mt-0.5">{broadcastTitle}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted">Target School</p>
                  <p className="text-sm font-bold text-brand-text mt-0.5">{schoolName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted">Due Date</p>
                  <p className="text-sm font-bold text-brand-text mt-0.5">{new Date(broadcastDueDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Grade Sheets Created ({gradeBlocks.length})</p>
                {gradeBlocks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 border border-brand-border/40 rounded-xl">
                    <span className="text-xs font-black text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded">{b.grade}</span>
                    <span className="text-xs font-bold text-brand-text">{b.subject}</span>
                    <span className="text-xs text-brand-muted font-mono">{b.questions.length} Questions</span>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-indigo-600 leading-relaxed">
                  This will be visible to all students in these grades at {schoolName}.
                </p>
              </div>

              <button 
                onClick={handlePublishBroadcast}
                disabled={loading}
                className="w-full bg-brand-accent text-white py-4.5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/15 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Publish Assignment
              </button>
            </motion.div>
          )}

          {/* Success Screen */}
          {creationStep === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 text-center space-y-6 max-w-md mx-auto"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-brand-text">Published!</h2>
                <p className="text-xs text-brand-muted font-bold uppercase tracking-wider">{publishedCodes.length} grades created successfully</p>
              </div>

              <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border space-y-4 max-h-[300px] overflow-y-auto">
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest text-left">Share Codes & Routing Confirmation</p>
                <div className="space-y-4">
                  {publishedCodes.map((c) => (
                    <div key={c.grade} className="border-b border-brand-border/40 pb-3 last:border-0 last:pb-0 space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-brand-text">{c.grade} {c.subject ? `• ${c.subject}` : ''}</span>
                        <span className="text-sm font-mono font-black text-brand-accent">{c.code}</span>
                      </div>
                      
                      {c.hasWarning ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-2 text-[10px] font-bold leading-relaxed">
                          ⚠️ No teacher found for this grade — assignment created but won't appear in any teacher's grading queue until a teacher creates a class for this grade.
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg inline-block">
                          ✅ Routed to: <span className="underline">{c.teacherName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setCreationStep(null)}
                className="w-full bg-brand-text text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Sticky Action Bar at Bottom (when on main Dashboard view) */}
      {creationStep === null && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-brand-bg via-brand-bg/95 to-transparent z-30 flex justify-center pointer-events-none">
          <button
            onClick={handleStartCreateBroadcast}
            className="pointer-events-auto bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-xs uppercase tracking-[0.2em] px-8 py-4.5 rounded-2xl shadow-xl shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 max-w-sm w-full"
          >
            <Plus size={16} />
            Create Holiday Assignment
          </button>
        </div>
      )}
    </div>
  );
};
