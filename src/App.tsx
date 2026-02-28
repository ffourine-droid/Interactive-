/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, ChevronLeft, User, MoreVertical, History, Trash2, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Supabase configuration using Vite environment variables
const getSupabaseUrl = () => {
  let url = (import.meta.env.VITE_SUPABASE_URL || 'https://nfttlgbkdvuutrgmthkz.supabase.co').trim();
  if (url && !url.includes('.') && !url.startsWith('http')) {
    return `https://${url}.supabase.co`;
  }
  return url;
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let supabase: any = null;
try {
  if (SUPABASE_URL && (SUPABASE_URL.startsWith('http://') || SUPABASE_URL.startsWith('https://'))) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'no-key-provided');
  }
} catch (err) {
  console.error('Supabase initialization error:', err);
}

interface Experiment {
  id: string | number;
  title: string;
  keywords: string;
  html_content: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('azilearn_history');
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      localStorage.removeItem('azilearn_history');
    }
  }, []);

  const saveToHistory = (query: string) => {
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('azilearn_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('azilearn_history');
  };

  const isConfigured = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your-anon-key';

  const handleSearch = async (e?: FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const query = (overrideQuery || searchQuery).trim();
    if (!query) return;

    if (overrideQuery) setSearchQuery(overrideQuery);

    if (!supabase) {
      setError('Supabase client failed to initialize. Please check your URL.');
      return;
    }

    if (!isConfigured) {
      setError('Supabase Key Missing. Please set VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    saveToHistory(query);
    
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('id, title, keywords, html_content')
        .ilike('keywords', `%${query}%`);

      if (error) throw error;
      setResults(data || []);
      setIsMenuOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch experiments.');
    } finally {
      setLoading(false);
    }
  };

  const openExperiment = (exp: Experiment) => {
    setSelectedExperiment(exp);
  };

  const closeExperiment = () => {
    setSelectedExperiment(null);
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-cream selection:bg-brand-orange selection:text-white flex flex-col items-center relative overflow-x-hidden">
      {/* Search History Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-brand-black border-r border-brand-brown/50 z-[70] p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-brand-orange">
                  <History size={20} />
                  <span className="font-bold tracking-tight">History</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-brand-brown/30 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {searchHistory.length > 0 ? (
                  searchHistory.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearch(undefined, item)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-brown/30 transition-all text-left group"
                    >
                      <Clock size={16} className="text-brand-cream/20 group-hover:text-brand-orange" />
                      <span className="text-sm font-medium truncate flex-1">{item}</span>
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center opacity-20">
                    <History size={40} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No history yet</p>
                  </div>
                )}
              </div>

              {searchHistory.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="mt-auto flex items-center justify-center gap-2 p-4 text-red-400/60 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all text-sm font-bold"
                >
                  <Trash2 size={16} />
                  Clear History
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Menu Trigger: Top Left */}
      <div className="fixed top-6 left-6 z-50">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="w-12 h-12 rounded-2xl bg-brand-brown/30 border border-brand-brown/50 flex items-center justify-center text-brand-cream/40 hover:text-brand-orange hover:border-brand-orange/30 transition-all active:scale-95"
        >
          <MoreVertical size={24} />
        </button>
      </div>

      {/* Main Container: Mobile-first, max-width 600px on desktop */}
      <main className="w-full max-w-[600px] px-6 py-8 flex flex-col min-h-screen">
        
        {/* Logo Section: Top Aligned */}
        <header className="flex flex-col items-center gap-3 mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-12 h-12 bg-brand-orange rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-brand-orange/20"
          >
            A
          </motion.div>
          <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-40">AZILEARN</span>
        </header>

        {/* Hero Section: Centered Content */}
        <div className="flex-1 flex flex-col justify-center gap-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <h1 className="font-extrabold tracking-tighter text-welcome">
              Welcome.
            </h1>
          </motion.div>

          {/* Search Bar: Large Tap Targets, Responsive Width */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearch} 
            className="w-full max-w-[400px] mx-auto relative group"
          >
            <div className="absolute inset-0 bg-brand-orange/15 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center bg-brand-brown/40 border border-brand-brown/60 rounded-xl p-1 focus-within:border-brand-orange/50 transition-all duration-300 backdrop-blur-xl gap-1">
              <div className="flex items-center flex-1 px-2 py-1.5">
                <Search size={16} className="text-brand-cream/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-transparent border-none outline-none px-2 text-sm font-medium placeholder:text-brand-cream/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-brand-orange text-white px-4 py-2 rounded-lg font-bold text-xs hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-brand-orange/10 min-h-[36px] flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
              </button>
            </div>
          </motion.form>

          {/* Results Section: Responsive Grid */}
          <div className="mt-4 min-h-[100px]">
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 mb-6"
                >
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <div className="text-sm">
                    <p className="font-bold">Error</p>
                    <p className="opacity-80">{error}</p>
                  </div>
                </motion.div>
              )}

              <div className="flex flex-col gap-3">
                {loading ? (
                  [1, 2].map((i) => <SkeletonCard key={i} />)
                ) : results.length > 0 ? (
                  results.map((exp, idx) => (
                    <motion.div
                      key={exp.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => openExperiment(exp)}
                      className="group bg-brand-brown/20 border border-brand-brown/40 p-4 rounded-2xl hover:bg-brand-brown/30 hover:border-brand-orange/30 transition-all duration-300 cursor-pointer flex items-center justify-between min-h-[64px]"
                    >
                      <h3 className="text-base-responsive font-semibold group-hover:text-brand-orange transition-colors truncate pr-4">
                        {exp.title}
                      </h3>
                      <ExternalLink size={16} className="text-brand-cream/20 group-hover:text-brand-orange transition-colors shrink-0" />
                    </motion.div>
                  ))
                ) : hasSearched && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <p className="text-sm font-bold text-brand-cream/20 uppercase tracking-widest">No results found</p>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer: Bottom Aligned */}
        <footer className="py-8 mt-auto text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-20">
            &copy; 2024 AZILEARN
          </p>
        </footer>
      </main>

      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {selectedExperiment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brand-black flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-brown/50 bg-brand-brown/10 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeExperiment}
                  className="w-12 h-12 rounded-2xl border border-brand-brown/50 flex items-center justify-center hover:bg-brand-brown/20 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h2 className="font-bold text-xl text-brand-cream leading-none mb-1">{selectedExperiment.title}</h2>
                  <p className="text-[10px] text-brand-orange font-black uppercase tracking-[0.2em]">Live Experiment</p>
                </div>
              </div>
              <button
                onClick={closeExperiment}
                className="bg-brand-orange text-white px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-brand-brown/10 border border-brand-brown/20 p-8 rounded-[2rem] animate-pulse">
      <div className="h-8 bg-brand-brown/30 rounded-lg w-3/4 mb-4"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-brand-brown/20 rounded-full w-16"></div>
        <div className="h-6 bg-brand-brown/20 rounded-full w-20"></div>
      </div>
    </div>
  );
}
