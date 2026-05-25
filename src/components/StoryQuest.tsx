import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Lock, Unlock, Award, CheckCircle2, XCircle, 
  ChevronLeft, ArrowRight, ShieldAlert, Sparkles, Star, 
  HelpCircle, Compass, Smile, Flame, ShieldCheck, Trophy, 
  Check, PlayCircle, Loader2, RefreshCw, Volume2, VolumeX,
  Sliders, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface StoryCharacter {
  character_name: string;
  character_description: string;
  home_town: string;
  personality: string;
}

interface StorySubject {
  id: string;
  name?: string;
  subject_name?: string; // fallback
  grade: string;
  story_title: string;
  icon?: string;
  total_chapters?: number;
  story_characters?: StoryCharacter | StoryCharacter[] | any;
}

// Helper functions for safe retrieval from joined columns representation
const getCharacter = (sub: StorySubject | undefined | null): StoryCharacter => {
  if (!sub) {
    return {
      character_name: 'Unknown Hero',
      character_description: 'An eager learner on a learning quest.',
      home_town: 'Kenya',
      personality: 'Enthusiastic'
    };
  }
  if (sub.story_characters) {
    if (Array.isArray(sub.story_characters)) {
      return sub.story_characters[0] || {
        character_name: 'Unknown Hero',
        character_description: 'An eager learner on a learning quest.',
        home_town: 'Kenya',
        personality: 'Enthusiastic'
      };
    }
    return sub.story_characters;
  }
  return {
    character_name: (sub as any).character_name || 'Unknown Hero',
    character_description: (sub as any).character_desc || (sub as any).character_description || 'An eager learner.',
    home_town: (sub as any).home_town || 'Kenya',
    personality: (sub as any).personality || 'Curious'
  };
};

const getSubjectName = (sub: StorySubject): string => {
  return sub.name || sub.subject_name || 'General';
};

const getStoryTitle = (sub: StorySubject): string => {
  return sub.story_title || sub.name || sub.subject_name || 'Untold Adventure';
};

const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return id.length === 36 && id.includes('-');
};

interface StoryChapter {
  id: string;
  chapter_number: number;
  title: string;
  description: string;
  total_scenes: number;
  xp_reward: number;
}

interface StoryScene {
  id: string;
  scene_number: number;
  narrative: string;
  setting_local: string;
  question?: SceneQuestion;
}

interface SceneQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  response_correct?: string;
  response_wrong?: string;
}

interface StudentStoryProgress {
  subject_id: string;
  current_chapter_id: string | null;
  current_scene_number: number;
  completed_chapters: string[];
  total_xp: number;
}

// ─── Local Prebuilt Data (Kenya Context) ──────────────────────────────────────

const PREBUILT_SUBJECTS: StorySubject[] = [
  {
    id: 'subj-business',
    name: 'Business Studies',
    grade: 'Grade 7',
    story_title: "Mama Mboga's Venture",
    icon: 'Compass',
    total_chapters: 1,
    story_characters: {
      character_name: 'Amani',
      character_description: 'An enterprising 13-year-old helping her Cucu run a fresh produce kiosk in Nakuru town.',
      home_town: 'Nakuru',
      personality: 'Enterprising and helpful'
    }
  },
  {
    id: 'subj-agriculture',
    name: 'Agriculture',
    grade: 'Grade 7',
    story_title: 'The Water Oasis',
    icon: 'Sparks',
    total_chapters: 1,
    story_characters: {
      character_name: 'Karanja',
      character_description: 'An innovative youth in Karatina who constructs organic vertical gardens to defeat drought.',
      home_town: 'Karatina',
      personality: 'Resourceful'
    }
  },
  {
    id: 'subj-maths',
    name: 'Mathematics',
    grade: 'Grade 7',
    story_title: "Wanjiku's Sewing Patterns",
    icon: 'Star',
    total_chapters: 1,
    story_characters: {
      character_name: 'Wanjiku',
      character_description: 'A sharp fabric pattern designer who calculates ratios in Nairobi’s bustling Gikomba market.',
      home_town: 'Nairobi',
      personality: 'Analytical and creative'
    }
  },
  {
    id: 'subj-science',
    name: 'Science & Tech',
    grade: 'Grade 7',
    story_title: 'Litmus Rivers',
    icon: 'Award',
    total_chapters: 1,
    story_characters: {
      character_name: 'Mutua',
      character_description: 'An ambitious investigator who uses chemical test slips to probe Athi River’s safety.',
      home_town: 'Athi River',
      personality: 'Curious investigator'
    }
  },
  {
    id: 'subj-arts',
    name: 'Creative Arts',
    grade: 'Grade 7',
    story_title: 'Shaker Harmony',
    icon: 'Smile',
    total_chapters: 1,
    story_characters: {
      character_name: 'Nekesa',
      character_description: 'A sound recorder in Kakamega blending traditional Kayamba shaker rhythms with modern beats.',
      home_town: 'Kakamega',
      personality: 'Artistic and expressive'
    }
  },
  {
    id: 'subj-social',
    name: 'Social Studies',
    grade: 'Grade 7',
    story_title: 'Fort Island Seafarer',
    icon: 'Compass',
    total_chapters: 1,
    story_characters: {
      character_name: 'Juma',
      character_description: 'A history enthusiast near Fort Jesus, Mombasa, discovering the secrets of Indian Ocean trade.',
      home_town: 'Mombasa',
      personality: 'Historical explorer'
    }
  }
];

const PREBUILT_CHAPTERS: Record<string, StoryChapter[]> = {
  'subj-business': [
    {
      id: 'chap-biz-1',
      chapter_number: 1,
      title: 'Mama Mboga’s Balancing Act',
      description: 'Discover why financial bookkeeping, credit records, and understanding liabilities keep kiosks profitable.',
      total_scenes: 3,
      xp_reward: 120
    }
  ],
  'subj-agriculture': [
    {
      id: 'chap-agri-1',
      chapter_number: 1,
      title: 'Water Oasis & container gardening',
      description: 'Learn organic mulching, drip container setups, and vertical agriculture in clay environments.',
      total_scenes: 3,
      xp_reward: 120
    }
  ],
  'subj-maths': [
    {
      id: 'chap-math-1',
      chapter_number: 1,
      title: 'Proportions in the Gikomba stalls',
      description: 'Apply ratios to Maasai Shuka fabric pieces, optimize markup margins, and handle discount transactions.',
      total_scenes: 3,
      xp_reward: 120
    }
  ],
  'subj-science': [
    {
      id: 'chap-sci-1',
      chapter_number: 1,
      title: 'Red Litmus & Water Indicators',
      description: 'Examine pH acids, trace wastewater run-offs, and implement phytoremediation using regional wetland reeds.',
      total_scenes: 3,
      xp_reward: 120
    }
  ],
  'subj-arts': [
    {
      id: 'chap-art-1',
      chapter_number: 1,
      title: 'Complementary Hues of Luhya Shakers',
      description: 'Analyze contrast parameters using warm-cool values, classify percussion idiophones, and learn copyright benefits.',
      total_scenes: 3,
      xp_reward: 120
    }
  ],
  'subj-social': [
    {
      id: 'chap-soc-1',
      chapter_number: 1,
      title: 'Trade Monsoons & Fort Jesus Coral',
      description: 'Explore historical maritime wind currents, Swahili integration, and the defensive resilience of coral stone blocks.',
      total_scenes: 3,
      xp_reward: 120
    }
  ]
};

const getMatchingPrebuiltSubjectId = (sub: StorySubject | null | undefined): string => {
  if (!sub) return 'subj-business';
  const name = (sub.name || sub.subject_name || '').toLowerCase();
  
  if (name.includes('bus') || name.includes('commerce') || name.includes('mboga')) return 'subj-business';
  if (name.includes('agri') || name.includes('farm') || name.includes('shamba') || name.includes('water')) return 'subj-agriculture';
  if (name.includes('math') || name.includes('calc') || name.includes('sewing') || name.includes('ratio')) return 'subj-maths';
  if (name.includes('scie') || name.includes('tech') || name.includes('river') || name.includes('litmus')) return 'subj-science';
  if (name.includes('art') || name.includes('music') || name.includes('shaker')) return 'subj-arts';
  if (name.includes('soc') || name.includes('hist') || name.includes('island') || name.includes('fort') || name.includes('wind')) return 'subj-social';
  
  const char = getCharacter(sub);
  const charName = (char.character_name || '').toLowerCase();
  if (charName.includes('amani')) return 'subj-business';
  if (charName.includes('karanja')) return 'subj-agriculture';
  if (charName.includes('wanjiku')) return 'subj-maths';
  if (charName.includes('mutua')) return 'subj-science';
  if (charName.includes('nekesa')) return 'subj-arts';
  if (charName.includes('juma')) return 'subj-social';

  if (sub.id === 'subj-business' || sub.id === 'subj-agriculture' || sub.id === 'subj-maths' || sub.id === 'subj-science' || sub.id === 'subj-arts' || sub.id === 'subj-social') {
    return sub.id;
  }

  if (sub.id && PREBUILT_CHAPTERS && PREBUILT_CHAPTERS[sub.id]) {
    return sub.id;
  }

  return 'subj-business';
};

const getMatchingPrebuiltChapterId = (sub: StorySubject | null | undefined, chapNumber: number): string => {
  const subId = getMatchingPrebuiltSubjectId(sub);
  const chaps = PREBUILT_CHAPTERS[subId] || [];
  const found = chaps.find(c => c.chapter_number === chapNumber) || chaps[0];
  return found ? found.id : 'chap-biz-1';
};

