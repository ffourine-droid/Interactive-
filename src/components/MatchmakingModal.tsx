import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, X, Users, Compass, Search, Swords, UserPlus, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MatchmakingModalProps {
  gameType: 'math_duel' | 'speed_round' | 'group_battle';
  mode: 'code' | 'random' | 'search';
  player: { username: string; grade: string };
  onClose: () => void;
  onMatched: (roomCode: string, isHost: boolean) => void;
}

export default function MatchmakingModal({ gameType, mode, player, onClose, onMatched }: MatchmakingModalProps) {
  const [roomCode, setRoomCode] = useState('');
  const [looking, setLooking] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Joining game...');
  const [matchedOpponent, setMatchedOpponent] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeoutError, setTimeoutError] = useState(false);

  // Search mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingDB, setSearchingDB] = useState(false);
  const [sentChallengeUsername, setSentChallengeUsername] = useState<string | null>(null);

  // References to keep track of Supabase Subscriptions & timeouts
  const queueSubRef = useRef<any>(null);
  const roomSubRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  const themeColor = {
    math_duel: '#FF6B00',
    speed_round: '#3B82F6',
    group_battle: '#10B981'
  }[gameType];

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'AZI-';
    for (let i = 0; i < 3; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  useEffect(() => {
    if (mode === 'code') {
      startWriteACodeFlow();
    } else if (mode === 'random') {
      startRandomMatchFlow();
    }
    
    return () => {
      cleanupRealtimeAndTimer();
    };
  }, [mode]);

  const cleanupRealtimeAndTimer = () => {
    if (queueSubRef.current) {
      supabase.removeChannel(queueSubRef.current);
      queueSubRef.current = null;
    }
    if (roomSubRef.current) {
      supabase.removeChannel(roomSubRef.current);
      roomSubRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // ─── MATH / SCENE QUESTION UTILITIES FOR COOP GAMES ───
  // We preload standard questions to store in JSONB so games are fully decoupled and synced
  const getSimulatedQuestions = () => {
    if (gameType === 'math_duel') {
      return [
        { id: 'mq1', question: 'Solve: 6 x 8 - 14', option_a: '34', option_b: '32', option_c: '48', option_d: '44', correct_answer: 'A', difficulty: 'easy' },
        { id: 'mq2', question: 'What is 30% of 150?', option_a: '45', option_b: '50', option_c: '35', option_d: '40', correct_answer: 'A', difficulty: 'easy' },
        { id: 'mq3', question: 'Convert 4/5 to a decimal', option_a: '0.8', option_b: '0.75', option_c: '0.6', option_d: '0.4', correct_answer: 'A', difficulty: 'easy' },
        { id: 'mq4', question: 'Evaluate: 9 + 45 / 5', option_a: '18', option_b: '10.8', option_c: '15', option_d: '22', correct_answer: 'A', difficulty: 'medium' },
        { id: 'mq5', question: 'If 4x - 7 = 25, find x.', option_a: '8', option_b: '6', option_c: '9', option_d: '7', correct_answer: 'A', difficulty: 'hard' }
      ];
    } else {
      // Speed round / general subject questions
      return [
        { id: 'sq1', question: 'Which blood vessel carries blood away from the heart?', option_a: 'Artery', option_b: 'Vein', option_c: 'Capillary', option_d: 'Aorta', correct_answer: 'A', difficulty: 'easy', subject: 'Science' },
        { id: 'sq2', question: 'What are the main cash crops grown in Kenya?', option_a: 'Tea, Coffee & Pyrethrum', option_b: 'Maize & Beans', option_c: 'Sugarcane & Sisal', option_d: 'Wheat & Rice', correct_answer: 'A', difficulty: 'medium', subject: 'Social Studies' },
        { id: 'sq3', question: 'Determine the area of a circle with a diameter of 14cm (pi = 22/7).', option_a: '154 cm²', option_b: '616 cm²', option_c: '44 cm²', option_d: '196 cm²', correct_answer: 'A', difficulty: 'medium', subject: 'Math' },
        { id: 'sq4', question: 'Which lake is located in the Great Rift Valley of Kenya?', option_a: 'Lake Nakuru', option_b: 'Lake Victoria', option_c: 'Lake Kyoga', option_d: 'Lake Tanganyika', correct_answer: 'A', difficulty: 'easy', subject: 'Social Studies' },
        { id: 'sq5', question: 'Which energy source is eco-friendly and primary in Kenya?', option_a: 'Geothermal energy', option_b: 'Coal power', option_c: 'Petroleum fuel', option_d: 'Nuclear power', correct_answer: 'A', difficulty: 'medium', subject: 'Science' }
      ];
    }
  };

  // ─── 1. WRITE A CODE FLOW ───
  const startWriteACodeFlow = async () => {
    cleanupRealtimeAndTimer();
    setStatusMessage('Generating code & creating room...');
    const code = generateRoomCode();
    setRoomCode(code);

    try {
      const qSelected = getSimulatedQuestions();
      const targetTable = gameType === 'math_duel' ? 'math_duel_rooms' : (gameType === 'speed_round' ? 'speed_round_rooms' : 'group_battle_rooms');

      const insertPayload: any = {
        room_code: code,
        status: 'waiting',
        questions: qSelected
      };

      if (gameType === 'math_duel') {
        insertPayload.player1_username = player.username;
        insertPayload.player1_score = 0;
        insertPayload.player2_score = 0;
        insertPayload.current_round = 1;
      } else if (gameType === 'speed_round') {
        insertPayload.player1_username = player.username;
        insertPayload.player1_score = 0;
        insertPayload.player2_score = 0;
      } else {
        // Group battle
        insertPayload.host_username = player.username;
        insertPayload.current_question_index = 0;
      }

      const { error } = await supabase.from(targetTable).insert(insertPayload);
      if (error) throw error;

      setStatusMessage('Waiting for opponent...');
      
      // Subscribe to this room's changes
      roomSubRef.current = supabase
        .channel(`room_code:${code}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: targetTable,
          filter: `room_code=eq.${code}`
        }, (payload: any) => {
          const updated = payload.new;
          
          if (gameType === 'math_duel' || gameType === 'speed_round') {
            const opp = updated.player2_username;
            if (opp && updated.status === 'active' || (opp && !matchedOpponent)) {
              setMatchedOpponent(opp);
              triggerCountdown(code, true);
            }
          } else {
            // Group Battle is started by host tapping "Start Game" - so we listen inside game
          }
        })
        .subscribe();

    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to create room. Please try again.');
    }
  };

  // ─── 2. RANDOM MATCH FLOW ───
  const startRandomMatchFlow = async () => {
    cleanupRealtimeAndTimer();
    setStatusMessage('Checking matchmaking queue...');
    const cleanGrade = player.grade;

    try {
      // 1. Check matchmaking_queue for another player of same grade + gameType waiting
      const { data: matches, error: fetchErr } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('grade', cleanGrade)
        .eq('game_type', gameType)
        .eq('status', 'waiting')
        .neq('username', player.username)
        .order('created_at', { ascending: true })
        .limit(1);

      if (fetchErr) throw fetchErr;

      if (matches && matches.length > 0) {
        // MATCH FOUND! 
        const otherPlayer = matches[0];
        setStatusMessage(`Match found! Joining opponent ${otherPlayer.username}...`);
        
        // Generate a shared room code
        const code = generateRoomCode();
        const targetTable = gameType === 'math_duel' ? 'math_duel_rooms' : 'speed_round_rooms';
        const qSelected = getSimulatedQuestions();

        // Host creates the game room
        const insertPayload: any = {
          room_code: code,
          status: 'active', // Random matches start immediately
          questions: qSelected,
          player1_username: otherPlayer.username, // Original waiter is Player 1
          player2_username: player.username,       // Challenger is Player 2
          player1_score: 0,
          player2_score: 0
        };

        const { error: roomErr } = await supabase.from(targetTable).insert(insertPayload);
        if (roomErr) throw roomErr;

        // Update matchmaking queue entries to "matched" with the room code
        await supabase
          .from('matchmaking_queue')
          .update({ status: 'matched', matched_room_code: code })
          .in('id', [otherPlayer.id]);

        setMatchedOpponent(otherPlayer.username);
        triggerCountdown(code, false); // User is player 2 (guest)

      } else {
        // NO WAITERS. Insert self into queue.
        setStatusMessage('Looking for opponent...');
        
        const { data: queueRow, error: queueErr } = await supabase
          .from('matchmaking_queue')
          .insert({
            username: player.username,
            grade: cleanGrade,
            game_type: gameType,
            status: 'waiting'
          })
          .select()
          .single();

        if (queueErr) throw queueErr;

        // Start 30 second timeout
        timeoutRef.current = setTimeout(async () => {
          setStatusMessage('No players found, please try again later!');
          setTimeoutError(true);
          setLooking(false);
          // Delete row from queue
          if (queueRow) {
            await supabase.from('matchmaking_queue').delete().eq('id', queueRow.id);
          }
        }, 30000);

        // Listen for match update
        queueSubRef.current = supabase
          .channel(`queue:${queueRow.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'matchmaking_queue',
            filter: `id=eq.${queueRow.id}`
          }, async (payload: any) => {
            const updated = payload.new;
            if (updated.status === 'matched' && updated.matched_room_code) {
              cleanupRealtimeAndTimer();
              setStatusMessage('Match found!');
              
              // Get opponent name
              const tTable = gameType === 'math_duel' ? 'math_duel_rooms' : 'speed_round_rooms';
              const { data: rm } = await supabase
                .from(tTable)
                .select('*')
                .eq('room_code', updated.matched_room_code)
                .maybeSingle();

              if (rm) {
                setMatchedOpponent(rm.player2_username === player.username ? rm.player1_username : rm.player2_username);
              }
              triggerCountdown(updated.matched_room_code, true); // User is player 1 (host)
            }
          })
          .subscribe();
      }

    } catch (err) {
      console.error(err);
      setStatusMessage('Mismatch or network error. Please retry.');
    }
  };

  // ─── 3. USER CHALLEGING SEARCH ───
  const handleTypeSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingDB(true);
    try {
      const { data, error } = await supabase
        .from('arena_players')
        .select('username, grade')
        .neq('username', player.username)
        .ilike('username', `%${val.trim()}%`)
        .limit(6);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingDB(false);
    }
  };

  const handleSendChallenge = async (challengedOpponent: string) => {
    cleanupRealtimeAndTimer();
    setSentChallengeUsername(challengedOpponent);
    setStatusMessage(`Challenge sent! Waiting for ${challengedOpponent} to accept...`);
    const code = generateRoomCode();
    setRoomCode(code);

    try {
      const qSelected = getSimulatedQuestions();
      const targetTable = gameType === 'math_duel' ? 'math_duel_rooms' : 'speed_round_rooms';

      // Insert fresh challenge room
      const { error } = await supabase.from(targetTable).insert({
        room_code: code,
        status: 'waiting',
        questions: qSelected,
        player1_username: player.username,
        player2_username: challengedOpponent,
        player1_score: 0,
        player2_score: 0
      });

      if (error) throw error;

      // Listen for acceptance
      roomSubRef.current = supabase
        .channel(`challenge_accept:${code}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: targetTable,
          filter: `room_code=eq.${code}`
        }, (payload: any) => {
          const updated = payload.new;
          if (updated.status === 'active') {
            setMatchedOpponent(challengedOpponent);
            triggerCountdown(code, true);
          }
        })
        .subscribe();

      // Create a 30s challenge response timeout
      timeoutRef.current = setTimeout(async () => {
        setStatusMessage('Challenge declined or unanswered. Try again!');
        setTimeoutError(true);
        setLooking(false);
        // Clean room up
        await supabase.from(targetTable).delete().eq('room_code', code);
      }, 30000);

    } catch (err) {
      console.error(err);
      setStatusMessage('Could not deliver challenge.');
    }
  };

  // ─── COUNTDOWN TRANSITION ───
  const triggerCountdown = (code: string, isHost: boolean) => {
    cleanupRealtimeAndTimer();
    setCountdown(3);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          onMatched(code, isHost);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelAndClose = async () => {
    cleanupRealtimeAndTimer();
    
    // delete queue rows or waiting code rooms to not litter db
    try {
      if (mode === 'random') {
        await supabase.from('matchmaking_queue').delete().eq('username', player.username);
      } else if (mode === 'code' && roomCode) {
        const targetTable = gameType === 'math_duel' ? 'math_duel_rooms' : (gameType === 'speed_round' ? 'speed_round_rooms' : 'group_battle_rooms');
        await supabase.from(targetTable).delete().eq('room_code', roomCode);
      } else if (mode === 'search' && roomCode) {
        const targetTable = gameType === 'math_duel' ? 'math_duel_rooms' : 'speed_round_rooms';
        await supabase.from(targetTable).delete().eq('room_code', roomCode);
      }
    } catch (e) {
      console.warn(e);
    }
    
    onClose();
  };

  return (
    <div id="matchmaking-modal" className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[360px] bg-[#0F223A] border border-[#1A2E44] rounded-[2.5rem] overflow-hidden p-6 relative flex flex-col items-center justify-center space-y-6 shadow-2xl"
      >
        {/* Cancel Close btn */}
        {countdown === null && (
          <button
            id="matchmaking-cancel-btn"
            onClick={cancelAndClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#0A1628] border border-[#1A2E44] flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        )}

        {countdown !== null ? (
          // COUNTDOWN SCREENS
          <div className="py-8 text-center space-y-4 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white bg-gradient-to-tr from-[#FF6B00] to-[#FF8C33] shadow-lg animate-pulse">
              <Swords size={36} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-white">Opponent Loaded!</h2>
              <p className="text-xs text-gray-400 font-bold">Opponent: <span className="text-[#FF6B00] font-black">{matchedOpponent || 'Opponent'}</span></p>
            </div>
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="text-6xl font-black tracking-tighter"
              style={{ color: themeColor }}
            >
              {countdown > 0 ? countdown : 'GO!'}
            </motion.div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 animate-bounce">Get ready...</p>
          </div>
        ) : mode === 'search' && !sentChallengeUsername ? (
          // USER SEARCHING ENGINE
          <div className="w-full space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center mx-auto text-[#3B82F6]">
                <Search size={22} />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">Username Search</h3>
              <p className="text-xs text-gray-400 font-bold">Search and challenge other student players!</p>
            </div>

            <div className="bg-[#0A1628] border border-[#1A2E44] rounded-2xl px-3 py-2 flex items-center gap-2 focus-within:border-[#3B82F6] transition-colors">
              <Search size={16} className="text-gray-400" />
              <input
                id="search-username-input"
                type="text"
                placeholder="Type username (e.g. Kiprono)"
                value={searchQuery}
                onChange={(e) => handleTypeSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-white font-bold placeholder-gray-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {searchingDB ? (
                <div className="text-center py-4 text-xs font-bold text-gray-400 flex items-center justify-center gap-1.5">
                  <RefreshCw size={14} className="animate-spin" />
                  Searching players...
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-center py-4 text-[10px] uppercase tracking-widest font-black text-gray-500">
                  {searchQuery.trim().length < 2 ? 'Type at least 2 char' : 'No players found'}
                </p>
              ) : (
                searchResults.map((opp) => (
                  <button
                    id={`challenge-user-btn-${opp.username}`}
                    key={opp.username}
                    onClick={() => handleSendChallenge(opp.username)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#0A1628] hover:bg-brand-surface border border-[#1A2E44] select-none text-left transition-colors font-bold group"
                  >
                    <div>
                      <p className="text-xs text-white group-hover:text-[#FF6B00] transition-colors">{opp.username}</p>
                      <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">Grade {opp.grade}</p>
                    </div>
                    <div className="text-[10px] font-black uppercase text-[#FF6B00] tracking-wider px-2 py-1 bg-[#FF6B00]/10 rounded-lg group-hover:bg-[#FF6B00]/20 transition-all">
                      Challenge ⚔️
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          // STANDARD MATCH LOBBYS (CODE ROOM OR RANDOM MATCH QUEUE)
          <div className="py-6 text-center space-y-5 flex flex-col items-center justify-center w-full">
            {mode === 'code' ? (
              <div className="w-14 h-14 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-400">
                <Users size={28} />
              </div>
            ) : mode === 'random' ? (
              <div className="w-14 h-14 bg-[#FF6B00]/10 rounded-3xl flex items-center justify-center text-[#FF6B00] relative">
                <Compass size={28} className="animate-spin" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400">
                <Swords size={28} />
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">
                {mode === 'code' ? 'Lobby Waiting Room' : (mode === 'random' ? 'Matchmaking' : 'Battle Invitation')}
              </h3>
              <p className="text-xs text-gray-400 font-bold max-w-[240px] px-2">{statusMessage}</p>
            </div>

            {mode === 'code' && roomCode && (
              <div className="bg-[#0A1628] border border-[#1A2E44] p-4 rounded-3xl flex flex-col items-center justify-center space-y-1.5 w-full">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00]">Invite Code</span>
                <span id="lobby-room-code-display" className="text-3xl font-black tracking-widest text-white selection:bg-[#FF6B00]">
                  {roomCode}
                </span>
                <span className="text-[9px] font-semibold text-gray-400">Share this code with a classmate!</span>
              </div>
            )}

            {timeoutError && (
              <button
                id="matchmaking-retry-btn"
                onClick={() => {
                  setTimeoutError(false);
                  setLooking(true);
                  if (mode === 'random') startRandomMatchFlow();
                  else if (mode === 'code') startWriteACodeFlow();
                }}
                className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:scale-95 transition-transform flex items-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                <RefreshCw size={13} />
                Try Again
              </button>
            )}

            {looking && (
              <div className="flex items-center gap-1.5 bg-[#0A1628]/80 px-3 py-1.5 rounded-full text-[10px] font-black text-gray-400 tracking-widest uppercase border border-[#1A2E44]/50 animate-pulse">
                <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full animate-ping" />
                Waiting for Partner...
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
