import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FlaskConical, Loader2, AlertCircle, 
  ChevronLeft, ChevronRight, Settings, Clock, 
  FileText, PlayCircle, Mic2, X, Download, 
  BarChart3, Plus, Moon, Sun, Trash2, Smartphone, 
  ExternalLink, CheckCircle2, XCircle, MoreHorizontal,
  Home as HomeIcon, LogOut, Shield, GraduationCap, ShieldCheck, ArrowLeft, Database, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Experiment } from '../types';
import { MaterialCard, SkeletonCard } from '../components/MaterialCard';
import { SlidesViewer } from '../components/SlidesViewer';

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
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  selectedClass: string | null;
  setSelectedClass: (grade: string | null) => void;
}

export default function Home({ 
  onBack, onAdminClick, onAdminTerminalClick, onTeacherClick, onTeacherDashboardClick, 
  onAssignmentsClick, onExamsClick, onArenaClick, onParentClick, theme, setTheme,
  selectedClass, setSelectedClass
}: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'notes' | 'slides' | 'audio'>('all');
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

  const handleClassSelect = (grade: string) => {
    setSelectedClass(grade);
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

  const handleSearch = async (query: string, cat: string = category, currentClass: string | null = selectedClass, shouldBlur: boolean = false) => {
    const requestId = ++lastRequestId.current;
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
        .select('id, title, keywords, subject, grade, created_at, audio_url, slides, pdf_url, ppt_url');
      if (currentClass) supabaseQuery = supabaseQuery.eq('grade', currentClass);
      if (query.trim()) supabaseQuery = supabaseQuery.or(`keywords.ilike.%${query}%,title.ilike.%${query}%,subject.ilike.%${query}%`);
      if (!query.trim() && cat === 'all' && !currentClass) {
        supabaseQuery = supabaseQuery.limit(10);
      } else {
        supabaseQuery = supabaseQuery.limit(50);
      }
      const { data, error: fetchError } = await supabaseQuery.order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      if (requestId !== lastRequestId.current) return;
      let filteredData = data || [];
      if (cat !== 'all') {
        filteredData = filteredData.filter(exp => {
          if (cat === 'slides') return exp.slides && Array.isArray(exp.slides) && exp.slides.length > 0;
          if (cat === 'audio') return !!exp.audio_url;
          return true;
        });
      }
      setResults(filteredData);
      setSearchCache(prev => ({ ...prev, [cacheKey]: filteredData }));
    } catch (err: any) {
      if (requestId !== lastRequestId.current) return;
      setError(err.message || "Could not load results.");
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
      if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        setViewMode('slides');
      } else if (data.pdf_url) {
        setViewMode('pdf');
      } else if (data.ppt_url) {
        setViewMode('ppt');
      } else {
        setViewMode('notes'); // Always fallback to notes if no other visual assets
      }
    };
    if (exp.html_content || (exp.slides && exp.slides.length > 0) || exp.pdf_url || exp.ppt_url) {
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
              className="fixed inset-y-0 left-0 w-[280px] z-[301] bg-brand-surface border-r border-brand-border p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF6B2C] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF6B2C]/20">
                    <FlaskConical size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight leading-none text-brand-text">AziLearn</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mt-1">Student Portal</p>
                  </div>
                </div>
                <button 
                   onClick={() => setIsSidebarOpen(false)}
                   className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted active:text-brand-accent transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar pr-1">
                {[
                  { id: 'home', label: 'Home Hub', icon: HomeIcon, action: () => { setActiveTab('home'); setIsSidebarOpen(false); setSelectedClass(null); } },
                  { id: 'assignments', label: 'My Classes', icon: FileText, action: () => { onAssignmentsClick(); setIsSidebarOpen(false); } },
                  { id: 'groupwork', label: 'My Work', icon: Users, action: () => { onArenaClick(); setIsSidebarOpen(false); } },
                  { id: 'exams', label: 'Timed Exams', icon: Clock, action: () => { onExamsClick(); setIsSidebarOpen(false); } },
                  { id: 'parent', label: 'Parent Portal', icon: ShieldCheck, action: () => { onParentClick(); setIsSidebarOpen(false); } },
                  { id: 'settings', label: 'App Settings', icon: Settings, action: () => { setActiveTab('settings'); setIsSidebarOpen(false); } },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-accent/5 transition-all group active:scale-95 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-brand-accent group-hover:border-brand-accent/30 transition-colors shadow-sm">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-brand-text group-hover:text-brand-accent transition-colors block">{item.label}</span>
                      <p className="text-[8px] font-bold text-brand-muted uppercase tracking-[0.1em]">Access {item.label.toLowerCase()}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-brand-border mt-auto">
                <button 
                   onClick={() => onBack()}
                   className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-500/5 transition-all font-black text-xs uppercase tracking-widest active:scale-95"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <LogOut size={18} />
                  </div>
                  Exit Portal
                </button>
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
                  <div className="bg-brand-surface border border-brand-border px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-brand-text">Welcome!</span>
                    <span className="text-sm">👋</span>
                  </div>
                </header>

                {/* Grades */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand-accent/10 rounded-lg flex items-center justify-center text-brand-accent">
                        <GraduationCap size={14} />
                      </div>
                      <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-brand-muted">Primary & Junior School</h2>
                    </div>
                    {/* 3-col grid, aspect-square cells that scale with viewport */}
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((grade, i) => (
                        <button
                          key={grade}
                          onClick={(e) => { rippleEffect(e); handleClassSelect(grade); }}
                          className="relative overflow-hidden aspect-square bg-brand-surface border border-brand-border/40 rounded-2xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all shadow-sm"
                        >
                          <span className="text-xl font-black text-brand-text">{i + 1}</span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-brand-muted/60 whitespace-nowrap">Grade</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* KCSE */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand-accent/10 rounded-lg flex items-center justify-center text-brand-accent">
                        <FileText size={14} />
                      </div>
                      <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-brand-muted">National Assessments</h2>
                    </div>
                    <button
                      onClick={(e) => { rippleEffect(e); handleClassSelect('KCSE'); }}
                      className="relative overflow-hidden w-full bg-brand-surface border border-brand-border/40 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                          <CheckCircle2 size={22} />
                        </div>
                        <div className="text-left">
                          <h3 className="text-base font-black text-[#FF6B2C] tracking-tight">KCSE REVISION</h3>
                          <p className="text-[9px] font-black uppercase tracking-wider text-brand-muted/60 whitespace-nowrap">Secondary Level</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-brand-muted shrink-0" />
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

                  {/* Category Filter — 4 cols */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'all', label: 'All', icon: FileText },
                      { id: 'notes', label: 'Notes', icon: FileText },
                      { id: 'slides', label: 'Slides', icon: PlayCircle },
                      { id: 'audio', label: 'Audio', icon: Mic2 },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id as any)}
                        className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border ${
                          category === cat.id
                            ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                            : 'bg-brand-surface border-brand-border text-brand-text'
                        }`}
                      >
                        <cat.icon size={10} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-4 pt-3">
                  {/* Count */}
                  <div className="flex items-center justify-end mb-3">
                    <span className="text-[9px] font-black text-brand-muted uppercase tracking-wider whitespace-nowrap">
                      {results.length} Materials
                    </span>
                  </div>

                  {loading && results.length === 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                    </div>
                  ) : error ? (
                    <div className="text-center py-20 bg-brand-surface/50 rounded-[3rem] border-2 border-dashed border-brand-border">
                      <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                      <p className="text-brand-text font-bold">{error}</p>
                      <button 
                        onClick={() => handleSearch(searchQuery)}
                        className="mt-4 text-brand-accent font-black uppercase tracking-widest text-xs"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : results.length === 0 ? (
                  <div className="text-center py-20 bg-brand-surface border border-brand-border rounded-[2rem]">
                    <div className="w-20 h-20 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Search className="text-brand-accent" size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No materials found</h3>
                    <p className="text-brand-muted text-sm font-medium px-10">We couldn't find any materials for this search. Try a different keyword!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted">Study Materials</h3>
                        <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                          {results.length} Items
                        </span>
                      </div>
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-4"
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
                    </div>
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
            className="fixed bottom-6 left-6 right-6 z-[200] bg-brand-surface/80 backdrop-blur-xl border border-brand-border/50 shadow-2xl rounded-[2rem]"
          >
            <div className="flex justify-around items-center p-3">
              {[
                { id: 'home', label: 'Home', icon: HomeIcon, action: () => { setActiveTab('home'); setSelectedClass(null); } },
                { id: 'menu', label: 'Menu', icon: MoreHorizontal, action: () => setIsSidebarOpen(true) },
                { id: 'settings', label: 'Settings', icon: Settings, action: () => setActiveTab('settings') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    rippleEffect(e);
                    tab.action();
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all ${
                    activeTab === tab.id ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/20' : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  <tab.icon size={16} />
                  {activeTab === tab.id && <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>}
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
              {selectedExperiment.html_content && (
                <button 
                  onClick={() => { setViewMode('notes'); setZoom(100); setPan({ x: 0, y: 0 }); }}
                  className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${viewMode === 'notes' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted'}`}
                >
                  Notes
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
                    selectedExperiment.html_content?.startsWith('http') ? (
                      <iframe
                        src={selectedExperiment.html_content}
                        className="absolute inset-0 w-full h-full border-none bg-white"
                        title={selectedExperiment.title}
                        sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
                      />
                    ) : (
                      <iframe
                        title={selectedExperiment.title}
                        srcDoc={`
                          <!DOCTYPE html>
                          <html lang="en">
                            <head>
                              <meta charset="utf-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
                              <style>
                                * { box-sizing: border-box; }
                                html { 
                                  height: 100%; 
                                  margin: 0; 
                                  padding: 0; 
                                }
                                body { 
                                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                  line-height: 1.7;
                                  color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'};
                                  padding: 24px;
                                  padding-bottom: 120px;
                                  margin: 0;
                                  background: ${theme === 'dark' ? '#0f172a' : '#ffffff'};
                                  word-wrap: break-word;
                                  overflow-wrap: break-word;
                                  min-height: 100%;
                                }
                                img { max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                                h1, h2, h3 { color: ${theme === 'dark' ? '#ffffff' : '#000000'}; margin-top: 1.5em; font-weight: 800; line-height: 1.3; }
                                h1 { font-size: 1.75rem; margin-top: 0; border-bottom: 2px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'}; padding-bottom: 12px; }
                                h2 { font-size: 1.5rem; }
                                p { margin-bottom: 1.25em; }
                                table { width: 100%; border-collapse: collapse; margin: 1.5em 0; background: ${theme === 'dark' ? '#1e293b' : '#fafafa'}; border-radius: 8px; overflow: hidden; }
                                th, td { border: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}; padding: 12px; text-align: left; }
                                th { background: ${theme === 'dark' ? '#334155' : '#f8fafc'}; font-weight: 700; }
                                pre { background: ${theme === 'dark' ? '#1e293b' : '#f1f5f9'}; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.9em; }
                                code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
                                .loading { display: flex; align-items: center; justify-content: center; height: 100vh; font-weight: bold; }
                                ::-webkit-scrollbar { width: 8px; }
                                ::-webkit-scrollbar-track { background: transparent; }
                                ::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#334155' : '#cbd5e1'}; border-radius: 4px; }
                              </style>
                            </head>
                            <body>
                              ${selectedExperiment.html_content || '<div class="loading">No content available for this material.</div>'}
                            </body>
                          </html>
                        `}
                        className="absolute inset-0 w-full h-full border-none bg-white"
                        sandbox="allow-scripts allow-modals allow-same-origin"
                        loading="lazy"
                      />
                    )
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
