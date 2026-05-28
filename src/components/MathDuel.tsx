import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, AlertCircle, Award, Trophy, Timer, ChevronLeft, Swords, Check, ArrowRight, CornerDownLeft, RefreshCw, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playTick, playHurry, playSuccess, playFailure } from '../utils/soundEffects';

interface MathDuelProps {
  roomCode: string;
  isHost: boolean;
  player: { username: string; grade: string };
  onBack: () => void;
}

interface MathQuestion {
  question: string;
  option_a: string; // Used for fallbacks/choices if needed
  correct_answer: string; // The text value (e.g., "34")
  id: string;
}

export default function MathDuel({ roomCode, isHost, player, onBack }: MathDuelProps) {
  const [room, setRoom] = useState<any>(null);
  const [questions, setQuestions] = useState<MathQuestion[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');
  
  // Game states we calculate from current questions and round indices
  const [playerInput, setPlayerInput] = useState('');
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Confetti / Celebration triggers
  const [xpAwarded, setXpAwarded] = useState(false);

  const channelRef = useRef<any>(null);

  const opponentRoleName = isHost ? 'player2_username' : 'player1_username';
  const myRoleName = isHost ? 'player1_username' : 'player2_username';
  const finalWinnerUsername = p1Score > p2Score ? room?.player1_username : (p2Score > p1Score ? room?.player2_username : 'Draw');

  useEffect(() => {
    fetchOrCreateRoom();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomCode]);

  // Read current player values
  const getOpponentUsername = () => {
    if (!room) return 'Opponent';
    return isHost ? room.player2_username || 'Opponent' : room.player1_username || 'Opponent';
  };

  const getMyUsername = () => {
    return player.username;
  };

  const fetchOrCreateRoom = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('math_duel_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error) throw error;

      setRoom(data);
      setQuestions(data.questions || []);
      setCurrentRound(data.current_round || 1);
      setP1Score(data.player1_score || 0);
      setP2Score(data.player2_score || 0);
      setStatus(data.status);

      // Extract round winners
      syncRoundState(data);

      // Subscribe to Realtime Updates
      subscribeToRoom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRoom = () => {
    channelRef.current = supabase
      .channel(`room_match:${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'math_duel_rooms'
      }, (payload: any) => {
        const updated = payload.new;
        if (updated && updated.room_code === roomCode) {
          setRoom(updated);
          setQuestions(updated.questions || []);
          setCurrentRound(updated.current_round || 1);
          setP1Score(updated.player1_score || 0);
          setP2Score(updated.player2_score || 0);
          setStatus(updated.status);
          
          syncRoundState(updated);
        }
      })
      .subscribe();
  };

  const syncRoundState = (roomData: any) => {
    const rIdx = (roomData.current_round || 1) - 1;
    const answers = roomData.answers || [];
    const currentRoundWinner = answers[rIdx];

    if (currentRoundWinner) {
      // Round has finished
      setIsRoundOver(true);
      setRoundWinner(currentRoundWinner.winner);
      setPlayerInput('');
    } else {
      // Fresh Round
      setIsRoundOver(false);
      setRoundWinner(null);
      setPlayerInput('');
      setFeedback(null);
    }
  };

  const handleInputChar = (char: string) => {
    if (isRoundOver) return;
    setFeedback(null);
    if (char === 'back') {
      setPlayerInput(prev => prev.slice(0, -1));
    } else if (char === 'clear') {
      setPlayerInput('');
    } else {
      setPlayerInput(prev => prev + char);
    }
  };

  const submitAnswerText = async () => {
    if (isRoundOver) return;
    const cleanProposed = playerInput.trim();
    if (!cleanProposed) return;

    const rIdx = currentRound - 1;
    const question = questions[rIdx];
    if (!question) return;

    // Check if correct
    const isCorrect = cleanProposed === question.correct_answer;

    if (isCorrect) {
      setFeedback('correct');
      playSuccess();

      // Attempt to claim round victory in DB
      try {
        const { data: latestRoom, error: fetchError } = await supabase
          .from('math_duel_rooms')
          .select('*')
          .eq('room_code', roomCode)
          .single();

        if (fetchError) throw fetchError;

        const latestAnswers = latestRoom.answers || [];
        
        // If round is already won, return
        if (latestAnswers[rIdx]) {
          return;
        }

        const newAnswers = [...latestAnswers];
        newAnswers[rIdx] = {
          round: currentRound,
          winner: player.username,
          correct_answer: question.correct_answer
        };

        const scoreObj: any = {};
        if (isHost) {
          scoreObj.player1_score = (latestRoom.player1_score || 0) + 1;
        } else {
          scoreObj.player2_score = (latestRoom.player2_score || 0) + 1;
        }

        const updatedLoad: any = {
          answers: newAnswers,
          ...scoreObj
        };

        if (currentRound >= 5) {
          updatedLoad.status = 'finished';
        } else {
          updatedLoad.current_round = currentRound + 1;
        }

        await supabase
          .from('math_duel_rooms')
          .update(updatedLoad)
          .eq('room_code', roomCode);

      } catch (err) {
        console.error(err);
      }
    } else {
      setFeedback('wrong');
      playFailure();
      // Briefly clear feedback
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  // XP awarding trigger for the winner
  useEffect(() => {
    if (status === 'finished' && !xpAwarded) {
      if (finalWinnerUsername === player.username) {
        setXpAwarded(true);
        awardXpToPlayer(30);
      }
    }
  }, [status, finalWinnerUsername]);

  const awardXpToPlayer = async (xpNum: number) => {
    try {
      const studentProfile = JSON.parse(localStorage.getItem('azilearn_student_profile') || '{}');
      if (studentProfile && studentProfile.id) {
        // Increase student XP locally
        const currentXp = parseInt(studentProfile.xp || '0', 10) + xpNum;
        localStorage.setItem('azilearn_student_profile', JSON.stringify({
          ...studentProfile,
          xp: currentXp
        }));

        // Trigger updating the student database column if they exist, or trigger supabase updating metric
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
      console.warn('Silent XP award failed:', e);
    }
  };

  const getActiveQuestionText = () => {
    const qObj = questions[currentRound - 1];
    return qObj ? qObj.question : 'Solving math duel problem...';
  };

  if (loading) {
    return (
      <div id="math-duel-loading" className="flex flex-col items-center justify-center p-6 space-y-4 max-w-[360px] mx-auto min-h-screen text-white bg-[#0A1628]">
        <RefreshCw size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Loading Battle Ground...</p>
      </div>
    );
  }

  return (
    <div id="math-duel-container" className="flex flex-col max-w-[360px] mx-auto min-h-screen text-white bg-[#0A1628] pb-6 justify-between select-none">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[#1A2E44]/40 bg-[#0F223A]/30">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-[#0F223A] border border-[#1A2E44] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00] flex items-center gap-1">
            <Swords size={10} className="text-[#FF6B00]" /> Math Duel Room
          </span>
          <span className="text-[10px] font-black tracking-wider text-[#A0AEC0]">{roomCode}</span>
        </div>
        <div className="w-9" />
      </div>

      {status === 'finished' ? (
        // GAME COMPLETE WINNER SCREEN
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-3xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] shadow-lg shadow-[#FF6B00]/10"
          >
            <Trophy size={40} className="animate-bounce" />
          </motion.div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Duel Concluded!</h2>
            <p className="text-xs text-gray-400 font-bold">
              Best of 5 rounds final scorecard
            </p>
          </div>

          <div className="w-full bg-[#0F223A] border border-[#1A2E44] p-5 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between font-black text-xs uppercase tracking-wider text-gray-400 border-b border-[#1A2E44]/50 pb-2">
              <span>Player Nickname</span>
              <span>Rounds Won</span>
            </div>
            
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${finalWinnerUsername === room?.player1_username ? 'bg-[#FF6B00]/10 border-[#FF6B00]/30' : 'bg-[#0A1628]/40 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">{room?.player1_username || 'Player 1'}</span>
                {finalWinnerUsername === room?.player1_username && <Star size={12} className="text-[#FF6B00] fill-[#FF6B00]" />}
              </div>
              <span className="text-lg font-black text-[#FF6B00]">{p1Score}</span>
            </div>

            <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${finalWinnerUsername === room?.player2_username ? 'bg-[#FF6B00]/10 border-[#FF6B00]/30' : 'bg-[#0A1628]/40 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">{room?.player2_username || 'Player 1'}</span>
                {finalWinnerUsername === room?.player2_username && <Star size={12} className="text-[#FF6B00] fill-[#FF6B00]" />}
              </div>
              <span className="text-lg font-black text-[#FF6B00]">{p2Score}</span>
            </div>
          </div>

          {finalWinnerUsername === player.username ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1 bg-gradient-to-r from-emerald-500/10 to-transparent w-full"
            >
              <p className="text-[#10B981] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1.5">
                🏆 Victory Achieved!
              </p>
              <p className="text-xs text-gray-300 font-bold">You earned +30 XP! Awesome job, hero!</p>
            </motion.div>
          ) : (
            <div className="bg-[#0F223A] border border-[#1A2E44] rounded-2xl p-4 text-center text-xs text-gray-400 font-bold w-full">
              Great match! Compete again to secure your top spots!
            </div>
          )}

          <button
            id="finish-duel-back-btn"
            onClick={onBack}
            className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-black text-xs uppercase py-4 rounded-2xl tracking-widest active:scale-95 transition-all shadow-lg shadow-[#FF6B00]/20"
          >
            Go Back To Hub
          </button>
        </div>
      ) : (
        // ACTIVE GAME DUEL SCREEN
        <div className="flex-1 flex flex-col justify-between px-5 py-4 space-y-4">
          
          {/* LIVE SCOREBOARD & TIMER HEADER */}
          <div className="flex items-center justify-between bg-[#0F223A] border border-[#1A2E44] px-4 py-3 rounded-2xl shadow-xl w-full">
            <div className="text-left">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{room?.player1_username || 'Hosta'}</p>
              <p className="text-lg font-black" style={{ color: p1Score > p2Score ? '#FF6B00' : 'white' }}>{p1Score}</p>
            </div>

            <div className="flex flex-col items-center space-y-1">
              <span className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest bg-[#FF6B00]/10 px-2.5 py-1 rounded-full border border-[#FF6B00]/20 flex items-center gap-1 animate-pulse">
                <Swords size={10} className="text-[#FF6B00]" /> Battle Active
              </span>
              <span className="text-[9px] font-black uppercase text-gray-400">Round {currentRound} of 5</span>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{getOpponentUsername()}</p>
              <p className="text-lg font-black text-right" style={{ color: p2Score > p1Score ? '#FF6B00' : 'white' }}>{p2Score}</p>
            </div>
          </div>

          {/* ACTIVE QUESTION CONTAINER */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[120px] bg-gradient-to-tr from-[#0F223A]/60 to-[#0F223A]/10 border border-[#1A2E44]/40 rounded-3xl p-5 relative overflow-hidden">
            <div className="space-y-3 text-center z-10 w-full">
              <p className="text-[9px] font-black text-[#FF6B00] tracking-widest uppercase">Round {currentRound} Question</p>
              <h1 id="active-duel-question-text" className="text-2xl font-black text-white px-2 tracking-tight block max-w-sm mx-auto leading-normal">
                {getActiveQuestionText()}
              </h1>
            </div>

            {/* Live indicator of round state */}
            {isRoundOver && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 z-20 space-y-1">
                <p className="text-[#FF6B00] text-sm font-black uppercase">Round Complete!</p>
                <p className="text-xs text-white">Winner: <span className="text-emerald-400 font-extrabold">{roundWinner === 'Draw' ? 'Nobody (Draw)' : roundWinner}</span></p>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Next round launching...</p>
              </div>
            )}
          </div>

          {/* PLAYER SUBMISSION ENTRY */}
          <div className="space-y-4 w-full">
            <div className="relative">
              <input
                id="duel-answer-display"
                type="text"
                readOnly
                placeholder="Enter answer option..."
                value={playerInput}
                className={`w-full bg-[#0A1628] border rounded-2xl py-3 px-4 text-center text-lg font-bold tracking-wider outline-none transition-colors ${
                  feedback === 'correct' ? 'border-emerald-500 text-emerald-400' : (feedback === 'wrong' ? 'border-red-500 text-red-500' : 'border-[#1A2E44]')
                }`}
              />
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-4 top-3.5"
                  >
                    {feedback === 'correct' ? (
                      <Check className="text-emerald-500" size={18} />
                    ) : (
                      <AlertCircle className="text-red-500" size={18} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* KEYPAD ENGINE */}
            <div className="grid grid-cols-3 gap-1.5 w-full bg-[#0F223A]/85 border border-[#1A2E44] p-3 rounded-[2rem] shadow-2xl">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => {
                const isSpecial = key === 'clear' || key === 'back';
                return (
                  <button
                    id={`keypad-btn-${key}`}
                    key={key}
                    type="button"
                    onClick={() => handleInputChar(key)}
                    className={`py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider select-none active:scale-90 active:bg-slate-700 hover:text-[#FF6B00] hover:border-[#FF6B00]/40 border border-transparent transition-all ${
                      isSpecial 
                        ? 'bg-[#0A1628]/80 text-[#FF6B00]/80 text-xs' 
                        : 'bg-[#0A1628]/40 text-white'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
              <button
                id="keypad-submit-btn"
                onClick={submitAnswerText}
                disabled={!playerInput.trim() || isRoundOver}
                className="col-span-3 py-4 bg-[#FF6B00] hover:bg-[#FF6B00]/90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF6B00]/15"
              >
                Submit <CornerDownLeft size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
