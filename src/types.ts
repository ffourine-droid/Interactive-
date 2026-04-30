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

export type Page = 'landing' | 'home' | 'admin' | 'teacher' | 'assignments' | 'teacher-dashboard' | 'teacher-signup' | 'teacher-login' | 'teacher-class' | 'parent';
