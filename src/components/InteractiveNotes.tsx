import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause, AlertCircle, Sparkles, CheckCircle, Award, BookOpen, Clock, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── AZILEARN BRAND ────────────────────────────────────────────────────────────
export const AZL = {
  orange: "#F97316",
  orangeDark: "#EA580C",
  orangeLight: "#FED7AA",
  navy: "#1E3A5F",
  navyDark: "#0F2240",
  navyLight: "#2D5282",
  white: "#FFFFFF",
  offWhite: "#F8F9FA",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray400: "#94A3B8",
  gray600: "#475569",
  gray800: "#1E293B",
  green: "#22C55E",
  greenLight: "#DCFCE7",
  red: "#EF4444",
  redLight: "#FEE2E2",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
};

// ─── XP PER BLOCK TYPE ────────────────────────────────────────────────────────
const XP_MAP = { quiz: 10, fill_blank: 10, flashcard: 5, example: 5, definition: 3, note: 1, keypoint: 2, accordion: 2 };

// ─── HANDCRAFTED CURRICULUM NOTES ─────────────────────────────────────────────
const STRUCTURED_CURRICULUM_NOTES: Record<string, any> = {
  "math-grade7-fractions": {
    id: "math-grade7-fractions",
    grade: 7,
    subject: "Mathematics",
    chapter: "Numbers",
    topic: "Fractions",
    sections: [
      {
        id: "sec-1",
        type: "keypoint",
        style: "info",
        content: "A fraction represents part of a whole — it has two parts separated by a line.",
      },
      {
        id: "sec-2",
        type: "definition",
        term: "Numerator",
        meaning: "The TOP number in a fraction — it tells you how many parts you have.",
      },
      {
        id: "sec-3",
        type: "definition",
        term: "Denominator",
        meaning: "The BOTTOM number — it tells you the total number of equal parts.",
      },
      {
        id: "sec-4",
        type: "note",
        content: "There are 3 types of fractions: Proper (3/4), Improper (7/4), and Mixed Numbers (1¾).",
      },
      {
        id: "sec-5",
        type: "example",
        question: "Simplify 6/8",
        hint: "Find the GCD (Greatest Common Divisor) of 6 and 8",
        answer: "3/4 — divide both numerator and denominator by 2 (the GCD)",
      },
      {
        id: "sec-6",
        type: "keypoint",
        style: "warning",
        content: "Always simplify your final answer to its lowest terms!",
      },
      {
        id: "sec-7",
        type: "flashcard",
        front: "What is a proper fraction?",
        back: "A fraction where the numerator is SMALLER than the denominator e.g. 3/4, 1/2, 5/8",
      },
      {
        id: "sec-8",
        type: "flashcard",
        front: "What is an improper fraction?",
        back: "A fraction where the numerator is LARGER than the denominator e.g. 7/4, 9/5",
      },
      {
        id: "sec-9",
        type: "quiz",
        question: "What is 1/2 + 1/4?",
        options: ["1/2", "3/4", "2/6", "1/6"],
        correct: 1,
        explanation: "Find a common denominator first. 1/2 = 2/4, so 2/4 + 1/4 = 3/4",
      },
      {
        id: "sec-10",
        type: "accordion",
        heading: "How to add fractions with different denominators",
        content:
          "Step 1: Find the LCM of the denominators.\nStep 2: Convert each fraction to the equivalent with the LCM as denominator.\nStep 3: Add the numerators.\nStep 4: Simplify if possible.",
      },
      {
        id: "sec-11",
        type: "fill_blank",
        sentence: "In the fraction 5/9, the ___ is 5 and the ___ is 9.",
        blanks: ["numerator", "denominator"],
      },
      {
        id: "sec-12",
        type: "quiz",
        question: "Which of the following is an improper fraction?",
        options: ["3/4", "1/8", "7/4", "2/9"],
        correct: 2,
        explanation: "7/4 is improper because the numerator (7) is greater than the denominator (4).",
      },
      {
        id: "sec-13",
        type: "keypoint",
        style: "success",
        content: "🎉 You've completed the Fractions topic! Keep going — you're doing great.",
      },
    ]
  },
  "fb-math-1": {
    id: "fb-math-1",
    grade: 7,
    subject: "Mathematics",
    chapter: "Arithmetic",
    topic: "BODMAS Order of Operations",
    sections: [
      {
        id: "bm-1",
        type: "keypoint",
        style: "info",
        content: "BODMAS is a fundamental math convention that tells you exactly which calculation to perform first in an equation.",
      },
      {
        id: "bm-2",
        type: "definition",
        term: "BODMAS Acronym",
        meaning: "Brackets ( ), Orders (x²), Division (÷), Multiplication (×), Addition (+), Subtraction (-).",
      },
      {
        id: "bm-3",
        type: "note",
        content: "Division and multiplication have EQUAL priority. You solve them in the order they appear from left to right. The same applies to addition and subtraction.",
      },
      {
        id: "bm-4",
        type: "example",
        question: "Solve: 12 - 3 × 2 + 8 ÷ 4",
        hint: "BODMAS: First Division (8÷4=2), then Multiplication (3×2=6), then Addition & Subtraction left-to-right.",
        answer: "8 (12 - 6 + 2 = 6 + 2 = 8)"
      },
      {
        id: "bm-5",
        type: "flashcard",
        front: "What do 'Orders' represent in BODMAS?",
        back: "Powers, Exponents, and Roots (e.g. 3² = 9, or √16 = 4)."
      },
      {
        id: "bm-6",
        type: "quiz",
        question: "What is the correct result of 6 + 2 × (3 + 1)?",
        options: ["32", "14", "18", "24"],
        correct: 1,
        explanation: "Solve Brackets first: (3 + 1) = 4. Then Multiplication: 2 × 4 = 8. Finally Addition: 6 + 8 = 14."
      },
      {
        id: "bm-7",
        type: "fill_blank",
        sentence: "In the expression 4 × 5 + (3 - 1), you calculate the ___ first, then the ___ and finally the addition.",
        blanks: ["brackets", "multiplication"]
      },
      {
        id: "bm-8",
        type: "keypoint",
        style: "success",
        content: "🚀 Excellent work! You have mastered the BODMAS rule of priority! Keep practicing."
      }
    ]
  },
  "fb-chem-1": {
    id: "fb-chem-1",
    grade: 8,
    subject: "Chemistry",
    chapter: "Matter",
    topic: "Structure of Atoms",
    sections: [
      {
        id: "ch-1",
        type: "keypoint",
        style: "info",
        content: "An atom is the smallest unit of ordinary matter that forms a chemical element."
      },
      {
        id: "ch-2",
        type: "definition",
        term: "The Nucleus",
        meaning: "The extremely dense region at the center of an atom, consisting of protons and neutrons."
      },
      {
        id: "ch-3",
        type: "definition",
        term: "Electrons",
        meaning: "Negatively charged subatomic particles that revolve outside the nucleus in defined energy shells."
      },
      {
        id: "ch-4",
        type: "example",
        question: "How do you find the number of neutrons in an atom?",
        hint: "Subtract the atomic number from the mass number",
        answer: "Neutrons = Mass Number - Atomic Number (e.g. for carbon with mass 12 and protons 6, 12 - 6 = 6 neutrons)"
      },
      {
        id: "ch-5",
        type: "flashcard",
        front: "What is the electric charge of a neutron?",
        back: "Neutral (zero charge). Protons are positive (+1) and electrons are negative (-1)."
      },
      {
        id: "ch-6",
        type: "quiz",
        question: "Which of the following subatomic particles determines the atomic number of an element?",
        options: ["Electron", "Proton", "Neutron", "Positron"],
        correct: 1,
        explanation: "The number of protons in the nucleus uniquely determines the atomic identity and is the atomic number."
      },
      {
        id: "ch-7",
        type: "fill_blank",
        sentence: "Protons carry a ___ charge and orbit outside the nucleus is not true: ___ orbit instead.",
        blanks: ["positive", "electrons"]
      }
    ]
  },
  "fb-phy-1": {
    id: "fb-phy-1",
    grade: 9,
    subject: "Physics",
    chapter: "Mechanics",
    topic: "Force and Newton's Laws",
    sections: [
      {
        id: "ph-1",
        type: "keypoint",
        style: "info",
        content: "Force is any interaction that, when unopposed, will change the motion of an object."
      },
      {
        id: "ph-2",
        type: "definition",
        term: "Inertia",
        meaning: "The tendency of an object to resist any change in its state of rest or uniform motion."
      },
      {
        id: "ph-3",
        type: "definition",
        term: "Friction",
        meaning: "A force that opposes the relative motion of two surfaces in contact sliding past each other."
      },
      {
        id: "ph-4",
        type: "example",
        question: "If mass is 10 kg and acceleration is 5 m/s², what is the net force?",
        hint: "Use Newton's Second Law: F = m × a",
        answer: "50 Newtons (N) — F = 10kg × 5 m/s² = 50N"
      },
      {
        id: "ph-5",
        type: "flashcard",
        front: "What does Newton's Third Law of Motion state?",
        back: "For every action, there is an equal and opposite reaction."
      },
      {
        id: "ph-6",
        type: "quiz",
        question: "If an object is moving at constant velocity, what is the net force acting on it?",
        options: ["Maximized Force", "It depends on mass", "Zero Force", "Friction only"],
        correct: 2,
        explanation: "By Newton's First Law, an object at constant velocity has zero net acceleration, meaning net Force is zero."
      },
      {
        id: "ph-7",
        type: "fill_blank",
        sentence: "Newton's First Law is also called the Law of ___, which is the resistance to change ___.",
        blanks: ["inertia", "motion"]
      }
    ]
  },
  "fb-bio-1": {
    id: "fb-bio-1",
    grade: 7,
    subject: "Biology",
    chapter: "Human Body",
    topic: "The Digestive System",
    sections: [
      {
        id: "bi-1",
        type: "keypoint",
        style: "info",
        content: "Our digestive tract converts physical food elements into small biochemical building blocks absorbed by cells."
      },
      {
        id: "bi-2",
        type: "definition",
        term: "Salivary Amylase",
        meaning: "The enzyme inside saliva that initiates carb chemical breakdown inside the mouth/chewing stage."
      },
      {
        id: "bi-3",
        type: "definition",
        term: "Absorption",
        meaning: "The process of moving nutrients across the small intestine walls into the bloodstream."
      },
      {
        id: "bi-4",
        type: "example",
        question: "What is the primary function of the stomach in digestion?",
        hint: "Uses highly acidic environment and pepsin enzymes",
        answer: "To break down complex proteins and churn food into a semi-liquid paste (Chyme)."
      },
      {
        id: "bi-5",
        type: "flashcard",
        front: "Where does chemical digestion of nutrients begin?",
        back: "In the mouth, thanks to saliva containing salivary amylase."
      },
      {
        id: "bi-6",
        type: "quiz",
        question: "Which organ is primarily responsible for the absorption of water from undigested fiber?",
        options: ["Stomach", "Liver", "Small Intestine", "Large Intestine"],
        correct: 3,
        explanation: "The large intestine processes remainders, absorbing water and mineral salts, leaving solid waste."
      },
      {
        id: "bi-7",
        type: "fill_blank",
        sentence: "Food moves down the ___ to the stomach, where ___ targets proteins.",
        blanks: ["esophagus", "pepsin"]
      }
    ]
  },
  "fb-soc-1": {
    id: "fb-soc-1",
    grade: 7,
    subject: "Social Studies",
    chapter: "Geography",
    topic: "Latitude & Longitude Map Navigation",
    sections: [
      {
        id: "so-1",
        type: "keypoint",
        style: "info",
        content: "Geographers use an intersection grid of imaginary vertical and horizontal lines to navigate exactly on Earth."
      },
      {
        id: "so-2",
        type: "definition",
        term: "Equator",
        meaning: "The horizontal line of 0° latitude dividing the polar hemispheres."
      },
      {
        id: "so-3",
        type: "definition",
        term: "Prime Meridian",
        meaning: "The vertical meridian of 0° longitude passing through Greenwich, England."
      },
      {
        id: "so-4",
        type: "example",
        question: "How do you specify a point coordinate prefix?",
        hint: "Specify latitude degree first, then longitude degree",
        answer: "Using (Latitude°, Longitude°), such as (30°N, 45°W)."
      },
      {
        id: "so-5",
        type: "flashcard",
        front: "Do lines of latitude run East-West or North-South?",
        back: "East-West (parallels), but they measure distances North and South of the Equator."
      },
      {
        id: "so-6",
        type: "quiz",
        question: "Which reference line is used as the basis for the world's standard Time Zones?",
        options: ["Equator", "Prime Meridian", "Tropic of Cancer", "International Date Line"],
        correct: 1,
        explanation: "The Prime Meridian is the baseline (0°) for Universal Coordinated Time (UTC / GMT)."
      },
      {
        id: "so-7",
        type: "fill_blank",
        sentence: "Lines of ___ run horizontally around the Earth, while lines of ___ run vertically between poles.",
        blanks: ["latitude", "longitude"]
      }
    ]
  }
};

