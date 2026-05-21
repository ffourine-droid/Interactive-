import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronDown, Swords, Users, Shield,
  Copy, Check, Loader2, Crown, Zap, UserPlus, Play, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomType = '1v1' | 'group' | 'team';
type LobbyPhase = 'menu' | 'create' | 'join' | 'waiting';

interface Room {
  id: string;
  code: string;
  type: RoomType;
  host_username: string;
  grade: number;
  subject: string;
  question_count: number;
  duration_seconds: number;
  questions: Question[];
  status: 'waiting' | 'active' | 'finished';
}

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

const SUBJECTS = [
  'Mathematics', 'Integrated Science', 'Social Studies',
  'English', 'Kiswahili', 'Agriculture', 'CRE',
  'Creative Arts & Sports', 'Pre-Technical Studies', 'Business Studies',
  'Mixed (All Subjects)',
];
const GRADES = [7, 8, 9];
const QUESTION_COUNTS = [10, 15, 20, 30];
const DURATIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
];

const ROOM_TYPES: { type: RoomType; label: string; desc: string; icon: React.ReactNode; max: string }[] = [
  { type: '1v1', label: '1v1 Duel', desc: 'Challenge one opponent', icon: <Swords size={20} />, max: '2 players' },
  { type: 'group', label: 'Group Battle', desc: 'Everyone for themselves', icon: <Users size={20} />, max: 'Up to 30' },
  { type: 'team', label: 'Team Battle', desc: 'Compete as two teams', icon: <Shield size={20} />, max: 'Up to 30' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        className="w-full appearance-none bg-brand-bg border border-brand-border rounded-2xl py-3.5 pl-4 pr-10 text-sm font-bold text-brand-text focus:border-brand-accent outline-none cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ArenaLobbyProps {
  onBack: () => void;
  onGameStart: (room: Room, players: RoomPlayer[]) => void;
}

export default function ArenaLobby({ onBack, onGameStart }: ArenaLobbyProps) {
  const { showToast } = useToast();

  // ── Player identity ──
  const player = JSON.parse(localStorage.getItem('azilearn_arena_player') || 'null') as { id: string; username: string; grade: number } | null;
  const username = player?.username || '';

  // ── Phase ──
  const [phase, setPhase] = useState<LobbyPhase>('menu');

  // ── Create form ──
  const [roomType, setRoomType] = useState<RoomType>('group');
  const [grade, setGrade] = useState(player?.grade || 7);
  const [subject, setSubject] = useState('Mathematics');
  const [questionCount, setQuestionCount] = useState(20);
  const [duration, setDuration] = useState(60);
  const [teams, setTeams] = useState(['Team Simba', 'Team Cheetah']);
  const [creating, setCreating] = useState(false);

  // ── Join form ──
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // ── Waiting room ──
  const [room, setRoom] = useState<Room | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  // ── Redirect if no identity ──
  useEffect(() => {
    if (!username) {
      showToast('Set your Arena username first in Speed Round', 'error');
      onBack();
    }
  }, []);

  // ── Realtime subscription for waiting room ──
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room_players:${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'arena_room_players',
        filter: `room_id=eq.${room.id}`,
      }, () => {
        fetchPlayers(room.id);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'arena_rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        const updated = payload.new as Room;
        if (updated.status === 'active') {
          fetchPlayers(room.id).then((players) => {
            onGameStart(updated, players);
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room, onGameStart]);

  const fetchPlayers = async (roomId: string): Promise<RoomPlayer[]> => {
    const { data } = await supabase
      .from('arena_room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    const players = data as RoomPlayer[] || [];
    setRoomPlayers(players);
    return players;
  };

  const loadQuestions = async (g: number, s: string, count: number): Promise<Question[]> => {
    let query = supabase
      .from('questions_bank')
      .select('*')
      .eq('is_approved', true)
      .eq('grade', g);

    if (s !== 'Mixed (All Subjects)') {
      query = query.eq('subject', s);
    }

    const { data, error } = await query.limit(200);
    if (error || !data?.length) throw new Error('Not enough questions for this subject. Add more in the admin panel.');

    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count) as Question[];
  };

  const handleCreate = async () => {
    if (!player) return;
    setCreating(true);
    try {
      const questions = await loadQuestions(grade, subject, questionCount);
      const code = generateCode();

      const { data: roomData, error } = await supabase
        .from('arena_rooms')
        .insert({
          code,
          type: roomType,
          host_id: player.id,
          host_username: username,
          grade,
          subject: subject === 'Mixed (All Subjects)' ? 'Mixed' : subject,
          question_count: questions.length,
          duration_seconds: duration,
          questions,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;

      // Join as host
      await supabase.from('arena_room_players').insert({
        room_id: roomData.id,
        username,
        team: roomType === 'team' ? teams[0] : null,
      });

      setRoom(roomData);
      await fetchPlayers(roomData.id);
      setPhase('waiting');
      showToast('Battle room created!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to create room', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { showToast('Enter a room code', 'error'); return; }
    setJoining(true);
    try {
      const { data: roomData, error } = await supabase
        .from('arena_rooms')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .eq('status', 'waiting')
        .maybeSingle();

      if (error || !roomData) throw new Error('Room not found or already started');

      // Check 1v1 limit
      const { count } = await supabase
        .from('arena_room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomData.id);

      if (roomData.type === '1v1' && (count || 0) >= 2) throw new Error('This 1v1 room is full');

      // Check not already joined
      const { data: existing } = await supabase
        .from('arena_room_players')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('username', username)
        .maybeSingle();

      if (!existing) {
        await supabase.from('arena_room_players').insert({
          room_id: roomData.id,
          username,
          team: roomData.type === 'team' ? teams[1] : null, 
        });
      }

      setRoom(roomData);
      await fetchPlayers(roomData.id);
      setPhase('waiting');
      showToast('Joined battle!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Could not join room', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleStart = async () => {
    if (!room) return;
    if (roomPlayers.length < 2) { showToast('Need at least 2 players to start', 'error'); return; }
    setStarting(true);
    try {
      const { data: updated, error } = await supabase
        .from('arena_rooms')
        .update({ status: 'active' })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      onGameStart(updated, roomPlayers);
    } catch (e: any) {
      showToast('Failed to start game', 'error');
    } finally {
      setStarting(false);
    }
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const togglePlayerTeam = async (playerRow: RoomPlayer) => {
    if (!room) return;
    try {
      const nextTeam = playerRow.team === teams[0] ? teams[1] : teams[0];
      const { error } = await supabase
        .from('arena_room_players')
        .update({ team: nextTeam })
        .eq('id', playerRow.id);

      if (error) throw error;
      showToast(`Switched to ${nextTeam}! 🦁`, 'success');
    } catch (e: any) {
      showToast('Could not change team', 'error');
    }
  };

  const isHost = room?.host_username === username;

  return (
    <div className="max-w-[360px] mx-auto min-h-screen px-5 flex flex-col">
      <AnimatePresence mode="wait">

        {phase === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6 pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted"><ChevronLeft size={16} /></button>
              <h2 className="text-xl font-black text-brand-text tracking-tighter uppercase">Live Arena</h2>
            </div>

            <p className="text-xs font-bold text-brand-muted">Playing as <span className="text-brand-accent font-black">{username}</span></p>

            <div className="space-y-4">
              <button
                onClick={() => setPhase('create')}
                className="w-full flex items-center gap-4 p-5 bg-brand-surface border border-brand-accent/30 rounded-[2rem] hover:border-brand-accent transition-all group"
              >
                <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-accent/20 transition-colors flex-shrink-0">
                  <Crown size={22} className="text-brand-accent" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-brand-text uppercase leading-none">Host a Game</p>
                  <p className="text-[10px] font-bold text-brand-muted mt-1.5 uppercase tracking-wide">Create room & invite</p>
                </div>
              </button>

              <button
                onClick={() => setPhase('join')}
                className="w-full flex items-center gap-4 p-5 bg-brand-surface border border-brand-border rounded-[2rem] hover:border-brand-accent transition-all group"
              >
                <div className="w-12 h-12 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center group-hover:border-brand-accent transition-colors flex-shrink-0">
                  <UserPlus size={22} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-brand-text uppercase leading-none">Join a Game</p>
                  <p className="text-[10px] font-bold text-brand-muted mt-1.5 uppercase tracking-wide">Enter invite code</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6 pt-2">
            <div className="flex items-center gap-3">
              <button onClick={() => setPhase('menu')} className="text-brand-muted hover:text-brand-text transition-colors"><X size={20} /></button>
              <h2 className="text-xl font-black text-brand-text tracking-tighter uppercase">Create Room</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Game Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROOM_TYPES.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => setRoomType(type)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                        roomType === type ? 'border-brand-accent bg-brand-accent/5 text-brand-accent' : 'border-brand-border hover:border-brand-accent/50 text-brand-muted'
                      }`}
                    >
                      {icon}
                      <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Grade" value={grade} onChange={v => setGrade(Number(v))} options={GRADES} />
                <SelectField label="Length" value={questionCount} onChange={v => setQuestionCount(Number(v))} options={QUESTION_COUNTS} />
              </div>

              <SelectField label="Subject" value={subject} onChange={setSubject} options={SUBJECTS} />

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={`py-3 rounded-2xl text-[10px] font-black transition-all ${
                        duration === d.value ? 'bg-brand-accent text-white shadow-lg' : 'bg-brand-surface border border-brand-border text-brand-muted'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center justify-center gap-3 bg-brand-accent text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                Create & Host
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'join' && (
          <motion.div key="join" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6 pt-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setPhase('menu')} className="text-brand-muted hover:text-brand-text transition-colors"><X size={20} /></button>
              <h2 className="text-xl font-black text-brand-text tracking-tighter uppercase">Join Room</h2>
            </div>

            <div className="space-y-6">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.substring(0, 6).toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="ENTER CODE"
                maxLength={6}
                className="w-full bg-brand-bg border-2 border-brand-border rounded-2xl py-6 text-center text-3xl font-black tracking-[0.4em] text-brand-text focus:border-brand-accent outline-none placeholder:text-brand-muted/20"
              />
              <button
                onClick={handleJoin}
                disabled={joining || joinCode.length < 6}
                className="w-full flex items-center justify-center gap-3 bg-brand-accent text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {joining ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                Join Battle
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'waiting' && room && (
          <motion.div key="waiting" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 pt-2">
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 text-center space-y-4">
              <div>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Invite Code</p>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="text-4xl font-black text-brand-text tracking-[.25em] ml-[.25em]">{room.code}</span>
                  <button onClick={copyCode} className="p-2 bg-brand-bg rounded-lg text-brand-muted hover:text-brand-accent transition-colors">
                    {codeCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Waiting for players...</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest px-2">Players ({roomPlayers.length})</h3>
              <div className="grid grid-cols-1 gap-2">
                {roomPlayers.map((p, i) => (
                  <motion.div 
                    key={p.id}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 bg-brand-surface border border-brand-border rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-accent/10 rounded-lg flex items-center justify-center text-brand-accent font-black text-xs uppercase">
                        {p.username[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-brand-text">{p.username}</span>
                        {room?.type === 'team' && p.team && (
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 mt-0.5 rounded-md text-center max-w-max ${
                            p.team === teams[0] ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          }`}>
                            🦁 {p.team}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {room?.type === 'team' && p.username === username && (
                        <button
                          type="button"
                          onClick={() => togglePlayerTeam(p)}
                          className="px-2.5 py-1 bg-brand-accent text-white font-black text-[8px] uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-brand-accent/20"
                        >
                          Switch ⇄
                        </button>
                      )}
                      {p.username === room.host_username && <Crown size={14} className="text-amber-500 text-right" />}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {isHost ? (
              <button
                onClick={handleStart}
                disabled={starting || roomPlayers.length < 2}
                className="w-full flex items-center justify-center gap-3 bg-brand-accent text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {starting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                Start Battle
              </button>
            ) : (
              <div className="p-5 bg-brand-bg border border-brand-border rounded-2xl text-center">
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Host will start soon</p>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