const PREBUILT_SCENES: Record<string, StoryScene[]> = {
  'chap-biz-1': [
    {
      id: 'scene-biz-1',
      scene_number: 1,
      setting_local: 'Nakuru Open-Air Market, Kenya',
      narrative: 'The Nakuru open-air market is buzzing with buyers under the warm afternoon sun. Amani arrives at her grandmother’s kiosk, only to find Shiku, her Cucu (grandmother), looking worried and staring blankly into an old notebook. "Cucu, what is wrong?" asks Amani. Shiku sighs deeply, "We sold as usual today, Amani, but I cannot tell why our cash drawer is short by 800 Shillings. We have no clear records of our expenses!"',
      question: {
        question_text: 'What is the primary purpose of maintaining regular and strict financial records in a busy business kiosk?',
        option_a: 'To make the stall look more professional and attract customers',
        option_b: 'To satisfy local council officers during trade licensing inspections',
        option_c: 'To carefully track income, register expenses, and prevent cash leakage',
        option_d: 'To calculate how many hours the stall workers spend on site',
        correct_option: 'C',
        explanation: 'Financial bookkeeping tracks every single penny flowing in (income) and out (expenses). This clarifies exactly where cash goes, avoiding sudden unexplained shortages and helping a business evaluate actual margins.',
        response_correct: 'Vizuri sana! Keeping accurate records ensures Cucu can track every single Shilling. This avoids unexplained cash shortages and builds a strong, profitable business!',
        response_wrong: 'Let’s check our notebooks again. Council inspections are important, but tracking cash is the secret to keeping our kiosk profitable!'
      }
    },
    {
      id: 'scene-biz-2',
      scene_number: 2,
      setting_local: 'Nakuru Market',
      narrative: 'Amani grabs a clean cardboard worksheet. She helps Cucu list all the costs: they bought a crate of ripe tomatoes for 2,000 KES, paid 300 KES to a wheelbarrow transporter to shift it to their station, and sold everything for 3,100 KES in total. "Let’s work out the math!" Amani suggests eagerly. "We must identify all operational expenses and calculate our net profits correctly!"',
      question: {
        question_text: 'What were the total direct expenses incurred to settle the tomatoes, and how much net profit did Cucu make?',
        option_a: 'Expenses: 2,000 KES; Profit: 1,100 KES',
        option_b: 'Expenses: 2,300 KES; Profit: 800 KES',
        option_c: 'Expenses: 2,300 KES; Profit: 3,100 KES',
        option_d: 'Expenses: 3,100 KES; Profit: 0 KES',
        correct_option: 'B',
        explanation: 'Total cost comprises the product cost (2,000 KES) + transportation utility (300 KES) = 2,300 KES. Net Profit = Revenue (3,100 KES) - Expenses (2,300 KES) = 800 KES.',
        response_correct: 'Perfect math! The direct expenses add up to 2,300 KES, leaving us with an actual profit of 800 KES. Cucu is so proud of your quick thinking!',
        response_wrong: 'Not quite! Remember to add the transporter’s 300 KES to the tomato crate price of 2,000 KES first to find the total expense.'
      }
    },
    {
      id: 'scene-biz-3',
      scene_number: 3,
      setting_local: 'Nakuru Market',
      narrative: 'Cucu smiles broadly as she reads the clear numbers. "We did remarkably well today, Amani!" Suddenly, Baba Mwangi, an wholesale sweet potato supplier, approaches offering them inventory on credit. Shiku wants to grab it, but Amani advises caution: "Cucu, buying on credit is useful, but we must understand that this becomes a liability we owe back!"',
      question: {
        question_text: 'What does purchasing stock "on credit" mean for Mama Mboga’s small market business?',
        option_a: 'They get the inventory for free as a gift from Baba Mwangi',
        option_b: 'They must pay double the price of the potatoes immediately on delivery',
        option_c: 'They receive the potatoes now and must pay Baba Mwangi’s company later',
        option_d: 'They are renting the potatoes and must return them if unsold',
        correct_option: 'C',
        explanation: 'Buying on credit represents an accounts payable liability. The merchant is allowed to take possession of the goods immediately and agrees to pay the supplier at a specified later date.',
        response_correct: 'Superb understanding! Buying stock on credit means taking delivery immediately but promising to clear the amount later. It is a real business liability that must be managed carefully!',
        response_wrong: 'Careful, explorer! Credit is never free stock. We must eventually pay back what we owe, which creates a business liability.'
      }
    }
  ],
  'chap-agri-1': [
    {
      id: 'scene-agri-1',
      scene_number: 1,
      setting_local: 'Karatina, Nyeri County',
      narrative: 'Karanja walks through his dry backyard. The Nyeri sun has been blistering for weeks, and his family’s sukuma wiki (collard greens) are drooping. Soil moisture is completely gone, and tap water is expensive. Karanja thinks to himself: "Pouring cups of water over the leaves is a waste because it evaporates almost instantly in this dry heat. We need a targeted approach."',
      question: {
        question_text: 'Which irrigation method is most effective at conserving water during a severe dry spell?',
        option_a: 'Sprinkling water liberally over the entire yard with a hose',
        option_b: 'Flooding the garden beds until the clay is completely soaked',
        option_c: 'Implementing targeted drip/container irrigation directly at root level',
        option_d: 'Watering the garden only at direct midday when the plants are hottest',
        correct_option: 'C',
        explanation: 'Drip container irrigation feeds minimal quantities of water drop-by-drop right at the root zone where the plant needs it, mitigating soil runoff and evaporation losses.',
        response_correct: 'Excellent job! Drip irrigation delivers water drop-by-drop right where the roots can absorb it, wasting zero moisture and beating the Karatina drought!',
        response_wrong: 'That’s not it! Watering at direct midday or splashing the yard causes immediate evaporation. Try another approach to save water and feed the roots!'
      }
    },
    {
      id: 'scene-agri-2',
      scene_number: 2,
      setting_local: 'Karatina garden',
      narrative: 'Karanja collects old plastic 5-liter bottles from neighbors, pierces a microscopic hole near the caps, and hangs them upside down next to each succulent stalk. He wants to take a step further by covering the soil around each plant. "But with what?" asks his brother. "We must trap whatever water drips in!"',
      question: {
        question_text: 'Which organic materials are best suited to act as "mulch" to protect soil moisture from evaporating?',
        option_a: 'Broken red glass pieces and colored gravel stones',
        option_b: 'Fine dry sand or charcoal chips',
        option_c: 'Dry grass, fallen leaves, or crop residues',
        option_d: 'Old newspapers and crushed plastic bottles',
        correct_option: 'C',
        explanation: 'Organic mulches (like dry grass, leaves, straw, and coconut husks) protect soil from solar heat, block moisture evaporation, limit weed growth, and eventually decay, providing nutrients.',
        response_correct: 'Wonderful! Mulching with dry grass, leaves, or crop remnants locks soil moisture in like an eye-safe blanket, allowing Karanja’s soil to stay cool and moist!',
        response_wrong: 'Wait! Non-porous or non-natural materials won’t fertilize or insulate the soil correctly. Think of organic materials we can gather around our shamba.'
      }
    },
    {
      id: 'scene-agri-3',
      scene_number: 3,
      setting_local: 'Karatina Garden',
      narrative: 'Within a week, Karanja’s sukuma wiki are thriving, standing tall and deep green. Neighbors are amazed at how little water he used. Some neighbors mention having no soil plot. Karanja points to a large upright sack filled with soil and compost. "Look!" he says. "We can grow multiple levels of vegetables without needing wide fields!"',
      question: {
        question_text: 'What represents the chief benefit of vertical container/multistorey gardening?',
        option_a: 'It allows growing many crops vertically, saving space and recycling soil nutrients',
        option_b: 'It completely protects the plants from pests and bird attacks',
        option_c: 'It forces the vegetables to grow larger because they are closer to the sky',
        option_d: 'It changes the flavor of sukuma wiki, making them sweet',
        correct_option: 'A',
        explanation: 'Multistorey sack/container gardens make clever use of vertical space, enabling households with tiny yards or concrete balconies to achieve food security in urban areas.',
        response_correct: 'Safi sana! Multistorey gardening enables urban households to stack crops upwards, reusing compost, saving space, and ensuring community food security!',
        response_wrong: 'Not quite. Vertical sack bags save space and recycle soil nutrients, but they don’t change crop flavors or block all pests. Choose the spacing answer!'
      }
    }
  ],
  'chap-math-1': [
    {
      id: 'scene-math-1',
      scene_number: 1,
      setting_local: 'Gikomba Market, Nairobi',
      narrative: 'Gikomba is packed with rich patterns. Wanjiku’s mother receives a big order for custom school and traditional Maasai Shukas. She has a large single piece of vibrant red patterned fabric 24 meters long. She tells Wanjiku: "We must split this fabric into two rolls, one for Large sizes and one for Medium, in the exact ratio of 5:3. Tell me the length of each!"',
      question: {
        question_text: 'Using the ratio of 5:3, how many meters of the 24m fabric should Wanjiku measure for the Large roll?',
        option_a: '15 meters',
        option_b: '9 meters',
        option_c: '12 meters',
        option_d: '18 meters',
        correct_option: 'A',
        explanation: 'Total parts = 5 + 3 = 8 parts. Total fabric = 24m. One part = 24 / 8 = 3m. Large role gets 5 parts: 5 * 3 = 15m. Medium role gets 3 parts: 3 * 3 = 9m.',
        response_correct: 'Brilliant! Since 5 parts out of 8 parts total equals 15 meters, the large shuka roll is perfectly measured. Well calculated, Wanjiku!',
        response_wrong: 'Let’s review our ratio division. Add the ratio parts 5 plus 3 first to get 8, then divide 24 by that sum to find the value of one share!'
      }
    },
    {
      id: 'scene-math-2',
      scene_number: 2,
      setting_local: 'Gikomba Market',
      narrative: 'Wanjiku cuts the fabric neatly. Now her mom needs to set the selling price. The raw cost to procure and sew single medium-sized Maasai Shuka is 600 KES. "To pay our rent and school fees, we need to apply a 25% profit markup over the cost price," her mother calculations. "Wanjiku, set the price tag!"',
      question: {
        question_text: 'What should be the final retail price tag of the Maasai Shuka to achieve a 25% markup?',
        option_a: '650 KES',
        option_b: '750 KES',
        option_c: '800 KES',
        option_d: '725 KES',
        correct_option: 'B',
        explanation: 'Markup amount = 25% of 600 KES = 0.25 * 600 = 150 KES. Final Price = Cost Price + Markup = 600 + 150 = 750 KES.',
        response_correct: 'Absolutely correct! Adding a 25 percent markup of 150 KES brings our selling price to 750 KES, helping mom earn a sustainable profit and build her Gikomba shop!',
        response_wrong: 'Look closely at the markup! A 25 percent markup means we must add one quarter of the 600 KES cost on top of the base price. Check the math!'
      }
    },
    {
      id: 'scene-math-3',
      scene_number: 3,
      setting_local: 'Gikomba Market',
      narrative: 'A community group wants to purchase a batch of 10 Medium Maasai Shukas. They ask Wanjiku for a small wholesale volume discount. Wanjiku proposes: "If we give them an flat 10% discount from our total retail price of 7,500 KES, we can secure the sale quickly! But mother, let’s ensure we still make a sustainable profit!"',
      question: {
        question_text: 'After applying the 10% discount on the 7,500 KES total, what is the new price, and do they still make profit over the 6,000 KES manufacture cost?',
        option_a: 'New price: 6,750 KES; yes, they earn 750 KES profit',
        option_b: 'New price: 7,000 KES; yes, they earn 1,000 KES profit',
        option_c: 'New price: 6,000 KES; no, they break even with 0 KES profit',
        option_d: 'New price: 6,500 KES; yes, they earn 500 KES profit',
        correct_option: 'A',
        explanation: 'Discount = 10% of 7,500 = 750 KES. New selling value = 7,500 - 750 = 6,750 KES. Total cost price = 10 * 600 = 6,000 KES. Residual profit = 6,750 - 6,000 = 750 KES.',
        response_correct: 'Excellent trade skills! The discounted price is 6,750 KES, securing an order of 10 pieces while still retaining a wonderful profit of 750 KES!',
        response_wrong: 'Check your subtraction. A 10 percent discount on 7,500 is 750 KES. Subtract that from the total to find the correct transaction value!'
      }
    }
  ],
  'chap-sci-1': [
    {
      id: 'scene-sci-1',
      scene_number: 1,
      setting_local: 'Machakos County',
      narrative: 'Mutua is walking next to a small tributary that feeds the Athi River in Machakos. Near a factory outlet, he spots weird light-yellow soap foam floating on the water and dead algae along the banks. "This looks like a dangerous pH shift!" Mutua says. He grabs a test paper strip from his science backpack.',
      question: {
        question_text: 'If the river contains harmful acidic chemicals, what color change will indicate this when Mutua dips blue litmus paper in it?',
        option_a: 'The blue litmus paper will stay dark blue',
        option_b: 'The blue litmus paper will turn bright white',
        option_c: 'The blue litmus paper will turn bright red or warm pink',
        option_d: 'The blue litmus paper will turn deep purple',
        correct_option: 'C',
        explanation: 'Acidic substances react with blue litmus dye indicator, turning it red. A pH of less than 7 indicates acidity, which is toxic to river fish.',
        response_correct: 'Fantastic science! Acidic river water turns blue litmus paper into a bright pinkish red, alerting Mutua to the toxic pH shift in the stream!',
        response_wrong: 'Remember your chemical indicators! Acids cause a chemical shift that turns blue litmus paper a bright alarm red. Blue or neutral remains unchanged!'
      }
    },
    {
      id: 'scene-sci-2',
      scene_number: 2,
      setting_local: 'Machakos Riverbank',
      narrative: 'Mutua confirms a ph balance of 4.5. He calls a county representative, Mr. Musyoka, who arrives on site. "Mutua, what is the big deal? It is just some soap bubbles washing away," says Mr. Musyoka. Mutua points to the dark turbid water. "When pollutants cloud the water, they block sunlight from reaching the moss on the riverbed!"',
      question: {
        question_text: 'Why is blocking sunlight harmful to underwater plants and the aquatic life cycle?',
        option_a: 'It prevents plants from absorbing salts from the soil',
        option_b: 'It blocks photosynthesis, which cuts off dissolved oxygen production for fish',
        option_c: 'It makes the water too hot during the afternoon',
        option_d: 'It makes the river plants invisible to insects',
        correct_option: 'B',
        explanation: 'Riverbed flora need solar rays to run photosynthesis. In photosynthesis, carbon dioxide and water are transformed into sugars and oxygen. Without light, oxygen drops, causing fish suffocation.',
        response_correct: 'Magnificent explanation! Shaded riverbed plants cannot perform photosynthesis, leading to direct oxygen depletion which suffocates the river fish.',
        response_wrong: 'That’s not it. Think of how plants breathe and manufacture food. Cloudy water blocks sunlight, stopping photosynthesis and making vital dissolved oxygen disappear!'
      }
    },
    {
      id: 'scene-sci-3',
      scene_number: 3,
      setting_local: 'Machakos Wetland',
      narrative: 'Mr. Musyoka understands. "We will mandate filtration! But is there a natural soil technique we can build near the outlet to prevent emergency runoff?" Mutua sketches a wetland channel lined with specific local reeds and gravel beds. "The roots filter waste naturally!"',
      question: {
        question_text: 'What scientific term describes using local plants to clean up soil or industrial water pollution?',
        option_a: 'Sedimentation',
        option_b: 'Phytoremediation and natural biofiltration',
        option_c: 'Thermal condensation',
        option_d: 'Salinization',
        correct_option: 'B',
        explanation: 'Phytoremediation is the bio-technological use of plants (such as wetland reeds) to clean up, hyperaccumulate, or neutralize toxins from aquatic systems and soil.',
        response_correct: 'Safi sana! Phytoremediation uses natural reeds and gravel filters to extract, hyperaccumulate, and neutralize toxic heavy metals directly from water runoff!',
        response_wrong: 'Not sedimentation or salinity! Think of the biological root word "phyto" which translates directly to plant-based environmental cleanup.'
      }
    }
  ],
  'chap-art-1': [
    {
      id: 'scene-art-1',
      scene_number: 1,
      setting_local: 'Kakamega Town, Western Kenya',
      narrative: 'Nekesa is assembling a beautiful painting for the annual Kakamega cultural festival. Her uncle plays a beautiful Kayamba shaker—a traditional flat wood-and-reed sheet decorated with orange clay beads. Nekesa wants her painting to stand out. "To make my orange clay elements pop visually," she muses, "I must paint a highly contrasting cool background!"',
      question: {
        question_text: 'Which color lies directly opposite on the standard color wheel and serves as the highest-contrast complementary hue to Orange?',
        option_a: 'Deep Cobalt Blue',
        option_b: 'Bright Primary Red',
        option_c: 'Vibrant Sunflower Yellow',
        option_d: 'Forest Emerald Green',
        correct_option: 'A',
        explanation: 'Blue and orange are complementary colors. On the color wheel, complementary colors face each other directly, offering maximum warmth-vs-cool visual contrast.',
        response_correct: 'Stunning artistic sense! Deep cobalt blue lies directly opposite orange, providing a gorgeous complementary contrast that makes the Kayamba beads stand out beautifully!',
        response_wrong: 'Check the color relationships! Orange is a warm secondary tone. To find its counterpart, look directly across the color wheel for the coldest primary hue.'
      }
    },
    {
      id: 'scene-art-2',
      scene_number: 2,
      setting_local: 'Kakamega Festival Ground',
      narrative: 'The painting is gorgeous. Nekesa now plugs in her microphone. She records the rhythmic sound of her uncle shaking the Kayamba. The rustling sound is crisp. She explains how the simple instrument produces sound: "It is simple physics! Red seeds strike inside the dry hollow reeds!"',
      question: {
        question_text: 'To which class of musical instruments does the Kayamba shaker belong?',
        option_a: 'Chordophone (stringed loop)',
        option_b: 'Percussion / Idiophone (sound produced by body vibration)',
        option_c: 'Aerophone (wind-blown tube)',
        option_d: 'Membranophone (stretched skin drum)',
        correct_option: 'B',
        explanation: 'The Kayamba is an idiophone shaker. Vibrations are created by shaking hard seeds or beads against its reed body mesh without requiring a stretched membrane or string.',
        response_correct: 'Spot on! The Kayamba is an idiophone. Its sound is produced by the vibration of its entire reed body filled with red seeds when shaken!',
        response_wrong: 'Think about how a Kayamba is built! It doesn’t use stretched drum skins or hollow air pipes. Re-examine how its dry reeds vibrate when shaken.'
      }
    },
    {
      id: 'scene-art-3',
      scene_number: 3,
      setting_local: 'Kakamega Studio',
      narrative: 'Nekesa produces a high-energy lo-fi music track blending her uncle’s traditional Kayamba shaker loop with modern synthesizer drums. The blend is brilliant. Her schoolmates are dancing joyfully. The festival chief says: "Nekesa, your song is magnificent! Be sure to register your digital files so your creative assets remain protected!"',
      question: {
        question_text: 'Which legal protection secures Nekesa’s exclusive commercial rights to her musical recording?',
        option_a: 'A county commercial trading patent',
        option_b: 'A trademark certification',
        option_c: 'A copyright registration',
        option_d: 'A title deed of land ownership',
        correct_option: 'C',
        explanation: 'Copyright shields original audio masterworks, giving the creators absolute command over reproduction, performance, and commercial broadcasts.',
        response_correct: 'Excellent creative rights awareness! Registering a copyright protects Nekesa’s audio files from unauthorized copycats, securing her musical royalties.',
        response_wrong: 'Think about artistic works! Land deeds protect shambas, and patents safeguard industrial inventions. We need a protection tailored to original lyrics and audio tracks!'
      }
    }
  ],
  'chap-soc-1': [
    {
      id: 'scene-soc-1',
      scene_number: 1,
      setting_local: 'Fort Jesus, Mombasa Island',
      narrative: 'The salty sea spray cools the thick stone ramparts of Fort Jesus. Juma holds a translated copy of a 15th-century maritime diary. The text records that Arabic dhows sailed across the ocean using predictable seasonal breezes. Juma’s grandfather asks, "Juma, do you know which wind currents allowed these ancient ships to successfully travel here?"',
      question: {
        question_text: 'What seasonal wind systems facilitated historical merchant shipping across the Indian Ocean to East Africa?',
        option_a: 'Fohn and Chinook mountain winds',
        option_b: 'The Monsoon winds (Kaskazi and Kusi)',
        option_c: 'High-altitude Jet streams',
        option_d: 'The Westerlies',
        correct_option: 'B',
        explanation: 'Monsoon winds change directions seasonally. The Kaskazi blows from the northeast toward Kenya, while the Kusi blows from the southwest, enabling sailboats to travel back and forth.',
        response_correct: 'Brilliant! The seasonal Monsoon winds, known locally as Kaskazi and Kusi, carried ancient trade dhows across the Indian Ocean to Mombasa harbor!',
        response_wrong: 'Not mountain breezes or altitude streams! Historically, sea traders relied on the seasonal winds of the Indian Ocean to sail back and forth.'
      }
    },
    {
      id: 'scene-soc-2',
      scene_number: 2,
      setting_local: 'Fort Jesus Museum',
      narrative: 'Juma outlines map trade lines on paper. "Because of these steady winds, traders settled along Lamu, Malindi, and Mombasa, creating our incredible coastal Swahili culture!" Grandpa smiles, "Yes! And what is the highest duty of a modern Kenyan citizen living in such a diverse multicultural society?"',
      question: {
        question_text: 'What value is demonstrated when citizens from diverse origins cooperate actively to build a unified country?',
        option_a: 'Individual competition and isolation',
        option_b: 'Community cohesion and national integration (Umoja)',
        option_c: 'Regional tribal division',
        option_d: 'Economic protectionism and closing trade routes',
        correct_option: 'B',
        explanation: 'National integration (Umoja) and community cohesion promote mutual respect, celebrate cultural heritage diversity, and build economic partnerships across Kenya.',
        response_correct: 'Kazi nzuri! Living in harmony under Umoja, celebrating national integration, and respecting communities makes our country resilient and prosperous!',
        response_wrong: 'No, division and exclusion weaken society. Lean towards the beautiful Swahili value of Umoja, representing national integration and active cooperation.'
      }
    },
    {
      id: 'scene-soc-3',
      scene_number: 3,
      setting_local: 'Fort Jesus Battlements',
      narrative: 'Juma looks at the massive coral-stone walls built by Portuguese engineers in 1593. The fort survived dozens of heavy naval sieges because of these heavy defenses. Juma notes: "The material choice was ingenious. Building with ocean-sourced coral block wasn’t just cheap; it was a military masterstroke!"',
      question: {
        question_text: 'Why is coastal coral stone an excellent building block for defensive fortifications?',
        option_a: 'It is highly flexible and bends easily when hit by waves',
        option_b: 'It is lightweight, enabling it to float like wood',
        option_c: 'It absorbs canon impacts without shattering and hardens securely over time when exposed to air',
        option_d: 'It acts as a natural magnet that repels iron canon balls',
        correct_option: 'C',
        explanation: 'Coral limestone contains marine minerals. When exposed to air, it hardens over centuries. Its porous, layered matrix absorbs shock better than granite blocks, which easily splinter under impact.',
        response_correct: 'Remarkable! Coral limestone hardens when exposed to air over time, and its porous matrix naturally absorbs high-speed impacts without fracturing!',
        response_wrong: 'Careful! Stone does not float on waves or act as a magnet. Think about how porous ocean coral handles powerful kinetic impacts.'
      }
    }
  ]
};

