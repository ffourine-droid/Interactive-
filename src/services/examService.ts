import { supabase } from '../lib/supabase';
import { Exam, ExamAttempt, AnswerLog, Question } from '../types';
import { prebuiltExams } from '../data/prebuiltExams';

export const examService = {
  /**
   * Seeds prebuilt exams if they don't exist
   */
  async seedPrebuiltExams() {
    try {
      // Check if exams table exists and has prebuilt exams
      const { data: existingExams, error } = await supabase
        .from('exams')
        .select('title')
        .eq('is_prebuilt', true);

      if (error) {
        console.error('Error checking prebuilt exams:', error);
        return;
      }

      const existingTitles = new Set(existingExams?.map(e => e.title) || []);

      for (const exam of prebuiltExams) {
        if (!existingTitles.has(exam.title)) {
          const { error: insertError } = await supabase
            .from('exams')
            .insert({
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              duration_minutes: exam.duration_minutes,
              instructions: exam.instructions,
              questions: exam.questions,
              is_prebuilt: true,
              is_published: true
            });

          if (insertError) {
            console.error(`Error seeding exam ${exam.title}:`, insertError);
          } else {
            console.log(`Seeded exam ${exam.title}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to seed prebuilt exams:', err);
    }
  },

  async getPublishedExams(grade?: string, classId?: string) {
    let query = supabase
      .from('exams')
      .select(`
        *,
        teacher:created_by (
          name,
          school_name
        ),
        class:class_id (
          name
        )
      `)
      .eq('is_published', true);

    if (grade) {
      query = query.eq('grade', grade);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async searchExams(grade: string, teacherName?: string, schoolName?: string) {
    // Determine the query
    let baseQuery = supabase
      .from('exams')
      .select(`
        *,
        teacher:created_by (
          name,
          school_name
        )
      `)
      .eq('is_published', true);

    if (grade) {
      baseQuery = baseQuery.eq('grade', grade);
    }

    const { data, error } = await baseQuery.order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    let filtered = data;

    if (teacherName) {
      const term = teacherName.toLowerCase().trim();
      if (term) {
        filtered = filtered.filter((exam: any) => 
          exam.teacher?.name?.toLowerCase().includes(term)
        );
      }
    }

    if (schoolName) {
      const term = schoolName.toLowerCase().trim();
      if (term) {
        filtered = filtered.filter((exam: any) => 
          exam.teacher?.school_name?.toLowerCase().includes(term)
        );
      }
    }

    return filtered;
  },

  async getExamById(id: string) {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error("Exam not found.");
    return data as Exam;
  },

  async identifyStudent(name: string, index?: string, grade?: string) {
    // Try to find student by name and optional index
    let query = supabase.from('students').select('*').ilike('name', name.trim());
    
    const { data: students, error: fetchError } = await query;
    if (fetchError) {
      if (fetchError.message.includes('column "index_number" does not exist')) {
        throw new Error("Missing 'index_number' column. Please run the provided SQL in Supabase.");
      }
      throw fetchError;
    }

    // If multiple with same name, and we have index, filter
    let existing = null;
    if (students && students.length > 0) {
      if (index) {
        existing = students.find((s: any) => s.index_number === index.trim());
      }
      if (!existing) {
        existing = students[0];
      }
    }
    
    if (existing) return existing;

    // Create new student
    const { data: created, error: createError } = await supabase
      .from('students')
      .insert({
        name: name.trim(),
        index_number: index?.trim() || null,
        grade: grade || 'Grade 7'
      })
      .select();

    if (createError) {
      if (createError.message.includes('column "index_number" does not exist')) {
        throw new Error("Database schema update required. Please run the provided SQL to add 'index_number' column to students table.");
      }
      throw createError;
    }

    if (!created || created.length === 0) {
      throw new Error("Student created but could not be retrieved. Please ensure 'students' table Row Level Security (RLS) policies are set to 'Allow all'.");
    }

    return created[0];
  },

  async startExamAttempt(examId: string, studentId: string) {
    // Check for existing attempt
    const { data: existing, error: checkError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) return existing as ExamAttempt;

    // Create new attempt
    const { data, error } = await supabase
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        student_id: studentId,
        started_at: new Date().toISOString(),
        is_submitted: false,
        has_overtime: false,
        answers: {}
      })
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Attempt created but could not be retrieved. Please check permissions.");
    }
    return data[0] as ExamAttempt;
  },

  async getAttempt(examId: string, studentId: string) {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .maybeSingle();
    
    if (error) throw error;
    return data as ExamAttempt;
  },

  async logAnswer(attemptId: string, questionIndex: number, answer: string, isOvertime: boolean) {
    // 1. Log to exam_answer_logs
    const { error: logError } = await supabase
      .from('exam_answer_logs')
      .insert({
        attempt_id: attemptId,
        question_index: questionIndex,
        answer: answer,
        answered_at: new Date().toISOString(),
        is_overtime: isOvertime
      });
    
    if (logError) throw logError;

    // 2. Update the main attempt's answers map for quick access
    const { data: attempt } = await supabase
      .from('exam_attempts')
      .select('answers')
      .eq('id', attemptId)
      .maybeSingle();

    const newAnswers = { ...(attempt?.answers || {}), [questionIndex]: answer };

    const { error: updateError } = await supabase
      .from('exam_attempts')
      .update({ 
        answers: newAnswers,
        has_overtime: isOvertime ? true : undefined // Set true if this was overtime, don't unset if it was already true
      })
      .eq('id', attemptId);
    
    if (updateError) throw updateError;
  },

  async getAnswerLogs(attemptId: string) {
    const { data, error } = await supabase
      .from('exam_answer_logs')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('answered_at', { ascending: true });
    
    if (error) throw error;
    return data as AnswerLog[];
  },

  async submitExam(attemptId: string, exam: Exam, answers: Record<string, string>, hasOvertime: boolean) {
    let score = 0;
    let totalMarks = 0;

    exam.questions.forEach((q, idx) => {
      totalMarks += q.marks;
      if (q.type === 'mcq') {
        if (answers[idx] === q.correct_answer) {
          score += q.marks;
        }
      }
    });

    const { data, error } = await supabase
      .from('exam_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        is_submitted: true,
        score,
        total_marks: totalMarks,
        has_overtime: hasOvertime,
        grading: {} // Initialize for short answers
      })
      .eq('id', attemptId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Submission recorded but confirmation failed.");
    }
    return data[0] as ExamAttempt;
  },

  async updateGrading(attemptId: string, grading: Record<number, number>, score: number, feedback: string) {
    const { error } = await supabase
      .from('exam_attempts')
      .update({ 
        score,
        grading,
        teacher_feedback: feedback
      })
      .eq('id', attemptId);
    
    if (error) throw error;
  }
};
