import React, { useState } from 'react';
import { 
  Calendar, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Target, 
  BookOpen, 
  Plus, 
  Trash2,
  Download,
  Flame,
  ArrowRight
} from 'lucide-react';
import { StudyNote, StudyPlan, StudyModule, StudyTask } from '../types';

interface StudyPlanViewProps {
  plans: StudyPlan[];
  activePlan: StudyPlan | null;
  notes: StudyNote[];
  selectedNoteIds: string[];
  onSavePlan: (plan: StudyPlan) => void;
  onSelectPlan: (plan: StudyPlan) => void;
  onDeletePlan: (id: string) => void;
  onUpdatePlan: (plan: StudyPlan) => void;
}

export const StudyPlanView: React.FC<StudyPlanViewProps> = ({
  plans,
  activePlan,
  notes,
  selectedNoteIds,
  onSavePlan,
  onSelectPlan,
  onDeletePlan,
  onUpdatePlan,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyHours, setDailyHours] = useState(2);
  const [strategy, setStrategy] = useState('Spaced Repetition & Active Recall');
  const [focusGoal, setFocusGoal] = useState('Score an A on final exam');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeNotes = notes.filter(n => selectedNoteIds.includes(n.id));

  // Initialize subject from active notes if available
  React.useEffect(() => {
    if (activeNotes.length > 0 && !subject) {
      setSubject(activeNotes[0].subject || activeNotes[0].title);
    }
  }, [activeNotes]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const notesContent = activeNotes.map(n => `### ${n.title}\n${n.content}`).join('\n\n');
      
      const response = await fetch('/api/gemini/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject || (activeNotes[0]?.subject ?? 'General Studies'),
          examDate,
          dailyHours,
          strategy,
          notesContent,
          focusGoal
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate study plan.');
      }

      const generated = await response.json();
      const newPlan: StudyPlan = {
        id: `plan-${Date.now()}`,
        title: generated.title || `${subject || 'Course'} Study Plan`,
        subject: generated.subject || subject || 'Academic',
        examDate: generated.examDate || examDate,
        dailyHours: Number(dailyHours),
        strategy: generated.strategy || strategy,
        summary: generated.summary || 'A customized study schedule designed for high retention.',
        modules: generated.modules || [],
        createdAt: new Date().toISOString()
      };

      onSavePlan(newPlan);
      setShowConfigModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to generate study plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTaskCompleted = (moduleId: string, taskId: string) => {
    if (!activePlan) return;

    const updatedModules = activePlan.modules.map(mod => {
      if (mod.id !== moduleId) return mod;
      return {
        ...mod,
        tasks: mod.tasks.map(t => {
          if (t.id !== taskId) return t;
          return { ...t, completed: !t.completed };
        })
      };
    });

    const updatedPlan: StudyPlan = {
      ...activePlan,
      modules: updatedModules
    };

    onUpdatePlan(updatedPlan);
  };

  // Progress calculations
  const totalTasks = activePlan?.modules.reduce((acc, m) => acc + m.tasks.length, 0) || 0;
  const completedTasks = activePlan?.modules.reduce((acc, m) => 
    acc + m.tasks.filter(t => t.completed).length, 0) || 0;
  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div id="study-plan-root" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 id="study-plan-heading" className="text-2xl font-extrabold text-stone-900 tracking-tight">
              Study Schedule & Milestone Planner
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
              Retention-First
            </span>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Build active recall roadmaps tailored to your exam target date and daily study availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          {plans.length > 1 && (
            <select
              id="select-saved-plans"
              value={activePlan?.id || ''}
              onChange={(e) => {
                const p = plans.find(plan => plan.id === e.target.value);
                if (p) onSelectPlan(p);
              }}
              className="text-xs font-semibold border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-700"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}

          <button
            id="btn-create-new-plan"
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors shadow-xs shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>+ Build New Plan</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!activePlan ? (
        <div id="study-plan-empty" className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No active study plan</h3>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            Generate an evidence-based roadmap structured around active recall, the Feynman technique, and progressive mastery.
          </p>
          <button
            id="btn-first-plan"
            onClick={() => setShowConfigModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Generate Study Plan</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Header Card */}
          <div id="active-plan-header" className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    {activePlan.subject}
                  </span>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                    {activePlan.strategy}
                  </span>
                </div>
                <h2 id="active-plan-title" className="text-xl font-bold text-stone-900 mt-2">
                  {activePlan.title}
                </h2>
                <p className="text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
                  {activePlan.summary}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  id="btn-delete-plan"
                  onClick={() => {
                    if (confirm('Delete this study plan?')) {
                      onDeletePlan(activePlan.id);
                    }
                  }}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded-lg transition-colors"
                  title="Delete plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress & Stats Strip */}
            <div className="mt-6 pt-5 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <span className="text-xs text-stone-500 font-medium">Daily Target</span>
                <p className="text-lg font-bold text-stone-900 mt-0.5">
                  {activePlan.dailyHours} hrs / day
                </p>
              </div>

              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <span className="text-xs text-stone-500 font-medium">Exam / Deadline</span>
                <p className="text-lg font-bold text-stone-900 mt-0.5">
                  {activePlan.examDate || 'Ongoing Mastery'}
                </p>
              </div>

              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-1">
                  <span>Task Completion</span>
                  <span className="font-bold text-stone-900">{percentComplete}%</span>
                </div>
                <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  {completedTasks} of {totalTasks} items completed
                </span>
              </div>
            </div>
          </div>

          {/* Modules Timeline */}
          <div id="plan-modules-list" className="space-y-4">
            {activePlan.modules.map((module, mIdx) => (
              <div
                key={module.id || mIdx}
                id={`module-card-${module.id || mIdx}`}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-stone-900 text-white">
                      {module.dayOrWeek}
                    </span>
                    <h3 className="text-base font-bold text-stone-900">
                      {module.topic}
                    </h3>
                  </div>

                  <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md self-start sm:self-auto">
                    Method: {module.reviewTechnique}
                  </span>
                </div>

                {/* Key concepts */}
                {module.keyConcepts && module.keyConcepts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-stone-400">Focus Areas:</span>
                    {module.keyConcepts.map((concept, cIdx) => (
                      <span
                        key={cIdx}
                        className="text-xs px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md font-medium"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}

                {/* Tasks Checklist */}
                <div className="space-y-2 pt-1">
                  {module.tasks.map((task) => (
                    <div
                      key={task.id}
                      id={`task-item-${task.id}`}
                      onClick={() => toggleTaskCompleted(module.id, task.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-stone-50/70 border-stone-200 text-stone-400'
                          : 'bg-white border-stone-200 hover:border-stone-300 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="shrink-0 text-stone-400 hover:text-emerald-600 transition-colors"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-300" />
                          )}
                        </button>
                        <span className={`text-sm font-medium ${task.completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                          {task.title}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded shrink-0">
                        {task.durationMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Customize Plan Modal */}
      {showConfigModal && (
        <div id="plan-config-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div>
              <h3 id="plan-config-heading" className="text-lg font-bold text-stone-900">
                Configure Study Plan
              </h3>
              <p className="text-xs text-stone-500">
                AI will build a balanced daily schedule based on your timeline and notes
              </p>
            </div>

            {errorMessage && (
              <div id="plan-config-error" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <span className="shrink-0 font-bold">⚠️</span>
                <div>{errorMessage}</div>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Subject / Course
                </label>
                <input
                  id="input-plan-subject"
                  type="text"
                  placeholder="e.g. Biology, AP Computer Science, World History"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Exam / Target Date
                  </label>
                  <input
                    id="input-plan-exam-date"
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Daily Study Time
                  </label>
                  <select
                    id="select-plan-daily-hours"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value={1}>1 hour / day</option>
                    <option value={2}>2 hours / day</option>
                    <option value={3}>3 hours / day</option>
                    <option value={4}>4 hours / day</option>
                    <option value={5}>5+ hours / day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Retention Strategy
                </label>
                <select
                  id="select-plan-strategy"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                  <option value="Spaced Repetition & Active Recall">Spaced Repetition & Active Recall (Recommended)</option>
                  <option value="Pomodoro Focus Cycles">Pomodoro Focus Cycles (25m study + 5m review)</option>
                  <option value="Feynman Technique & Teaching">Feynman Technique (Explain core principles)</option>
                  <option value="Cramming & Fast Consolidation">Cramming & Fast Consolidation (Short timeline)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Primary Goal
                </label>
                <input
                  id="input-plan-goal"
                  type="text"
                  placeholder="e.g. Pass midterm with 90%+, understand difficult theorems"
                  value={focusGoal}
                  onChange={(e) => setFocusGoal(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600">
                <span>Active Context: </span>
                <strong className="text-stone-800">{activeNotes.length} note(s) selected</strong>
                {activeNotes.length === 0 && (
                  <p className="text-amber-800 mt-0.5">
                    No notes selected; general high-yield topics will be planned.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                id="btn-cancel-plan-modal"
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 rounded-lg"
              >
                Cancel
              </button>

              <button
                id="btn-submit-generate-plan"
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Structuring Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Generate Plan</span>
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
