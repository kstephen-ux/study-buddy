import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { StudyNote } from '../types';

interface UploadNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: StudyNote, autoAnalyze: boolean) => Promise<void>;
}

export const UploadNoteModal: React.FC<UploadNoteModalProps> = ({
  isOpen,
  onClose,
  onSaveNote,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      setContent(text);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      setError('Could not read file text. Please ensure it is a plain text or markdown file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and note content are required.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newNote: StudyNote = {
      id: `note-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim() || 'General',
      content: content.trim(),
      tags: tags.length > 0 ? tags : [subject.trim() || 'Study'],
      createdAt: new Date().toISOString(),
      wordCount: content.trim().split(/\s+/).length,
    };

    try {
      await onSaveNote(newNote, autoAnalyze);
      setTitle('');
      setSubject('');
      setContent('');
      setTagsInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExampleTemplate = () => {
    setTitle('Physics: Thermodynamics & Entropy');
    setSubject('Physics');
    setContent(`# Laws of Thermodynamics\n\n## 1. Zeroth Law\nIf body A is in thermal equilibrium with body B, and B with C, then A is in thermal equilibrium with C. Defines temperature.\n\n## 2. First Law of Thermodynamics\nEnergy cannot be created or destroyed, only transformed.\nFormula: Delta U = Q - W\nWhere Delta U is change in internal energy, Q is heat added, and W is work done by system.\n\n## 3. Second Law (Entropy)\nIn any spontaneous process, the total entropy of an isolated system always increases (Delta S_universe > 0).\nHeat flows spontaneously from hot reservoirs to cold reservoirs, never in reverse without external work.\n\n## 4. Third Law\nAs temperature approaches absolute zero (0 Kelvin), the entropy of a pure crystalline substance approaches zero.`);
    setTagsInput('Physics, Thermodynamics, Exam');
  };

  return (
    <div 
      id="upload-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs"
    >
      <div 
        id="upload-modal-container" 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-stone-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div>
            <h2 id="upload-modal-heading" className="text-lg font-bold text-stone-900">
              Upload Study Notes
            </h2>
            <p className="text-xs text-stone-500">
              Add lecture transcripts, textbook notes, or outlines for AI grounding
            </p>
          </div>
          <button
            id="btn-close-upload-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div id="upload-error-alert" className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & drop upload area */}
          <div
            id="drag-drop-zone"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-amber-600 bg-amber-50/50' 
                : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.text"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-1.5">
              <UploadCloud className="w-8 h-8 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">
                Drop your note file (.txt, .md) here, or <span className="text-amber-800 underline">browse</span>
              </p>
              <p className="text-xs text-stone-400">
                Or write or paste your notes directly below
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              id="btn-insert-sample"
              onClick={loadExampleTemplate}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline"
            >
              Insert Sample Physics Note
            </button>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="note-title-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                Note Title *
              </label>
              <input
                id="note-title-input"
                type="text"
                placeholder="e.g. Cellular Respiration, Chapter 4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                required
              />
            </div>

            <div>
              <label htmlFor="note-subject-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                Subject / Course
              </label>
              <input
                id="note-subject-input"
                type="text"
                placeholder="e.g. Biology 101, AP Euro"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="note-content-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Note Content (Markdown supported) *
            </label>
            <textarea
              id="note-content-input"
              rows={8}
              placeholder="Paste your lecture notes, summaries, formulas, or outlines here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-stone-800 bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="note-tags-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Tags (comma separated)
            </label>
            <input
              id="note-tags-input"
              type="text"
              placeholder="e.g. Midterm, Formulas, High Yield"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="cb-auto-analyze"
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              className="w-4 h-4 rounded text-amber-700 focus:ring-amber-500 border-stone-300"
            />
            <label htmlFor="cb-auto-analyze" className="text-sm text-stone-700 cursor-pointer flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Auto-extract key terms & generate executive summary using AI</span>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              id="btn-cancel-note"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="btn-save-note"
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Save Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
