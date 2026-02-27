/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, FormEvent, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Supabase configuration using Vite environment variables
const getSupabaseUrl = () => {
  let url = (import.meta.env.VITE_SUPABASE_URL || 'https://nfttlgbkdvuutrgmthkz.supabase.co').trim();
  // If it's just a project ref (e.g. "nfttlgbkdvuutrgmthkz"), convert to full URL
  if (url && !url.includes('.') && !url.startsWith('http')) {
    return `https://${url}.supabase.co`;
  }
  return url;
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Safe initialization to prevent app crash on invalid URL
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
      setError('Supabase client failed to initialize. Please check if VITE_SUPABASE_URL is a valid URL (e.g., https://your-project.supabase.co).');
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      setError('Supabase Key Missing. Please set VITE_SUPABASE_ANON_KEY in your environment variables.');
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
      console.error('Search error:', err);
      setError(err.message || 'Failed to fetch experiments. Please check your Supabase configuration.');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header / Logo Section */}
        <header className="text-center mb-12">
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              animate={{ 
                borderRadius: ["22% 78% 70% 30% / 30% 30% 70% 70%", "70% 30% 30% 70% / 70% 70% 30% 30%", "22% 78% 70% 30% / 30% 30% 70% 70%"]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 mb-4 bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-indigo-500/20"
            >
              A
            </motion.div>
            <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-sky-500 to-violet-600 bg-clip-text text-transparent">
              AziLearn
            </h1>
            <p className="text-slate-500 font-medium mt-2">Interactive Experiment Explorer</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-violet-400 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-slate-200 p-2 focus-within:border-indigo-300 transition-all">
              <Search className="w-5 h-5 ml-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search keywords (e.g. physics, light)..."
                className="flex-1 px-4 py-3 bg-transparent outline-none text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </button>
            </div>
          </form>
        </header>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl text-red-800"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="font-bold text-lg">Configuration Error</h3>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">{error}</p>
            <div className="mt-4 p-4 bg-white/50 rounded-xl text-xs font-mono border border-red-100">
              Check your Vercel/Environment settings for VITE_SUPABASE_ANON_KEY
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              // Skeleton Loaders
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
                  <div className="h-6 bg-slate-100 rounded-md w-2/3 mb-3"></div>
                  <div className="h-4 bg-slate-50 rounded-md w-1/3"></div>
                </div>
              ))
            ) : results.length > 0 ? (
              results.map((exp) => (
                <motion.div
                  key={exp.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => openExperiment(exp)}
                  className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-xl group-hover:text-indigo-600 transition-colors">{exp.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 italic">{exp.keywords}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </motion.div>
              ))
            ) : hasSearched ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-slate-400"
              >
                <p className="text-xl font-medium">No results found for "{searchQuery}"</p>
                <p className="text-sm mt-2">Try different keywords or check your database.</p>
              </motion.div>
            ) : !error && (
              <div className="text-center py-16 text-slate-300">
                <FlaskConical className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Enter a keyword to start exploring</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {selectedExperiment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeExperiment}
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="font-bold text-xl text-slate-900">{selectedExperiment.title}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Experiment Preview</p>
                </div>
              </div>
              <button
                onClick={closeExperiment}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Close
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
