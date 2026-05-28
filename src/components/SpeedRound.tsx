import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, AlertCircle, Award, Trophy, Timer, ChevronLeft, Swords, Check, ArrowRight, CornerDownLeft, RefreshCw, Star, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playTick, playHurry, playSuccess, playFailure } from '../utils/soundEffects';

interface SpeedRoundProps {
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

export default function SpeedRound({ roomCode, isHost, player, onBack }: SpeedRoundProps) {
  const [room, setRoom] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');

  // Solo gameplay state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timerLeft, setTimerLeft] = useState(60);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);

  // Experience Reward state
  const [xpAwarded, setXpAwarded] = useState(false);

  const channelRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  const opponentRoleName = isHost ? 'player2_username' : 'player1_username';
  const myRoleName = isHost ? 'player1_username' : 'player2_username';
  const finalWinnerUsername = p1Score > p2Score ? room?.player1_username : (p2Score > p1Score ? room?.player2_username : 'Draw');

  useEffect(() => {
    fetchOrCreateRoom();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [roomCode]);

  // Synchronous counting clock
  useEffect(() => {
    if (status === 'active' && timerLeft > 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            finishMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [status]);

  // Audio Transaction Tick trigger on countdown intervals
  useEffect(() => {
    if (status === 'active' && timerLeft > 0) {
      if (timerLeft <= 5) {
        playHurry();
      } else {
        playTick();
      }
    }
  }, [timerLeft, status]);

  const getOpponentUsername = () => {
    if (!room) return 'Opponent';
    return isHost ? room.player2_username || 'Opponent' : room.player1_username || 'Opponent';
  };

  const fetchOrCreateRoom = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('speed_round_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error) throw error;

      setRoom(data);
      setQuestions(data.questions || []);
      setP1Score(data.player1_score || 0);
      setP2Score(data.player2_score || 0);
      setStatus(data.status);

      // Start the countdown if newly active
      if (data.status === 'active') {
        setTimerLeft(60);
      }

      subscribeToRoom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRoom = () => {
    channelRef.current = supabase
      .channel(`speed_room:${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'speed_round_rooms'
      }, (payload: any) => {
        const updated = payload.new;
        if (updated && updated.room_code === roomCode) {
          setRoom(updated);
          setP1Score(updated.player1_score || 0);
          setP2Score(updated.player2_score || 0);
          
          if (updated.status === 'finished' && status !== 'finished') {
            setStatus('finished');
          }
        }
      })
      .subscribe();
  };

  const submitOption = async (optKey: string) => {
    if (status !== 'active' || feedback) return;
    
    const activeQ = questions[currentIdx];
    if (!activeQ) return;

    setSelectedOpt(optKey);
    const correctAns = activeQ.correct_answer?.trim().toUpperCase();
    const isCorrect = optKey === correctAns;

    if (isCorrect) {
      setFeedback('correct');
      playSuccess();
      setCorrectCount(prev => prev + 1);
      
      // Update score in local hook and database immediately
      const newScore = (isHost ? p1Score : p2Score) + 1;
      if (isHost) {
        setP1Score(newScore);
      } else {
        setP2Score(newScore);
      }

      try {
        const updateField = isHost ? { player1_score: newScore } : { player2_score: newScore };
        await supabase
          .from('speed_round_rooms')
          .update(updateField)
          .eq('room_code', roomCode);
      } catch (err) {
        console.warn('Realtime score publish error:', err);
      }

    } else {
      setFeedback('wrong');
      playFailure();
      setWrongCount(prev => prev + 1);
    }

    setAnsweredCount(prev => prev + 1);

    // Proceed to next question in 800ms
    setTimeout(() => {
      setSelectedOpt(null);
      setFeedback(null);
      
      if (currentIdx + 1 >= questions.length) {
        // Out of questions before timer - wrap up
        finishMatch();
      } else {
        setCurrentIdx(prev => prev + 1);
      }
    }, 800);
  };

  const finishMatch = async () => {
    if (status === 'finished') return;
    setStatus('finished');
    
    try {
      await supabase
        .from('speed_round_rooms')
        .update({ status: 'finished' })
        .eq('room_code', roomCode);
    } catch (e) {
      console.warn(e);
    }
  };

  // Award Speed Round Reward XP
  useEffect(() => {
    if (status === 'finished' && !xpAwarded) {
      if (finalWinnerUsername === player.username) {
        setXpAwarded(true);
        awardXpToPlayer(20);
      }
    }
  }, [status, finalWinnerUsername]);

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
      console.warn('Failed to commit XP reward:', e);
    }
  };

  const activeQuestion = questions[currentIdx];

  if (loading) {
    return (
      <div id="speed-round-loading" className="flex flex-col items-center justify-center p-6 space-y-4 max-w-[360px] mx-auto min-h-screen text-white bg-[#0A1628]">
        <RefreshCw size={36} className="text-[#3B82F6] animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-[#3B82F6]">Warming Speed Engines...</p>
      </div>
    );
  }

  return (
    <div id="speed-round-container" className="flex flex-col max-w-[360px] mx-auto min-h-screen text-white bg-[#0A1628] pb-6 justify-between select-none">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[#1A2E44]/40 bg-[#0F223A]/30">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-[#0F223A] border border-[#1A2E44] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#3B82F6] flex items-center gap-1">
            <Zap size={10} className="text-[#3B82F6]" /> Speed Round (1v1)
          </span>
          <span className="text-[10px] font-black tracking-wider text-[#A0AEC0]">{roomCode}</span>
        </div>
        <div className="w-9" />
      </div>

      {status === 'finished' ? (
        // MATCH COMPLETE RESULTS MODAL
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-3xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shadow-lg shadow-[#3B82F6]/10"
          >
            <Trophy size={40} className="animate-bounce" />
          </motion.div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Time's Up!</h2>
            <p className="text-xs text-gray-400 font-bold">
              Final score breakdown matching leaderboard
            </p>
          </div>

          <div className="w-full bg-[#0F223A] border border-[#1A2E44] p-5 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between font-black text-xs uppercase tracking-wider text-gray-400 border-b border-[#1A2E44]/50 pb-2">
              <span>Student / Player</span>
              <span>Points</span>
            </div>
            
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${finalWinnerUsername === room?.player1_username ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30' : 'bg-[#0A1628]/40 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">{room?.player1_username || 'Player 1'}</span>
                {finalWinnerUsername === room?.player1_username && <Star size={12} className="text-[#3B82F6] fill-[#3B82F6]" />}
              </div>
              <span className="text-lg font-black text-[#3B82F6]">{p1Score}</span>
            </div>

            <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${finalWinnerUsername === room?.player2_username ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30' : 'bg-[#0A1628]/40 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">{room?.player2_username || 'Player 2'}</span>
                {finalWinnerUsername === room?.player2_username && <Star size={12} className="text-[#3B82F6] fill-[#3B82F6]" />}
              </div>
              <span className="text-lg font-black text-[#3B82F6]">{p2Score}</span>
            </div>
          </div>

          {finalWinnerUsername === player.username ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-2xl p-4 text-center space-y-0.5 bg-gradient-to-r from-[#3B82F6]/10 to-transparent w-full"
            >
              <p className="text-[#3B82F6] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1.5">
                ⚡ Speed Runner Winner!
              </p>
              <p className="text-xs text-gray-300 font-bold">You earned +20 XP rewards!</p>
            </motion.div>
          ) : (
            <div className="bg-[#0F223A] border border-[#1A2E44] rounded-2xl p-4 text-center text-xs text-gray-400 font-bold w-full">
              Keep practicing! Your speed and accuracy are enhancing!
            </div>
          )}

          <button
            id="finish-speed-back-btn"
            onClick={onBack}
            className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-black text-xs uppercase py-4 rounded-2xl tracking-widest active:scale-95 transition-all shadow-lg"
          >
            Go Back To Hub
          </button>
        </div>
      ) : (
        // ACTIVE SPORT SCREEN
        <div className="flex-1 flex flex-col justify-between px-5 py-4 space-y-4">
          
          {/* THE LIVE RACE HEADER SENSOR */}
          <div className="flex items-center justify-between bg-[#0F223A] border border-[#1A2E44] px-4 py-3 rounded-2xl shadow-xl w-full">
            <div className="text-left">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">My Points</p>
              <p className="text-lg font-black text-[#3B82F6]">{isHost ? p1Score : p2Score}</p>
            </div>

            <div className="flex flex-col items-center space-y-0.5">
              <span className="text-lg font-black text-white flex items-center gap-1">
                <Timer size={14} className="text-[#3B82F6] animate-pulse" /> {timerLeft}s
              </span>
              <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Speed Timer</span>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{getOpponentUsername()}</p>
              <p className="text-lg font-black text-[#A0AEC0]">{isHost ? p2Score : p1Score}</p>
            </div>
          </div>

          {/* ACTIVE QUESTION COMPONENT */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[120px] bg-[#0F223A]/50 border border-[#1A2E44]/40 rounded-3xl p-5 relative overflow-hidden">
            {activeQuestion ? (
              <div className="space-y-4 text-center w-full">
                <span className="text-[9px] font-black text-[#3B82F6] uppercase tracking-widest bg-[#3B82F6]/10 px-2 py-0.5 border border-[#3B82F6]/20 rounded-full">
                  Question {currentIdx + 1}
                </span>
                <h1 id="active-speed-question-display" className="text-base font-black text-white px-2 tracking-tight leading-normal max-w-sm mx-auto">
                  {activeQuestion.question}
                </h1>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Syncing database questions...</p>
            )}
          </div>

          {/* MULTIPLE OPTION SENSORS */}
          <div className="grid grid-cols-1 gap-2.5 w-full">
            {activeQuestion && [
              { key: 'A', text: activeQuestion.option_a },
              { key: 'B', text: activeQuestion.option_b },
              { key: 'C', text: activeQuestion.option_c },
              { key: 'D', text: activeQuestion.option_d }
            ].map((opt) => {
              const isSelected = selectedOpt === opt.key;
              let choiceStyle = 'bg-[#0F223A] border-[#1A2E44] text-white hover:border-[#3B82F6]/60';
              
              if (isSelected) {
                if (feedback === 'correct') {
                  choiceStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
                } else if (feedback === 'wrong') {
                  choiceStyle = 'bg-red-500/20 border-red-500 text-red-400';
                } else {
                  choiceStyle = 'bg-[#3B82F6]/20 border-[#3B82F6] text-white';
                }
              }

              return (
                <button
                  id={`speed-option-${opt.key}`}
                  key={opt.key}
                  onClick={() => submitOption(opt.key)}
                  disabled={!!feedback}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left text-xs font-bold transition-all active:scale-[0.98] ${choiceStyle}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-[10px] ${
                      isSelected && feedback === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : (isSelected && feedback === 'wrong' ? 'bg-red-500/20 text-red-400' : 'bg-[#0A1628] text-[#3B82F6]')
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

          {/* Race progression timeline helper */}
          <div className="space-y-1 bg-[#0F223A]/30 p-3 rounded-2xl border border-[#1A2E44]/30">
            <div className="flex items-center justify-between text-[8px] font-black uppercase text-gray-400 tracking-wider">
              <span>Race Line</span>
              <span>{currentIdx + 1} / {questions.length} Solved</span>
            </div>
            <div className="w-full bg-[#0A1628] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#3B82F6] h-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
