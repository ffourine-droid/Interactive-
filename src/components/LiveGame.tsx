import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame, Star, CheckCircle2, XCircle,
  Crown, Trophy, RotateCcw, Loader2, Check, Swords
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  difficulty: string;
  topic: string;
}

interface Room {
  id: string;
  code: string;
  type: '1v1' | 'group' | 'team';
  host_username: string;
  grade: number;
  subject: string;
  question_count: number;
  duration_seconds: number;
  questions: Question[];
  status: 'waiting' | 'active' | 'finished';
  started_at?: string;
}

interface RoomPlayer {
  id: string;
  room_id: string;
  username: string;
  team: string | null;
  score: number;
  correct: number;
  total_answered: number;
  best_streak: number;
  is_finished: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POINTS_CORRECT = 10;
const STREAK_5_BONUS = 5;
const STREAK_10_BONUS = 15;
const PERFECT_BONUS = 50;

const OPTION_STYLES: Record<string, { base: string; correct: string; wrong: string; neutral: string }> = {
  A: { base: 'border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-brand-text', correct: 'border-blue-500 bg-blue-500 text-white', wrong: 'border-red-500/30 bg-red-500/5 opacity-40 text-brand-muted', neutral: 'border-blue-500/20 opacity-50 text-brand-muted' },
  B: { base: 'border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 text-brand-text', correct: 'border-purple-500 bg-purple-500 text-white', wrong: 'border-red-500/30 bg-red-500/5 opacity-40 text-brand-muted', neutral: 'border-purple-500/20 opacity-50 text-brand-muted' },
  C: { base: 'border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 text-brand-text', correct: 'border-amber-500 bg-amber-500 text-white', wrong: 'border-red-500/30 bg-red-500/5 opacity-40 text-brand-muted', neutral: 'border-amber-500/20 opacity-50 text-brand-muted' },
  D: { base: 'border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-brand-text', correct: 'border-emerald-500 bg-emerald-500 text-white', wrong: 'border-red-500/30 bg-red-500/5 opacity-40 text-brand-muted', neutral: 'border-emerald-500/20 opacity-50 text-brand-muted' },
};

function calcScore(correct: number, total: number, bestStreak: number): number {
  let score = correct * POINTS_CORRECT;
  if (bestStreak >= 10) score += STREAK_10_BONUS;
  else if (bestStreak >= 5) score += STREAK_5_BONUS;
  if (correct > 0 && correct === total) score += PERFECT_BONUS;
  return score;
}

// ─── Timer Ring ───────────────────────────────────────────────────────────────

const TimerRing: React.FC<{ timeLeft: number; total: number }> = ({ timeLeft, total }) => {
  const pct = timeLeft / total;
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;
  const color = pct > 0.5 ? '#FF6B2C' : pct > 0.25 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-brand-border" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }} />
      </svg>
      <span className="text-lg font-black text-brand-text tabular-nums">{timeLeft}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LiveGameProps {
  room: Room;
  initialPlayers: RoomPlayer[];
  username: string;
  onFinish: (players: RoomPlayer[]) => void;
}

export default function LiveGame({ room, initialPlayers, username, onFinish }: LiveGameProps) {
  const questions: Question[] = room.questions;

  // ── Game state ──
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => {
    if (room.started_at) {
      const elapsed = Math.floor((Date.now() - new Date(room.started_at).getTime()) / 1000);
      return Math.max(0, room.duration_seconds - elapsed);
    }
    return room.duration_seconds;
  });
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // ── Live leaderboard ──
  const [players, setPlayers] = useState<RoomPlayer[]>(initialPlayers);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myPlayerRef = useRef<RoomPlayer | null>(initialPlayers.find(p => p.username === username) || null);
  const handleFinishRef = useRef<() => void>(() => {});

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('arena_room_players')
      .select('*')
      .eq('room_id', room.id)
      .order('score', { ascending: false });
    if (data) setPlayers(data as RoomPlayer[]);
  }, [room.id]);

  // ── Realtime: watch all players' scores ──
  useEffect(() => {
    fetchPlayers();

    const channel = supabase
      .channel(`live_game:${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'arena_room_players',
        filter: `room_id=eq.${room.id}`,
      }, () => {
        fetchPlayers();
      })
      .subscribe();

    // Active polling fallback for smooth real-time leaderboard changes
    const pollInterval = setInterval(fetchPlayers, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [room.id, fetchPlayers]);

  // ── Timer ──
  useEffect(() => {
    if (isFinished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleFinishRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isFinished]);

  // ── Push score update to Supabase ──
  const pushScore = useCallback(async (
    newCorrect: number, newAnswered: number, newBestStreak: number, finished = false
  ) => {
    const score = calcScore(newCorrect, newAnswered, newBestStreak);

    // Optimistically update our own score locally for zero lag
    setPlayers(prev => prev.map(p => {
      if (p.username === username) {
        return {
          ...p,
          score,
          correct: newCorrect,
          total_answered: newAnswered,
          best_streak: newBestStreak,
          is_finished: finished
        };
      }
      return p;
    }));

    const { data } = await supabase
      .from('arena_room_players')
      .update({
        score,
        correct: newCorrect,
        total_answered: newAnswered,
        best_streak: newBestStreak,
        is_finished: finished,
      })
      .eq('room_id', room.id)
      .eq('username', username)
      .select()
      .single();

    if (data) myPlayerRef.current = data as RoomPlayer;
  }, [room.id, username]);

  // ── Handle answer ──
  const handleAnswer = useCallback((letter: string) => {
    if (selected || isFinished) return;
    const q = questions[qIndex];
    if (!q) return;

    setSelected(letter);
    const isCorrect = letter === q.correct_answer;
    let newCorrect = correct;
    let newAnswered = answered + 1;
    let newStreak = streak;
    let newBestStreak = bestStreak;

    if (isCorrect) {
      newCorrect = correct + 1;
      newStreak = streak + 1;
      newBestStreak = Math.max(bestStreak, newStreak);
      setCorrect(newCorrect);
      setStreak(newStreak);
      setBestStreak(newBestStreak);
      setFeedback('correct');
    } else {
      newStreak = 0;
      setStreak(0);
      setFeedback('wrong');
    }
    setAnswered(newAnswered);

    // Push to Supabase so others see live score
    pushScore(newCorrect, newAnswered, newBestStreak);

    feedbackRef.current = setTimeout(() => {
      setSelected(null);
      setFeedback(null);
      setQIndex(i => {
        const next = i + 1;
        if (next >= questions.length) {
          // Loop back
          return 0;
        }
        return next;
      });
    }, 500);
  }, [selected, isFinished, qIndex, questions, correct, answered, streak, bestStreak, pushScore]);

  // ── Finish ──
  const handleFinish = useCallback(() => {
    if (isFinished) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackRef.current) clearTimeout(feedbackRef.current);
    setIsFinished(true);

    // Final score push
    pushScore(correct, answered, bestStreak, true).then(() => {
      // Save to arena_scores leaderboard
      const finalScore = calcScore(correct, answered, bestStreak);
      supabase.from('arena_scores').insert({
        username,
        grade: room.grade,
        subject: room.subject,
        score: finalScore,
        correct,
        total: answered,
        best_streak: bestStreak,
        played_at: new Date().toISOString(),
      }).then(() => {
        // Wait briefly then fetch final standings
        setTimeout(async () => {
          const { data } = await supabase
            .from('arena_room_players')
            .select('*')
            .eq('room_id', room.id)
            .order('score', { ascending: false });
          onFinish(data as RoomPlayer[] || []);
        }, 1500);
      });
    });
  }, [isFinished, correct, answered, bestStreak, username, room, pushScore, onFinish]);

  useEffect(() => {
    handleFinishRef.current = handleFinish;
  }, [handleFinish]);

  // ── Team scores ──
  const teamScores = room.type === 'team'
    ? players.reduce((acc, p) => {
        if (p.team) {
          acc[p.team] = (acc[p.team] || 0) + p.score;
        }
        return acc;
      }, {} as Record<string, number>)
    : null;

  const myScore = calcScore(correct, answered, bestStreak);
  const currentQ = questions[qIndex];

  if (!currentQ) return null;

  return (
    <div className="max-w-[360px] mx-auto bg-brand-bg min-h-screen flex flex-col">

      {/* Header HUD */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0 space-y-3">

        {/* Top row: timer + score + streak */}
        <div className="flex items-center justify-between">
          <TimerRing timeLeft={timeLeft} total={room.duration_seconds} />

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-full">
              <Star size={12} className="text-brand-accent" />
              <span className="text-sm font-black text-brand-text tabular-nums">{myScore}</span>
            </div>
            {streak >= 3 && (
              <motion.div key={streak} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <Flame size={10} className="text-amber-400" />
                <span className="text-[9px] font-black text-amber-400">{streak}</span>
              </motion.div>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs font-black text-brand-text">{correct}/{answered}</p>
            <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">correct</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-brand-border rounded-full overflow-hidden">
          <div className="h-full bg-brand-accent rounded-full transition-all duration-1000"
            style={{ width: `${(timeLeft / room.duration_seconds) * 100}%` }} />
        </div>

        {/* Team scores (team mode) */}
        {room.type === 'team' && teamScores && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(teamScores).map(([team, score]) => (
              <div key={team} className="flex items-center justify-between px-3 py-2 bg-brand-surface border border-brand-border rounded-xl">
                <span className="text-[10px] font-black text-brand-muted truncate">{team}</span>
                <span className="text-xs font-black text-brand-accent">{score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Mini leaderboard (top 5) */}
        {room.type !== '1v1' && (
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {players.slice(0, 5).map((p, i) => {
              const isMe = p.username === username;
              return (
                <div key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border flex-shrink-0 ${isMe ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border bg-brand-surface'}`}>
                  <span className="text-[9px] font-black text-brand-muted">#{i + 1}</span>
                  <span className={`text-[10px] font-black truncate max-w-[60px] ${isMe ? 'text-brand-accent' : 'text-brand-text'}`}>{p.username}</span>
                  <span className="text-[10px] font-black text-brand-text">{p.score}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 1v1: opponent score */}
        {room.type === '1v1' && (() => {
          const opponent = players.find(p => p.username !== username);
          if (!opponent) return null;
          return (
            <div className="flex items-center justify-between px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-bg border border-brand-border rounded-xl flex items-center justify-center text-xs font-black text-brand-muted">
                  {opponent.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-black text-brand-text">{opponent.username}</p>
                  <p className="text-[9px] font-bold text-brand-muted">{opponent.correct}/{opponent.total_answered} correct</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-brand-text">{opponent.score}</p>
                <p className="text-[9px] font-bold text-brand-muted">pts</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Question area */}
      <div className="flex-1 px-5 pb-8 overflow-y-auto space-y-4">

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-5 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">{currentQ.topic || room.subject}</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                currentQ.difficulty === 'easy' ? 'text-emerald-400 bg-emerald-400/10' :
                currentQ.difficulty === 'hard' ? 'text-red-400 bg-red-400/10' :
                'text-amber-400 bg-amber-400/10'
              }`}>{currentQ.difficulty}</span>
              <span className="text-[9px] font-bold text-brand-muted ml-auto">Q{qIndex + 1}</span>
            </div>
            <p className="text-base font-bold text-brand-text leading-snug">{currentQ.question}</p>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {(['A', 'B', 'C', 'D'] as const).map(letter => {
            const key = `option_${letter.toLowerCase()}` as keyof Question;
            const optText = currentQ[key] as string;
            const isCorrect = letter === currentQ.correct_answer;
            const isSelected = selected === letter;

            let styleClass = `border ${OPTION_STYLES[letter].base}`;
            if (feedback) {
              if (isCorrect) styleClass = `border ${OPTION_STYLES[letter].correct}`;
              else if (isSelected) styleClass = 'border border-red-500 bg-red-500/10 text-brand-text';
              else styleClass = `border ${OPTION_STYLES[letter].neutral}`;
            }

            return (
              <motion.button
                key={letter}
                onClick={() => handleAnswer(letter)}
                disabled={!!selected || isFinished}
                whileTap={!selected && !isFinished ? { scale: 0.97 } : {}}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all text-left ${styleClass}`}
              >
                <span className="w-7 h-7 rounded-xl border border-current flex items-center justify-center text-xs font-black flex-shrink-0">{letter}</span>
                <span className="text-sm font-bold leading-snug flex-1">{optText}</span>
                {feedback && isCorrect && <CheckCircle2 size={16} className="text-white ml-auto flex-shrink-0" />}
                {feedback && isSelected && !isCorrect && <XCircle size={16} className="text-red-400 ml-auto flex-shrink-0" />}
              </motion.button>
            );
          })}
        </div>

        {/* Finished overlay */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-6 bg-brand-surface border border-brand-border rounded-[2rem] mt-2"
          >
            <Loader2 size={24} className="animate-spin text-brand-accent" />
            <div className="text-center">
              <p className="text-sm font-black text-brand-text">Time's Up!</p>
              <p className="text-[10px] font-bold text-brand-muted">Calculating final scores...</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
