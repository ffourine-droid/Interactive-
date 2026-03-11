/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AziLearn - Subscription-based study materials platform
 */
import React, { useState, useEffect } from 'react';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, ChevronLeft, Shield, Settings, Sun, Moon, Download, Trash2, WifiOff, CheckCircle2, Lock, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { PremiumGate } from './components/PremiumGate';
import { Pay } from './pages/Pay';
import { Access } from './pages/Access';
import { AdminPayments } from './pages/AdminPayments';

interface Experiment {
  id: string | number;
  title: string;
  keywords: string;
  html_content: string;
  subject?: string;
}

type Page = 'home' | 'pay' | 'access' | 'admin';
type Plan = 'daily' | 'weekly' | 'monthly';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('daily');
  const [selectedLesson, setSelectedLesson] = useState<Experiment | null>(null);

  // Simple router
  const renderPage = () => {
    switch (currentPage) {
      case 'pay':
        return (
          <Pay 
            plan={selectedPlan} 
            lessonId={selectedLesson?.id.toString()} 
            lessonTitle={selectedLesson?.title}
            onBack={() => setCurrentPage('home')} 
          />
        );
      case 'access':
        return (
          <Access 
            onBack={() => setCurrentPage('home')} 
            onSuccess={() => setCurrentPage('home')}
            onPayClick={() => setCurrentPage('pay')}
          />
        );
      case 'admin':
        return <AdminPayments />;
      case 'home':
      default:
        return (
          <Home 
            onPayPlan={(plan, lesson) => {
              setSelectedPlan(plan);
              setSelectedLesson(lesson || null);
              setCurrentPage('pay');
            }}
            onEnterCode={() => setCurrentPage('access')}
            onAdminClick={() => setCurrentPage('admin')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent/30">
      {renderPage()}
    </div>
  );
}

function Home({ onPayPlan, onEnterCode, onAdminClick }: { 
  onPayPlan: (plan: Plan, lesson?: Experiment) => void,
  onEnterCode: () => void,
  onAdminClick: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    handleSearch('');
  }, []);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      let supabaseQuery = supabase.from('experiments').select('id, title, keywords');
      
      if (query) {
        supabaseQuery = supabaseQuery.or(`keywords.ilike.%${query}%,title.ilike.%${query}%`);
      }

      const { data, error } = await supabaseQuery.limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openExperiment = (exp: Experiment) => {
    setSelectedExperiment(exp);
  };

  return (
    <div className={theme}>
      <div className="min-h-screen bg-brand-bg transition-colors duration-500">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-[100] bg-brand-bg/80 backdrop-blur-xl border-b border-brand-surface/40">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
                <FlaskConical className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black tracking-tighter">AZILEARN</span>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 hover:bg-brand-surface/40 rounded-xl transition-colors text-brand-text/40"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={onEnterCode}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand-surface/20 hover:bg-brand-surface/40 rounded-xl transition-all text-sm font-bold"
              >
                <Key size={18} />
                Enter Code
              </button>
              <button 
                onClick={onAdminClick}
                className="p-2 hover:bg-brand-surface/40 rounded-xl transition-colors text-brand-text/40"
              >
                <Shield size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col items-center justify-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">
                    Welcome, Explorer.
                  </h1>
                  <p className="text-brand-text/60 text-lg">What are we learning today?</p>
                </div>
              </motion.div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-12">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-text/20" size={24} />
              <input
                type="text"
                placeholder="Search for a topic (e.g. Photosynthesis, Algebra)..."
                className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-[2rem] py-6 pl-16 pr-6 outline-none focus:border-brand-accent/50 transition-all text-lg shadow-xl"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
              />
            </div>

            {/* Pricing CTA */}
            <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-brand-surface/20 border border-brand-surface/40 rounded-3xl flex flex-col items-center text-center">
                <h3 className="text-lg font-bold mb-1">Daily Pass</h3>
                <p className="text-2xl font-black text-brand-accent mb-4">KES 10</p>
                <button 
                  onClick={() => onPayPlan('daily')}
                  className="w-full py-3 bg-brand-accent text-white rounded-xl font-bold hover:scale-105 transition-all"
                >
                  Get 1 Day
                </button>
              </div>
              <div className="p-6 bg-brand-accent/10 border border-brand-accent/20 rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-accent text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Popular</div>
                <h3 className="text-lg font-bold mb-1">Weekly Pass</h3>
                <p className="text-2xl font-black text-brand-accent mb-4">KES 50</p>
                <button 
                  onClick={() => onPayPlan('weekly')}
                  className="w-full py-3 bg-brand-accent text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-brand-accent/20"
                >
                  Get 7 Days
                </button>
              </div>
              <div className="p-6 bg-brand-surface/20 border border-brand-surface/40 rounded-3xl flex flex-col items-center text-center">
                <h3 className="text-lg font-bold mb-1">Monthly Pass</h3>
                <p className="text-2xl font-black text-brand-accent mb-4">KES 120</p>
                <button 
                  onClick={() => onPayPlan('monthly')}
                  className="w-full py-3 bg-brand-accent text-white rounded-xl font-bold hover:scale-105 transition-all"
                >
                  Get 30 Days
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((exp, idx) => (
                    <motion.div
                      key={exp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => openExperiment(exp)}
                      className="group relative bg-brand-surface/20 border border-brand-surface/40 p-4 rounded-2xl hover:bg-brand-surface/40 hover:border-brand-accent/30 transition-all duration-300 cursor-pointer overflow-hidden"
                    >
                      <div className="blur-[2px] opacity-60">
                        <h3 className="text-base font-bold group-hover:text-brand-accent transition-colors truncate pr-12">
                          {exp.title}
                        </h3>
                        <p className="text-[10px] text-brand-text/40 uppercase tracking-widest mt-1">
                          Study Material
                        </p>
                      </div>

                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/5 backdrop-blur-[1px] group-hover:bg-black/10 transition-all">
                        <Lock size={16} className="text-brand-accent mb-1" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Unlock Lesson</span>
                      </div>

                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <ExternalLink size={16} className="text-brand-text/20 group-hover:text-brand-accent transition-colors shrink-0" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : hasSearched && (
                <div className="text-center p-12 bg-brand-surface/10 rounded-3xl border border-dashed border-brand-surface/40">
                  <p className="text-brand-text/40">No lessons found. Try a different topic.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Experiment Modal (PremiumGate handles access) */}
        <AnimatePresence>
          {selectedExperiment && (
            <PremiumGate 
              lessonId={selectedExperiment.id.toString()}
              onClose={() => setSelectedExperiment(null)}
              onPayClick={() => onPayPlan('daily', selectedExperiment)}
              onEnterCode={onEnterCode}
            >
              <div className="fixed inset-0 z-[100] bg-brand-bg flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-surface/50 bg-brand-surface/10 backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedExperiment(null)}
                      className="w-12 h-12 rounded-2xl border border-brand-surface/50 flex items-center justify-center hover:bg-brand-surface/20 transition-colors"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div>
                      <h2 className="font-bold text-xl text-brand-text leading-none mb-1">{selectedExperiment.title}</h2>
                      <p className="text-[10px] text-brand-accent font-black uppercase tracking-[0.2em]">Live Experiment</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedExperiment(null)}
                    className="bg-brand-accent text-white px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all"
                  >
                    Exit
                  </button>
                </div>
                
                <div className="flex-1 bg-white">
                  <iframe
                    title={selectedExperiment.title}
                    srcDoc={selectedExperiment.html_content}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-modals"
                  />
                </div>
              </div>
            </PremiumGate>
          )}
        </AnimatePresence>
      </div>
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
