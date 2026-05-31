import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  HelpCircle, 
  Code, 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  Filter, 
  Sparkles, 
  Upload, 
  FileText, 
  ArrowRight,
  AlertCircle,
  Database,
  Grid
} from 'lucide-react';
import { flashcardService, Flashcard } from '../services/flashcardService';
import { useToast } from './Toast';

export const FlashcardManager: React.FC = () => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'library' | 'upload' | 'ai_prompt' | 'sql_setup'>('library');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterTopic, setFilterTopic] = useState('All');

  // Bulk Upload State
  const [jsonInput, setJsonInput] = useState('');
  const [previewCards, setPreviewCards] = useState<Omit<Flashcard, 'id'>[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Prompt Generator State
  const [promptGrade, setPromptGrade] = useState('8');
  const [promptSubject, setPromptSubject] = useState('Biology');
  const [promptTopic, setPromptTopic] = useState('The Digestive System');
  const [promptCopied, setPromptCopied] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Load flashcards
  const loadCards = async () => {
    setLoading(true);
    try {
      const cards = await flashcardService.getFlashcards();
      setFlashcards(cards);
    } catch (e) {
      showToast("Error loading flashcards", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  // Filter lists
  const availableSubjects = ['All', ...Array.from(new Set(flashcards.map(c => c.subject)))];
  const availableGrades = ['All', ...Array.from(new Set(flashcards.map(c => c.grade.toString())))].sort();
  const availableTopics = ['All', ...Array.from(new Set(flashcards.map(c => c.topic)))];

  // Filtered Flashcards
  const filteredCards = flashcards.filter(card => {
    const matchesSearch = searchQuery === '' || 
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.topic.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = filterSubject === 'All' || card.subject === filterSubject;
    const matchesGrade = filterGrade === 'All' || card.grade.toString() === filterGrade;
    const matchesTopic = filterTopic === 'All' || card.topic === filterTopic;

    return matchesSearch && matchesSubject && matchesGrade && matchesTopic;
  });

  // Handle deletion
  const handleDeleteCard = async (id: string) => {
    if (!id) return;
    const success = await flashcardService.deleteFlashcard(id);
    if (success) {
      showToast("Flashcard deleted successfully", "success");
      loadCards();
    } else {
      showToast("Failed to delete flashcard", "error");
    }
  };

  // Parse & Validate JSON Input
  const handleValidateJSON = () => {
    setUploadError('');
    setPreviewCards([]);

    let rawText = jsonInput.trim();
    if (!rawText) {
      setUploadError('JSON input cannot be empty.');
      return;
    }

    // Clean markdown code blocks if the user copy-pasted directly with ```json ... ```
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    }

    try {
      const parsed = JSON.parse(rawText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      
      const validated: Omit<Flashcard, 'id'>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.subject) {
          throw new Error(`Item ${i + 1} is missing the required "subject" field.`);
        }
        if (item.grade === undefined || item.grade === null) {
          throw new Error(`Item ${i + 1} is missing the required "grade" field.`);
        }
        const gradeNum = parseInt(item.grade, 10);
        if (isNaN(gradeNum)) {
          throw new Error(`Item ${i + 1}'s "grade" must be a valid number.`);
        }
        if (![7, 8, 9, 10, 11, 12].includes(gradeNum)) {
          throw new Error(`Item ${i + 1}'s "grade" must be an allowed grade number from: 7, 8, 9, 10, 11, or 12. Found "${item.grade}".`);
        }
        if (!item.topic) {
          throw new Error(`Item ${i + 1} is missing the required "topic" field.`);
        }
        if (!item.question) {
          throw new Error(`Item ${i + 1} is missing the required "question" field.`);
        }
        if (!item.answer) {
          throw new Error(`Item ${i + 1} is missing the required "answer" field.`);
        }
        if (!item.difficulty) {
          throw new Error(`Item ${i + 1} is missing the required "difficulty" field (values can be "easy", "medium", or "hard" only).`);
        }
        const diff = item.difficulty.toLowerCase().trim();
        if (diff !== 'easy' && diff !== 'medium' && diff !== 'hard') {
          throw new Error(`Item ${i + 1}'s "difficulty" must be exactly "easy", "medium", or "hard". Found "${item.difficulty}".`);
        }
        validated.push({
          subject: item.subject.trim(),
          grade: gradeNum,
          topic: item.topic.trim(),
          question: item.question.trim(),
          answer: item.answer.trim(),
          difficulty: diff
        });
      }

      setPreviewCards(validated);
      showToast(`Successfully validated ${validated.length} flashcards. Preview available below!`, "success");
    } catch (e: any) {
      setUploadError(e.message || 'Invalid JSON structure. Ensure it is a valid JSON array or object.');
      showToast("JSON validation failed", "error");
    }
  };

  // Submit bulk uploaded cards
  const handleSubmitBatch = async () => {
    if (previewCards.length === 0) return;
    setIsUploading(true);
    try {
      const result = await flashcardService.uploadFlashcards(previewCards);
      if (result.error) {
        showToast(result.message, "info");
      } else {
        showToast(result.message, "success");
      }
      setJsonInput('');
      setPreviewCards([]);
      loadCards();
      setActiveSubTab('library');
    } catch {
      showToast("Bulk upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Generate template query
  const masterPromptTemplate = `You are a Kenya CBC curriculum expert helping build an EdTech flashcard app.

Generate 15 flashcards for the following:
- Subject: ${promptSubject}
- Grade: ${promptGrade}
- Topic: ${promptTopic}

Return a JSON array. Each object must have EXACTLY these fields:
{
  "subject": "${promptSubject}",
  "grade": ${promptGrade},
  "topic": "${promptTopic}",
  "question": "...",
  "answer": "...",
  "difficulty": "easy" or "medium" or "hard"
}

Rules:
- difficulty "easy" = definition or recall questions
- difficulty "medium" = explain or describe questions  
- difficulty "hard" = apply, analyse, or calculate questions
- Include a mix: 5 easy, 6 medium, 4 hard
- Answers must be 1 to 3 sentences maximum
- Language must suit Grade ${promptGrade} CBC students in Kenya
- Questions must be unique, no repetition
- Based strictly on the Kenya CBC syllabus

Return ONLY the raw JSON array.
No markdown. No backticks. No explanation. Just the JSON.`;

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(masterPromptTemplate);
    setPromptCopied(true);
    showToast("Master prompt copied to clipboard!", "success");
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const copySQLToClipboard = () => {
    navigator.clipboard.writeText(flashcardService.getSQLStatement());
    setSqlCopied(true);
    showToast("SQL update script copied!", "success");
    setTimeout(() => setSqlCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-brand-card rounded-[2.5rem] p-6 border border-brand-border shadow-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div>
          <h2 className="text-xl font-black text-brand-text tracking-tight uppercase flex items-center gap-2">
            <Sparkles className="text-brand-accent" size={20} /> CBC Flashcards Manager
          </h2>
          <p className="text-xs text-brand-muted font-bold">
            Create interactive flashcards utilizing Google AI Studio to boost student recall & revision.
          </p>
        </div>

        {/* Small warning if supabase cards aren't fully configured */}
        <button 
          onClick={() => setActiveSubTab('sql_setup')}
          className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/5 text-yellow-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-yellow-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Database size={12} /> Supabase Setup SQL
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth border-b border-brand-border py-4">
        {[
          { id: 'library', label: 'My Card Library', icon: <Grid size={14} /> },
          { id: 'upload', label: 'Bulk Upload JSON', icon: <Upload size={14} /> },
          { id: 'ai_prompt', label: 'AI Studio Prompt Generator', icon: <Sparkles size={14} /> },
          { id: 'sql_setup', label: 'Database Setup', icon: <Database size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/10'
                : 'bg-brand-bg hover:bg-brand-border/40 text-brand-muted hover:text-brand-text'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Area */}
      <div className="py-6 min-h-[300px]">
        {activeSubTab === 'library' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-brand-bg/50 p-4 rounded-2xl border border-brand-border">
              <div className="relative col-span-1 sm:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={14} />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-brand-text placeholder-brand-muted/70 focus:outline-none focus:border-brand-accent transition-all"
                />
              </div>

              {/* Subject Filter */}
              <div>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="All">All Subjects</option>
                  {availableSubjects.filter(s => s !== 'All').map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="All">All Grades</option>
                  {availableGrades.filter(g => g !== 'All').map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              {/* Topic Filter */}
              <div>
                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="All">All Topics</option>
                  {availableTopics.filter(t => t !== 'All').map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-brand-muted">
                <p className="animate-pulse text-xs font-black uppercase tracking-widest">Loading Flashcards Library...</p>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-brand-card rounded-2xl border border-dashed border-brand-border space-y-3">
                <FileText size={32} className="mx-auto text-brand-muted/50" />
                <p className="text-sm font-bold text-brand-text">No Flashcards Match Your Filters</p>
                <p className="text-xs text-brand-muted">Try changing filters or head to "Bulk Upload" to construct fresh ones.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCards.map((card) => (
                  <div 
                    key={card.id || `${card.question}-${card.answer}`}
                    className="p-5 bg-white dark:bg-brand-card hover:bg-brand-bg/10 rounded-2xl border border-brand-border flex flex-col justify-between hover:border-brand-accent/40 hover:shadow-lg hover:shadow-brand-accent/5 transition-all relative group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[8px] font-black tracking-widest uppercase bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded-full">
                            {card.subject}
                          </span>
                          <span className="text-[8px] font-black tracking-widest uppercase bg-teal-500/10 text-teal-600 border border-teal-500/20 px-2 py-0.5 rounded-full">
                            Grade {card.grade}
                          </span>
                          {card.difficulty && (
                            <span className={`text-[8px] font-black tracking-widest uppercase border px-2 py-0.5 rounded-full ${
                              card.difficulty === 'easy' 
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : card.difficulty === 'hard'
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {card.difficulty}
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleDeleteCard(card.id || '')}
                          className="w-7 h-7 rounded-lg bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 self-start"
                          title="Delete card"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-brand-muted tracking-tight">Topic: {card.topic}</span>
                        <h4 className="text-sm font-heavy tracking-tight text-brand-text leading-tight font-black">{card.question}</h4>
                        <p className="text-xs font-bold text-brand-muted border-l-2 border-brand-accent/20 pl-3 py-0.5 italic">
                          {card.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bulk Upload JSON tab */}
        {activeSubTab === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Interactive Upload Box & Previews */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-brand-bg p-5 rounded-2xl border border-brand-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-brand-text flex items-center gap-1.5">
                    <Upload size={14} className="text-brand-accent" /> Ready Your JSON File
                  </h3>
                  <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-brand-accent/10 text-brand-accent rounded-full border border-brand-accent/20">
                    Ctrl+V Ready
                  </span>
                </div>
                
                <p className="text-xs text-brand-muted leading-relaxed font-bold">
                  Paste the raw JSON Array generated from Google AI Studio. Markdown markers like <code className="bg-brand-border/40 px-1 py-0.5 rounded text-[10px] font-mono">```json</code> are automatically cleaned on validation.
                </p>
                
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={9}
                  placeholder={`[\n  {\n    "subject": "Biology",\n    "grade": 9,\n    "topic": "The Digestive System",\n    "question": "What is the role of the small intestine?",\n    "answer": "The small intestine absorbs digested nutrients.",\n    "difficulty": "medium"\n  },\n  {\n    "subject": "Biology",\n    "grade": 9,\n    "topic": "The Digestive System",\n    "question": "What enzyme breaks down starch in the mouth?",\n    "answer": "Salivary amylase.",\n    "difficulty": "easy"\n  }\n]`}
                  className="w-full bg-white dark:bg-brand-surface border border-brand-border rounded-xl p-4 font-mono text-xs text-brand-text focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 transition-all placeholder:text-brand-muted/40 shadow-inner"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleValidateJSON}
                    className="px-4 py-2 bg-brand-text hover:bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-brand-accent/10 active:scale-95 transition-all cursor-pointer"
                  >
                    Validate & Preview
                  </button>
                  {previewCards.length > 0 && (
                    <button
                      onClick={handleSubmitBatch}
                      disabled={isUploading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isUploading ? 'Uploading...' : `Upload ${previewCards.length} Cards`} <ArrowRight size={12} />
                    </button>
                  )}
                </div>

                {uploadError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-2.5 text-xs font-bold leading-tight">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-heavy uppercase block tracking-wider mb-0.5">Parse Failure</span>
                      {uploadError}
                    </div>
                  </div>
                )}
              </div>

              {/* Validation Preview Deck */}
              {previewCards.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 leading-none">
                      <Check size={16} /> Live Preview — ({previewCards.length} Cards Ready)
                    </h3>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                      Validated successfully
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-3xl max-h-[480px] overflow-y-auto no-scrollbar">
                    {previewCards.map((card, idx) => (
                      <div key={idx} className="p-4 bg-white dark:bg-brand-surface rounded-2xl border border-brand-border hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[8px] font-black bg-brand-accent/10 px-2 py-0.5 rounded-full border border-brand-accent/20 text-brand-accent">
                              {card.subject}
                            </span>
                            <span className="text-[8px] font-black uppercase text-brand-muted italic px-1.5 py-0.5">
                              G{card.grade}
                            </span>
                            {card.difficulty && (
                              <span className={`text-[8px] font-all tracking-widest uppercase border px-2 py-0.5 rounded-full ${
                                card.difficulty === 'easy' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : card.difficulty === 'hard'
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              }`}>
                                {card.difficulty}
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] font-black uppercase text-brand-muted/70 italic max-w-[80px] truncate">{card.topic}</span>
                        </div>
                        <h4 className="text-xs font-heavy text-brand-text font-black my-1">{card.question}</h4>
                        <p className="text-[11px] font-bold text-brand-muted pl-2 border-l-2 border-brand-border italic mt-1 leading-normal">{card.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Expert Admin Upload Guide */}
            <div className="lg:col-span-5 space-y-6">
              {/* How it Works Module */}
              <div className="border border-brand-border rounded-3xl p-5 bg-white dark:bg-brand-surface space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 rounded-full bg-brand-accent" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-text">How It Works</h4>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { number: "1", text: "Open Google AI Studio" },
                    { number: "2", text: "Paste the Expert Master prompt with grade, subject, and topic" },
                    { number: "3", text: "Copy the output JSON array that AI yields" },
                    { number: "4", text: "Click Bulk Upload on AziLearn and paste the JSON array" },
                    { number: "5", text: "Verify with Preview, then submit!" },
                    { number: "6", text: "Cards go live instantly for all CBC students" }
                  ].map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-center text-xs font-bold text-brand-text">
                      <span className="w-5 h-5 rounded-lg bg-brand-bg text-[10px] flex items-center justify-center font-black border border-brand-border text-brand-accent shrink-0 select-none">
                        {step.number}
                      </span>
                      <p className="leading-tight">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exact Rules Table */}
              <div className="border border-brand-border rounded-3xl p-5 bg-white dark:bg-brand-surface space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 rounded-full bg-teal-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-text">Strict JSON Schema</h4>
                </div>
                
                <div className="overflow-x-auto border border-brand-border rounded-2xl">
                  <table className="w-full text-[10px] text-left">
                    <thead>
                      <tr className="bg-brand-bg font-black uppercase text-brand-muted border-b border-brand-border">
                        <th className="p-2.5">Field</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Req</th>
                        <th className="p-2.5">Allowed Values / Format</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border font-bold text-brand-text">
                      <tr>
                        <td className="p-2.5 font-mono text-xs text-brand-accent">subject</td>
                        <td className="p-2.5 font-mono">text</td>
                        <td className="p-2.5 text-emerald-500">✅</td>
                        <td className="p-2.5">e.g. "Biology", "Mathematics"</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-xs text-brand-accent">grade</td>
                        <td className="p-2.5 font-mono">number</td>
                        <td className="p-2.5 text-emerald-500">✅</td>
                        <td className="p-2.5">7, 8, 9, 10, 11, 12</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-xs text-brand-accent">topic</td>
                        <td className="p-2.5 font-mono">text</td>
                        <td className="p-2.5 text-emerald-500">✅</td>
                        <td className="p-2.5">e.g. "Acids, Bases and Salts"</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-xs text-brand-accent">question</td>
                        <td className="p-2.5 font-mono">text</td>
                        <td className="p-2.5 text-emerald-500">✅</td>
                        <td className="p-2.5">Unique questions from syllabus</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-xs text-brand-accent">answer</td>
                        <td className="p-2.5 font-mono">text</td>
                        <td className="p-2.5 text-emerald-500">✅</td>
                        <td className="p-2.5">1-3 sentences maximum</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-xs text-brand-accent">difficulty</td>
                        <td className="p-2.5 font-mono">text</td>
                        <td className="p-2.5 text-emerald-500">✅</td>
                        <td className="p-2.5">
                          <code className="text-emerald-600 bg-emerald-500/5 px-1 py-0.5 rounded font-bold font-mono">easy</code>, 
                          <code className="text-amber-600 bg-amber-500/5 px-1 py-0.5 rounded font-bold font-mono ml-1">medium</code>, 
                          <code className="text-red-600 bg-red-500/5 px-1 py-0.5 rounded font-bold font-mono ml-1">hard</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Troubleshooting Diagnostics */}
              <div className="border border-brand-border rounded-3xl p-5 bg-brand-bg/50 space-y-3 shadow-none">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 rounded-full bg-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-text">Troubleshooting Fixes</h4>
                </div>
                <div className="space-y-2.5 text-[11px] leading-snug font-bold">
                  <div>
                    <span className="text-brand-accent block font-black uppercase tracking-wider text-[9px] mb-0.5">⚠️ JSON contains Markdown Backticks</span>
                    <p className="text-brand-muted">AziLearn handles and strips <code className="bg-brand-border/40 px-1 py-0.2 rounded font-mono text-[9px]">```json</code> delimiters automatically. No manual scrubbing needed.</p>
                  </div>
                  <div>
                    <span className="text-brand-accent block font-black uppercase tracking-wider text-[9px] mb-0.5">⚠️ "Invalid JSON" Structure Errors</span>
                    <p className="text-brand-muted">Ensure all items are enclosed in a main brackets array <code className="bg-brand-border/40 px-1 py-0.2 font-mono text-[9px]">[ ]</code> and separated with commas correctly.</p>
                  </div>
                  <div>
                    <span className="text-brand-accent block font-black uppercase tracking-wider text-[9px] mb-0.5">⚠️ difficulty Value Validation Failures</span>
                    <p className="text-brand-muted">Value must be exactly <code className="bg-brand-border/40 px-1 py-0.2 font-mono text-[9px]">"easy"</code>, <code className="bg-brand-border/40 px-1 py-0.2 font-mono text-[9px]">"medium"</code>, or <code className="bg-brand-border/40 px-1 py-0.2 font-mono text-[9px]">"hard"</code> inside double quotes.</p>
                  </div>
                </div>
              </div>

              {/* Quick Topic Priority Matrix */}
              <div className="border border-brand-border rounded-3xl p-5 bg-white dark:bg-brand-surface space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-brand-border pb-1.5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-text flex items-center gap-1.5 leading-none">
                    <BookOpen size={14} className="text-emerald-500" /> Priority Upload Ideas
                  </h4>
                  <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 uppercase tracking-widest leading-none">
                    Recommended
                  </span>
                </div>
                
                <div className="grid grid-cols-1 divide-y divide-brand-border">
                  {[
                    { grade: 7, subject: "Mathematics", topic: "BODMAS and Order of Operations" },
                    { grade: 7, subject: "Science", topic: "The Human Digestive System" },
                    { grade: 8, subject: "Mathematics", topic: "Linear Equations" },
                    { grade: 8, subject: "Chemistry", topic: "Mixtures and Separation" },
                    { grade: 9, subject: "Biology", topic: "Cell Division" },
                    { grade: 9, subject: "Physics", topic: "Current Electricity" }
                  ].map((rec, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 text-xs font-bold text-brand-text">
                      <div className="space-y-0.5">
                        <span className="text-brand-accent text-[9px] font-black uppercase block leading-none">{rec.subject}</span>
                        <p className="text-brand-muted text-[11px] leading-snug">{rec.topic}</p>
                      </div>
                      <span className="text-[8px] shrink-0 font-black tracking-widest uppercase bg-brand-bg border border-brand-border text-brand-muted px-2 py-1 rounded-lg">
                        Grade {rec.grade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Studio Prompt Guide Tab */}
        {activeSubTab === 'ai_prompt' && (
          <div className="space-y-6">
            <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-md font-black uppercase tracking-tight text-brand-text flex items-center gap-1.5 leading-none">
                  <Sparkles className="text-brand-accent" size={18} /> Custom Prompt Composer
                </h3>
                <span className="text-[8px] font-black text-brand-accent uppercase tracking-widest px-2 py-0.5 bg-brand-accent/10 rounded-full border border-brand-accent/20">Customized Master Prompt</span>
              </div>
              
              <p className="text-xs text-brand-muted font-bold leading-tight">
                Fill the fields below. The Prompt box dynamically edits to matching Grade, Subject, and Topic variables:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-brand-muted">Grade Level</label>
                  <select
                    value={promptGrade}
                    onChange={(e) => setPromptGrade(e.target.value)}
                    className="w-full bg-white dark:bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                  >
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-brand-muted">Subject</label>
                  <input
                    type="text"
                    value={promptSubject}
                    onChange={(e) => setPromptSubject(e.target.value)}
                    placeholder="e.g. Biology, Mathematics"
                    className="w-full bg-white dark:bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:focus:border-brand-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-brand-muted">Topic</label>
                  <input
                    type="text"
                    value={promptTopic}
                    onChange={(e) => setPromptTopic(e.target.value)}
                    placeholder="e.g. The Digestive System"
                    className="w-full bg-white dark:bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:focus:border-brand-accent"
                  />
                </div>
              </div>

              {/* Composition Box */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-brand-text uppercase tracking-widest text-[9px]">Calculated prompt block:</span>
                  <button
                    onClick={copyPromptToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 bg-brand-text hover:bg-brand-accent text-white rounded-lg transition-colors text-[9px] font-heavy tracking-widest uppercase cursor-pointer"
                  >
                    {promptCopied ? <Check size={12} /> : <Copy size={12} />}
                    {promptCopied ? 'Copied prompt!' : 'Copy Master Prompt'}
                  </button>
                </div>
                <pre className="w-full bg-brand-surface/80 border border-brand-border rounded-xl p-4 overflow-x-auto text-[10px] text-brand-text font-mono font-bold leading-normal shadow-inner whitespace-pre-wrap select-all">
                  {masterPromptTemplate}
                </pre>
              </div>
            </div>

            {/* Google AI Studio Guide Section */}
            <div className="border border-brand-border rounded-3xl p-6 space-y-6">
              <div className="space-y-1 pb-4 border-b border-brand-border">
                <h4 className="text-sm font-black uppercase tracking-tight text-brand-text">🏫 AziLearn Flashcards — Google AI Studio Guide</h4>
                <p className="text-xs text-brand-muted">Use Google AI Studio to generate flashcard JSON that you paste directly into the AziLearn admin panel. Takes about 2 minutes per topic.</p>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-brand-text">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step list */}
                  <div className="space-y-3">
                    <h5 className="font-black text-[10px] uppercase text-brand-accent tracking-widest">Step-by-Step Instructions</h5>
                    <ol className="space-y-2 list-decimal pl-4 font-bold">
                      <li>
                        <strong>Open Google AI Studio:</strong> Head to <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-brand-accent underline">aistudio.google.com</a> and sign in.
                      </li>
                      <li>
                        <strong>Choose Model:</strong> Select <strong>Gemini 1.5 Pro</strong> (for best structure) or <strong>Gemini 1.5 Flash</strong> from the top left.
                      </li>
                      <li>
                        <strong>Set Output Format:</strong> Click "System instructions" (top left of prompt tab) and paste:
                        <code className="block bg-brand-bg/50 p-2 rounded-xl text-[10px] mt-1 text-teal-600 border border-brand-border/40 select-all font-mono">
                          You are a Kenyan CBC curriculum expert. Always respond with valid JSON only. No markdown, no explanation, no backticks. Just the raw JSON array.
                        </code>
                      </li>
                      <li>
                        <strong>Configure Temp:</strong> Set <strong>Temperature → 0</strong> in the right-hand settings panel (ensures strict compliance).
                      </li>
                      <li>
                        <strong>Paste Master Prompt:</strong> Copy your dynamic Compose box and hit <strong>Run</strong>.
                      </li>
                      <li>
                        <strong>Copy & Save:</strong> Select all the JSON output and paste into the <em>Bulk Upload JSON</em> tab!
                      </li>
                    </ol>
                  </div>

                  {/* Troubleshooting */}
                  <div className="space-y-4 bg-brand-bg/50 p-4 rounded-2xl border border-brand-border">
                    <h5 className="font-black text-[10px] uppercase text-brand-accent tracking-widest leading-none">Troubleshooting & Tips</h5>
                    <div className="space-y-2 font-bold text-[11px]">
                      <p>✨ <strong>Generate by single topics:</strong> Smaller batches (e.g. digestive system, photosynthesis) always yield much better accuracy than entire subjects.</p>
                      <p>⚠️ <strong>Extra markdown formatting:</strong> If Gemini wraps your coordinates in <code>```json [ ... ] ```</code>, don't worry! AziLearn's Bulk Upload page automatically parses and strips markdown tags.</p>
                      <p>🔄 <strong>Duplicate checks:</strong> Keep Temperature at 0. If you need 15 new angles on the same syllabus, modify the prompt line: "Generate 15 unique, advanced flashcards..."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SQL Schema tab */}
        {activeSubTab === 'sql_setup' && (
          <div className="space-y-4">
            <div className="bg-yellow-500/5 border border-yellow-500/20 p-5 rounded-2xl flex gap-3">
              <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-yellow-600">Dynamic Database Synchronization SQL</h4>
                <p className="text-xs text-brand-muted leading-relaxed font-bold">
                  AziLearn supports syncing flashcards to your real-time cloud database. Run the database script below in your Supabase console to spin up the table. In the meantime, the application automatically handles falling back to localStorage caching, meaning everything serves seamlessly in your browser!
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-brand-text uppercase tracking-widest text-[9px]">PostgreSQL script:</span>
                <button
                  onClick={copySQLToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1 bg-brand-accent text-white rounded-lg hover:brightness-105 transition-all text-[9px] font-heavy tracking-widest uppercase cursor-pointer"
                >
                  {sqlCopied ? <Check size={12} /> : <Copy size={12} />}
                  {sqlCopied ? 'Copied script!' : 'Copy SQL Script'}
                </button>
              </div>
              <pre className="w-full bg-brand-bg/85 border border-brand-border rounded-xl p-4 overflow-x-auto text-[10px] text-brand-text font-mono font-bold leading-normal shadow-inner whitespace-pre">
                {flashcardService.getSQLStatement()}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
