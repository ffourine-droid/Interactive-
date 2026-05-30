import React, { useState } from "react";

// ─── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_RESULTS = {
  subject: "Mathematics",
  grade: "Grade 7",
  totalQuestions: 10,
  timeTaken: "58s",
  questions: [
    { id: 1, question: "Solve: 2x + 3 = 11", correct: false, yourAnswer: "x = 3", rightAnswer: "x = 4" },
    { id: 2, question: "What is 15% of 200?", correct: true,  yourAnswer: "30",    rightAnswer: "30" },
    { id: 3, question: "Simplify: 4(x + 2) - 3x", correct: false, yourAnswer: "x + 2", rightAnswer: "x + 8" },
    { id: 4, question: "Find the area of a triangle: base=6, height=4", correct: true, yourAnswer: "12", rightAnswer: "12" },
    { id: 5, question: "What is √144?", correct: false, yourAnswer: "11", rightAnswer: "12" },
    { id: 6, question: "Express 0.75 as a fraction", correct: true, yourAnswer: "3/4", rightAnswer: "3/4" },
    { id: 7, question: "Solve: 3y - 7 = 14", correct: false, yourAnswer: "y = 6", rightAnswer: "y = 7" },
    { id: 8, question: "What is the LCM of 4 and 6?", correct: true, yourAnswer: "12", rightAnswer: "12" },
    { id: 9, question: "Convert 2.5 km to meters", correct: false, yourAnswer: "250m", rightAnswer: "2500m" },
    { id: 10, question: "What is 3² + 4²?", correct: true, yourAnswer: "25", rightAnswer: "25" },
  ]
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ScoreRingProps {
  correct: number;
  total: number;
}

function ScoreRing({ correct, total }: ScoreRingProps) {
  const pct = Math.round((correct / total) * 100);
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ position: "relative", width: 110, height: 110 }}>
      <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="55" cy="55" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Space Mono', monospace" }}>{pct}%</span>
        <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{correct}/{total}</span>
      </div>
    </div>
  );
}

interface QuestionCardProps {
  key?: any;
  q: {
    id: number;
    question: string;
    correct: boolean;
    yourAnswer: string;
    rightAnswer: string;
  };
  index: number;
}

