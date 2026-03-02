/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, ChevronLeft, User, Settings, Sun, Moon, Download, Trash2, WifiOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as storage from './services/storageService';

// Supabase configuration using Vite environment variables
const getSupabaseUrl = () => {
  try {
    const envUrl = import.meta.env?.VITE_SUPABASE_URL;
    let url = (envUrl || 'https://nfttlgbkdvuutrgmthkz.supabase.co').trim();
    if (url && !url.includes('.') && !url.startsWith('http')) {
      return `https://${url}.supabase.co`;
    }
    return url;
  } catch (e) {
    return 'https://nfttlgbkdvuutrgmthkz.supabase.co';
  }
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = (() => {
  try {
    return (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();
  } catch (e) {
    return '';
  }
})();

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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: any) => {
      console.error('Caught error:', error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
        <p className="text-brand-text/60 mb-6">The application encountered an error. Please try refreshing.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-brand-accent text-white px-6 py-2 rounded-xl font-bold"
        >
          Refresh App
        </button>
      </div>
    );
  }

  return <AppContent />;
}

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [downloadedExperiments, setDownloadedExperiments] = useState<Experiment[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string | number>>(new Set());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load downloads
    loadDownloads();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDownloads = async () => {
    try {
      const downloads = await storage.getDownloadedExperiments();
      setDownloadedExperiments(downloads || []);
      setDownloadedIds(new Set((downloads || []).map(d => d.id)));
    } catch (err) {
      console.error('Failed to load downloads:', err);
    }
  };

  const handleDownload = async (e: React.MouseEvent, exp: Experiment) => {
    e.stopPropagation();
    if (downloadedIds.has(exp.id)) {
      await storage.deleteExperiment(exp.id);
    } else {
      await storage.saveExperiment(exp);
    }
    await loadDownloads();
  };

  const isConfigured = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your-anon-key';

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (isOffline) {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      const filtered = downloadedExperiments.filter(exp => 
        exp.title.toLowerCase().includes(query.toLowerCase()) || 
        exp.keywords.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setLoading(false);
      return;
    }

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
    
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('id, title, keywords, html_content')
        .ilike('keywords', `%${query}%`);

      if (error) throw error;
      setResults(data || []);
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
    <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent selection:text-white transition-colors duration-300">
      {/* Bottom Left Controls */}
      <div className="fixed left-6 bottom-6 z-50 flex items-end gap-4">
        {/* Settings Button */}
        <div className="flex flex-col-reverse gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSettings(!showSettings)}
            className="w-12 h-12 rounded-2xl bg-brand-surface/40 border border-brand-surface/60 backdrop-blur-xl flex items-center justify-center text-brand-text hover:border-brand-accent/50 transition-all shadow-xl"
          >
            <Settings size={24} className={showSettings ? 'rotate-90 transition-transform duration-300' : 'transition-transform duration-300'} />
          </motion.button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col gap-2 p-2 bg-brand-surface/40 border border-brand-surface/60 backdrop-blur-xl rounded-2xl"
              >
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-brand-accent/20 transition-colors text-brand-text"
                  title={theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Downloads Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowDownloads(!showDownloads)}
          className={`w-12 h-12 rounded-2xl border backdrop-blur-xl flex items-center justify-center transition-all shadow-xl ${
            showDownloads 
              ? 'bg-brand-accent text-white border-brand-accent' 
              : 'bg-brand-surface/40 border-brand-surface/60 text-brand-text hover:border-brand-accent/50'
          }`}
          title="My Downloads"
        >
          <Download size={24} />
        </motion.button>
      </div>

      {/* Profile Button - Bottom Right */}
      <div className="fixed right-6 bottom-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-2xl bg-brand-surface/40 border border-brand-surface/60 backdrop-blur-xl flex items-center justify-center text-brand-text hover:border-brand-accent/50 transition-all shadow-xl"
        >
          <User size={24} />
        </motion.button>
      </div>

      <main className="max-w-4xl mx-auto px-6 min-h-screen flex flex-col">
        {/* Logo at the very top */}
        <header className="pt-8 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-accent/20">
              A
            </div>
            <span className="text-xs font-black tracking-tighter opacity-50">AZILEARN v1.0.5</span>
          </motion.div>
        </header>

        {/* Search bar in the middle area */}
        <div className="flex-1 flex flex-col justify-center -mt-20">
          <AnimatePresence mode="wait">
            {showDownloads ? (
              <motion.div
                key="downloads-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-extrabold tracking-tighter">My Downloads</h2>
                  <button 
                    onClick={() => setShowDownloads(false)}
                    className="text-sm font-bold text-brand-accent hover:underline"
                  >
                    Back to Search
                  </button>
                </div>

                {downloadedExperiments.length === 0 ? (
                  <div className="text-center py-20 bg-brand-surface/10 rounded-[2rem] border border-dashed border-brand-surface/40">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold text-brand-text/40">No offline materials yet.</p>
                    <p className="text-sm text-brand-text/20">Download experiments to view them without internet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {downloadedExperiments.map((exp) => (
                      <motion.div
                        key={exp.id}
                        layoutId={`exp-${exp.id}`}
                        onClick={() => openExperiment(exp)}
                        className="group bg-brand-surface/20 border border-brand-surface/40 p-4 rounded-2xl hover:bg-brand-surface/40 hover:border-brand-accent/30 transition-all duration-300 cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex-1 truncate pr-4">
                          <h3 className="text-base font-bold group-hover:text-brand-accent transition-colors truncate">
                            {exp.title}
                          </h3>
                          <p className="text-[10px] text-brand-text/40 uppercase tracking-widest mt-1">Available Offline</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDownload(e, exp)}
                            className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from downloads"
                          >
                            <Trash2 size={16} />
                          </button>
                          <ExternalLink size={16} className="text-brand-text/20 group-hover:text-brand-accent transition-colors shrink-0" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="search-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-6"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">
                      Welcome.
                    </h1>
                    {isOffline && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-[10px] font-black uppercase tracking-widest">
                        <WifiOff size={12} />
                        Offline Mode
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Search Bar */}
                <motion.form 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onSubmit={handleSearch} 
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-brand-accent/20 rounded-[2rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex items-center bg-brand-surface/40 border border-brand-surface/60 rounded-2xl p-1.5 focus-within:border-brand-accent/50 transition-all duration-300 backdrop-blur-xl">
                    <div className="pl-3 text-brand-text/40">
                      <Search size={20} />
                    </div>
                    <input
                      type="text"
                      placeholder={isOffline ? "Search downloads..." : "Search..."}
                      className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-base font-medium placeholder:text-brand-text/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={loading || (isOffline && !searchQuery)}
                      className="bg-brand-accent text-white px-6 py-2 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-brand-accent/20"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </button>
                  </div>
                </motion.form>

                {/* Results Section (Appears below search when searched) */}
                <div className="mt-8">
                  <AnimatePresence mode="popLayout">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4 text-red-400 mb-8"
                      >
                        <AlertCircle className="shrink-0 mt-1" />
                        <div>
                          <h3 className="font-bold text-lg">Oops!</h3>
                          <p className="text-sm opacity-80">{error}</p>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {loading ? (
                        [1, 2].map((i) => <SkeletonCard key={i} />)
                      ) : results.length > 0 ? (
                        results.map((exp, idx) => (
                          <motion.div
                            key={exp.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => openExperiment(exp)}
                            className="group bg-brand-surface/20 border border-brand-surface/40 p-4 rounded-2xl hover:bg-brand-surface/40 hover:border-brand-accent/30 transition-all duration-300 cursor-pointer flex items-center justify-between"
                          >
                            <h3 className="text-base font-bold group-hover:text-brand-accent transition-colors truncate pr-4">
                              {exp.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => handleDownload(e, exp)}
                                className={`p-2 rounded-xl transition-all ${
                                  downloadedIds.has(exp.id)
                                    ? 'text-brand-accent bg-brand-accent/10'
                                    : 'text-brand-text/20 hover:bg-brand-accent/10 hover:text-brand-accent'
                                }`}
                                title={downloadedIds.has(exp.id) ? "Saved Offline" : "Download for Offline"}
                              >
                                {downloadedIds.has(exp.id) ? <CheckCircle2 size={16} /> : <Download size={16} />}
                              </button>
                              <ExternalLink size={16} className="text-brand-text/20 group-hover:text-brand-accent transition-colors shrink-0" />
                            </div>
                          </motion.div>
                        ))
                      ) : hasSearched && (
                        <div className="col-span-full text-center py-10">
                          <p className="text-lg font-bold text-brand-text/20 italic">No results.</p>
                        </div>
                      )}
                    </div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {selectedExperiment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brand-bg flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-surface/50 bg-brand-surface/10 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeExperiment}
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
                onClick={closeExperiment}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-brand-surface/10 border border-brand-surface/20 p-8 rounded-[2rem] animate-pulse">
      <div className="h-8 bg-brand-surface/30 rounded-lg w-3/4 mb-4"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-brand-surface/20 rounded-full w-16"></div>
        <div className="h-6 bg-brand-surface/20 rounded-full w-20"></div>
      </div>
    </div>
  );
}
