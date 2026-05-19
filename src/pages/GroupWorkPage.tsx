import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Swords, ChevronLeft, Users } from 'lucide-react';
import SpeedRoundPage from './SpeedRoundPage';
import ArenaLobby from '../components/ArenaLobby';
import LiveGame from '../components/LiveGame';
import LiveResults from '../components/LiveResults';
import { StudentCompetitionLobby } from '../components/StudentCompetitionLobby';

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

type ArenaView = 'hub' | 'speed' | 'lobby' | 'live' | 'results' | 'competitions';

// ═══════════════════════════════════════════════════════════════════════════════

interface GroupWorkPageProps {
  onBack: () => void;
}

export default function GroupWorkPage({ onBack }: GroupWorkPageProps) {
  const [view, setView] = useState<ArenaView>('hub');
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
              <h1 className="text-base font-black text-brand-text uppercase tracking-tighter leading-none">My Work</h1>
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Tasks & Projects</p>
            </div>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 px-5 pb-8 space-y-4 pt-2">
          {username && (
            <p className="text-xs font-bold text-brand-muted">Playing as <span className="text-brand-accent font-black">{username}</span></p>
          )}

          {/* Speed Round */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('speed')}
            className="w-full bg-brand-surface border border-brand-accent/30 rounded-[2rem] p-6 text-left space-y-3 hover:border-brand-accent transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-accent/20 transition-colors">
                <Zap size={28} className="text-brand-accent" />
              </div>
              <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest px-2 py-1 bg-brand-accent/10 rounded-full">Solo</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-brand-text tracking-tighter">Speed Round</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">60 seconds · answer as many as you can · leaderboard</p>
            </div>
            <div className="flex gap-2">
              {['Solo', 'Async', 'Leaderboard'].map(tag => (
                <span key={tag} className="text-[9px] font-black text-brand-muted px-2 py-1 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* Live Battle */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('lobby')}
            className="w-full bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-left space-y-3 hover:border-brand-accent transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-brand-bg border border-brand-border rounded-2xl flex items-center justify-center group-hover:border-brand-accent group-hover:bg-brand-accent/5 transition-all">
                <Swords size={28} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
              </div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest px-2 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">Live</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-brand-text tracking-tighter">Live Battle</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">Host or join · 1v1, group, or team · real-time scores</p>
            </div>
            <div className="flex gap-2">
              {['1v1', 'Group', 'Team'].map(tag => (
                <span key={tag} className="text-[9px] font-black text-brand-muted px-2 py-1 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
              ))}
            </div>
          </motion.button>

          {/* Class Battles */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('competitions')}
            className="w-full bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-left space-y-3 hover:border-brand-accent transition-all group shadow-lg shadow-amber-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Users size={28} className="text-amber-500" />
              </div>
              <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest px-2 py-1 bg-brand-accent/10 rounded-full">School</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-brand-text tracking-tighter">Group Projects</h2>
              <p className="text-xs font-bold text-brand-muted mt-0.5">Teacher-led collaborative work · real-time teaming</p>
            </div>
            <div className="flex gap-2">
              {['Project', 'Collab', 'Trophies'].map(tag => (
                <span key={tag} className="text-[9px] font-black text-brand-muted px-2 py-1 bg-brand-bg border border-brand-border rounded-full">{tag}</span>
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
        <StudentCompetitionLobby
          username={username}
          grade={player?.grade ? `Grade ${player.grade}` : 'Grade 7'}
          onBack={() => setView('hub')}
        />
      </motion.div>
    );
  }

  return null;
}
