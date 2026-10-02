export interface StudyNote {
  id: string;
  title: string;
  subject: string;
  content: string;
  summary?: string;
  keyTerms?: string[];
  tags: string[];
  createdAt: string;
  wordCount: number;
}

export type TutorMode = 'balanced' | 'eli5' | 'socratic' | 'exam-prep';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: TutorMode;
  timestamp: string;
  referencedNotes?: string[];
  suggestedFollowUps?: string[];
}

export interface StudyTask {
  id: string;
  title: string;
  durationMinutes: number;
  completed: boolean;
}

export interface StudyModule {
  id: string;
  dayOrWeek: string;
  topic: string;
  keyConcepts: string[];
  tasks: StudyTask[];
  reviewTechnique: string;
}

export interface StudyPlan {
  id: string;
  title: string;
  subject: string;
  examDate?: string;
  dailyHours: number;
  strategy: string;
  summary: string;
  modules: StudyModule[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  topicArea: string;
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  createdAt: string;
  lastScore?: {
    score: number;
    total: number;
    completedAt: string;
  };
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  noteId?: string;
}