// Helper to split text into words while keeping exactly all spaces and punctuation
function getWordsWithIndices(text: string | null | undefined) {
  if (!text) return [];
  const words: { token: string; start: number; end: number; isWord: boolean }[] = [];
  try {
    const regex = /(\s+)|([\w\d'’-]+)|([^\s\w\d'’-]+)/gi;
    let match;
    let safety = 0;
    while ((match = regex.exec(text)) !== null) {
      safety++;
      if (safety > 5000) {
        console.warn("Infinite loop safety cap reached in getWordsWithIndices");
        break;
      }
      const token = match[0];
      const start = match.index;
      const end = start + token.length;
      const isWord = /[\w\d'’-]+/i.test(token);
      words.push({ token, start, end, isWord });
    }
  } catch (err) {
    console.error("Error splitting words in getWordsWithIndices:", err);
  }
  return words;
}

interface StorySentence {
  text: string;
  start: number;
  end: number;
}

function getSentencesWithIndices(text: string | null | undefined): StorySentence[] {
  if (!text) return [];
  const sentences: StorySentence[] = [];
  try {
    // Splits at sentence ending punctuation (. ? !) or newlines, keeping trailing spaces and punctuation
    const regex = /[^.!?\n]+([.!?\n]+)?(\s*)?/gi;
    let match;
    let safety = 0;
    while ((match = regex.exec(text)) !== null) {
      safety++;
      if (safety > 1000) break;
      const sentenceText = match[0];
      if (!sentenceText.trim()) continue;
      sentences.push({
        text: sentenceText,
        start: match.index,
        end: match.index + sentenceText.length
      });
    }
  } catch (err) {
    console.error("Error splitting sentences in getSentencesWithIndices:", err);
  }
  return sentences;
}

interface StoryQuestProps {
  onBack: () => void;
}

export default function StoryQuest({ onBack }: StoryQuestProps) {
  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [screen, setScreen] = useState<'subject_select' | 'story_home' | 'scene' | 'result' | 'chapter_complete' | 'setup'>('subject_select');
  const [studentProfile, setStudentProfile] = useState<{ id: string; name: string; grade: string }>({
    id: 'guest',
    name: 'Learner',
    grade: 'Grade 7'
  });

  // Local setup state if player information is not already present
  const [setupName, setSetupName] = useState('');
  const [setupGrade, setSetupGrade] = useState('Grade 7');

  const [subjects, setSubjects] = useState<StorySubject[]>(PREBUILT_SUBJECTS);
  const [selectedSubject, setSelectedSubject] = useState<StorySubject | null>(null);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null);
  
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [activeScene, setActiveScene] = useState<StoryScene | null>(null);
  
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState<number>(0);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [resultState, setResultState] = useState<'correct' | 'wrong' | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  
  const [progressMap, setProgressMap] = useState<Record<string, StudentStoryProgress>>({});
  
  const { showToast } = useToast();

  const [isReading, setIsReading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentCharIndex, setCurrentCharIndex] = useState<number | null>(null);
  const [currentReadingText, setCurrentReadingText] = useState<string>('');

  // User Reading Comfort and Sound Settings
  const [readingMode, setReadingMode] = useState<'animate-speed' | 'static-audio' | 'silent'>(() => {
    const saved = localStorage.getItem('azilearn_reading_mode');
    return (saved as any) || 'animate-speed';
  });
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = localStorage.getItem('azilearn_speech_rate');
    return saved ? parseFloat(saved) : 0.9;
  });

  const startVisualHighlight = (text: string, startIndex: number = 0) => {
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
    if (safetyStartTimeoutRef.current) clearTimeout(safetyStartTimeoutRef.current);
    if (visualDelayTimeoutRef.current) clearTimeout(visualDelayTimeoutRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    setIsReading(true);
    setIsPaused(false);
    setCurrentReadingText(text);

    const sentences = getSentencesWithIndices(text);
    let currentSentenceIndex = 0;
    if (startIndex > 0) {
      const foundIndex = sentences.findIndex(s => s.start >= startIndex);
      if (foundIndex !== -1) {
        currentSentenceIndex = foundIndex;
      }
    }

    const runVisualPace = () => {
      if (currentSentenceIndex >= sentences.length) {
        setIsReading(false);
        setIsPaused(false);
        setCurrentCharIndex(null);
        setCurrentReadingText('');
        return;
      }

      const currentSentence = sentences[currentSentenceIndex];
      setCurrentCharIndex(currentSentence.start);

      const wordCount = currentSentence.text.trim().split(/\s+/).filter(Boolean).length;
      const paceFactor = 0.9 / speechRate;
      
      const baseDelayPerWord = 380 * paceFactor;
      const sentenceDelay = 350 * paceFactor;
      const delay = Math.max(800, (wordCount * baseDelayPerWord) + sentenceDelay);

      currentSentenceIndex++;
      fallbackTimeoutRef.current = setTimeout(runVisualPace, delay);
    };

    fallbackTimeoutRef.current = setTimeout(runVisualPace, currentSentenceIndex === 0 ? 100 : 0);
  };

  const changeReadingMode = (mode: 'animate-speed' | 'static-audio' | 'silent') => {
    setReadingMode(mode);
    localStorage.setItem('azilearn_reading_mode', mode);
    if (mode === 'silent') {
      stopSpeech();
    } else if (isReading) {
      // Re-trigger speak to apply immediately if playing
      setTimeout(() => {
        speakText(currentReadingText);
      }, 50);
    }
  };

  const changeSpeechRate = (rate: number) => {
    setSpeechRate(rate);
    localStorage.setItem('azilearn_speech_rate', rate.toString());
    if (isReading && readingMode === 'animate-speed') {
      setTimeout(() => {
        startVisualHighlight(currentReadingText, currentCharIndex || 0);
      }, 50);
    }
  };

  // Google TTS functions
  const boundaryEventCountRef = React.useRef<number>(0);
  const fallbackTimeoutRef = React.useRef<any>(null);
  const safetyStartTimeoutRef = React.useRef<any>(null);
  const visualDelayTimeoutRef = React.useRef<any>(null);

  const speakText = (text: string) => {
    if (readingMode === 'silent') {
      return;
    }

    // Stop any current action first
    stopSpeech();

    // Word tracking visual animation mode (fully silent)
    if (readingMode === 'animate-speed') {
      startVisualHighlight(text, 0);
      return;
    }

    // Google TTS audio only mode (no word highlight)
    if (!window.speechSynthesis) return;
    
    // Clean up html tags or any odd double character strings
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Setted to comfortable, slow voice for pupils
    utterance.rate = 0.9;      
    utterance.pitch = 1.0;     
    utterance.volume = 1.0;    

    // Detect language by subject name
    const subjectName = selectedSubject ? (selectedSubject.name || selectedSubject.subject_name || '') : '';
    if (subjectName.toLowerCase().includes('kiswahili')) {
      utterance.lang = 'sw-KE'; 
    } else {
      utterance.lang = 'en-GB';  // British English sounds cleaner than US
    }

    boundaryEventCountRef.current = 0;
    setCurrentReadingText(text);

    utterance.onstart = () => {
      setIsReading(true);
      setIsPaused(false);
      // We explicitly DO NOT set currentCharIndex so that the text remains fully static
      setCurrentCharIndex(null);
    };

    utterance.onend = () => {
      stopSpeech();
    };

    utterance.onerror = () => {
      stopSpeech();
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    if (safetyStartTimeoutRef.current) {
      clearTimeout(safetyStartTimeoutRef.current);
      safetyStartTimeoutRef.current = null;
    }
    if (visualDelayTimeoutRef.current) {
      clearTimeout(visualDelayTimeoutRef.current);
      visualDelayTimeoutRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsReading(false);
    setIsPaused(false);
    setCurrentCharIndex(null);
    setCurrentReadingText('');
  };

  // Stop speech when scene transitions or unmounts
  useEffect(() => {
    stopSpeech();
    return () => {
      stopSpeech();
    };
  }, [activeScene]);

  // ─── INITIALIZATION ────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Try to load student profile from various storage keys in priority order
    let activeStudent: { id: string; name: string; grade: string } | null = null;
    
    const playerStr = localStorage.getItem('azilearn_player');
    const arenaPlayerStr = localStorage.getItem('azilearn_arena_player');
    const studentStr = localStorage.getItem('azilearn_student');

    if (playerStr) {
      try {
        const parsed = JSON.parse(playerStr);
        if (parsed.username) {
          activeStudent = {
            id: parsed.id || `p-${parsed.username}`,
            name: parsed.username,
            grade: parsed.grade ? (typeof parsed.grade === 'number' ? `Grade ${parsed.grade}` : parsed.grade) : 'Grade 7'
          };
        }
      } catch (e) {
        console.error('Failed to parse azilearn_player', e);
      }
    } else if (arenaPlayerStr) {
      try {
        const parsed = JSON.parse(arenaPlayerStr);
        if (parsed.username) {
          activeStudent = {
            id: parsed.id || `p-${parsed.username}`,
            name: parsed.username,
            grade: parsed.grade ? (typeof parsed.grade === 'number' ? `Grade ${parsed.grade}` : parsed.grade) : 'Grade 7'
          };
        }
      } catch (e) {
        console.error('Failed to parse azilearn_arena_player', e);
      }
    } else if (studentStr) {
      try {
        const parsed = JSON.parse(studentStr);
        if (parsed.name) {
          activeStudent = {
            id: parsed.id || 'student-local',
            name: parsed.name,
            grade: parsed.grade || 'Grade 7'
          };
        }
      } catch (e) {
        console.error('Failed to parse student profile', e);
      }
    }

    if (activeStudent) {
      setStudentProfile(activeStudent);
      setScreen('subject_select');
      
      // 2. Load Local Progress fallback
      const savedProgress = localStorage.getItem(`story_progress_${activeStudent.id}`);
      if (savedProgress) {
        try {
          setProgressMap(JSON.parse(savedProgress));
        } catch (e) {
          console.error('Error loading story progress cache', e);
        }
      }

      // 3. Trigger Supabase Fetch
      fetchDatabaseData(activeStudent);
    } else {
      setScreen('setup');
    }
  }, []);

  const handleCreatePlayer = (username: string, selectedGrade: string) => {
    if (!username.trim()) {
      showToast('Please enter a username or nickname', 'error');
      return;
    }
    const numericGrade = parseInt(selectedGrade.replace(/\D/g, ''), 10) || 7;
    const newPlayer = {
      id: `p-${username.trim().toLowerCase()}-${Date.now()}`,
      username: username.trim(),
      grade: numericGrade
    };
    
    // Save to keys as requested
    localStorage.setItem('azilearn_player', JSON.stringify(newPlayer));
    localStorage.setItem('azilearn_arena_player', JSON.stringify(newPlayer));

    const activeStudent = {
      id: newPlayer.id,
      name: newPlayer.username,
      grade: `Grade ${numericGrade}`
    };

    setStudentProfile(activeStudent);
    setScreen('subject_select');
    fetchDatabaseData(activeStudent);
    showToast(`Welcome ${newPlayer.username}! Let's start the quest! ⚔️`, 'success');
  };

  // ─── DATABASE FETCHING ─────────────────────────────────────────────────────
  const fetchDatabaseData = async (student: { id: string; name: string; grade: string }) => {
    setLoading(true);
    try {
      const numericGrade = parseInt(student.grade.replace(/\D/g, ''), 10) || 7;
      console.log('Querying grade as integer:', numericGrade);
      
      // Attempt to load story subjects matching student grade joining story_characters
      // Securely matching both numerical or string representation of grade to avoid Postgres type mismatch errors
      let dbSubjects: any[] | null = null;
      let subError: any = null;

      try {
        // Try Option 1: Numeric Grade Query
        const { data, error } = await supabase
          .from('story_subjects')
          .select(`
            id,
            name,
            grade,
            story_title,
            story_characters (
              character_name,
              character_description,
              home_town,
              personality
            )
          `)
          .eq('grade', numericGrade);
        if (error) throw error;
        dbSubjects = data;
      } catch (err: any) {
        console.warn(`Querying subject matching integer grade ${numericGrade} failed, falling back to string query...`, err);
        // Try Option 2: String/Text Or check
        try {
          const { data, error } = await supabase
            .from('story_subjects')
            .select(`
              id,
              name,
              grade,
              story_title,
              story_characters (
                character_name,
                character_description,
                home_town,
                personality
              )
            `)
            .or(`grade.eq."${student.grade}",grade.eq."Grade ${numericGrade}"`);
          if (error) throw error;
          dbSubjects = data;
        } catch (err2: any) {
          subError = err2;
        }
      }

      if (!subError && dbSubjects && dbSubjects.length > 0) {
        console.log('Successfully fetched story subjects and heroes from Supabase:', dbSubjects);
        setSubjects(dbSubjects as StorySubject[]);
        console.log('subjects', dbSubjects); // Explicitly logged for developers/testers to inspect in browser console
      } else {
        if (subError) {
          console.error('Supabase fetch error for subjects:', subError);
        }
        // Fall back to prebuilt subjects filtered for current grade or Grade 7 default
        const filtered = PREBUILT_SUBJECTS.filter(s => s.grade === student.grade);
        const fallback = filtered.length > 0 ? filtered : PREBUILT_SUBJECTS;
        console.log('No matching DB subjects found or table unprovisioned. Falling back to prebuilt subjects:', fallback);
        setSubjects(fallback);
      }

      // Try fetching active student story progress mapping
      const { data: dbProgress, error: progError } = await supabase
        .from('student_story_progress')
        .select('*')
        .eq('student_id', student.id);

      if (!progError && dbProgress) {
        const map: Record<string, StudentStoryProgress> = {};
        dbProgress.forEach((p: any) => {
          map[p.subject_id] = {
            subject_id: p.subject_id,
            current_chapter_id: p.current_chapter_id,
            current_scene_number: p.current_scene_number,
            completed_chapters: p.completed_chapters || [],
            total_xp: p.total_xp || 0
          };
        });
        setProgressMap(map);
        localStorage.setItem(`story_progress_${student.id}`, JSON.stringify(map));
      }
    } catch (e) {
      console.warn('Supabase not available or tables unprovisioned. Using rich local storage.', e);
    } finally {
      setLoading(false);
    }
  };

  // ─── SYNC PROGRESS WITH SUPABASE & LOCAL ──────────────────────────────────
  const saveProgress = async (
    subjId: string, 
    chapId: string, 
    sceneNum: number, 
    isChapComplete: boolean,
    xpGained: number
  ) => {
    if (!studentProfile) {
      console.warn('Anonymous or undefined student profile. Bypassing progress save.');
      return;
    }

    setSyncing(true);
    
    // Copy current mapping
    const currentProgress = progressMap[subjId] || {
      subject_id: subjId,
      current_chapter_id: chapId,
      current_scene_number: 1,
      completed_chapters: [],
      total_xp: 0
    };

    const updatedCompleted_chapters = [...currentProgress.completed_chapters];
    if (isChapComplete && !updatedCompleted_chapters.includes(chapId)) {
      updatedCompleted_chapters.push(chapId);
    }

    const nextProgress: StudentStoryProgress = {
      subject_id: subjId,
      current_chapter_id: chapId,
      current_scene_number: sceneNum,
      completed_chapters: updatedCompleted_chapters,
      total_xp: currentProgress.total_xp + xpGained
    };

    const newMap = {
      ...progressMap,
      [subjId]: nextProgress
    };

    // Save to Local Cache
    setProgressMap(newMap);
    localStorage.setItem(`story_progress_${studentProfile.id}`, JSON.stringify(newMap));

    // Try pushing to Supabase
    try {
      const { error } = await supabase
        .from('student_story_progress')
        .upsert({
          student_id: studentProfile.id,
          subject_id: subjId,
          current_chapter_id: chapId,
          current_scene_number: sceneNum,
          completed_chapters: updatedCompleted_chapters,
          total_xp: nextProgress.total_xp,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,subject_id' });

      if (error) {
        console.warn('Supabase progress save bypassed:', error.message);
      }
    } catch (e) {
      console.warn('DB sync unavailable or tables unprovisioned. Progress preserved locally.');
    } finally {
      setSyncing(false);
    }
  };

  // ─── ACTION HANDLERS ───────────────────────────────────────────────────────
  
  const handleSelectSubject = async (sub: StorySubject) => {
    setSelectedSubject(sub);
    setLoading(true);

    if (!isValidUUID(sub.id)) {
      setChapters(PREBUILT_CHAPTERS[sub.id] || []);
      setLoading(false);
      setScreen('story_home');
      return;
    }

    try {
      let dbChapters: any[] = [];
      let finalError: any = null;

      // Pathway A: Direct subject_id query (Supporting user defined/migrated custom columns)
      try {
        const { data, error } = await supabase
          .from('story_chapters')
          .select('id, chapter_number, title, topic_covered, subject_id, description, total_scenes, xp_reward')
          .eq('subject_id', sub.id)
          .order('chapter_number', { ascending: true });
        
        if (!error && data && data.length > 0) {
          dbChapters = data;
        } else if (error) {
          throw error;
        }
      } catch (e1) {
        console.warn("Direct subject_id query failed in StoryQuest, trying direct select without extra columns...", e1);
        try {
          const { data, error } = await supabase
            .from('story_chapters')
            .select('id, chapter_number, title, description, total_scenes, xp_reward')
            .eq('subject_id', sub.id)
            .order('chapter_number', { ascending: true });
          
          if (!error && data && data.length > 0) {
            dbChapters = data;
          } else if (error) {
            throw error;
          }
        } catch (e2) {
          finalError = e2;
        }
      }

      // Pathway B: Relational query through 'stories' if we don't have chapters yet
      if (dbChapters.length === 0) {
        try {
          const { data: dbStories, error: storyErr } = await supabase
            .from('stories')
            .select('id')
            .eq('subject_id', sub.id);

          if (!storyErr && dbStories && dbStories.length > 0) {
            const storyIds = dbStories.map(s => s.id);
            const { data, error } = await supabase
              .from('story_chapters')
              .select('*')
              .in('story_id', storyIds)
              .order('chapter_number', { ascending: true });
            
            if (!error && data) {
              dbChapters = data;
            } else if (error) {
              throw error;
            }
          }
        } catch (storyQueryErr) {
          console.warn("Querying chapters through stories schema failed in StoryQuest...", storyQueryErr);
          finalError = storyQueryErr;
        }
      }

      // Pathway C: Fallback to story_id direct comparison
      if (dbChapters.length === 0) {
        try {
          const { data, error } = await supabase
            .from('story_chapters')
            .select('*')
            .eq('story_id', sub.id)
            .order('chapter_number', { ascending: true });
          
          if (!error && data) {
            dbChapters = data;
          } else if (error) {
            throw error;
          }
        } catch (directStoryErr) {
          console.warn("Direct story_id comparison query failed:", directStoryErr);
          finalError = directStoryErr;
        }
      }

      if (dbChapters && dbChapters.length > 0) {
        setChapters(dbChapters.map((c: any) => ({
          id: c.id,
          chapter_number: c.chapter_number,
          title: c.title,
          topic_covered: c.topic_covered || '',
          description: c.description || '',
          total_scenes: c.total_scenes || 3,
          xp_reward: c.xp_reward || 100
        })));
      } else {
        // Fall back to prebuilt
        const matchedSubId = getMatchingPrebuiltSubjectId(sub);
        const fallbackChaps = PREBUILT_CHAPTERS[matchedSubId] || [];
        setChapters(fallbackChaps);
      }
    } catch (e) {
      console.warn('Supabase query failed for chapters:', e);
      const matchedSubId = getMatchingPrebuiltSubjectId(sub);
      setChapters(PREBUILT_CHAPTERS[matchedSubId] || []);
    } finally {
      setLoading(false);
      setScreen('story_home');
    }
  };

  const handleStartChapter = async (chap: StoryChapter) => {
    setSelectedChapter(chap);
    setLoading(true);

    // Retrieve student progress for current subject
    const subProgress = progressMap[selectedSubject?.id || ''] || {
      current_chapter_id: chap.id,
      current_scene_number: 1,
      completed_chapters: []
    };

    const isCompleted = (subProgress.completed_chapters || []).includes(chap.id);

    // Let's decide starting scene number
    let initialSceneNum = 1;
    // If we are resumed into this selected chapter and NOT completed, grab progress.
    // If completed, we assume they clicked "Replay Quest" and thus we start fresh from scene 1.
    if (subProgress.current_chapter_id === chap.id && !isCompleted) {
      initialSceneNum = Math.min(subProgress.current_scene_number, chap.total_scenes);
    }

    if (!isValidUUID(chap.id)) {
      const prebuilt = PREBUILT_SCENES[chap.id] || [];
      // Deduplicate prebuilt scenes by scene_number
      const uniquePrebuilt: StoryScene[] = [];
      const seenPrebuiltNums = new Set<number>();
      for (const s of prebuilt) {
        if (!seenPrebuiltNums.has(s.scene_number)) {
          seenPrebuiltNums.add(s.scene_number);
          uniquePrebuilt.push(s);
        }
      }
      uniquePrebuilt.sort((a, b) => a.scene_number - b.scene_number);

      setScenes(uniquePrebuilt);
      const startIdx = Math.max(0, Math.min(initialSceneNum - 1, uniquePrebuilt.length - 1));
      setCurrentSceneIndex(startIdx);
      setActiveScene(uniquePrebuilt[startIdx] || null);
      setSelectedOption(null);
      setWrongAttempts(0);
      setIsAnswerSubmitted(false);
      setResultState(null);
      setLoading(false);
      setScreen('scene');
      return;
    }

    try {
      // Fetch scenes for this chapter from Supabase
      let dbScenes: any[] | null = null;
      let error: any = null;

      try {
        const res = await supabase
          .from('story_scenes')
          .select(`
            id, scene_number, narrative, setting_local,
            scene_questions (question_text, option_a, option_b, option_c, option_d, correct_option, explanation, response_correct, response_wrong)
          `)
          .eq('chapter_id', chap.id)
          .order('scene_number', { ascending: true });
        if (res.error) throw res.error;
        dbScenes = res.data;
      } catch (err: any) {
        console.warn(`Querying story_scenes with setting_local failed, falling back to query without setting_local...`, err);
        try {
          const res = await supabase
            .from('story_scenes')
            .select(`
              id, scene_number, narrative,
              scene_questions (question_text, option_a, option_b, option_c, option_d, correct_option, explanation, response_correct, response_wrong)
            `)
            .eq('chapter_id', chap.id)
            .order('scene_number', { ascending: true });
          if (res.error) throw res.error;
          dbScenes = res.data;
        } catch (err2) {
          error = err2;
        }
      }

      if (!error && dbScenes && dbScenes.length > 0) {
        const formattedScenes: StoryScene[] = dbScenes.map((s: any) => {
          const q = s.scene_questions ? (Array.isArray(s.scene_questions) ? (s.scene_questions.length > 0 ? s.scene_questions[0] : null) : s.scene_questions) : null;
          return {
            id: s.id,
            scene_number: s.scene_number,
            narrative: s.narrative,
            setting_local: s.setting_local || 'Kenyan Setting',
            question: q ? {
              question_text: q.question_text,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_option: q.correct_option as 'A' | 'B' | 'C' | 'D',
              explanation: q.explanation || '',
              response_correct: q.response_correct || '',
              response_wrong: q.response_wrong || ''
            } : undefined
          };
        });
        
        // Filter out any potential duplicate database scenes with the same scene_number
        const uniqueDbScenes: StoryScene[] = [];
        const seenDbNums = new Set<number>();
        for (const s of formattedScenes) {
          if (!seenDbNums.has(s.scene_number)) {
            seenDbNums.add(s.scene_number);
            uniqueDbScenes.push(s);
          }
        }
        uniqueDbScenes.sort((a, b) => a.scene_number - b.scene_number);

        setScenes(uniqueDbScenes);
        const startIdx = Math.max(0, Math.min(initialSceneNum - 1, uniqueDbScenes.length - 1));
        setCurrentSceneIndex(startIdx);
        setActiveScene(uniqueDbScenes[startIdx] || null);
      } else {
        // Fall back to prebuilt scenes
        const matchedChapId = isValidUUID(chap.id) 
          ? getMatchingPrebuiltChapterId(selectedSubject, chap.chapter_number)
          : chap.id;
        const prebuilt = PREBUILT_SCENES[matchedChapId] || [];
        const uniquePrebuilt: StoryScene[] = [];
        const seenPrebuiltNums = new Set<number>();
        for (const s of prebuilt) {
          if (!seenPrebuiltNums.has(s.scene_number)) {
            seenPrebuiltNums.add(s.scene_number);
            uniquePrebuilt.push(s);
          }
        }
        uniquePrebuilt.sort((a, b) => a.scene_number - b.scene_number);

        setScenes(uniquePrebuilt);
        const startIdx = Math.max(0, Math.min(initialSceneNum - 1, uniquePrebuilt.length - 1));
        setCurrentSceneIndex(startIdx);
        setActiveScene(uniquePrebuilt[startIdx] || null);
      }
    } catch (e) {
      const matchedChapId = isValidUUID(chap.id) 
        ? getMatchingPrebuiltChapterId(selectedSubject, chap.chapter_number)
        : chap.id;
      const prebuilt = PREBUILT_SCENES[matchedChapId] || [];
      const uniquePrebuilt: StoryScene[] = [];
      const seenPrebuiltNums = new Set<number>();
      for (const s of prebuilt) {
        if (!seenPrebuiltNums.has(s.scene_number)) {
          seenPrebuiltNums.add(s.scene_number);
          uniquePrebuilt.push(s);
        }
      }
      uniquePrebuilt.sort((a, b) => a.scene_number - b.scene_number);

      setScenes(uniquePrebuilt);
      const startIdx = Math.max(0, Math.min(initialSceneNum - 1, uniquePrebuilt.length - 1));
      setCurrentSceneIndex(startIdx);
      setActiveScene(uniquePrebuilt[startIdx] || null);
    } finally {
      setSelectedOption(null);
      setWrongAttempts(0);
      setIsAnswerSubmitted(false);
      setResultState(null);
      setLoading(false);
      setScreen('scene');
    }
  };

  const handleOptionSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (isAnswerSubmitted) return; // Answer locked
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !activeScene?.question) return;

    const correctOpt = activeScene.question.correct_option?.trim().toUpperCase();
    const isCorrect = selectedOption === correctOpt;

    setIsAnswerSubmitted(true);

    if (isCorrect) {
      setResultState('correct');
      showToast('Hakuna Matata! Correct Answer! 🌟', 'success');
      if (readingMode !== 'silent') {
        speakText(activeScene.question.response_correct || 'Hakuna Matata! Correct Answer! Excellent job.');
      }
    } else {
      setResultState('wrong');
      const updatedWrong = wrongAttempts + 1;
      setWrongAttempts(updatedWrong);
      showToast('Not quite right, let’s study our choices! 🧐', 'error');
      if (readingMode !== 'silent') {
        speakText(activeScene.question.response_wrong || 'Not quite right, let’s study our choices and try again!');
      }
    }

    setScreen('result');
  };

  const handleNextAction = () => {
    if (resultState === 'correct') {
      // ─── CORRECT ANSWER FLOW ───────────────────────────────────────────────
      const nextIdx = currentSceneIndex + 1;
      const gainedXp = wrongAttempts === 0 ? 30 : (wrongAttempts === 1 ? 15 : 5);

      if (nextIdx >= scenes.length) {
        // Chapter fully finished! Go to celebration screen immediately
        setScreen('chapter_complete');
        
        saveProgress(
          selectedSubject!.id, 
          selectedChapter!.id, 
          scenes.length, 
          true, 
          selectedChapter!.xp_reward
        ).catch(err => console.warn('Background chapter complete progress save bypassed:', err));
      } else {
        // More scenes left in this chapter - Transition screen state synchronously and immediately (snappy!)
        setCurrentSceneIndex(nextIdx);
        setActiveScene(scenes[nextIdx]);
        
        // Reset gameplay variables for next scene
        setSelectedOption(null);
        setWrongAttempts(0);
        setIsAnswerSubmitted(false);
        setResultState(null);
        setScreen('scene');

        // Fire asynchronous background progress sync, not blocking current screen
        saveProgress(
          selectedSubject!.id, 
          selectedChapter!.id, 
          nextIdx + 1, 
          false, 
          gainedXp
        ).catch(err => console.warn('Background gameplay progress save bypassed:', err));
      }
    } else {
      // ─── WRONG ANSWER FLOW / TRY AGAIN ───────────────────────────────
      setIsAnswerSubmitted(false);
      setSelectedOption(null);
      setResultState(null);
      setScreen('scene');
    }
  };

  const handleBackToChapters = () => {
    setScreen('story_home');
  };

  const handleNextChapter = () => {
    // Go back to the subject story selection hub
    setSelectedChapter(null);
    setScreen('story_home');
  };

  // Get active student completed chapters count for visual progress
  const getSubjectCompletedCount = (subjId: string): number => {
    const subProj = progressMap[subjId];
    return subProj ? subProj.completed_chapters.length : 0;
  };

  const getSubjectXp = (subjId: string): number => {
    const subProj = progressMap[subjId];
    return subProj ? subProj.total_xp : 0;
  };

  // Get chapter lock status
  const isChapterUnlocked = (subjId: string, chap: StoryChapter): boolean => {
    if (chap.chapter_number === 1) return true; // First chapter is always unlocked
    
    // Check if previous chapter number is complete
    const prevProj = progressMap[subjId];
    if (!prevProj) return false;
    
    // Look up chapters for previous chapter completion
    const matchedSubId = isValidUUID(subjId) ? getMatchingPrebuiltSubjectId(selectedSubject) : subjId;
    const chapList = PREBUILT_CHAPTERS[matchedSubId] || chapters || [];
    const prevChap = chapList.find(c => c.chapter_number === chap.chapter_number - 1);
    
    if (!prevChap) return true;
    return prevProj.completed_chapters.includes(prevChap.id);
  };

  const getChapterProgressText = (chap: StoryChapter): string => {
    const subProj = progressMap[selectedSubject?.id || ''];
    if (!subProj || subProj.current_chapter_id !== chap.id) {
      const isComplete = subProj?.completed_chapters.includes(chap.id);
      return isComplete ? `${chap.total_scenes}/${chap.total_scenes} scenes` : '0%' ;
    }
    return `${subProj.current_scene_number - 1}/${chap.total_scenes} scenes`;
  };

  // Helper mapping icon standard strings to Lucide components
  const getSubjectIcon = (iconStr: string) => {
    switch (iconStr) {
      case 'Compass': return <Compass className="w-5 h-5 text-tomato-500" />;
      case 'Star': return <Star className="w-5 h-5 text-[#FF6B00]" />;
      case 'Award': return <Award className="w-5 h-5 text-emerald-500" />;
      case 'Smile': return <Smile className="w-5 h-5 text-indigo-500" />;
      default: return <BookOpen className="w-5 h-5 text-[#FF6B00]" />;
    }
  };

  return (
    <div id="story-quest-root" className="w-full max-w-[420px] mx-auto min-h-screen bg-[#0A1628] text-white flex flex-col font-sans pb-10 shadow-2xl relative select-none">
      {/* HEADER SECTION */}
      <header className="p-4 border-b border-[#1A2E44] flex items-center justify-between bg-[#0F223A] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {screen !== 'subject_select' && (
            <button 
              onClick={() => {
                if (screen === 'story_home') setScreen('subject_select');
                else if (screen === 'scene' && !isAnswerSubmitted) {
                  if (confirm('Are you sure you want to exit the story game? Progress will be saved.')) {
                    setScreen('story_home');
                  }
                }
                else if (screen === 'chapter_complete') setScreen('story_home');
              }}
              className="w-8 h-8 rounded-full bg-[#1A2E44]/60 hover:bg-[#1A2E44] flex items-center justify-center transition-all shrink-0 active:scale-90"
            >
              <ChevronLeft size={16} className="text-[#FF6B00]" />
            </button>
          )}
          <div>
            <h1 className="text-sm font-black tracking-tight leading-tight uppercase text-white flex items-center gap-1">
              <span className="text-[#FF6B00]">Story</span> Quest
              <Sparkles size={12} className="text-[#FF6B00]" />
            </h1>
            <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-wider leading-none">Kenya CBC Grade 6-9</p>
          </div>
        </div>

        {/* PROFILE CHIPS / XP SCORE */}
        <div className="flex items-center gap-2">
          <div className="bg-[#1A2E44] border border-[#2D3748] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm shrink-0">
            <Trophy size={12} className="text-[#FF6B00]" />
            <span className="text-[10px] font-black tracking-tighter tabular-nums text-white">
              {Object.values(progressMap).reduce((sum: number, p: any) => sum + (p.total_xp || 0), 0)} XP
            </span>
          </div>

          <button 
            onClick={onBack}
            className="text-[10px] uppercase font-black tracking-widest text-[#FF6B00] hover:text-white transition-colors bg-[#FF6B00]/10 px-3 py-1.5 rounded-xl border border-[#FF6B00]/20 active:scale-95 shrink-0"
          >
            Exit
          </button>
        </div>
      </header>

      {/* RENDER ACTIVE SCREEN SCREEN */}
      <div className="flex-1 px-4 py-5 flex flex-col justify-between">
        
        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-3 py-20">
            <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
            <p className="text-[#A0AEC0] text-xs font-bold uppercase tracking-widest animate-pulse">Loading Magic Scroll...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ──────── SCREEN 0: QUICK IDENTITY SETUP ──────── */}
            {screen === 'setup' && (
              <motion.div
                key="setup_screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 flex-1 flex flex-col justify-center py-6 animate-fade-in"
              >
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles size={28} className="text-[#FF6B00]" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-sans font-black text-white uppercase tracking-tight">Enter the Quest</h2>
                    <p className="text-xs text-[#A0AEC0] px-6">
                      Choose a learning nickname and your grade to record progress, earn trophies, and track your XP rewards!
                    </p>
                  </div>
                </div>

                <div className="bg-[#0F223A] border border-[#1A2E44] p-5 rounded-3xl space-y-4 shadow-xl">
                  {/* Nickname Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-[#FF6B00] tracking-wider block">Nickname / Username</label>
                    <input 
                      type="text"
                      maxLength={18}
                      placeholder="e.g. Zawadi, Jasiri, Kofi"
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
                      className="w-full bg-[#0A1628] border border-[#1A2E44] rounded-2xl px-4 py-3 text-sm text-white placeholder-[#A0AEC0]/40 outline-none focus:border-[#FF6B00] transition-colors font-bold"
                    />
                  </div>

                  {/* Grade Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-[#FF6B00] tracking-wider block">Select Your Grade</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setSetupGrade(g)}
                          className={`py-3 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                            setupGrade === g
                              ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/10'
                              : 'bg-[#0A1628] border-[#1A2E44] text-[#A0AEC0] hover:border-[#2D3748]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleCreatePlayer(setupName, setupGrade)}
                    className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-[#FF6B00]/15 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span>Start Quest</span>
                    <ArrowRight size={14} />
                  </button>
                  
                  <button
                    onClick={onBack}
                    className="w-full py-2 bg-transparent text-[#A0AEC0] text-[10px] uppercase font-black tracking-widest hover:text-white transition-colors mt-2"
                  >
                    Go Back Home
                  </button>
                </div>
              </motion.div>
            )}

            {/* ──────── SCREEN 1: SUBJECT SELECT SCREEN ──────── */}
            {screen === 'subject_select' && (
              <motion.div
                key="subj_select_screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-5 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#FF6B00]/15 to-transparent p-4 rounded-2xl border border-[#FF6B00]/20 space-y-1">
                    <h2 className="text-sm font-black text-[#FF6B00] uppercase tracking-wider">Hi, {studentProfile.name}! 👋</h2>
                    <p className="text-xs text-[#CBD5E0] leading-relaxed">
                      Welcome to your Story Quest! Choose a subject below to join a local interactive learning story adventure that tests your CBC knowledge!
                    </p>
                    <div className="inline-flex items-center gap-1 bg-[#1A2E44] text-[#FF6B00] font-black text-[9px] uppercase px-2.5 py-1 rounded-full mt-2">
                      <Flame size={10} /> Active grade: {studentProfile.grade}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {subjects.map((sub) => {
                      const completeChaps = getSubjectCompletedCount(sub.id);
                      const subjXp = getSubjectXp(sub.id);
                      const isSelected = selectedSubject?.id === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubject(sub)}
                          className={`relative overflow-hidden p-4 rounded-2xl border text-left flex flex-col justify-between h-[135px] transition-all duration-300 active:scale-95 shadow-md ${
                            isSelected 
                              ? 'border-[#FF6B00] bg-gradient-to-b from-[#FF6B00]/10 to-[#0A1628] shadow-[#FF6B00]/15' 
                              : 'border-[#1A2E44] bg-[#0F223A] hover:bg-[#122A48]'
                          }`}
                        >
                          {/* Progress indicator */}
                          <div className="absolute top-0 left-0 h-1 bg-[#FF6B00]" style={{ width: `${(completeChaps / sub.total_chapters) * 100}%` }} />

                          <div className="w-full flex items-center justify-between">
                            <div className="w-8 h-8 rounded-xl bg-[#1A2E44] flex items-center justify-center shrink-0">
                              {getSubjectIcon(sub.icon)}
                            </div>
                            {subjXp > 0 && (
                              <div className="bg-emerald-500/10 text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                                +{subjXp} XP
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-sans font-black text-xs text-[#FF6B00] leading-tight uppercase tracking-tight">
                              {getStoryTitle(sub)}
                            </h3>
                            <p className="text-[10px] text-white font-bold">
                              ⭐ {getCharacter(sub).character_name}'s Story
                            </p>
                            <p className="text-[8.5px] text-[#A0AEC0] font-semibold flex items-center gap-1 mt-0.5">
                              <span>📍 {getCharacter(sub).home_town}</span>
                              <span className="opacity-40">•</span>
                              <span className="text-[7.5px] text-[#A0AEC0]/70 uppercase tracking-wider">{getSubjectName(sub)}</span>
                            </p>
                            <p className="text-[9px] text-[#A0AEC0] uppercase tracking-wider flex items-center gap-1.5 mt-1 font-semibold">
                              <span>{completeChaps}/{(sub.total_chapters || 1)} Chaps</span>
                              <span>•</span>
                              <span>{(sub.total_chapters || 1) > 0 && completeChaps === (sub.total_chapters || 1) ? 'Completed 🎉' : 'Active'}</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-center pt-5 border-t border-[#1A2E44]/60">
                  <p className="text-[10px] uppercase font-bold text-[#A0AEC0] tracking-widest leading-relaxed">
                    AziLearn game engine. Proudly localized for Kenyan primary schools.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ──────── SCREEN 2: STORY HOME SCREEN ──────── */}
            {screen === 'story_home' && selectedSubject && (
              <motion.div
                key="story_home_screen"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Subject Character Info banner */}
                  <div className="bg-[#0F223A] border border-[#1A2E44] p-4 rounded-2xl text-center space-y-3 shadow-lg relative overflow-hidden">
                    <div className="w-16 h-16 bg-gradient-to-tr from-[#FF6B00] to-orange-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                      <span className="text-2xl">🦸</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-2.5 py-0.5 rounded-full">
                        {getStoryTitle(selectedSubject)} Key Hook
                      </span>
                      <h2 className="text-base font-black text-white">{getCharacter(selectedSubject).character_name}</h2>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#A0AEC0] mt-0.5">Hometown: {getCharacter(selectedSubject).home_town}</p>
                      <p className="text-xs text-[#CBD5E0] px-4 leading-relaxed font-sans mt-1.5">{getCharacter(selectedSubject).character_description}</p>
                    </div>
                  </div>

                  {/* Chapter List Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A0AEC0] flex items-center gap-1.5">
                      <BookOpen size={12} className="text-[#FF6B00]" /> Chapters Available
                    </h3>
                    <span className="text-[9px] tracking-widest uppercase font-black text-[#FF6B00]">{chapters.length} quests</span>
                  </div>

                  {/* Chapters Container */}
                  <div className="space-y-3">
                    {chapters.map((chap) => {
                      const unlocked = isChapterUnlocked(selectedSubject.id, chap);
                      const isCompleted = (progressMap[selectedSubject.id]?.completed_chapters || []).includes(chap.id);
                      const subPro = progressMap[selectedSubject.id];
                      const canContinue = subPro && subPro.current_chapter_id === chap.id && subPro.current_scene_number > 0 && subPro.current_scene_number <= chap.total_scenes;

                      return (
                        <div
                          key={chap.id}
                          className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-3 shadow-md ${
                            unlocked 
                              ? isCompleted 
                                ? 'border-emerald-500/20 bg-[#0F223A]/80' 
                                : 'border-[#FF6B00]/30 bg-gradient-to-r from-[#0F223A] to-[#122A48]'
                              : 'border-[#1A2E44] bg-[#0A1628]/40 opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase text-[#FF6B00] tracking-widest">Chapter {chap.chapter_number}</span>
                              <h4 className="text-xs font-black text-white leading-snug">{chap.title}</h4>
                              <p className="text-[11px] text-[#A0AEC0] leading-relaxed">{chap.description}</p>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1">
                              {unlocked ? (
                                isCompleted ? (
                                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <Check size={14} />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                                    <Unlock size={12} />
                                  </div>
                                )
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
                                  <Lock size={12} />
                                </div>
                              )}
                              <span className="text-[7px] uppercase font-bold tracking-widest text-[#A0AEC0] block pt-3 mt-auto">{getChapterProgressText(chap)}</span>
                            </div>
                          </div>

                          {/* Progress Bar inside card */}
                          {unlocked && (
                            <div className="w-full bg-[#1A2E44] h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#FF6B00] transition-all duration-300"
                                style={{
                                  width: isCompleted 
                                    ? '100%' 
                                    : subPro && subPro.current_chapter_id === chap.id 
                                      ? `${((subPro.current_scene_number - 1) / chap.total_scenes) * 100}%` 
                                      : '0%'
                                }}
                              />
                            </div>
                          )}

                          {unlocked && (
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1 bg-[#1A2E44] px-2 py-0.5 rounded-full">
                                <Award size={10} className="text-yellow-500" />
                                <span className="text-[8px] font-bold uppercase text-white tracking-widest">{chap.xp_reward} XP Reward</span>
                              </div>

                              <button
                                onClick={() => handleStartChapter(chap)}
                                className={`px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-all ${
                                  isCompleted 
                                    ? 'bg-[#1A2E44]/60 border border-emerald-500/30 text-emerald-400' 
                                    : 'bg-[#FF6B00] text-white'
                                }`}
                              >
                                {isCompleted ? 'Replay Quest' : canContinue ? 'Continue' : 'Start Quest'}
                                <ArrowRight size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-center pt-5">
                  <button
                    onClick={() => setScreen('subject_select')}
                    className="text-[10px] font-black tracking-widest text-[#FF6B00] uppercase hover:underline"
                  >
                    ← Change Subject
                  </button>
                </div>
              </motion.div>
            )}

            {/* ──────── SCREEN 3: SCENE SCREEN (Main Gameplay) ──────── */}
            {screen === 'scene' && activeScene && selectedChapter && (
              <motion.div
                key="scene_screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 flex-1 flex flex-col justify-between"
              >
                {/* Top Section: Chapter title + scene progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[#A0AEC0] text-[9px] font-black uppercase tracking-widest">
                    <span>{selectedChapter.title}</span>
                    <span className="text-[#FF6B00]">Scene {activeScene.scene_number} of {selectedChapter.total_scenes}</span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-[#1A2E44] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF6B00] to-orange-400 transition-all duration-300"
                      style={{ width: `${(activeScene.scene_number / selectedChapter.total_scenes) * 100}%` }}
                    />
                  </div>

                  {/* Location Tag */}
                  {activeScene.setting_local && (
                    <div className="inline-flex items-center gap-1 bg-[#FF6B00]/10 border border-[#FF6B00]/20 px-2 py-0.5 rounded-md">
                      <span className="text-[8px] font-black text-[#FF6B00] uppercase tracking-wider">📍 Setting: {activeScene.setting_local}</span>
                    </div>
                  )}
                </div>

                {/* Reading Comfort and Audio Speed Settings Panel */}
                <div className="bg-[#0A1628]/80 backdrop-blur border border-[#1A2E44]/80 p-3 rounded-2xl space-y-2 select-none shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black tracking-widest text-[#A0AEC0] flex items-center gap-1.5 font-sans">
                      <Settings size={11} className="text-[#FF6B00]" />
                      Reading Comfort Settings
                    </span>
                    <span className="text-[8px] font-mono text-[#CBD5E0]/60">Customize sensory pace</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {/* OPTION 1: Word highlight & speed control */}
                    <button
                      onClick={() => changeReadingMode('animate-speed')}
                      className={`py-1.5 px-1 rounded-xl border text-[8.5px] font-black uppercase tracking-wider text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] cursor-pointer ${
                        readingMode === 'animate-speed'
                          ? 'border-[#FF6B00]/80 bg-[#FF6B00]/10 text-white shadow-md shadow-[#FF6B00]/5'
                          : 'border-[#1A2E44]/60 bg-[#0F223A]/30 text-[#A0AEC0] hover:text-white hover:bg-[#0F223A]/50'
                      }`}
                    >
                      <Sparkles size={12} className={readingMode === 'animate-speed' ? 'text-[#FF6B00]' : ''} />
                      <span>Highlight & Speed</span>
                    </button>

                    {/* OPTION 2: Pure Google TTS with NO word highlight */}
                    <button
                      onClick={() => changeReadingMode('static-audio')}
                      className={`py-1.5 px-1 rounded-xl border text-[8.5px] font-black uppercase tracking-wider text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] cursor-pointer ${
                        readingMode === 'static-audio'
                          ? 'border-amber-500/80 bg-amber-500/10 text-white shadow-md'
                          : 'border-[#1A2E44]/60 bg-[#0F223A]/30 text-[#A0AEC0] hover:text-white hover:bg-[#0F223A]/50'
                      }`}
                    >
                      <Volume2 size={12} className={readingMode === 'static-audio' ? 'text-amber-400' : ''} />
                      <span>Smooth Audio Only</span>
                    </button>

                    {/* OPTION 3: Silent Reading */}
                    <button
                      onClick={() => changeReadingMode('silent')}
                      className={`py-1.5 px-1 rounded-xl border text-[8.5px] font-black uppercase tracking-wider text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] cursor-pointer ${
                        readingMode === 'silent'
                          ? 'border-emerald-500/80 bg-emerald-500/10 text-white shadow-md'
                          : 'border-[#1A2E44]/60 bg-[#0F223A]/30 text-[#A0AEC0] hover:text-white hover:bg-[#0F223A]/50'
                      }`}
                    >
                      <BookOpen size={12} className={readingMode === 'silent' ? 'text-emerald-400' : ''} />
                      <span>Normal Silent</span>
                    </button>
                  </div>

                  {/* Speed options if highlighted reading mode is active */}
                  {readingMode === 'animate-speed' && (
                    <div className="bg-[#0F223A]/40 rounded-xl px-2.5 py-1.5 border border-[#1A2E44]/50 flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1 text-[8px] font-black text-[#CBD5E0]/80 uppercase tracking-widest">
                        <Sliders size={10} className="text-[#FF6B00]" />
                        Reading Rate:
                      </div>
                      <div className="flex items-center gap-1">
                        {[
                          { val: 0.65, label: 'Slow 🐢' },
                          { val: 0.9, label: 'Normal 🧑' },
                          { val: 1.2, label: 'Fast 🚀' },
                        ].map((pace) => {
                          const isSel = Math.abs(speechRate - pace.val) < 0.1;
                          return (
                            <button
                              key={pace.val}
                              onClick={() => changeSpeechRate(pace.val)}
                              className={`px-2 py-0.5 rounded text-[8px] font-sans font-black transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-[#FF6B00] text-white'
                                  : 'bg-[#1A2E44]/60 text-[#CBD5E0]/60 hover:bg-[#1A2E44]/80'
                              }`}
                            >
                              {pace.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {readingMode === 'static-audio' && (
                    <div className="bg-[#0F223A]/40 rounded-xl px-2.5 py-1 border border-[#1A2E44]/50 text-center">
                      <span className="text-[8px] font-sans font-bold text-[#CBD5E0]/70 tracking-wide block">
                        🔊 Google Read-Aloud is active. Text remains fully readable & static.
                      </span>
                    </div>
                  )}

                  {readingMode === 'silent' && (
                    <div className="bg-[#0F223A]/40 rounded-xl px-2.5 py-1 border border-[#1A2E44]/50 text-center">
                      <span className="text-[8px] font-sans font-bold text-emerald-400/80 tracking-wide block">
                        📖 Silent Mode. Read the paragraph comfortably at your own pace.
                      </span>
                    </div>
                  )}
                </div>

                {/* Middle Section: Narrative Text in Styled Story Card (Looks like a Book Page) */}
                <div className="flex-1 my-3 flex flex-col justify-center">
                  <div className="bg-[#FFFDF5] text-[#1A2530] p-5 rounded-2xl border border-[#E2E8F0] shadow-xl relative overflow-hidden flex flex-col justify-between" style={{ minHeight: '180px' }}>
                    {/* Corner Page Accents to simulate book */}
                    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#E2E8F0] to-[#FFFDF5] rounded-bl-xl border-l border-b border-[#E2E8F0]/80 shadow-inner" />
                    
                    {/* Story Content */}
                    <div className="font-serif text-[13.5px] leading-relaxed select-text pr-2 py-1 text-slate-800 tracking-wide">
                      {(() => {
                        const sentences = getSentencesWithIndices(activeScene.narrative);
                        const isAnySentenceActive = isReading && currentReadingText === activeScene.narrative && readingMode === 'animate-speed';
                        return (
                          <span>
                            {sentences.map((item, idx) => {
                              const isSentenceActive = isReading && 
                                                   currentReadingText === activeScene.narrative && 
                                                   readingMode === 'animate-speed' &&
                                                   currentCharIndex !== null && 
                                                   currentCharIndex >= item.start && 
                                                   currentCharIndex < item.end;
                              return (
                                <motion.span
                                  key={idx}
                                  className={`inline mr-1 px-1 rounded-md transition-all duration-300 ${
                                    isSentenceActive 
                                      ? 'bg-[#FF6B00]/20 text-[#FF6B00] font-bold border-l-2 border-[#FF6B00] shadow-sm' 
                                      : isAnySentenceActive
                                        ? 'opacity-40 text-slate-400 font-normal'
                                        : 'text-[#1A2530] font-medium'
                                  }`}
                                  animate={isSentenceActive ? { 
                                    scale: [1, 1.01, 1],
                                  } : { 
                                    scale: 1,
                                  }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {item.text}
                                </motion.span>
                              );
                            })}
                          </span>
                        );
                      })()}
                    </div>

                    {readingMode !== 'silent' && (
                      <div className="w-full flex items-center justify-between pt-3 border-t border-[#E2E8F0]/40 mt-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {readingMode === 'animate-speed' ? (
                            // Pure visual tracker guide buttons (completely silent)
                            <>
                              <button
                                onClick={() => {
                                  if (!isReading) {
                                    startVisualHighlight(activeScene.narrative);
                                  } else if (isPaused) {
                                    setIsPaused(false);
                                    startVisualHighlight(activeScene.narrative, currentCharIndex || 0);
                                  } else {
                                    setIsPaused(true);
                                    if (fallbackTimeoutRef.current) {
                                      clearTimeout(fallbackTimeoutRef.current);
                                      fallbackTimeoutRef.current = null;
                                    }
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                                  isReading 
                                    ? isPaused 
                                      ? 'bg-amber-500 text-white' 
                                      : 'bg-indigo-600 text-white animate-pulse' 
                                    : 'bg-[#FF6B00] text-white hover:bg-orange-600 shadow-[#FF6B00]/10'
                                }`}
                              >
                                <span>
                                  {isReading 
                                    ? isPaused 
                                      ? '▶️ Resume Guide' 
                                      : '⏸️ Pause Guide' 
                                    : '🎬 Play Visual Guide'
                                  }
                                </span>
                              </button>

                              <button
                                onClick={stopSpeech}
                                className="px-2.5 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide bg-[#0A1628] text-white border border-[#1A2E44]/30 hover:bg-slate-900 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                              >
                                <span>⏹ Stop Guide</span>
                              </button>
                            </>
                          ) : (
                            // Pure Google TTS controllers with audio labels & sound icon
                            <>
                              <button
                                onClick={() => {
                                  if (!isReading) {
                                    speakText(activeScene.narrative);
                                  } else if (isPaused) {
                                    if (window.speechSynthesis) window.speechSynthesis.resume();
                                    setIsPaused(false);
                                  } else {
                                    if (window.speechSynthesis) window.speechSynthesis.pause();
                                    setIsPaused(true);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                                  isReading 
                                    ? isPaused 
                                      ? 'bg-amber-500 text-white' 
                                      : 'bg-red-500 text-white animate-pulse' 
                                    : 'bg-[#FF6B00] text-white hover:bg-orange-600 shadow-[#FF6B00]/10'
                                }`}
                              >
                                <span>
                                  {isReading 
                                    ? isPaused 
                                      ? '▶️ Resume Audio' 
                                      : '⏸️ Pause Audio' 
                                    : '🔊 Read Aloud'
                                  }
                                </span>
                              </button>

                              <button
                                onClick={stopSpeech}
                                className="px-2.5 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide bg-[#0A1628] text-white border border-[#1A2E44]/30 hover:bg-slate-900 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                              >
                                <span>⏹ Stop Audio</span>
                              </button>
                            </>
                          )}
                        </div>
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-[#A0AEC0] font-mono">
                          {readingMode === 'animate-speed' ? 'Visual Tracker Guide' : 'Speech Synthesis'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Multiple Choice Questions (A B C D) */}
                {activeScene.question && (
                  <div className="space-y-3">
                    <div className="bg-[#0F223A] border border-[#1A2E44] p-3.5 rounded-2xl space-y-2">
                      <div className="flex items-start gap-1.5">
                        <HelpCircle size={15} className="text-[#FF6B00] shrink-0 mt-0.5" />
                        <h4 className="text-[11.5px] font-extrabold text-white leading-normal pr-1">{activeScene.question.question_text}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'A', text: activeScene.question.option_a },
                        { label: 'B', text: activeScene.question.option_b },
                        { label: 'C', text: activeScene.question.option_c },
                        { label: 'D', text: activeScene.question.option_d },
                      ].map((opt) => {
                        const isChosen = selectedOption === opt.label;
                        
                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleOptionSelect(opt.label as any)}
                            className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all active:scale-[0.98] ${
                              isChosen 
                                ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-white shadow-md' 
                                : 'border-[#1A2E44] bg-[#0F223A] text-[#E2E8F0] hover:bg-[#122A48]'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-lg font-black text-[10px] flex items-center justify-center shrink-0 border ${
                              isChosen 
                                ? 'bg-[#FF6B00] border-[#FF6B00] text-white' 
                                : 'bg-[#1A2E44] border-[#2D3748] text-[#A0AEC0]'
                            }`}>
                              {opt.label}
                            </span>
                            <span className="text-[11px] leading-tight font-sans font-bold pt-[2px]">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit Button */}
                    <button
                      disabled={!selectedOption}
                      onClick={handleSubmitAnswer}
                      className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                        selectedOption 
                          ? 'bg-[#FF6B00] text-white shadow-[#FF6B00]/10' 
                          : 'bg-[#1A2E44] text-[#A0AEC0] cursor-not-allowed'
                      }`}
                    >
                      <span>Submit Answer</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ──────── SCREEN 4: RESULT SCREEN ──────── */}
            {screen === 'result' && activeScene?.question && (
              <motion.div
                key="result_screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col justify-between py-4"
              >
                <div className="space-y-6 text-center my-auto">
                  
                  {resultState === 'correct' ? (
                    /* CORRECT RESULTS CANVAS */
                    <div className="space-y-5">
                      <div className="w-20 h-20 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-3xl flex items-center justify-center mx-auto animate-bounce relative">
                        <CheckCircle2 size={48} className="text-[#FF6B00]" />
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF6B00] flex items-center justify-center text-white"
                        >
                          <Star size={10} />
                        </motion.div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black text-[#A0AEC0] tracking-widest block">Studied & Solved</span>
                        <h2 className="text-xl font-sans font-black text-white uppercase tracking-tight">Kazi safi! Excellent Job!</h2>
                        <div className="text-[#CBD5E0] text-[13px] px-6 leading-relaxed mt-2 italic bg-[#0F223A] border border-[#1A2E44] py-3.5 rounded-2xl select-text tracking-wide">
                          {(() => {
                            const responseText = activeScene.question.response_correct || 'Hakuna Matata! Correct Answer! Excellent job.';
                            const sentences = getSentencesWithIndices(responseText);
                            const isAnySentenceActive = isReading && currentReadingText === responseText && readingMode === 'animate-speed';
                            return (
                              <span>
                                {sentences.map((item, idx) => {
                                  const isSentenceActive = isReading && 
                                                       currentReadingText === responseText && 
                                                       readingMode === 'animate-speed' &&
                                                       currentCharIndex !== null && 
                                                       currentCharIndex >= item.start && 
                                                       currentCharIndex < item.end;
                                  return (
                                    <motion.span
                                      key={idx}
                                      className={`inline mr-1 px-1 rounded-md transition-all duration-300 ${
                                        isSentenceActive 
                                          ? 'bg-[#FF6B00]/30 text-[#FFA04D] font-bold border-l-2 border-[#FF6B00] shadow-sm' 
                                          : isAnySentenceActive
                                            ? 'opacity-40 text-slate-500 font-normal'
                                            : 'text-[#CBD5E0] font-medium'
                                      }`}
                                      animate={isSentenceActive ? { 
                                        scale: [1, 1.01, 1],
                                      } : { 
                                        scale: 1,
                                      }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      {item.text}
                                    </motion.span>
                                  );
                                })}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* XP Badge */}
                      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-inner">
                        <Flame size={14} className="text-emerald-400 animate-pulse" />
                        <span className="text-[#FFF] font-black text-xs uppercase tracking-wider">{wrongAttempts === 0 ? '+30 XP PERFECT' : wrongAttempts === 1 ? '+15 XP GAINED' : '+5 XP LEVEL'}</span>
                      </div>
                    </div>
                  ) : (
                    /* WRONG RESULTS CANVAS */
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                        <XCircle size={48} className="text-red-500" />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black text-[#A0AEC0] tracking-widest block">Wrong Answer</span>
                        <h2 className="text-xl font-sans font-black text-white uppercase tracking-tight">Let's Try Again!</h2>
                        <div className="text-[#CBD5E0] text-[13px] px-6 leading-relaxed mt-2 italic bg-[#1A2E44]/30 border border-[#2D3748] py-3.5 rounded-2xl select-text tracking-wide">
                          {(() => {
                            const responseText = activeScene.question.response_wrong || 'Not quite right, let’s study our choices and try again!';
                            const sentences = getSentencesWithIndices(responseText);
                            const isAnySentenceActive = isReading && currentReadingText === responseText && readingMode === 'animate-speed';
                            return (
                              <span>
                                {sentences.map((item, idx) => {
                                  const isSentenceActive = isReading && 
                                                       currentReadingText === responseText && 
                                                       readingMode === 'animate-speed' &&
                                                       currentCharIndex !== null && 
                                                       currentCharIndex >= item.start && 
                                                       currentCharIndex < item.end;
                                  return (
                                    <motion.span
                                      key={idx}
                                      className={`inline mr-1 px-1 rounded-md transition-all duration-300 ${
                                        isSentenceActive 
                                          ? 'bg-red-500/30 text-red-400 font-bold border-l-2 border-red-500 shadow-sm' 
                                          : isAnySentenceActive
                                            ? 'opacity-40 text-slate-500 font-normal'
                                            : 'text-[#CBD5E0] font-medium'
                                      }`}
                                      animate={isSentenceActive ? { 
                                        scale: [1, 1.01, 1],
                                      } : { 
                                        scale: 1,
                                      }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      {item.text}
                                    </motion.span>
                                  );
                                })}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Show Explanation immediately or after 2nd wrong attempt */}
                      {wrongAttempts >= 1 && (
                        <div className="bg-[#1A2E44]/40 border border-[#2D3748] p-4 rounded-2xl text-left space-y-2 max-h-[180px] overflow-y-auto">
                          <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                            <BookOpen size={10} /> Explanations & Study Key:
                          </h4>
                          <p className="text-[#CBD5E0] text-[11px] leading-relaxed">
                            {activeScene.question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Return or Continue Actions Button */}
                <div className="space-y-2">
                  <button
                    onClick={handleNextAction}
                    className={`w-full py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                      resultState === 'correct' 
                        ? 'bg-[#FF6B00] text-white shadow-[#FF6B00]/10' 
                        : 'bg-red-500 text-white shadow-red-500/10'
                    }`}
                  >
                    <span>{resultState === 'correct' ? 'Continue Story' : 'Try Again'}</span>
                    <ArrowRight size={14} />
                  </button>
                  
                  {/* Exit during results is safe */}
                  <button 
                    onClick={handleBackToChapters}
                    className="w-full py-2 bg-transparent text-[#A0AEC0] text-[10px] uppercase font-black tracking-widest hover:text-white transition-colors"
                  >
                    Exit Quest to Chapter Hub
                  </button>
                </div>
              </motion.div>
            )}

            {/* ──────── SCREEN 5: CHAPTER COMPLETE SCREEN ──────── */}
            {screen === 'chapter_complete' && selectedChapter && (
              <motion.div
                key="chapter_comp_screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col justify-between py-6 text-center"
              >
                <div className="my-auto space-y-6">
                  {/* Confetti Visual Mock */}
                  <div className="relative w-24 h-24 mx-auto bg-gradient-to-tr from-yellow-500 to-orange-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
                    <Trophy className="text-white animate-bounce" size={48} />
                    {/* Stars visual effect */}
                    <span className="absolute top-0 right-0 text-xl animate-spin">✨</span>
                    <span className="absolute bottom-2 left-0 text-lg">🌟</span>
                    <span className="absolute top-3 left-1 text-base">⭐</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-black text-[#FF6B00] tracking-widest block">Quest Finished</span>
                    <h2 className="text-xl font-sans font-black text-white uppercase tracking-tight">Chapter Complete!</h2>
                    <p className="text-xs text-[#CBD5E0] px-4 leading-relaxed mt-1">
                      Outstanding work seeker! You successfully guided <span className="text-[#FF6B00] font-black">{getCharacter(selectedSubject).character_name}</span> through <span className="text-white font-bold">"{selectedChapter.title}"</span>. Together you protected local communities while mastering key topics.
                    </p>
                  </div>

                  <div className="bg-[#0F223A] border border-[#1A2E44] p-4 rounded-3xl inline-flex flex-col items-center gap-1 shadow-md">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#A0AEC0]">Trophy Chest Reward</span>
                    <p className="text-3xl font-black text-[#FF6B00] flex items-center justify-center gap-1 tabular-nums">
                      +{selectedChapter.xp_reward} <span className="text-xs uppercase text-white font-bold">XP</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleNextChapter}
                    className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-[#FF6B00]/15 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span>Next Chapter</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setScreen('subject_select')}
                    className="w-full py-2 bg-transparent text-[#A0AEC0] text-[10px] uppercase font-black tracking-widest hover:text-white transition-colors"
                  >
                    View Other Subject Stories
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
