import { supabase } from '../lib/supabase';
import { Exam, ExamAttempt, AnswerLog } from '../types';
import { prebuiltExams } from '../data/prebuiltExams';

export const examService = {
  /**
   * Seeds prebuilt exams if they don't exist — only runs once on app startup
   */
  async seedPrebuiltExams() {
    try {
      const { data: existingExams, error } = await supabase
        .from('exams')
        .select('title')
        .eq('is_prebuilt', true);

      if (error) return;

      const existingTitles = new Set(existingExams?.map(e => e.title) || []);

      const recordsToInsert = [];
      for (const exam of prebuiltExams) {
        if (!existingTitles.has(exam.title)) {
          recordsToInsert.push({
            title: exam.title,
            subject: exam.subject,
            grade: exam.grade,
            duration_minutes: exam.duration_minutes,
            instructions: exam.instructions,
            questions: exam.questions,
            is_prebuilt: true,
            is_published: true
          });
        }
      }

      if (recordsToInsert.length > 0) {
        await supabase.from('exams').insert(recordsToInsert);
      }
    } catch (err) {
      console.error('Failed to seed prebuilt exams:', err);
    }
  },

  async getPublishedExams(grade?: string) {
    let query = supabase
      .from('exams')
      .select(`
        *,
        teacher:created_by (name, school_name)
      `)
      .eq('is_published', true);

    if (grade) query = query.eq('grade', grade);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async searchExams(grade: string, teacherName?: string, schoolName?: string, code?: string) {
    // If a code is provided, find that specific exam first
    if (code?.trim()) {
      const { data: codeExam } = await supabase
        .from('exams')
        .select(`*, teacher:created_by (name, school_name)`)
        .eq('share_code', code.trim().toUpperCase())
        .eq('is_published', true)
        .maybeSingle();

      if (codeExam) return [codeExam];
    }

    let baseQuery = supabase
      .from('exams')
      .select(`*, teacher:created_by (name, school_name)`)
      .eq('is_published', true);

    if (grade) baseQuery = baseQuery.eq('grade', grade);

    const { data, error } = await baseQuery.order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];

    let filtered = data;

    if (teacherName?.trim()) {
      const term = teacherName.toLowerCase().trim();
      filtered = filtered.filter((exam: any) =>
        exam.teacher?.name?.toLowerCase().includes(term)
      );
    }

    if (schoolName?.trim()) {
      const term = schoolName.toLowerCase().trim();
      filtered = filtered.filter((exam: any) =>
        exam.teacher?.school_name?.toLowerCase().includes(term)
      );
    }

    return filtered;
  },

  async getExamByCode(code: string) {
    const { data, error } = await supabase
      .from('exams')
      .select(`*, teacher:created_by (name, school_name)`)
      .eq('share_code', code.toUpperCase())
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getExamById(id: string) {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Assessment not found.');
    return data as Exam;
  },

  async identifyStudent(name: string, _index?: string, grade?: string) {
    // Find existing student by name + grade
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .ilike('name', name.trim())
      .eq('grade', grade || 'Grade 7');

    if (fetchError) throw fetchError;

    if (students && students.length > 0) {
      return students[0];
    }

    // Create new student — only store name and grade (no parent_code to avoid constraint issues)
    const { data: created, error: createError } = await supabase
      .from('students')
      .insert({
        name: name.trim(),
        grade: grade || 'Grade 7',
        parent_code: null // explicitly null — no constraint violation
      })
      .select();

    if (createError) throw createError;

    if (!created || created.length === 0) {
      throw new Error(
        'Student created but could not be retrieved. Please check Supabase RLS policies on the students table.'
      );
    }

    return created[0];
  },

  async startExamAttempt(examId: string, studentId: string) {
    const { data: existing } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) return existing as ExamAttempt;

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
    if (!data || data.length === 0) throw new Error('Attempt created but could not be retrieved.');
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
    await supabase.from('exam_answer_logs').insert({
      attempt_id: attemptId,
      question_index: questionIndex,
      answer,
      answered_at: new Date().toISOString(),
      is_overtime: isOvertime
    });

    const { data: attempt } = await supabase
      .from('exam_attempts')
      .select('answers')
      .eq('id', attemptId)
      .maybeSingle();

    const newAnswers = { ...(attempt?.answers || {}), [questionIndex]: answer };

    await supabase
      .from('exam_attempts')
      .update({
        answers: newAnswers,
        ...(isOvertime ? { has_overtime: true } : {})
      })
      .eq('id', attemptId);
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
      if (q.type === 'mcq' && answers[idx] === q.correct_answer) {
        score += q.marks;
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
        grading: {}
      })
      .eq('id', attemptId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Submission recorded but confirmation failed.');
    return data[0] as ExamAttempt;
  },

  async updateGrading(attemptId: string, grading: Record<number, number>, score: number, feedback: string) {
    const { error } = await supabase
      .from('exam_attempts')
      .update({ score, grading, teacher_feedback: feedback })
      .eq('id', attemptId);

    if (error) throw error;
  }
};
