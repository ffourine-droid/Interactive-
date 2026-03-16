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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('azilearn_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  const { showToast } = useToast();

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
            theme={theme}
            setTheme={setTheme}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent/30 transition-colors duration-500`}>
      {renderPage()}
    </div>
  );
}

function Home({ accessResult, onPayPlan, onEnterCode, onAdminClick, profile, onLogout, theme, setTheme }: { 
  accessResult: AccessResult | null,
  onPayPlan: (plan: Plan, lesson?: Experiment) => void,
  onEnterCode: () => void,
  onAdminClick: () => void,
  profile: Profile | null,
  onLogout: () => void,
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
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const { showToast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    handleSearch(debouncedQuery, category);
  }, [debouncedQuery, category]);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('azilearn_search_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (query: string, cat: string = category) => {
    if (!navigator.onLine) {
      setError("You are offline. Results may be outdated.");
      showToast("You are offline", "error");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    if (query) {
      addToHistory(query);
    }
    
    try {
      let supabaseQuery = supabase.from('experiments').select('id, title, keywords, html_content, slides, audio_url, subject');
      
      const filters: string[] = [];
      if (query) {
        filters.push(`keywords.ilike.%${query}%,title.ilike.%${query}%,subject.ilike.%${query}%`);
      }

      if (filters.length > 0) {
        supabaseQuery = supabaseQuery.or(filters.join(','));
      }

      const { data, error } = await supabaseQuery.limit(50);

      if (error) {
        if (error.message.includes('network')) {
          throw new Error("Network error. Please check your connection.");
        }
        throw error;
      }
      
      let filteredData = data || [];
      
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
      console.error('Search error:', err);
      setError(err.message);
      showToast(err.message || "Failed to load content.", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const availableResults = results.filter(r => accessResult?.access);
  const lockedResults = results.filter(r => !accessResult?.access);

  return (
    <div className="max-w-[420px] mx-auto bg-brand-bg min-h-screen relative pb-32">
      {/* TOP SEARCH BAR */}
      <div className="sticky top-0 z-[100] p-3 pt-4 bg-transparent pointer-events-none">
        <div className="flex items-center bg-brand-surface rounded-full shadow-md px-4 h-12 gap-3 pointer-events-auto border border-brand-border/50">
          <Search className="text-brand-muted shrink-0" size={18} />
          <input 
            type="text" 
            placeholder="Search for a topic..." 
            className="flex-1 bg-transparent border-none outline-none font-sans text-[15px] text-brand-text placeholder:text-brand-muted/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-brand-bg rounded-full text-brand-muted transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button 
            onClick={(e) => {
              rippleEffect(e);
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            className="w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform relative overflow-hidden"
          >
            <span className="font-sans font-bold text-sm uppercase">
              {profile?.username?.[0] || 'A'}
            </span>
          </button>
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

      {/* HERO */}
      <div className="px-4 py-6">
        <h1 className="font-sans text-2xl font-bold text-brand-text leading-tight">
          Welcome, {profile?.username || 'Explorer'}.
        </h1>
        <p className="text-[13px] text-brand-muted mt-1 font-sans">What are we learning today?</p>
      </div>

      {/* FILTER CHIPS */}
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
          <div className="px-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-brand-surface/50 rounded-2xl animate-pulse border border-brand-border/50" />
            ))}
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

      {/* FAB PAYMENT BUTTON */}
      <button 
        onClick={(e) => {
          rippleEffect(e);
          onPayPlan('daily');
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
            { id: 'search', label: 'Search', icon: Search, action: () => setActiveTab('search') },
            { id: 'admin', label: 'Admin', icon: Shield, action: onAdminClick },
            { id: 'logout', label: 'Logout', icon: User, action: onLogout },
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
            onPayClick={() => onPayPlan('daily', selectedExperiment)}
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
                    srcDoc={selectedExperiment.html_content}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-modals"
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
