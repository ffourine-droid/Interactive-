import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Send, MessageCircle, BookOpen, 
  GraduationCap, Hash, Layout, 
  Loader2, CheckCircle2, AlertCircle,
  Clock, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface QuestionRequestFormProps {
  teacher: {
    id: string;
    name: string;
    school_name: string;
  };
  onClose: () => void;
}

export const QuestionRequestForm: React.FC<QuestionRequestFormProps> = ({ teacher, onClose }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !grade || !topic || !description) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('question_requests')
        .insert([{
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          school_name: teacher.school_name,
          subject,
          grade,
          topic,
          num_questions: numQuestions,
          description,
          status: 'pending'
        }]);

      if (error) throw error;
      
      setSubmitted(true);
      showToast("Request sent to Admin!", "success");
      setTimeout(onClose, 2000);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-20 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
          <CheckCircle2 size={40} className="text-white" />
        </div>
        <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">Request Received!</h3>
        <p className="text-brand-muted font-bold text-sm">Our admin team is reviewing your request.</p>
        <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mt-8 animate-pulse">Closing form...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase leading-none">Request Material</h2>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mt-2">Let our team build professional content for you</p>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 md:col-span-2">
          <div className="bg-brand-accent/5 rounded-2x border border-brand-accent/10 p-4 flex gap-4 items-start mb-2">
            <MessageCircle size={20} className="text-brand-accent shrink-0 mt-1" />
            <p className="text-[10px] font-black text-brand-muted uppercase leading-relaxed">
              Describe the <span className="text-brand-accent">specific topic</span> and learning objectives. We will deliver a share code to your dashboard within 24 hours.
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
            <BookOpen size={10} /> Subject
          </label>
          <input 
            value={subject} 
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Mathematics" 
            className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
            <GraduationCap size={10} /> Grade Level
          </label>
          <input 
            value={grade} 
            onChange={e => setGrade(e.target.value)}
            placeholder="e.g. Grade 9" 
            className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
            <Layout size={10} /> Topic / Area
          </label>
          <input 
            value={topic} 
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Quadratic Equations" 
            className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1 flex items-center gap-2">
            <Hash size={10} /> Question Count
          </label>
          <input 
            type="number"
            value={numQuestions} 
            onChange={e => setNumQuestions(parseInt(e.target.value))}
            min={1}
            max={50}
            className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50" 
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted px-1">Specific Instructions / Subtopics</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            placeholder="Mention any specific focus points or question styles you prefer..." 
            className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 font-bold outline-none focus:border-brand-accent/50 h-32" 
            required
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="md:col-span-2 w-full bg-brand-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          {loading ? 'Sending Request...' : 'Send Request to Admin'}
        </button>
      </form>
    </div>
  );
};
