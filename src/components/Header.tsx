import React from 'react';
import { BookOpen, MessageSquare, Calendar, HelpCircle, CheckSquare, Sparkles } from 'lucide-react';
import { StudyNote } from '../types';

interface HeaderProps {
  activeTab: 'notes' | 'ask' | 'plan' | 'quiz';
  setActiveTab: (tab: 'notes' | 'ask' | 'plan' | 'quiz') => void;
  notes: StudyNote[];
  selectedNoteIds: string[];
  onOpenUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  notes,
  selectedNoteIds,
  onOpenUpload
}) => {
  const selectedCount = selectedNoteIds.length;
  const activeNotesText = selectedCount === 0 
    ? 'No notes selected' 
    : selectedCount === 1 
      ? notes.find(n => n.id === selectedNoteIds[0])?.title || '1 note active'
      : `${selectedCount} notes in AI context`;

  return (
    <header id="app-header" className="bg-white border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div id="brand-badge" className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              SB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span id="app-title" className="text-xl font-bold tracking-tight text-stone-900">
                  StudyBuddy
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                  AI Companion
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden md:block">
                Focus on high-yield retention & active mastery
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav id="main-nav-tabs" className="flex items-center space-x-1 sm:space-x-2 bg-stone-100 p-1 rounded-xl">
            <button
              id="tab-notes"
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-stone-700" />
              <span>Notes ({notes.length})</span>
            </button>

            <button
              id="tab-ask"
              onClick={() => setActiveTab('ask')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'ask'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-amber-700" />
              <span>Ask Buddy</span>
            </button>

            <button
              id="tab-plan"
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'plan'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Study Plan</span>
            </button>

            <button
              id="tab-quiz"
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-indigo-700" />
              <span>Quizzes</span>
            </button>
          </nav>

          {/* Right Action: Active Note context & Upload */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              id="context-indicator"
              title="Active context for AI Tutor, Quizzes, and Plans"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="max-w-[160px] truncate">{activeNotesText}</span>
            </div>

            <button
              id="btn-upload-notes"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
            >
              <span>+ Add Notes</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
