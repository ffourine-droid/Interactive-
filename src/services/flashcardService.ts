import { supabase } from '../lib/supabase';

export interface Flashcard {
  id?: string;
  subject: string;
  grade: number;
  topic: string;
  question: string;
  answer: string;
  created_at?: string;
}

const DEFAULT_FLASHCARDS: Flashcard[] = [
  {
    id: "seed-1",
    subject: "Biology",
    grade: 8,
    topic: "The Digestive System",
    question: "What is the role of the stomach in digestion?",
    answer: "The stomach churns food and mixes it with gastric juices to break it down into a semi-liquid mixture called chyme."
  },
  {
    id: "seed-2",
    subject: "Biology",
    grade: 8,
    topic: "The Digestive System",
    question: "Where does most nutrient absorption take place?",
    answer: "Most nutrient absorption takes place in the small intestine, specifically across its highly folded inner wall."
  },
  {
    id: "seed-3",
    subject: "Biology",
    grade: 8,
    topic: "The Digestive System",
    question: "Which digestive juice is produced by the liver and stored in the gallbladder?",
    answer: "Bile is produced by the liver and stored in the gallbladder. It helps emulsify (break down) fats into tiny droplets."
  },
  {
    id: "seed-4",
    subject: "Biology",
    grade: 8,
    topic: "The Digestive System",
    question: "What are the finger-like projections in the small intestine called?",
    answer: "Villi. They significantly increase the absorption surface area and are packed with blood vessels to carry nutrients to the rest of the body."
  },
  {
    id: "seed-5",
    subject: "Biology",
    grade: 8,
    topic: "The Digestive System",
    question: "Which organ is responsible for absorbing water and minerals back into the body?",
    answer: "The large intestine (colon) absorbs water, salts, and some vitamins from undigested waste before it is eliminated."
  },
  {
    id: "seed-6",
    subject: "Science",
    grade: 7,
    topic: "Photosynthesis",
    question: "What are the three main requirements for photosynthesis?",
    answer: "Water, carbon dioxide, and sunlight. Water is absorbed from the soil, carbon dioxide from the air, and sunlight by chlorophyll."
  },
  {
    id: "seed-7",
    subject: "Science",
    grade: 7,
    topic: "Photosynthesis",
    question: "What green pigment absorbs sunlight for photosynthesis?",
    answer: "Chlorophyll, which is found inside the chloroplasts of green plant cells, especially in the leaves."
  },
  {
    id: "seed-8",
    subject: "Science",
    grade: 7,
    topic: "Photosynthesis",
    question: "What is the primary waste gas produced during photosynthesis?",
    answer: "Oxygen is the main gaseous byproduct, released into the atmosphere through the microscopic leaf pores called stomata."
  },
  {
    id: "seed-9",
    subject: "Chemistry",
    grade: 9,
    topic: "Atoms",
    question: "What are the three subatomic particles that make up an atom?",
    answer: "Protons (positive charge, inside the nucleus), Neutrons (neutral, inside the nucleus), and Electrons (negative, orbiting the nucleus)."
  },
  {
    id: "seed-10",
    subject: "Chemistry",
    grade: 9,
    topic: "Atoms",
    question: "Where is the mass of an atom concentrated?",
    answer: "In the central nucleus, which contains protons and neutrons. Electrons are extremely light and orbit in the outer shells."
  },
  {
    id: "seed-11",
    subject: "Chemistry",
    grade: 9,
    topic: "Atoms",
    question: "What determines the atomic number of an element?",
    answer: "The number of protons in its nucleus. Every element on the periodic table has a unique proton number."
  }
];

const LOCAL_STORAGE_KEY = 'azilearn_flashcards_db';

export const flashcardService = {
  /**
   * Fetch all flashcards from Supabase with a robust local fallback
   */
  async getFlashcards(): Promise<Flashcard[]> {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const normalized = data.map((card: any) => ({
          ...card,
          grade: typeof card.grade === 'string' 
            ? (parseInt(card.grade.replace(/[^0-9]/g, ''), 10) || 7) 
            : (Number(card.grade) || 7)
        }));
        // Cache them locally to keep synced
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {
      console.warn("Supabase flashcards table read failed or is not created yet. Falling back to local storage.", e);
    }

    // Fallback: load from local storage
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData) as Flashcard[];
        if (parsed.length > 0) {
          return parsed.map((card: any) => ({
            ...card,
            grade: typeof card.grade === 'string' 
              ? (parseInt(card.grade.replace(/[^0-9]/g, ''), 10) || 7) 
              : (Number(card.grade) || 7)
          }));
        }
      } catch {
        // Corrupted, rebuild
      }
    }

    // Seed defaults in local storage if empty
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_FLASHCARDS));
    return DEFAULT_FLASHCARDS;
  },

  /**
   * Save a set of flashcards to Supabase, or fallback to local storage
   */
  async uploadFlashcards(cards: Omit<Flashcard, 'id'>[]): Promise<{ count: number; error: boolean; message: string }> {
    const formattedCards = cards.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }));

    let supabaseSaved = false;
    let errorMessage = '';

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .insert(formattedCards)
        .select();

      if (!error) {
        supabaseSaved = true;
      } else {
        errorMessage = error.message;
      }
    } catch (e: any) {
      errorMessage = e?.message || String(e);
    }

    // Update Local Storage as well (both for offline support and gracefully bypass non-existent tables)
    try {
      const currentLocal = await this.getCurrentLocalCards();
      const updatedList = [...formattedCards, ...currentLocal];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (localWriteError) {
      console.error("Local storage update failed", localWriteError);
    }

    if (supabaseSaved) {
      return {
        count: formattedCards.length,
        error: false,
        message: `Successfully uploaded ${formattedCards.length} flashcards to Supabase database.`
      };
    } else {
      return {
        count: formattedCards.length,
        error: true,
        message: `Saved locally. Supabase error: "${errorMessage}". (This is expected if the 'flashcards' table has not been created yet in your Supabase console).`
      };
    }
  },

  /**
   * Fetch current localStorage stored cards
   */
  async getCurrentLocalCards(): Promise<Flashcard[]> {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
      try {
        return JSON.parse(localData) as Flashcard[];
      } catch {
        return DEFAULT_FLASHCARDS;
      }
    }
    return DEFAULT_FLASHCARDS;
  },

  /**
   * Delete a flashcard from DB / Local
   */
  async deleteFlashcard(id: string): Promise<boolean> {
    let supabaseDeleted = false;
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id);
      
      if (!error) supabaseDeleted = true;
    } catch {
      // Ignored fallback
    }

    // Local delete
    try {
      const current = await this.getCurrentLocalCards();
      const filtered = current.filter(c => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return supabaseDeleted;
    }
  },

  /**
   * Gets the SQL required to setup this table in Supabase
   */
  getSQLStatement(): string {
    return `
-- SQL TO CREATE FLASHCARDS TABLE IN SUPABASE:
-- Paste this script directly inside your Supabase SQL Editor and hit "Run"

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read flashcards (both teachers and students)
CREATE POLICY "Anyone can read flashcards" 
ON flashcards FOR SELECT 
USING (true);

-- Allow anyone to insert/delete flashcards
CREATE POLICY "Anyone can insert flashcards" 
ON flashcards FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete flashcards" 
ON flashcards FOR DELETE 
USING (true);
    `;
  }
};
