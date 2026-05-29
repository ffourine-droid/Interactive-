import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  HelpCircle, 
  ArrowLeft, 
  RotateCw, 
  Check, 
  X, 
  ShieldAlert, 
  Award, 
  Trophy, 
  CheckCircle2, 
  Inbox,
  RefreshCw,
  Volume2,
  VolumeX,
  PlusCircle, 
  Trash2, 
  Sparkles, 
  Database, 
  User, 
  Copy, 
  Plus, 
  Search,
  BookOpenCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { flashcardService, Flashcard } from '../services/flashcardService';
import { 
  playSuccess, 
  playFailure, 
  playTransition, 
  areSoundEffectsEnabled, 
  setSoundEffectsEnabled 
} from '../utils/soundEffects';

interface StudentFlashcardsProps {
  onBack: () => void;
}

export const StudentFlashcards: React.FC<StudentFlashcardsProps> = ({ onBack }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<{ subject: string; topic: string; grade: number } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(areSoundEffectsEnabled());

  // Set default grade filter to player's grade, or 'All' if none has set yet
  const getPlayerInitialGrade = (): string => {
    try {
      const p = localStorage.getItem('azilearn_arena_player');
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed && parsed.grade) return String(parsed.grade);
      }
    } catch (e) {
      console.warn("Could not read student profile grade for filtering", e);
    }
    return 'All';
  };
  
  const [selectedGradeTab, setSelectedGradeTab] = useState<string>(getPlayerInitialGrade());

  // Deck session states
  const [activeDeck, setActiveDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<{ question: string; correct: boolean }[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);

  // TAB SELECTION: 'syllabus' (default) vs 'custom' (interactive student custom cards)
  const [activeTab, setActiveTab] = useState<'syllabus' | 'custom'>('syllabus');

  // Username fallback initialization
  const getInitialUsername = (): string => {
    try {
      const p = localStorage.getItem('azilearn_arena_player');
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed && parsed.username) return parsed.username;
      }
    } catch (e) {
      console.warn("Could not read student profile username", e);
    }
    return '';
  };

  // Custom Flashcard Creation states
  const [customUsername, setCustomUsername] = useState<string>(getInitialUsername());
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [customAnswer, setCustomAnswer] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Custom Flashcard View states
  const [searchUsername, setSearchUsername] = useState<string>(getInitialUsername());
  const [studentCards, setStudentCards] = useState<any[]>([]);
  const [isFetchingCustom, setIsFetchingCustom] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFlippedCards, setActiveFlippedCards] = useState<Record<string, boolean>>({});
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // local storage keys and functions definitions
  const LOCAL_STUDENT_KEY = 'azilearn_student_flashcards_db';

  const getLocalStudentCards = (): any[] => {
    try {
      const data = localStorage.getItem(LOCAL_STUDENT_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse local student cards", e);
      return [];
    }
  };

  const saveLocalStudentCard = (card: any) => {
    try {
      const list = getLocalStudentCards();
      list.unshift(card);
      localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to write local student card", e);
    }
  };

  const deleteLocalStudentCard = (id: string) => {
    try {
      const list = getLocalStudentCards();
      const filtered = list.filter((item: any) => item.id !== id);
      localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to delete local student card", e);
    }
  };

  // Fetch student custom cards
  const fetchStudentCards = async (usernameStr: string) => {
    const target = usernameStr.trim();
    if (!target) {
      setFetchError('Please enter a username to fetch cards!');
      return;
    }
    
    setIsFetchingCustom(true);
    setFetchError(null);
    setActiveFlippedCards({});
    
    let fetchedData: any[] = [];
    let isOfflineFallback = false;
    
    try {
      const { data, error } = await supabase
        .from('student_flashcards')
        .select('*')
        .eq('username', target)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      if (data) {
        fetchedData = data;
      }
    } catch (e: any) {
      console.warn("Supabase student_flashcards query failed. Using local storage fallback.", e);
      const locals = getLocalStudentCards();
      fetchedData = locals.filter((c: any) => c.username.toLowerCase() === target.toLowerCase());
      isOfflineFallback = true;
    }
    
    setStudentCards(fetchedData.map(c => ({
      ...c,
      isLocalOnly: isOfflineFallback || c.isLocalOnly
    })));
    setIsFetchingCustom(false);
  };

  // On initial render, if username exists, auto-fetch their custom cards to look premium!
  useEffect(() => {
    const defaultUser = getInitialUsername();
    if (defaultUser) {
      fetchStudentCards(defaultUser);
    }
  }, []);

  // Save new custom flashcard
  const handleSaveCard = async () => {
    const user = customUsername.trim();
    const sub = customSubject.trim();
    const top = customTopic.trim();
    const q = customQuestion.trim();
    const a = customAnswer.trim();

    if (!user || !q || !a) {
      setSaveStatus({ success: false, message: 'Please fill in Username, Question, and Answer!' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    const newId = crypto.randomUUID();
    const finalPayload = {
      id: newId,
      username: user,
      subject: sub || 'Science',
      topic: top || 'Custom Deck',
      question: q,
      answer: a,
      created_at: new Date().toISOString()
    };

    let cloudSaved = false;
    try {
      const { error } = await supabase
        .from('student_flashcards')
        .insert({
          id: finalPayload.id,
          username: finalPayload.username,
          subject: finalPayload.subject,
          topic: finalPayload.topic,
          question: finalPayload.question,
          answer: finalPayload.answer
        });

      if (!error) {
        cloudSaved = true;
      }
    } catch (err) {
      console.warn("Could not save to Supabase cloud. Saving offline.", err);
    }

    // Save to local storage cache so it's bulletproof offline
    saveLocalStudentCard({
      ...finalPayload,
      isLocalOnly: !cloudSaved
    });

    setSaveStatus({
      success: true,
      message: cloudSaved 
        ? "🎉 Flashcard saved successfully in the cloud! Keep up the brilliant study habits!"
        : "👍 Saved locally! (Supabase table 'student_flashcards' is offline or missing. Paste SQL configuration to sync)."
    });
    playSuccess();

    // Clear question & answer inputs
    setCustomQuestion('');
    setCustomAnswer('');
    setIsSaving(false);

    // Auto-refresh cards list if username matches
    if (searchUsername.trim().toLowerCase() === user.toLowerCase()) {
      fetchStudentCards(user);
    }

    // Persist username in local storage student configuration
    try {
      const playerStr = localStorage.getItem('azilearn_arena_player');
      if (playerStr) {
        const parsed = JSON.parse(playerStr);
        localStorage.setItem('azilearn_arena_player', JSON.stringify({ ...parsed, username: user }));
      } else {
        localStorage.setItem('azilearn_arena_player', JSON.stringify({ username: user, grade: 7 }));
      }
      setSearchUsername(user);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete custom card
  const handleDeleteCard = async (cardId: string) => {
    playTransition();
    try {
      await supabase
        .from('student_flashcards')
        .delete()
        .eq('id', cardId);
    } catch (e) {
      console.warn("Supabase student_flashcards deletion error", e);
    }

    deleteLocalStudentCard(cardId);
    setStudentCards(prev => prev.filter(c => c.id !== cardId));
  };

  // Start study session using the custom deck!
  const handleStartCustomDeck = () => {
    if (studentCards.length === 0) return;
    
    // Convert StudentFlashcard structure to Flashcard interface
    const formatted: Flashcard[] = studentCards.map(c => ({
      id: c.id,
      subject: c.subject || 'Custom Study',
      topic: c.topic || 'Custom Deck',
      grade: 7, // Custom deck, doesn't need hard grade
      question: c.question,
      answer: c.answer
    }));

    // Shuffle cards
    const shuffled = [...formatted].sort(() => Math.random() - 0.5);
    
    setSelectedTopic({ 
      subject: 'My Cards', 
      topic: `Custom Deck (${searchUsername})`, 
      grade: 0 
    });
    setActiveDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setSessionAnswers([]);
    setSessionComplete(false);
    playTransition();
  };

  const getSQLStatement = (): string => {
    return `
-- SQL TO CREATE STUDENT_FLASHCARDS TABLE IN SUPABASE:
-- Paste this script directly inside your Supabase SQL Editor and hit "Run"

CREATE TABLE IF NOT EXISTS student_flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE student_flashcards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read student_flashcards (both teachers and students)
CREATE POLICY "Anyone can read student_flashcards" 
ON student_flashcards FOR SELECT 
USING (true);

-- Allow anyone to insert student_flashcards
CREATE POLICY "Anyone can insert student_flashcards" 
ON student_flashcards FOR INSERT 
WITH CHECK (true);

-- Allow anyone to delete student_flashcards
CREATE POLICY "Anyone can delete student_flashcards" 
ON student_flashcards FOR DELETE 
USING (true);
    `;
  };

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
    playTransition();
  };

  // Load cards on startup
  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      try {
        const cards = await flashcardService.getFlashcards();
        setFlashcards(cards);
      } catch (e) {
        console.error("Error loading flashcards", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  interface TopicGroup {
    subject: string;
    topic: string;
    grade: number;
    count: number;
    cards: Flashcard[];
  }

  // Group cards by Subject and Topic
  const topicsMap = flashcards.reduce<Record<string, TopicGroup>>((acc, card) => {
    const key = `${card.subject}-${card.topic}-${card.grade}`;
    if (!acc[key]) {
      acc[key] = {
        subject: card.subject,
        topic: card.topic,
        grade: card.grade,
        count: 0,
        cards: []
      };
    }
    acc[key].count += 1;
    acc[key].cards.push(card);
    return acc;
  }, {});

  const topicList: TopicGroup[] = Object.values(topicsMap);

  // Group topics by Grade so they are organized systematically
  const groupedByGrade = topicList.reduce<Record<number, TopicGroup[]>>((acc, topicItem) => {
    const grade = topicItem.grade;
    if (!acc[grade]) {
      acc[grade] = [];
    }
    acc[grade].push(topicItem);
    return acc;
  }, {});

  const sortedGrades = Object.keys(groupedByGrade).map(Number).sort((a, b) => a - b);

  // Handle deck launch
  const handleStartDeck = (topicData: typeof topicList[0]) => {
    // Shuffle cards for study variety
    const shuffled = [...topicData.cards].sort(() => Math.random() - 0.5);
    setSelectedTopic({ subject: topicData.subject, topic: topicData.topic, grade: topicData.grade });
    setActiveDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setSessionAnswers([]);
    setSessionComplete(false);
    playTransition();
  };

  // Log answer feedback
  const handleAnswer = (gotIt: boolean) => {
    const currentCard = activeDeck[currentIndex];
    setSessionAnswers(prev => [...prev, { question: currentCard.question, correct: gotIt }]);
    if (gotIt) {
      setMasteredCount(prev => prev + 1);
      playSuccess();
    } else {
      playFailure();
    }

    // Advance index or complete
    if (currentIndex < activeDeck.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 250); // slight delay to reset flip gracefully
    } else {
      setSessionComplete(true);
      setTimeout(() => {
        playSuccess();
      }, 400); // celebratory double sound on completion
    }
  };

  const handleRestartDeck = () => {
    const shuffled = [...activeDeck].sort(() => Math.random() - 0.5);
    setActiveDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setSessionAnswers([]);
    setSessionComplete(false);
    playTransition();
  };

  const handleExitDeck = () => {
    setSelectedTopic(null);
    setActiveDeck([]);
    setSessionComplete(false);
    playTransition();
  };

  return (
    <div className="space-y-6">
      {/* Deck selection mode */}
      {!selectedTopic ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="w-10 h-10 flex items-center justify-center bg-brand-surface hover:bg-brand-accent/5 border border-brand-border rounded-xl transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-brand-text" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-brand-text tracking-tight uppercase">📚 Study Flashcards</h1>
                <p className="text-xs text-brand-muted font-bold">Select a topic from your teacher's syllabus and test your active recall.</p>
              </div>
            </div>

            {/* Tactile Sound FX Switcher */}
            <button
              onClick={() => {
                const updated = !soundEnabled;
                setSoundEnabled(updated);
                setSoundEffectsEnabled(updated);
              }}
              className="w-10 h-10 flex items-center justify-center bg-brand-surface hover:bg-brand-accent/5 border border-brand-border rounded-xl transition-all active:scale-95 text-brand-text cursor-pointer"
              title={soundEnabled ? "Mute Flashcard Sounds" : "Unmute Flashcard Sounds"}
            >
              {soundEnabled ? (
                <Volume2 size={18} className="text-emerald-500 animate-pulse" />
              ) : (
                <VolumeX size={18} className="text-brand-muted" />
              )}
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex bg-brand-surface border border-brand-border rounded-2xl p-1 gap-1 max-w-md">
            <button
              onClick={() => {
                setActiveTab('syllabus');
                playTransition();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'syllabus'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-brand-bg text-brand-muted hover:text-brand-text font-bold'
              }`}
            >
              <BookOpenCheck size={14} /> 🎓 Syllabus Decks
            </button>
            <button
              onClick={() => {
                setActiveTab('custom');
                playTransition();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-brand-bg text-brand-muted hover:text-brand-text font-bold'
              }`}
            >
              <PlusCircle size={14} /> ✍️ Custom Cards
            </button>
          </div>

          {activeTab === 'syllabus' && (
            <>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-brand-muted">
                  <RefreshCw size={24} className="animate-spin text-brand-accent mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Retrieving Study Decks...</p>
                </div>
              ) : topicList.length === 0 ? (
                <div className="text-center py-16 bg-brand-surface rounded-[2.5rem] border border-brand-border space-y-4">
                  <div className="w-16 h-16 rounded-[2rem] bg-brand-bg flex items-center justify-center mx-auto text-brand-muted/40">
                    <Inbox size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-lg text-brand-text uppercase leading-none">No Decks Configured Yet</h3>
                    <p className="text-xs text-brand-muted max-w-sm mx-auto font-bold">Your teacher hasn't uploaded flashcard libraries. Check back soon, or log in as a teacher to bulk upload via AI Studio!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  {/* Grade Selector Tabs / Pills */}
                  <div className="flex bg-brand-surface border border-brand-border rounded-2xl p-1 gap-1 overflow-x-auto no-scrollbar max-w-md">
                    {['All', ...sortedGrades.map(String)].map((gTab) => {
                      const isActive = selectedGradeTab === gTab;
                      return (
                        <button
                          key={gTab}
                          onClick={() => setSelectedGradeTab(gTab)}
                          className={`flex-1 text-center py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20 font-black'
                              : 'hover:bg-brand-bg text-brand-muted hover:text-brand-text font-bold'
                          }`}
                        >
                          {gTab === 'All' ? '🌐 All Grades' : `Grade ${gTab}`}
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const gradesToRender = selectedGradeTab === 'All'
                      ? sortedGrades
                      : sortedGrades.filter(g => String(g) === selectedGradeTab);

                    if (gradesToRender.length === 0) {
                      return (
                        <div className="text-center py-12 bg-brand-surface rounded-[2rem] border border-brand-border space-y-2">
                          <p className="text-sm font-black text-brand-text uppercase leading-none">No Decks on File</p>
                          <p className="text-xs text-brand-muted font-bold">There are no flashcard decks matching Grade {selectedGradeTab} right now. Click "All Grades" to check others!</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-10">
                        {gradesToRender.map((grade) => {
                          const gradeTopics = groupedByGrade[grade];
                          return (
                            <div key={grade} className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-brand-border pb-2">
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] px-3 py-1 rounded-xl uppercase tracking-widest shadow-sm">
                                  Grade {grade}
                                </div>
                                <span className="text-[11px] text-brand-muted font-black uppercase tracking-wider">
                                  {gradeTopics.length} revision {gradeTopics.length === 1 ? 'deck' : 'decks'} available
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {gradeTopics.map((topicData) => (
                                  <motion.div
                                    key={`${topicData.subject}-${topicData.topic}-${topicData.grade}`}
                                    whileHover={{ y: -4 }}
                                    className="bg-brand-surface border border-brand-border hover:border-brand-accent rounded-[2rem] p-6 text-left flex flex-col justify-between space-y-4 transition-all hover:shadow-lg hover:shadow-brand-accent/5"
                                  >
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black text-brand-accent uppercase tracking-wider bg-brand-accent/10 sm:bg-brand-accent/10 border border-brand-accent/20 px-2.5 py-1 rounded-full">
                                          {topicData.subject}
                                        </span>
                                        <span className="text-[9px] font-black text-teal-600 uppercase bg-teal-500/10 px-2 py-0.5 rounded-full">
                                          Grade {topicData.grade}
                                        </span>
                                      </div>

                                      <div className="space-y-1">
                                        <h3 className="text-md font-black text-brand-text tracking-tight uppercase leading-tight">
                                          {topicData.topic}
                                        </h3>
                                        <p className="text-xs font-bold text-brand-muted">Syllabus revision deck</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-brand-border">
                                      <span className="text-xs font-black text-brand-text">{topicData.count} Cards</span>
                                      <button
                                        onClick={() => handleStartDeck(topicData)}
                                        className="px-4 py-1.5 bg-brand-text hover:bg-brand-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all text-center cursor-pointer"
                                      >
                                        Start Studying
                                      </button>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Introduction bar */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
                    <Sparkles size={16} /> Student Custom Studio
                  </h3>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 font-bold leading-normal">
                    Create your own personalized flashcard decks, search them instantly, and practice recall!
                  </p>
                </div>
              </div>

              {/* Two Column Creator Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMN 1: CREATE CARD (5 cols) */}
                <div className="lg:col-span-5 bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-5">
                  <div className="border-b border-brand-border pb-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <PlusCircle size={16} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black text-brand-text uppercase leading-none">Create New Card</h3>
                      <p className="text-[10px] text-brand-muted font-bold">Save custom flashcards to your deck.</p>
                    </div>
                  </div>

                  {/* Form Container */}
                  <div className="space-y-4 text-left">
                    {/* Username input */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-brand-muted tracking-widest px-1">
                        Student Username <span className="text-emerald-600">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted">
                          <User size={12} />
                        </span>
                        <input
                          type="text"
                          value={customUsername}
                          onChange={(e) => {
                            setCustomUsername(e.target.value);
                            setSearchUsername(e.target.value);
                          }}
                          placeholder="E.g., test_student"
                          className="w-full bg-brand-bg hover:bg-brand-surface focus:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-accent focus:border-brand-accent rounded-xl py-2 pl-9 pr-4 text-xs font-bold outline-none transition-all placeholder:text-brand-muted/40"
                        />
                      </div>
                    </div>

                    {/* Subject & Topic side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase text-brand-muted tracking-widest px-1">
                          Subject <span className="text-brand-muted font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          placeholder="E.g., Science"
                          className="w-full bg-brand-bg hover:bg-brand-surface focus:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-accent focus:border-brand-accent rounded-xl py-2 px-3 text-xs font-bold outline-none transition-all placeholder:text-brand-muted/40"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase text-brand-muted tracking-widest px-1">
                          Topic <span className="text-brand-muted font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          placeholder="E.g., Photosynthesis"
                          className="w-full bg-brand-bg hover:bg-brand-surface focus:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-accent focus:border-brand-accent rounded-xl py-2 px-3 text-xs font-bold outline-none transition-all placeholder:text-brand-muted/40"
                        />
                      </div>
                    </div>

                    {/* Question (Textarea) */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-brand-muted tracking-widest px-1">
                        Card Question <span className="text-emerald-600">*</span>
                      </label>
                      <textarea
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="E.g., What green pigment in leaves absorbs sunlight?"
                        rows={3}
                        className="w-full bg-brand-bg hover:bg-brand-surface focus:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-accent focus:border-brand-accent rounded-xl py-2 px-3.5 text-xs font-bold outline-none resize-none transition-all placeholder:text-brand-muted/40 leading-relaxed"
                      />
                    </div>

                    {/* Answer (Textarea) */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-brand-muted tracking-widest px-1">
                        Card Answer <span className="text-emerald-600">*</span>
                      </label>
                      <textarea
                        value={customAnswer}
                        onChange={(e) => setCustomAnswer(e.target.value)}
                        placeholder="E.g., Chlorophyll."
                        rows={3}
                        className="w-full bg-brand-bg hover:bg-brand-surface focus:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-accent focus:border-brand-accent rounded-xl py-2 px-3.5 text-xs font-bold outline-none resize-none transition-all placeholder:text-brand-muted/40 leading-relaxed"
                      />
                    </div>

                    {/* Status Message */}
                    {saveStatus && (
                      <div className={`p-3 rounded-xl border text-left text-xs font-heavy leading-normal flex items-start gap-2 ${
                        saveStatus.success 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-red-500/10 border-red-500/20 text-red-600'
                      }`}>
                        <div className="mt-0.5">
                          {saveStatus.success ? <Check size={14} /> : <X size={14} />}
                        </div>
                        <p className="font-bold">{saveStatus.message}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleSaveCard}
                      disabled={isSaving}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
                    >
                      {isSaving ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      Save Flashcard
                    </button>
                    
                    {/* Handy hint box */}
                    <div className="p-3 bg-brand-bg rounded-xl border border-brand-border space-y-1">
                      <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest block">💡 Recall Practice Tips:</span>
                      <p className="text-[9px] text-brand-muted font-bold leading-normal">
                        Write cards in your own voice! Keep one direct question, idea, or scientific formula per card so they are easy to master before assessments.
                      </p>
                    </div>

                  </div>
                </div>

                {/* COLUMN 2: RETRIEVE CARDS (7 cols) */}
                <div className="lg:col-span-7 bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Search / Action bar */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-border pb-4">
                      <div className="space-y-1 text-left">
                        <h3 className="text-sm font-black text-brand-text uppercase leading-none">View My Custom Deck</h3>
                        <p className="text-[10px] text-brand-muted font-bold">Search and test your student deck.</p>
                      </div>
                      
                      {/* Search controls */}
                      <div className="flex items-center gap-2">
                        <div className="relative max-w-xs">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
                            <Search size={12} />
                          </span>
                          <input
                            type="text"
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            placeholder="Fetch by username..."
                            className="bg-brand-bg hover:bg-brand-surface focus:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-accent focus:border-brand-accent rounded-xl py-1.5 pl-8 pr-3 text-[11px] font-bold outline-none transition-all placeholder:text-brand-muted/40"
                          />
                        </div>
                        <button
                          onClick={() => fetchStudentCards(searchUsername)}
                          disabled={isFetchingCustom}
                          className="px-3.5 py-1.5 bg-brand-text hover:bg-brand-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          {isFetchingCustom ? <RefreshCw size={10} className="animate-spin" /> : 'Find'}
                        </button>
                      </div>
                    </div>

                    {/* Rendering area */}
                    {isFetchingCustom ? (
                      <div className="flex flex-col items-center justify-center py-20 text-brand-muted gap-2">
                        <RefreshCw size={24} className="animate-spin text-emerald-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Retrieving My Custom Deck...</p>
                      </div>
                    ) : studentCards.length === 0 ? (
                      <div className="text-center py-20 bg-brand-bg rounded-[2rem] border border-brand-border border-dashed space-y-4 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-[1.5rem] bg-brand-surface flex items-center justify-center mx-auto text-brand-muted/50">
                          <BookOpen size={20} />
                        </div>
                        <div className="space-y-1 px-4">
                          <h4 className="font-heavy font-black text-xs text-brand-text uppercase leading-none">No Custom Cards Found</h4>
                          <p className="text-[10px] text-brand-muted font-bold leading-normal">
                            No student-created cards have been saved under username <span className="text-brand-accent font-black">"{searchUsername || 'empty'}"</span> yet.
                          </p>
                          <p className="text-[9px] text-brand-muted/70 font-bold leading-normal">
                             Use the creator panel on the left to save your first revision card offline or online!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary Deck practice activator banner */}
                        <div className="p-3 bg-brand-bg rounded-2xl border border-brand-border flex items-center justify-between text-left gap-4">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block animate-pulse">Ready to Recall</span>
                            <p className="text-xs font-black text-brand-text leading-none uppercase">{studentCards.length} Custom Study Cards Available</p>
                          </div>
                          <button
                            onClick={handleStartCustomDeck}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 px-4 text-[9px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 hover:shadow-md hover:shadow-emerald-500/15 cursor-pointer flex items-center gap-1.5"
                          >
                            <Trophy size={11} /> Practice My Deck!
                          </button>
                        </div>

                        {/* Interactive Grid of student cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                          {studentCards.map((card) => {
                            const isCardFlipped = !!activeFlippedCards[card.id];
                            return (
                              <motion.div
                                key={card.id}
                                layout
                                className="relative h-[160px] [perspective:1000px] cursor-pointer group animate-fadeIn"
                                onClick={() => {
                                  setActiveFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }));
                                  playTransition();
                                }}
                              >
                                <div 
                                  className="relative w-full h-full transition-transform duration-500 shadow-sm rounded-3xl"
                                  style={{ 
                                    transform: isCardFlipped ? 'rotateY(180deg)' : 'none',
                                    transformStyle: 'preserve-3d',
                                    WebkitTransformStyle: 'preserve-3d'
                                  }}
                                >
                                  {/* Front Side */}
                                  <div 
                                    className="absolute inset-0 w-full h-full bg-brand-surface p-4 rounded-3xl border border-brand-border flex flex-col justify-between"
                                    style={{
                                      backfaceVisibility: 'hidden',
                                      WebkitBackfaceVisibility: 'hidden'
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                                        {card.subject}
                                      </span>
                                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        card.isLocalOnly 
                                          ? 'bg-amber-100/50 text-amber-700 border border-amber-200/50' 
                                          : 'bg-green-100/50 text-green-700 border border-green-200/50'
                                      }`}>
                                        {card.isLocalOnly ? '🟡 Offline' : '🟢 Cloud'}
                                      </span>
                                    </div>
                                    
                                    <div className="text-center my-auto px-2 overflow-y-auto no-scrollbar">
                                      <p className="text-xs font-black text-brand-text uppercase leading-tight">
                                        {card.question}
                                      </p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-[8px] font-black text-brand-muted uppercase tracking-widest pt-1 border-t border-brand-border/40">
                                      <span className="group-hover:text-emerald-600 transition-colors">Tap to Flip</span>
                                      
                                      {/* Delete button wrapper inside click propagation prevent */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Are you sure you want to delete this custom flashcard?")) {
                                            handleDeleteCard(card.id);
                                          }
                                        }}
                                        className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg text-brand-muted transition-all cursor-pointer"
                                        title="Delete Flashcard"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Back Side */}
                                  <div 
                                    className="absolute inset-0 w-full h-full bg-emerald-950 p-4 rounded-3xl border border-emerald-500/20 flex flex-col justify-between"
                                    style={{
                                      transform: 'rotateY(180deg)',
                                      WebkitTransform: 'rotateY(180deg)',
                                      backfaceVisibility: 'hidden',
                                      WebkitBackfaceVisibility: 'hidden'
                                    }}
                                  >
                                    <div className="flex items-center justify-between text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                                      <span>Model Answer</span>
                                      <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">Topic: {card.topic}</span>
                                    </div>

                                    <div className="text-center my-auto px-2 overflow-y-auto no-scrollbar">
                                      <p className="text-[11px] font-bold text-white leading-normal leading-relaxed">
                                        {card.answer}
                                      </p>
                                    </div>

                                    <div className="text-[7px] font-black text-emerald-500 uppercase tracking-widest text-right leading-none border-t border-emerald-900 pt-1">
                                      Click to see Question
                                    </div>
                                  </div>

                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
      ) : (
        /* Deck study mode container */
        <div className="max-w-xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleExitDeck}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-accent/10 hover:text-brand-accent border border-brand-border rounded-xl text-[9px] font-black uppercase tracking-widest text-brand-text transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={12} /> Exit Deck
            </button>
            
            <div className="text-right">
              <span className="text-[9px] font-black uppercase text-brand-muted tracking-widest block">Topic Study</span>
              <span className="text-xs font-black text-brand-text uppercase block line-clamp-1">{selectedTopic.topic}</span>
            </div>
          </div>

          {!sessionComplete ? (
            /* Active card stage */
            <div className="space-y-6">
              {/* Progress metrics */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    CARD {currentIndex + 1} OF {activeDeck.length}
                  </span>
                  <span className="text-xs font-black text-brand-accent">
                    {Math.round(((currentIndex) / activeDeck.length) * 100)}% Complete
                  </span>
                </div>
                
                {/* Progress bar boundary */}
                <div className="w-full h-2 bg-brand-border/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-accent rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / activeDeck.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Card Workspace (Tactile Flip interaction) */}
              <div 
                className="relative h-[250px] w-full [perspective:1000px] cursor-pointer group"
                onClick={handleFlip}
              >
                <div 
                  className="relative w-full h-full transition-transform duration-500 shadow-xl rounded-[2.5rem]"
                  style={{ 
                    transform: isFlipped ? 'rotateY(180deg)' : 'none',
                    transformStyle: 'preserve-3d',
                    WebkitTransformStyle: 'preserve-3d'
                  }}
                >
                  {/* FRONT SIDE (Question) */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-white dark:bg-brand-card p-8 rounded-[2.5rem] border-2 border-brand-border flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-brand-muted tracking-wider">
                      <span>Question Stem</span>
                      <span className="flex items-center gap-1"><RotateCw size={10} className="animate-spin" /> Tap to Flip</span>
                    </div>

                    <div className="my-auto text-center px-4">
                      <h2 className="text-lg md:text-xl font-heavy font-black text-brand-text tracking-tight leading-tight">
                        {activeDeck[currentIndex]?.question}
                      </h2>
                    </div>

                    <p className="text-center text-[9px] font-black text-brand-muted uppercase tracking-widest leading-none">
                      AziLearn Recall Engine
                    </p>
                  </div>

                  {/* BACK SIDE (Answer) */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-slate-900 border-2 border-teal-500/20 p-8 rounded-[2.5rem] flex flex-col justify-between shadow-2xl"
                    style={{
                      transform: 'rotateY(180deg)',
                      WebkitTransform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-teal-400 tracking-wider">
                      <span>Model Answer</span>
                      <span>Reveal Complete</span>
                    </div>

                    <div className="my-auto text-center px-4">
                      <p className="text-md font-bold text-slate-100 leading-relaxed font-heavy tracking-normal">
                        {activeDeck[currentIndex]?.answer}
                      </p>
                    </div>

                    <p className="text-center text-[9px] font-black text-teal-500 uppercase tracking-widest leading-none">
                      Fact-accurate Kenya CBC Solution
                    </p>
                  </div>
                </div>
              </div>

              {/* Action layout */}
              <AnimatePresence mode="wait">
                {!isFlipped ? (
                  <motion.div 
                    key="prompt"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                  >
                    <button 
                      onClick={handleFlip}
                      className="inline-flex items-center gap-2 text-[10px] font-black text-brand-accent uppercase tracking-widest px-4 py-2 bg-brand-accent/5 hover:bg-brand-accent/15 border border-brand-accent/10 rounded-full transition-all duration-300 animate-bounce cursor-pointer"
                    >
                      <RotateCw size={12} /> Click Card to Reveal Answer
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="selection"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex justify-center gap-3"
                  >
                    <button
                      onClick={() => handleAnswer(false)}
                      className="px-6 py-3.5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 w-1/2 cursor-pointer"
                    >
                      <X size={14} /> Need Practice
                    </button>
                    <button
                      onClick={() => handleAnswer(true)}
                      className="px-6 py-3.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 w-1/2 cursor-pointer"
                    >
                      <Check size={14} /> Got It!
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Study Complete Dashboard celebration */
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white dark:bg-brand-card rounded-[3rem] border border-brand-border p-8 text-center space-y-6 shadow-xl"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                  <Award size={36} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-black text-brand-text uppercase tracking-tight">Study Deck Complete!</h2>
                <p className="text-xs text-brand-muted font-bold">Awesome work completing the recall battle.</p>
              </div>

              {/* Standard circular SVG gauge */}
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="48"
                    strokeWidth="8"
                    stroke="#F1F5F9"
                    className="dark:stroke-brand-bg fill-none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="48"
                    strokeWidth="8"
                    stroke="#10B981"
                    className="fill-none transition-all duration-1000"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - masteredCount / activeDeck.length)}`}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-brand-text tracking-tight block">
                    {Math.round((masteredCount / activeDeck.length) * 100)}%
                  </span>
                  <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest block leading-none">
                    Mastery
                  </span>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 gap-3 bg-brand-bg/50 p-4 rounded-2xl border border-brand-border">
                <div className="text-left space-y-0.5">
                  <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest block">Core Results</span>
                  <p className="text-xs font-black text-brand-text leading-none">{masteredCount} of {activeDeck.length} Mastered</p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest block">Rewards Granted</span>
                  <p className="text-xs font-black text-brand-accent leading-none">+30 XP Gained</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleRestartDeck}
                  className="px-6 py-3 bg-brand-bg text-brand-text border border-brand-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-border/40 transition-colors w-1/2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw size={12} /> Study Again
                </button>
                <button
                  onClick={handleExitDeck}
                  className="px-6 py-3 bg-brand-text text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-colors w-1/2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={12} /> Choose Topic
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
