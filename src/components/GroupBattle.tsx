import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, AlertCircle, Award, Trophy, Timer, ChevronLeft, Users, Check, ArrowRight, CornerDownLeft, RefreshCw, Star, Play, PlayCircle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playTick, playHurry, playSuccess, playFailure } from '../utils/soundEffects';

interface GroupBattleProps {
  roomCode: string;
  isHost: boolean;
  player: { username: string; grade: string };
  onBack: () => void;
}

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string; // 'A', 'B', 'C', 'D'
}

interface Participant {
  username: string;
  score: number;
}

export default function GroupBattle({ roomCode, isHost, player, onBack }: GroupBattleProps) {
  const [room, setRoom] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Classmate player list state
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Individual play state
  const [timerLeft, setTimerLeft] = useState(20);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);

  // Experience state
  const [xpAwarded, setXpAwarded] = useState(false);

  const roomChannelRef = useRef<any>(null);
  const playersChannelRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchOrCreateRoom();

    return () => {
      cleanupChannelsAndTimers();
    };
  }, [roomCode]);

  // Handle active game synchronized timer counting
  useEffect(() => {
    if (status === 'active' && !isTimeOut && timerLeft > 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimeOut(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [status, currentQIndex, isTimeOut]);

  // Audio Transaction Tick trigger on countdown intervals
  useEffect(() => {
    if (status === 'active' && !isTimeOut && timerLeft > 0) {
      if (timerLeft <= 5) {
        playHurry();
      } else {
        playTick();
      }
    }
  }, [timerLeft, status, isTimeOut]);

  const cleanupChannelsAndTimers = () => {
    if (roomChannelRef.current) supabase.removeChannel(roomChannelRef.current);
    if (playersChannelRef.current) supabase.removeChannel(playersChannelRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const fetchOrCreateRoom = async () => {
    try {
      setLoading(true);

      const { data: rm, error } = await supabase
        .from('group_battle_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error) throw error;

      setRoom(rm);
      setQuestions(rm.questions || []);
      setStatus(rm.status);
      setCurrentQIndex(rm.current_question_index || 0);

      // Save player into players if guest (not host)
      if (!isHost) {
        await supabase
          .from('group_battle_players')
          .upsert({
            room_code: roomCode,
            username: player.username,
            score: 0
          }, { onConflict: 'room_code,username' });
      }

      // Read players list
      await fetchParticipants();

      // Subscribe to updates on room and players
      subscribeToChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('group_battle_players')
        .select('username, score')
        .eq('room_code', roomCode)
        .order('score', { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const subscribeToChannels = () => {
    // 1. Subscribe to Room table structure Change
    roomChannelRef.current = supabase
      .channel(`group_room:${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_battle_rooms'
      }, (payload: any) => {
        const updated = payload.new;
        if (updated && updated.room_code === roomCode) {
          setRoom(updated);
          setStatus(updated.status);
          
          // Reset timers and feedback when transitioning to next question index
          if (updated.current_question_index !== currentQIndex) {
            setCurrentQIndex(updated.current_question_index);
            setTimerLeft(20);
            setIsTimeOut(false);
            setSelectedOpt(null);
            setFeedback(null);
          }
        }
      })
      .subscribe();

    // 2. Subscribe to Players table modifications
    playersChannelRef.current = supabase
      .channel(`group_players:${roomCode}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_battle_players'
      }, (payload: any) => {
        const updated = payload.new;
        const oldVal = payload.old;
        const isMatch = (updated && updated.room_code === roomCode) || (oldVal && oldVal.room_code === roomCode);
        if (isMatch) {
          fetchParticipants();
        }
      })
      .subscribe();
  };

  // Host starts game
  const handleHostStartGame = async () => {
    if (!isHost) return;
    try {
      await supabase
        .from('group_battle_rooms')
        .update({ status: 'active', current_question_index: 0 })
        .eq('room_code', roomCode);
    } catch (e) {
      console.error(e);
    }
  };

  // Host advances game index
  const handleHostAdvanceQuestion = async () => {
    if (!isHost) return;

    const nextIdx = currentQIndex + 1;
    if (nextIdx >= questions.length) {
      // Conclude game
      await supabase
        .from('group_battle_rooms')
        .update({ status: 'finished' })
        .eq('room_code', roomCode);
    } else {
      await supabase
        .from('group_battle_rooms')
        .update({ current_question_index: nextIdx })
        .eq('room_code', roomCode);
    }
  };

  const submitOptionValue = async (optKey: string) => {
    if (status !== 'active' || isTimeOut || feedback) return;

    const activeQ = questions[currentQIndex];
    if (!activeQ) return;

    setSelectedOpt(optKey);
    const correctAns = activeQ.correct_answer?.trim().toUpperCase();
    const isCorrect = optKey === correctAns;

    let pointsEarned = 0;

    if (isCorrect) {
      setFeedback('correct');
      playSuccess();
      pointsEarned = 10; // +10 points per correct answer
    } else {
      setFeedback('wrong');
      playFailure();
    }

    setIsTimeOut(true); // Disable further input since submitted this question

    // Update scoreboard Database if we earned points and are guest
    if (pointsEarned > 0 && !isHost) {
      try {
        // Read current guest score
        const { data: gpRecord } = await supabase
          .from('group_battle_players')
          .select('score')
          .eq('room_code', roomCode)
          .eq('username', player.username)
          .single();

        const currentScore = gpRecord ? gpRecord.score : 0;
        const newScore = currentScore + pointsEarned;

        await supabase
          .from('group_battle_players')
          .update({ score: newScore })
          .eq('room_code', roomCode)
          .eq('username', player.username);

      } catch (err) {
        console.warn('Silent score update failed:', err);
      }
    }
  };

  // XP awarding algorithm based on leaderboard position
  useEffect(() => {
    if (status === 'finished' && !xpAwarded && !isHost) {
      // Find my position in participants
      const sorted = [...participants].sort((a, b) => b.score - a.score);
      const myRankIndex = sorted.findIndex(p => p.username === player.username);

      let xpNum = 10; // Normal reward

      if (myRankIndex === 0) {
        xpNum = 50; // 1st
      } else if (myRankIndex === 1) {
        xpNum = 35; // 2nd
      } else if (myRankIndex === 2) {
        xpNum = 25; // 3rd
      }

      setXpAwarded(true);
      awardXpToPlayer(xpNum);
    }
  }, [status, participants]);

  const awardXpToPlayer = async (xpNum: number) => {
    try {
      const studentProfile = JSON.parse(localStorage.getItem('azilearn_student_profile') || '{}');
      if (studentProfile && studentProfile.id) {
        const currentXp = parseInt(studentProfile.xp || '0', 10) + xpNum;
        localStorage.setItem('azilearn_student_profile', JSON.stringify({
          ...studentProfile,
          xp: currentXp
        }));

        const { data: stdRecord } = await supabase
          .from('arena_players')
          .select('*')
          .eq('username', player.username)
          .maybeSingle();

        if (stdRecord) {
          const updateObj: any = {};
          if ('total_score' in stdRecord) updateObj.total_score = (stdRecord.total_score || 0) + xpNum;
          if ('total_games' in stdRecord) updateObj.total_games = (stdRecord.total_games || 0) + 1;
          if ('best_score' in stdRecord) updateObj.best_score = Math.max(stdRecord.best_score || 0, xpNum);

          if (Object.keys(updateObj).length > 0) {
            await supabase
              .from('arena_players')
              .update(updateObj)
              .eq('id', stdRecord.id);
          }
        }
      }
    } catch (e) {
      console.warn('XP submission failure:', e);
    }
  };

  const activeQuestion = questions[currentQIndex];

  if (loading) {
    return (
      <div id="group-battle-loading" className="flex flex-col items-center justify-center p-6 space-y-4 max-w-[360px] mx-auto min-h-screen text-white bg-[#0A1628]">
        <RefreshCw size={36} className="text-[#10B981] animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-[#10B981]">Contacting Group Lobby...</p>
      </div>
    );
  }

  return (
    <div id="group-battle-container" className="flex flex-col max-w-[360px] mx-auto min-h-screen text-white bg-[#0A1628] pb-6 justify-between select-none">
      
      {/* ACTION HEADER */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[#1A2E44]/40 bg-[#0F223A]/30 font-bold">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-[#0F223A] border border-[#1A2E44] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#10B981] flex items-center gap-1">
            <Users size={10} className="text-[#10B981]" /> Group Battle
          </span>
          <span className="text-[10px] font-black tracking-wider text-[#A0AEC0]">{roomCode}</span>
        </div>
        <div className="w-9" />
      </div>

      {status === 'waiting' ? (
        // LOBBY WAITING SCREEN
        <div className="flex-1 flex flex-col justify-between p-6">
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-[#10B981]/10 border border-[#10B981]/30 rounded-3xl flex items-center justify-center text-[#10B981] mx-auto shadow-sm">
              <Users size={30} className="animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-black uppercase tracking-tight">CLASSMATE LOBBY</h2>
              <p className="text-xs text-gray-400 font-bold">
                Room Code: <span className="text-white bg-[#0A1628] font-black px-2 py-1 rounded border border-[#1A2E44] selection:bg-[#10B981]">{roomCode}</span>
              </p>
              {isHost && <p className="text-[10px] text-emerald-400 font-bold">★ You are the Battle Host Master</p>}
            </div>

            {/* LIVE CONNECTED PLAYER LISTS */}
            <div className="bg-[#0F223A] border border-[#1A2E44] p-4 rounded-3xl space-y-3.5 max-h-[220px] overflow-y-auto w-full shadow-inner">
              <div className="flex items-center justify-between font-black text-[9px] text-[#10B981] tracking-wider uppercase border-b border-[#1A2E44]/50 pb-1.5 mb-1 animate-pulse">
                <span>Classmates Ready</span>
                <span>{participants.length} Active</span>
              </div>
              
              {participants.length === 0 ? (
                <p className="text-[10px] uppercase font-black text-gray-500 py-6 tracking-widest">No players yet. Invite friends!!</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-left">
                  {participants.map((p, idx) => (
                    <div key={p.username} className="flex items-center gap-2 p-2 rounded-xl bg-[#0A1628]/60 border border-[#1A2E44]/75 text-xs text-white truncate">
                      <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping shrink-0" />
                      <span className="font-bold truncate">{p.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 w-full">
            {isHost ? (
              <button
                id="host-start-battle-btn"
                onClick={handleHostStartGame}
                disabled={participants.length === 0}
                className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black text-xs uppercase py-4.5 rounded-2xl tracking-widest transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[#10B981]/25 flex items-center justify-center gap-1.5"
              >
                <PlayCircle size={16} />
                Start Group Battle ({participants.length} joined)
              </button>
            ) : (
              <div className="bg-[#0F223A] border border-[#1A2E44] p-4 rounded-2xl text-center space-y-1">
                <p className="text-xs font-black text-gray-300">Waiting for {room?.host_username || 'Host'} to launch...</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Game starts immediately when host triggers!</p>
              </div>
            )}
          </div>
        </div>
      ) : status === 'finished' ? (
        // FINAL SCOREBOARDS & REWARDS SCREEN
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-3xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shadow-lg"
          >
            <Trophy size={40} className="animate-bounce" />
          </motion.div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Arena Completed!</h2>
            <p className="text-xs text-gray-400 font-bold">Group Battle complete leaderboard</p>
          </div>

          <div className="w-full bg-[#0F223A] border border-[#1A2E44] p-5 rounded-3xl space-y-2 max-h-[220px] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between font-black text-[9px] uppercase tracking-wider text-gray-400 border-b border-[#1A2E44]/50 pb-2 mb-1">
              <span>Class Rank</span>
              <span>Points</span>
            </div>

            {participants.map((p, idx) => (
              <div key={p.username} className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold leading-none ${idx === 0 ? 'bg-[#10B981]/10 border-[#10B981]/30 text-white' : 'bg-[#0A1628]/40 border-transparent text-[#A0AEC0]'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] w-5 text-center text-[#10B981]">#{idx + 1}</span>
                  <span className="truncate">{p.username}</span>
                  {idx === 0 && <Star size={12} className="text-[#10B981] fill-[#10B981]" />}
                </div>
                <span className="font-black text-[#10B981]">{p.score}pts</span>
              </div>
            ))}
          </div>

          {!isHost && (
            <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl p-4 text-center text-xs font-bold text-gray-300 w-full leading-relaxed">
              Based on your position, you were awarded points to your player achievements! Keep matching!
            </div>
          )}

          <button
            id="finish-group-back-btn"
            onClick={onBack}
            className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black text-xs uppercase py-4 rounded-2xl tracking-widest active:scale-95 transition-all shadow-lg shadow-[#10B981]/25"
          >
            Go Back To Hub
          </button>
        </div>
      ) : (
        // ACTIVE PLAYGROUND
        <div className="flex-1 flex flex-col justify-between px-5 py-4 space-y-4">
          
          {/* GROUP TIMER & SCOREBOARD SLIDER */}
          <div className="flex items-center justify-between bg-[#0F223A] border border-[#1A2E44] px-4 py-3 rounded-2xl shadow-xl w-full font-bold">
            <div className="text-left">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Question</span>
              <p className="text-base font-black text-white">{currentQIndex + 1} / {questions.length}</p>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-white flex items-center gap-1">
                <Timer size={14} className="text-[#10B981] animate-pulse" /> {timerLeft}s
              </span>
              <span className="text-[8px] font-black uppercase text-[#10B981] tracking-wider">Time Limit</span>
            </div>

            {/* Quick dashboard for host */}
            {isHost ? (
              <div className="text-right">
                <span className="text-[9px] font-black text-emerald-400 block tracking-widest uppercase">Drive Gate</span>
                <span className="text-[8px] bg-brand-accent/10 px-1.5 py-0.5 border border-brand-accent/20 text-[#10B981] font-black rounded uppercase">Host Mode</span>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-[9px] font-black text-gray-400 block tracking-widest uppercase">Score</span>
                <span className="text-base font-black text-[#10B981]">
                  {participants.find(p => p.username === player.username)?.score || 0}
                </span>
              </div>
            )}
          </div>

          {/* QUESTION BOX */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[120px] bg-[#0F223A]/50 border border-[#1A2E44]/40 rounded-3xl p-5 relative overflow-hidden">
            {activeQuestion ? (
              <div className="space-y-4 text-center w-full z-10">
                <span className="text-[9px] font-black text-[#10B981] uppercase tracking-widest bg-[#10B981]/10 px-2 py-0.5 border border-[#10B981]/20 rounded-full">
                  Question {currentQIndex + 1}
                </span>
                <h1 id="active-group-question-text" className="text-base font-black text-white px-2 tracking-tight leading-normal max-w-sm mx-auto">
                  {activeQuestion.question}
                </h1>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Synchronizing database questions...</p>
            )}

            {/* Host viewing screen or overlay */}
            {isHost && (
              <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-20 space-y-3.5">
                <p className="text-[#10B981] text-xs font-black uppercase tracking-widest flex items-center gap-1">
                  <Shield size={12} /> Host Dashboard
                </p>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Question</p>
                  <p className="text-sm font-black text-white mt-1 px-4">{activeQuestion?.question}</p>
                </div>
                
                <button
                  id="host-next-question-btn"
                  onClick={handleHostAdvanceQuestion}
                  className="px-5 py-3 bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  {currentQIndex + 1 >= questions.length ? 'Conclude Duel' : 'Next Question'}
                  <ArrowRight size={13} />
                </button>
              </div>
            )}

            {/* Timed out or submitted screen overlay */}
            {!isHost && isTimeOut && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-20 space-y-1 text-center">
                {feedback === 'correct' ? (
                  <Check className="text-emerald-500 w-10 h-10 border border-emerald-500/20 bg-emerald-500/10 rounded-full p-2.5" />
                ) : (
                  <AlertCircle className="text-red-500 w-10 h-10 border border-red-500/20 bg-red-500/10 rounded-full p-2.5" />
                )}
                <p className="text-white text-xs font-black mt-2">
                  {feedback === 'correct' ? 'CORRECT! (+10 PTS)' : 'WRONG! NEXT TIME!'}
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Waiting for Host advancement...</p>
              </div>
            )}
          </div>

          {/* ACTIVE OPTIONS FOR STUDENT GUESTS */}
          {!isHost && (
            <div className="grid grid-cols-1 gap-2.5 w-full">
              {activeQuestion && [
                { key: 'A', text: activeQuestion.option_a },
                { key: 'B', text: activeQuestion.option_b },
                { key: 'C', text: activeQuestion.option_c },
                { key: 'D', text: activeQuestion.option_d }
              ].map((opt) => {
                const isSelected = selectedOpt === opt.key;
                let choiceStyle = 'bg-[#0F223A] border-[#1A2E44] text-white hover:border-[#10B981]/60';
                
                if (isSelected) {
                  if (feedback === 'correct') {
                    choiceStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
                  } else {
                    choiceStyle = 'bg-red-500/20 border-red-500 text-red-500';
                  }
                }

                return (
                  <button
                    id={`group-option-${opt.key}`}
                    key={opt.key}
                    onClick={() => submitOptionValue(opt.key)}
                    disabled={isTimeOut}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left text-xs font-bold transition-all active:scale-[0.98] ${choiceStyle}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-[10px] ${
                        isSelected && feedback === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#0A1628] text-[#10B981]'
                      }`}>
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </span>
                    
                    {isSelected && (
                      feedback === 'correct' ? <Check size={14} className="text-emerald-500 shrink-0" /> : <AlertCircle size={14} className="text-red-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Live scoreboard progress tracking */}
          <div className="space-y-2 bg-[#0F223A]/30 p-3.5 rounded-2xl border border-[#1A2E44]/30 w-full font-bold">
            <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Live Classroom Rank</span>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
              {participants.slice(0, 3).map((p, idx) => (
                <div key={p.username} className="flex items-center justify-between text-[11px] leading-none">
                  <span className="text-[#10B981] font-black">#{idx + 1} {p.username}</span>
                  <span className="text-gray-400">{p.score}pts</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
