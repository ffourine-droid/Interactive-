import { Question } from '../types';

export interface PrebuiltExam {
  title: string;
  subject: string;
  grade: string;
  duration_minutes: number;
  instructions: string;
  questions: Question[];
}

export const prebuiltExams: PrebuiltExam[] = [
  {
    title: "Grade 8 Mathematics — Fractions & Decimals",
    subject: "Mathematics",
    grade: "Grade 8",
    duration_minutes: 30,
    instructions: "Answer all questions. Show your working where necessary.",
    questions: [
      {
        index: 0,
        type: "mcq",
        question: "Wanjiku cut a chapati into 8 equal pieces. She ate 3 pieces. What fraction of the chapati remained?",
        options: ["3/8", "5/8", "1/2", "1/4"],
        correct_answer: "5/8",
        marks: 2
      },
      {
        index: 1,
        type: "mcq",
        question: "Convert 0.75 into a fraction in its simplest form.",
        options: ["75/100", "15/20", "3/4", "3/5"],
        correct_answer: "3/4",
        marks: 2
      },
      {
        index: 2,
        type: "mcq",
        question: "Simplify 1/2 + 1/4.",
        options: ["2/6", "3/4", "1/4", "1/2"],
        correct_answer: "3/4",
        marks: 2
      },
      {
        index: 3,
        type: "mcq",
        question: "What is 20% of 150?",
        options: ["20", "30", "40", "50"],
        correct_answer: "30",
        marks: 2
      },
      {
        index: 4,
        type: "mcq",
        question: "Which of the following is an equivalent fraction of 2/3?",
        options: ["4/6", "4/9", "3/2", "5/6"],
        correct_answer: "4/6",
        marks: 2
      },
      {
        index: 5,
        type: "short_answer",
        question: "Find the sum of 0.45 and 1.55.",
        correct_answer: "2.0",
        marks: 4
      },
      {
        index: 6,
        type: "short_answer",
        question: "Convert 3/5 to a percentage.",
        correct_answer: "60%",
        marks: 4
      }
    ]
  },
  {
    title: "Grade 7 Integrated Science — Living Things",
    subject: "Science",
    grade: "Grade 7",
    duration_minutes: 25,
    instructions: "Read each question carefully before answering.",
    questions: [
      {
        index: 0,
        type: "mcq",
        question: "The Acacia tree is commonly found in which Kenyan ecosystem?",
        options: ["Tropical Primary Forest", "Savannah Grassland", "Alpine Region", "Mangrove Swamp"],
        correct_answer: "Savannah Grassland",
        marks: 2
      },
      {
        index: 1,
        type: "mcq",
        question: "Which of the following is a characteristic of all living things?",
        options: ["Ability to speak", "Movement", "Thinking", "Writing"],
        correct_answer: "Movement",
        marks: 2
      },
      {
        index: 2,
        type: "mcq",
        question: "What do plants need for photosynthesis?",
        options: ["Oxygen and Sugar", "Carbon dioxide, water and sunlight", "Nitrogen and Soil", "Insects and Water"],
        correct_answer: "Carbon dioxide, water and sunlight",
        marks: 2
      },
      {
        index: 3,
        type: "mcq",
        question: "Which organ is used for breathing in fish?",
        options: ["Lungs", "Gills", "Skin", "Trachea"],
        correct_answer: "Gills",
        marks: 2
      },
      {
        index: 4,
        type: "mcq",
        question: "Hibernating is an example of:",
        options: ["Reproduction", "Adaptation", "Nutrition", "Excretion"],
        correct_answer: "Adaptation",
        marks: 2
      },
      {
        index: 5,
        type: "short_answer",
        question: "Define the term 'Environment'.",
        correct_answer: "The surroundings or conditions in which a person, animal, or plant lives or operates.",
        marks: 4
      },
      {
        index: 6,
        type: "short_answer",
        question: "List two examples of invertebrates found in Kenya.",
        correct_answer: "Snail, Bee, Butterfly, Spider",
        marks: 4
      }
    ]
  }
];
