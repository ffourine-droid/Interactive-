import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Sparkles, CheckCircle, Award, BookOpen, Clock, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── AZILEARN BRANDCOLORS ────────────────────────────────────────────────────────
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

const XP_MAP = {
  quiz: 10,
  fill_blank: 10,
  flashcard: 5,
  example: 5,
  definition: 3,
  note: 1,
  keypoint: 2,
  accordion: 2,
};

// Handcrafted structured data lookup if notes matches fallback IDs
const STRUCTURED_CURRICULUM_NOTES: Record<string, any> = {
  "math-grade7-fractions": {
    sections: [
      { id: "sec-1", type: "keypoint", style: "info", content: "A fraction represents part of a whole — it has two parts separated by a line." },
      { id: "sec-2", type: "definition", term: "Numerator", meaning: "The TOP number in a fraction — it tells you how many parts you have." },
      { id: "sec-3", type: "definition", term: "Denominator", meaning: "The BOTTOM number — it tells you the total number of equal parts." },
      { id: "sec-4", type: "note", content: "There are 3 types of fractions: Proper (3/4), Improper (7/4), and Mixed Numbers (1¾)." },
      { id: "sec-5", type: "example", question: "Simplify 6/8", hint: "Find the GCD (Greatest Common Divisor) of 6 and 8", answer: "3/4 — divide both numerator and denominator by 2 (the GCD)" },
      { id: "sec-6", type: "keypoint", style: "warning", content: "Always simplify your final answer to its lowest terms!" },
      { id: "sec-7", type: "flashcard", front: "What is a proper fraction?", back: "A fraction where the numerator is SMALLER than the denominator e.g. 3/4, 1/2, 5/8" },
      { id: "sec-8", type: "flashcard", front: "What is an improper fraction?", back: "A fraction where the numerator is LARGER than the denominator e.g. 7/4, 9/5" },
      { id: "sec-9", type: "quiz", question: "What is 1/2 + 1/4?", options: ["1/2", "3/4", "2/6", "1/6"], correct: 1, explanation: "Find a common denominator first. 1/2 = 2/4, so 2/4 + 1/4 = 3/4" },
      { id: "sec-10", type: "accordion", heading: "How to add fractions with different denominators", content: "Step 1: Find the LCM of the denominators.\nStep 2: Convert each fraction to the equivalent with the LCM as denominator.\nStep 3: Add the numerators.\nStep 4: Simplify if possible." },
      { id: "sec-11", type: "fill_blank", sentence: "In the fraction 5/9, the ___ is 5 and the ___ is 9.", blanks: ["numerator", "denominator"] },
      { id: "sec-12", type: "quiz", question: "Which of the following is an improper fraction?", options: ["3/4", "1/8", "7/4", "2/9"], correct: 2, explanation: "7/4 is improper because the numerator (7) is greater than the denominator (4)." },
      { id: "sec-13", type: "keypoint", style: "success", content: "🎉 You've completed the Fractions topic! Keep going — you're doing great." },
    ]
  },
  "fb-math-1": {
    sections: [
      { id: "bm-1", type: "keypoint", style: "info", content: "BODMAS is a fundamental math convention that tells you exactly which calculation to perform first in an equation." },
      { id: "bm-2", type: "definition", term: "BODMAS Acronym", meaning: "Brackets ( ), Orders (x²), Division (÷), Multiplication (×), Addition (+), Subtraction (-)." },
      { id: "bm-3", type: "note", content: "Division and multiplication have EQUAL priority. You solve them in the order they appear from left to right. The same applies to addition and subtraction." },
      { id: "bm-4", type: "example", question: "Solve: 12 - 3 × 2 + 8 ÷ 4", hint: "BODMAS: First Division (8÷4=2), then Multiplication (3×2=6), then Addition & Subtraction left-to-right.", answer: "8 (12 - 6 + 2 = 6 + 2 = 8)" },
      { id: "bm-5", type: "flashcard", front: "What do 'Orders' represent in BODMAS?", back: "Powers, Exponents, and Roots (e.g. 3² = 9, or √16 = 4)." },
      { id: "bm-6", type: "quiz", question: "What is the correct result of 6 + 2 × (3 + 1)?", options: ["32", "14", "18", "24"], correct: 1, explanation: "Solve Brackets first: (3 + 1) = 4. Then Multiplication: 2 × 4 = 8. Finally Addition: 6 + 8 = 14." },
      { id: "bm-7", type: "fill_blank", sentence: "In the expression 4 × 5 + (3 - 1), you calculate the ___ first, then the ___ and finally the addition.", blanks: ["brackets", "multiplication"] },
      { id: "bm-8", type: "keypoint", style: "success", content: "🚀 Excellent work! You have mastered the BODMAS rule of priority! Keep practicing." }
    ]
  },
  "fb-chem-1": {
    sections: [
      { id: "ch-1", type: "keypoint", style: "info", content: "An atom is the smallest unit of ordinary matter that forms a chemical element." },
      { id: "ch-2", type: "definition", term: "The Nucleus", meaning: "The extremely dense region at the center of an atom, consisting of protons and neutrons." },
      { id: "ch-3", type: "definition", term: "Electrons", meaning: "Negatively charged subatomic particles that revolve outside the nucleus in defined energy shells." },
      { id: "ch-4", type: "example", question: "How do you find the number of neutrons in an atom?", hint: "Subtract the atomic number from the mass number", answer: "Neutrons = Mass Number - Atomic Number (e.g. for carbon with mass 12 and protons 6, 12 - 6 = 6 neutrons)" },
      { id: "ch-5", type: "flashcard", front: "What is the electric charge of a neutron?", back: "Neutral (zero charge). Protons are positive (+1) and electrons are negative (-1)." },
      { id: "ch-6", type: "quiz", question: "Which of the following subatomic particles determines the atomic number of an element?", options: ["Electron", "Proton", "Neutron", "Positron"], correct: 1, explanation: "The number of protons in the nucleus uniquely determines the atomic identity and is the atomic number." },
      { id: "ch-7", type: "fill_blank", sentence: "Protons carry a ___ charge and orbit outside the nucleus is not true: ___ orbit instead.", blanks: ["positive", "electrons"] }
    ]
  },
  "fb-phy-1": {
    sections: [
      { id: "ph-1", type: "keypoint", style: "info", content: "Force is any interaction that, when unopposed, will change the motion of an object." },
      { id: "ph-2", type: "definition", term: "Inertia", meaning: "The tendency of an object to resist any change in its state of rest or uniform motion." },
      { id: "ph-3", type: "definition", term: "Friction", meaning: "A force that opposes the relative motion of two surfaces in contact sliding past each other." },
      { id: "ph-4", type: "example", question: "If mass is 10 kg and acceleration is 5 m/s², what is the net force?", hint: "Use Newton's Second Law: F = m × a", answer: "50 Newtons (N) — F = 10kg × 5 m/s² = 50N" },
      { id: "ph-5", type: "flashcard", front: "What does Newton's Third Law of Motion state?", back: "For every action, there is an equal and opposite reaction." },
      { id: "ph-6", type: "quiz", question: "If an object is moving at constant velocity, what is the net force acting on it?", options: ["Maximized Force", "It depends on mass", "Zero Force", "Friction only"], correct: 2, explanation: "By Newton's First Law, an object at constant velocity has zero net acceleration, meaning net Force is zero." },
      { id: "ph-7", type: "fill_blank", sentence: "Newton's First Law is also called the Law of ___, which is the resistance to change ___.", blanks: ["inertia", "motion"] }
    ]
  },
  "fb-bio-1": {
    sections: [
      { id: "bi-1", type: "keypoint", style: "info", content: "Our digestive tract converts physical food elements into small biochemical building blocks absorbed by cells." },
      { id: "bi-2", type: "definition", term: "Salivary Amylase", meaning: "The enzyme inside saliva that initiates carb chemical breakdown inside the mouth/chewing stage." },
      { id: "bi-3", type: "definition", term: "Absorption", meaning: "The process of moving nutrients across the small intestine walls into the bloodstream." },
      { id: "bi-4", type: "example", question: "What is the primary function of the stomach in digestion?", hint: "Uses highly acidic environment and pepsin enzymes", answer: "To break down complex proteins and churn food into a semi-liquid paste (Chyme)." },
      { id: "bi-5", type: "flashcard", front: "Where does chemical digestion of nutrients begin?", back: "In the mouth, thanks to saliva containing salivary amylase." },
      { id: "bi-6", type: "quiz", question: "Which organ is primarily responsible for the absorption of water from undigested fiber?", options: ["Stomach", "Liver", "Small Intestine", "Large Intestine"], correct: 3, explanation: "The large intestine processes remainders, absorbing water and mineral salts, leaving solid waste." },
      { id: "bi-7", type: "fill_blank", sentence: "Food moves down the ___ to the stomach, where ___ targets proteins.", blanks: ["esophagus", "pepsin"] }
    ]
  },
  "fb-soc-1": {
    sections: [
      { id: "so-1", type: "keypoint", style: "info", content: "Geographers use an intersection grid of imaginary vertical and horizontal lines to navigate exactly on Earth." },
      { id: "so-2", type: "definition", term: "Equator", meaning: "The horizontal line of 0° latitude dividing the polar hemispheres." },
      { id: "so-3", type: "definition", term: "Prime Meridian", meaning: "The vertical meridian of 0° longitude passing through Greenwich, England." },
      { id: "so-4", type: "example", question: "How do you specify a point coordinate prefix?", hint: "Specify latitude degree first, then longitude degree", answer: "Using (Latitude°, Longitude°), such as (30°N, 45°W)." },
      { id: "so-5", type: "flashcard", front: "Do lines of latitude run East-West or North-South?", back: "East-West (parallels), but they measure distances North and South of the Equator." },
      { id: "so-6", type: "quiz", question: "Which reference line is used as the basis for the world's standard Time Zones?", options: ["Equator", "Prime Meridian", "Tropic of Cancer", "International Date Line"], correct: 1, explanation: "The Prime Meridian is the baseline (0°) for Universal Coordinated Time (UTC / GMT)." },
      { id: "so-7", type: "fill_blank", sentence: "Lines of ___ run horizontally around the Earth, while lines of ___ run vertically between poles.", blanks: ["latitude", "longitude"] }
    ]
  },
  "math-grade9-logarithms": {
    sections: [
      { id: "log-1", type: "keypoint", style: "info", content: "A logarithm is the inverse operation of exponentiation. It answers: 'To what power must we raise base b to get number x?'" },
      { id: "log-2", type: "definition", term: "Logarithmic Base (b)", meaning: "The number that is multiplied from the starting position, e.g. in log₂8 = 3, the base b is 2." },
      { id: "log-3", type: "definition", term: "The Argument (x)", meaning: "The value we want to find the exponent of, e.g. in log₂8 = 3, the argument x is 8." },
      { id: "log-4", type: "note", content: "Key Rules: Product Rule: log(xy) = log(x) + log(y). Quotient Rule: log(x/y) = log(x) - log(y). Power Rule: log(x^p) = p * log(x)." },
      { id: "log-5", type: "example", question: "Calculate the exact value of log₃9 + log₂16", hint: "Determine both log expressions: log₃(3²) = 2 and log₂(2⁴) = 4", answer: "6 (since 2 + 4 = 6)" },
      { id: "log-6", type: "flashcard", front: "What is log₁₀(1000)?", back: "3, because 10³ = 1000." },
      { id: "log-7", type: "flashcard", front: "What is natural logarithm (ln)?", back: "A logarithm where the base is the constant 'e' ≈ 2.71828." },
      { id: "log-8", type: "quiz", question: "What is the correct value of log₅(125)?", options: ["2", "3", "4", "5"], correct: 1, explanation: "5 raised to the power of 3 is 125, therefore log₅(125) = 3." },
      { id: "log-9", type: "fill_blank", sentence: "The Power Rule of logarithms expresses that log_b(x^p) = ___ * log_b(___).", blanks: ["p", "x"] },
      { id: "log-10", type: "quiz", question: "Simplify log(x²) - log(x)", options: ["log(x)", "log(x² - x)", "2", "log(x³)"], correct: 0, explanation: "Using the Quotient Rule: log(x²) - log(x) = log(x²/x) = log(x)." },
      { id: "log-11", type: "keypoint", style: "success", content: "🎉 Masterful! You have unlocked all key elements of Grade 9 Logarithms!" }
    ]
  },
  "agri9-soil-fertility": {
    sections: [
      { id: "asf-1", type: "keypoint", style: "info", content: "Maintaining organic soil composition minimizes erosion risks and improves crop yields significantly." },
      { id: "asf-2", type: "definition", term: "Crop Rotation", meaning: "The practice of growing a series of dissimilar types of crops in the same area in sequential seasons." },
      { id: "asf-3", type: "definition", term: "Legumed Nitrogen Fixation", meaning: "A process where symbiotic bacteria (Rhizobium) in root nodules of legumes convert aerial nitrogen into soluble nitrates." },
      { id: "asf-4", type: "note", content: "A typical 4-year crop rotation sequence: Legumes (adds Nitrogen) ➔ Brassicas/Leafy (demands Nitrogen) ➔ Root Crops (deep feed) ➔ Solanaceous/Fruiting." },
      { id: "asf-5", type: "example", question: "Why should deep-rooted crops like cassava rotate with shallow-rooted crops like onions?", hint: "Think about soil structural levels and moisture accessibility", answer: "They tap nutrients from different soil depths, protecting the subsoil while allowing the upper soil level to recover." },
      { id: "asf-6", type: "flashcard", front: "What is the primary role of cover crops?", back: "To prevent soil erosion, suppress weeds, and build up organic matter during empty seasonal intervals." },
      { id: "asf-7", type: "quiz", question: "Which of the following plants would represent a nitrogen fixer in rotation?", options: ["Maize", "Irish Potato", "Beans/Cowpeas", "Spinach"], correct: 2, explanation: "Beans and cowpeas are legumes which biologically fix nitrogen under symbiotic bacteria pathways." },
      { id: "asf-8", type: "fill_blank", sentence: "A rotation of shallow and ___ crops prevents nutrient depletion, and rotating families disrupts pest ___.", blanks: ["deep-rooted", "cycles"] },
      { id: "asf-9", type: "keypoint", style: "success", content: "🎉 Excellent! You have completed the Soil Fertility modules!" }
    ]
  },
  "agri9-nutrition-diet": {
    sections: [
      { id: "and-1", type: "keypoint", style: "info", content: "A healthy human diet requires complete macro-molecules paired with vitamin immunity triggers." },
      { id: "and-2", type: "definition", term: "Balanced Diet", meaning: "A diet containing all essential food categories in correct mathematical proportions for the body to function." },
      { id: "and-3", type: "definition", term: "Malnutrition", meaning: "Physical condition caused by a lack of, or excess of, specific organic vitamins and minerals." },
      { id: "and-4", type: "example", question: "Explain why traditional combinations like 'Maize and Beans' supply complete proteins", hint: "Varying amino acid profiles block structural deficiency", answer: "Maize is deficient in lysine but high in methionine, while beans are high in lysine and low in methionine. Eaten together, they provide all 9 essential amino acids." },
      { id: "and-5", type: "flashcard", front: "What deficiency disease is caused by lack of Vitamin C?", back: "Scurvy, manifesting as bleeding gums and joint weakness." },
      { id: "and-6", type: "quiz", question: "Which carbohydrate is the main storage form of glucose in cereal plants?", options: ["Glycogen", "Starch", "Sucrose", "Cellulose"], correct: 1, explanation: "Starch is the primary compound plants use to store excess carbohydrates in grains and tubers." },
      { id: "and-7", type: "fill_blank", sentence: "Lack of proteins in children causes ___, while severe calorie energy deficiency causes ___.", blanks: ["kwashiorkor", "marasmus"] },
      { id: "and-8", type: "keypoint", style: "success", content: "🏆 Congratulations! You have unlocked all nutritious profile chapters!" }
    ]
  },
  "agri9-vertical-gardens": {
    sections: [
      { id: "avg-1", type: "keypoint", style: "info", content: "Vertical gardens maximize yield density per square meter while using up to 90% less water than traditional fields." },
      { id: "avg-2", type: "definition", term: "Micro-Gardening", meaning: "The intensive cultivation of small leafy crops, herbs, or tubers in restricted areas like urban backyards." },
      { id: "avg-3", type: "definition", term: "Sack Gardening", meaning: "Growing plants on the sides and top of an upright soil-filled tall synthetic sack or container." },
      { id: "avg-4", type: "example", question: "How does placing stones in the center of sack gardens support irrigation?", hint: "Think of fluid dynamics and filtering water down", answer: "It creates a central drainage and watering sleeve, allowing water to disperse evenly to lower tiers without turning soil into mud." },
      { id: "avg-5", type: "flashcard", front: "Which crops are best suited for multi-tier vertical racks?", options: [], correctKey: "", back: "Leafy vegetables with shallow roots, such as spinach, kale (sukuma wiki), coriander (dhania), and strawberries." },
      { id: "avg-6", type: "quiz", question: "What is a main ecological advantage of multi-tier vertical gardening?", options: ["We don't need seeds", "Drastically reduced water runoff and evaporation loss", "Excludes all kinds of insects automatically", "Replaces sunlight with gravity"], correct: 1, explanation: "Enclosed or grouped vertical systems restrict surface evaporation and target root zones precisely." },
      { id: "avg-7", type: "fill_blank", sentence: "In a sack garden, a central core filled with ___ acts as a filter column for ___.", blanks: ["gravel", "irrigation"] },
      { id: "avg-8", type: "keypoint", style: "success", content: "🏡 Brilliant! You are now fully trained in CBC Grade 9 Vertical Gardening techniques!" }
    ]
  },
  "art9-outdoor-sketching": {
    sections: [
      { id: "aos-1", type: "keypoint", style: "info", content: "Perspective lines allow our flat 2D sketch pads to simulate depth and realistic distances in outdoor landscapes." },
      { id: "aos-2", type: "definition", term: "Vanishing Point", meaning: "A specific coordinate on the horizon line where parallel receding lines converge and disappear entirely." },
      { id: "aos-3", type: "definition", term: "Horizon Line", meaning: "The theoretical line representing the painter's eye level where the sky meets the land." },
      { id: "aos-4", type: "example", question: "How does linear perspective change when high/low eye levels are selected?", hint: "High eye level reveals roofs, low eye level reveals undersides", answer: "A high horizon line positions the viewpoint from looking down on objects (revealing top surfaces), whereas a low horizon line views objects from underneath." },
      { id: "aos-5", type: "flashcard", front: "What is Cross-Hatching?", back: "A sophisticated shading technique using crossing parallel lines to block out value gradients and shadows." },
      { id: "aos-6", type: "quiz", question: "Which mechanical cue communicates that an object is further away in a sketch?", options: ["It is larger than foreground items", "It is positioned higher and drawn smaller with muted tones", "It must have darker outlines", "It uses more saturated solid fills"], correct: 1, explanation: "Atmospheric perspective and scale mean distant items appear smaller, lighter, and sit higher on the plane." },
      { id: "aos-7", type: "fill_blank", sentence: "In perspective drawing, parallel lines merge at the ___ point which sits on the ___ line.", blanks: ["vanishing", "horizon"] },
      { id: "aos-8", type: "keypoint", style: "success", content: "🎨 Masterful! You have unlocked the secrets of Outdoor Landscape Sketching!" }
    ]
  },
  "art9-music-notation": {
    sections: [
      { id: "amn-1", type: "keypoint", style: "info", content: "Syllabus music clefs allow singers and orchestral instrumentalists to instantly read a song's structural pitches." },
      { id: "amn-2", type: "definition", term: "Treble Clef", meaning: "Also known as the G Clef, it wraps around the second line of the standard staff to identify the pitch G4." },
      { id: "amn-3", type: "definition", term: "Ledger Lines", meaning: "Short horizontal lines drawn above or below the main staff to support notes that exceed standard ranges." },
      { id: "amn-4", type: "example", question: "What is the acronym used to read treble clef space notes?", hint: "Spell out the front part of your head", answer: "The spaces of the treble clef from bottom to top spell 'F-A-C-E'." },
      { id: "amn-5", type: "flashcard", front: "What does a Flat (b) accidental do to a note pitch?", back: "It lowers the pitch of a note by exactly one semitone." },
      { id: "amn-6", type: "quiz", question: "Which clef is normally used for high-pitched instruments and high vocal parts like soprano?", options: ["Bass Clef", "Alto Clef", "Treble Clef", "Tenor Clef"], correct: 2, explanation: "Treble Clef is the universal indicator for soprano vocals, flutes, violins, and upper piano registers." },
      { id: "amn-7", type: "fill_blank", sentence: "The treble clef identifies the second line of the staff as ___, and staff spacing notes spell ___.", blanks: ["G", "FACE"] },
      { id: "amn-8", type: "keypoint", style: "success", content: "🎼 Outstanding! You are highly proficient in Reading Standard Staff Music Notation!" }
    ]
  },
  "art9-athletics-training": {
    sections: [
      { id: "aat-1", type: "keypoint", style: "info", content: "Track athletics focuses on muscle efficiency, breathing cycles, and maximum stride coordination." },
      { id: "aat-2", type: "definition", term: "Aerobic System", meaning: "An oxygen-dependent biological process used to sustain long workouts by burning fats and sugars." },
      { id: "aat-3", type: "definition", term: "Anaerobic System", meaning: "The oxygen-free pathway creating quick energy bursts for brief sprint sets under 30 seconds." },
      { id: "aat-4", type: "example", question: "Explain why hydration is critical during 10-kilometer athletic events", hint: "Think of sweat volume and temperature management", answer: "Hydration keeps blood volume stable for the heart to pump oxygen, while providing fluids for sweating and core temperature regulation." },
      { id: "aat-5", type: "flashcard", front: "What is a major training rule to avoid shin splints?", back: "Gradually build up distance volume and run on softer natural pathways rather than hard concrete roads." },
      { id: "aat-6", type: "quiz", question: "Which relay baton handover style requires the receiving athlete to NOT look back during the transfer?", options: ["Visual handover", "Non-visual handover", "Slide pass exchange", "Static drop exchange"], correct: 1, explanation: "In speedy sprint relays (like the 4x100m), athletes utilize non-visual exchanges to ensure maximum velocity." },
      { id: "aat-7", type: "fill_blank", sentence: "Sprint events rely mostly on the ___ energy system, whereas marathon training requires highly developed ___ endurance.", blanks: ["anaerobic", "aerobic"] },
      { id: "aat-8", type: "keypoint", style: "success", content: "👟 Incredible! You have completed the Grade 9 Athletics and Physical Conditioning modules!" }
    ]
  }
};

