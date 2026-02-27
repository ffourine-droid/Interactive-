/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, ChevronLeft, User } from 'lucide-react';
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

  const isConfigured = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your-anon-key';

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

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
    <div className="min-h-screen bg-brand-black text-brand-cream selection:bg-brand-orange selection:text-white">
      <main className="max-w-4xl mx-auto px-6 min-h-screen flex flex-col">
        {/* Logo at the very top */}
        <header className="pt-8 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-orange/20">
              A
            </div>
            <span className="text-xs font-black tracking-tighter opacity-50">AZILEARN</span>
          </motion.div>
        </header>

        {/* Search bar in the middle area */}
        <div className="flex-1 flex flex-col justify-center -mt-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">
              Welcome.
            </h1>
          </motion.div>

          {/* Search Bar */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearch} 
            className="relative group"
          >
            <div className="absolute inset-0 bg-brand-orange/20 rounded-[2rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center bg-brand-brown/40 border border-brand-brown/60 rounded-2xl p-1.5 focus-within:border-brand-orange/50 transition-all duration-300 backdrop-blur-xl">
              <div className="pl-3 text-brand-cream/40">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-base font-medium placeholder:text-brand-cream/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                disabled={loading}
                className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-brand-orange/20"
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
                      className="group bg-brand-brown/20 border border-brand-brown/40 p-4 rounded-2xl hover:bg-brand-brown/40 hover:border-brand-orange/30 transition-all duration-300 cursor-pointer flex items-center justify-between"
                    >
                      <h3 className="text-base font-bold group-hover:text-brand-orange transition-colors truncate pr-4">
                        {exp.title}
                      </h3>
                      <ExternalLink size={16} className="text-brand-cream/20 group-hover:text-brand-orange transition-colors shrink-0" />
                    </motion.div>
                  ))
                ) : hasSearched && (
                  <div className="col-span-full text-center py-10">
                    <p className="text-lg font-bold text-brand-cream/20 italic">No results.</p>
                  </div>
                )}
              </div>
            </AnimatePresence>
          </div>
        </div>
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
