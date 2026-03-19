/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AziLearn - Subscription-based study materials platform
 */
import React, { useState, useEffect } from 'react';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, ChevronLeft, Shield, Settings, Sun, Moon, Download, Trash2, WifiOff, CheckCircle2, Lock, Key, Clock, FileText, PlayCircle, Mic2, User, Smartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { PremiumGate } from './components/PremiumGate';
import { Pay } from './pages/Pay';
import { Access } from './pages/Access';
import { AdminPayments } from './pages/AdminPayments';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { SubscriptionModal } from './components/SubscriptionModal';
import { checkAccess, AccessResult } from './utils/checkAccess';
import { CountdownTimer } from './components/CountdownTimer';
import { SlidesViewer } from './components/SlidesViewer';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

interface Experiment {
  id: string | number;
  title: string;
  keywords: string;
  html_content: string;
  subject?: string;
  slides?: string[];
  audio_url?: string;
  grade?: string;
}

interface Profile {
  id: string;
  username: string;
  phone_number: string;
  created_at: string;
}

type Page = 'home' | 'pay' | 'access' | 'admin';
type Plan = 'daily' | 'weekly' | 'monthly';

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
  const [selectedPlan, setSelectedPlan] = useState<Plan>('daily');
  const [selectedLesson, setSelectedLesson] = useState<Experiment | null>(null);
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
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

  const refreshAccess = async () => {
    const saved = sessionStorage.getItem('azilearn_phone');
    if (saved) {
      try {
        const result = await checkAccess(saved);
        setAccessResult(result);
      } catch (err) {
        console.error('Access check failed:', err);
        showToast('Failed to verify access. Please check your connection.', 'error');
      }
    } else {
      setAccessResult(null);
    }
  };

  const checkProfile = async () => {
    const savedPhone = sessionStorage.getItem('azilearn_phone');
    if (savedPhone) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone_number', savedPhone)
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Profile check failed:', err);
        showToast('Failed to load profile.', 'error');
      }
    }
    setIsAuthLoading(false);
  };

  useEffect(() => {
    checkProfile();
    refreshAccess();
    
    // Listen for storage changes (e.g. from PaymentForm or AccessPrompt)
    const handleStorage = () => refreshAccess();
    window.addEventListener('storage', handleStorage);
    
    // Real-time subscription
    const saved = sessionStorage.getItem('azilearn_phone');
    let channel: any;
    if (saved) {
      channel = supabase
        .channel('global_payment_status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payments',
            filter: `phone_number=eq.${saved}`,
          },
          () => {
            refreshAccess();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) supabase.removeChannel(channel);
    };
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

    if (!profile && currentPage !== 'admin') {
      return <Auth onSuccess={(p) => {
        setProfile(p);
        refreshAccess();
      }} />;
    }

    switch (currentPage) {
      case 'pay':
        return (
          <Pay 
            plan={selectedPlan} 
            lessonId={selectedLesson?.id.toString()} 
            lessonTitle={selectedLesson?.title}
            onSuccess={() => {
              refreshAccess();
              if (selectedLesson) {
                setCurrentPage('home');
                // The lesson modal will still be open or can be re-opened
              } else {
                setCurrentPage('home');
              }
            }}
            onBack={() => setCurrentPage('home')} 
          />
        );
      case 'access':
        return (
          <Access 
            onBack={() => setCurrentPage('home')} 
            onSuccess={() => {
              refreshAccess();
              setCurrentPage('home');
            }}
            onPayClick={() => setCurrentPage('pay')}
          />
        );
      case 'admin':
        return <AdminPayments onBack={() => setCurrentPage('home')} />;
      case 'home':
      default:
        return (
          <Home 
            accessResult={accessResult}
            onPayPlan={(plan, lesson) => {
              setSelectedPlan(plan);
              setSelectedLesson(lesson || null);
              setCurrentPage('pay');
            }}
            onEnterCode={() => setCurrentPage('access')}
            onAdminClick={() => setCurrentPage('admin')}
            profile={profile}
            onLogout={() => {
              sessionStorage.removeItem('azilearn_phone');
              sessionStorage.removeItem('azilearn_username');
              setProfile(null);
              setAccessResult(null);
            }}
            onShowPlans={() => setShowPlanSelection(true)}
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
        {showPlanSelection && (
          <SubscriptionModal 
            isOpen={showPlanSelection}
            onClose={() => setShowPlanSelection(false)}
            onManualPay={(plan) => {
              setSelectedPlan(plan);
              setCurrentPage('pay');
              setShowPlanSelection(false);
            }}
          />
        )}
      </AnimatePresence>
      {renderPage()}
    </div>
  );
}

function Home({ accessResult, onPayPlan, onEnterCode, onAdminClick, profile, onLogout, onShowPlans, theme, setTheme }: { 
  accessResult: AccessResult | null,
  onPayPlan: (plan: Plan, lesson?: Experiment) => void,
  onEnterCode: () => void,
  onAdminClick: () => void,
  profile: Profile | null,
  onLogout: () => void,
  onShowPlans: () => void,
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
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const middleSearchRef = React.useRef<HTMLInputElement>(null);
  const lastRequestId = React.useRef(0);
  const { showToast } = useToast();

  // Save cache to localStorage
  useEffect(() => {
    localStorage.setItem('azilearn_search_cache', JSON.stringify(searchCache));
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
    // No initial load, wait for class selection and search
  }, []);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('azilearn_search_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (query: string, cat: string = category, currentClass: string | null = selectedClass, shouldBlur: boolean = false) => {
    const requestId = ++lastRequestId.current;
    
    if (shouldBlur && searchInputRef.current) {
      searchInputRef.current.blur();
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    if (query) {
      addToHistory(query);
    }
    
    try {
      console.log(`[Request ${requestId}] Searching with:`, { query, cat, currentClass });
      let supabaseQuery = supabase
        .from('experiments')
        .select('id, title, keywords, html_content, slides, audio_url, subject, grade, created_at');
      
      if (currentClass) {
        supabaseQuery = supabaseQuery.eq('grade', currentClass);
      }
      
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(`keywords.ilike.%${query}%,title.ilike.%${query}%,subject.ilike.%${query}%`);
      }

      const { data, error } = await supabaseQuery.order('created_at', { ascending: false }).limit(100);

      if (error) throw error;
      
      // If this is not the latest request, ignore the results
      if (requestId !== lastRequestId.current) {
        console.log(`[Request ${requestId}] Ignored (newer request exists)`);
        return;
      }

      let filteredData = data || [];
      console.log(`[Request ${requestId}] Found ${filteredData.length} results before category filter`);
      
      if (cat !== 'all') {
        filteredData = filteredData.filter(exp => {
          if (cat === 'slides') return exp.slides && exp.slides.length > 0;
          if (cat === 'audio') return !!exp.audio_url;
          if (cat === 'notes') return !!exp.html_content && (!exp.slides || exp.slides.length === 0);
          return true;
        });
      }

      setResults(filteredData);
    } catch (err: any) {
      if (requestId !== lastRequestId.current) return;
      console.error(`[Request ${requestId}] Search error:`, err);
      setError(err.message || "Could not load results.");
      showToast(err.message || "Failed to load content.", "error");
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

  const openExperiment = (exp: Experiment) => {
    setSelectedExperiment(exp);
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

  const availableResults = React.useMemo(() => results.filter(r => accessResult?.access), [results, accessResult]);
  const lockedResults = React.useMemo(() => results.filter(r => !accessResult?.access), [results, accessResult]);

  return (
    <div className="max-w-[420px] mx-auto bg-brand-bg min-h-screen relative pb-32">
      {/* SEARCH OVERLAY */}
      <AnimatePresence>
        {activeTab === 'search' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-brand-bg/98 backdrop-blur-xl flex flex-col p-6"
          >
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setActiveTab('home')}
                className="w-12 h-12 flex items-center justify-center bg-brand-surface rounded-full border border-brand-border text-brand-text shadow-sm active:scale-90 transition-transform"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full -mt-20">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 bg-brand-accent/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-2">
                    <Search className="text-brand-accent" size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-brand-text tracking-tight">Search Lessons</h2>
                  <p className="text-brand-muted text-[15px] font-medium leading-relaxed">
                    Find exactly what you need to learn today. Type a topic or subject.
                  </p>
                </div>
                
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent group-focus-within:scale-110 transition-transform">
                    <Search size={28} />
                  </div>
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Search for a topic..."
                    className="w-full h-20 pl-16 pr-6 bg-brand-surface border-2 border-brand-accent rounded-3xl text-xl font-bold text-brand-text outline-none shadow-2xl shadow-brand-accent/20 placeholder:text-brand-muted/40"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(searchQuery, category, selectedClass, true);
                        setActiveTab('home');
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-muted text-center">Popular Subjects</div>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    {['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Geography'].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => {
                          setSearchQuery(tag);
                          handleSearch(tag, category, selectedClass, true);
                          setActiveTab('home');
                        }}
                        className="px-6 py-3 bg-brand-surface border border-brand-border rounded-2xl text-sm font-bold text-brand-text hover:border-brand-accent hover:text-brand-accent hover:bg-brand-accent/5 transition-all active:scale-95 shadow-sm"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP SEARCH BAR */}
      {activeTab === 'home' && selectedClass && (
        <div className="sticky top-0 z-[100] p-3 pt-4 bg-transparent pointer-events-none">
          <div className={`flex items-center bg-brand-surface rounded-full shadow-lg px-4 h-14 gap-3 pointer-events-auto border transition-all duration-300 ${isSearchFocused ? 'border-brand-accent ring-4 ring-brand-accent/10' : 'border-brand-border/50'}`}>
            <Search className={`${isSearchFocused ? 'text-brand-accent' : 'text-brand-muted'} transition-colors shrink-0`} size={20} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search for a topic..." 
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
          {!selectedClass ? (
            <div className="px-4 py-6 space-y-8">
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
                          setSelectedClass(grade);
                          setSearchQuery('');
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
                          setSelectedClass(form);
                          setSearchQuery('');
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
                        setSelectedClass('KCSE');
                        setSearchQuery('');
                      }}
                      className="h-16 bg-brand-surface border border-brand-border rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-brand-text hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95 shadow-sm group col-span-2"
                    >
                      <span className="text-lg">KCSE</span>
                      <span className="text-[10px] uppercase tracking-tighter opacity-60 group-hover:opacity-100">Revision</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-6 flex items-center gap-4">
                <button 
                  onClick={() => {
                    setSelectedClass(null);
                    setHasSearched(false);
                    setSearchQuery('');
                  }}
                  className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center text-brand-text active:scale-90 transition-transform"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h1 className="font-sans text-xl font-bold text-brand-text leading-tight">
                    {selectedClass}
                  </h1>
                  <p className="text-[12px] text-brand-muted font-sans">Search for notes and materials</p>
                </div>
              </div>

              {/* RESULTS LIST */}
              <div className="flex gap-2 px-4 py-2 overflow-x-auto hide-scrollbar">
            {[
              { id: 'all', label: 'All Materials', icon: FlaskConical },
              { id: 'notes', label: 'Study Notes', icon: FileText },
              { id: 'slides', label: 'Slides', icon: PlayCircle },
              { id: 'audio', label: 'Audio Lessons', icon: Mic2 },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={(e) => {
                  rippleEffect(e);
                  setCategory(cat.id as any);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-sans text-[13px] font-medium transition-all border relative overflow-hidden shrink-0 shadow-sm ${
                  category === cat.id 
                    ? 'bg-brand-accent border-brand-accent text-white' 
                    : 'bg-brand-surface border-brand-border text-brand-text'
                }`}
              >
                <cat.icon size={15} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* CONTENT CARDS */}
          <div className="mt-4">
            {loading ? (
              <div className="px-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-32 bg-brand-surface/50 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-brand-surface/30 rounded animate-pulse" />
                </div>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-brand-surface rounded-[14px] p-4 border border-brand-border/30 animate-pulse flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-bg/50" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-brand-bg/50 rounded w-3/4" />
                      <div className="h-3 bg-brand-bg/30 rounded w-1/2" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-brand-bg/30" />
                  </div>
                ))}
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent/5 rounded-full border border-brand-accent/10">
                    <Loader2 className="animate-spin text-brand-accent" size={16} />
                    <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">Content Coming Soon...</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {availableResults.length > 0 && (
                  <div className="mb-6">
                    <div className="font-sans text-[13px] font-medium text-brand-muted px-4 py-2 uppercase tracking-wider">Available</div>
                    <div className="px-3 space-y-2.5">
                      {availableResults.map((exp) => (
                        <div 
                          key={exp.id} 
                          onClick={(e) => {
                            rippleEffect(e);
                            openExperiment(exp);
                          }}
                          className="bg-brand-surface rounded-[14px] p-3.5 flex items-center gap-3 shadow-sm active:scale-[0.985] transition-all relative overflow-hidden border border-brand-border/30"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            exp.slides?.length ? 'bg-orange-50 text-brand-accent' : 
                            exp.audio_url ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {exp.slides?.length ? <PlayCircle size={22} /> : exp.audio_url ? <Mic2 size={22} /> : <FileText size={22} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-sans text-sm font-medium text-brand-text truncate">{exp.title}</div>
                            <div className="text-[12px] text-brand-muted mt-0.5">{exp.subject || 'Study Material'}</div>
                          </div>
                          <button className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:bg-brand-bg transition-colors">
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lockedResults.length > 0 && (
                  <div>
                    <div className="font-sans text-[13px] font-medium text-brand-muted px-4 py-2 uppercase tracking-wider">Locked</div>
                    <div className="px-3 space-y-2.5">
                      {lockedResults.map((exp) => (
                        <div 
                          key={exp.id} 
                          onClick={(e) => {
                            rippleEffect(e);
                            openExperiment(exp);
                          }}
                          className="bg-brand-surface rounded-[14px] p-3.5 flex items-center gap-3 shadow-sm active:scale-[0.985] transition-all relative overflow-hidden border border-brand-border/30 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center shrink-0 opacity-40">
                            {exp.slides?.length ? <PlayCircle size={22} /> : exp.audio_url ? <Mic2 size={22} /> : <FileText size={22} />}
                          </div>
                          <div className="flex-1 min-w-0 opacity-40">
                            <div className="font-sans text-sm font-medium text-brand-text truncate">{exp.title}</div>
                            <div className="text-[12px] text-brand-muted mt-0.5">{exp.subject || 'Study Material'}</div>
                          </div>
                          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-brand-accent/10 border border-brand-accent/30 rounded-full px-2.5 py-1">
                            <Lock size={10} className="text-brand-accent" />
                            <span className="font-sans text-[11px] font-bold text-brand-accent">UNLOCK</span>
                          </div>
                          <button className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted opacity-40">
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.length === 0 && hasSearched && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center p-12 mx-4 bg-brand-surface rounded-[2rem] border border-brand-border shadow-sm"
                  >
                    <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Search className="text-brand-muted/40" size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">No matches found</h3>
                    <p className="text-brand-muted text-[13px] mb-8 leading-relaxed">
                      We couldn't find any lessons for <span className="text-brand-text font-bold">"{searchQuery}"</span>. 
                      Try searching for a different topic or subject.
                    </p>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => { setSearchQuery(''); handleSearch(''); }}
                        className="w-full py-4 bg-brand-accent text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                      >
                        Clear Search
                      </button>
                      <button 
                        onClick={() => setCategory('all')}
                        className="w-full py-4 bg-brand-surface border border-brand-border text-brand-text rounded-2xl text-sm font-bold active:scale-95 transition-all"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </>
      )}
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

              {/* Admin Link */}
              <button 
                onClick={onAdminClick}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-brand-text text-sm group-hover:text-brand-accent transition-colors">Admin Dashboard</p>
                    <p className="text-[11px] text-brand-muted">Manage payments and content</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-all">
                  <ChevronLeft size={16} className="rotate-180" />
                </div>
              </button>
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

      {/* FAB PAYMENT BUTTON */}
      <button 
        onClick={(e) => {
          rippleEffect(e);
          onShowPlans();
        }}
        className="fixed bottom-24 right-4 bg-brand-accent text-white rounded-full h-[52px] px-5 flex items-center gap-2 shadow-lg shadow-brand-accent/40 active:scale-95 transition-all z-[199] font-sans text-sm font-bold relative overflow-hidden"
      >
        <Smartphone size={18} />
        Payment Plans
      </button>

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

      {/* Experiment Modal */}
      <AnimatePresence>
        {selectedExperiment && (
          <PremiumGate 
            lessonId={selectedExperiment.id.toString()}
            onClose={() => setSelectedExperiment(null)}
            onPayClick={() => onShowPlans()}
            onEnterCode={onEnterCode}
          >
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
                <button
                  onClick={() => setSelectedExperiment(null)}
                  className="bg-brand-accent text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm"
                >
                  Exit
                </button>
              </div>
              
              <div className="flex-1 bg-black">
                {selectedExperiment.slides && selectedExperiment.slides.length > 0 ? (
                  <SlidesViewer 
                    slides={selectedExperiment.slides} 
                    audioUrl={selectedExperiment.audio_url} 
                  />
                ) : selectedExperiment.html_content ? (
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
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-brand-muted gap-4 bg-brand-bg">
                    <AlertCircle size={48} className="text-brand-accent/20" />
                    <p className="font-bold">No content available.</p>
                  </div>
                )}
              </div>
            </div>
          </PremiumGate>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-brand-surface/10 border border-brand-surface/20 p-4 rounded-2xl animate-pulse">
      <div className="h-6 bg-brand-surface/30 rounded-lg w-3/4 mb-3"></div>
      <div className="flex gap-2">
        <div className="h-4 bg-brand-surface/20 rounded-full w-16"></div>
        <div className="h-4 bg-brand-surface/20 rounded-full w-20"></div>
      </div>
    </div>
  );
}
