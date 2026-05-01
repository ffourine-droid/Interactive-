import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FlaskConical, Loader2, AlertCircle, 
  ChevronLeft, ChevronRight, Settings, Clock, 
  FileText, PlayCircle, Mic2, X, Download, 
  BarChart3, Plus, Moon, Sun, Trash2, Smartphone, 
  ExternalLink, CheckCircle2, XCircle, MoreHorizontal,
  Home as HomeIcon, LogOut, Shield, GraduationCap, ShieldCheck, ArrowLeft
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
  onParentClick: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function Home({ 
  onBack, onAdminClick, onTeacherClick, onTeacherDashboardClick, 
  onAssignmentsClick, onParentClick, theme, setTheme 
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
    if (nextClicks >= 5) {
      onAdminClick();
      setLogoClicks(0);
    } else {
      setLogoClicks(nextClicks);
    }
  };

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('azilearn_search_history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [searchCache, setSearchCache] = useState<Record<string, Experiment[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('azilearn_search_cache');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [viewMode, setViewMode] = useState<'slides' | 'pdf' | 'ppt' | 'notes'>('slides');
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isOpening, setIsOpening] = useState(false);
  
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const middleSearchRef = useRef<HTMLInputElement>(null);
  const lastRequestId = useRef(0);
  const { showToast } = useToast();

  const handleClassSelect = (grade: string) => {
    setSelectedClass(grade);
    setHasSearched(false);
    setSearchQuery('');
    setDebouncedQuery('');
    // handleSearch is triggered by useEffect on selectedClass change

    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'select_class', {
        event_category: 'engagement',
        event_label: grade
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const keys = Object.keys(searchCache);
      if (keys.length > 20) {
        const limitedCache: Record<string, Experiment[]> = {};
        keys.slice(-20).forEach(key => {
          limitedCache[key] = searchCache[key];
        });
        localStorage.setItem('azilearn_search_cache', JSON.stringify(limitedCache));
      } else {
        localStorage.setItem('azilearn_search_cache', JSON.stringify(searchCache));
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [searchCache]);

  useEffect(() => {
    if (selectedClass && !hasSearched && middleSearchRef.current) {
      middleSearchRef.current.focus();
    }
  }, [selectedClass, hasSearched]);

  useEffect(() => {
    if (hasSearched && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [hasSearched]);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('azilearn_search_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (query: string, cat: string = category, currentClass: string | null = selectedClass, shouldBlur: boolean = false) => {
    const requestId = ++lastRequestId.current;
    const cacheKey = `${query.trim().toLowerCase()}-${cat}-${currentClass || 'all'}`;
    
    if (shouldBlur && searchInputRef.current) {
      searchInputRef.current.blur();
    }

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
        (window as any).gtag('event', 'search', {
          search_term: query
        });
      }
    }
    
    try {
      let supabaseQuery = supabase
        .from('experiments')
        .select('id, title, keywords, subject, grade, created_at, audio_url, slides, pdf_url, ppt_url');
      
      if (currentClass) {
        supabaseQuery = supabaseQuery.eq('grade', currentClass);
      }
      
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(`keywords.ilike.%${query}%,title.ilike.%${query}%,subject.ilike.%${query}%`);
      }

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
      if (requestId === lastRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      setLoading(true);
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    handleSearch(debouncedQuery, category, selectedClass);
  }, [debouncedQuery, category, selectedClass]);

  const openExperiment = async (exp: Experiment) => {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'view_lesson', {
        lesson_id: exp.id,
        lesson_title: exp.title,
        subject: exp.subject,
        grade: exp.grade
      });
    }

    const setInitialViewMode = (data: Experiment) => {
      setZoom(100);
      setPan({ x: 0, y: 0 });
      if (data.slides && data.slides.length > 0) setViewMode('slides');
      else if (data.pdf_url) setViewMode('pdf');
      else if (data.ppt_url) setViewMode('ppt');
      else if (data.html_content) setViewMode('notes');
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
        .select('id, title, keywords, html_content, slides, audio_url, pdf_url, ppt_url, subject, grade, created_at')
        .eq('id', exp.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setSelectedExperiment(data);
        setInitialViewMode(data);
        setResults(prev => prev.map(item => item.id === data.id ? data : item));
      }
    } catch (err: any) {
      showToast('Failed to load material content.', 'error');
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
    setTimeout(() => r.remove(), 600);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95, filter: 'blur(4px)' },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300
      }
    }
  };

  return (
    <div className="max-w-[360px] mx-auto bg-brand-bg min-h-screen relative flex flex-col">
      <div className="flex-1 pb-32">
      {/* TOP SEARCH BAR */}
      {activeTab === 'home' && selectedClass && (
        <div className="sticky top-0 z-[100] p-3 pt-4 bg-transparent pointer-events-none">
          <div className={`flex items-center bg-brand-surface rounded-full shadow-lg px-4 h-14 gap-3 pointer-events-auto border transition-all duration-300 ${isSearchFocused ? 'border-brand-accent ring-4 ring-brand-accent/10' : 'border-brand-border/50'}`}>
            <Search className={`${isSearchFocused ? 'text-brand-accent' : 'text-brand-muted'} transition-colors shrink-0`} size={20} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search topic or enter code..." 
              className="flex-1 bg-transparent border-none outline-none font-sans text-[15px] text-brand-text placeholder:text-brand-muted/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery, category, selectedClass, true);
                }
              }}
            />
            <div className="flex items-center gap-2 shrink-0">
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    handleSearch('', category, selectedClass, true);
                  }}
                  className="p-1.5 hover:bg-brand-bg rounded-full text-brand-muted transition-colors"
                >
                  <X size={18} />
                </button>
              )}
              <button 
                onClick={() => handleSearch(searchQuery, category, selectedClass, true)}
                className={`p-2 rounded-full transition-all active:scale-90 ${searchQuery ? 'text-brand-accent bg-brand-accent/10' : 'text-brand-muted'}`}
                title="Search"
              >
                <Search size={20} />
              </button>
              <div className="w-[1px] h-6 bg-brand-border/50 mx-1" />
              <button 
                className="w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform relative overflow-hidden shrink-0"
              >
                <span className="font-sans font-bold text-sm uppercase">
                  A
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO & CONTENT */}
      {activeTab === 'home' && (
        <>
          <AnimatePresence mode="wait">
            {!selectedClass ? (
              <motion.div 
                key="class-selection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="px-6 py-8 space-y-10"
              >
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={onBack}
                      className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors shadow-sm"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div 
                      className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
                      onClick={handleLogoClick}
                    >
                      <div className="w-12 h-12 bg-[#FF6B2C] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#FF6B2C]/20 transform rotate-12">
                        <FlaskConical size={28} />
                      </div>
                      <div>
                        <h1 className="text-2xl font-black text-brand-text tracking-tighter leading-none">AziLearn</h1>
                        <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">Study Materials</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-brand-surface border border-brand-border px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                     <span className="text-xs font-bold text-brand-text">Welcome!</span>
                     <span className="text-sm">👋</span>
                  </div>
                </header>

                <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                          <GraduationCap size={18} />
                        </div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] text-brand-muted">Primary & Junior School</h2>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((grade, i) => (
                          <button
                            key={grade}
                            onClick={(e) => {
                              rippleEffect(e);
                              handleClassSelect(grade);
                            }}
                            className="aspect-square bg-brand-surface border border-brand-border/40 rounded-3xl flex flex-col items-center justify-center gap-1 hover:border-brand-accent hover:bg-brand-accent/5 transition-all active:scale-95 group shadow-sm hover:shadow-lg hover:shadow-brand-accent/5"
                          >
                            <span className="text-2xl font-black text-brand-text group-hover:text-[#FF6B2C] transition-colors">{i + 1}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted/60 opacity-80 group-hover:opacity-100 transition-opacity">Grade</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                          <FileText size={18} />
                        </div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] text-brand-muted">National Examinations</h2>
                      </div>
                      <button
                        onClick={(e) => {
                          rippleEffect(e);
                          handleClassSelect('KCSE');
                        }}
                        className="w-full bg-brand-surface border border-brand-border/40 rounded-[2rem] p-6 flex items-center justify-between hover:border-brand-accent hover:bg-brand-accent/5 transition-all active:scale-95 group shadow-sm"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={32} />
                          </div>
                          <div className="text-left">
                            <h3 className="text-xl font-black text-[#FF6B2C] tracking-tight">KCSE REVISION</h3>
                            <p className="text-[11px] font-black uppercase tracking-widest text-brand-muted/60">Secondary Level</p>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-brand-bg rounded-full flex items-center justify-center text-brand-muted group-hover:text-[#FF6B2C] group-hover:translate-x-1 transition-all">
                          <ChevronRight size={24} />
                        </div>
                      </button>
                    </div>
                  </div>
              </motion.div>
            ) : (
              <motion.div 
                key="materials-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="min-h-screen bg-brand-bg pb-20"
              >
              {/* Class Header */}
              <div className="bg-brand-surface border-b border-brand-border sticky top-0 z-40 px-4 py-4 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <button 
                    onClick={() => {
                      setSelectedClass(null);
                      setHasSearched(false);
                      setResults([]);
                      setSearchQuery('');
                    }}
                    className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-text active:scale-90 transition-transform"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">{selectedClass}</h2>
                    <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Study Materials</p>
                  </div>
                </div>

                {/* Search in Class */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted/40" size={16} />
                  <input 
                    ref={searchInputRef}
                    type="text"
                    placeholder={`Search in ${selectedClass}...`}
                    className="w-full bg-brand-bg border-2 border-brand-border rounded-xl py-2 pl-10 pr-4 outline-none focus:border-brand-accent transition-all font-bold text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="mb-6">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All', icon: FileText },
                      { id: 'notes', label: 'Notes', icon: FileText },
                      { id: 'slides', label: 'Slides', icon: PlayCircle },
                      { id: 'audio', label: 'Audio', icon: Mic2 },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                          category === cat.id 
                            ? 'bg-brand-accent border-brand-accent text-white shadow-md shadow-brand-accent/20' 
                            : 'bg-brand-surface border-brand-border text-brand-text hover:border-brand-accent/40'
                        }`}
                      >
                        <cat.icon size={12} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-4">
                {/* Stats Bar */}
                <div className="flex items-center justify-end mb-4">
                  <div className="text-[9px] font-black text-brand-muted uppercase tracking-[0.2em]">
                    {results.length} Materials
                  </div>
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
                  <div className="text-center py-20 bg-brand-surface/50 rounded-[3rem] border-2 border-dashed border-brand-border">
                    <div className="w-20 h-20 bg-brand-accent/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <Search className="text-brand-accent" size={40} />
                    </div>
                    <h3 className="text-xl font-black mb-2">No materials found</h3>
                    <p className="text-brand-muted text-sm font-medium px-10">We couldn't find any materials for this search. Try a different keyword!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-brand-muted">Study Materials</h3>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
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
      </>
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
            </div>
          </div>
        </motion.div>
      )}

      {/* BOTTOM SHEET NAV */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] bg-brand-surface border-t border-brand-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe rounded-t-[2.5rem]">
        <div className="flex justify-around items-center px-6 py-4">
          {[
            { id: 'home', label: 'Home', icon: HomeIcon, action: () => setActiveTab('home') },
            { id: 'assignments', label: 'Class', icon: FileText, action: () => { setActiveTab('home'); onAssignmentsClick(); } },
            { id: 'settings', label: 'Settings', icon: Settings, action: () => setActiveTab('settings') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => {
                rippleEffect(e);
                tab.action();
              }}
              className={`flex flex-col items-center gap-2 transition-all group ${
                activeTab === tab.id ? 'text-[#FF6B2C]' : 'text-brand-muted/60 hover:text-brand-text'
              }`}
            >
              <div className={`w-14 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                activeTab === tab.id ? 'bg-brand-accent/10 shadow-sm' : 'bg-transparent'
              }`}>
                <tab.icon size={26} className="transition-transform group-active:scale-90" />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-widest transition-opacity ${
                activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* LOADING OVERLAY FOR OPENING MATERIAL */}
      <AnimatePresence>
        {isOpening && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-brand-bg/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
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
          <div className="fixed inset-0 z-[300] bg-brand-bg flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-surface/80 backdrop-blur-xl">
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
            
            <div className="flex bg-brand-surface border-b border-brand-border px-2 overflow-x-auto no-scrollbar">
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
            
            <div className="flex-1 bg-black overflow-hidden relative">
              {viewMode === 'slides' && selectedExperiment.slides && selectedExperiment.slides.length > 0 && (
                <SlidesViewer 
                  slides={selectedExperiment.slides} 
                  audioUrl={selectedExperiment.audio_url} 
                />
              )}
              
              <div 
                className={`w-full h-full overflow-auto ${viewMode === 'slides' ? 'hidden' : 'block'}`}
              >
                <div 
                  className={`w-full h-full ${viewMode === 'notes' ? 'transition-transform duration-300 origin-center' : ''}`}
                  style={viewMode === 'notes' ? { 
                    transform: `scale(${zoom / 100}) translate(${pan.x}%, ${pan.y}%)`,
                    height: '100%',
                    width: '100%',
                    minHeight: '100%',
                    minWidth: '100%'
                  } : { height: '100%', width: '100%' }}
                >
                  {viewMode === 'pdf' && selectedExperiment.pdf_url && (
                    <iframe
                      src={selectedExperiment.pdf_url.includes('drive.google.com') 
                        ? selectedExperiment.pdf_url.replace('/view', '/preview').replace('/edit', '/preview')
                        : `${selectedExperiment.pdf_url}#toolbar=1`
                      }
                      className="w-full h-full border-none bg-brand-surface"
                      title="PDF Viewer"
                    />
                  )}

                  {viewMode === 'ppt' && selectedExperiment.ppt_url && (
                    <iframe
                      src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(selectedExperiment.ppt_url)}`}
                      className="w-full h-full border-none bg-brand-surface"
                      title="PPT Viewer"
                    />
                  )}

                  {viewMode === 'notes' && selectedExperiment.html_content && (
                    <iframe
                      title={selectedExperiment.title}
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <style>
                              body { 
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                line-height: 1.6;
                                color: ${theme === 'dark' ? '#f5f5f5' : '#1a1a1a'};
                                padding: 24px;
                                margin: 0;
                                background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
                              }
                              img { max-width: 100%; height: auto; border-radius: 12px; }
                              h1, h2, h3 { color: ${theme === 'dark' ? '#ffffff' : '#000000'}; margin-top: 1.5em; }
                              p { margin-bottom: 1em; }
                            </style>
                          </head>
                          <body>
                            ${selectedExperiment.html_content}
                          </body>
                        </html>
                      `}
                      className="w-full h-full border-none bg-brand-surface"
                      sandbox="allow-scripts allow-modals"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
