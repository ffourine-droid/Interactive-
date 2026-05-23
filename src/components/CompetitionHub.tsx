import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, ChevronLeft, Swords, Users, Zap, BookOpen, Clock, PlayCircle, Plus, Send, X, ShieldCheck, Check } from 'lucide-react';
import PlayerSetup from './PlayerSetup';
import MatchmakingModal from './MatchmakingModal';
import MathDuel from './MathDuel';
import SpeedRound from './SpeedRound';
import GroupBattle from './GroupBattle';
import { supabase } from '../lib/supabase';

interface PlayerDetails {
  id: string;
  username: string;
  grade: string;
}

export default function CompetitionHub({ onBack, defaultTab = 'math_duel' }: { onBack: () => void; defaultTab?: 'math_duel' | 'speed_round' | 'group_battle' }) {
  const [player, setPlayer] = useState<PlayerDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'math_duel' | 'speed_round' | 'group_battle'>(defaultTab);
  
  // Game Play states
  const [activeMatch, setActiveMatch] = useState<{ code: string; isHost: boolean; mode: 'math_duel' | 'speed_round' | 'group_battle' } | null>(null);
  
  // Matchmaker state
  const [matchmakingMode, setMatchmakingMode] = useState<'code' | 'random' | 'search' | null>(null);

  // Manual code entering join state
  const [enteringCode, setEnteringCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Challenge alerts state
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);

  useEffect(() => {
    // 1. Get identity
    const saved = localStorage.getItem('azilearn_player');
    if (saved) {
      try {
        setPlayer(JSON.parse(saved));
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  // Poll for incoming challenges when the student is in the hub
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      checkForIncomingChallenges();
    }, 4000); // Poll challenges check every 4 seconds

    return () => clearInterval(interval);
  }, [player]);

  const checkForIncomingChallenges = async () => {
    if (!player || activeMatch) return;

    try {
      // Look for waiting rooms where player2_username is this player's username
      // Check math duel rooms
      const { data: mathChalls } = await supabase
        .from('math_duel_rooms')
        .select('*')
        .eq('player2_username', player.username)
        .eq('status', 'waiting')
        .limit(1);

      if (mathChalls && mathChalls.length > 0) {
        setIncomingChallenge({
          ...mathChalls[0],
          gameType: 'math_duel'
        });
        return;
      }

      // Check speed round rooms
      const { data: speedChalls } = await supabase
        .from('speed_round_rooms')
        .select('*')
        .eq('player2_username', player.username)
        .eq('status', 'waiting')
        .limit(1);

      if (speedChalls && speedChalls.length > 0) {
        setIncomingChallenge({
          ...speedChalls[0],
          gameType: 'speed_round'
        });
      }
    } catch (err) {
      console.warn('Challenge check issue:', err);
    }
  };

  const handleAcceptChallenge = async () => {
    if (!incomingChallenge) return;

    const { gameType, room_code } = incomingChallenge;
    const targetTable = gameType === 'math_duel' ? 'math_duel_rooms' : 'speed_round_rooms';

    try {
      // Set room status to active to start countdown for host and guest
      await supabase
        .from(targetTable)
        .update({ status: 'active' })
        .eq('room_code', room_code);

      // Launch guest into game
      setActiveMatch({
        code: room_code,
        isHost: false,
        mode: gameType
      });
      setIncomingChallenge(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineChallenge = async () => {
    if (!incomingChallenge) return;

    const { gameType, room_code } = incomingChallenge;
    const targetTable = gameType === 'math_duel' ? 'math_duel_rooms' : 'speed_round_rooms';

    try {
      // Delete room to trigger decline for challenger
      await supabase.from(targetTable).delete().eq('room_code', room_code);
    } catch (e) {
      console.error(e);
    } finally {
      setIncomingChallenge(null);
    }
  };

  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.toUpperCase().trim();
    if (!cleanCode) return;

    setJoinLoading(true);
    setJoinError('');

    try {
      // 1. Search in math_duel_rooms
      const { data: mathRoom } = await supabase
        .from('math_duel_rooms')
        .select('*')
        .eq('room_code', cleanCode)
        .maybeSingle();

      if (mathRoom) {
        if (mathRoom.status !== 'waiting') {
          throw new Error('This room is already in progress or completed.');
        }
        
        // Join as Player 2
        await supabase
          .from('math_duel_rooms')
          .update({
            player2_username: player?.username,
            status: 'active'
          })
          .eq('room_code', cleanCode);

        setActiveMatch({ code: cleanCode, isHost: false, mode: 'math_duel' });
        setEnteringCode(false);
        setJoinCodeInput('');
        return;
      }

      // 2. Search in speed_round_rooms
      const { data: speedRoom } = await supabase
        .from('speed_round_rooms')
        .select('*')
        .eq('room_code', cleanCode)
        .maybeSingle();

      if (speedRoom) {
        if (speedRoom.status !== 'waiting') {
          throw new Error('This room is already in progress or completed.');
        }

        // Join as Player 2
        await supabase
          .from('speed_round_rooms')
          .update({
            player2_username: player?.username,
            status: 'active'
          })
          .eq('room_code', cleanCode);

        setActiveMatch({ code: cleanCode, isHost: false, mode: 'speed_round' });
        setEnteringCode(false);
        setJoinCodeInput('');
        return;
      }

      // 3. Search in group_battle_rooms
      const { data: groupRoom } = await supabase
        .from('group_battle_rooms')
        .select('*')
        .eq('room_code', cleanCode)
        .maybeSingle();

      if (groupRoom) {
        if (groupRoom.status === 'finished') {
          throw new Error('This group battle has already finished.');
        }

        // Add to players table, and route
        await supabase
          .from('group_battle_players')
          .upsert({
            room_code: cleanCode,
            username: player?.username,
            score: 0
          }, { onConflict: 'room_code,username' });

        setActiveMatch({ code: cleanCode, isHost: false, mode: 'group_battle' });
        setEnteringCode(false);
        setJoinCodeInput('');
        return;
      }

      throw new Error('No matching active room code found. Check the code!');
    } catch (err: any) {
      setJoinError(err.message || 'Error joining the arena room.');
    } finally {
      setJoinLoading(false);
    }
  };

  // If no profile, show PlayerSetup screen
  if (!player) {
    return <PlayerSetup onComplete={(p) => setPlayer(p)} />;
  }

  // Active match screen routing
  if (activeMatch) {
    if (activeMatch.mode === 'math_duel') {
      return (
        <MathDuel
          roomCode={activeMatch.code}
          isHost={activeMatch.isHost}
          player={player}
          onBack={() => setActiveMatch(null)}
        />
      );
    } else if (activeMatch.mode === 'speed_round') {
      return (
        <SpeedRound
          roomCode={activeMatch.code}
          isHost={activeMatch.isHost}
          player={player}
          onBack={() => setActiveMatch(null)}
        />
      );
    } else {
      return (
        <GroupBattle
          roomCode={activeMatch.code}
          isHost={activeMatch.isHost}
          player={player}
          onBack={() => setActiveMatch(null)}
        />
      );
    }
  }

  const selectedThemeColor = {
    math_duel: '#FF6B00',
    speed_round: '#3B82F6',
    group_battle: '#10B981'
  }[activeTab];

  return (
    <div id="competition-hub-dashboard" className="max-w-[360px] mx-auto bg-[#0A1628] min-h-screen flex flex-col justify-between text-white pb-8 relative overflow-hidden">
      
      {/* ─── HUB HEADER ─── */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 bg-[#0F223A]/30 border-b border-[#1A2E44]/40">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[#0F223A] border border-[#1A2E44] flex items-center justify-center text-[#A0AEC0] hover:text-[#FF6B00] transition-colors active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg bg-[#FF6B00]">
            <Trophy size={16} className="text-white shrink-0" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">AziLearn Arena</h1>
            <p className="text-[8px] font-black text-[#A0AEC0] uppercase tracking-widest mt-0.5">CBC Student Battles</p>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* ─── MAIN HUB LAYOUT ─── */}
      <div className="flex-1 px-5 pt-3 space-y-5">
        
        {/* STUDENT MINI PROFILE CARD */}
        <div className="bg-gradient-to-tr from-[#0F223A] to-[#142944] border border-[#1A2E44] p-4 rounded-3xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] font-black uppercase shadow-inner">
              {player.username.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-black text-[#FF6B00]">{player.username}</p>
              <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-wider">{player.grade}</p>
            </div>
          </div>
          <button
            id="join-code-toggle-btn"
            onClick={() => setEnteringCode(true)}
            className="px-3.5 py-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow shadow-[#FF6B00]/15"
          >
            Join Room 🔑
          </button>
        </div>

        {/* THREE SEPARATE COMPETITION TABS */}
        <div className="grid grid-cols-3 gap-1 bg-[#0F223A]/80 border border-[#1A2E44]/50 p-1 rounded-2xl">
          {[
            { id: 'math_duel', label: 'Math Duel', color: '#FF6B00' },
            { id: 'speed_round', label: 'Speed 1v1', color: '#3B82F6' },
            { id: 'group_battle', label: 'Group Battle', color: '#10B981' }
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                id={`tab-btn-${tab.id}`}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setEnteringCode(false);
                }}
                className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-tight text-center transition-all ${
                  isSelected 
                    ? 'text-white font-black shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
                style={{ backgroundColor: isSelected ? tab.color : 'transparent' }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB EXPLAINERS */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-[#0F223A]/40 border border-[#1A2E44]/30 rounded-2xl text-center space-y-1.5"
          >
            {activeTab === 'math_duel' && (
              <>
                <p className="text-xs font-black text-[#FF6B00] uppercase tracking-wider">✏️ Math Duel (Best of 5)</p>
                <p className="text-[10px] text-gray-300 font-bold leading-relaxed px-2">
                  First correct numeric answer wins the round. 30s timer per question. Winner secures 30 XP rewards!
                </p>
              </>
            )}
            {activeTab === 'speed_round' && (
              <>
                <p className="text-xs font-black text-[#3B82F6] uppercase tracking-wider">⚡ Speed Round (1v1)</p>
                <p className="text-[10px] text-gray-300 font-bold leading-relaxed px-2">
                  60 seconds total time limit. Answer as many correct as you can. Winner secures 20 XP rewards!
                </p>
              </>
            )}
            {activeTab === 'group_battle' && (
              <>
                <p className="text-xs font-black text-[#10B981] uppercase tracking-wider">👥 Group Battle (Up to 10 player)</p>
                <p className="text-[10px] text-gray-300 font-bold leading-relaxed px-2">
                  Create room & invite classmates. Answer same questions synchronously. Earn up to 50 XP based on rank!
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* CONDITIONAL OPTION CARDS ACCORDING TO TABS */}
        <div className="space-y-3 pt-1">
          {activeTab !== 'group_battle' ? (
            // MATH DUEL AND SPEED ROUND OPTIONS 
            <>
              {/* Option 1: Write a Code */}
              <motion.button
                id="mode-btn-code"
                whileTap={{ scale: 0.98 }}
                onClick={() => setMatchmakingMode('code')}
                className="w-full flex items-center justify-between bg-[#0F223A] border border-[#1A2E44] hover:border-[#FF6B00]/40 rounded-3xl p-5 text-left active:scale-95 group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00]">
                    <Plus size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-[#FF6B00] transition-colors font-sans">
                      ✏️ Write A Code
                    </h3>
                    <p className="text-[10px] font-bold text-[#A0AEC0] mt-0.5">
                      Create a room and share code with classmate
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* Option 2: Random Match */}
              <motion.button
                id="mode-btn-random"
                whileTap={{ scale: 0.98 }}
                onClick={() => setMatchmakingMode('random')}
                className="w-full flex items-center justify-between bg-[#0F223A] border border-[#1A2E44] hover:border-[#FF6B00]/40 rounded-3xl p-5 text-left active:scale-95 group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00]">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-[#FF6B00] transition-colors font-sans">
                      🎲 Random Match
                    </h3>
                    <p className="text-[10px] font-bold text-[#A0AEC0] mt-0.5">
                      Get matched with random player same grade
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* Option 3: Username Search */}
              <motion.button
                id="mode-btn-search"
                whileTap={{ scale: 0.98 }}
                onClick={() => setMatchmakingMode('search')}
                className="w-full flex items-center justify-between bg-[#0F223A] border border-[#1A2E44] hover:border-[#FF6B00]/40 rounded-3xl p-5 text-left active:scale-95 group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00]">
                    <Send size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-[#FF6B00] transition-colors font-sans">
                      🔍 Username Challenge
                    </h3>
                    <p className="text-[10px] font-bold text-[#A0AEC0] mt-0.5">
                      Find and challenge a specific classmate
                    </p>
                  </div>
                </div>
              </motion.button>
            </>
          ) : (
            // GROUP BATTLE OPTION (Host Creates Room (Write a Code))
            <>
              <motion.button
                id="group-create-btn"
                whileTap={{ scale: 0.98 }}
                onClick={() => setMatchmakingMode('code')}
                className="w-full flex items-center justify-between bg-[#0F223A] border border-[#1A2E44] hover:border-[#10B981]/40 rounded-3xl p-5 text-left group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                    <Plus size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-[#10B981] transition-colors">
                      ✏️ Host Group Battle
                    </h3>
                    <p className="text-[10px] font-bold text-[#A0AEC0] mt-0.5">
                      Generates code for up to 10 classmates to join
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* Highlight join method for groups */}
              <div className="bg-[#0F223A]/10 border border-[#1A2E44]/50 rounded-2xl p-4 text-center text-[10px] text-gray-400 font-bold">
                ⚠️ Sharing is key! Your classmates can join your Battle immediately by tapping the <span className="text-[#FF6B00]">"Join Room"</span> key above and typing your lobby room code.
              </div>
            </>
          )}

        </div>

      </div>

      {/* ─── OVERLAY MODALS ─── */}

      {/* 1. MANUAL JOIN DIALOG */}
      <AnimatePresence>
        {enteringCode && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[340px] bg-[#0F223A] border border-[#1A2E44] rounded-[2.5rem] p-6 text-center space-y-5 shadow-2xl relative"
            >
              <button
                id="join-close-btn"
                onClick={() => {
                  setEnteringCode(false);
                  setJoinCodeInput('');
                  setJoinError('');
                }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#0A1628] border border-[#1A2E44] flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-95"
              >
                <X size={15} />
              </button>

              <div className="space-y-1.5 pt-2">
                <div className="w-12 h-12 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-2xl flex items-center justify-center mx-auto text-[#FF6B00]">
                  <Send size={20} />
                </div>
                <h3 className="text-base font-black uppercase tracking-tight">Join Combat</h3>
                <p className="text-xs text-gray-400 font-bold px-2">
                  Enter the 6-digit lobby room code generated by your classmate!
                </p>
              </div>

              <form onSubmit={handleManualJoin} className="space-y-4">
                <input
                  id="join-code-input"
                  type="text"
                  maxLength={7}
                  placeholder="e.g. AZI-A92"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''));
                    setJoinError('');
                  }}
                  className="w-full bg-[#0A1628] border border-[#1A2E44] rounded-2xl py-3.5 px-4 text-center text-lg font-black tracking-widest uppercase outline-none focus:border-[#FF6B00] transition-colors"
                />

                {joinError && (
                  <p className="text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-center">
                    ⚠️ {joinError}
                  </p>
                )}

                <button
                  id="join-submit-btn"
                  type="submit"
                  disabled={joinLoading || !joinCodeInput.trim()}
                  className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-black text-xs uppercase py-4 rounded-xl tracking-widest active:scale-95 transition-all shadow-lg"
                >
                  {joinLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    "Connect Arena! ⚔️"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. MATCHMAKING MODAL */}
      {matchmakingMode && (
        <MatchmakingModal
          gameType={activeTab}
          mode={matchmakingMode}
          player={player}
          onClose={() => setMatchmakingMode(null)}
          onMatched={(code, isHost) => {
            setMatchmakingMode(null);
            setActiveMatch({
              code,
              isHost,
              mode: activeTab
            });
          }}
        />
      )}

      {/* 3. CHALLENGE RECEIVED ALERT */}
      <AnimatePresence>
        {incomingChallenge && (
          <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[340px] bg-[#0F223A] border border-red-500/30 rounded-[2.5rem] p-6 text-center space-y-6 shadow-2xl relative"
            >
              <div className="space-y-2">
                <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
                  <Swords size={28} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Challenge Issued!</h3>
                  <p className="text-xs text-gray-400 font-bold">
                    Classmate <span className="text-red-400 font-black">{incomingChallenge.player1_username}</span> challenged you to a 
                    <span className="text-white"> {incomingChallenge.gameType === 'math_duel' ? 'Math Duel' : 'Speed Round (1v1)'}</span>!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 font-bold select-none">
                <button
                  id="challenge-decline-btn"
                  onClick={handleDeclineChallenge}
                  className="py-3 rounded-2xl bg-[#0A1628] hover:bg-slate-800 border border-[#1A2E44] text-[#A0AEC0] text-xs font-black uppercase tracking-widest active:scale-95 transition-all text-center"
                >
                  Decline ❌
                </button>
                <button
                  id="challenge-accept-btn"
                  onClick={handleAcceptChallenge}
                  className="py-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/15 animate-pulse"
                >
                  Accept ⚔️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