function QuestionCard({ q, index }: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background: q.correct ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.07)",
        border: `1px solid ${q.correct ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.25)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: q.correct ? "#22c55e" : "#ef4444",
          minWidth: 22, fontFamily: "monospace",
          paddingTop: 1,
        }}>
          {q.correct ? "✓" : "✗"}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#e2e8f0", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
            {q.question}
          </p>
          {expanded && !q.correct && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#f87171", fontFamily: "monospace" }}>
                You: {q.yourAnswer}
              </span>
              <span style={{ fontSize: 12, color: "#4ade80", fontFamily: "monospace" }}>
                ✓ Answer: {q.rightAnswer}
              </span>
            </div>
          )}
        </div>
        {!q.correct && (
          <span style={{ fontSize: 10, color: "#64748b", paddingTop: 2 }}>
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </div>
    </div>
  );
}

export interface RevengeDeckQuestion {
  id: any;
  question: string;
  correct: boolean;
  yourAnswer: string;
  rightAnswer: string;
}

export interface RevengeDeckResults {
  subject: string;
  grade: string | number;
  totalQuestions: number;
  timeTaken: string;
  questions: RevengeDeckQuestion[];
}

interface RevengeDeckProps {
  customResults?: RevengeDeckResults;
  onBackToSpeedRound?: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RevengeDeck({ customResults, onBackToSpeedRound }: RevengeDeckProps = {}) {
  const finalResults = customResults || MOCK_RESULTS;
  const { subject, grade, totalQuestions, timeTaken, questions } = finalResults;
  const [screen, setScreen] = useState<"results" | "revenge">("results");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revengeAnswers, setRevengeAnswers] = useState<Record<any, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);

  // Allow resetting
  const handleResetRound = () => {
    if (onBackToSpeedRound) {
      onBackToSpeedRound();
      return;
    }
    setScreen("results");
    setCurrentIdx(0);
    setShowAnswer(false);
    setRevengeAnswers({});
  };

  const wrongQuestions = questions.filter(q => !q.correct);
  const correctCount = questions.filter(q => q.correct).length;

  // ── Revenge Deck Screen ───────────────────────────────────────────────────
  if (screen === "revenge") {
    const current = wrongQuestions[currentIdx];
    const isLast = currentIdx === wrongQuestions.length - 1;
    const allDone = currentIdx >= wrongQuestions.length;

    if (allDone) {
      return (
        <div style={styles.root}>
          <div style={styles.card}>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎯</div>
              <h2 style={{ ...styles.heading, fontSize: 22, marginBottom: 8 }}>Revenge Complete!</h2>
              <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32, fontFamily: "'DM Sans', sans-serif" }}>
                You reviewed all {wrongQuestions.length} missed questions.
              </p>
              <button 
                onClick={handleResetRound}
                style={styles.btnPrimary}
              >
                ← Back to Results
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.root}>
        <div style={styles.card}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>
                ⚔ REVENGE DECK
              </div>
              <div style={{ fontSize: 12, color: "#475569", fontFamily: "monospace", marginTop: 2 }}>
                {currentIdx + 1} / {wrongQuestions.length}
              </div>
            </div>
            <button onClick={() => setScreen("results")} style={styles.btnGhost}>✕ Exit</button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: "#1e293b", borderRadius: 99, marginBottom: 28, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #f87171, #fb923c)",
              width: `${((currentIdx) / wrongQuestions.length) * 100}%`,
              transition: "width 0.4s ease"
            }} />
          </div>

          {/* Question */}
          <div style={{
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 12, padding: "20px 18px", marginBottom: 20
          }}>
            <p style={{ margin: 0, fontSize: 16, color: "#f1f5f9", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
              {current.question}
            </p>
          </div>

          {/* Your wrong answer reminder */}
          <div style={{ background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "#f87171", fontFamily: "monospace" }}>
              Last time you said: <strong>{current.yourAnswer}</strong>
            </span>
          </div>

          {/* Reveal / Answer */}
          {!showAnswer ? (
            <button 
              onClick={() => setShowAnswer(true)} 
              style={{ ...styles.btnPrimary, background: "linear-gradient(135deg,#ef4444,#f97316)", width: "100%" }}
            >
              Show Answer
            </button>
          ) : (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 10, padding: "14px 16px", marginBottom: 16
              }}>
                <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, letterSpacing: 1, fontFamily: "monospace", marginBottom: 4 }}>
                  CORRECT ANSWER
                </div>
                <div style={{ fontSize: 18, color: "#4ade80", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>
                  {current.rightAnswer}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setRevengeAnswers(p => ({ ...p, [current.id]: "got_it" })); setShowAnswer(false); setCurrentIdx(i => i + 1); }}
                  style={{ ...styles.btnSuccess, flex: 1 }}>
                  ✓ Got it!
                </button>
                <button
                  onClick={() => { setRevengeAnswers(p => ({ ...p, [current.id]: "still_confused" })); setShowAnswer(false); setCurrentIdx(i => i + 1); }}
                  style={{ ...styles.btnGhost, flex: 1 }}>
                  Still confused
                </button>
              </div>
            </div>
          )}
        </div>
        <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    );
  }

  // ── Results Screen ────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <div style={styles.card}>

        {/* Top badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>
              ⚡ SPEED ROUND
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", fontFamily: "monospace" }}>{grade} · {subject}</div>
          </div>
          <div style={{
            background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#a78bfa", fontFamily: "monospace"
          }}>
            ⏱ {timeTaken}
          </div>
        </div>

        {/* Score */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "18px 0", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
          <ScoreRing correct={correctCount} total={totalQuestions} />
          <div>
            <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>You scored</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9", fontFamily: "'Space Mono', monospace", lineHeight: 1.1 }}>
              {correctCount}<span style={{ fontSize: 16, color: "#475569" }}>/{totalQuestions}</span>
            </div>
            <div style={{ fontSize: 12, color: "#f87171", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
              {wrongQuestions.length} questions missed
            </div>
          </div>
        </div>

        {/* CTA — Revenge Deck */}
        {wrongQuestions.length > 0 && (
          <div style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.1))",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "16px", marginBottom: 20
          }}>
            <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, letterSpacing: 2, fontFamily: "monospace", marginBottom: 6 }}>
              ⚔ REVENGE DECK
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#cbd5e1", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              Replay only the <strong style={{ color: "#fca5a5" }}>{wrongQuestions.length} questions</strong> you missed — fix your mistakes while they're fresh.
            </p>
            <button onClick={() => { setScreen("revenge"); setCurrentIdx(0); setShowAnswer(false); }} style={styles.btnDanger}>
              ⚔ Start Revenge Deck →
            </button>
          </div>
        )}

        {/* Question breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: 2, fontFamily: "monospace", marginBottom: 10 }}>
            QUESTION BREAKDOWN
          </div>
          {questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleResetRound} style={{ ...styles.btnGhost, flex: 1, fontSize: 12 }}>🔄 New Round</button>
          <button onClick={handleResetRound} style={{ ...styles.btnGhost, flex: 1, fontSize: 12 }}>📖 Study Notes</button>
        </div>

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
type StyleKeys = "root" | "card" | "heading" | "btnPrimary" | "btnDanger" | "btnSuccess" | "btnGhost";
const styles: Record<StyleKeys, React.CSSProperties> = {
  root: {
    minHeight: "100%",
    background: "#0a0f1a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px 48px",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: "22px 20px",
  },
  heading: {
    margin: 0,
    color: "#f1f5f9",
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700,
  },
  btnPrimary: {
    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.3,
  },
  btnDanger: {
    background: "linear-gradient(135deg,#ef4444,#f97316)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 18px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.3,
    width: "100%",
  },
  btnSuccess: {
    background: "rgba(34,197,94,0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34,197,94,0.3)",
    borderRadius: 10,
    padding: "11px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  btnGhost: {
    background: "rgba(255,255,255,0.04)",
    color: "#94a3b8",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "11px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
};
