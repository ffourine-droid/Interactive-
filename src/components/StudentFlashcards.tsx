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
  VolumeX
} from 'lucide-react';
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
            <div className="space-y-6">
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