// ─── HELPER CARDS ───
function NoteCard({ block }: { block: any }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-4 shadow-sm text-brand-text leading-relaxed text-[15px]">
      {block.content}
    </div>
  );
}

function RichHtmlCard({ title, htmlContent }: { title: string; htmlContent: string }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 md:p-8 shadow-sm text-brand-text mb-4 overflow-hidden">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-brand-border/40">
        <span className="text-xl">📖</span>
        <h3 className="font-extrabold text-xs text-brand-accent uppercase tracking-wider">{title}</h3>
      </div>
      <div 
        className="prose max-w-none text-brand-text select-text"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

function KeypointCard({ block }: { block: any }) {
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
      <p className="m-0 font-medium text-[14px]" style={{ color: s.text }}>
        {block.content}
      </p>
    </div>
  );
}

function DefinitionCard({ block, onComplete }: { block: any; onComplete?: () => void }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden shadow-sm">
      <div 
        className="px-4 py-3 flex justify-between items-center text-white"
        style={{ background: AZL.navy }}
      >
        <span className="font-bold text-[14px] uppercase tracking-wide">{block.term}</span>
        <span className="px-2 py-0.5 text-[9px] font-black rounded" style={{ background: AZL.orange }}>DEFINITION</span>
      </div>
      <div className="p-4 bg-brand-bg/35 min-h-[64px] flex items-center justify-center">
        {revealed ? (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-0 text-brand-text font-medium text-center text-sm md:text-[15px] leading-relaxed"
          >
            {block.meaning}
          </motion.p>
        ) : (
          <button
            onClick={() => { setRevealed(true); onComplete?.(); }}
            className="w-full text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg border-b-2 shadow-sm transition-all hover:brightness-105 active:scale-95"
            style={{ background: AZL.orange, borderBottomColor: AZL.orangeDark }}
          >
            🔍 Tap to reveal meaning
          </button>
        )}
      </div>
    </div>
  );
}

