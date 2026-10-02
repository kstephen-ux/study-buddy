import { StudyNote, StudyPlan, Quiz, Flashcard } from '../types';
import { INITIAL_STUDY_NOTES } from '../data/sampleNotes';

const NOTES_KEY = 'study_buddy_notes_v1';
const SELECTED_NOTES_KEY = 'study_buddy_selected_notes_v1';
const STUDY_PLANS_KEY = 'study_buddy_plans_v1';
const SAVED_QUIZZES_KEY = 'study_buddy_quizzes_v1';
const FLASHCARDS_KEY = 'study_buddy_flashcards_v1';

export function getStoredNotes(): StudyNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) {
      localStorage.setItem(NOTES_KEY, JSON.stringify(INITIAL_STUDY_NOTES));
      return INITIAL_STUDY_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STUDY_NOTES;
  } catch {
    return INITIAL_STUDY_NOTES;
  }
}

export function saveNotes(notes: StudyNote[]): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save notes to localStorage', err);
  }
}

export function getSelectedNoteIds(): string[] {
  try {
    const raw = localStorage.getItem(SELECTED_NOTES_KEY);
    if (!raw) {
      return ['note-1']; // Default select first note
    }
    return JSON.parse(raw);
  } catch {
    return ['note-1'];
  }
}

export function saveSelectedNoteIds(ids: string[]): void {
  try {
    localStorage.setItem(SELECTED_NOTES_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save selected note ids', err);
  }
}

export function getStoredPlans(): StudyPlan[] {
  try {
    const raw = localStorage.getItem(STUDY_PLANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlans(plans: StudyPlan[]): void {
  try {
    localStorage.setItem(STUDY_PLANS_KEY, JSON.stringify(plans));
  } catch (err) {
    console.error('Failed to save plans', err);
  }
}

export function getStoredQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(SAVED_QUIZZES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQuizzes(quizzes: Quiz[]): void {
  try {
    localStorage.setItem(SAVED_QUIZZES_KEY, JSON.stringify(quizzes));
  } catch (err) {
    console.error('Failed to save quizzes', err);
  }
}

export function getStoredFlashcards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(FLASHCARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFlashcards(cards: Flashcard[]): void {
  try {
    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
  } catch (err) {
    console.error('Failed to save flashcards', err);
  }
}
