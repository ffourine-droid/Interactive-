import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FlaskConical, Loader2, AlertCircle, 
  ChevronLeft, ChevronRight, Settings, Clock, 
  FileText, PlayCircle, Mic2, X, Download, 
  BarChart3, Plus, Moon, Sun, Trash2, Smartphone, 
  ExternalLink, CheckCircle2, XCircle, MoreHorizontal,
  Home as HomeIcon, LogOut, Shield, GraduationCap, ShieldCheck, ArrowLeft, Database, Users, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Experiment } from '../types';
import { MaterialCard, SkeletonCard } from '../components/MaterialCard';
import { MaterialsList } from '../components/MaterialsList';
import { SlidesViewer } from '../components/SlidesViewer';
import { InteractiveNotes } from '../components/InteractiveNotes';
import { fallbackMaterials } from '../data/fallbackMaterials';

interface HomeProps {
  onBack: () => void;
  onAdminClick: () => void;
  onTeacherClick: () => void;
  onTeacherDashboardClick: () => void;
  onAssignmentsClick: () => void;
  onExamsClick: () => void;
  onArenaClick: () => void;
  onAdminTerminalClick: () => void;
  onParentClick: () => void;
  onStoriesClick: () => void;
  onCommunityClick: () => void;
  onNotesClick: (grade?: number, subject?: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  selectedClass: string | null;
  setSelectedClass: (grade: string | null) => void;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
}

export default function Home({ 
  onBack, onAdminClick, onAdminTerminalClick, onTeacherClick, onTeacherDashboardClick, 
  onAssignmentsClick, onExamsClick, onArenaClick, onParentClick, onStoriesClick,
  onCommunityClick, onNotesClick, theme, setTheme,
  selectedClass, setSelectedClass, onTermsClick, onPrivacyClick
}: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'slides' | 'audio' | 'pdf' | 'pptx' | null>(null);
  const [results, setResults] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const nextClicks = logoClicks + 1;
    if (nextClicks >= 10) { onAdminTerminalClick(); setLogoClicks(0); }
    else if (nextClicks >= 5) { onAdminClick(); }
    setLogoClicks(nextClicks);
  };

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('azilearn_search_history');
      try {
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [searchCache, setSearchCache] = useState<Record<string, Experiment[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('azilearn_search_cache');
      try {
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'slides' | 'pdf' | 'ppt' | 'notes'>('slides');
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isOpening, setIsOpening] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const middleSearchRef = useRef<HTMLInputElement>(null);
  const lastRequestId = useRef(0);
  const { showToast } = useToast();

  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('azilearn_student');
    try {
      setStudent(saved ? JSON.parse(saved) : null);
    } catch {
      setStudent(null);
    }
  }, [isSidebarOpen, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('azilearn_student');
    localStorage.removeItem('azilearn_student_profile');
    localStorage.removeItem('azilearn_arena_player');
    sessionStorage.removeItem('azilearn_student_name');
    setStudent(null);
    showToast('Logged out successfully! 👋', 'success');
  };

  const handleClassSelect = (grade: string) => {
    setSelectedClass(grade);
    setCategory(null);
    setHasSearched(false);
    setSearchQuery('');
    setDebouncedQuery('');
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'select_class', { event_category: 'engagement', event_label: grade });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const keys = Object.keys(searchCache);
      if (keys.length > 20) {
        const limitedCache: Record<string, Experiment[]> = {};
        keys.slice(-20).forEach(key => { limitedCache[key] = searchCache[key]; });
        localStorage.setItem('azilearn_search_cache', JSON.stringify(limitedCache));
      } else {
        localStorage.setItem('azilearn_search_cache', JSON.stringify(searchCache));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [searchCache]);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('azilearn_search_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (query: string, cat: string | null = category, currentClass: string | null = selectedClass, shouldBlur: boolean = false) => {
    const requestId = ++lastRequestId.current;
    if (cat === null) {
      setResults([]);
      setLoading(false);
      return;
    }
    const cacheKey = `${query.trim().toLowerCase()}-${cat}-${currentClass || 'all'}`;
    if (shouldBlur && searchInputRef.current) searchInputRef.current.blur();
    if (searchCache[cacheKey]) {
      setResults(searchCache[cacheKey]);
      if (!query.trim() && !currentClass) setLoading(false);
    } else {
      setLoading(true);
      setResults([]);
    }
    setError(null);
    setHasSearched(true);
    if (query) {
      addToHistory(query);
      if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'search', { search_term: query });
      }
    }
    try {
      let supabaseQuery = supabase
        .from('experiments')
        .select('id, title, keywords, subject, grade, created_at, audio_url, slides, pdf_url, ppt_url, category, html_content');
      if (currentClass) {
        const numGrade = currentClass.replace(/\D/g, '');
        const gradesToQuery = [currentClass];
        if (numGrade && numGrade !== currentClass) {
          gradesToQuery.push(numGrade);
        }
        supabaseQuery = supabaseQuery.in('grade', gradesToQuery);
      }
      if (query.trim()) supabaseQuery = supabaseQuery.or(`keywords.ilike.%${query}%,title.ilike.%${query}%,subject.ilike.%${query}%`);
      if (!query.trim() && cat === 'all' && !currentClass) {
        supabaseQuery = supabaseQuery.limit(10);
      } else {
        supabaseQuery = supabaseQuery.limit(50);
      }

      // Add a 2.5-second timeout to prevent database load hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2500)
      );

