/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, FlaskConical, ExternalLink, Loader2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Supabase configuration
// Note: These should be set in your environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('id, title, keywords, html_content')
        .ilike('keywords', `%${searchQuery}%`);

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
    <div className="min-h-screen flex flex-col">
      {/* Header / Search Bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl shrink-0">
            <FlaskConical className="w-6 h-6" />
            <span>ExpExplorer</span>
          </div>
          
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search experiments by keyword..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Configuration Error</p>
              <p className="text-sm opacity-90">{error}</p>
              <p className="text-xs mt-2 font-mono bg-red-100/50 p-2 rounded">
                Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.
              </p>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {results.length > 0 ? (
              results.map((exp) => (
                <motion.div
                  key={exp.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => openExperiment(exp)}
                  className="group bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-indigo-600 transition-colors">{exp.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      <span className="font-medium">Keywords:</span> {exp.keywords}
                    </p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                </motion.div>
              ))
            ) : (
              !loading && searchQuery && !error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 text-zinc-400"
                >
                  <p className="text-lg">No experiments found for "{searchQuery}"</p>
                  <p className="text-sm mt-1">Try searching for different keywords</p>
                </motion.div>
              )
            )}
          </AnimatePresence>

          {!searchQuery && !loading && !error && (
            <div className="text-center py-20 text-zinc-400">
              <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Enter a keyword to start exploring</p>
            </div>
          )}
        </div>
      </main>

      {/* Experiment Preview Modal */}
      <AnimatePresence>
        {selectedExperiment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white">
                <div>
                  <h2 className="font-bold text-xl text-zinc-900">{selectedExperiment.title}</h2>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">Preview Mode</p>
                </div>
                <button
                  onClick={closeExperiment}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>
              
              <div className="flex-1 bg-zinc-50 p-4 overflow-hidden">
                <iframe
                  ref={iframeRef}
                  title={selectedExperiment.title}
                  srcDoc={selectedExperiment.html_content}
                  className="w-full h-full rounded-xl border border-zinc-200 bg-white shadow-inner"
                  sandbox="allow-scripts allow-modals"
                />
              </div>
              
              <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={closeExperiment}
                  className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-8 text-center text-zinc-400 text-sm">
        <p>© {new Date().getFullYear()} Experiment Explorer. Built with Supabase & React.</p>
      </footer>
    </div>
  );
}
