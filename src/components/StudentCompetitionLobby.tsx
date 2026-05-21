import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Swords, Users, Clock, 
  ChevronRight, ChevronLeft, Play, CheckCircle2, AlertCircle,
  Loader2, Star, Sparkles, Send, Search, BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { StudentIdentityModal } from './StudentIdentityModal';

interface Competition {
  id: string;
  title: string;
  subject: string;
  grade: string;
  status: 'active' | 'marking' | 'finished';
  teacher_name?: string;
  school_name?: string;
}

interface Question {
  id: string;
  question_text: string;
  type: 'mcq' | 'short_answer';
  options?: string[];
  points: number;
  correct_answer: string;
}

export const StudentCompetitionLobby: React.FC<{ 
  username: string; 
  grade: string;
  onBack: () => void;
}> = ({ username: initialUsername, grade: initialGrade, onBack }) => {
  const { showToast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeComp, setActiveComp] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  
  // Search state
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [searchGrade, setSearchGrade] = useState(initialGrade);
  const [hasSearched, setHasSearched] = useState(false);

  // Identity state
  const [showIdentity, setShowIdentity] = useState(false);
  const [pendingComp, setPendingComp] = useState<Competition | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(() => {
    const saved = localStorage.getItem('azilearn_student');
    return saved ? JSON.parse(saved) : null;
  });

  // Real-time Student Team Hub States
  const [userGroup, setUserGroup] = useState<string | null>(null);
  const [teammates, setTeammates] = useState<any[]>([]);
  const [activeGoal, setActiveGoal] = useState<string>('Work together to solve questions correctly! 🚀');
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [myResponses, setMyResponses] = useState<any[]>([]);
  const [resultsTab, setResultsTab] = useState<'leaderboard' | 'revision'>('leaderboard');

  const [isEditingSquad, setIsEditingSquad] = useState(false);
  const [customSquadInput, setCustomSquadInput] = useState('');
  const [selectedSquadPreset, setSelectedSquadPreset] = useState('');

  const handleJoinSquad = async (groupName: string | null) => {
    if (!activeComp || !currentUser) return;
    try {
      const studentId = currentUser.id;
      const studentName = currentUser.name;

      const { data: existingPart } = await supabase
        .from('teacher_competition_participants')
        .select('*')
        .eq('competition_id', activeComp.id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingPart) {
        const { error: pErr } = await supabase
          .from('teacher_competition_participants')
          .update({
            group_name: groupName
          })
          .eq('competition_id', activeComp.id)
          .eq('student_id', studentId);

        if (pErr) throw pErr;
      } else {
        const { error: pErr } = await supabase
          .from('teacher_competition_participants')
          .insert([{
            competition_id: activeComp.id,
            student_id: studentId,
            student_name: studentName,
            score: 0,
            total_questions: questions.length || 0,
            is_finished: false,
            group_name: groupName
          }]);

        if (pErr) throw pErr;
      }

      showToast(groupName ? `Squad set to: ${groupName}! 🚀` : 'Switched to Solo mode.', 'success');
      setUserGroup(groupName);
      setIsEditingSquad(false);
      setCustomSquadInput('');
      setSelectedSquadPreset('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update squad', 'error');
    }
  };

  useEffect(() => {
    if (!activeComp || !currentUser) return;

    const fetchTeamInfo = async () => {
      try {
        const { data: part } = await supabase
          .from('teacher_competition_participants')
          .select('group_name, is_finished')
          .eq('competition_id', activeComp.id)
          .eq('student_id', currentUser.id)
          .maybeSingle();

        if (part?.is_finished) {
          setHasFinished(true);
        }

        // Fetch all participants for the leaderboard
        const { data: allParts } = await supabase
          .from('teacher_competition_participants')
          .select('student_id, student_name, score, is_finished, group_name')
          .eq('competition_id', activeComp.id)
          .order('score', { ascending: false });
        
        setAllParticipants(allParts || []);

        // Also fetch my responses if finished or marking or finished, for revision
        const { data: myResp } = await supabase
          .from('teacher_competition_responses')
          .select('*')
          .eq('competition_id', activeComp.id)
          .eq('student_id', currentUser.id);
        
        setMyResponses(myResp || []);

        const goal = localStorage.getItem(`group_goal_${activeComp.id}`);
        if (goal) {
          setActiveGoal(goal);
        }

        if (part?.group_name) {
          setUserGroup(part.group_name);
          
          const { data: members } = await supabase
            .from('teacher_competition_participants')
            .select('student_name, score, is_finished, student_id')
            .eq('competition_id', activeComp.id)
            .eq('group_name', part.group_name);

          setTeammates(members || []);
        } else {
          setUserGroup(null);
          setTeammates([]);
        }
      } catch (e) {
        console.error("Error fetching student team details:", e);
      }
    };

    fetchTeamInfo();

    const channel = supabase
      .channel(`student_lobby_team_${activeComp.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teacher_competition_participants',
        filter: `competition_id=eq.${activeComp.id}`
      }, () => {
        fetchTeamInfo();
      })
      .subscribe();

    const responsesChannel = supabase
      .channel(`student_responses_${activeComp.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teacher_competition_responses',
        filter: `competition_id=eq.${activeComp.id}`
      }, () => {
        fetchTeamInfo();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(responsesChannel);
    };
  }, [activeComp?.id, currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      fetchCompetitions();

      // Subscribe to all competition changes for instant updates
      // This is especially useful for status changes (active -> marking -> finished)
      // and when new competitions are created.
      const competitionsChannel = supabase
        .channel('competitions-global')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'teacher_competitions'
        }, () => {
          // Re-fetch to apply all filters correctly
          fetchCompetitions();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(competitionsChannel);
      };
    }
  }, [currentUser, searchGrade]); // Re-subscribe if grade changes to keep filters accurate

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      setHasSearched(true);
      
      let query = supabase
        .from('teacher_competitions')
        .select(`
          *,
          teachers!teacher_id(name, school_name)
        `)
        .in('status', ['active', 'marking', 'finished']);

      if (searchGrade) query = query.eq('grade', searchGrade);
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Fallback for relationship errors
        if (error.message?.includes('relationship') || error.message?.includes('not found') || error.code?.startsWith('PGRST')) {
          let basicQuery = supabase
            .from('teacher_competitions')
            .select('*')
            .in('status', ['active', 'marking', 'finished']);
          if (searchGrade) basicQuery = basicQuery.eq('grade', searchGrade);
          
          const { data: basicData, error: basicErr } = await basicQuery.order('created_at', { ascending: false });
          
          if (basicErr) throw basicErr;
          
          // Filter manually if relationship fetch failed
          let filtered = basicData || [];
          
          setCompetitions(filtered.map(c => ({ 
            ...c, 
            teacher_name: 'Your Teacher',
            school_name: 'Your School'
          })));
          return;
        }
        throw error;
      }
      
      let filtered = data || [];
      
      // Client-side filtering for teacher/school since standard joins might be tricky depending on schema
      if (searchTeacher) {
        filtered = filtered.filter(c => 
          (c as any).teachers?.name?.toLowerCase().includes(searchTeacher.toLowerCase())
        );
      }
      if (searchSchool) {
        filtered = filtered.filter(c => 
          (c as any).teachers?.school_name?.toLowerCase().includes(searchSchool.toLowerCase())
        );
      }
      
      setCompetitions(filtered.map(c => ({
        ...c,
        teacher_name: (c as any).teachers?.name,
        school_name: (c as any).teachers?.school_name
      })));
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartComp = (comp: Competition) => {
    if (!currentUser) {
      setPendingComp(comp);
      setShowIdentity(true);
    } else {
      startCompetition(comp);
    }
  };

  const startCompetition = async (comp: Competition) => {
    try {
      setLoading(true);
      // 1. Get questions
      const { data: qs, error: qErr } = await supabase
        .from('teacher_competition_questions')
        .select('*')
        .eq('competition_id', comp.id);
      
      if (qErr) throw qErr;

      if (qs.length === 0) {
        showToast("This competition has no questions yet.", "error");
        return;
      }

      // 2. Register participant or update existing pre-created row (e.g., from group assignment)
      const studentId = currentUser?.id || 'anon-' + Math.random().toString(36).substr(2, 9);
      const studentName = currentUser?.name || initialUsername;

      const { data: existingPart } = await supabase
        .from('teacher_competition_participants')
        .select('*')
        .eq('competition_id', comp.id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingPart) {
        const { error: pErr } = await supabase
          .from('teacher_competition_participants')
          .update({
            student_name: studentName,
            total_questions: qs.length
          })
          .eq('competition_id', comp.id)
          .eq('student_id', studentId);

        if (pErr) throw pErr;
      } else {
        const { error: pErr } = await supabase
          .from('teacher_competition_participants')
          .insert([{
            competition_id: comp.id,
            student_id: studentId,
            student_name: studentName,
            score: 0,
            total_questions: qs.length,
            is_finished: false,
            group_name: null
          }]);

        if (pErr) throw pErr;
      }

      if (existingPart?.is_finished || comp.status === 'marking' || comp.status === 'finished') {
        setHasFinished(true);
      } else {
        setHasFinished(false);
      }

      setQuestions(qs);
      setActiveComp(comp);
      setCurrentIdx(0);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    const q = questions[currentIdx];
    const newAnswers = { ...answers, [q.id]: answer };
    setAnswers(newAnswers);

    // If MCQ and not on the last question, auto-advance gently so they see the highlighted choice
    if (q.type === 'mcq' && currentIdx < questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => Math.min(prev + 1, questions.length - 1));
      }, 350);
    }
  };

  const handleFinalSubmit = async (finalAnswers: Record<string, string>) => {
    const unasweredCount = questions.filter(q => !finalAnswers[q.id]?.trim()).length;
    if (unasweredCount > 0) {
      if (!confirm(`⚠️ You have ${unasweredCount} unanswered question(s). Are you sure you want to submit your final work?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const studentId = currentUser?.id || 'anon-' + Math.random().toString(36).substr(2, 9);
      const studentName = currentUser?.name || initialUsername;
      
      const responses = questions.map(q => {
        const ans = finalAnswers[q.id] || '';
        // Auto-grade MCQs
        const isMcq = q.type === 'mcq';
        const rawIsCorrect = isMcq && ans ? (ans.trim().toUpperCase() === q.correct_answer.trim().toUpperCase()) : null;
        const isCorrect = rawIsCorrect === true ? true : (rawIsCorrect === false ? false : null);
        
        return {
          competition_id: activeComp!.id,
          question_id: q.id,
          student_id: studentId,
          student_name: studentName,
          answer_text: ans,
          is_correct: isCorrect,
          points_awarded: isCorrect === true ? q.points : 0,
          submitted_at: new Date().toISOString()
        };
      });

      const { error: resErr } = await supabase
        .from('teacher_competition_responses')
        .insert(responses);

      if (resErr) throw resErr;

      // Calculate score for auto-graded ones
      const mcqScore = responses.reduce((acc, r) => acc + (r.points_awarded || 0), 0);

      await supabase
        .from('teacher_competition_participants')
        .update({ 
          is_finished: true, 
          score: mcqScore, // This might be updated later by teacher marking
          submitted_at: new Date().toISOString()
        })
        .eq('competition_id', activeComp!.id)
        .eq('student_id', studentId);

      setHasFinished(true);
      showToast("🚀 Outstanding job! Your class project was submitted successfully!", "success");
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasFinished) {
    // Group analysis
    const groupMap: Record<string, { members: any[], totalScore: number, finishedCount: number }> = {};
    
    // Populate groups from allParticipants
    allParticipants.forEach(p => {
      if (p.group_name) {
        if (!groupMap[p.group_name]) {
          groupMap[p.group_name] = { members: [], totalScore: 0, finishedCount: 0 };
        }
        groupMap[p.group_name].members.push(p);
        groupMap[p.group_name].totalScore += p.score || 0;
        if (p.is_finished) {
          groupMap[p.group_name].finishedCount += 1;
        }
      }
    });

    const rankedGroups = Object.entries(groupMap)
      .map(([name, data]) => {
        const avg = data.members.length > 0 ? Math.round(data.totalScore / data.members.length) : 0;
        return {
          name,
          totalScore: data.totalScore,
          avgScore: avg,
          membersCount: data.members.length,
          finishedCount: data.finishedCount,
          members: data.members
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore); // Sort by total score

    const sortedPlayers = [...allParticipants].sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Find current student's score and group
    const myPartInfo = allParticipants.find(p => p.student_id === currentUser?.id);

    // Winning Team Calculation (only if status is finished)
    const winningGroup = rankedGroups.length > 0 ? rankedGroups[0] : null;

    return (
      <div className="min-h-screen bg-brand-bg p-6 max-w-5xl mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                activeComp?.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                activeComp?.status === 'marking' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                'bg-brand-text/10 text-brand-text border-brand-text/20'
              }`}>
                {activeComp?.status === 'active' ? '● Live Project' : activeComp?.status === 'marking' ? '⏳ Teacher Marking...' : '🏆 Session Concluded'}
              </span>
              <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/5 px-2.5 py-1 rounded-lg">
                ✨ {activeComp?.subject}
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase leading-none">{activeComp?.title}</h2>
            <p className="text-xs font-bold text-brand-muted">
              Teacher: <span className="text-brand-text">{activeComp?.teacher_name || 'Academic Leader'}</span> • School: <span className="text-brand-text">{activeComp?.school_name || 'Academic Core'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="px-6 py-4 bg-brand-bg hover:bg-brand-border/40 border border-brand-border text-brand-text font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
            >
              Exit Project
            </button>
          </div>
        </div>

        {/* Live Grading Pulse Banner */}
        {activeComp?.status === 'marking' && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 animate-pulse">
                <Clock size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-tight text-amber-500 text-sm">🎒 Live Teacher Review is Active</h4>
                <p className="text-xs font-bold text-brand-muted">Your teacher is graded-marking short answer responses. Group Standings update automatically!</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-600 bg-amber-500/10 px-4 py-2 border border-amber-500/20 rounded-full animate-bounce">
              Live Scores Active 🚀
            </span>
          </div>
        )}

        {/* Finished / Revision Banner */}
        {activeComp?.status === 'finished' && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 flex flex-col items-center text-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
              <Trophy size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tight text-emerald-500 text-xl">🎉 Revision and Review Session Open</h4>
              <p className="text-xs font-bold text-brand-muted max-w-lg">The competition is finished! Compare results across teams, see individual accomplishments, and study correct answers below.</p>
            </div>
            {winningGroup && (
              <div className="mt-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Star className="fill-amber-500" size={12} /> Winner: Group {winningGroup.name} with {winningGroup.totalScore} Pts! <Star className="fill-amber-500" size={12} />
              </div>
            )}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-brand-surface border border-brand-border p-1.5 rounded-2xl max-w-md mx-auto">
          <button 
            type="button"
            onClick={() => setResultsTab('leaderboard')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
              resultsTab === 'leaderboard' 
                ? 'bg-brand-text text-white shadow-lg' 
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            <Trophy size={14} /> Group Standings
          </button>
          <button 
            type="button"
            onClick={() => setResultsTab('revision')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
              resultsTab === 'revision' 
                ? 'bg-brand-text text-white shadow-lg' 
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            <BookOpen size={14} /> Question Revision
          </button>
        </div>

        {/* Contents */}
        <AnimatePresence mode="wait">
          {resultsTab === 'leaderboard' ? (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Team Leaderboard Pod */}
              <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2.5">
                    <Users className="text-brand-accent" /> Live Team Leaderboard
                  </h3>
                  <span className="text-[10px] font-black text-brand-muted bg-brand-bg px-3 py-1 border border-brand-border rounded-lg uppercase">
                    {rankedGroups.length} Active Teams
                  </span>
                </div>

                <div className="space-y-4">
                  {rankedGroups.map((group, idx) => {
                    const isMyTeam = userGroup === group.name;

                    return (
                      <div 
                        key={group.name} 
                        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-[2rem] border transition-all ${
                          isMyTeam 
                            ? 'bg-brand-accent/5 border-brand-accent ring-2 ring-brand-accent/10' 
                            : idx === 0 
                              ? 'bg-amber-500/5 border-amber-500/20' 
                              : 'bg-brand-bg border-brand-border'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                            idx === 0 
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                              : isMyTeam 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20'
                                : 'bg-brand-surface text-brand-muted border border-brand-border'
                          }`}>
                            {idx === 0 ? '👑' : idx + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-black tracking-tight">{group.name}</h4>
                              {isMyTeam && (
                                <span className="bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                  Your Team
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-brand-muted tracking-wide mt-1">
                              {group.membersCount} Collaborative Teammates • {group.avgScore} Avg Pts per Player
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-8 pl-16 md:pl-0">
                          <div className="text-right">
                            <p className="text-[8px] font-black tracking-widest text-brand-muted uppercase">Finished Rate</p>
                            <p className="text-xs font-black text-brand-text mt-1">{group.finishedCount}/{group.membersCount} Players</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black tracking-widest text-brand-muted uppercase">Group Total</p>
                            <p className={`text-3xl font-black tabular-nums leading-none ${isMyTeam ? 'text-brand-accent' : idx === 0 ? 'text-amber-500' : 'text-brand-text'}`}>
                              {group.totalScore}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {rankedGroups.length === 0 && (
                    <div className="py-20 text-center text-brand-muted border border-dashed border-brand-border rounded-[2rem] bg-brand-bg">
                      <Users size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-xs font-black uppercase tracking-widest">Waiting for team distributions or active entries...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Roster list */}
              <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                <h3 className="text-lg font-black uppercase tracking-tight">👤 Individual Standings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedPlayers.map((player, idx) => {
                    const isMe = player.student_id === currentUser?.id;
                    const accuracy = player.total_questions > 0 ? Math.round((player.score / (player.total_questions * 10)) * 100) : 0;

                    return (
                      <div 
                        key={player.student_id} 
                        className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                          isMe 
                            ? 'bg-brand-text text-white border-brand-text shadow-lg' 
                            : 'bg-brand-bg border-brand-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                            isMe 
                              ? 'bg-white text-brand-text' 
                              : idx === 0 
                                ? 'bg-amber-500 text-white shadow-sm' 
                                : 'bg-brand-surface text-brand-muted border border-brand-border'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-black text-sm">{player.student_name}{isMe && " (You)"}</p>
                            <p className={`text-[9px] font-bold ${isMe ? 'text-white/75' : 'text-brand-muted'}`}>
                              {player.group_name || 'No Group'} • Accuracy: {accuracy}%
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black tabular-nums leading-none">{player.score || 0}</p>
                          <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isMe ? 'text-white/60' : 'text-brand-muted'}`}>Pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="revision"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2.5">
                    <BookOpen className="text-brand-accent" /> Question Review & Revision
                  </h3>
                  <span className="text-[10px] font-black text-brand-muted bg-brand-bg px-3 py-1 border border-brand-border rounded-lg uppercase">
                    My Score: {myPartInfo?.score || 0} Pts
                  </span>
                </div>

                <div className="space-y-4">
                  {questions.map((question, idx) => {
                    const studentResp = myResponses.find(r => r.question_id === question.id);
                    const studentAns = studentResp?.answer_text || answers[question.id] || "No response provided";

                    // For MCQ, map selected option code (e.g. 'A') to corresponding string in options array
                    const isMCQ = question.type === 'mcq';
                    
                    let resolvedStudentAns = studentAns;
                    if (isMCQ && question.options) {
                      const optLetters = ['A', 'B', 'C', 'D'];
                      const chosenIdx = optLetters.indexOf(studentAns.trim().toUpperCase());
                      if (chosenIdx !== -1 && question.options[chosenIdx]) {
                        resolvedStudentAns = `${studentAns.toUpperCase()}: ${question.options[chosenIdx]}`;
                      }
                    }

                    let resolvedCorrectAns = question.correct_answer;
                    if (isMCQ && question.options) {
                      const optLetters = ['A', 'B', 'C', 'D'];
                      const correctIdx = optLetters.indexOf(question.correct_answer.trim().toUpperCase());
                      if (correctIdx !== -1 && question.options[correctIdx]) {
                        resolvedCorrectAns = `${question.correct_answer.toUpperCase()}: ${question.options[correctIdx]}`;
                      }
                    }

                    const isCorrect = studentResp?.is_correct; // Use database graded column

                    return (
                      <div key={question.id} className="bg-brand-bg border border-brand-border rounded-3xl p-6 space-y-4">
                        {/* Upper row: question index and points */}
                        <div className="flex items-center justify-between border-b border-brand-border/40 pb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                            Question {idx + 1} ({question.type === 'mcq' ? 'MCQ' : 'Short Answer'})
                          </span>
                          
                          {isCorrect === true ? (
                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                              ✅ Correct (+{question.points} Pts)
                            </span>
                          ) : isCorrect === false ? (
                            <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                              ❌ Incorrect (+0 Pts)
                            </span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                              ⏳ Pending Mark
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <p className="font-bold text-brand-text leading-snug text-sm">{question.question_text}</p>

                        {/* Double comparison row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-1">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-brand-accent">Student's Response:</span>
                            <span className={`text-xs font-black ${isCorrect === false ? 'text-red-500' : isCorrect === true ? 'text-emerald-600' : 'text-brand-text'}`}>
                              {resolvedStudentAns}
                            </span>
                          </div>
                          
                          <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-1">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-brand-muted">Expected / Correct Answer:</span>
                            <span className="text-xs font-black text-brand-text">
                              {resolvedCorrectAns}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (activeComp && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;
    const safeProgress = isNaN(progress) ? 0 : progress;

    return (
      <div className="min-h-screen bg-brand-bg flex flex-col md:grid md:grid-cols-4 md:gap-8 p-6">
        {/* Left 3 columns: Questions and Progress */}
        <div className="md:col-span-3 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Upper Info Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              <span>Question {currentIdx + 1} of {questions.length}</span>
              <span className="flex items-center gap-1 bg-brand-surface border border-brand-border px-3 py-1 rounded-full text-brand-accent tracking-widest font-black">
                ✨ {activeComp.subject}
              </span>
              <span>{Math.round(safeProgress)}% Complete</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 bg-brand-surface border border-brand-border rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-brand-accent"
                initial={{ width: 0 }}
                animate={{ width: `${safeProgress}%` }}
              />
            </div>

            {/* Quick-Jump Question Map Badges */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-3 space-y-2">
              <span className="block text-[8px] font-black uppercase tracking-widest text-brand-muted">📋 Project Map (Jump to any question):</span>
              <div className="flex flex-wrap gap-2">
                {questions.map((question, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = answers[question.id] !== undefined && answers[question.id] !== '';
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-9 h-9 rounded-xl font-black text-xs transition-all flex items-center justify-center border ${
                        isCurrent 
                          ? 'bg-brand-accent text-white border-brand-accent shadow-lg shadow-brand-accent/20 scale-105' 
                          : isAnswered
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:border-emerald-500'
                            : 'bg-brand-bg text-brand-muted border-brand-border hover:border-brand-accent/30 hover:text-brand-accent'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question Text & Options Container */}
          <div className="flex-1 space-y-8 pt-4">
            <h3 className="text-2xl font-black tracking-tight leading-tight text-brand-text">
              {q.question_text}
            </h3>

            <div className="space-y-3">
              {q.type === 'mcq' && q.options ? (
                q.options.filter(o => o).map((opt, i) => {
                  const optionChar = String.fromCharCode(65 + i);
                  const isSelected = answers[q.id] === optionChar;
                  return (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => submitAnswer(optionChar)}
                      className={`w-full p-5 border-2 rounded-2xl text-left font-bold transition-all flex items-center gap-4 ${
                        isSelected 
                          ? 'bg-brand-accent/5 border-brand-accent shadow-md text-brand-accent scale-[1.01]' 
                          : 'bg-brand-surface border-brand-border hover:border-brand-accent/50 text-brand-text'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs uppercase border transition-colors ${
                        isSelected 
                          ? 'bg-brand-accent text-white border-brand-accent' 
                          : 'bg-brand-bg border-brand-border text-brand-muted'
                      }`}>
                        {optionChar}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {isSelected && <span className="text-brand-accent font-black text-xs mr-1">Selected ✓</span>}
                    </button>
                  );
                })
              ) : (
                <div className="space-y-4">
                  <textarea 
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Type your response here..."
                    className="w-full bg-brand-surface border-2 border-brand-border rounded-2xl p-6 font-semibold text-sm h-44 outline-none focus:border-brand-accent transition-colors"
                  />
                  <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider px-2">
                    ✍️ Your thoughts are safely saved automatically. Use the navigation buttons below to turn in or adjust.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls Row */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-brand-border/40">
            <button
              type="button"
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border transition-all ${
                currentIdx === 0 
                  ? 'opacity-40 cursor-not-allowed bg-brand-bg text-brand-muted border-brand-border' 
                  : 'bg-brand-surface hover:bg-brand-border/30 text-brand-text border-brand-border active:scale-95'
              }`}
            >
              <ChevronLeft size={14} />
              Back
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-6 py-3.5 bg-brand-text hover:bg-brand-text/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFinalSubmit(answers)}
                disabled={isSubmitting}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Submitting Project...
                  </>
                ) : (
                  <>
                    Submit Final Project 🚀
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right 1 column: Gamified Team Hub */}
        <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-brand-border pt-6 md:pt-0 md:pl-6 space-y-4 flex flex-col justify-start">
          <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border/40">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Swords size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-brand-text">Squad Room</h4>
                <p className="text-[8px] font-black uppercase tracking-widest text-brand-muted">Active Standings</p>
              </div>
            </div>

            {isEditingSquad ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-brand-muted">Select Existing Squad:</span>
                  <select
                    value={selectedSquadPreset}
                    onChange={e => {
                      setSelectedSquadPreset(e.target.value);
                      setCustomSquadInput('');
                    }}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-2.5 text-xs font-bold text-brand-text focus:border-brand-accent outline-none"
                  >
                    <option value="">-- Choose Existing Squad --</option>
                    {Array.from(new Set([
                      ...allParticipants.map(p => p.group_name).filter(Boolean),
                      'Group A', 'Group B', 'Group C', 'Group D'
                    ])).map((gName) => (
                      <option key={gName} value={gName}>{gName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-brand-muted">Or Create Custom Squad:</span>
                  <input
                    type="text"
                    value={customSquadInput}
                    onChange={e => {
                      setCustomSquadInput(e.target.value);
                      setSelectedSquadPreset('');
                    }}
                    placeholder="Enter Custom Squad Name"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-2.5 text-xs text-brand-text focus:border-brand-accent outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSquad(false);
                      setCustomSquadInput('');
                      setSelectedSquadPreset('');
                    }}
                    className="py-2 px-3 border border-brand-border rounded-xl text-[9px] font-black text-brand-muted uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const finalName = customSquadInput.trim() || selectedSquadPreset;
                      if (!finalName) {
                        showToast('Select or type a squad name', 'error');
                        return;
                      }
                      handleJoinSquad(finalName);
                    }}
                    className="py-2 px-3 bg-brand-accent text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm"
                  >
                    Join Squad
                  </button>
                </div>

                {userGroup && (
                  <button
                    type="button"
                    onClick={() => handleJoinSquad(null)}
                    className="w-full py-2 border border-red-500/30 text-red-500 hover:bg-red-500/5 rounded-xl text-[9px] font-black uppercase tracking-wider"
                  >
                    Switch to Solo Mode
                  </button>
                )}
              </div>
            ) : (
              <>
                {userGroup ? (
                  <div className="space-y-4">
                    <div className="bg-brand-bg border border-brand-border rounded-2xl p-3 text-center space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-brand-muted">Your Assigned Team</p>
                      <h5 className="text-xs font-black text-brand-accent tracking-tight truncate" title={userGroup}>
                        {userGroup}
                      </h5>
                      <p className="text-[9px] font-bold text-brand-text/80">
                        Squad Total: <span className="font-black text-brand-accent">{teammates.reduce((sum, tm) => sum + (tm.score || 0), 0)} pts</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-brand-muted">📜 Team Slogan / Quest:</p>
                      <p className="text-[10px] font-medium leading-relaxed italic bg-brand-bg p-3 border border-brand-border rounded-xl">
                        "{activeGoal}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-brand-muted">👥 Team Roster Scoreboard:</p>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {teammates.map((tm) => {
                          const isMe = tm.student_id === currentUser?.id;
                          return (
                            <div 
                              key={tm.student_id} 
                              className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-[10px] font-bold ${
                                isMe ? 'bg-brand-accent/5 border-brand-accent text-brand-accent' : 'bg-brand-bg border-brand-border text-brand-text'
                              }`}
                            >
                              <span className="truncate max-w-[90px]">{tm.student_name} {isMe && '(You)'}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-[10px]">{tm.score || 0} pts</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${tm.is_finished ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-2 text-brand-muted">
                    <AlertCircle size={24} className="mx-auto opacity-40 text-brand-muted" />
                    <h5 className="text-[10px] font-black uppercase tracking-wider">Solo Mode</h5>
                    <p className="text-[9px] font-semibold leading-relaxed">
                      You are working independently on this project. Click the button below to join or create a team!
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditingSquad(true)}
                  className="w-full mt-2 py-2.5 bg-brand-accent/10 border border-brand-accent/20 hover:bg-brand-accent/20 text-brand-accent rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  {userGroup ? "Change / Leave Squad" : "Choose / Join a Squad"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted">
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight">My Work</h2>
          <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider mt-1">View your assigned tasks and projects</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={16} />
            <input 
              type="text"
              value={searchTeacher}
              onChange={e => setSearchTeacher(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold focus:border-brand-accent outline-none transition-all text-brand-text"
              placeholder="Search Teacher Name"
            />
            <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest border border-brand-border/30 rounded">Teacher</span>
          </div>

          <div className="relative group">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent transition-colors" size={16} />
            <input 
              type="text"
              value={searchSchool}
              onChange={e => setSearchSchool(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold focus:border-brand-accent outline-none transition-all text-brand-text"
              placeholder="Search School Name"
            />
            <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest border border-brand-border/30 rounded">School</span>
          </div>

          <div className="relative group">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted/40 group-focus-within:text-brand-accent pointer-events-none" size={16} />
            <select
              value={searchGrade}
              onChange={e => setSearchGrade(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold focus:border-brand-accent outline-none text-brand-text appearance-none transition-all"
            >
              {Array.from(new Set([initialGrade, 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'])).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <span className="absolute left-10 -top-2 px-2 bg-brand-surface text-[8px] font-black uppercase text-brand-muted tracking-widest border border-brand-border/30 rounded">Grade</span>
          </div>
        </div>

        <button 
          onClick={fetchCompetitions}
          disabled={loading}
          className="w-full bg-brand-text text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
          Find My Work
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-accent" size={32} /></div>
        ) : !hasSearched ? (
          <div className="py-20 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] space-y-4">
            <Search size={48} className="mx-auto text-brand-muted/20" />
            <p className="text-brand-muted font-bold text-xs uppercase tracking-wider">Search for your teacher's work</p>
          </div>
        ) : competitions.length === 0 ? (
          <div className="py-20 text-center bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] space-y-4">
            <Sparkles size={48} className="mx-auto text-brand-muted/20" />
            <p className="text-brand-muted font-bold text-xs uppercase tracking-wider">No active work found</p>
          </div>
        ) : (
          competitions.map(comp => (
            <motion.div 
              key={comp.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartComp(comp)}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 space-y-4 hover:border-brand-accent transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${
                    comp.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    comp.status === 'marking' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-brand-bg text-brand-muted border-brand-border'
                  }`}>
                    {comp.status === 'active' ? 'JOIN NOW' : comp.status === 'marking' ? 'MARKING' : 'FINISHED'}
                  </span>
                  <span className="text-[9px] font-black text-brand-muted uppercase tracking-wider">{comp.subject}</span>
                </div>
                <div className="px-2 py-1 bg-brand-bg rounded-lg border border-brand-border text-[7px] font-black uppercase text-brand-muted">
                  {comp.grade}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight uppercase group-hover:text-brand-accent transition-colors leading-tight">{comp.title}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-bold text-brand-text truncate">👨‍🏫 {comp.teacher_name || 'Your Teacher'}</p>
                  <p className="text-[9px] font-bold text-brand-muted truncate">🏫 {comp.school_name || 'Academic Core'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                <div className="flex items-center gap-1.5 text-brand-muted">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums">
                    {comp.status === 'finished' ? 'Session Over' : 'Live Group Project'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-brand-accent font-black text-[10px] uppercase tracking-wider">
                  {comp.status === 'active' ? (
                    <>Start Working <ChevronRight size={12} /></>
                  ) : (
                    <>View Score <Trophy size={12} /></>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <StudentIdentityModal
        isOpen={showIdentity}
        onClose={() => setShowIdentity(false)}
        grade={searchGrade}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (pendingComp) {
            startCompetition(pendingComp);
            setPendingComp(null);
          }
        }}
      />
    </div>
  );
};

