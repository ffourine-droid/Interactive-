/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AziLearn - Subscription-based study materials platform
 */
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, ChevronLeft, ChevronRight, Settings, WifiOff, Clock, FileText, PlayCircle, Mic2, User, Smartphone, X, Download, Shield, Trash2, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { CountdownTimer } from './components/CountdownTimer';
import { SlidesViewer } from './components/SlidesViewer';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

const AdminPayments = lazy(() => import('./pages/AdminPayments').then(module => ({ default: module.AdminPayments })));

interface Experiment {
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
}

interface Profile {
  id: string;
  username: string;
  phone_number: string;
  created_at: string;
}

type Page = 'home' | 'admin';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedLesson, setSelectedLesson] = useState<Experiment | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('azilearn_onboarding_complete');
    }
    return false;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('azilearn_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { showToast } = useToast();

  const checkProfile = React.useCallback(async () => {
    const savedPhone = sessionStorage.getItem('azilearn_phone');

    if (!savedPhone) {
      setIsAuthLoading(false);
      return;
    }

    console.log('Checking profile for:', savedPhone);
    
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Initial check timed out, forcing loading to false');
      setIsAuthLoading(false);
    }, 3000); // Reduced from 5s to 3s

    try {
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone_number', savedPhone)
          .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        console.log('Profile found:', data.username);
        setProfile(data);
      } else {
        console.log('No profile found for this phone');
        sessionStorage.removeItem('azilearn_phone');
      }
    } catch (err) {
      console.error('Initial check failed:', err);
      showToast('Failed to load profile.', 'error');
    } finally {
      clearTimeout(timeoutId);
      setIsAuthLoading(false);
      console.log('Auth loading finished');
    }
  }, [showToast]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('You are back online!', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast('You are offline. Some features may be limited.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('azilearn_theme', theme);
  }, [theme]);

  useEffect(() => {
    checkProfile();
  }, []);

  // Simple router
  const renderPage = () => {
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-accent" size={48} />
        </div>
      );
    }

    if (!profile) {
      return <Auth onSuccess={(p) => {
        setProfile(p);
      }} />;
    }

    switch (currentPage) {
      case 'admin':
        return (
          <Suspense fallback={
            <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-brand-accent" size={48} />
              <p className="text-brand-muted font-bold text-sm animate-pulse">Loading Admin Panel...</p>
            </div>
          }>
            <AdminPayments onBack={() => setCurrentPage('home')} />
          </Suspense>
        );
      case 'home':
      default:
        return (
          <Home 
            profile={profile}
            onLogout={() => {
              sessionStorage.removeItem('azilearn_phone');
              sessionStorage.removeItem('azilearn_username');
              setProfile(null);
            }}
            onAdminClick={() => setCurrentPage('admin')}
            theme={theme}
            setTheme={setTheme}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent/30 transition-colors duration-500`}>
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2 sticky top-0 z-[1000]"
          >
            <WifiOff size={12} />
            <span>OFFLINE MODE — LOADING FROM CACHE</span>
          </motion.div>
        )}
        {showOnboarding && (
          <Onboarding onComplete={() => {
            localStorage.setItem('azilearn_onboarding_complete', 'true');
            setShowOnboarding(false);
          }} />
        )}
      </AnimatePresence>
      {renderPage()}
    </div>
  );
}

function Home({ profile, onLogout, onAdminClick, theme, setTheme }: { 
  profile: Profile | null,
  onLogout: () => void,
  onAdminClick: () => void,
  theme: 'light' | 'dark',
  setTheme: (theme: 'light' | 'dark') => void
}) {
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
  const touchStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 100 || viewMode === 'slides') return;
    if (e.touches.length === 1) {
      isPanningRef.current = true;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanningRef.current || zoom <= 100) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    
    // Limit panning based on zoom level
    const maxPan = (zoom - 100) / 2;
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.x + (dx / zoom) * 100)),
      y: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.y + (dy / zoom) * 100))
    });
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
  };
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const middleSearchRef = React.useRef<HTMLInputElement>(null);
  const lastRequestId = React.useRef(0);
  const { showToast } = useToast();

  const handleClassSelect = (grade: string) => {
    setSelectedClass(grade);
    setHasSearched(false);
    setSearchQuery('');
    setDebouncedQuery('');
    // Pre-load the class results
    handleSearch('', category, grade);
  };

  // Save cache to localStorage with debounce and size limit
  useEffect(() => {
    const timer = setTimeout(() => {
      // Limit cache size to last 20 entries to prevent localStorage bloat
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
    }, 2000); // Debounce save by 2 seconds
    
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

  // Initial load
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('experiments').select('id').limit(1);
        if (error) {
          showToast('Supabase connection failed. Check your configuration.', 'error');
        }
      } catch (err) {
        // Silent fail for connection test
      }
    };
    testConnection();
  }, []);

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

    // Check cache first for immediate results
    if (searchCache[cacheKey]) {
      setResults(searchCache[cacheKey]);
      // If we have cache, we don't show the main loader to avoid flickering
      if (!query.trim() && !currentClass) setLoading(false);
    } else {
      setLoading(true);
      setResults([]); 
    }

    setError(null);
    setHasSearched(true);
    
    if (query) {
      addToHistory(query);
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
      console.error(`[Request ${requestId}] Search error:`, err);
      setError(err.message || "Could not load results.");
    } finally {
      if (requestId === lastRequestId.current) {
        setLoading(false);
      }
    }
  };

  // Debounce search query
  useEffect(() => {
    if (searchQuery.trim()) {
      setLoading(true);
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    handleSearch(debouncedQuery, category, selectedClass);
  }, [debouncedQuery, category, selectedClass]);

  const openExperiment = async (exp: Experiment) => {
    // Helper to set initial view mode
    const setInitialViewMode = (data: Experiment) => {
      setZoom(100); // Reset zoom on open
      setPan({ x: 0, y: 0 }); // Reset pan on open
      if (data.slides && data.slides.length > 0) setViewMode('slides');
      else if (data.pdf_url) setViewMode('pdf');
      else if (data.ppt_url) setViewMode('ppt');
      else if (data.html_content) setViewMode('notes');
    };

    // If we already have the content, just open it
    if (exp.html_content || (exp.slides && exp.slides.length > 0) || exp.pdf_url || exp.ppt_url) {
      setSelectedExperiment(exp);
      setInitialViewMode(exp);
      return;
    }

    // Otherwise, fetch the full content
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
        // Update the results list with the full data so we don't fetch again
        setResults(prev => prev.map(item => item.id === data.id ? data : item));
      }
    } catch (err: any) {
      console.error('Error fetching full experiment:', err);
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
    <div className="max-w-[420px] mx-auto bg-brand-bg min-h-screen relative pb-32">
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
                  {profile?.username?.[0] || 'A'}
                </span>
              </button>
            </div>
          </div>

          {/* SEARCH HISTORY DROPDOWN */}
          <AnimatePresence>
            {isSearchFocused && searchHistory.length > 0 && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-3 right-3 top-20 bg-brand-surface rounded-3xl border border-brand-border shadow-xl p-4 pointer-events-auto"
              >
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-brand-muted">Recent Searches</span>
                  <button 
                    onClick={() => {
                      setSearchHistory([]);
                      localStorage.removeItem('azilearn_search_history');
                    }}
                    className="text-[10px] font-bold text-brand-accent hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1">
                  {searchHistory.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchQuery(h)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-bg rounded-xl transition-colors text-left group"
                    >
                      <Clock size={14} className="text-brand-muted group-hover:text-brand-accent" />
                      <span className="text-sm font-medium text-brand-text">{h}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                className="px-4 py-6 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    onClick={handleLogoClick}
                  >
                    <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-accent/20">
                      <FlaskConical size={24} />
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-brand-text tracking-tight leading-none">AziLearn</h1>
                      <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">Study Materials</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors"
                  >
                    <Settings size={20} />
                  </button>
                </div>

                <div className="space-y-1">
                  <h1 className="font-sans text-2xl font-bold text-brand-text leading-tight">
                    Welcome, {profile?.username || 'Explorer'}.
                  </h1>
                  <p className="text-[13px] text-brand-muted font-sans">Select your class to start learning</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-muted">Primary & Junior School</h2>
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((grade, i) => (
                        <button
                          key={grade}
                          onClick={(e) => {
                            rippleEffect(e);
                            handleClassSelect(grade);
                          }}
                          className="h-16 bg-brand-surface border border-brand-border rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-brand-text hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95 shadow-sm group"
                        >
                          <span className="text-lg">{i + 1}</span>
                          <span className="text-[10px] uppercase tracking-tighter opacity-60 group-hover:opacity-100">Grade</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-muted">Secondary School</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 4 }, (_, i) => `Form ${i + 1}`).map((form, i) => (
                        <button
                          key={form}
                          onClick={(e) => {
                            rippleEffect(e);
                            handleClassSelect(form);
                          }}
                          className="h-16 bg-brand-surface border border-brand-border rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-brand-text hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95 shadow-sm group"
                        >
                          <span className="text-lg">{i + 1}</span>
                          <span className="text-[10px] uppercase tracking-tighter opacity-60 group-hover:opacity-100">Form</span>
                        </button>
                      ))}
                      <button
                        onClick={(e) => {
                          rippleEffect(e);
                          handleClassSelect('KCSE');
                        }}
                        className="h-16 bg-brand-surface border border-brand-border rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-brand-text hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95 shadow-sm group col-span-2"
                      >
                        <span className="text-lg">KCSE</span>
                        <span className="text-[10px] uppercase tracking-tighter opacity-60 group-hover:opacity-100">Revision</span>
                      </button>
                    </div>
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
                    className="w-10 h-10 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-text active:scale-90 transition-transform"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">{selectedClass}</h2>
                    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Study Materials</p>
                  </div>
                </div>

                {/* Search in Class */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40" size={18} />
                  <input 
                    ref={searchInputRef}
                    type="text"
                    placeholder={`Search in ${selectedClass}...`}
                    className="w-full bg-brand-bg border-2 border-brand-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-brand-accent transition-all font-bold text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-4 pt-6">
                {/* Filter & Stats Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFilterDrawerOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-brand-surface border-2 border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-text hover:border-brand-accent transition-all active:scale-95 shadow-sm"
                    >
                      <Settings size={14} className="text-brand-accent" />
                      Filters
                      {category !== 'all' && (
                        <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                      )}
                    </button>
                    {category !== 'all' && (
                      <button 
                        onClick={() => setCategory('all')}
                        className="text-[10px] font-bold text-brand-muted hover:text-brand-accent transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">
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
                        {results.map((exp, idx) => (
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
            </div>

            {/* Logout Button */}
            <button 
              onClick={onLogout}
              className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all active:scale-95 text-sm"
            >
              <User size={18} />
              Sign Out
            </button>
          </div>
        </motion.div>
      )}

      {/* BOTTOM SHEET NAV */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] bg-brand-surface border-t border-brand-border shadow-[0_-2px_20px_rgba(0,0,0,0.1)] pb-safe">
        <div className="w-9 h-1 bg-brand-border rounded-full mx-auto my-2.5" />
        <div className="flex justify-around px-2 pb-4">
          {[
            { id: 'home', label: 'Home', icon: FlaskConical, action: () => setActiveTab('home') },
            { id: 'settings', label: 'Settings', icon: Settings, action: () => setActiveTab('settings') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => {
                rippleEffect(e);
                tab.action();
              }}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all relative overflow-hidden min-w-[72px] ${
                activeTab === tab.id ? 'text-brand-accent' : 'text-brand-muted'
              }`}
            >
              <div className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                activeTab === tab.id ? 'bg-brand-accent/10' : 'bg-transparent'
              }`}>
                <tab.icon size={22} className={activeTab === tab.id ? 'text-brand-accent' : 'text-brand-muted'} />
              </div>
              <span className={`font-sans text-[11px] font-medium ${activeTab === tab.id ? 'font-bold' : ''}`}>
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
              <p className="text-brand-muted text-[10px] font-black uppercase tracking-widest">Getting things ready for you</p>
            </div>
            <Loader2 className="animate-spin text-brand-accent mt-4" size={24} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER DRAWER */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-brand-surface rounded-t-[3rem] z-[501] p-8 pb-12 shadow-2xl border-t border-brand-border"
            >
              <div className="w-12 h-1.5 bg-brand-border rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-black mb-6 text-center tracking-tight">Filter Materials</h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-brand-muted px-2">Content Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'all', label: 'Everything', icon: FileText },
                      { id: 'notes', label: 'Study Notes', icon: FileText },
                      { id: 'slides', label: 'Slides/PDF', icon: PlayCircle },
                      { id: 'audio', label: 'Audio Lessons', icon: Mic2 },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setCategory(cat.id as any);
                          setIsFilterDrawerOpen(false);
                        }}
                        className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold transition-all border-2 ${
                          category === cat.id 
                            ? 'bg-brand-accent border-brand-accent text-white shadow-lg shadow-brand-accent/20' 
                            : 'bg-brand-bg border-brand-border text-brand-text hover:border-brand-accent/40'
                        }`}
                      >
                        <cat.icon size={18} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="w-full py-4 bg-brand-text text-brand-surface rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </>
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
                {viewMode !== 'slides' && (
                  <div className="flex items-center gap-1 bg-brand-surface border border-brand-border rounded-xl p-1 mr-1 sm:mr-2">
                    <button 
                      onClick={() => setZoom(prev => Math.max(50, prev - 25))}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-brand-bg rounded-lg transition-colors text-brand-muted"
                      title="Zoom Out"
                    >
                      <span className="text-base sm:text-lg font-bold">-</span>
                    </button>
                    <span className="text-[9px] sm:text-[10px] font-black w-8 sm:w-12 text-center text-brand-muted">{zoom}%</span>
                    <button 
                      onClick={() => setZoom(prev => Math.min(300, prev + 25))}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-brand-bg rounded-lg transition-colors text-brand-muted"
                      title="Zoom In"
                    >
                      <span className="text-base sm:text-lg font-bold">+</span>
                    </button>
                  </div>
                )}
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
                  PDF Viewer
                </button>
              )}
              {selectedExperiment.ppt_url && (
                <button 
                  onClick={() => { setViewMode('ppt'); setZoom(100); setPan({ x: 0, y: 0 }); }}
                  className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${viewMode === 'ppt' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted'}`}
                >
                  PPT Viewer
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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div 
                  className="w-full h-full transition-transform duration-300 origin-center"
                  style={{ 
                    transform: `scale(${zoom / 100}) translate(${pan.x}%, ${pan.y}%)`,
                    height: '100%',
                    width: '100%',
                    minHeight: '100%',
                    minWidth: '100%'
                  }}
                >
                  {viewMode === 'pdf' && selectedExperiment.pdf_url && (
                    <iframe
                      src={`${selectedExperiment.pdf_url}#toolbar=1`}
                      className="w-full h-full border-none bg-white"
                      title="PDF Viewer"
                    />
                  )}

                  {viewMode === 'ppt' && selectedExperiment.ppt_url && (
                    <iframe
                      src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(selectedExperiment.ppt_url)}`}
                      className="w-full h-full border-none bg-white"
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
                                color: #1a1a1a;
                                padding: 24px;
                                margin: 0;
                                background: #ffffff;
                              }
                              img { max-width: 100%; height: auto; border-radius: 12px; }
                              h1, h2, h3 { color: #000; margin-top: 1.5em; }
                              p { margin-bottom: 1em; }
                            </style>
                          </head>
                          <body>
                            ${selectedExperiment.html_content}
                          </body>
                        </html>
                      `}
                      className="w-full h-full border-none bg-white"
                      sandbox="allow-scripts allow-modals"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
              
              {!selectedExperiment.slides?.length && !selectedExperiment.pdf_url && !selectedExperiment.ppt_url && !selectedExperiment.html_content && (
                <div className="flex flex-col items-center justify-center h-full text-brand-muted gap-4 bg-brand-bg">
                  <AlertCircle size={48} className="text-brand-accent/20" />
                  <p className="font-bold">No content available.</p>
                </div>
              )}
            </div>

            {/* DOWNLOAD SECTION */}
            {(selectedExperiment.pdf_url || selectedExperiment.ppt_url) && (
              <div className="p-4 bg-brand-surface border-t border-brand-border flex gap-3">
                {selectedExperiment.pdf_url && (
                  <a 
                    href={selectedExperiment.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-brand-accent text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                  >
                    <Download size={18} />
                    Download PDF
                  </a>
                )}
                {selectedExperiment.ppt_url && (
                  <a 
                    href={selectedExperiment.ppt_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    <Download size={18} />
                    Download PPT
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MaterialCard({ exp, onClick }: { exp: Experiment, onClick: (e: React.MouseEvent) => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-brand-surface rounded-2xl p-4 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden border group cursor-pointer border-brand-border/40`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
        exp.slides?.length ? 'bg-brand-accent/10 text-brand-accent' : 
        exp.audio_url ? 'bg-indigo-500/10 text-indigo-500' : 
        exp.pdf_url ? 'bg-red-500/10 text-red-500' :
        exp.ppt_url ? 'bg-orange-500/10 text-orange-500' :
        'bg-emerald-500/10 text-emerald-500'
      }`}>
        {exp.slides?.length ? <PlayCircle size={24} /> : 
         exp.audio_url ? <Mic2 size={24} /> : 
         exp.pdf_url ? <FileText size={24} /> :
         exp.ppt_url ? <ExternalLink size={24} /> : 
         <FileText size={24} />}
      </div>
      <div className={`flex-1 min-w-0`}>
        <div className="font-sans text-[15px] font-bold text-brand-text truncate">{exp.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">{exp.subject || 'Study Material'}</span>
          {(exp.pdf_url || exp.ppt_url) && (
            <span className="flex items-center gap-1 text-[9px] font-black bg-brand-accent/10 text-brand-accent px-1.5 py-0.5 rounded-md uppercase">
              <Download size={10} />
              Viewable
            </span>
          )}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted/20 group-hover:text-brand-accent transition-colors">
        <ChevronRight size={20} />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border/40 animate-pulse flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-brand-bg/50" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-brand-bg/50 rounded-lg w-3/4" />
        <div className="h-3 bg-brand-bg/30 rounded-lg w-1/2" />
      </div>
      <div className="w-8 h-8 rounded-full bg-brand-bg/20" />
    </div>
  );
}