// ─── BLOCK RENDERING UTILS ───────────────────────────────────────────────────

export function NoteCard({ block }: { block: any }) {
  return (
    <div className="bg-white border border-brand-border/40 rounded-xl p-4 shadow-sm text-brand-text leading-relaxed text-[15px]">
      {block.content}
    </div>
  );
}

export function KeypointCard({ block }: { block: any }) {
  const styles: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    info: { bg: AZL.blueLight, border: AZL.blue, icon: "💡", text: "#1e3a8a" },
    warning: { bg: AZL.amberLight, border: AZL.amber, icon: "⚠️", text: "#78350f" },
    success: { bg: AZL.greenLight, border: AZL.green, icon: "✅", text: "#065f46" },
  };
  const s = styles[block.style] || styles.info;
  return (
    <div 
      className="rounded-xl p-4 flex gap-3 items-start border-l-4 shadow-sm"
      style={{ background: s.bg, borderLeftColor: s.border }}
    >
      <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
      <p className="margin-0 font-medium text-[14px]" style={{ color: s.text }}>
        {block.content}
      </p>
    </div>
  );
}

export function DefinitionCard({ block, onComplete }: { block: any; onComplete?: () => void }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-white border border-brand-border/40 rounded-xl overflow-hidden shadow-sm">
      <div 
        className="px-4 py-3 flex justify-between items-center text-white"
        style={{ background: AZL.navy }}
      >
        <span className="font-bold text-[14px] uppercase tracking-wide">{block.term}</span>
        <span className="px-2 py-0.5 text-[9px] font-black rounded" style={{ background: AZL.orange }}>DEFINITION</span>
      </div>
      <div className="p-4 bg-brand-surface/40 min-h-[64px] flex items-center justify-center">
        {revealed ? (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="margin-0 text-brand-text font-medium text-center text-sm md:text-[15px] leading-relaxed"
          >
            {block.meaning}
          </motion.p>
        ) : (
          <button
            onClick={() => { setRevealed(true); onComplete?.(); }}
            className="w-full text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg border-b-2 shadow-sm transition-all hover:brightness-105 active:scale-98"
            style={{ background: AZL.orange, borderBottomColor: AZL.orangeDark }}
          >
            🔍 Tap to reveal meaning
          </button>
        )}
      </div>
    </div>
  );
}

