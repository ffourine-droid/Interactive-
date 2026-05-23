import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlayerSetupProps {
  onComplete: (player: { id: string; username: string; grade: string }) => void;
}

export default function PlayerSetup({ onComplete }: PlayerSetupProps) {
  const [username, setUsername] = useState('');
  const [grade, setGrade] = useState('Grade 6');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const grades = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) return;
    if (cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters long');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Parse grade number
      const gradeNum = parseInt(grade.replace(/[^0-9]/g, ''), 10) || 6;

      // Check if username exists first in arena_players
      const { data: existing, error: fetchError } = await supabase
        .from('arena_players')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existing) {
        // If it exists, we match it and reuse the existing player profile
        const matchedPlayer = {
          id: existing.id,
          username: existing.username,
          grade: `Grade ${existing.grade}`
        };
        localStorage.setItem('azilearn_player', JSON.stringify({ username: matchedPlayer.username, grade: matchedPlayer.grade, id: matchedPlayer.id }));
        onComplete(matchedPlayer);
        return;
      }

      // If it doesn't exist, create it
      const { data: inserted, error: insertError } = await supabase
        .from('arena_players')
        .insert({
          username: cleanUsername,
          grade: gradeNum,
          total_games: 0,
          total_score: 0,
          best_score: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (inserted) {
        const newPlayer = {
          id: inserted.id,
          username: inserted.username,
          grade: `Grade ${inserted.grade}`
        };
        localStorage.setItem('azilearn_player', JSON.stringify({ username: newPlayer.username, grade: newPlayer.grade, id: newPlayer.id }));
        onComplete(newPlayer);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error setting up your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="player-setup-container" className="flex flex-col items-center justify-center p-6 space-y-6 max-w-[360px] mx-auto min-h-screen text-white bg-[#0A1628]">
      <div className="space-y-3 text-center">
        <div className="w-16 h-16 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Sparkles size={28} className="text-[#FF6B00]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Setup Player</h2>
          <p className="text-xs text-[#A0AEC0] mt-1 px-4">
            Enter a nickname and select your grade to join real-time competitions, earn XP, and track your achievements!
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full bg-[#0F223A] border border-[#1A2E44] p-5 rounded-3xl space-y-5 shadow-xl">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-[#FF6B00] tracking-wider block">Username / Nickname</label>
          <input
            id="setup-username-input"
            type="text"
            maxLength={15}
            placeholder="e.g. Kiprono, Zawadi, Amina"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
              setErrorMsg('');
            }}
            className="w-full bg-[#0A1628] border border-[#1A2E44] rounded-2xl px-4 py-3 text-sm text-white placeholder-[#A0AEC0]/40 outline-none focus:border-[#FF6B00] transition-colors font-bold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-[#FF6B00] tracking-wider block">Your School Grade</label>
          <div className="grid grid-cols-2 gap-2">
            {grades.map((g) => (
              <button
                id={`setup-grade-btn-${g.replace(' ', '')}`}
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`py-3 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                  grade === g
                    ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/15'
                    : 'bg-[#0A1628] border-[#1A2E44] text-[#A0AEC0] hover:border-[#2D3748]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-center">
            ⚠️ {errorMsg}
          </p>
        )}

        <button
          id="setup-submit-btn"
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-black text-sm uppercase py-4 rounded-2xl tracking-widest active:scale-95 transition-all shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Trophy size={16} />
              Let's Compete!
            </>
          )}
        </button>
      </form>
    </div>
  );
}
