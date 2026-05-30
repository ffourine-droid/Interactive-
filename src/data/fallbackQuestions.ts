export interface FallbackQuestion {
  id: string;
  grade: number;
  subject: string;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const fallbackQuestions: FallbackQuestion[] = [
  // --- Mathematics Grade 7 ---
  {
    id: "fq-math7-1",
    grade: 7,
    subject: "Mathematics",
    topic: "Pre-Algebra",
    question: "Solve the linear equation for x: 3x - 7 = 14",
    option_a: "x = 5",
    option_b: "x = 7",
    option_c: "x = 6",
    option_d: "x = 3",
    correct_answer: "B",
    explanation: "Add 7 to both sides: 3x = 21. Dividing by 3 gives x = 7.",
    difficulty: "easy"
  },
  {
    id: "fq-math7-2",
    grade: 7,
    subject: "Mathematics",
    topic: "Ratios & Percentages",
    question: "What is 15% of 200?",
    option_a: "20",
    option_b: "15",
    option_c: "30",
    option_d: "45",
    correct_answer: "C",
    explanation: "15% of 200 = 0.15 × 200 = 30.",
    difficulty: "easy"
  },
  {
    id: "fq-math7-3",
    grade: 7,
    subject: "Mathematics",
    topic: "Algebraic Expressions",
    question: "Simplify: 4(x + 2) - 3x",
    option_a: "x + 2",
    option_b: "x + 8",
    option_c: "7x + 8",
    option_d: "x - 8",
    correct_answer: "B",
    explanation: "Distribute the 4: 4x + 8 - 3x = x + 8.",
    difficulty: "medium"
  },
  {
    id: "fq-math7-4",
    grade: 7,
    subject: "Mathematics",
    topic: "Geometry",
    question: "Find the area of a triangle with a base of 6cm and height of 4cm.",
    option_a: "24 cm²",
    option_b: "10 cm²",
    option_c: "12 cm²",
    option_d: "48 cm²",
    correct_answer: "C",
    explanation: "Area = 0.5 × base × height = 0.5 × 6 × 4 = 12 cm².",
    difficulty: "easy"
  },
  // --- Mathematics Grade 8 ---
  {
    id: "fq-math8-1",
    grade: 8,
    subject: "Mathematics",
    topic: "Roots",
    question: "What is √144 + √25 equal to?",
    option_a: "13",
    option_b: "12",
    option_c: "17",
    option_d: "9",
    correct_answer: "C",
    explanation: "√144 = 12, and √25 = 5. So, 12 + 5 = 17.",
    difficulty: "easy"
  },
  {
    id: "fq-math8-2",
    grade: 8,
    subject: "Mathematics",
    topic: "Pythagorean Theorem",
    question: "A right triangle has legs of length 3cm and 4cm. What is the length of the hypotenuse?",
    option_a: "5 cm",
    option_b: "7 cm",
    option_c: "6 cm",
    option_d: "25 cm",
    correct_answer: "A",
    explanation: "3² + 4² = 9 + 16 = 25. √25 = 5 cm.",
    difficulty: "easy"
  },
  // --- Integrated Science Grade 7 ---
  {
    id: "fq-sci7-1",
    grade: 7,
    subject: "Integrated Science",
    topic: "Cell Biology",
    question: "Which cell organelle conducts photosynthesis?",
    option_a: "Mitochondria",
    option_b: "Nucleus",
    option_c: "Cell Wall",
    option_d: "Chloroplast",
    correct_answer: "D",
    explanation: "Chloroplasts contain chlorophyll and absorb solar energy to perform photosynthesis.",
    difficulty: "easy"
  },
  {
    id: "fq-sci7-2",
    grade: 7,
    subject: "Integrated Science",
    topic: "Matter States",
    question: "What is the process called when a liquid transforms into a gas at temperatures below its boiling point?",
    option_a: "Evaporation",
    option_b: "Condensation",
    option_c: "Sublimation",
    option_d: "Boiling",
    correct_answer: "A",
    explanation: "Evaporation occurs at the liquid surface at any temperature below boiling, while boiling occurs throughout.",
    difficulty: "medium"
  },
  {
    id: "fq-sci7-3",
    grade: 7,
    subject: "Integrated Science",
    topic: "Senses",
    question: "Which of the following describes the function of optic nerve receptors in humans?",
    option_a: "Carrying sound signals to the cerebrum",
    option_b: "Detecting smell chemicals",
    option_c: "Transmitting visual stimuli to the brain",
    option_d: "Regulating lens dilation",
    correct_answer: "C",
    explanation: "The optic nerve acts as the transmission line connecting light-sensitive retinal cells to visual brain lobes.",
    difficulty: "easy"
  },
  // --- Integrated Science Grade 8 ---
  {
    id: "fq-sci8-1",
    grade: 8,
    subject: "Integrated Science",
    topic: "Elements & Compounds",
    question: "What is the chemical formula for ordinary table salt?",
    option_a: "H2O",
    option_b: "NaCl",
    option_c: "CO2",
    option_d: "CaCO3",
    correct_answer: "B",
    explanation: "NaCl stands for Sodium Chloride, which is common table salt.",
    difficulty: "easy"
  },
  {
    id: "fq-sci8-2",
    grade: 8,
    subject: "Integrated Science",
    topic: "Physics: Energy",
    question: "What kind of stored energy does a tightly wound clock spring represent?",
    option_a: "Kinetic energy",
    option_b: "Thermal energy",
    option_c: "Chemical energy",
    option_d: "Potential energy",
    correct_answer: "D",
    explanation: "The spring holds elastic potential energy which is gradually converted into kinetic energy to turn the gears.",
    difficulty: "easy"
  },
  // --- Social Studies Grade 7 ---
  {
    id: "fq-soc7-1",
    grade: 7,
    subject: "Social Studies",
    topic: "Map Work",
    question: "What is the coordinate latitude value of the prime equatorial plane?",
    option_a: "90 degrees North",
    option_b: "0 degrees",
    option_c: "180 degrees",
    option_d: "45 degrees South",
    correct_answer: "B",
    explanation: "The Equator serves as the reference plane for estimating global latitudes, designated as 0° degrees.",
    difficulty: "easy"
  },
  {
    id: "fq-soc7-2",
    grade: 7,
    subject: "Social Studies",
    topic: "Geology",
    question: "Which layer of the Earth lies directly under the outer crust?",
    option_a: "Inner Core",
    option_b: "Mantle",
    option_c: "Tectonic Slab",
    option_d: "Outer Core",
    correct_answer: "B",
    explanation: "The thick mantle layer lies between the external crust lithosphere and the heavy metal core layers.",
    difficulty: "easy"
  }
];
