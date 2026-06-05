import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  Book, 
  ChevronDown, 
  HelpCircle,
  FolderOpen,
  FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AziLearnNotesRenderer from './AziLearnNotesRenderer';
import { fallbackMaterials } from '../data/fallbackMaterials';

// Precise grade matching logic to avoid matching "1" inside "10/11/12"
const isGradeMatch = (rowGradeStr: any, targetGradeNum: number): boolean => {
  if (!rowGradeStr) return false;
  const s = String(rowGradeStr).toLowerCase().trim();
  const digits = s.replace(/\D/g, '');
  if (digits) {
    return parseInt(digits, 10) === targetGradeNum;
  }
  return s.includes(String(targetGradeNum));
};

// Robust subject comparison mapping upper/lower and subsets like Biology/Physics under "Science"
const isSubjectMatch = (rowSubjectStr: any, targetSubjectName: string): boolean => {
  if (!rowSubjectStr) return false;
  const s = String(rowSubjectStr).toLowerCase().trim();
  const t = targetSubjectName.toLowerCase().trim();

  if (s === t || s.includes(t) || t.includes(s)) {
    return true;
  }

  if (t === 'science') {
    const scienceKeywords = ['science', 'biology', 'chemistry', 'physics', 'agriculture', 'natural', 'environmental', 'integrated'];
    return scienceKeywords.some(keyword => s.includes(keyword));
  }

  if (t === 'social studies') {
    const socialKeywords = ['social', 'geography', 'history', 'civics'];
    return socialKeywords.some(keyword => s.includes(keyword));
  }

  if (t === 'cre') {
    const creKeywords = ['cre', 'christian', 'religion', 'religious', 'theology'];
    return creKeywords.some(keyword => s.includes(keyword));
  }

  if (t === 'mathematics') {
    const mathKeywords = ['math', 'mathematics', 'arithmetic', 'algebra', 'geometry'];
    return mathKeywords.some(keyword => s.includes(keyword));
  }

  if (t === 'english') {
    const engKeywords = ['english', 'grammar', 'comprehension', 'composition'];
    return engKeywords.some(keyword => s.includes(keyword));
  }

  if (t === 'kiswahili') {
    const swaKeywords = ['kiswahili', 'swahili'];
    return swaKeywords.some(keyword => s.includes(keyword));
  }

  if (t === 'creative arts and sports') {
    const artKeywords = ['creative arts', 'sports', 'music', 'art', 'drama', 'physical education', 'pe'];
    return artKeywords.some(keyword => s.includes(keyword));
  }

  return false;
};

interface NotesTopic {
  id: string;
  title: string;
  chapter?: string;
  contentType: 'interactive' | 'html';
  data: any; // the full row from either table
}

interface NotesPageProps {
  grade?: number; // 1-12
  subject?: string; // e.g. Mathematics, Science
  username?: string;
  onBack: () => void;
}

const POPULAR_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Kiswahili',
  'Social Studies',
  'CRE',
  'Agriculture and Nutrition',
  'Creative Arts and Sports'
];

