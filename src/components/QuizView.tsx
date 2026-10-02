import React, { useState } from 'react';
import { 
  HelpCircle, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  Trophy, 
  Layers, 
  Eye, 
  Flame,
  Award,
  BookOpen,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudyNote, Quiz, QuizQuestion, Flashcard } from '../types';

interface QuizViewProps {
  quizzes: Quiz[];
  activeQuiz: Quiz | null;
  flashcards: Flashcard[];
  notes: StudyNote[];
  selectedNoteIds: string[];
  onSaveQuiz: (quiz: Quiz) => void;
  onSelectQuiz: (quiz: Quiz) => void;
  onSaveFlashcards: (cards: Flashcard[]) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  quizzes,
  activeQuiz,
  flashcards,
  notes,
  selectedNoteIds,
  onSaveQuiz,
  onSelectQuiz,
  onSaveFlashcards,
}) => {
  const [subTab, setSubTab] = useState<'quiz' | 'flashcards'>('quiz');
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Quiz Taking State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Flashcards State
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [masteredCardIds, setMasteredCardIds] = useState<string[]>([]);
  const [needsReviewCardIds, setNeedsReviewCardIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeNotes = notes.filter(n => selectedNoteIds.includes(n.id));

  // Handle Quiz Generation
  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setActionError(null);
    try {
      const notesContent = activeNotes.map(n => `### ${n.title}\n${n.content}`).join('\n\n');
      const subject = activeNotes[0]?.subject || 'General Knowledge';

      const response = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notesContent,
          questionCount,
          difficulty,
          subject,
          title: `${activeNotes[0]?.title || subject} Quiz`
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate quiz.');
      }

      const generated = await response.json();
      const newQuiz: Quiz = {
        id: `quiz-${Date.now()}`,
        title: generated.title || `${subject} Quiz`,
        subject: generated.subject || subject,
        difficulty: generated.difficulty || difficulty,
        questions: generated.questions || [],
        createdAt: new Date().toISOString()
      };

      onSaveQuiz(newQuiz);
      setCurrentQuestionIdx(0);
      setSelectedAnswers({});
      setIsSubmitted(false);
      setShowQuizConfig(false);
    } catch (err: any) {
      setActionError(err.message || 'Quiz generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Flashcards Generation
  const handleGenerateFlashcards = async () => {
    setIsGenerating(true);
    setActionError(null);
    try {
      const notesContent = activeNotes.map(n => `### ${n.title}\n${n.content}`).join('\n\n');
      const subject = activeNotes[0]?.subject || 'Coursework';

      const response = await fetch('/api/gemini/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notesContent,
          count: 8,
          subject
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate flashcards.');
      }

      const data = await response.json();
      const cards: Flashcard[] = (data.cards || []).map((c: any, i: number) => ({
        id: `fc-${Date.now()}-${i}`,
        front: c.front,
        back: c.back,
        subject: c.subject || subject,
        difficulty: c.difficulty || 'medium'
      }));

      onSaveFlashcards(cards);
      setCurrentCardIdx(0);
      setIsCardFlipped(false);
      setMasteredCardIds([]);
      setNeedsReviewCardIds([]);
    } catch (err: any) {
      setActionError(err.message || 'Flashcards generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (qIdx: number, optionIdx: number) => {
    // Only allow selecting if not already answered
    if (selectedAnswers[qIdx] !== undefined) return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: optionIdx
    }));
  };

  const calculateScore = () => {
    if (!activeQuiz) return { score: 0, total: 0, percent: 0 };
    let correct = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correct++;
      }
    });
    const total = activeQuiz.questions.length;
    return {
      score: correct,
      total,
      percent: Math.round((correct / total) * 100)
    };
  };

  const handleFinishQuiz = () => {
    setIsSubmitted(true);
    const results = calculateScore();
    if (results.percent >= 70) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setIsSubmitted(false);
  };

  const currentQ = activeQuiz?.questions[currentQuestionIdx];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = activeQuiz ? answeredCount === activeQuiz.questions.length : false;

  return (
    <div id="quiz-view-root" className="space-y-6">
      {/* Top Banner & Mode Tabs */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 id="quiz-view-heading" className="text-2xl font-extrabold text-stone-900 tracking-tight">
              Active Recall & Testing
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
              Exam Practice
            </span>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Test conceptual mastery with adaptive multiple-choice quizzes and active recall decks
          </p>
        </div>

        {/* Action Controls & Sub-tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1">
            <button
              id="subtab-quiz"
              onClick={() => setSubTab('quiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'quiz'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📝 Practice Quiz ({quizzes.length})
            </button>
            <button
              id="subtab-flashcards"
              onClick={() => setSubTab('flashcards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'flashcards'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🗂️ Flashcard Deck ({flashcards.length})
            </button>
          </div>

          {subTab === 'quiz' ? (
            <button
              id="btn-open-quiz-config"
              onClick={() => setShowQuizConfig(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate Quiz</span>
            </button>
          ) : (
            <button
              id="btn-gen-flashcards"
              onClick={handleGenerateFlashcards}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isGenerating ? 'Generating...' : 'Generate Flashcards'}</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div id="quiz-action-error" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="shrink-0 font-bold">⚠️</span>
            <div>{actionError}</div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-stone-400 hover:text-stone-600 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* QUIZ SUB-TAB */}
      {subTab === 'quiz' && (
        <div>
          {!activeQuiz ? (
            <div id="quiz-empty-state" className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <HelpCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-900">No active quiz selected</h3>
              <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
                Generate an exam-level quiz from your selected notes to test your understanding with instant explanations.
              </p>
              <button
                id="btn-empty-generate-quiz"
                onClick={() => setShowQuizConfig(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Create Practice Quiz</span>
              </button>
            </div>
          ) : isSubmitted ? (
            /* Results Screen */
            <div id="quiz-results-card" className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs max-w-3xl mx-auto space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-amber-700" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Quiz Completed
                </span>
                <h2 className="text-2xl font-extrabold text-stone-900 mt-1">
                  {activeQuiz.title}
                </h2>
              </div>

              {/* Score Display */}
              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 max-w-sm mx-auto">
                <div className="text-4xl font-extrabold text-stone-900">
                  {calculateScore().score} / {calculateScore().total}
                </div>
                <div className="text-sm font-semibold text-amber-800 mt-1">
                  {calculateScore().percent}% Accuracy
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  {calculateScore().percent >= 80 
                    ? 'Excellent mastery! You have strong conceptual grasp of this topic.' 
                    : calculateScore().percent >= 60 
                      ? 'Good progress. Review the explanations below for tricky concepts.' 
                      : 'Keep practicing. Re-read the source notes and test again.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  id="btn-retake-quiz"
                  onClick={handleRetakeQuiz}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Quiz</span>
                </button>

                <button
                  id="btn-new-quiz-from-results"
                  onClick={() => setShowQuizConfig(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-sm font-semibold transition-colors shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>New Quiz</span>
                </button>
              </div>

              {/* Detailed Question Review */}
              <div className="pt-6 border-t border-stone-200 text-left space-y-4">
                <h3 className="text-base font-bold text-stone-900">Question Review</h3>
                <div className="space-y-4">
                  {activeQuiz.questions.map((q, idx) => {
                    const studentAns = selectedAnswers[idx];
                    const isCorrect = studentAns === q.correctAnswerIndex;

                    return (
                      <div
                        key={q.id}
                        id={`review-question-${idx}`}
                        className={`p-4 rounded-xl border ${
                          isCorrect 
                            ? 'bg-emerald-50/50 border-emerald-200' 
                            : 'bg-red-50/50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-2 flex-1">
                            <p className="text-sm font-bold text-stone-900">
                              {idx + 1}. {q.question}
                            </p>

                            <div className="text-xs space-y-1">
                              <p className="text-stone-600">
                                Your answer: <strong className={isCorrect ? 'text-emerald-700' : 'text-red-700'}>{q.options[studentAns] || 'Unanswered'}</strong>
                              </p>
                              {!isCorrect && (
                                <p className="text-emerald-800">
                                  Correct answer: <strong>{q.options[q.correctAnswerIndex]}</strong>
                                </p>
                              )}
                            </div>

                            <p className="text-xs text-stone-700 bg-white/80 p-2.5 rounded-lg border border-stone-200/60 leading-relaxed">
                              💡 <strong>Explanation:</strong> {q.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Active Quiz Taking Interface */
            <div id="quiz-taker-card" className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
              {/* Question Header & Navigation dots */}
              <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md">
                    Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                  </span>
                  <span className="text-xs text-stone-400">
                    Topic: {currentQ?.topicArea}
                  </span>
                </div>

                <span className="text-xs font-semibold text-stone-500">
                  {answeredCount} of {activeQuiz.questions.length} answered
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-stone-900 h-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <div className="py-2">
                <h2 id="current-question-text" className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                  {currentQ?.question}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ?.options.map((option, optIdx) => {
                  const isSelected = selectedAnswers[currentQuestionIdx] === optIdx;
                  const hasAnswered = selectedAnswers[currentQuestionIdx] !== undefined;
                  const isCorrect = optIdx === currentQ.correctAnswerIndex;

                  let optionStyles = 'bg-stone-50 border-stone-200 hover:border-stone-400 text-stone-800';
                  if (hasAnswered) {
                    if (isSelected && isCorrect) {
                      optionStyles = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrect) {
                      optionStyles = 'bg-red-50 border-red-500 text-red-950 font-medium ring-1 ring-red-500';
                    } else if (isCorrect) {
                      optionStyles = 'bg-emerald-50/60 border-emerald-400 text-emerald-900';
                    } else {
                      optionStyles = 'bg-stone-50/60 border-stone-200 text-stone-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      id={`opt-${currentQuestionIdx}-${optIdx}`}
                      onClick={() => handleSelectOption(currentQuestionIdx, optIdx)}
                      disabled={hasAnswered}
                      className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${optionStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-stone-200/70 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-snug">{option}</span>
                      </div>

                      {hasAnswered && (
                        <div className="shrink-0 ml-2">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : isSelected ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Immediate Feedback / Explanation Card */}
              {selectedAnswers[currentQuestionIdx] !== undefined && (
                <div id="immediate-explanation-box" className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold text-stone-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Concept Breakdown</span>
                  </div>
                  <p>{currentQ?.explanation}</p>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <button
                  id="btn-prev-question"
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(prev - 1, 0))}
                  disabled={currentQuestionIdx === 0}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-30 rounded-lg"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <button
                      id="btn-next-question"
                      onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      id="btn-submit-quiz"
                      onClick={handleFinishQuiz}
                      disabled={!isAllAnswered}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Finish & View Score</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FLASHCARDS SUB-TAB */}
      {subTab === 'flashcards' && (
        <div id="flashcards-container" className="space-y-6">
          {flashcards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Layers className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-900">No Flashcard Deck Generated</h3>
              <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
                Generate active recall flashcards from your uploaded study notes to build muscle memory on core definitions and steps.
              </p>
              <button
                id="btn-empty-create-flashcards"
                onClick={handleGenerateFlashcards}
                disabled={isGenerating}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{isGenerating ? 'Synthesizing Cards...' : 'Generate Flashcards'}</span>
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Deck Stats Bar */}
              <div className="flex items-center justify-between text-xs text-stone-600 bg-white p-3 rounded-xl border border-stone-200">
                <span className="font-semibold">
                  Card {currentCardIdx + 1} of {flashcards.length}
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 font-semibold">
                    ✓ Mastered: {masteredCardIds.length}
                  </span>
                  <span className="text-amber-800 font-semibold">
                    ↺ Review: {needsReviewCardIds.length}
                  </span>
                </div>
              </div>

              {/* 3D-Like Flashcard Box */}
              <div
                id="active-flashcard"
                onClick={() => setIsCardFlipped(prev => !prev)}
                className="min-h-[280px] bg-white rounded-2xl border-2 border-stone-200 hover:border-amber-600/50 p-8 flex flex-col justify-between cursor-pointer transition-all shadow-sm hover:shadow-md select-none"
              >
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                    {flashcards[currentCardIdx]?.subject}
                  </span>
                  <span className="flex items-center gap-1 text-stone-500 font-medium">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Click to {isCardFlipped ? 'show prompt' : 'reveal answer'}</span>
                  </span>
                </div>

                <div className="py-6 text-center my-auto">
                  {!isCardFlipped ? (
                    <div>
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest block mb-2">
                        Question / Concept
                      </span>
                      <p className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                        {flashcards[currentCardIdx]?.front}
                      </p>
                    </div>
                  ) : (
                    <div className="animate-fadeIn">
                      <span className="text-xs font-semibold text-emerald-700 uppercase tracking-widest block mb-2">
                        Recall Answer
                      </span>
                      <p className="text-base sm:text-lg font-medium text-stone-800 leading-relaxed max-w-lg mx-auto">
                        {flashcards[currentCardIdx]?.back}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] text-stone-400">
                  {isCardFlipped ? 'Tap card again to flip back' : 'Tap to test your recall'}
                </div>
              </div>

              {/* Flashcard Action Buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  id="btn-card-needs-review"
                  onClick={() => {
                    const id = flashcards[currentCardIdx].id;
                    if (!needsReviewCardIds.includes(id)) {
                      setNeedsReviewCardIds(prev => [...prev, id]);
                      setMasteredCardIds(prev => prev.filter(x => x !== id));
                    }
                    setIsCardFlipped(false);
                    setCurrentCardIdx(prev => (prev + 1) % flashcards.length);
                  }}
                  className="flex-1 py-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors"
                >
                  ↺ Needs Review
                </button>

                <button
                  id="btn-card-mastered"
                  onClick={() => {
                    const id = flashcards[currentCardIdx].id;
                    if (!masteredCardIds.includes(id)) {
                      setMasteredCardIds(prev => [...prev, id]);
                      setNeedsReviewCardIds(prev => prev.filter(x => x !== id));
                    }
                    setIsCardFlipped(false);
                    setCurrentCardIdx(prev => (prev + 1) % flashcards.length);
                  }}
                  className="flex-1 py-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-colors"
                >
                  ✓ Mastered It
                </button>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  id="btn-prev-card"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setCurrentCardIdx(prev => (prev - 1 + flashcards.length) % flashcards.length);
                  }}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  ← Previous Card
                </button>

                <button
                  id="btn-next-card"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setCurrentCardIdx(prev => (prev + 1) % flashcards.length);
                  }}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Next Card →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quiz Configuration Modal */}
      {showQuizConfig && (
        <div id="quiz-config-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Generate Practice Quiz
              </h3>
              <p className="text-xs text-stone-500">
                AI creates multiple-choice questions grounded in your active notes
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Number of Questions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 8, 10].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                        questionCount === cnt
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 text-xs font-bold capitalize rounded-lg border transition-colors ${
                        difficulty === diff
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600">
                <span>Grounded in: </span>
                <strong className="text-stone-800">
                  {activeNotes.length > 0 
                    ? activeNotes.map(n => n.title).join(', ') 
                    : 'Standard subject core topics (No notes selected)'}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowQuizConfig(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 rounded-lg"
              >
                Cancel
              </button>

              <button
                id="btn-confirm-generate-quiz"
                onClick={handleGenerateQuiz}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Formulating Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Generate Quiz</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
