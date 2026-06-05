import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Swords, ChevronLeft, Users, BookOpen } from 'lucide-react';
import SpeedRoundPage from './SpeedRoundPage';
import ArenaLobby from '../components/ArenaLobby';
import LiveGame from '../components/LiveGame';
import LiveResults from '../components/LiveResults';
import CompetitionHub from '../components/CompetitionHub';
import { StudentCompetitionLobby } from '../components/StudentCompetitionLobby';
import { StudentFlashcards } from '../components/StudentFlashcards';

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

type ArenaView = 'hub' | 'speed' | 'lobby' | 'live' | 'results' | 'competitions' | 'teacher_lobby' | 'flashcards';

// ═══════════════════════════════════════════════════════════════════════════════

interface GroupWorkPageProps {
  onBack: () => void;
}

export default function GroupWorkPage({ onBack }: GroupWorkPageProps) {
  const [view, setView] = useState<ArenaView>('hub');
  const [compDefaultTab, setCompDefaultTab] = useState<'math_duel' | 'speed_round' | 'group_battle'>('math_duel');
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);

  const player = JSON.parse(localStorage.getItem('azilearn_arena_player') || 'null') as { username: string; grade: number } | null;
  const username = player?.username || '';

  // ── Hub ──
  if (view === 'hub') {
    return (
      <div className="max-w-[360px] mx-auto bg-brand-bg min-h-screen flex flex-col">
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
              <Users size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-brand-text uppercase tracking-tighter leading-none">Games</h1>
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Championships & Duels</p>
            </div>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 px-5 pb-8 space-y-4 pt-2">
          {username && (
            <p className="text-xs font-bold text-brand-muted">Playing as <span className="text-brand-accent font-black">{username}</span></p>
          )}

          {/* TEACHERS GROUP WORK Card */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('teacher_lobby');
            }}
            className="w-full bg-brand-surface border border-indigo-500/25 hover:border-indigo-500 rounded-2xl p-3 flex items-center gap-3 text-left transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-500/15 transition-colors">
              <BookOpen size={16} className="text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="font-display text-[11px] font-black text-brand-text group-hover:text-indigo-500 transition-colors leading-tight uppercase">
                  🏫 Teachers Group Work
                </h4>
                <span className="text-[7.5px] font-black text-indigo-500 bg-indigo-500/10 uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0">Class Projects</span>
              </div>
              <p className="text-[9.5px] font-medium text-brand-muted leading-tight mt-0.5">
                Challenges and active battles assigned by your teacher.
              </p>
            </div>
            <span className="text-xs font-bold text-brand-muted/50 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0">›</span>
          </motion.button>

          {/* 1V1 MATH DUEL Card */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCompDefaultTab('math_duel');
              setView('competitions');
            }}
            className="w-full bg-brand-surface border border-[#FF6B00]/25 hover:border-[#FF6B00] rounded-2xl p-3 flex items-center gap-3 text-left transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="w-9 h-9 bg-[#FF6B00]/10 border border-[#FF6B00]/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#FF6B00]/15 transition-colors">
              <Swords size={16} className="text-[#FF6B00]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="font-display text-[11px] font-black text-brand-text group-hover:text-[#FF6B00] transition-colors leading-tight uppercase">
                  ✏️ 1v1 Math Duel
                </h4>
                <span className="text-[7.5px] font-black text-[#FF6B00] bg-[#FF6B00]/10 uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0">Live 1v1</span>
              </div>
              <p className="text-[9.5px] font-medium text-brand-muted leading-tight mt-0.5">
                Real-time arithmetic battle with numeric answers.
              </p>
            </div>
            <span className="text-xs font-bold text-brand-muted/50 group-hover:text-[#FF6B00] group-hover:translate-x-0.5 transition-all shrink-0">›</span>
          </motion.button>

          {/* Speed Round */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('speed')}
            className="w-full bg-brand-surface border border-brand-accent/25 hover:border-brand-accent rounded-2xl p-3 flex items-center gap-3 text-left transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="w-9 h-9 bg-brand-accent/10 border border-brand-accent/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand-accent/15 transition-colors">
              <Zap size={16} className="text-brand-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="font-display text-[11px] font-black text-brand-text group-hover:text-brand-accent transition-colors leading-tight uppercase">
                  ⚡ Speed Round (Solo)
                </h4>
                <span className="text-[7.5px] font-black text-brand-accent bg-brand-accent/10 uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0">Solo</span>
              </div>
              <p className="text-[9.5px] font-medium text-brand-muted leading-tight mt-0.5">
                60 seconds async challenge to top the board.
              </p>
            </div>
            <span className="text-xs font-bold text-brand-muted/50 group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all shrink-0">›</span>
          </motion.button>

          {/* Live Battle (Host/Join Room) */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCompDefaultTab('group_battle');
              setView('competitions');
            }}
            className="w-full bg-brand-surface border border-emerald-400/25 hover:border-emerald-500 rounded-2xl p-3 flex items-center gap-3 text-left transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="w-9 h-9 bg-emerald-400/10 border border-emerald-400/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-400/15 transition-colors">
              <Users size={16} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="font-display text-[11px] font-black text-brand-text group-hover:text-emerald-500 transition-colors leading-tight uppercase">
                  👥 Class Group Battle
                </h4>
                <span className="text-[7.5px] font-black text-emerald-500 bg-emerald-500/10 uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0">Class Multi</span>
              </div>
              <p className="text-[9.5px] font-medium text-brand-muted leading-tight mt-0.5">
                Create synchronous lobby for up to 10 peers.
              </p>
            </div>
            <span className="text-xs font-bold text-brand-muted/50 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0">›</span>
          </motion.button>

          {/* Alternative 1v1 Option */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCompDefaultTab('speed_round');
              setView('competitions');
            }}
            className="w-full bg-brand-surface border border-blue-400/25 hover:border-blue-500 rounded-2xl p-3 flex items-center gap-3 text-left transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
              <Zap size={16} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="font-display text-[11px] font-black text-brand-text group-hover:text-blue-500 transition-colors leading-tight uppercase">
                  ⚡ Live 1v1 Speed Round
                </h4>
                <span className="text-[7.5px] font-black text-blue-500 bg-blue-500/10 uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0">Live PvP</span>
              </div>
              <p className="text-[9.5px] font-medium text-brand-muted leading-tight mt-0.5">
                Simultaneous curriculum contest with classmate.
              </p>
            </div>
            <span className="text-xs font-bold text-brand-muted/50 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0">›</span>
          </motion.button>

          {/* Study Flashcards Option */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('flashcards')}
            className="w-full bg-brand-surface border border-teal-400/25 hover:border-teal-500 rounded-2xl p-3 flex items-center gap-3 text-left transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="w-9 h-9 bg-teal-500/10 border border-teal-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-teal-500/15 transition-colors">
              <BookOpen size={16} className="text-teal-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="font-display text-[11px] font-black text-brand-text group-hover:text-teal-500 transition-colors leading-tight uppercase">
                  📚 Study Flashcards
                </h4>
                <span className="text-[7.5px] font-black text-teal-500 bg-teal-500/10 uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0">Self Study</span>
              </div>
              <p className="text-[9.5px] font-medium text-brand-muted leading-tight mt-0.5">
                Revision flashcards matching the CBC curriculum.
              </p>
            </div>
            <span className="text-xs font-bold text-brand-muted/50 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0">›</span>
          </motion.button>

          {/* Points guide */}
          <div className="bg-brand-surface border border-brand-border/45 rounded-2xl p-4 space-y-1.5 shadow-sm">
            <p className="text-[8.5px] font-black text-brand-muted uppercase tracking-widest">How Points Work</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px] font-black uppercase text-brand-text tracking-wide">
              <p className="flex items-center gap-1"><span className="text-emerald-500 text-[11px]">✅</span> Correct <span className="text-brand-muted font-black font-sans text-[8px]">+10 XP</span></p>
              <p className="flex items-center gap-1"><span className="text-[#FF6B2C] text-[11px]">🔥</span> 5-Streak <span className="text-brand-muted font-black font-sans text-[8px]">+5 XP</span></p>
              <p className="flex items-center gap-1"><span className="text-rose-500 text-[11px]">🔥</span> 10-Streak <span className="text-brand-muted font-black font-sans text-[8px]">+15 XP</span></p>
              <p className="flex items-center gap-1"><span className="text-yellow-500 text-[11px]">⭐</span> Perfect <span className="text-brand-muted font-black font-sans text-[8px]">+50 XP</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Speed Round ──
  if (view === 'speed') {
    return (
      <motion.div key="speed" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <SpeedRoundPage onBack={() => setView('hub')} />
      </motion.div>
    );
  }

  // ── Lobby ──
  if (view === 'lobby') {
    return (
      <motion.div key="lobby" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <ArenaLobby
          onBack={() => setView('hub')}
          onGameStart={(room, players) => {
            setActiveRoom(room);
            setRoomPlayers(players);
            setView('live');
          }}
        />
      </motion.div>
    );
  }

  // ── Live game ──
  if (view === 'live' && activeRoom) {
    return (
      <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <LiveGame
          room={activeRoom}
          initialPlayers={roomPlayers}
          username={username}
          onFinish={(finalPlayers) => {
            setRoomPlayers(finalPlayers);
            setView('results');
          }}
        />
      </motion.div>
    );
  }

  // ── Results ──
  if (view === 'results' && activeRoom) {
    return (
      <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <LiveResults
          room={activeRoom}
          players={roomPlayers}
          username={username}
          onPlayAgain={() => { setActiveRoom(null); setRoomPlayers([]); setView('lobby'); }}
          onHome={() => { setActiveRoom(null); setRoomPlayers([]); setView('hub'); }}
        />
      </motion.div>
    );
  }

  // ── Class Competitions ──
  if (view === 'competitions') {
    return (
      <motion.div key="competitions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <CompetitionHub
          defaultTab={compDefaultTab}
          onBack={() => setView('hub')}
        />
      </motion.div>
    );
  }

  // ── Teachers Group Work Lobby ──
  if (view === 'teacher_lobby') {
    const formattedGrade = player?.grade ? `Grade ${player.grade}` : 'Grade 7';
    return (
      <motion.div key="teacher_lobby" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <StudentCompetitionLobby
          username={username}
          grade={formattedGrade}
          onBack={() => setView('hub')}
        />
      </motion.div>
    );
  }

  // ── Study Flashcards ──
  if (view === 'flashcards') {
    return (
      <motion.div key="flashcards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <StudentFlashcards
          onBack={() => setView('hub')}
        />
      </motion.div>
    );
  }

  return null;
}
