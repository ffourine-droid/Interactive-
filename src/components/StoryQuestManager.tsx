import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Sparkles, 
  BookOpen, 
  Trash2, 
  Loader2, 
  Upload, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  FileJson,
  HelpCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface StorySubject {
  id: string;
  name: string;
  grade: number | string;
  story_title: string;
}

interface StoryChapter {
  id: string;
  chapter_number: number;
  title: string;
  topic_covered?: string;
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

interface ParsedScene {
  scene_number: number;
  narrative: string;
  setting_local?: string;
  question: SceneQuestion;
}

export default function StoryQuestManager() {
  // Brand Toast or Local Status Notification
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selections state
  const [selectedGrade, setSelectedGrade] = useState<number>(7);
  const [subjectsList, setSubjectsList] = useState<StorySubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [chaptersList, setChaptersList] = useState<StoryChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Editor states
  const [jsonInput, setJsonInput] = useState<string>('');
  const [parsedScenes, setParsedScenes] = useState<ParsedScene[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Status/Loader states
  const [fetchingSubjects, setFetchingSubjects] = useState<boolean>(false);
  const [fetchingChapters, setFetchingChapters] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [existingScenes, setExistingScenes] = useState<any[]>([]);
  const [fetchingExisting, setFetchingExisting] = useState<boolean>(false);
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({});

  // Seed standard database structure for Grade 6-9 Story Quest
  const seedDefaultStructure = async () => {
    setSeeding(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // 1. Double check: are there already subjects? If user wants to clean and reset, we'll proceed
      const SEED_DATA = [
        {
          grade: "Grade 7",
          name: "Business Studies",
          story_title: "Mama Mboga's Venture",
          icon: "Compass",
          character: {
            character_name: "Zawadi",
            character_description: "An enterprising 14-year-old helping her mother improve their small kiosk in Mombasa Old Town.",
            home_town: "Mombasa",
            personality: "Enterprising and helpful"
          },
          chapters: [
            { chapter_number: 1, title: "Introduction to Business Studies", description: "Discover what a business is, and the main components of Business Studies." },
            { chapter_number: 2, title: "Money and Financial Services", description: "Discover currency and banking history." }
          ]
        },
        {
          grade: "Grade 7",
          name: "Agriculture",
          story_title: "The Water Oasis",
          icon: "Sprout",
          character: {
            character_name: "Karanja",
            character_description: "An innovative youth in Karatina who constructs organic vertical gardens to defeat drought.",
            home_town: "Karatina",
            personality: "Resourceful and green-fingered"
          },
          chapters: [
            { chapter_number: 1, title: "Introduction to Agriculture", description: "Farming principles in Kenya." }
          ]
        },
        {
          grade: "Grade 6",
          name: "Science & Technology",
          story_title: "The Innovators of Kimbo",
          icon: "Cpu",
          character: {
            character_name: "Bakhita",
            character_description: "A bright learner in Ruiru exploring safe local water testing and electronic recycling.",
            home_town: "Ruiru",
            personality: "Inquisitive and safety-conscious"
          },
          chapters: [
            { chapter_number: 1, title: "Coding and Basic Robotics", description: "Digital literacy under CBC." }
          ]
        },
        {
          grade: "Grade 8",
          name: "Social Studies",
          story_title: "Journey to Great Rift",
          icon: "Map",
          character: {
            character_name: "Lola",
            character_description: "An adventurous student exploring the historical structures and physical features of East Africa.",
            home_town: "Eldoret",
            personality: "Curious and observational"
          },
          chapters: [
            { chapter_number: 1, title: "Physical Environment of East Africa", description: "Geological formations and weathering." }
          ]
        },
        {
          grade: "Grade 9",
          name: "Creative Arts",
          story_title: "Beats of Kisumu",
          icon: "Music",
          character: {
            character_name: "Otieno",
            character_description: "A talented sound recorder capturing indigenous instruments and making digital loops.",
            home_town: "Kisumu",
            personality: "Artistic and expressive"
          },
          chapters: [
            { chapter_number: 1, title: "Indigenous Kenyan Instruments", description: "Harmonies of string and percussion." }
          ]
        }
      ];

      for (const item of SEED_DATA) {
        // Find or create subject
        const numericGrade = parseInt(item.grade.replace(/\D/g, ''), 10) || 7;
        let existingSub = null;

        try {
          const { data, error } = await supabase
            .from('story_subjects')
            .select('id')
            .eq('name', item.name)
            .eq('grade', item.grade)
            .maybeSingle();
          if (error) throw error;
          existingSub = data;
        } catch (err: any) {
          console.warn(`Querying subject with string grade "${item.grade}" failed, retrying with numeric grade "${numericGrade}"...`, err);
          try {
            const { data, error } = await supabase
              .from('story_subjects')
              .select('id')
              .eq('name', item.name)
              .eq('grade', numericGrade)
              .maybeSingle();
            if (error) throw error;
            existingSub = data;
          } catch (err2: any) {
            console.error('Field/type mismatch querying story_subjects:', err2);
          }
        }

        let subjectId = existingSub?.id;

        if (!subjectId) {
          let newSub = null;
          let subErr = null;

          // Permutations of [useNumericGrade: boolean, columns: string[]] to try
          const trials = [
            // Try String Grade Options
            { useNumeric: false, columns: ['icon', 'total_chapters'] },
            { useNumeric: false, columns: ['total_chapters'] },
            { useNumeric: false, columns: ['icon'] },
            { useNumeric: false, columns: [] },

            // Try Numeric Grade Options
            { useNumeric: true, columns: ['icon', 'total_chapters'] },
            { useNumeric: true, columns: ['total_chapters'] },
            { useNumeric: true, columns: ['icon'] },
            { useNumeric: true, columns: [] },
          ];

          for (const trial of trials) {
            try {
              const payload: any = {
                name: item.name,
                grade: trial.useNumeric ? numericGrade : item.grade,
                story_title: item.story_title,
              };
              if (trial.columns.includes('icon')) payload.icon = item.icon;
              if (trial.columns.includes('total_chapters')) payload.total_chapters = item.chapters.length;

              const res = await supabase
                .from('story_subjects')
                .insert(payload)
                .select('id')
                .maybeSingle();

              if (!res.error && res.data) {
                newSub = res.data;
                break; // Found a working configuration!
              }
              if (res.error) subErr = res.error;
            } catch (err: any) {
              subErr = err;
            }
          }

          if (!newSub && subErr) {
            console.error("All insertion options for story_subjects failed:", subErr);
            throw subErr;
          }

          if (newSub) {
            subjectId = newSub.id;
          } else {
            throw new Error("Could not find or create subject ID");
          }
        }

        // Check if character profile exists
        const { data: existingChar } = await supabase
          .from('story_characters')
          .select('id')
          .eq('subject_id', subjectId)
          .maybeSingle();

        if (!existingChar) {
          await supabase
            .from('story_characters')
            .insert({
              subject_id: subjectId,
              character_name: item.character.character_name,
              character_description: item.character.character_description,
              home_town: item.character.home_town,
              personality: item.character.personality
            });
        }

        // Find or create parent story mapping
        const { data: existingStory } = await supabase
          .from('stories')
          .select('id')
          .eq('subject_id', subjectId)
          .maybeSingle();

        let storyId = existingStory?.id;

        if (!storyId) {
          const { data: newStory, error: storyErr } = await supabase
            .from('stories')
            .insert({
              subject_id: subjectId,
              title: item.story_title,
              description: item.character.character_description
            })
            .select('id');

          if (storyErr) throw storyErr;
          
          if (newStory && newStory.length > 0) {
            storyId = newStory[0].id;
          } else {
            // Re-fetch to be absolutely certain
            const { data: refetched } = await supabase
              .from('stories')
              .select('id')
              .eq('subject_id', subjectId)
              .maybeSingle();
            storyId = refetched?.id;
          }

          if (!storyId) {
            throw new Error(`Failed to create a story entry for subject: ${item.name}`);
          }
        }

        // Create Chapters
        for (const chap of item.chapters) {
          const { data: existingChap } = await supabase
            .from('story_chapters')
            .select('id')
            .eq('story_id', storyId)
            .eq('chapter_number', chap.chapter_number)
            .maybeSingle();

          if (!existingChap) {
            // Try inserting with all schema columns (total_scenes, xp_reward)
            const { error: chErr } = await supabase
              .from('story_chapters')
              .insert({
                story_id: storyId,
                chapter_number: chap.chapter_number,
                title: chap.title,
                description: chap.description,
                total_scenes: 5,
                xp_reward: 100
              });

            if (chErr) {
              console.warn(`Seeding Chapter failed with all columns, trying fallback B (without total_scenes & xp_reward)...`, chErr);
              // Fallback B: without total_scenes & xp_reward
              const { error: chErrFallback } = await supabase
                .from('story_chapters')
                .insert({
                  story_id: storyId,
                  chapter_number: chap.chapter_number,
                  title: chap.title,
                  description: chap.description
                });
              if (chErrFallback) {
                console.warn(`Seeding Chapter failed with fallback B, trying fallback C (minimal columns)...`, chErrFallback);
                // Fallback C: bare minimum
                const { error: chErrMin } = await supabase
                  .from('story_chapters')
                  .insert({
                    story_id: storyId,
                    chapter_number: chap.chapter_number,
                    title: chap.title
                  });
                if (chErrMin) {
                  throw new Error(`Story chapters creation failed: ${chErrMin.message || chErrMin}`);
                }
              }
            }
          }
        }
      }

      setSuccessMsg('🎉 AziLearn CBC default subjects, characters, story arcs, and target chapters seeded successfully! Select Grade 7 and Business Studies to get started.');
      await fetchSubjectsForGrade(selectedGrade);
    } catch (err: any) {
      console.error('Seeding database structure failed:', err);
      setErrorMsg(`Seeding failed: ${err.message || err}`);
    } finally {
      setSeeding(false);
    }
  };

  // Trigger loading of subjects when grade changes
  useEffect(() => {
    fetchSubjectsForGrade(selectedGrade);
  }, [selectedGrade]);

  // Trigger loading of chapters when selected subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      fetchChaptersForSubject(selectedSubjectId);
    } else {
      setChaptersList([]);
      setSelectedChapterId('');
      setExistingScenes([]);
    }
  }, [selectedSubjectId]);

  // Trigger loading of existing scenes when chapter changes
  useEffect(() => {
    if (selectedChapterId) {
      fetchExistingScenes(selectedChapterId);
    } else {
      setExistingScenes([]);
    }
  }, [selectedChapterId]);

  // Fetch subjects from story_subjects
  const fetchSubjectsForGrade = async (gradeNum: number) => {
    setFetchingSubjects(true);
    setErrorMsg(null);
    try {
      // Fetch both numeric and string representations (Grade 7 vs 7)
      // Enclose in double quotes to prevent Postgres numerical type mismatch casting error
      let data = null;
      let queryErr = null;

      try {
        // Query option 1: If grade is stored as numeric/integer column in DB
        const res = await supabase
          .from('story_subjects')
          .select(`
            id,
            name,
            grade,
            story_title,
            story_characters (
              character_name
            )
          `)
          .eq('grade', gradeNum);
        if (res.error) throw res.error;
        data = res.data;
      } catch (err: any) {
        console.warn(`Querying subject matching integer grade ${gradeNum} failed, falling back to string query...`, err);
        // Query option 2: If grade is TEXT/VARCHAR column in DB
        try {
          const res = await supabase
            .from('story_subjects')
            .select(`
              id,
              name,
              grade,
              story_title,
              story_characters (
                character_name
              )
            `)
            .or(`grade.eq."${gradeNum}",grade.eq."Grade ${gradeNum}"`);
          if (res.error) throw res.error;
          data = res.data;
        } catch (err2: any) {
          queryErr = err2;
        }
      }

      if (queryErr) throw queryErr;

      if (data && data.length > 0) {
        setSubjectsList(data as StorySubject[]);
        setSelectedSubjectId(data[0].id);
      } else {
        setSubjectsList([]);
        setSelectedSubjectId('');
        setChaptersList([]);
        setSelectedChapterId('');
      }
    } catch (err: any) {
      console.error('Error fetching subjects:', err);
      setErrorMsg(`Failed to load subjects: ${err.message || err}`);
    } finally {
      setFetchingSubjects(false);
    }
  };

  // Fetch chapters for selected subject
  const fetchChaptersForSubject = async (subjectId: string) => {
    setFetchingChapters(true);
    setErrorMsg(null);
    try {
      let dbChapters: any[] = [];
      let finalError: any = null;

      // Pathway A: Direct subject_id query (Supporting user defined/migrated custom columns)
      try {
        const { data, error } = await supabase
          .from('story_chapters')
          .select('id, chapter_number, title, topic_covered, subject_id, description, total_scenes, xp_reward')
          .eq('subject_id', subjectId)
          .order('chapter_number', { ascending: true });
        
        if (!error && data && data.length > 0) {
          dbChapters = data;
        } else if (error) {
          throw error;
        }
      } catch (e1) {
        console.warn("Direct subject_id query with custom columns failed, trying direct select without extra columns...", e1);
        try {
          const { data, error } = await supabase
            .from('story_chapters')
            .select('id, chapter_number, title, description, total_scenes, xp_reward')
            .eq('subject_id', subjectId)
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
            .eq('subject_id', subjectId);

          if (!storyErr && dbStories && dbStories.length > 0) {
            const storyIds = dbStories.map(s => s.id);
            // Try fetching with all standard columns
            const { data, error } = await supabase
              .from('story_chapters')
              .select('id, chapter_number, title, description, total_scenes, xp_reward')
              .in('story_id', storyIds)
              .order('chapter_number', { ascending: true });
            
            if (!error && data) {
              dbChapters = data;
            } else if (error) {
              throw error;
            }
          }
        } catch (storyQueryErr) {
          console.warn("Querying chapters through stories schema failed, trying fallback...", storyQueryErr);
          finalError = storyQueryErr;
        }
      }

      // Pathway C: Fallback to story_id direct comparison
      if (dbChapters.length === 0) {
        try {
          const { data, error } = await supabase
            .from('story_chapters')
            .select('id, chapter_number, title, description, total_scenes, xp_reward')
            .eq('story_id', subjectId)
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
        const parsedChaps = dbChapters.map(c => ({
          id: c.id,
          chapter_number: c.chapter_number,
          title: c.title,
          topic_covered: c.topic_covered || '',
          description: c.description || '',
          total_scenes: c.total_scenes || 3,
          xp_reward: c.xp_reward || 100
        }));
        setChaptersList(parsedChaps);
        setSelectedChapterId(parsedChaps[0].id);
      } else {
        setChaptersList([]);
        setSelectedChapterId('');
        setExistingScenes([]);
        if (finalError) throw finalError;
      }
    } catch (err: any) {
      console.error('Error fetching chapters:', err);
      setErrorMsg(`Failed to load chapters: ${err.message || err}`);
    } finally {
      setFetchingChapters(false);
    }
  };

  // Fetch existing uploaded scenes for a given chapter
  const fetchExistingScenes = async (chapterId: string) => {
    setFetchingExisting(true);
    try {
      const { data, error } = await supabase
        .from('story_scenes')
        .select('*, scene_questions(*)')
        .eq('chapter_id', chapterId)
        .order('scene_number', { ascending: true });

      if (error) throw error;
      setExistingScenes(data || []);
    } catch (err: any) {
      console.error('Error fetching existing scenes:', err);
    } finally {
      setFetchingExisting(false);
    }
  };

  // Run JSON parsing & validations
  const validateAndParseJSON = (rawInput: string): ParsedScene[] | null => {
    setValidationErrors([]);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!rawInput.trim()) {
      setValidationErrors(['JSON text area is empty!']);
      return null;
    }

    try {
      const parsed = JSON.parse(rawInput);
      const scenes = parsed.scenes;

      if (!scenes || !Array.isArray(scenes)) {
        setValidationErrors(['Root JSON object must contain a "scenes" array.']);
        return null;
      }

      const errors: string[] = [];

      if (scenes.length === 0) {
        errors.push(`A story chapter must have at least 1 scene.`);
      }

      scenes.forEach((scene: any, idx: number) => {
        const sceneLabel = `Scene #${scene.scene_number || (idx + 1)}`;

        if (scene.scene_number === undefined || scene.scene_number === null) {
          errors.push(`${sceneLabel}: Missing "scene_number" value.`);
        }

        if (!scene.narrative || !scene.narrative.trim()) {
          errors.push(`${sceneLabel}: Narrative narrative is empty or missing.`);
        }

        const q = scene.question;
        if (!q) {
          errors.push(`${sceneLabel}: Missing "question" block.`);
          return;
        }

        const requiredFields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'];
        requiredFields.forEach(f => {
          if (!q[f] || (typeof q[f] === 'string' && !q[f].trim())) {
            errors.push(`${sceneLabel} Question: Missing required field "${f}".`);
          }
        });

        if (q.correct_option) {
          const upperOpt = q.correct_option.toString().trim().toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(upperOpt)) {
            errors.push(`${sceneLabel} Question: "correct_option" must be exactly A, B, C or D. Found "${q.correct_option}".`);
          }
        }
      });

      if (errors.length > 0) {
        setValidationErrors(errors);
        return null;
      }

      // If valid, store parsed format
      const formattedScenes: ParsedScene[] = scenes.map((s: any) => ({
        scene_number: parseInt(s.scene_number, 10),
        narrative: s.narrative,
        setting_local: s.setting_local || 'Kenyan Setting',
        question: {
          question_text: s.question.question_text,
          option_a: s.question.option_a,
          option_b: s.question.option_b,
          option_c: s.question.option_c,
          option_d: s.question.option_d,
          correct_option: s.question.correct_option.trim().toUpperCase() as 'A' | 'B' | 'C' | 'D',
          explanation: s.question.explanation || '',
          response_correct: s.question.response_correct || '',
          response_wrong: s.question.response_wrong || ''
        }
      }));

      setParsedScenes(formattedScenes);
      return formattedScenes;
    } catch (e: any) {
      setValidationErrors([`Invalid JSON formatting: ${e.message || e}`]);
      return null;
    }
  };

  const handlePreview = () => {
    const scenes = validateAndParseJSON(jsonInput);
    if (scenes) {
      setIsPreviewMode(true);
      setSuccessMsg('JSON parsed and validated successfully! See preview below.');
    } else {
      setIsPreviewMode(false);
      setErrorMsg('Validation failed. Please correct the errors listed below.');
    }
  };

  // Clear existing scenes from this chapter before doing inserts to prevent duplications
  const clearExistingChapterScenes = async (chapterId: string) => {
    // Delete all scenes linked to this chapter (referential integrity cascades or we handle both)
    // To be perfectly safe, delete questions and scenes separately
    try {
      // 1. Fetch scene IDs for this chapter
      const { data: scenesToDelete } = await supabase
        .from('story_scenes')
        .select('id')
        .eq('chapter_id', chapterId);

      if (scenesToDelete && scenesToDelete.length > 0) {
        const sceneIds = scenesToDelete.map(s => s.id);
        
        // Delete dependent questions
        await supabase
          .from('scene_questions')
          .delete()
          .in('scene_id', sceneIds);

        // Delete scenes
        await supabase
          .from('story_scenes')
          .delete()
          .in('id', sceneIds);
      }
    } catch (err) {
      console.warn('Silent issue cleaning previous scenes:', err);
    }
  };

  const handleUpload = async () => {
    // Re-verify validation
    const scenesToUpload = validateAndParseJSON(jsonInput);
    if (!scenesToUpload) {
      setErrorMsg('Failed validation on upload. Please double check instructions.');
      return;
    }

    if (!selectedChapterId) {
      setErrorMsg('Please select a valid chapter before uploading!');
      return;
    }

    setUploading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Clean up previous scenes to avoid conflicts or duplications in ordering
      await clearExistingChapterScenes(selectedChapterId);

      for (const scene of scenesToUpload) {
        // 1. Insert Scene
        let insertedSceneArr: any[] | null = null;
        let sceneErr: any = null;

        try {
          // Option A: insert with setting_local
          const res = await supabase
            .from('story_scenes')
            .insert({
              chapter_id: selectedChapterId,
              scene_number: scene.scene_number,
              narrative: scene.narrative,
              setting_local: scene.setting_local || 'Kenyan Old Town'
            })
            .select('id');
          if (res.error) throw res.error;
          insertedSceneArr = res.data;
        } catch (err: any) {
          console.warn(`Inserting scene with setting_local failed for scene #${scene.scene_number}, retrying without setting_local...`, err);
          try {
            // Option B: insert without setting_local
            const res = await supabase
              .from('story_scenes')
              .insert({
                chapter_id: selectedChapterId,
                scene_number: scene.scene_number,
                narrative: scene.narrative
              })
              .select('id');
            if (res.error) throw res.error;
            insertedSceneArr = res.data;
          } catch (err2: any) {
            sceneErr = err2;
          }
        }

        if (sceneErr) throw new Error(`Scene #${scene.scene_number} Insert Failed: ${sceneErr.message || sceneErr}`);
        
        let sceneId = insertedSceneArr?.[0]?.id;
        if (!sceneId) {
          // Attempt fallback query to fetch the newly created scene ID
          const { data: refetched } = await supabase
            .from('story_scenes')
            .select('id')
            .eq('chapter_id', selectedChapterId)
            .eq('scene_number', scene.scene_number)
            .maybeSingle();
          sceneId = refetched?.id;
        }

        if (!sceneId) {
          throw new Error(`Scene #${scene.scene_number} Insert Failed: No ID returned or located`);
        }

        // 2. Insert Question
        const questionPayload: any = {
          scene_id: sceneId,
          question_text: scene.question.question_text,
          option_a: scene.question.option_a,
          option_b: scene.question.option_b,
          option_c: scene.question.option_c,
          option_d: scene.question.option_d,
          correct_option: scene.question.correct_option,
          explanation: scene.question.explanation,
          response_correct: scene.question.response_correct,
          response_wrong: scene.question.response_wrong
        };

        const { error: questErr } = await supabase
          .from('scene_questions')
          .insert(questionPayload);

        // Fail-safe fallback if custom tables don't support response_correct or response_wrong columns
        if (questErr) {
          console.warn('Standard question insert failed. Attempting insert without custom response columns:', questErr);
          const fallbackPayload = { ...questionPayload };
          delete fallbackPayload.response_correct;
          delete fallbackPayload.response_wrong;

          const { error: fallbackErr } = await supabase
            .from('scene_questions')
            .insert(fallbackPayload);

          if (fallbackErr) throw new Error(`Scene #${scene.scene_number} Question Fail: ${fallbackErr.message}`);
        }
      }

      // Update the chapter's total_scenes count dynamically in the database
      try {
        await supabase
          .from('story_chapters')
          .update({ total_scenes: scenesToUpload.length })
          .eq('id', selectedChapterId);
      } catch (e) {
        console.warn('Silent warning: Failed to sync total_scenes in story_chapters:', e);
      }

      setSuccessMsg(`🎉 Success! Chapter completed. ${scenesToUpload.length} scenes and questions uploaded successfully for Chapter!`);
      setJsonInput('');
      setParsedScenes([]);
      setIsPreviewMode(false);
      
      // Refresh list
      fetchExistingScenes(selectedChapterId);
    } catch (err: any) {
      console.error('Upload transaction failed:', err);
      setErrorMsg(`Database Upload Failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteChapterScenes = async () => {
    if (!selectedChapterId) return;
    if (!confirm('⚠️ Are you sure you want to delete ALL scenes in this chapter from the database? This is irreversible!')) return;

    setFetchingExisting(true);
    try {
      await clearExistingChapterScenes(selectedChapterId);
      setSuccessMsg('Successfully deleted all scenes belonging to the chosen chapter.');
      fetchExistingScenes(selectedChapterId);
    } catch (e: any) {
      setErrorMsg(`Deletion Failed: ${e.message || e}`);
    } finally {
      setFetchingExisting(false);
    }
  };

  const toggleSceneExpand = (id: string) => {
    setExpandedScenes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F223A] border border-[#1A2E44] p-6 rounded-[2rem] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl flex items-center justify-center text-[#FF6B00]">
              <Sparkles size={18} />
            </span>
            <p className="text-[10px] font-black uppercase text-[#FF6B00] tracking-widest leading-none">Content Overlord</p>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white uppercase">Story Quest Content Manager</h2>
          <p className="text-xs text-[#A0AEC0] max-w-xl">
            Upload custom localized Kenyan CBC narrative scenes and multiple choice interactive questions directly to the database.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={seedDefaultStructure}
            disabled={seeding}
            className="h-11 px-4 bg-[#FF6B00]/10 border border-[#FF6B00]/20 hover:bg-[#FF6B00] hover:text-white text-[#FF6B00] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
            title="Pre-populate subjects & chapter structure if empty"
          >
            {seeding ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Seed CBC Structures
          </button>
          
          <div className="bg-[#0A1628] border border-[#1A2E44] p-3 px-4 rounded-2xl flex items-center gap-3 h-11">
            <Clock size={16} className="text-[#FF6B00]" />
            <div>
              <p className="text-[8px] font-black uppercase text-[#A0AEC0] tracking-wider leading-none">STATUS</p>
              <p className="text-[10px] font-mono font-bold text-white mt-0.5 uppercase tracking-tight">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR / SUCCESS ALERTS */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-slide-up">
          <CheckCircle size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-slide-up">
          <XCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SEED UTILITY CARD shown if database tables are empty / need initial data */}
      {subjectsList.length === 0 && (
        <div className="bg-[#0A1628] border border-dashed border-[#FF6B00]/40 p-6 rounded-[2rem] text-center space-y-4 shadow-xl animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] mx-auto">
            <Sparkles size={24} />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-sm font-black uppercase text-white tracking-wider">CBC Database Not Seeded</h3>
            <p className="text-xs text-[#A0AEC0] leading-relaxed">
              There are currently no subjects, characters, or chapters created in your Supabase tables for Grade {selectedGrade}. Click the button below to instantly populate standard CBC Grade 6-9 Subjects and Chapters!
            </p>
          </div>
          <button
            onClick={seedDefaultStructure}
            disabled={seeding}
            className="px-6 py-3 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-3 mx-auto disabled:opacity-50"
          >
            {seeding ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Seeding CBC Database...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Instantly Seed Subjects & Chapters
              </>
            )}
          </button>
        </div>
      )}

      {/* FILTER STREAMS (GRADE -> SUBJECT -> CHAPTER) */}
      <div className="bg-[#0A1628] border border-[#1A2E44] p-6 rounded-[2rem] gap-4 grid grid-cols-1 md:grid-cols-3 shadow-lg">
        
        {/* GRADE INPUT */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#FF6B00] tracking-widest block">Select Grade</label>
          <div className="grid grid-cols-4 gap-1 bg-[#050D18] border border-[#1A2E44] p-1 rounded-xl">
            {[6, 7, 8, 9].map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade)}
                className={`py-2 rounded-lg font-black text-xs transition-colors ${
                  selectedGrade === grade
                    ? 'bg-[#FF6B00] text-white shadow-md'
                    : 'text-[#A0AEC0] hover:text-white'
                }`}
              >
                G{grade}
              </button>
            ))}
          </div>
        </div>

        {/* SUBJECT SELECTOR */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#FF6B00] tracking-widest block">Select Subject (Story)</label>
          <div className="relative">
            {fetchingSubjects ? (
              <div className="w-full bg-[#050D18] border border-[#1A2E44] h-11 rounded-xl flex items-center justify-center">
                <Loader2 size={16} className="text-[#FF6B00] animate-spin" />
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-[#050D18] border border-[#1A2E44] text-white rounded-xl h-11 px-4 text-xs font-bold outline-none focus:border-[#FF6B00] transition-colors cursor-pointer appearance-none"
              >
                {subjectsList.length === 0 ? (
                  <option value="">No subjects found for Grade {selectedGrade}</option>
                ) : (
                  subjectsList.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.story_title || sub.name} ({sub.name})
                    </option>
                  ))
                )}
              </select>
            )}
            <div className="absolute right-3 top-3.5 pointer-events-none text-[#A0AEC0]">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* CHAPTER SELECTOR */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#FF6B00] tracking-widest block">Select Target Chapter</label>
          <div className="relative">
            {fetchingChapters ? (
              <div className="w-full bg-[#050D18] border border-[#1A2E44] h-11 rounded-xl flex items-center justify-center">
                <Loader2 size={16} className="text-[#FF6B00] animate-spin" />
              </div>
            ) : (
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full bg-[#050D18] border border-[#1A2E44] text-white rounded-xl h-11 px-4 text-xs font-bold outline-none focus:border-[#FF6B00] transition-colors cursor-pointer appearance-none"
              >
                {chaptersList.length === 0 ? (
                  <option value="">No chapters created yet for this subject</option>
                ) : (
                  chaptersList.map((chap) => (
                    <option key={chap.id} value={chap.id}>
                      Chapter {chap.chapter_number}: {chap.title} {chap.topic_covered ? `(${chap.topic_covered})` : ''}
                    </option>
                  ))
                )}
              </select>
            )}
            <div className="absolute right-3 top-3.5 pointer-events-none text-[#A0AEC0]">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

      </div>

      {/* TWO COLUMN WORKSPACE (Uploader & Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: JSON UPLOADER */}
        <div className="bg-[#0A1628] border border-[#1A2E44] rounded-[2rem] p-6 space-y-6 shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <FileJson size={14} className="text-[#FF6B00]" />
                JSON Content Loader
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const sample = {
                      scenes: [
                        {
                          scene_number: 1,
                          setting_local: "Mombasa Old Town",
                          narrative: "Zawadi is helping Cucu rearrange the vegetable shelves at her kiosk. She notices they sold 15 crates of tomatoes yesterday but their physical cash drawer shows a missing 1,200 KES. Zawadi picks up an old notebook and asks Cucu: 'Cucu, how did we record our payment receipts and daily expenses?'",
                          question: {
                            question_text: "What is the very first step Zawadi should take to restore physical and numerical audit accountability in the business?",
                            option_a: "Buy more stock immediately to replace the lost money.",
                            option_b: "Create a simple Ledger or Cash Receipts Record to log every penny in and out.",
                            option_c: "Close the kiosk for three days to think about it.",
                            option_d: "Borrow money from the neighbors without security.",
                            correct_option: "B",
                            explanation: "A cash receipt book tracks every transaction immediately to prevent inventory leakage and unexplained cash shortfalls.",
                            response_correct: "Fabulous! Keeping standard accounting ledgers prevents errors and cash leakage.",
                            response_wrong: "Wait! Without a record book, Cucu will keep losing track of daily sales and cashflow."
                          }
                        },
                        {
                          scene_number: 2,
                          setting_local: "Nyali Market Place",
                          narrative: "A wholesaler from Malindi arrives with 10 bags of onions. He offers Cucu the stock now to be paid in 30 days. Cucu is excited, but Zawadi reminds her that buying items to be paid later creates a specific financial obligation.",
                          question: {
                            question_text: "In standard business studies and basic bookkeeping, what is this type of credit obligation called?",
                            option_a: "A fixed business asset",
                            option_b: "An interest or financial revenue",
                            option_c: "A liability (Accounts Payable)",
                            option_d: "A capital investment injection",
                            correct_option: "C",
                            explanation: "Outstanding bills for inventory bought on credit represent liabilities, which are debts the business must settle in future.",
                            response_correct: "Spot on! That is a liability. Highly enterprising!",
                            response_wrong: "No, if the business owes money for goods delivered, it represents a debt or liability."
                          }
                        },
                        {
                          scene_number: 3,
                          setting_local: "Zawadi's Desk",
                          narrative: "In the evening, Zawadi sets down with a ledger. She sums up the total cash injected inside the business by Cucu, which was 5,000 KES for the initial stock. She explains to her Cucu that this is considered the initial capital value of the shop.",
                          question: {
                            question_text: "In the fundamental Accounting Equation, what relationship should always remain in balance?",
                            option_a: "Assets = Liabilities + Owner's Equity (Capital)",
                            option_b: "Assets = Liabilities - Expenses",
                            option_c: "Liabilities = Assets + Capital",
                            option_d: "Capital = Liabilities - Assets",
                            correct_option: "A",
                            explanation: "The accounting equation states that a company's total assets represent the sum of its liabilities and its owner's equity.",
                            response_correct: "Incredible! Standard accounting equation balance achieved.",
                            response_wrong: "Incorrect. Remember: Assets must always equal Liabilities plus Capital!"
                          }
                        }
                      ]
                    };
                    setJsonInput(JSON.stringify(sample, null, 2));
                  }}
                  className="px-2 py-0.5 bg-[#FF6B00]/10 hover:bg-[#FF6B00] hover:text-white border border-[#FF6B00]/20 text-[#FF6B00] rounded text-[8.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  📁 Load Template
                </button>
                <span className="text-[9px] bg-[#1A2E44] text-[#A0AEC0] px-2 py-0.5 rounded font-black uppercase tracking-wide">
                  Strict Format
                </span>
              </div>
            </div>
            
            <p className="text-[11px] text-[#A0AEC0] leading-relaxed">
              Paste standard Chapter story JSON here. Support 1 or more scenes (typically 3-5). Make sure your question options, response narratives, and explainers match CBC syllabus guidelines.
            </p>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='Paste JSON here... e.g. { "scenes": [ { "scene_number": 1, ... } ] }'
              className="w-full h-[360px] bg-[#050D18] border border-[#1A2E44] rounded-2xl p-4 font-mono text-[10px] text-[#A0AEC0] placeholder-[#A0AEC0]/20 focus:outline-none focus:border-[#FF6B00] focus:text-white transition-all overflow-y-auto"
            />

            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-1.5 overflow-hidden">
                <p className="text-[9px] font-black uppercase text-red-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  FORMAT ERRORS DETECTED ({validationErrors.length})
                </p>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] text-red-300">
                  {validationErrors.map((err, i) => (
                    <div key={i} className="flex gap-1">
                      <span className="text-red-500">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1A2E44]">
            <button
              onClick={handlePreview}
              className="py-4 bg-[#0F223A] hover:bg-[#1A2E44] text-[#A0AEC0] hover:text-white font-black text-[10px] uppercase tracking-wider rounded-2xl border border-[#1A2E44] flex items-center justify-center gap-2 transition-colors"
            >
              <Eye size={14} />
              Verify & Preview
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedChapterId || jsonInput.length === 0}
              className="py-4 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-[#FF6B00]/10 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload Chapter
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW SCREEN */}
        <div className="bg-[#0A1628] border border-[#1A2E44] rounded-[2rem] p-6 space-y-4 shadow-md overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1A2E44] pb-3 shrink-0">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Live Parser Preview</h3>
              <p className="text-[9px] text-[#A0AEC0] uppercase tracking-wider">How children will read it</p>
            </div>
            {isPreviewMode ? (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                READY TO COMMIT
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-[#1A2E44] text-[#A0AEC0] rounded-lg text-[9px] font-black uppercase tracking-wider">
                WAITING FOR JSON
              </span>
            )}
          </div>

          <div className="h-[432px] overflow-y-auto pr-1 space-y-4 no-scrollbar">
            {!isPreviewMode || parsedScenes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center text-[#A0AEC0]/40 space-y-3">
                <BookOpen size={48} className="stroke-1 text-[#1A2E44]" />
                <div className="space-y-1 px-8">
                  <p className="text-xs font-black uppercase tracking-widest">No preview available</p>
                  <p className="text-[10px] font-bold">Paste valid story JSON on the left and click "Verify & Preview".</p>
                </div>
              </div>
            ) : (
              parsedScenes.map((scene, i) => (
                <div key={i} className="bg-[#050D18] border border-[#1A2E44] rounded-2xl p-4 gap-3 flex flex-col hover:border-[#FF6B00]/30 transition-all">
                  
                  {/* Scene Badge */}
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded text-[9px] text-[#FF6B00] font-black uppercase tracking-wide">
                      Scene {scene.scene_number} / 5
                    </span>
                    <span className="text-[9px] font-medium text-[#A0AEC0] opacity-50 font-mono">
                      📍 {scene.setting_local}
                    </span>
                  </div>

                  {/* Narrative prompt */}
                  <div className="space-y-1 bg-[#0A1628] border border-[#1A2E44]/50 p-3 rounded-xl">
                    <p className="text-[10px] font-black uppercase text-[#FF6B00] tracking-wider">Story Context / Narrative</p>
                    <p className="text-xs text-slate-100 font-medium leading-relaxed italic">{scene.narrative}</p>
                  </div>

                  {/* Question Prompt */}
                  <div className="space-y-3 p-3 bg-[#0F223A]/30 border border-[#1A2E44]/40 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-[#FF6B00] tracking-wider flex items-center gap-1">
                        <HelpCircle size={10} />
                        Interactive Question
                      </p>
                      <h4 className="text-xs font-bold text-white leading-relaxed">{scene.question.question_text}</h4>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const optKey = `option_${opt.toLowerCase()}` as keyof typeof scene.question;
                        const optText = scene.question[optKey] as string;
                        const isCorrect = scene.question.correct_option === opt;

                        return (
                          <div 
                            key={opt}
                            className={`p-2.5 rounded-lg border text-left text-xs font-semibold flex items-start gap-2 ${
                              isCorrect 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-[#050D18] border-[#1A2E44] text-[#A0AEC0]'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded flex items-center justify-center font-black text-[9px] shrink-0 leading-none ${
                              isCorrect ? 'bg-emerald-500 text-white' : 'bg-[#1A2E44] text-[#A0AEC0]'
                            }`}>{opt}</span>
                            <span className="leading-tight">{optText}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explainer Block */}
                    {scene.question.explanation && (
                      <div className="bg-[#050D18] border border-[#1A2E44] p-2 px-3 rounded-lg text-[10px] text-[#A0AEC0]/80">
                        <span className="font-black text-white uppercase tracking-wider block mb-0.5">💡 CBC Explainer</span>
                        <p>{scene.question.explanation}</p>
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: VIEW EXISTING SCENES IN CHAPTER */}
      <div className="bg-[#0A1628] border border-[#1A2E44] rounded-[2rem] p-6 space-y-6 shadow-md">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A2E44] pb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Database Audit: Chapter Scenes</h3>
            <p className="text-xs text-[#A0AEC0]">Check, review, and verify scenes currently uploaded in this chapter.</p>
          </div>
          {existingScenes.length > 0 && (
            <button
              onClick={handleDeleteChapterScenes}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all outline-none"
            >
              <Trash2 size={13} />
              Wipe Scenes ({existingScenes.length})
            </button>
          )}
        </div>

        {fetchingExisting ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-[#FF6B00]" size={24} />
          </div>
        ) : existingScenes.length === 0 ? (
          <div className="py-12 text-center text-[#A0AEC0]/40 flex flex-col items-center justify-center space-y-2">
            <BookOpen size={40} className="stroke-1 text-[#1A2E44]" />
            <div className="space-y-0.5 text-center">
              <p className="text-[11px] font-black uppercase tracking-wider">No DB Scenes Found</p>
              <p className="text-[10px] font-bold">This chapter is currently empty in Supabase. Paste format and upload above.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#1A2E44] text-[#A0AEC0] overflow-hidden rounded-2xl border border-[#1A2E44]">
            {existingScenes.map((s, idx) => {
              const q = s.scene_questions ? (Array.isArray(s.scene_questions) ? (s.scene_questions.length > 0 ? s.scene_questions[0] : null) : s.scene_questions) : null;
              const isExpanded = !!expandedScenes[s.id];

              return (
                <div key={s.id} className="bg-[#050D18]">
                  {/* Scene accordion drawer header */}
                  <div 
                    onClick={() => toggleSceneExpand(s.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#0A1628]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] font-black text-xs flex items-center justify-center leading-none">
                        {s.scene_number}
                      </span>
                      <div>
                        <p className="text-xs font-black text-white leading-none">Scene #{s.scene_number}</p>
                        <p className="text-[10px] text-[#A0AEC0]/60 mt-1 uppercase tracking-wider font-bold truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl">{s.narrative}</p>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Scene accordion details */}
                  {isExpanded && (
                    <div className="p-4 px-6 bg-[#0A1628]/20 border-t border-[#1A2E44]/50 space-y-3 font-sans text-xs animate-slide-down">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-[#FF6B00] uppercase tracking-wider">Full Narrative Text</span>
                        <p className="text-[#A0AEC0] leading-relaxed italic">"{s.narrative}"</p>
                      </div>

                      {q ? (
                        <div className="bg-[#050D18] border border-[#1A2E44] p-3 rounded-xl space-y-2.5">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black text-[#FF6B00] uppercase tracking-widest block">Linked Question</span>
                            <p className="text-white font-bold leading-relaxed">{q.question_text}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {['A', 'B', 'C', 'D'].map(opt => {
                              const key = `option_${opt.toLowerCase()}` as keyof typeof q;
                              const val = q[key];
                              const isCorrect = q.correct_option === opt;

                              return (
                                <div key={opt} className={`p-2 rounded-lg border flex items-center gap-2 ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold' : 'border-[#1A2E44] bg-[#0A1628]/40'}`}>
                                  <span className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shrink-0 leading-none ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-[#1A2E44] text-[#A0AEC0]'}`}>{opt}</span>
                                  <span>{val}</span>
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="text-[10px] text-[#A0AEC0]/70 border-t border-[#1A2E44]/50 pt-2 font-medium">
                              <span className="font-bold text-[#A0AEC0] uppercase block">💡 Explainer:</span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-red-500/5 text-red-400 rounded-xl text-[10px] font-bold border border-red-500/10 flex items-center gap-2">
                          <AlertTriangle size={14} />
                          <span>Warning: No matching question found in `scene_questions` table for this scene ID.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
