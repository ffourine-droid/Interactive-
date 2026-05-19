export interface Experiment {
  id: string | number;
  title: string;
  keywords: string;
  html_content: string;
  subject?: string;
  slides?: string[];
  audio_url?: string;
  pdf_url?: string;
  ppt_url?: string;
  grade?: string;
  created_at?: string;
}

export type Page = 
  | 'landing' 
  | 'home' 
  | 'admin' 
  | 'teacher' 
  | 'assignments' 
  | 'teacher-dashboard' 
  | 'teacher-signup' 
  | 'teacher-login' 
  | 'teacher-class' 
  | 'parent'
  | 'student-exams'
  | 'take-exam'
  | 'create-exam'
  | 'admin-dashboard'
  | 'admin-assignment-creator'
  | 'groupwork'
  | 'exam-results';

export interface Question {
  index: number;
  type: 'mcq' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer: string;
  marks: number;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  duration_minutes: number;
  instructions?: string;
  created_by?: string;
  is_prebuilt: boolean;
  is_published: boolean;
  class_id?: string;
  questions: Question[];
  created_at?: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string;
  time_limit_ended_at?: string;
  answers: Record<string, any>;
  score?: number;
  total_marks?: number;
  is_submitted: boolean;
  has_overtime: boolean;
}

export interface AnswerLog {
  id: string;
  attempt_id: string;
  question_index: number;
  answer: string;
  answered_at: string;
  is_overtime: boolean;
}