export default function NotesPage({ 
  grade = 7, 
  subject = 'Mathematics', 
  username = '', 
  onBack 
}: NotesPageProps) {
  const [selectedGrade, setSelectedGrade] = useState<number>(grade);
  const [selectedSubject, setSelectedSubject] = useState<string>(subject);
  const [loading, setLoading] = useState<boolean>(true);
  const [topics, setTopics] = useState<NotesTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<NotesTopic | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Fetch functions with robust PostgreSQL and types conversion
  const fetchInteractiveNotes = async (g: number, sub: string) => {
    try {
      // First query notes_topics for the requested grade to handle varying CBC subject columns dynamically
      let { data, error } = await supabase
        .from('notes_topics')
        .select('*')
        .eq('grade', g);

      // Retry with textual grade if number query yields nothing or if grade is a text column
      if (error || !data || data.length === 0) {
        const { data: stringData, error: stringError } = await supabase
          .from('notes_topics')
          .select('*')
          .eq('grade', String(g));
        if (!stringError && stringData && stringData.length > 0) {
          data = stringData;
        }
      }

      const rows = data || [];
      // If of type interactive, filter active nodes and match subjects using robust isSubjectMatch
      const activeRows = rows.filter(row => 
        row.is_active !== false && isSubjectMatch(row.subject, sub)
      );

      const dbTopics = activeRows.map(row => ({
        id: String(row.topic_id || row.id),
        title: row.topic || row.title || 'Untitled Topic',
        chapter: row.chapter || 'Interactive Syllabus Topics',
        contentType: 'interactive' as const,
        data: row
      }));

      // Retrieve local fallback materials matching target grade & subject to provide rich offline support
      const fbMatches = fallbackMaterials.filter(m => 
        isGradeMatch(m.grade, g) && isSubjectMatch(m.subject, sub)
      );

      const fbTopics = fbMatches.map(m => ({
        id: String(m.id),
        title: m.title || 'Untitled Topic',
        chapter: m.keywords ? String(m.keywords).split(',')[0].trim() : 'Interactive Syllabus Topics',
        contentType: 'interactive' as const,
        data: {
          id: m.id,
          topic_id: m.id,
          topic: m.title,
          subject: m.subject,
          grade: m.grade,
          html_content: m.html_content,
          sections: (m as any).sections || []
        }
      }));

      const seenIds = new Set(dbTopics.map(t => t.id));
      const uniqueFbTopics = fbTopics.filter(t => !seenIds.has(t.id));

      return [...dbTopics, ...uniqueFbTopics];
    } catch (err) {
      console.error('Error fetching interactive notes_topics:', err);
      return [];
    }
  };

  // Main reload controller
  const loadNotesData = async () => {
    setLoading(true);
    try {
      const interactiveRes = await fetchInteractiveNotes(selectedGrade, selectedSubject);
      setTopics(interactiveRes);

      // Auto-expand all chapters initially
      const chaptersMap: Record<string, boolean> = {};
      interactiveRes.forEach(t => {
        if (t.chapter) {
          chaptersMap[t.chapter] = true;
        }
      });
      setExpandedChapters(chaptersMap);
    } catch (err) {
      console.error('Crash joining study channels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotesData();
  }, [selectedGrade, selectedSubject]);

  useEffect(() => {
    const handleStrandNavigation = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { strandId, strandName } = customEvent.detail || {};
      console.log("NotesPage intercepted open-strand event:", strandId, strandName);
      
      const searchKey = (strandName || strandId || "").toLowerCase();
      if (!searchKey) return;
      
      const match = topics.find(t => 
        t.title.toLowerCase().includes(searchKey) || 
        (t.chapter && t.chapter.toLowerCase().includes(searchKey))
      );
      
      if (match) {
        setActiveTopic(match);
      }
    };

    const handleSubstrandNavigation = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { subStrandId, subStrandName } = customEvent.detail || {};
      console.log("NotesPage intercepted open-substrand event:", subStrandId, subStrandName);
      
      const searchKey = (subStrandName || subStrandId || "").toLowerCase();
      if (!searchKey) return;
      
      const match = topics.find(t => 
        t.title.toLowerCase().includes(searchKey) || 
        (t.chapter && t.chapter.toLowerCase().includes(searchKey))
      );
      
      if (match) {
        setActiveTopic(match);
      }
    };

    window.addEventListener('open-strand', handleStrandNavigation);
    window.addEventListener('open-substrand', handleSubstrandNavigation);

    return () => {
      window.removeEventListener('open-strand', handleStrandNavigation);
      window.removeEventListener('open-substrand', handleSubstrandNavigation);
    };
  }, [topics, selectedGrade, selectedSubject]);

  const groupedChapters = React.useMemo(() => {
    const map: Record<string, NotesTopic[]> = {};
    topics.forEach(t => {
      const parentChapter = t.chapter || 'General Module Resources';
      if (!map[parentChapter]) {
        map[parentChapter] = [];
      }
      map[parentChapter].push(t);
    });
    return map;
  }, [topics]);

  const toggleChapter = (chapterName: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterName]: !prev[chapterName]
    }));
  };

  // Grade list selector (Grades 1 to 12)
  const grades = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="w-full min-h-screen bg-brand-bg flex flex-col font-sans select-none relative pb-16">
      <AnimatePresence mode="wait">
        {activeTopic ? (
          /* Active Note Presentation Mode Overlay */
          <motion.div 
            key="reader"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="fixed inset-0 z-50 bg-brand-bg flex flex-col overflow-hidden"
          >
            {/* Nav Back Header strip */}
            <div className="shrink-0 bg-brand-surface py-3 px-4 border-b border-brand-border flex items-center justify-between shadow-sm relative z-30">
              <button
                type="button"
                onClick={() => setActiveTopic(null)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-[#1E3A5F] hover:bg-[#152943] transition-all active:scale-95 shadow-md"
              >
                <ArrowLeft size={14} className="text-[#F97316]" /> Back to Topics
              </button>
              
              <div className="text-right overflow-hidden">
                <motion.span 
                  initial={{ x: -120, opacity: 0 }}
                  animate={{ 
                    x: 0, 
                    opacity: 1,
                  }}
                  whileInView={{
                    x: [0, 10, -3, 6, 0],
                    transition: {
                      x: {
                        repeat: Infinity,
                        repeatType: "mirror",
                        duration: 6,
                        ease: "easeInOut"
                      }
                    }
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 85, 
                    damping: 12, 
                    delay: 0.15
                  }}
                  className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-brand-accent bg-brand-accent/5 border border-brand-accent/10 px-2.5 py-1 rounded-full cursor-default"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping" /> Grade {selectedGrade} • {selectedSubject}
                </motion.span>
              </div>
            </div>

            {/* Render exact corresponding block view */}
            <div className="flex-1 relative overflow-hidden">
              <AziLearnNotesRenderer notes={activeTopic.data} username={username} />
            </div>
          </motion.div>
        ) : (
          /* Topic Browser Stream Home Page layout */
          <motion.div 
            key="list"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full flex flex-col"
          >
            {/* Header branding block */}
            <div className="bg-brand-surface border-b border-brand-border p-4 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-10 h-10 rounded-xl border border-brand-border flex items-center justify-center hover:bg-brand-bg transition-all active:scale-95"
                >
                  <ArrowLeft size={18} className="text-brand-text" />
                </button>
                <div>
                  <h1 className="text-xl font-bold font-display tracking-tight text-[#1E3A5F]">
                    Curriculum Notes <span className="text-[#F97316]">Hub</span>
                  </h1>
                  <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-0.5">
                    Kenyan CBC/KCSE Revision Packets
                  </p>
                </div>
              </div>

              {/* Grades Horizontal Filters Option row */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="text-[9px] font-black uppercase text-brand-muted tracking-widest px-1">Enrolled Grade:</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1 shrink-0 select-none">
                  {grades.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGrade(g)}
                      className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 whitespace-nowrap transition-all border ${
                        selectedGrade === g 
                          ? 'bg-[#F97316] text-white border-[#F97316] shadow-sm transform -translate-y-0.5 shadow-[#F97316]/20' 
                          : 'bg-brand-bg border-brand-border/60 text-brand-text hover:bg-brand-border/45'
                      }`}
                    >
                      Grade {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subjects scrolling Selection row */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[9px] font-black uppercase text-brand-muted tracking-widest px-1">Curriculum Subjects:</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1 shrink-0 select-none">
                  {POPULAR_SUBJECTS.map(sub => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubject(sub)}
                      className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 whitespace-nowrap transition-all border ${
                        selectedSubject === sub 
                          ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm transform -translate-y-0.5 shadow-[#1E3A5F]/20' 
                          : 'bg-brand-bg border-brand-border/60 text-brand-text hover:bg-brand-border/45'
                      }`}
                    >
                      {sub === 'Mathematics' ? '🧮 Math' : 
                       sub === 'Science' ? '🧪 Science' :
                       sub === 'English' ? '🇬🇧 English' :
                       sub === 'Kiswahili' ? '🇰🇪 Kiswahili' :
                       sub === 'Social Studies' ? '🌍 Social Studies' :
                       sub === 'CRE' ? '⛪ CRE' : 
                       sub === 'Agriculture and Nutrition' ? '🌾 Agri & Nutrition' : 
                       sub === 'Creative Arts and Sports' ? '🎨 Arts & Sports' : sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Core body list rendering area */}
            <div className="max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#F97316]" size={36} />
                  </div>
                  <p className="text-xs text-brand-muted font-bold uppercase tracking-wider animate-pulse">Syncing Study Guides...</p>
                </div>
              ) : (
                <>
                  {/* Underline current chosen overview */}
                  {topics.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-brand-surface border border-brand-border rounded-[2rem] flex flex-col items-center">
                      <div className="w-16 h-16 bg-brand-accent/10 text-brand-accent rounded-3xl flex items-center justify-center mb-4">
                        <Book size={28} />
                      </div>
                      <h3 className="text-md font-bold text-brand-text mb-1">No study guides uploaded yet</h3>
                      <p className="text-xs text-brand-muted max-w-xs leading-relaxed font-semibold">
                        We don't have active {selectedSubject} revision packets loaded for Grade {selectedGrade} yet. Check back shortly as teachers upload new interactive segments daily!
                      </p>
                    </div>
                  ) : (
                    /* Grouped Chapters Render */
                    <div className="flex flex-col gap-5">
                      {Object.keys(groupedChapters).map((chapterName) => {
                        const chapterTopics = groupedChapters[chapterName];
                        const isExpanded = expandedChapters[chapterName] ?? true;

                        return (
                          <div 
                            key={chapterName} 
                            className="bg-brand-surface border border-brand-border/60 rounded-2xl overflow-hidden shadow-sm"
                          >
                            {/* Accordion header block */}
                            <button
                              type="button"
                              onClick={() => toggleChapter(chapterName)}
                              className="w-full px-5 py-4 flex items-center justify-between text-left border-b border-brand-border/40 hover:bg-brand-bg/15 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-[#1E3A5F]/15 border border-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F] shrink-0">
                                  <FolderOpen size={14} />
                                </div>
                                <h3 className="text-xs md:text-sm font-black text-[#1E3A5F] tracking-tight leading-none mb-0.5 leading-snug">
                                  {chapterName}
                                </h3>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded-full">
                                  {chapterTopics.length} {chapterTopics.length === 1 ? 'topic' : 'topics'}
                                </span>
                                <ChevronDown 
                                  size={16} 
                                  className={`text-[#1E3A5F] transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`} 
                                />
                              </div>
                            </button>

                            {/* Slide open topic list */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden bg-brand-surface"
                                >
                                  <div className="divide-y divide-brand-border/40">
                                    {chapterTopics.map(topic => (
                                      <button
                                        key={topic.id}
                                        type="button"
                                        onClick={() => setActiveTopic(topic)}
                                        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#F97316]/5 transition-all group"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                          <div className="w-5 h-5 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/15 flex items-center justify-center shrink-0">
                                            <Sparkles size={11} className="animate-pulse" />
                                          </div>
                                          
                                          <p className="text-xs font-bold text-brand-text truncate group-hover:text-brand-accent transition-all">
                                            {topic.title}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-[8px] font-black uppercase tracking-wider bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 px-2 py-0.5 rounded-full">
                                            Interactive ✦
                                          </span>
                                          <ChevronRight size={14} className="text-brand-muted/40 group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