      const fetchPromise = supabaseQuery.order('created_at', { ascending: false });
      
      const experimentsResult = await Promise.race([
        fetchPromise,
        timeoutPromise.then(() => ({ data: null, error: new Error("Timeout") }))
      ]).catch(err => ({ data: null, error: err })) as any;

      const { data, error: fetchError } = experimentsResult;
      if (fetchError && !data) throw fetchError;
      if (requestId !== lastRequestId.current) return;

      // Filter out any materials that represent notes
      let filteredData = (data || []).filter((exp: any) => 
        exp.category !== 'notes' && 
        !exp.is_interactive_note && 
        !(exp.slides?.length === 0 && !exp.audio_url)
      );

      if (filteredData.length === 0) {
        // Fallback to local files if database holds no records
        let localFallback = fallbackMaterials.filter((exp: any) => 
          exp.category !== 'notes' && 
          !(exp.slides?.length === 0 && !exp.audio_url)
        );
        if (currentClass) {
          const numGrade = currentClass.replace(/\D/g, '');
          localFallback = localFallback.filter(m => 
            m.grade === String(currentClass) || 
            `Grade ${m.grade}` === String(currentClass) || 
            m.grade === numGrade
          );
        }
        if (cat !== 'all') {
          localFallback = localFallback.filter(exp => {
            if (cat === 'slides') return exp.slides && Array.isArray(exp.slides) && exp.slides.length > 0;
            if (cat === 'audio') return !!exp.audio_url;
            if (cat === 'pdf') return !!exp.pdf_url;
            if (cat === 'pptx') return !!exp.ppt_url;
            return true;
          });
        }
        if (query.trim()) {
          const q = query.toLowerCase();
          localFallback = localFallback.filter(m => 
            m.title.toLowerCase().includes(q) || 
            m.keywords.toLowerCase().includes(q) || 
            m.subject?.toLowerCase().includes(q)
          );
        }
        filteredData = localFallback;
      }
      if (cat !== 'all' && filteredData.length > 0) {
        filteredData = filteredData.filter(exp => {
          if (cat === 'slides') return exp.slides && Array.isArray(exp.slides) && exp.slides.length > 0;
          if (cat === 'audio') return !!exp.audio_url;
          if (cat === 'pdf') return !!exp.pdf_url;
          if (cat === 'pptx') return !!exp.ppt_url;
          return true;
        });
      }
      setResults(filteredData);
      setSearchCache(prev => ({ ...prev, [cacheKey]: filteredData }));
    } catch (err: any) {
      if (requestId !== lastRequestId.current) return;
      // Graceful fallback to rich preloaded materials if server database is down/unavailable
      let filteredFallback = fallbackMaterials;
      if (currentClass) {
        const numGrade = currentClass.replace(/\D/g, '');
        filteredFallback = filteredFallback.filter(m => 
          m.grade === String(currentClass) || 
          `Grade ${m.grade}` === String(currentClass) || 
          m.grade === numGrade
        );
      }
      if (cat !== 'all') {
        filteredFallback = filteredFallback.filter(exp => {
          if (cat === 'slides') return exp.slides && Array.isArray(exp.slides) && exp.slides.length > 0;
          if (cat === 'audio') return !!exp.audio_url;
          if (cat === 'pdf') return !!exp.pdf_url;
          if (cat === 'pptx') return !!exp.ppt_url;
          return true;
        });
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        filteredFallback = filteredFallback.filter(m => 
          m.title.toLowerCase().includes(q) || 
          m.keywords.toLowerCase().includes(q) || 
          m.subject?.toLowerCase().includes(q)
        );
      }
      setResults(filteredFallback);
      setSearchCache(prev => ({ ...prev, [cacheKey]: filteredFallback }));
    } finally {
      if (requestId === lastRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) setLoading(true);
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    handleSearch(debouncedQuery, category, selectedClass);
  }, [debouncedQuery, category, selectedClass]);

  const openExperiment = async (exp: Experiment) => {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'view_lesson', { lesson_id: exp.id, lesson_title: exp.title, subject: exp.subject, grade: exp.grade });
    }
    const setInitialViewMode = (data: Experiment) => {
      setZoom(100); setPan({ x: 0, y: 0 });
      if (category === 'notes' && (data.html_content || data.sections)) {
        setViewMode('notes');
      } else if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        setViewMode('slides');
      } else if (data.pdf_url) {
        setViewMode('pdf');
      } else if (data.ppt_url) {
        setViewMode('ppt');
      } else {
        setViewMode('notes'); // Always fallback to notes if no other visual assets
      }
    };
    if (exp.html_content || exp.sections || (exp.slides && exp.slides.length > 0) || exp.pdf_url || exp.ppt_url) {
      setSelectedExperiment(exp);
      setInitialViewMode(exp);
      return;
    }
    setIsOpening(true);
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*') // Get everything to ensure no missing fields
        .eq('id', exp.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setSelectedExperiment(data);
        setInitialViewMode(data);
        setResults(prev => prev.map(item => item.id === data.id ? { ...item, ...data } : item));
      }
    } catch (err: any) {
      showToast('Failed to load material content.', 'error');
      console.error('Error loading experiment:', err);
    } finally {
      setIsOpening(false);
    }
  };

  const rippleEffect = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    r.style.width = `${size}px`;
    r.style.height = `${size}px`;
    r.style.left = `${e.clientX - rect.left - size / 2}px`;
    r.style.top = `${e.clientY - rect.top - size / 2}px`;
    el.appendChild(r);
    setTimeout(() => r.remove(), 500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 320 } }
  };

  return (
    <div className="w-full max-w-[430px] mx-auto bg-brand-bg min-h-dvh relative flex flex-col overflow-x-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-[300] bg-brand-bg/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[310px] z-[301] bg-brand-surface border-r border-brand-border p-5 shadow-2xl flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#FF6B2C] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF6B2C]/20">
                    <FlaskConical size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight leading-none text-brand-text">AziLearn</h2>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-brand-muted mt-1">Student Portal</p>
                  </div>
                </div>
                <button 
                   onClick={() => setIsSidebarOpen(false)}
                   className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted active:text-brand-accent transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 space-y-5 overflow-y-auto no-scrollbar pr-1 pb-6">
                {/* Profile Card */}
                <div className="relative overflow-hidden bg-brand-bg/50 border border-brand-border rounded-[20px] p-4 flex items-center gap-3">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2C] to-purple-500" />
                  <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl shrink-0 border border-orange-500/25">
                    🎓
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xs font-bold text-brand-text truncate leading-tight mb-0.5">
                      {student ? student.name : 'Student Name'}
                    </h3>
                    <p className="text-[9px] text-brand-muted font-bold truncate leading-none">
                      {student ? `${student.grade || 'Grade 9'} • Student ID` : 'Guest Profile • Primary'}
                    </p>
                  </div>
                  <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ● Active
                  </span>
                </div>

                {/* Navigation Groups */}
                {[
                  {
                    label: 'Navigate',
                    items: [
                      { title: 'Home Hub', subtitle: 'Your learning dashboard', icon: '🏠', color: 'o', action: () => { setActiveTab('home'); setIsSidebarOpen(false); setSelectedClass(null); } },
                      { title: 'Curriculum Notes', subtitle: 'Interactive & classic study guides', icon: '📚', color: 'o', action: () => { onNotesClick(); setIsSidebarOpen(false); } },
                      { title: 'Stories to Learn', subtitle: 'Engaging reading content', icon: '📖', color: 'b', action: () => { onStoriesClick(); setIsSidebarOpen(false); } },
                      { title: 'My Classes', subtitle: 'All your subjects', icon: '📄', color: 'g', action: () => { setActiveTab('home'); setIsSidebarOpen(false); setSelectedClass(null); } },
                      { title: 'My Work', subtitle: 'Assignments & submissions', icon: '💼', color: 'p', action: () => { onAssignmentsClick(); setIsSidebarOpen(false); } }
                    ]
                  },
                  {
                    label: 'Assessment',
                    items: [
                      { title: 'Timed Exams', subtitle: 'Practice under time pressure', icon: '⏱️', color: 'y', action: () => { onExamsClick(); setIsSidebarOpen(false); } },
                      { title: 'School Forum', subtitle: 'Discuss with classmates', icon: '💬', color: 'b', action: () => { onCommunityClick(); setIsSidebarOpen(false); } }
                    ]
                  },
                  {
                    label: 'Account',
                    items: [
                      { title: 'Parent Portal', subtitle: 'Guardian access & reports', icon: '🛡️', color: 'g', action: () => { onParentClick(); setIsSidebarOpen(false); } },
                      { title: 'App Settings', subtitle: 'Preferences & display', icon: '⚙️', color: 'gray', action: () => { setActiveTab('settings'); setIsSidebarOpen(false); } }
                    ]
                  }
                ].map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="text-[9px] font-black text-brand-muted uppercase tracking-[0.12em] pl-1">{group.label}</h3>
                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const colors: Record<string, { bg: string, text: string }> = {
                          o: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-500' },
                          b: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-500' },
                          g: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-500' },
                          p: { bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-500' },
                          y: { bg: 'bg-yellow-500/10 dark:bg-yellow-500/15', text: 'text-yellow-600 dark:text-yellow-500' },
                          gray: { bg: 'bg-slate-500/10 dark:bg-slate-500/15', text: 'text-slate-500' }
                        };
                        const clr = colors[item.color] || colors.gray;
                        return (
                          <button
                            key={item.title}
                            onClick={item.action}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-[16px] border border-brand-border/40 bg-brand-surface hover:border-brand-accent/20 active:scale-[0.98] transition-all"
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${clr.bg} ${clr.text}`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-display text-xs font-bold leading-tight text-brand-text">{item.title}</h4>
                              <p className="text-[9px] text-brand-muted font-medium mt-0.5 truncate leading-none">{item.subtitle}</p>
                            </div>
                            <span className="text-base font-bold text-brand-muted/70 shrink-0">›</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Exit Actions */}
                <div className="space-y-1.5 pt-2 border-t border-brand-border/40">
                  {student && (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-[16px] border border-red-500/10 bg-brand-surface hover:border-red-500/20 active:scale-[0.98] transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 bg-red-500/10 text-red-500">
                        🚪
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display text-xs font-bold leading-tight text-red-500">Exit Profile</h4>
                        <p className="text-[9px] text-red-400 mt-0.5 truncate leading-none">Unlink student identification</p>
                      </div>
                      <span className="text-base font-bold text-red-500/70 shrink-0">›</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => { setIsSidebarOpen(false); onBack(); }}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-[16px] border border-red-500/10 bg-brand-surface hover:border-red-500/20 active:scale-[0.98] transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 bg-red-500/10 text-red-500">
                      🚪
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display text-xs font-bold leading-tight text-red-500">Exit Portal</h4>
                      <p className="text-[9px] text-red-400 mt-0.5 truncate leading-none">Logout of student portal</p>
                    </div>
                    <span className="text-base font-bold text-red-500/70 shrink-0">›</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 pb-28">

        {/* ── STICKY SEARCH BAR ── */}
        {activeTab === 'home' && selectedClass && (
          <div className="sticky top-0 z-[100] px-3 pt-3 pb-2 bg-brand-bg/90 backdrop-blur-sm pointer-events-none">
            <div className={`flex items-center bg-brand-surface rounded-full shadow-md px-3 h-11 gap-2 pointer-events-auto border transition-all duration-200 ${isSearchFocused ? 'border-brand-accent ring-2 ring-brand-accent/10' : 'border-brand-border/50'}`}>
              <Search className={`${isSearchFocused ? 'text-brand-accent' : 'text-brand-muted'} transition-colors shrink-0`} size={16} />
              <input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-brand-text placeholder:text-brand-muted/60 min-w-0"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery, category, selectedClass, true); }}
              />
              <button className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform shrink-0">
                <span className="font-sans font-black text-xs">A</span>
              </button>
            </div>
          </div>
        )}

        {/* ── HOME TAB CONTENT ── */}
        {activeTab === 'home' && (
          <AnimatePresence mode="wait">
            {!selectedClass ? (
              /* ── GRADE SELECTION ── */
              <motion.div
                key="class-selection"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="px-4 py-5 space-y-5"
              >
                {/* Header */}
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onBack}
                      className="w-9 h-9 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted active:text-brand-accent transition-colors shadow-sm"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div
                      className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                      onClick={handleLogoClick}
                    >
                      <div className="w-9 h-9 bg-[#FF6B2C] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF6B2C]/20 rotate-12">
                        <FlaskConical size={18} />
                      </div>
                      <div>
                        <h1 className="text-lg font-black text-brand-text tracking-tight leading-none">AziLearn</h1>
                        <p className="text-[9px] text-brand-muted font-black uppercase tracking-wider whitespace-nowrap">Study Materials</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-brand-surface border border-brand-border px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 max-w-[140px] truncate">
                      <span className="text-[10px] font-bold text-brand-text truncate">
                        {student ? student.name : 'Welcome!'}
                      </span>
                      <span className="text-sm shrink-0">🧠</span>
                    </div>
                    {student && (
                      <button
                        onClick={handleLogout}
                        className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 flex items-center justify-center active:scale-90 transition-all shrink-0"
                        title="Logout Profile"
                      >
                        <LogOut size={14} />
                      </button>
                    )}
                  </div>
                </header>



                {/* Grades sections */}
                <div className="space-y-5">
                  
                  {/* Primary School (Gr 1-6) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-brand-muted">Primary School</h2>
                      </div>
                      <span className="text-[9px] font-bold text-brand-muted bg-brand-surface/80 border border-brand-border/40 px-2 py-0.5 rounded-md">Gr 1 – 6</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }, (_, i) => {
                        const gradeVal = i + 1;
                        const gradeStr = `Grade ${gradeVal}`;
                        return (
                          <div
                            key={gradeStr}
                            onClick={(e) => { rippleEffect(e); handleClassSelect(gradeStr); }}
                            className="group relative overflow-hidden bg-brand-surface border border-brand-border/40 hover:border-emerald-500/30 rounded-[16px] flex flex-col items-center justify-center p-3 min-h-[75px] transition-all duration-300 shadow-sm cursor-pointer select-none active:scale-[0.97]"
                          >
                            <span className="font-display text-xl font-bold text-brand-text group-hover:text-emerald-500 transition-colors leading-none mb-0.5">{gradeVal}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-brand-muted/70">Grade {gradeVal}</span>
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Junior Secondary (Gr 7-9) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-brand-accent rounded-full" />
                        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-brand-muted">Junior Secondary</h2>
                      </div>
                      <span className="text-[9px] font-bold text-brand-muted bg-brand-surface/80 border border-brand-border/40 px-2 py-0.5 rounded-md">Gr 7 – 9</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }, (_, i) => {
                        const gradeVal = i + 7;
                        const gradeStr = `Grade ${gradeVal}`;
                        return (
                          <div
                            key={gradeStr}
                            onClick={(e) => { rippleEffect(e); handleClassSelect(gradeStr); }}
                            className="group relative overflow-hidden bg-brand-surface border border-brand-border/40 hover:border-brand-accent/30 rounded-[16px] flex flex-col items-center justify-center p-3 min-h-[75px] transition-all duration-300 shadow-sm cursor-pointer select-none active:scale-[0.97]"
                          >
                            <span className="font-display text-xl font-bold text-brand-text group-hover:text-brand-accent transition-colors leading-none mb-0.5">{gradeVal}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-brand-muted/70">Grade {gradeVal}</span>
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Senior Secondary (Gr 10-12) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-purple-500 rounded-full" />
                        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-brand-muted">Senior Secondary</h2>
                      </div>
                      <span className="text-[9px] font-bold text-brand-muted bg-brand-surface/80 border border-brand-border/40 px-2 py-0.5 rounded-md">Gr 10 – 12</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }, (_, i) => {
                        const gradeVal = i + 10;
                        const gradeStr = `Grade ${gradeVal}`;
                        return (
                          <div
                            key={gradeStr}
                            onClick={(e) => { rippleEffect(e); handleClassSelect(gradeStr); }}
                            className="group relative overflow-hidden bg-brand-surface border border-brand-border/40 hover:border-purple-500/30 rounded-[16px] flex flex-col items-center justify-center p-3 min-h-[75px] transition-all duration-300 shadow-sm cursor-pointer select-none active:scale-[0.97]"
                          >
                            <span className="font-display text-xl font-bold text-brand-text group-hover:text-purple-500 transition-colors leading-none mb-0.5">{gradeVal}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-brand-muted/70">Grade {gradeVal}</span>
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Access Horizon Cards */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                      <h2 className="font-display text-xs font-bold uppercase tracking-wider text-brand-muted font-black">Quick Access</h2>
                    </div>

                    {/* KCSE Revision Card */}
                    <button
                      onClick={(e) => { rippleEffect(e); handleClassSelect('KCSE'); }}
                      className="relative overflow-hidden w-full bg-brand-surface border border-brand-border/40 hover:border-yellow-500/20 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm group text-left"
                    >
                      {/* Left vertical yellow accent bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
                      <div className="flex items-center gap-3 pl-1">
                        <div className="w-11 h-11 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 text-xl font-bold shrink-0">
                          📋
                        </div>
                        <div>
                          <h3 className="font-display text-xs font-bold text-brand-text group-hover:text-yellow-500 transition-colors leading-tight">KCSE Revision</h3>
                          <p className="text-[10px] font-medium text-brand-muted mt-0.5 leading-snug">National Assessment · Secondary</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-brand-muted group-hover:text-brand-text transition-colors shrink-0">›</span>
                    </button>

                    {/* School Forum Card */}
                    <button
                      onClick={onCommunityClick}
                      className="relative overflow-hidden w-full bg-brand-surface border border-brand-border/40 hover:border-blue-500/20 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm group text-left"
                    >
                      {/* Left vertical blue accent bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                      <div className="flex items-center gap-3 pl-1">
                        <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 text-xl font-bold shrink-0">
                          💬
                        </div>
                        <div>
                          <h3 className="font-display text-xs font-bold text-brand-text group-hover:text-blue-500 transition-colors leading-tight">School Forum</h3>
                          <p className="text-[10px] font-medium text-brand-muted mt-0.5 leading-snug">Connect & discuss with classmates</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-brand-muted group-hover:text-brand-text transition-colors shrink-0">›</span>
                    </button>
                  </div>

                </div>
              </motion.div>
            ) : (
              /* ── MATERIALS VIEW ── */
              <motion.div
                key="materials-view"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="min-h-dvh bg-brand-bg pb-24"
              >
                {/* Class Header */}
                <div className="bg-brand-surface border-b border-brand-border sticky top-[52px] z-40 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => { setSelectedClass(null); setHasSearched(false); setResults([]); setSearchQuery(''); }}
                      className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-text active:scale-90 transition-transform"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div>
                      <h2 className="text-base font-black tracking-tight leading-none">{selectedClass}</h2>
                      <p className="text-[8px] font-black text-brand-muted uppercase tracking-wider whitespace-nowrap">Study Materials</p>
                    </div>
                  </div>

                  {/* Category Filter — 5 options (Excluding General Notes) */}
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'all', label: 'All', icon: FileText },
                      { id: 'slides', label: 'Slides', icon: PlayCircle },
                      { id: 'audio', label: 'Audio', icon: Mic2 },
                      { id: 'pptx', label: 'PPTX', icon: PlayCircle },
                      { id: 'pdf', label: 'PDF', icon: FileText },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id as any)}
                        className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-0.5 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all border ${
                          category === cat.id
                            ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                            : 'bg-brand-surface border-brand-border text-brand-text hover:border-brand-accent/40'
                        }`}
                      >
                        <cat.icon size={10} className="shrink-0 mb-0.5" />
                        <span className="leading-none text-[8px]">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-4 pt-3 space-y-6">
                  {/* Grade-Tailored Feature Grid / Launchers */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] uppercase font-black tracking-wider text-brand-muted flex items-center gap-1.5">
                        <Users size={14} className="text-brand-accent animate-pulse" />
                        Grade Features & Activities
                      </h3>
                      <span className="text-[8px] font-black uppercase tracking-wider bg-brand-surface border border-brand-border/40 px-2.5 py-0.5 rounded-full text-brand-muted">
                        Tailored Hub
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        {
                          id: 'homework',
                          label: 'Homework.....',
                          sub: 'Access homework tasks and deadlines',
                          icon: FileText,
                          color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/15',
                          action: onAssignmentsClick
                        },
                        {
                          id: 'assignment',
                          label: 'Assignment....',
                          sub: 'Submit assigned exercises and files',
                          icon: FileText,
                          color: 'text-violet-500 bg-violet-500/10 border-violet-500/15',
                          action: onAssignmentsClick
                        },
                        {
                          id: 'arena',
                          label: 'Students arena.......',
                          sub: 'Join multiplayer learning and quiz challenges',
                          icon: FlaskConical,
                          color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15',
                          action: onArenaClick
                        },
                        {
                          id: 'stories',
                          label: 'Story quest......',
                          sub: 'Embark on engaging adventure learning quests',
                          icon: BookOpen,
                          color: 'text-[#FF6B2C] bg-[#FF6B2C]/10 border-[#FF6B2C]/15',
                          action: onStoriesClick
                        },
                        {
                          id: 'forum',
                          label: 'Combined school forum...',
                          sub: 'Learn, chat, and discuss with classes',
                          icon: Users,
                          color: 'text-blue-500 bg-blue-500/10 border-blue-500/15',
                          action: onCommunityClick
                        }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={(e) => { rippleEffect(e); item.action(); }}
                          className="group relative overflow-hidden bg-brand-surface border border-brand-border/40 hover:border-brand-accent/25 rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all shadow-sm w-full"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                            <item.icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display text-[11.5px] font-black text-brand-text group-hover:text-brand-accent transition-colors leading-tight">
                              {item.label}
                            </h4>
                            <p className="text-[9px] font-medium text-brand-muted leading-tight mt-0.5 truncate">
                              {item.sub}
                            </p>
                          </div>
                          {/* Chevron */}
                          <span className="text-xs font-bold text-brand-muted/55 group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all">›</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {category === null ? (
                    <div className="py-8 text-center bg-brand-surface/45 rounded-2xl border border-dashed border-brand-border/60">
                      <div className="w-10 h-10 bg-brand-accent/5 rounded-full flex items-center justify-center mx-auto mb-2.5 text-brand-accent/60">
                        <FileText size={18} />
                      </div>
                      <p className="text-[10.5px] font-black text-brand-text uppercase tracking-wider mb-1">💡 View Class Materials</p>
                      <p className="text-[9.5px] font-medium text-brand-muted px-8 leading-relaxed max-w-xs mx-auto">
                        Tap any format in the top navigation bar (Slides, Audio, PPTX, PDF) to load the shared curriculum worksheets and resources!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Count & Study Materials list */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-[10px] uppercase font-black tracking-wider text-brand-muted flex items-center gap-1.5">
                            <BookOpen size={13} className="text-brand-accent" />
                            Study Materials
                          </h3>
                          <span className="text-[8.5px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                            {results.length} Items {category !== 'all' && `(${category.toUpperCase()})`}
                          </span>
                        </div>

                        {loading && results.length === 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                          </div>
                        ) : error ? (
                          <div className="text-center py-10 bg-brand-surface/50 rounded-2xl border border-dashed border-brand-border">
                            <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
                            <p className="text-brand-text text-[10px] font-bold">{error}</p>
                            <button 
                              onClick={() => handleSearch(searchQuery)}
                              className="mt-2 text-brand-accent font-black uppercase tracking-widest text-[9px]"
                            >
                              Try Again
                            </button>
                          </div>
                        ) : results.length === 0 ? (
                          <div className="text-center py-10 bg-brand-surface border border-brand-border rounded-2xl">
                            <h3 className="text-[11px] font-extrabold text-brand-text mb-1">No shared {category.toUpperCase()} materials found</h3>
                            <p className="text-brand-muted text-[9.5px] font-medium px-6">We couldn't find any documents or slides for this category right now.</p>
                          </div>
                        ) : (
                          <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 gap-3"
                          >
                            {results.map((exp) => (
                              <motion.div key={exp.id} variants={itemVariants}>
                                <MaterialCard 
                                  exp={exp} 
                                  onClick={(e) => {
                                    rippleEffect(e);
                                    openExperiment(exp);
                                  }}
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>

                      {/* Teacher Shared School-Specific Materials AT THE VERY BOTTOM */}
                      {selectedClass && (
                        <div className="space-y-3 pt-2.5 border-t border-brand-border/45">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] uppercase font-black tracking-wider text-brand-muted flex items-center gap-1.5">
                              <GraduationCap size={14} className="text-[#FF6B2C]" />
                              Sent by Your Teachers
                            </h3>
                            {student && student.grade === selectedClass && (
                              <span className="text-[8px] font-black uppercase tracking-wider bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/15 px-2 py-0.5 rounded-full">
                                My Class
                              </span>
                            )}
                          </div>
                          <MaterialsList 
                            grade={selectedClass}
                            classId={student && student.grade === selectedClass ? student.class_id : null}
                            isTeacher={false}
                          />
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

    {/* SETTINGS VIEW */}
      {activeTab === 'settings' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-4 py-6 space-y-6"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-brand-text tracking-tight">Settings</h2>
            <p className="text-brand-muted text-[13px] font-medium">Manage your account and preferences</p>
          </div>

          <div className="space-y-3">
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-sm space-y-4">
              {/* Theme Toggle */}
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-brand-text text-sm group-hover:text-brand-accent transition-colors">
                      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </p>
                    <p className="text-[11px] text-brand-muted">Switch app appearance</p>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-brand-accent' : 'bg-brand-border'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
                </div>
              </button>

              <div className="h-px bg-brand-border/50" />

              {/* Clear Cache */}
              <button 
                onClick={() => {
                  localStorage.removeItem('azilearn_search_cache');
                  setSearchCache({});
                  showToast('App cache cleared!', 'success');
                }}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                    <Trash2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-brand-text text-sm group-hover:text-brand-accent transition-colors">Clear App Cache</p>
                    <p className="text-[11px] text-brand-muted">Free up space and refresh data</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-all">
                  <ChevronRight size={16} />
                </div>
              </button>

              <div className="h-px bg-brand-border/50" />

              {/* WhatsApp Link */}
              <a 
                href="https://wa.me/254799426863" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-brand-text text-sm group-hover:text-brand-accent transition-colors">Let's Talk</p>
                    <p className="text-[11px] text-brand-muted">Chat with us on WhatsApp</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-all">
                  <ExternalLink size={16} />
                </div>
              </a>

              <div className="h-px bg-brand-border/50" />

              <button 
                onClick={onTeacherDashboardClick}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                    <BarChart3 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-brand-text text-sm group-hover:text-brand-accent transition-colors">Teacher Portal</p>
                    <p className="text-[11px] text-brand-muted">Points & Grade work</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-all">
                  <ChevronRight size={16} />
                </div>
              </button>

              <div className="h-px bg-brand-border/50" />

              <button 
                onClick={onParentClick}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-brand-text text-sm group-hover:text-brand-accent transition-colors">Parent Portal</p>
                    <p className="text-[11px] text-brand-muted">Check your child's progress</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-all">
                  <ChevronRight size={16} />
                </div>
              </button>

              <div className="h-px bg-brand-border/50" />

              {/* Terms of Use */}
              <button 
                onClick={onTermsClick}
                className="w-full flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF6B2C]/10 rounded-xl flex items-center justify-center text-[#FF6B2C]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-brand-text text-sm group-hover:text-[#FF6B2C] transition-colors">Terms of Use</p>
                    <p className="text-[11px] text-brand-muted">AziLearn student and teacher rules & agreements</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-[#FF6B2C] transition-all">
                  <ChevronRight size={16} />
                </div>
              </button>

              <div className="h-px bg-brand-border/50" />

              {/* Privacy Policy */}
              <button 
                onClick={onPrivacyClick}
                className="w-full flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-brand-text text-sm group-hover:text-emerald-500 transition-colors">Privacy Policy</p>
                    <p className="text-[11px] text-brand-muted">Learn how we process and protect student records</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-[#FF6B2C] transition-all">
                  <ChevronRight size={16} />
                </div>
              </button>

              <div className="h-px bg-brand-border/50" />

              {student && (
                <>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                        <LogOut size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-brand-text text-sm group-hover:text-red-500 transition-colors">Logout Profile</p>
                        <p className="text-[11px] text-brand-muted">Log out of student identity ({student.name})</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all">
                      <LogOut size={16} />
                    </div>
                  </button>

                  <div className="h-px bg-brand-border/50" />
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      </div>

      {/* BOTTOM SHEET NAV - Simplified or Removed based on user request */}
      <AnimatePresence>
        {!selectedExperiment && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-6 right-6 z-[200] bg-brand-surface/90 backdrop-blur-xl border border-brand-border/45 shadow-2xl rounded-[2rem] p-1.5"
          >
            <div className="flex justify-around items-center">
              {[
                { id: 'home', label: 'Home', icon: HomeIcon, action: () => { setActiveTab('home'); setSelectedClass(null); } },
                { id: 'notes', label: 'Notes', icon: BookOpen, action: () => { onNotesClick(); } },
                { id: 'settings', label: 'Settings', icon: Settings, action: () => setActiveTab('settings') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    rippleEffect(e);
                    tab.action();
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-[22px] transition-all duration-200 border ${
                    activeTab === tab.id 
                      ? 'bg-[#FF6B2C]/10 border-[#FF6B2C]/20 text-[#FF6B2C] shadow-sm font-bold scale-[1.02]' 
                      : 'text-brand-muted hover:text-brand-text border-transparent'
                  }`}
                >
                  <tab.icon size={15} />
                  {activeTab === tab.id && <span className="text-[10px] font-bold uppercase tracking-wider font-display">{tab.label}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOADING OVERLAY FOR OPENING MATERIAL */}
      <AnimatePresence>
        {isOpening && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brand-bg/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 bg-brand-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-accent/20 animate-bounce">
              <FlaskConical className="text-white" size={32} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-brand-text font-black tracking-tighter text-xl">Opening Material...</h3>
              <p className="text-brand-muted text-[10px] font-black uppercase tracking-widest">Getting things ready</p>
            </div>
            <Loader2 className="animate-spin text-brand-accent mt-4" size={24} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Experiment Modal */}
      <AnimatePresence>
        {selectedExperiment && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[9999] bg-brand-bg flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-surface/80 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedExperiment(null)}
                  className="w-10 h-10 rounded-xl border border-brand-border flex items-center justify-center hover:bg-brand-surface transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                  <h2 className="font-bold text-base text-brand-text leading-none mb-1 truncate max-w-[200px]">{selectedExperiment.title}</h2>
                  <p className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">Study Material</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedExperiment(null)}
                  className="bg-brand-accent text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm"
                >
                  Exit
                </button>
              </div>
            </div>
            
            <div className="flex bg-brand-surface border-b border-brand-border px-2 overflow-x-auto no-scrollbar shrink-0">
              {selectedExperiment.slides && selectedExperiment.slides.length > 0 && (
                <button 
                  onClick={() => { setViewMode('slides'); setZoom(100); setPan({ x: 0, y: 0 }); }}
                  className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${viewMode === 'slides' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted'}`}
                >
                  Slides
                </button>
              )}
              {selectedExperiment.pdf_url && (
                <button 
                  onClick={() => { setViewMode('pdf'); setZoom(100); setPan({ x: 0, y: 0 }); }}
                  className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${viewMode === 'pdf' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted'}`}
                >
                  PDF
                </button>
              )}
              {selectedExperiment.ppt_url && (
                <button 
                  onClick={() => { setViewMode('ppt'); setZoom(100); setPan({ x: 0, y: 0 }); }}
                  className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${viewMode === 'ppt' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted'}`}
                >
                  PPT
                </button>
              )}

            </div>
            
            <div className="flex-1 relative bg-brand-bg overflow-hidden">
              {viewMode === 'slides' && selectedExperiment.slides && selectedExperiment.slides.length > 0 && (
                <div className="absolute inset-0">
                  <SlidesViewer 
                    slides={selectedExperiment.slides} 
                    audioUrl={selectedExperiment.audio_url} 
                  />
                </div>
              )}
              
              <div 
                className={`absolute inset-0 flex flex-col ${viewMode === 'slides' ? 'hidden' : 'flex'}`}
              >
                <div 
                  className={`flex-1 w-full bg-brand-bg relative ${viewMode === 'notes' && (zoom !== 100 || pan.x !== 0 || pan.y !== 0) ? 'transition-transform duration-300 origin-center' : ''}`}
                  style={viewMode === 'notes' && (zoom !== 100 || pan.x !== 0 || pan.y !== 0) ? { 
                    transform: `scale(${zoom / 100}) translate(${pan.x}%, ${pan.y}%)`,
                  } : {}}
                >
                  {viewMode === 'pdf' && selectedExperiment.pdf_url && (
                    <iframe
                      src={selectedExperiment.pdf_url.includes('drive.google.com') 
                        ? selectedExperiment.pdf_url.replace('/view', '/preview').replace('/edit', '/preview')
                        : `${selectedExperiment.pdf_url}#toolbar=1`
                      }
                      className="absolute inset-0 w-full h-full border-none bg-white"
                      title="PDF Viewer"
                    />
                  )}

                  {viewMode === 'ppt' && selectedExperiment.ppt_url && (
                    <iframe
                      src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(selectedExperiment.ppt_url)}`}
                      className="absolute inset-0 w-full h-full border-none bg-white"
                      title="PPT Viewer"
                    />
                  )}

                  {viewMode === 'notes' && (
                    <div className="absolute inset-0 flex flex-col overflow-hidden">
                      <InteractiveNotes 
                        material={selectedExperiment} 
                        username={student?.username || student?.name}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