export function ExampleCard({ block, onComplete }: { block: any; onComplete?: () => void }) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="bg-white border-2 rounded-xl overflow-hidden shadow-sm" style={{ borderColor: AZL.orange }}>
      <div className="px-4 py-2.5 flex justify-between" style={{ background: AZL.orangeLight }}>
        <span className="font-black text-[11px] uppercase tracking-wider" style={{ color: AZL.orangeDark }}>📝 WORKED EXAMPLE</span>
      </div>
      <div className="p-4">
        <p className="font-bold text-brand-text text-[15px] mb-3 leading-snug">
          {block.question}
        </p>
        {block.hint && !showAnswer && (
          <button
            onClick={() => setShowHint(true)}
            className="mb-3 text-[11px] font-black tracking-wide flex items-center gap-1 uppercase transition-opacity hover:opacity-80"
            style={{ color: AZL.amber, display: showHint ? "none" : "flex" }}
          >
            💡 Need a hint?
          </button>
        )}
        {showHint && !showAnswer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg p-3 mb-3 text-xs font-semibold leading-relaxed"
            style={{ background: AZL.amberLight, color: "#92400e" }}
          >
            {block.hint}
          </motion.div>
        )}
        {!showAnswer ? (
          <button
            onClick={() => { setShowAnswer(true); onComplete?.(); }}
            className="w-full text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg border-b-2 shadow-sm transition-all hover:brightness-105 active:scale-98"
            style={{ background: AZL.navy, borderBottomColor: AZL.navyDark }}
          >
            Show Step-by-Step Solution
          </button>
        ) : (
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-lg p-3.5 text-sm font-semibold border"
            style={{ background: AZL.greenLight, borderColor: AZL.green, color: "#065f46" }}
          >
            ✅ {block.answer}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function FlashCard({ block, onComplete }: { block: any; onComplete?: () => void }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      onClick={() => { if (!flipped) { setFlipped(true); onComplete?.(); } }}
      className="cursor-pointer h-36 relative select-none"
      style={{ perspective: 1000 }}
    >
      <div 
        className="w-full h-full duration-500 rounded-xl shadow-md cursor-pointer transition-transform duration-500 origin-center"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div 
          className="absolute inset-0 rounded-xl flex flex-col justify-center items-center p-4 gap-2 text-center"
          style={{
            backfaceVisibility: "hidden",
            background: `linear-gradient(135deg, ${AZL.navy}, ${AZL.navyLight})`,
          }}
        >
          <span className="text-[9px] font-black tracking-widest" style={{ color: AZL.orangeLight }}>FLASHCARD • TAP TO REVEAL</span>
          <p className="text-white font-bold text-sm md:text-[15px] leading-relaxed max-w-md">
            {block.front}
          </p>
        </div>
        {/* Back */}
        <div 
          className="absolute inset-0 rounded-xl flex flex-col justify-center items-center p-4 gap-2 text-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${AZL.orange}, ${AZL.orangeDark})`,
          }}
        >
          <span className="text-[9.5px] font-black tracking-widest text-white/70">ANSWER REVEALED</span>
          <p className="text-white font-bold text-sm md:text-[15px] leading-relaxed max-w-md">
            {block.back}
          </p>
        </div>
      </div>
    </div>
  );
}

