import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, ChevronLeft, ChevronDown, Trophy,
  RotateCcw, Flame, Star, Loader2, AlertCircle,
  CheckCircle2, XCircle, BarChart3, ArrowRight, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  grade: number;
  subject: string;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ArenaPlayer {
  id: string;
  username: string;
  grade: number;
}

interface ScoreEntry {
  id: string;
  username: string;
  score: number;
  correct: number;
  total: number;
  best_streak: number;
  subject: string;
  grade: number;
  played_at: string;
}

type GamePhase = 'setup' | 'identity' | 'countdown' | 'playing' | 'result' | 'leaderboard';

const SUBJECTS = [
  'Mathematics', 'Integrated Science', 'Social Studies',
  'English', 'Kiswahili', 'Agriculture', 'CRE',
  'Creative Arts & Sports', 'Pre-Technical Studies', 'Business Studies',
  'Mixed (All Subjects)',
];
const GRADES = [7, 8, 9];
const GAME_DURATION = 60;
const POINTS_CORRECT = 10;
const STREAK_5_BONUS = 5;
const STREAK_10_BONUS = 15;
const PERFECT_BONUS = 50;

const OPTION_STYLES: Record<string, { base: string; correct: string; wrong: string }> = {
  A: { base: 'border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10', correct: 'border-blue-500 bg-blue-500 text-white', wrong: 'border-blue-500/20 bg-blue-500/5 opacity-40' },
  B: { base: 'border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10', correct: 'border-purple-500 bg-purple-500 text-white', wrong: 'border-purple-500/20 bg-purple-500/5 opacity-40' },
  C: { base: 'border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10', correct: 'border-amber-500 bg-amber-500 text-white', wrong: 'border-amber-500/20 bg-amber-500/5 opacity-40' },
  D: { base: 'border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10', correct: 'border-emerald-500 bg-emerald-500 text-white', wrong: 'border-emerald-500/20 bg-emerald-500/5 opacity-40' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcScore(correct: number, total: number, bestStreak: number): number {
  let score = correct * POINTS_CORRECT;
  if (bestStreak >= 10) score += STREAK_10_BONUS;
  else if (bestStreak >= 5) score += STREAK_5_BONUS;
  if (correct > 0 && correct === total) score += PERFECT_BONUS;
  return score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Select field ──
const SelectField: React.FC<{
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: (string | number)[];
}> = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-brand-bg border border-brand-border rounded-2xl py-4 pl-4 pr-10 text-sm font-bold text-brand-text focus:border-brand-accent outline-none cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
    </div>
  </div>
);

// ── Timer ring ──
const TimerRing: React.FC<{ timeLeft: number; total: number }> = ({ timeLeft, total }) => {
  const pct = timeLeft / total;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;
  const color = pct > 0.5 ? '#FF6B2C' : pct > 0.25 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-brand-border" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-black text-brand-text tabular-nums leading-none">{timeLeft}</span>
        <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">sec</span>
      </div>
    </div>
  );
};

// ── Streak badge ──
const StreakBadge: React.FC<{ streak: number }> = ({ streak }) => {
  if (streak < 3) return null;
  return (
    <motion.div
      key={streak}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full"
    >
      <Flame size={12} className="text-amber-400" />
      <span className="text-[10px] font-black text-amber-400">{streak} STREAK</span>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

interface SpeedRoundPageProps {
  onBack: () => void;
}

export default function SpeedRoundPage({ onBack }: SpeedRoundPageProps) {
  const { showToast } = useToast();

  // ── Game config ──
  const [grade, setGrade] = useState(7);
  const [subject, setSubject] = useState('Mathematics');

  // ── Player identity ──
  const [username, setUsername] = useState('');
  const [player, setPlayer] = useState<ArenaPlayer | null>(() => {
    const saved = localStorage.getItem('azilearn_arena_player');
    return saved ? JSON.parse(saved) : null;
  });

  // ── Game state ──
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null); // current answer
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [loadingQ, setLoadingQ] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load questions ──
  const loadQuestions = useCallback(async () => {
    setLoadingQ(true);
    try {
      let query = supabase
        .from('questions_bank')
        .select('*')
        .eq('is_approved', true);

      if (subject !== 'Mixed (All Subjects)') {
        query = query.eq('subject', subject);
      }
      query = query.eq('grade', grade);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No questions found for this subject and grade. Ask your admin to add some!');

      // Shuffle
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
    } catch (e: any) {
      showToast(e.message || 'Failed to load questions', 'error');
      setPhase('setup');
    } finally {
      setLoadingQ(false);
    }
  }, [grade, subject, showToast]);

  // ── Save score ──
  const saveScore = useCallback(async (finalScore: number, finalCorrect: number, finalAnswered: number, finalBestStreak: number) => {
    if (!player) return;
    setSavingScore(true);
    try {
      await supabase.from('arena_scores').insert({
        player_id: player.id,
        username: player.username,
        grade: player.grade,
        subject: subject === 'Mixed (All Subjects)' ? 'Mixed' : subject,
        score: finalScore,
        correct: finalCorrect,
        total: finalAnswered,
        best_streak: finalBestStreak,
        played_at: new Date().toISOString(),
      });
    } catch {
      // Silent — score save failure shouldn't break the game
    } finally {
      setSavingScore(false);
    }
  }, [player, subject]);

  // ── Load leaderboard ──
  const loadLeaderboard = useCallback(async () => {
    setLoadingLB(true);
    try {
      let query = supabase
        .from('arena_scores')
        .select('*')
        .eq('grade', grade)
        .order('score', { ascending: false })
        .limit(10);

      if (subject !== 'Mixed (All Subjects)') {
        query = query.eq('subject', subject);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeaderboard(data || []);
    } catch {
      setLeaderboard([]);
    } finally {
      setLoadingLB(false);
    }
  }, [grade, subject]);

  // ── Timer ──
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  // ── Countdown ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── End game ──
  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackRef.current) clearTimeout(feedbackRef.current);
    setPhase('result');
  }, []);

  // Save score when result phase starts
  useEffect(() => {
    if (phase === 'result') {
      const finalScore = calcScore(correct, answered, bestStreak);
      saveScore(finalScore, correct, answered, bestStreak);
    }
  }, [phase, correct, answered, bestStreak, saveScore]);

  // ── Answer handler ──
  const handleAnswer = useCallback((letter: string) => {
    if (selected || phase !== 'playing') return;
    const q = questions[qIndex];
    if (!q) return;

    setSelected(letter);
    const isCorrect = letter.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();

    setAnswered(a => a + 1);

    if (isCorrect) {
      setCorrect(c => c + 1);
      setStreak(s => {
        const next = s + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
      setFeedback('correct');
    } else {
      setStreak(0);
      setFeedback('wrong');
    }

    // Move to next question after brief flash
    feedbackRef.current = setTimeout(() => {
      setSelected(null);
      setFeedback(null);
      setQIndex(i => {
        const next = i + 1;
        if (next >= questions.length) {
          // Ran out of questions before time — shuffle again
          setQuestions(qs => [...qs].sort(() => Math.random() - 0.5));
          return 0;
        }
        return next;
      });
    }, 600);
  }, [selected, phase, questions, qIndex]);

  // ── Start flow ──
  const resetGameState = () => {
    setQIndex(0);
    setTimeLeft(GAME_DURATION);
    setCorrect(0);
    setAnswered(0);
    setStreak(0);
    setBestStreak(0);
    setSelected(null);
    setFeedback(null);
  };

  const handleStart = async () => {
    if (!player) { setPhase('identity'); return; }
    await loadQuestions();
    resetGameState();
    setCountdown(3);
    setPhase('countdown');
  };

  const handleIdentitySubmit = async () => {
    if (!username.trim()) { showToast('Enter a username', 'error'); return; }
    
    setLoadingLB(true);
    try {
      const { data, error } = await supabase
        .from('arena_players')
        .insert({ username: username.trim(), grade })
        .select()
        .single();

      if (error) {
        // Username might exist — try to fetch
        const { data: existing } = await supabase
          .from('arena_players')
          .select('*')
          .eq('username', username.trim())
          .maybeSingle();

        if (existing) {
          const p: ArenaPlayer = { id: existing.id, username: existing.username, grade: existing.grade };
          setPlayer(p);
          localStorage.setItem('azilearn_arena_player', JSON.stringify(p));
          await loadQuestions();
          resetGameState();
          setCountdown(3);
          setPhase('countdown');
          return;
        }
        throw new Error('Could not save player.');
      }

      const p: ArenaPlayer = { id: data.id, username: data.username, grade };
      setPlayer(p);
      localStorage.setItem('azilearn_arena_player', JSON.stringify(p));
      await loadQuestions();
      resetGameState();
      setCountdown(3);
      setPhase('countdown');
    } catch (e: any) {
      showToast(e.message || 'Failed to identify player', 'error');
    } finally {
      setLoadingLB(false);
    }
  };

  const finalScore = calcScore(correct, answered, bestStreak);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-[360px] mx-auto bg-brand-bg min-h-screen flex flex-col relative overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-brand-text uppercase tracking-tighter leading-none">Arena</h1>
            <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Speed Round</p>
          </div>
        </div>
        <button
          onClick={() => { loadLeaderboard(); setPhase('leaderboard'); }}
          className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors"
        >
          <Trophy size={18} />
        </button>
      </div>

      {/* ── Page content ── */}
      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ════════ SETUP ════════ */}
          {phase === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6 pt-2"
            >
              <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-3xl flex items-center justify-center mx-auto">
                  <Zap size={32} className="text-brand-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-text tracking-tighter">60 Seconds</h2>
                  <p className="text-xs font-bold text-brand-muted mt-1 px-4">Answer as many CBC questions as you can. Speed and accuracy matter!</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { label: 'Correct', value: '+10pts' },
                    { label: '5 Streak', value: '+5pts' },
                    { label: 'Perfect', value: '+50pts' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-brand-bg rounded-2xl p-2.5 space-y-1">
                      <p className="text-brand-accent font-black text-sm">{value}</p>
                      <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest leading-none">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <SelectField label="Grade" value={grade} onChange={v => setGrade(Number(v))} options={GRADES} />
                <SelectField label="Subject" value={subject} onChange={v => setSubject(v)} options={SUBJECTS} />
              </div>

              {player && (
                <div className="flex items-center justify-between px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-accent rounded-xl flex items-center justify-center text-white font-black text-sm">
                      {player.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-brand-text">{player.username}</p>
                      <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Arena Player</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setPlayer(null); localStorage.removeItem('azilearn_arena_player'); }}
                    className="text-[10px] font-black text-brand-muted uppercase tracking-widest hover:text-red-500 transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={loadingQ}
                className="w-full flex items-center justify-center gap-3 bg-brand-accent text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {loadingQ ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                {loadingQ ? 'Loading Questions...' : 'Start Speed Round'}
              </button>
            </motion.div>
          )}

          {/* ════════ IDENTITY ════════ */}
          {phase === 'identity' && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pt-10"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-brand-accent/10 rounded-[2.5rem] flex items-center justify-center mx-auto">
                  <Star size={36} className="text-brand-accent" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-brand-text tracking-tighter">PICK YOUR ARENA NAME</h2>
                  <p className="text-xs font-bold text-brand-muted">This will show on the leaderboard</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1 mb-1 block">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={18} />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.substring(0, 15))}
                      onKeyDown={e => e.key === 'Enter' && handleIdentitySubmit()}
                      placeholder="e.g. Brainiac123"
                      className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-brand-text focus:border-brand-accent outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleIdentitySubmit}
                  disabled={loadingLB || !username.trim()}
                  className="w-full bg-brand-accent text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loadingLB ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  Continue to Arena
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ COUNTDOWN ════════ */}
          {phase === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-40 h-40 rounded-full border-8 border-brand-accent/20 flex items-center justify-center relative">
                <motion.span
                  key={countdown}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-8xl font-black text-brand-accent"
                >
                  {countdown === 0 ? 'GO!' : countdown}
                </motion.span>
                <div className="absolute inset-0 border-8 border-brand-accent rounded-full animate-ping opacity-20" />
              </div>
              <p className="mt-8 text-xs font-black text-brand-muted uppercase tracking-[0.2em]">Round Starting...</p>
            </motion.div>
          )}

          {/* ════════ PLAYING ════════ */}
          {phase === 'playing' && (
            <div className="space-y-6 pt-2">
              {/* HUD */}
              <div className="flex items-center justify-between bg-brand-surface border border-brand-border rounded-3xl p-4 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Progression</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-black text-brand-text">{qIndex + 1}</span>
                    <div className="w-20 h-2 bg-brand-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-accent transition-all duration-300"
                        style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <TimerRing timeLeft={timeLeft} total={GAME_DURATION} />
                <div className="text-right">
                  <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Score</span>
                  <div className="text-lg font-black text-brand-accent mt-0.5">{correct * POINTS_CORRECT}</div>
                </div>
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={qIndex}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-1 bg-brand-accent/10 rounded-full border border-brand-accent/20">
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">{questions[qIndex]?.subject}</span>
                      </div>
                      <StreakBadge streak={streak} />
                    </div>
                    <h3 className="text-xl font-black text-brand-text leading-tight tracking-tight">
                      {questions[qIndex]?.question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-3">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const optionKey = `option_${letter.toLowerCase()}` as keyof Question;
                      const optionText = questions[qIndex]?.[optionKey];
                      if (!optionText) return null;

                      const isSelected = selected === letter;
                      const isCorrect = questions[qIndex]?.correct_answer === letter;
                      const styles = OPTION_STYLES[letter];

                      let btnClass = `w-full text-left p-5 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-between group ${styles.base}`;
                      
                      if (feedback) {
                        if (isCorrect) btnClass = styles.correct;
                        else if (isSelected) btnClass = styles.wrong;
                        else btnClass = styles.wrong;
                      }

                      return (
                        <button
                          key={letter}
                          onClick={() => handleAnswer(letter)}
                          disabled={!!feedback}
                          className={btnClass}
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-7 h-7 rounded-lg bg-brand-bg/20 flex items-center justify-center text-[10px] font-black shrink-0">
                              {letter}
                            </span>
                            <span className="flex-1">{optionText}</span>
                          </div>
                          {feedback && isCorrect && <CheckCircle2 size={20} className="shrink-0" />}
                          {feedback && isSelected && !isCorrect && <XCircle size={20} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* ════════ RESULT ════════ */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pt-4 text-center"
            >
              <div className="relative inline-block mt-4">
                <div className="w-32 h-32 bg-brand-accent/10 rounded-[3rem] flex items-center justify-center animate-pulse">
                  <Trophy size={64} className="text-brand-accent" />
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
                  <Star size={24} fill="currentColor" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl font-black text-brand-text tracking-tighter">ROUND COMPLETE!</h2>
                <p className="text-xs font-black text-brand-muted uppercase tracking-widest">Great effort, {player?.username}</p>
              </div>

              {/* Score breakdown */}
              <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Final Score</p>
                  <p className="text-3xl font-black text-brand-accent tracking-tighter">{finalScore}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Correct</p>
                  <p className="text-3xl font-black text-brand-text tracking-tighter">{correct}<span className="text-lg opacity-30">/{answered}</span></p>
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Best Streak</p>
                  <p className="text-3xl font-black text-amber-500 tracking-tighter">{bestStreak}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Accuracy</p>
                  <p className="text-3xl font-black text-emerald-500 tracking-tighter">
                    {answered > 0 ? Math.round((correct / answered) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPhase('setup')}
                  className="flex items-center justify-center gap-2 bg-brand-surface border border-brand-border text-brand-text py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-sm"
                >
                  <RotateCcw size={16} />
                  Play Again
                </button>
                <button
                  onClick={() => { loadLeaderboard(); setPhase('leaderboard'); }}
                  className="flex items-center justify-center gap-2 bg-brand-accent text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-brand-accent/20"
                >
                  <BarChart3 size={16} />
                  Board
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ LEADERBOARD ════════ */}
          {phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6 pt-4"
            >
              <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-brand-text tracking-tighter uppercase">{subject}</h2>
                    <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Global Top 10 - Grade {grade}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {loadingLB ? (
                    <div className="py-20 flex justify-center">
                      <Loader2 className="animate-spin text-brand-accent" size={32} />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <AlertCircle className="mx-auto text-brand-muted" size={32} />
                      <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">No scores yet</p>
                    </div>
                  ) : (
                    leaderboard.map((entry, idx) => (
                      <div 
                        key={entry.id}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          player?.username === entry.username 
                            ? 'bg-brand-accent/10 border-brand-accent' 
                            : 'bg-brand-bg border-brand-border/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-black w-6 ${idx < 3 ? 'text-brand-accent' : 'text-brand-muted'}`}>#{idx + 1}</span>
                          <div>
                            <p className="text-sm font-black text-brand-text">{entry.username}</p>
                            <div className="flex items-center gap-2">
                               <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">{entry.correct}/{entry.total} Correct</p>
                               {entry.best_streak >= 5 && (
                                 <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1 rounded font-black text-center">STREAK</span>
                               )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-brand-text tracking-tighter">{entry.score}</p>
                          <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Points</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => setPhase('setup')}
                className="w-full flex items-center justify-center gap-3 bg-brand-accent text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <RotateCcw size={18} />
                Back to Arena Setup
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Decorative background gradients */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