function ExampleCard({ block, onComplete }: { block: any; onComplete?: () => void }) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="bg-brand-surface border-2 rounded-xl overflow-hidden shadow-sm" style={{ borderColor: AZL.orange }}>
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
            className="w-full text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg border-b-2 shadow-sm transition-all hover:brightness-105 active:scale-95"
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

function FlashCard({ block, onComplete }: { block: any; onComplete?: () => void }) {
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

function QuizBlock({ block, onComplete, onMistake }: { block: any; onComplete?: (e: any) => void; onMistake?: () => void }) {
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
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden shadow-sm">
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

function AccordionBlock({ block, onComplete }: { block: any; onComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => { setOpen(o => !o); if (!open) onComplete?.(); }}
        className="w-full bg-none border-none p-4 flex justify-between items-center cursor-pointer text-left focus:outline-none"
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
          className="p-4 bg-brand-bg/20 border-t border-brand-border"
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

function FillBlankBlock({ block, onComplete, onMistake }: { block: any; onComplete?: (e: any) => void; onMistake?: () => void }) {
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
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden shadow-sm">
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
                    className="border-b-2 rounded px-2 py-0.5 text-center font-bold text-brand-text text-sm outline-none transition-all focus:border-orange-500 focus:bg-orange-500/5"
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
            className="w-full font-bold text-xs uppercase px-4 py-2.5 rounded-lg border-b-2 border-orange-700 shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:cursor-not-allowed"
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

// ─── DYNAMIC TOPIC COMPILER FROM TEXT / HTML ───
function compileInteractiveBlocksFromHtml(title: string, htmlStr: string): any[] {
  const blocks: any[] = [];
  try {
    const cleanStr = htmlStr.replace(/<\/?[^>]+(>|$)/g, "\n");
    const lines = cleanStr.split("\n").map(l => l.trim()).filter(Boolean);
    
    blocks.push({
      id: "comp-kp-intro",
      type: "keypoint",
      style: "info",
      content: `Let's dive into ${title}! This interactive notebook makes review fun. Read the core study notes first, then try the active recall exercises below.`
    });

    if (htmlStr && htmlStr.trim()) {
      blocks.push({
        id: "comp-html-core",
        type: "html_content",
        title: "Study Guide & Core Lecture Notes",
        html: htmlStr
      });
    }

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

    blocks.push({
      id: "comp-ex-general",
      type: "example",
      question: `Let's apply knowledge: Why is deep conceptual mastery of ${title} vital for exams?`,
      hint: "It helps with both fast MCQs and long step-by-step questions.",
      answer: "True revision anchors concepts through active recall, making it easier to solve problems under pressure."
    });

    blocks.push({
      id: "comp-fc-1",
      type: "flashcard",
      front: `What is the core takeaway of studying the topic: "${title}"?`,
      back: "Understanding the definitions precisely, tracing worked examples, and practicing quizzes recursively until perfection."
    });

    blocks.push({
      id: "comp-qz-1",
      type: "quiz",
      question: `Which of the following is the best active revision methodology for: ${title}?`,
      options: ["Reading the page casually", "Answering quizzes, definitions and flashcards", "Listening without practice", "None of the above"],
      correct: 1,
      explanation: "Active recall by doing challenges yields 150%+ higher retention!"
    });

    blocks.push({
      id: "comp-fb-1",
      type: "fill_blank",
      sentence: `Active recall is highly ___ for learning, while passive reading is ___ effective.`,
      blanks: ["lucrative", "less"]
    });

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

// ─── MAIN COMPONENT ───
export interface AziLearnNotesRendererProps {
  notes: {
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

export default function AziLearnNotesRenderer({ notes, username, onAwardXp }: AziLearnNotesRendererProps) {
  const [completedBlocks, setCompletedBlocks] = useState<Record<string, boolean>>({});
  const [xpEarned, setXpEarned] = useState(0);
  const [congratulated, setCongratulated] = useState(false);
  const [xpClaimed, setXpClaimed] = useState(false);
  const [savingXp, setSavingXp] = useState(false);

  // Dynamic Supabase table fetcher state
  const [dbNotes, setDbNotes] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    let active = true;
    const loadDynamicNotes = async () => {
      const topicId = String(notes?.id || notes?.topic_id || "");
      if (!topicId) return;
      
      if (notes?.sections && Array.isArray(notes.sections) && notes.sections.length > 0) {
        setDbNotes(notes);
        return;
      }
      
      setLoadingDb(true);
      try {
        const { data, error } = await supabase
          .from('notes_topics')
          .select('*')
          .eq('topic_id', topicId)
          .maybeSingle();
        
        if (active && data) {
          setDbNotes(data);
        }
      } catch (err) {
        console.error("Error checking notes_topics table:", err);
      } finally {
        if (active) setLoadingDb(false);
      }
    };

    loadDynamicNotes();
    return () => {
      active = false;
    };
  }, [notes?.id, notes?.topic_id, notes?.sections]);

  // Merge database values with fallback props
  const activeNotes: any = dbNotes ? {
    ...notes,
    title: dbNotes.topic || dbNotes.title || notes?.title,
    subject: dbNotes.subject || notes?.subject,
    grade: dbNotes.grade || notes?.grade,
    html_content: dbNotes.html_content || notes?.html_content,
    sections: dbNotes.sections || notes?.sections || dbNotes.content?.sections || dbNotes.content
  } : (notes || {});

  // Tab view selection: strictly interactive
  const [viewTab, setViewTab] = useState<'notes' | 'interactive'>('interactive');

  // Compile active review blocks
  const targetId = String(activeNotes.id || activeNotes.topic_id || "");
  const structuredData = STRUCTURED_CURRICULUM_NOTES[targetId] || (activeNotes.sections ? { sections: activeNotes.sections } : null);

  const blocks = React.useMemo(() => {
    let list: any[] = [];
    if (structuredData && Array.isArray(structuredData.sections) && structuredData.sections.length > 0) {
      list = [...structuredData.sections];
    } else {
      list = [...compileInteractiveBlocksFromHtml(activeNotes.title || "Study Topic", activeNotes.html_content || "")];
    }
    return list;
  }, [targetId, activeNotes.title, activeNotes.html_content, structuredData]);

  const interactiveBlocks = React.useMemo(() => {
    return blocks.filter((b: any) => ["definition", "example", "flashcard", "quiz", "fill_blank", "accordion"].includes(b.type));
  }, [blocks]);

  const progressCount = React.useMemo(() => {
    return Object.keys(completedBlocks).length;
  }, [completedBlocks]);

  const progressPercent = React.useMemo(() => {
    if (interactiveBlocks.length === 0) return 100;
    return Math.min(100, Math.round((progressCount / interactiveBlocks.length) * 100));
  }, [progressCount, interactiveBlocks.length]);

  const handleBlockCompletion = (blockId: string, type: string) => {
    if (completedBlocks[blockId]) return;
    setCompletedBlocks(prev => ({ ...prev, [blockId]: true }));
    const reward = (XP_MAP as any)[type] || 2;
    setXpEarned(prev => prev + reward);
  };

  useEffect(() => {
    if (interactiveBlocks.length > 0 && progressCount === interactiveBlocks.length && !congratulated) {
      setCongratulated(true);
    }
  }, [progressCount, interactiveBlocks.length, congratulated]);

  const handleClaimReward = async () => {
    if (xpEarned === 0 || xpClaimed) return;
    setSavingXp(true);
    try {
      if (onAwardXp) {
        onAwardXp(xpEarned);
      } else {
        // Save locally to logged student
        const studentProfile = JSON.parse(localStorage.getItem('azilearn_student_profile') || '{}');
        const arenaPlayer = JSON.parse(localStorage.getItem('azilearn_arena_player') || '{}');
        const finalUsername = username || studentProfile.username || arenaPlayer.username;

        if (studentProfile && studentProfile.id) {
          const currentXp = parseInt(studentProfile.xp || '0', 10) + xpEarned;
          localStorage.setItem('azilearn_student_profile', JSON.stringify({
            ...studentProfile,
            xp: currentXp
          }));
        }

        if (finalUsername) {
          const { data: stdRecord } = await supabase
            .from('arena_players')
            .select('*')
            .eq('username', finalUsername)
            .maybeSingle();

          if (stdRecord) {
            const updateObj: any = {};
            if ('total_score' in stdRecord) {
              updateObj.total_score = (stdRecord.total_score || 0) + xpEarned;
            }
            if (Object.keys(updateObj).length > 0) {
              await supabase
                .from('arena_players')
                .update(updateObj)
                .eq('id', stdRecord.id);
            }
          }
        }
      }
      setXpClaimed(true);
    } catch (err) {
      console.error("Failed to claim revision XP in renderer:", err);
    } finally {
      setSavingXp(false);
    }
  };

  // Guard against missing notes prop
  if (!notes) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-brand-bg text-brand-muted">
        <AlertCircle size={24} className="mb-2 text-brand-accent animate-bounce" />
        <p className="font-bold text-sm">No Material Selected</p>
      </div>
    );
  }

  if (loadingDb) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-brand-bg h-full w-full">
        <div className="w-8 h-8 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin mb-3" />
        <p className="text-brand-muted text-sm font-semibold animate-pulse">Retrieving interactive lecture material...</p>
      </div>
    );
  }

  // Handle iframe for external slide/html note links
  if (activeNotes.html_content?.startsWith("http")) {
    let frameUrl = activeNotes.html_content;
    
    // Sanitize Google Drive / Docs links to be fully frameable
    if (frameUrl.includes('drive.google.com') || frameUrl.includes('docs.google.com')) {
      frameUrl = frameUrl
        .replace(/\/view(\?.*)?$/, '/preview')
        .replace(/\/edit(\?.*)?$/, '/preview')
        .replace(/usp=sharing/, '');
    }

    return (
      <div className="absolute inset-0 flex flex-col bg-brand-bg font-sans">
        <div 
          className="shrink-0 py-2.5 px-4 border-b border-brand-border flex items-center justify-between text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${AZL.navyDark}, ${AZL.navy})` }}
        >
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-[#FF6B2C] font-black">
              Dynamic Document Hub 🌐
            </span>
            <span className="text-[11px] font-bold text-white/90 truncate max-w-[200px] sm:max-w-xs">{activeNotes.title}</span>
          </div>
          <a 
            href={activeNotes.html_content} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-[#FF6B2C] hover:bg-[#E05315] rounded-xl shadow-md transition-all active:scale-95"
          >
            Open in New Tab ↗
          </a>
        </div>
        <div className="flex-1 relative bg-white">
          <iframe
            src={frameUrl}
            className="absolute inset-0 w-full h-full border-none bg-white font-sans"
            title={activeNotes.title}
            sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col overflow-y-auto scroll-smooth">
      {/* Header Panel */}
      <div 
        className="shrink-0 p-5 border-b border-brand-border text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${AZL.navyDark}, ${AZL.navy})` }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider bg-[#FF6B2C]/20 text-[#FF6B2C] border border-[#FF6B2C]/20">
              Interactive Mode 🧠
            </span>
            <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">
              {activeNotes.subject || "Study Note"} • Grade {activeNotes.grade || "7"}
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold font-sans text-white tracking-tight">{activeNotes.title}</h2>
          {username && (
            <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-wider">Current User: {username}</p>
          )}
        </div>

        {/* Live Progress Radial Tracker */}
        <div className="relative z-10 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-4 min-w-[200px]">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-white/10" />
            <div 
              className="absolute inset-0 rounded-full border-4 transition-all duration-500" 
              style={{
                borderTopColor: AZL.orange,
                borderRightColor: progressPercent >= 50 ? AZL.orange : "transparent",
                borderBottomColor: progressPercent >= 75 ? AZL.orange : "transparent",
                borderLeftColor: progressPercent >= 100 ? AZL.orange : "transparent",
              }}
            />
            <span className="text-white font-extrabold text-xs">{progressPercent}%</span>
          </div>

          <div>
            <div className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-0.5">Session XP</div>
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-[#FF6B2C] animate-pulse" />
              <span className="text-[16px] font-black text-[#FF6B2C]">{xpEarned} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-brand-border h-1.5 shrink-0 overflow-hidden relative">
        <div 
          className="h-full bg-brand-accent transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Revision Blocks Stream */}
      <div className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 flex flex-col gap-5 pb-32">
          {blocks.map((block: any, idx: number) => {
            const isInteractive = ["definition", "example", "flashcard", "quiz", "fill_blank", "accordion"].includes(block.type);
            const isCompleted = completedBlocks[block.id];

            return (
              <motion.div
                key={block.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative"
              >
                {isInteractive && isCompleted && (
                  <div className="absolute -left-3 -top-3 z-10 bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
                    <CheckCircle size={15} />
                  </div>
                )}

                {block.type === "note" && <NoteCard block={block} />}
                {block.type === "html_content" && (
                  <RichHtmlCard 
                    title={block.title} 
                    htmlContent={block.html} 
                  />
                )}
                {block.type === "keypoint" && <KeypointCard block={block} />}
                {block.type === "accordion" && (
                  <AccordionBlock 
                    block={block} 
                    onComplete={() => handleBlockCompletion(block.id, "accordion")} 
                  />
                )}
                {block.type === "definition" && (
                  <DefinitionCard 
                    block={block} 
                    onComplete={() => handleBlockCompletion(block.id, "definition")} 
                  />
                )}
                {block.type === "example" && (
                  <ExampleCard 
                    block={block} 
                    onComplete={() => handleBlockCompletion(block.id, "example")} 
                  />
                )}
                {block.type === "flashcard" && (
                  <FlashCard 
                    block={block} 
                    onComplete={() => handleBlockCompletion(block.id, "flashcard")} 
                  />
                )}
                {block.type === "quiz" && (
                  <QuizBlock 
                    block={block} 
                    onComplete={() => handleBlockCompletion(block.id, "quiz")} 
                  />
                )}
                {block.type === "fill_blank" && (
                  <FillBlankBlock 
                    block={block} 
                    onComplete={() => handleBlockCompletion(block.id, "fill_blank")} 
                  />
                )}
              </motion.div>
            );
          })}

          <AnimatePresence>
            {congratulated && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="rounded-2xl border-2 p-5 text-center mt-4 bg-brand-surface border-orange-500/30 shadow-lg relative overflow-hidden flex flex-col items-center gap-3"
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 mb-1"
                  style={{ background: `linear-gradient(135deg, ${AZL.orange}, ${AZL.orangeDark})` }}
                >
                  <Award size={24} />
                </div>

                <h3 className="font-bold text-base md:text-lg text-brand-text">Active Study Session Complete!</h3>
                <p className="text-xs md:text-sm text-brand-muted max-w-sm m-0 leading-relaxed">
                  Splendid effort! You have carefully processed every key point, solution, definition, and quiz inside this revision packet.
                </p>

                <div className="font-black text-xs tracking-wider text-orange-500 flex items-center gap-2 mt-1 px-4 py-1.5 rounded-full bg-orange-500/5 max-w-max">
                  <Sparkles size={14} /> EARNED: +{xpEarned} AZILEARN XP
                </div>

                <button
                  type="button"
                  onClick={handleClaimReward}
                  disabled={xpClaimed || savingXp}
                  className="mt-2 text-white font-black text-xs uppercase px-6 py-3 rounded-xl border-b-4 transition-all shadow-md active:scale-95 disabled:brightness-90 disabled:cursor-not-allowed"
                  style={{
                    background: xpClaimed ? AZL.green : AZL.orange,
                    borderBottomColor: xpClaimed ? "#166534" : AZL.orangeDark,
                  }}
                >
                  {savingXp ? "Validating Progress..." : xpClaimed ? "🏆 XP Claimed Successfully!" : `Claim Session Revison XP`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