export function QuizBlock({ block, onComplete, onMistake }: { block: any; onComplete?: (e: any) => void; onMistake?: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const handleSelect = (i: number) => {
    if (locked) return;
    setSelected(i);
    setLocked(true);
    const correct = i === block.correct;
    onComplete?.({ correct, selected: i, answer: block.correct });
    if (!correct) onMistake?.();
  };

  return (
    <div className="bg-white border border-brand-border/40 rounded-xl overflow-hidden shadow-sm">
      <div 
        className="px-4 py-2.5 flex justify-between items-center text-white"
        style={{ background: AZL.navyDark }}
      >
        <span className="font-extrabold text-[11px] tracking-widest">❓ QUIZ CHALLENGE</span>
        <span className="text-[10px] font-black tracking-wide" style={{ color: AZL.orangeLight }}>+10 XP</span>
      </div>
      <div className="p-4">
        <p className="font-bold text-brand-text text-[15px] mb-4 leading-snug">
          {block.question}
        </p>
        <div className="flex flex-col gap-2.5">
          {block.options.map((opt: string, i: number) => {
            let bg = AZL.gray100;
            let border = AZL.gray200;
            let color = AZL.gray800;
            if (locked) {
              if (i === block.correct) { bg = AZL.greenLight; border = AZL.green; color = "#166534"; }
              else if (i === selected && i !== block.correct) { bg = AZL.redLight; border = AZL.red; color = "#991b1b"; }
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                disabled={locked}
                className="group flex items-center gap-3 w-full text-left p-3 rounded-xl border-2 transition-all font-medium text-[14px]"
                style={{
                  background: bg,
                  borderColor: border,
                  color,
                  cursor: locked ? "default" : "pointer"
                }}
              >
                <span 
                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-black transition-all"
                  style={{
                    background: locked && i === block.correct ? AZL.green : locked && i === selected ? AZL.red : AZL.gray200,
                    color: locked ? AZL.white : AZL.gray600,
                  }}
                >
                  {["A", "B", "C", "D"][i]}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
        {locked && block.explanation && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg p-3 text-xs font-medium leading-relaxed"
            style={{ background: AZL.blueLight, color: AZL.navyDark }}
          >
            💡 <strong>Explanation:</strong> {block.explanation}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function AccordionBlock({ block, onComplete }: { block: any; onComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-brand-border/40 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => { setOpen(o => !o); if (!open) onComplete?.(); }}
        className="w-full bg-none border-none p-4 flex justify-between items-center cursor-pointer text-left"
      >
        <span className="font-bold text-brand-text text-[14px] leading-tight flex-1 pr-4">{block.heading}</span>
        <span 
          className="text-lg font-black transition-transform duration-200"
          style={{
            color: AZL.orange,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="p-4 bg-brand-surface/25 border-t border-brand-border/10"
        >
          {block.content.split("\n").map((line: string, i: number) => (
            <p key={i} className="m-0 mb-2 last:mb-0 text-sm text-brand-muted leading-relaxed">
              {line}
            </p>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function FillBlankBlock({ block, onComplete, onMistake }: { block: any; onComplete?: (e: any) => void; onMistake?: () => void }) {
  const [inputs, setInputs] = useState<string[]>(() => block.blanks.map(() => ""));
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const check = () => {
    const r = block.blanks.map((ans: string, i: number) => inputs[i].trim().toLowerCase() === ans.toLowerCase());
    setResults(r);
    setChecked(true);
    const allCorrect = r.every(Boolean);
    onComplete?.({ correct: allCorrect, given: inputs, answer: block.blanks });
    if (!allCorrect) onMistake?.();
  };

  const parts = block.sentence.split("___");
  let blankIdx = 0;

  return (
    <div className="bg-white border border-brand-border/40 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 flex justify-between items-center text-white" style={{ background: AZL.navyLight }}>
        <span className="font-black text-[11px] tracking-widest">✏️ FILL IN THE BLANKS</span>
        <span className="text-[10px] font-black tracking-wide" style={{ color: AZL.orangeLight }}>+10 XP</span>
      </div>
      <div className="p-4">
        <div className="text-[15px] text-brand-text leading-loose flex flex-wrap items-center gap-1 font-medium select-none mb-4">
          {parts.map((part: string, pi: number) => {
            const idx = blankIdx++;
            return (
              <span key={pi} className="flex flex-wrap items-center gap-1.5">
                <span>{part}</span>
                {pi < parts.length - 1 && (
                  <input
                    type="text"
                    value={inputs[idx] || ""}
                    onChange={e => {
                      const v = [...inputs];
                      v[idx] = e.target.value;
                      setInputs(v);
                    }}
                    disabled={checked}
                    placeholder="fill blank..."
                    className="border-b-2 rounded px-2 py-0.5 text-center font-bold text-brand-text text-sm outline-none transition-all focus:border-brand-accent focus:bg-brand-accent/5"
                    style={{
                      borderBottomColor: checked ? (results[idx] ? AZL.green : AZL.red) : AZL.orange,
                      background: checked ? (results[idx] ? AZL.greenLight : AZL.redLight) : AZL.offWhite,
                      width: 130,
                    }}
                  />
                )}
              </span>
            );
          })}
        </div>
        {!checked ? (
          <button
            onClick={check}
            disabled={inputs.some(v => !v.trim())}
            style={{
              background: inputs.some(v => !v.trim()) ? AZL.gray200 : AZL.orange,
              color: inputs.some(v => !v.trim()) ? AZL.gray400 : AZL.white,
            }}
            className="w-full font-bold text-xs uppercase px-4 py-2.5 rounded-lg border-b-2 border-orange-700 shadow-sm transition-all hover:brightness-105 active:scale-98 disabled:cursor-not-allowed"
          >
            Check My Answers
          </button>
        ) : (
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-lg p-3 text-sm font-semibold border"
            style={{
              background: results.every(Boolean) ? AZL.greenLight : AZL.redLight,
              borderColor: results.every(Boolean) ? AZL.green : AZL.red,
              color: results.every(Boolean) ? "#166534" : "#991b1b",
            }}
          >
            {results.every(Boolean) ? "✅ Absolutely perfect! Exceptional job." : `❌ Correct answers: ${block.blanks.join(", ")}`}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── DYNAMIC TOPIC COMPILER ───────────────────────────────────────────────────
// Converts standard lesson content (like html_content / slides) dynamically to interactive segments!
function compileInteractiveBlocksFromHtml(title: string, htmlStr: string): any[] {
  const blocks: any[] = [];
  try {
    // Basic parser for title headings and bullets
    const cleanStr = htmlStr.replace(/<\/?[^>]+(>|$)/g, "\n");
    const lines = cleanStr.split("\n").map(l => l.trim()).filter(Boolean);
    
    // Push introductory keypoint
    blocks.push({
      id: "comp-kp-intro",
      type: "keypoint",
      style: "info",
      content: `Let's dive into ${title}! This interactive notebook makes review fun. Read, check definition triggers, and take the quiz below.`
    });

    // Try finding definition-like chunks or lists
    const matchedDefinitions: Array<{term: string, details: string}> = [];
    lines.forEach((line) => {
      if (line.includes(" - ") || line.includes(" : ") || line.includes(": ")) {
        const parts = line.split(/[-:]/);
        if (parts.length >= 2 && parts[0].length < 30 && parts[1].length > 10) {
          matchedDefinitions.push({ term: parts[0].trim(), details: parts[1].trim() });
        }
      }
    });

    if (matchedDefinitions.length > 0) {
      matchedDefinitions.slice(0, 3).forEach((d, i) => {
        blocks.push({
          id: `comp-def-${i}`,
          type: "definition",
          term: d.term,
          meaning: d.details
        });
      });
    }

    // Add illustrative worked example
    blocks.push({
      id: "comp-ex-general",
      type: "example",
      question: `Let's apply knowledge: Why is deep conceptual mastery of ${title} vital for exams?`,
      hint: "It helps with both fast MCQs and long step-by-step questions.",
      answer: "True revision anchors concepts through active recall, making it easier to solve problems under pressure."
    });

    // General flashcards
    blocks.push({
      id: "comp-fc-1",
      type: "flashcard",
      front: `What is the core takeaway of studying the topic: "${title}"?`,
      back: "Understanding the definitions precisely, tracing worked examples, and practicing quizzes recursively until perfection."
    });

    // General quiz
    blocks.push({
      id: "comp-qz-1",
      type: "quiz",
      question: `Which of the following is the best active revision methodology for: ${title}?`,
      options: ["Reading the page casually", "Answering quizzes, definitions and flashcards", "Listening without practice", "None of the above"],
      correct: 1,
      explanation: "Active recall by doing challenges yields 150%+ higher retention!"
    });

    // Fill in the blanks
    blocks.push({
      id: "comp-fb-1",
      type: "fill_blank",
      sentence: `Active recall is highly ___ for learning, while passive reading is ___ effective.`,
      blanks: ["lucrative", "less"]
    });

    // Final positive keypoint
    blocks.push({
      id: "comp-kp-success",
      type: "keypoint",
      style: "success",
      content: `🎉 You processed all active learning segments of ${title}! Incredible effort.`
    });

    return blocks;
  } catch (err) {
    console.error("Failed to parse interactive blocks", err);
    return [
      {
        id: "err-kp",
        type: "keypoint",
        style: "warning",
        content: `Active recall mode is active for ${title}! Challenge yourself to earn maximum revision XP.`
      }
    ];
  }
}

// ─── MAIN INTERACTIVE NOTES PAGE VIEW ──────────────────────────────────────────
import AziLearnNotesRenderer from "./AziLearnNotesRenderer";

interface InteractiveNotesProps {
  material: {
    id: string | number;
    topic_id?: string;
    title: string;
    html_content?: string;
    subject?: string;
    grade?: string | number;
    slides?: string[];
    sections?: any[];
  };
  username?: string;
  onAwardXp?: (xp: number) => void;
}

export const InteractiveNotes: React.FC<InteractiveNotesProps> = ({ material, username, onAwardXp }) => {
  return <AziLearnNotesRenderer notes={material} username={username} onAwardXp={onAwardXp} />;
};
