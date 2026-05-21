import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Trophy, RotateCcw, Home, Star,
  CheckCircle2, Flame, BarChart3, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RoomPlayer {
  id: string;
  username: string;
  team: string | null;
  score: number;
  correct: number;
  total_answered: number;
  best_streak: number;
  is_finished: boolean;
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
}

interface LiveResultsProps {
  room: Room;
  players: RoomPlayer[];
  username: string;
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function LiveResults({ room, players, username, onPlayAgain, onHome }: LiveResultsProps) {
  const [playersList, setPlayersList] = useState<RoomPlayer[]>(players);

  // Sync with prop updates
  useEffect(() => {
    setPlayersList(players);
  }, [players]);

  const fetchLatestPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('arena_room_players')
      .select('*')
      .eq('room_id', room.id)
      .order('score', { ascending: false });
    if (data) {
      setPlayersList(data as RoomPlayer[]);
    }
  }, [room.id]);

  // Realtime subscription & polling fallback
  useEffect(() => {
    fetchLatestPlayers();

    const channel = supabase
      .channel(`live_results:${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'arena_room_players',
        filter: `room_id=eq.${room.id}`,
      }, () => {
        fetchLatestPlayers();
      })
      .subscribe();

    const interval = setInterval(fetchLatestPlayers, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [room.id, fetchLatestPlayers]);

  const sorted = [...playersList].sort((a, b) => b.score - a.score);
  const me = sorted.find(p => p.username === username);
  const myRank = sorted.findIndex(p => p.username === username) + 1;
  const medals = ['🥇', '🥈', '🥉'];

  // Team scores
  const teamScores = room.type === 'team'
    ? playersList.reduce((acc, p) => {
        if (p.team) acc[p.team] = (acc[p.team] || 0) + p.score;
        return acc;
      }, {} as Record<string, number>)
    : null;

  const winningTeam = teamScores
    ? Object.entries(teamScores).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    : null;

  const myTeam = me?.team;
  const iWon = room.type === 'team'
    ? myTeam === winningTeam?.[0]
    : myRank === 1;

  return (
    <div className="max-w-[360px] mx-auto bg-brand-bg min-h-screen flex flex-col px-5 py-6 space-y-5">

      {/* Hero result */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-center space-y-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 mx-auto"
        >
          {iWon ? (
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center">
              <Trophy size={40} className="text-amber-400" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-brand-accent/10 rounded-3xl flex items-center justify-center">
              <Star size={40} className="text-brand-accent" />
            </div>
          )}
        </motion.div>

        <div>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
            {iWon ? '🎉 Winner!' : `Rank #${myRank}`}
          </p>
          <p className="text-5xl font-black text-brand-text mt-1">{me?.score ?? 0}</p>
          <p className="text-xs font-bold text-brand-muted">points</p>
        </div>

        {/* My stats */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {[
            { label: 'Correct', value: me?.correct ?? 0, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Answered', value: me?.total_answered ?? 0, icon: BarChart3, color: 'text-blue-400' },
            { label: 'Streak', value: me?.best_streak ?? 0, icon: Flame, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-brand-bg rounded-2xl p-3 space-y-1">
              <Icon size={14} className={`${color} mx-auto`} />
              <p className="text-base font-black text-brand-text text-center">{value}</p>
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest text-center">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Team result (team mode) */}
      {room.type === 'team' && teamScores && winningTeam && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-brand-accent" />
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Team Scores</p>
          </div>
          <div className="space-y-2">
            {Object.entries(teamScores)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([team, score], i) => {
                const isWinner = i === 0;
                const isMyTeam = team === myTeam;
                return (
                  <div key={team} className={`flex items-center justify-between p-3 rounded-2xl border ${isMyTeam ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{isWinner ? '🏆' : '🥈'}</span>
                      <p className={`text-sm font-black ${isMyTeam ? 'text-brand-accent' : 'text-brand-text'}`}>
                        {team} {isMyTeam && '(You)'}
                      </p>
                    </div>
                    <p className="text-base font-black text-brand-text">{score} pts</p>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Full leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-2"
      >
        <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest px-1">
          {room.type === '1v1' ? 'Head to Head' : 'Final Standings'}
        </p>
        {sorted.map((p, i) => {
          const isMe = p.username === username;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`flex items-center gap-3 p-4 rounded-2xl border ${isMe ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border bg-brand-surface'}`}
            >
              <span className="text-lg w-7 text-center flex-shrink-0">
                {i < 3 ? medals[i] : <span className="text-xs font-black text-brand-muted">#{i + 1}</span>}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${isMe ? 'bg-brand-accent text-white' : 'bg-brand-bg border border-brand-border text-brand-muted'}`}>
                {p.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black truncate ${isMe ? 'text-brand-accent' : 'text-brand-text'}`}>
                  {p.username} {isMe && '(You)'}
                </p>
                <p className="text-[9px] font-bold text-brand-muted">
                  {p.correct}/{p.total_answered} correct · {p.best_streak}🔥
                  {p.team && ` · ${p.team}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-black text-brand-text">{p.score}</p>
                <p className="text-[9px] font-bold text-brand-muted">pts</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onHome}
          className="flex items-center gap-2 px-5 bg-brand-surface border border-brand-border text-brand-muted py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-brand-accent hover:text-brand-text transition-all"
        >
          <Home size={14} />
          Home
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-accent text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-accent/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <RotateCcw size={14} />
          Play Again
        </button>
      </div>
    </div>
  );
}
