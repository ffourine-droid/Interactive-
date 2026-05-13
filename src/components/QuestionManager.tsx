import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Trash2, Filter, ChevronDown, 
  Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface Question {
  id: string;
  grade: number;
  subject: string;
  topic: string;
  question: string;
  correct_answer: string;
  difficulty: string;
}

export const QuestionManager: React.FC = () => {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const subjects = [
    'Mathematics', 'Integrated Science', 'Social Studies',
    'English', 'Kiswahili', 'Agriculture', 'CRE',
    'Creative Arts & Sports', 'Pre-Technical Studies', 'Business Studies'
  ];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('questions_bank')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedGrade !== 'all') query = query.eq('grade', selectedGrade);
      if (selectedSubject !== 'all') query = query.eq('subject', selectedSubject);
      if (searchTerm) query = query.ilike('question', `%${searchTerm}%`);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setQuestions(data || []);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedGrade, selectedSubject]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question permanently?')) return;
    try {
      const { error } = await supabase.from('questions_bank').delete().eq('id', id);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== id));
      showToast('Question deleted', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase">Question Manager</h2>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-1">Manage {questions.length} questions in bank</p>
        </div>
        <button 
          onClick={fetchQuestions}
          className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchQuestions()}
            placeholder="Search questions..."
            className="w-full bg-brand-bg border border-brand-border rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:border-brand-accent outline-none"
          />
        </div>
        <div className="relative">
          <select 
            value={selectedGrade} 
            onChange={e => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full appearance-none bg-brand-bg border border-brand-border rounded-2xl py-3 pl-4 pr-10 text-sm font-bold focus:border-brand-accent outline-none cursor-pointer"
          >
            <option value="all">All Grades</option>
            {[7, 8, 9].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select 
            value={selectedSubject} 
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full appearance-none bg-brand-bg border border-brand-border rounded-2xl py-3 pl-4 pr-10 text-sm font-bold focus:border-brand-accent outline-none cursor-pointer"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-brand-border rounded-[2rem] text-brand-muted">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">No questions found</p>
          </div>
        ) : (
          questions.map(q => (
            <div key={q.id} className="p-5 bg-brand-bg border border-brand-border rounded-3xl flex items-start justify-between gap-4 group hover:border-brand-accent/30 transition-all">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest px-2 py-0.5 bg-brand-accent/10 rounded-full border border-brand-accent/20">{q.subject}</span>
                  <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Grade {q.grade}</span>
                  {q.difficulty && (
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                      q.difficulty === 'easy' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                      q.difficulty === 'medium' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
                      'text-red-500 border-red-500/20 bg-red-500/5'
                    }`}>
                      {q.difficulty}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-brand-text leading-snug">{q.question}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Correct: {q.correct_answer}</p>
              </div>
              <button 
                onClick={() => handleDelete(q.id)}
                className="p-2 text-red-500/20 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
