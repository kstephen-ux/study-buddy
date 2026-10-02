import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  MessageSquare, 
  BookOpen, 
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StudyNote } from '../types';

interface NotesViewProps {
  notes: StudyNote[];
  selectedNoteIds: string[];
  onToggleSelectNote: (id: string) => void;
  onSelectAllNotes: () => void;
  onClearSelectedNotes: () => void;
  onDeleteNote: (id: string) => void;
  onAnalyzeNote: (note: StudyNote) => Promise<void>;
  onOpenUpload: () => void;
  onAskAboutNote: (note: StudyNote) => void;
  onQuizFromNote: (note: StudyNote) => void;
  onPlanFromNote: (note: StudyNote) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  selectedNoteIds,
  onToggleSelectNote,
  onSelectAllNotes,
  onClearSelectedNotes,
  onDeleteNote,
  onAnalyzeNote,
  onOpenUpload,
  onAskAboutNote,
  onQuizFromNote,
  onPlanFromNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [analyzingNoteId, setAnalyzingNoteId] = useState<string | null>(null);

  const subjects = Array.from(new Set(notes.map(n => n.subject).filter(Boolean)));

  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tags && note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleRunAnalysis = async (note: StudyNote) => {
    setAnalyzingNoteId(note.id);
    try {
      await onAnalyzeNote(note);
    } finally {
      setAnalyzingNoteId(null);
    }
  };

  return (
    <div id="notes-view-root" className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 id="notes-heading" className="text-2xl font-extrabold text-stone-900 tracking-tight">
              Study Notes Repository
            </h1>
            <p className="text-sm text-stone-600 mt-0.5">
              Select notes to anchor AI explanations, practice quizzes, and schedules
            </p>
          </div>

          {/* Quick Context Bar */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-stone-700">
              AI Context:
            </span>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {selectedNoteIds.length} active
            </span>
            <div className="h-3 w-px bg-stone-300 mx-1" />
            <button
              id="btn-select-all-notes"
              onClick={onSelectAllNotes}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 underline"
            >
              Select All
            </button>
            <span className="text-stone-300">|</span>
            <button
              id="btn-clear-selection"
              onClick={onClearSelectedNotes}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 underline"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search & Subject filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-notes-input"
              type="text"
              placeholder="Search concepts, formulas, keywords, or titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              id="filter-subject-all"
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSubject === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Subjects ({notes.length})
            </button>
            {subjects.map(subj => (
              <button
                key={subj}
                id={`filter-subject-${subj.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSubject === subj
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div id="notes-empty-state" className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No matching notes found</h3>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            {searchQuery 
              ? 'Try adjusting your search query or subject filters.' 
              : 'Add your study material to get started with AI explanations, quizzes, and personalized plans.'}
          </p>
          <button
            id="btn-empty-upload"
            onClick={onOpenUpload}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            <span>+ Upload Note</span>
          </button>
        </div>
      ) : (
        <div id="notes-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => {
            const isSelected = selectedNoteIds.includes(note.id);
            const isExpanded = expandedNoteId === note.id;
            const isAnalyzing = analyzingNoteId === note.id;

            return (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col ${
                  isSelected 
                    ? 'border-amber-600/60 ring-2 ring-amber-500/20 shadow-sm' 
                    : 'border-stone-200 hover:border-stone-300 shadow-xs'
                }`}
              >
                {/* Note Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-select-note-${note.id}`}
                        onClick={() => onToggleSelectNote(note.id)}
                        className="text-stone-400 hover:text-amber-700 transition-colors"
                        title={isSelected ? 'Remove from AI context' : 'Include in AI context'}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-700 fill-amber-50" />
                        ) : (
                          <Circle className="w-5 h-5 text-stone-300" />
                        )}
                      </button>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {note.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id={`btn-delete-note-${note.id}`}
                        onClick={() => {
                          if (confirm(`Delete "${note.title}"?`)) {
                            onDeleteNote(note.id);
                          }
                        }}
                        className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-stone-100 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 
                    id={`note-title-${note.id}`} 
                    className="text-base font-bold text-stone-900 mt-2 line-clamp-1 hover:text-amber-800 cursor-pointer"
                    onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                  >
                    {note.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
                    <span>{note.wordCount} words</span>
                    <span>•</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    {isSelected && (
                      <span className="ml-auto text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                        In AI Context
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary / Key Terms Section */}
                <div className="px-5 py-2 flex-1">
                  {note.summary ? (
                    <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-700 leading-relaxed border border-stone-100">
                      <div className="flex items-center gap-1 font-semibold text-stone-900 mb-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>AI Executive Summary</span>
                      </div>
                      <p className="line-clamp-3">{note.summary}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 line-clamp-3 italic">
                      {note.content.slice(0, 180)}...
                    </p>
                  )}

                  {/* Key Terms */}
                  {note.keyTerms && note.keyTerms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {note.keyTerms.slice(0, 4).map((term, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700"
                        >
                          {term}
                        </span>
                      ))}
                      {note.keyTerms.length > 4 && (
                        <span className="text-[11px] text-stone-400 px-1 self-center">
                          +{note.keyTerms.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded Content preview */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-stone-100 max-h-60 overflow-y-auto text-xs text-stone-800 leading-relaxed space-y-2">
                      <div className="markdown-body font-sans">
                        <ReactMarkdown>{note.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footers */}
                <div className="p-3 bg-stone-50/70 border-t border-stone-100 rounded-b-2xl flex items-center justify-between gap-1 text-xs">
                  <button
                    id={`btn-expand-note-${note.id}`}
                    onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                    className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium px-2 py-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Collapse</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Read Note</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    {!note.summary && (
                      <button
                        id={`btn-analyze-note-${note.id}`}
                        onClick={() => handleRunAnalysis(note)}
                        disabled={isAnalyzing}
                        title="Auto-extract summary & key terms"
                        className="flex items-center gap-1 text-amber-800 hover:text-amber-950 font-semibold px-2 py-1 rounded hover:bg-amber-100/50 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
                      </button>
                    )}

                    <button
                      id={`btn-ask-note-${note.id}`}
                      onClick={() => onAskAboutNote(note)}
                      title="Ask Tutor about this note"
                      className="flex items-center gap-1 text-stone-700 hover:text-stone-950 font-medium px-2 py-1 rounded hover:bg-stone-200/50 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                      <span>Ask</span>
                    </button>

                    <button
                      id={`btn-quiz-note-${note.id}`}
                      onClick={() => onQuizFromNote(note)}
                      title="Generate quiz from this note"
                      className="flex items-center gap-1 text-stone-700 hover:text-stone-950 font-medium px-2 py-1 rounded hover:bg-stone-200/50 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Quiz</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
