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

          {/* TEACHERS GROUP WORK Card - HIGHLY PROMINENT */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('teacher_lobby');
            }}
            className="w-full bg-brand-surface border border-indigo-500/40 rounded-[2rem] p-6 text-left space-y-3 hover:border-indigo-500 transition-all group shadow-lg shadow-indigo-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <BookOpen size={28} className="text-indigo-500" />
              </div>
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">Class Projects</span>
            </div>
            <div>
              <h2 className="text-md font-black text-brand-text tracking-tight uppercase">🏫 Teachers Group Work</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">Participate in challenges, collaborative squad projects, and active battles assigned by your teacher.</p>
            </div>
            <div className="flex gap-2">
              {['Teacher Assigned', 'Squads & Teams', 'Leaderboard', 'Revision'].map(tag => (
                <span key={tag} className="text-[8px] font-black text-brand-muted px-2 py-0.5 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* 1V1 MATH DUEL Card - EXTREMELY PROMINENT */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCompDefaultTab('math_duel');
              setView('competitions');
            }}
            className="w-full bg-brand-surface border border-[#FF6B00]/40 rounded-[2rem] p-6 text-left space-y-3 hover:border-[#FF6B00] transition-all group shadow-lg shadow-[#FF6B00]/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-[#FF6B00]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#FF6B00]/20 transition-colors">
                <Swords size={28} className="text-[#FF6B00]" />
              </div>
              <span className="text-[9px] font-black text-[#FF6B00] uppercase tracking-widest px-2.5 py-1 bg-[#FF6B00]/10 rounded-full border border-[#FF6B00]/20">Live 1v1</span>
            </div>
            <div>
              <h2 className="text-md font-black text-brand-text tracking-tight uppercase">✏️ 1v1 Math Duel</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">Real-time arithmetic battle! Submit numeric answers instantly. Best of 5 rounds wins.</p>
            </div>
            <div className="flex gap-2">
              {['Real-time', 'PvP', 'Arithmetic', '30 XP'].map(tag => (
                <span key={tag} className="text-[8px] font-black text-brand-muted px-2 py-0.5 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* Speed Round */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('speed')}
            className="w-full bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-left space-y-3 hover:border-brand-accent transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-accent/20 transition-colors">
                <Zap size={28} className="text-brand-accent" />
              </div>
              <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest px-2 py-1 bg-brand-accent/10 rounded-full">Solo</span>
            </div>
            <div>
              <h2 className="text-md font-black text-brand-text tracking-tight uppercase">⚡ Speed Round (Solo)</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">60 seconds · answer as many as you can · leaderboard</p>
            </div>
            <div className="flex gap-2">
              {['Solo', 'Async', 'Leaderboard'].map(tag => (
                <span key={tag} className="text-[8px] font-black text-brand-muted px-2 py-0.5 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* Live Battle (Host/Join Room) */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCompDefaultTab('group_battle');
              setView('competitions');
            }}
            className="w-full bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-left space-y-3 hover:border-emerald-400 transition-all group shadow-lg shadow-emerald-400/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-emerald-400/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-400/20 transition-all">
                <Users size={28} className="text-emerald-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest px-2 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">Class Multi</span>
            </div>
            <div>
              <h2 className="text-md font-black text-brand-text tracking-tight uppercase">👥 Class Group Battle</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">Create room & invite up to 10 classmates. Answer same questions synchronously.</p>
            </div>
            <div className="flex gap-2">
              {['Lobby Room', 'Up to 10', 'CBC Questions'].map(tag => (
                <span key={tag} className="text-[8px] font-black text-brand-muted px-2 py-0.5 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* Alternative 1v1 Option */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCompDefaultTab('speed_round');
              setView('competitions');
            }}
            className="w-full bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-left space-y-3 hover:border-blue-400 transition-all group shadow-lg shadow-blue-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Zap size={28} className="text-blue-500" />
              </div>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest px-2 py-1 bg-blue-400/10 rounded-full">Live PvP</span>
            </div>
            <div>
              <h2 className="text-md font-black text-brand-text tracking-tight uppercase">⚡ Live 1v1 Speed Round</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">Simultaneous general knowledge challenge with classmate. 60s max limit.</p>
            </div>
            <div className="flex gap-2">
              {['Simultaneous', 'Syllabus Quiz', 'Leaderboard'].map(tag => (
                <span key={tag} className="text-[8px] font-black text-brand-muted px-2 py-0.5 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* Study Flashcards Option */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('flashcards')}
            className="w-full bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-left space-y-3 hover:border-teal-400 transition-all group shadow-lg shadow-teal-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                <BookOpen size={28} className="text-teal-500" />
              </div>
              <span className="text-[9px] font-black text-teal-400 tracking-wider uppercase px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full">Self Study</span>
            </div>
            <div>
              <h2 className="text-md font-black text-brand-text tracking-tight uppercase">📚 Study Flashcards</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">Flip interactive cards designed per Kenya CBC curriculum by subjects. Boost recall speed!</p>
            </div>
            <div className="flex gap-2">
              {['Active Recall', 'Syllabus Revision', 'Self-paced', '30 XP'].map(tag => (
                <span key={tag} className="text-[8px] font-black text-brand-muted px-2 py-0.5 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* Points guide */}
          <div className="bg-brand-bg border border-brand-border rounded-[2rem] p-5 space-y-2">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">How Points Work</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-brand-text">
              <p>✅ Correct → +10pts</p>
              <p>🔥 5-streak → +5pts</p>
              <p>🔥 10-streak → +15pts</p>
              <p>⭐ Perfect → +50pts</p>
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
