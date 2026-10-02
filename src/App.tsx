import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NotesView } from './components/NotesView';
import { AskBuddyView } from './components/AskBuddyView';
import { StudyPlanView } from './components/StudyPlanView';
import { QuizView } from './components/QuizView';
import { UploadNoteModal } from './components/UploadNoteModal';
import { FocusTimer } from './components/FocusTimer';
import { 
  getStoredNotes, 
  saveNotes, 
  getSelectedNoteIds, 
  saveSelectedNoteIds,
  getStoredPlans,
  savePlans,
  getStoredQuizzes,
  saveQuizzes,
  getStoredFlashcards,
  saveFlashcards
} from './utils/storage';
import { StudyNote, StudyPlan, Quiz, Flashcard } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'notes' | 'ask' | 'plan' | 'quiz'>('notes');
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    const loadedNotes = getStoredNotes();
    setNotes(loadedNotes);

    const loadedSelected = getSelectedNoteIds();
    // Default to at least the first note if available
    if (loadedSelected.length === 0 && loadedNotes.length > 0) {
      setSelectedNoteIds([loadedNotes[0].id]);
      saveSelectedNoteIds([loadedNotes[0].id]);
    } else {
      setSelectedNoteIds(loadedSelected);
    }

    const loadedPlans = getStoredPlans();
    setPlans(loadedPlans);
    if (loadedPlans.length > 0) {
      setActivePlan(loadedPlans[0]);
    }

    const loadedQuizzes = getStoredQuizzes();
    setQuizzes(loadedQuizzes);
    if (loadedQuizzes.length > 0) {
      setActiveQuiz(loadedQuizzes[0]);
    }

    const loadedFlashcards = getStoredFlashcards();
    setFlashcards(loadedFlashcards);
  }, []);

  // Handlers for Notes
  const handleSaveNote = async (newNote: StudyNote, autoAnalyze: boolean) => {
    let finalNote = { ...newNote };

    if (autoAnalyze) {
      try {
        const res = await fetch('/api/gemini/analyze-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newNote.title,
            content: newNote.content,
          }),
        });
        if (res.ok) {
          const analysis = await res.json();
          finalNote.summary = analysis.summary || finalNote.summary;
          finalNote.keyTerms = analysis.keyTerms || finalNote.keyTerms;
          if (analysis.tags && analysis.tags.length > 0) {
            finalNote.tags = Array.from(new Set([...finalNote.tags, ...analysis.tags]));
          }
          if (analysis.subject) {
            finalNote.subject = analysis.subject;
          }
        }
      } catch (e) {
        console.error('Auto analysis failed, continuing with unanalyzed note', e);
      }
    }

    const updatedNotes = [finalNote, ...notes];
    setNotes(updatedNotes);
    saveNotes(updatedNotes);

    // Also auto-select the newly added note
    const updatedSelected = Array.from(new Set([finalNote.id, ...selectedNoteIds]));
    setSelectedNoteIds(updatedSelected);
    saveSelectedNoteIds(updatedSelected);
  };

  const handleAnalyzeExistingNote = async (note: StudyNote) => {
    try {
      const res = await fetch('/api/gemini/analyze-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: note.title,
          content: note.content,
        }),
      });
      if (res.ok) {
        const analysis = await res.json();
        const updated = notes.map(n => {
          if (n.id !== note.id) return n;
          return {
            ...n,
            summary: analysis.summary,
            keyTerms: analysis.keyTerms,
            tags: Array.from(new Set([...n.tags, ...(analysis.tags || [])])),
            subject: analysis.subject || n.subject,
          };
        });
        setNotes(updated);
        saveNotes(updated);
      }
    } catch (e) {
      console.error('Failed to analyze note', e);
    }
  };

  const handleToggleSelectNote = (id: string) => {
    const updated = selectedNoteIds.includes(id)
      ? selectedNoteIds.filter(nId => nId !== id)
      : [...selectedNoteIds, id];
    setSelectedNoteIds(updated);
    saveSelectedNoteIds(updated);
  };

  const handleSelectAllNotes = () => {
    const allIds = notes.map(n => n.id);
    setSelectedNoteIds(allIds);
    saveSelectedNoteIds(allIds);
  };

  const handleClearSelectedNotes = () => {
    setSelectedNoteIds([]);
    saveSelectedNoteIds([]);
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    saveNotes(updatedNotes);

    const updatedSelected = selectedNoteIds.filter(nId => nId !== id);
    setSelectedNoteIds(updatedSelected);
    saveSelectedNoteIds(updatedSelected);
  };

  // Cross-view shortcuts
  const handleAskAboutNote = (note: StudyNote) => {
    setSelectedNoteIds([note.id]);
    saveSelectedNoteIds([note.id]);
    setActiveTab('ask');
  };

  const handleQuizFromNote = (note: StudyNote) => {
    setSelectedNoteIds([note.id]);
    saveSelectedNoteIds([note.id]);
    setActiveTab('quiz');
  };

  const handlePlanFromNote = (note: StudyNote) => {
    setSelectedNoteIds([note.id]);
    saveSelectedNoteIds([note.id]);
    setActiveTab('plan');
  };

  // Study Plan Handlers
  const handleSavePlan = (plan: StudyPlan) => {
    const updatedPlans = [plan, ...plans.filter(p => p.id !== plan.id)];
    setPlans(updatedPlans);
    setActivePlan(plan);
    savePlans(updatedPlans);
  };

  const handleUpdatePlan = (plan: StudyPlan) => {
    const updatedPlans = plans.map(p => p.id === plan.id ? plan : p);
    setPlans(updatedPlans);
    setActivePlan(plan);
    savePlans(updatedPlans);
  };

  const handleDeletePlan = (id: string) => {
    const updated = plans.filter(p => p.id !== id);
    setPlans(updated);
    setActivePlan(updated.length > 0 ? updated[0] : null);
    savePlans(updated);
  };

  // Quiz Handlers
  const handleSaveQuiz = (quiz: Quiz) => {
    const updated = [quiz, ...quizzes.filter(q => q.id !== quiz.id)];
    setQuizzes(updated);
    setActiveQuiz(quiz);
    saveQuizzes(updated);
  };

  const handleSaveFlashcards = (cards: Flashcard[]) => {
    setFlashcards(cards);
    saveFlashcards(cards);
  };

  return (
    <div id="studybuddy-app-root" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notes={notes}
        selectedNoteIds={selectedNoteIds}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main View Container */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'notes' && (
          <NotesView
            notes={notes}
            selectedNoteIds={selectedNoteIds}
            onToggleSelectNote={handleToggleSelectNote}
            onSelectAllNotes={handleSelectAllNotes}
            onClearSelectedNotes={handleClearSelectedNotes}
            onDeleteNote={handleDeleteNote}
            onAnalyzeNote={handleAnalyzeExistingNote}
            onOpenUpload={() => setIsUploadOpen(true)}
            onAskAboutNote={handleAskAboutNote}
            onQuizFromNote={handleQuizFromNote}
            onPlanFromNote={handlePlanFromNote}
          />
        )}

        {activeTab === 'ask' && (
          <AskBuddyView
            notes={notes}
            selectedNoteIds={selectedNoteIds}
            onOpenUpload={() => setIsUploadOpen(true)}
            onSwitchToNotesTab={() => setActiveTab('notes')}
          />
        )}

        {activeTab === 'plan' && (
          <StudyPlanView
            plans={plans}
            activePlan={activePlan}
            notes={notes}
            selectedNoteIds={selectedNoteIds}
            onSavePlan={handleSavePlan}
            onSelectPlan={setActivePlan}
            onDeletePlan={handleDeletePlan}
            onUpdatePlan={handleUpdatePlan}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizView
            quizzes={quizzes}
            activeQuiz={activeQuiz}
            flashcards={flashcards}
            notes={notes}
            selectedNoteIds={selectedNoteIds}
            onSaveQuiz={handleSaveQuiz}
            onSelectQuiz={setActiveQuiz}
            onSaveFlashcards={handleSaveFlashcards}
          />
        )}
      </main>

      {/* Upload Note Modal */}
      <UploadNoteModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSaveNote={handleSaveNote}
      />

      {/* Persistent Pomodoro Focus Timer */}
      <FocusTimer />
    </div>
  );
}
