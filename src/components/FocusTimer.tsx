import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, CheckCircle } from 'lucide-react';

export const FocusTimer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'study' | 'break'>('study');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (timerMode === 'study') {
        setSessionsCompleted(prev => prev + 1);
        setTimerMode('break');
        setTimeLeft(5 * 60);
      } else {
        setTimerMode('study');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode]);

  const toggleRun = () => setIsRunning(prev => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(timerMode === 'study' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div id="focus-timer-widget" className="fixed bottom-4 right-4 z-40">
      {!isOpen ? (
        <button
          id="btn-open-focus-timer"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-stone-900 text-white shadow-lg hover:bg-stone-800 transition-all text-xs font-semibold"
        >
          <Clock className={`w-3.5 h-3.5 ${isRunning ? 'text-emerald-400 animate-spin' : 'text-amber-400'}`} />
          <span>{formattedTime}</span>
          {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
        </button>
      ) : (
        <div id="focus-timer-card" className="bg-white rounded-2xl border border-stone-200 shadow-xl p-4 w-64 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                {timerMode === 'study' ? 'Deep Work Block' : 'Short Rest'}
              </span>
            </div>
            <button
              id="btn-close-focus-timer"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-700 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>

          <div className="text-center py-2">
            <div className="text-3xl font-extrabold font-mono text-stone-900">
              {formattedTime}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {sessionsCompleted} focus block{sessionsCompleted !== 1 ? 's' : ''} completed today
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              id="btn-toggle-timer"
              onClick={toggleRun}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                isRunning
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>

            <button
              id="btn-reset-timer"
              onClick={resetTimer}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50"
              title="Reset timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100">
            <button
              onClick={() => {
                setTimerMode('study');
                setTimeLeft(25 * 60);
                setIsRunning(false);
              }}
              className={`hover:underline ${timerMode === 'study' ? 'font-bold text-stone-900' : ''}`}
            >
              25m Study
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setTimerMode('break');
                setTimeLeft(5 * 60);
                setIsRunning(false);
              }}
              className={`hover:underline ${timerMode === 'break' ? 'font-bold text-stone-900' : ''}`}
            >
              5m Break
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
