import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Lightbulb, 
  HelpCircle,
  GraduationCap,
  Target
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, StudyNote, TutorMode } from '../types';

interface AskBuddyViewProps {
  notes: StudyNote[];
  selectedNoteIds: string[];
  onOpenUpload: () => void;
  onSwitchToNotesTab: () => void;
}

export const AskBuddyView: React.FC<AskBuddyViewProps> = ({
  notes,
  selectedNoteIds,
  onOpenUpload,
  onSwitchToNotesTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I'm your **StudyBuddy AI tutor**. I'm here to explain difficult concepts, test your recall, break down mechanisms, and prepare you for exams.\n\n` +
        (selectedNoteIds.length > 0 
          ? `I currently have **${selectedNoteIds.length} note(s)** active in my context. Ask me anything about them, or click any suggested prompt below!`
          : `You don't have any notes selected in AI context right now. Head over to the **Notes** tab to pick or upload notes, or ask me any general question!`),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'Explain the most confusing concept in my notes',
        'Give me 3 practice questions with explanations',
        'Create a mnemonic to memorize the core steps',
        'What are the most common exam traps on this topic?'
      ]
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [mode, setMode] = useState<TutorMode>('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeNotes = notes.filter(n => selectedNoteIds.includes(n.id));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode,
          activeNotes,
          history: messages.slice(-4).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            text: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get answer from AI tutor.');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Here is what I found based on your notes.',
        mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: data.suggestedFollowUps || [],
        referencedNotes: data.referencedNotes || activeNotes.map(n => n.title)
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Sorry, I encountered an issue: ${err.message || 'Please verify your server and connection.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedFollowUps: ['Try asking in a simpler way', 'Explain the core definition']
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeech = (id: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeakingId === id) {
        window.speechSynthesis.cancel();
        setIsSpeakingId(null);
      } else {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[#*`_\[\]]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => setIsSpeakingId(null);
        utterance.onerror = () => setIsSpeakingId(null);
        window.speechSynthesis.speak(utterance);
        setIsSpeakingId(id);
      }
    }
  };

  const clearChat = () => {
    if (confirm('Clear chat history?')) {
      setMessages([
        {
          id: `welcome-new-${Date.now()}`,
          role: 'assistant',
          content: 'Chat cleared! What would you like to explore next?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedFollowUps: [
            'Test me on definitions',
            'Compare two concepts from my notes',
            'Provide an intuitive summary'
          ]
        }
      ]);
    }
  };

  return (
    <div id="ask-buddy-root" className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[560px] bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Ask Buddy Top Bar */}
      <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center font-bold text-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="ask-buddy-heading" className="text-sm font-bold text-stone-900">
                StudyBuddy Tutor
              </h2>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">
                Active
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {activeNotes.length > 0 ? (
                <span>
                  Grounded in: <strong className="text-stone-700">{activeNotes.map(n => n.title).join(', ')}</strong>
                </span>
              ) : (
                <span className="text-amber-800">
                  No notes selected. <button onClick={onSwitchToNotesTab} className="underline font-semibold">Select notes</button> for grounded answers.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
          <button
            id="mode-balanced"
            onClick={() => setMode('balanced')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'balanced' 
                ? 'bg-white text-stone-900 shadow-xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🎓 Balanced
          </button>
          <button
            id="mode-eli5"
            onClick={() => setMode('eli5')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'eli5' 
                ? 'bg-white text-stone-900 shadow-xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Explain Like I'm 5 (Simple metaphors)"
          >
            💡 ELI5
          </button>
          <button
            id="mode-socratic"
            onClick={() => setMode('socratic')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'socratic' 
                ? 'bg-white text-stone-900 shadow-xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Socratic method (Guides with questions & hints)"
          >
            ❓ Socratic
          </button>
          <button
            id="mode-exam"
            onClick={() => setMode('exam-prep')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'exam-prep' 
                ? 'bg-white text-stone-900 shadow-xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Exam Focus (Grading rubrics, traps, keywords)"
          >
            🎯 Exam Prep
          </button>

          <button
            id="btn-clear-chat"
            onClick={clearChat}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 ml-1"
            title="Clear Chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div id="chat-messages-container" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              id={`chat-msg-${msg.id}`}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-semibold text-stone-600">
                  {isUser ? 'You' : 'StudyBuddy'}
                </span>
                <span className="text-[11px] text-stone-400">
                  {msg.timestamp}
                </span>
                {msg.mode && !isUser && (
                  <span className="text-[10px] uppercase font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded">
                    {msg.mode}
                  </span>
                )}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-stone-900 text-white rounded-tr-none'
                    : 'bg-stone-50 border border-stone-200/80 text-stone-900 rounded-tl-none'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="markdown-body space-y-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Assistant message action controls */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-stone-200/60 text-xs text-stone-500">
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-copy-${msg.id}`}
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {'speechSynthesis' in window && (
                        <button
                          id={`btn-speech-${msg.id}`}
                          onClick={() => handleSpeech(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                          title="Read Aloud"
                        >
                          {isSpeakingId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                              <span className="text-amber-700">Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {msg.referencedNotes && msg.referencedNotes.length > 0 && (
                      <span className="text-[11px] text-stone-400 truncate max-w-[200px]">
                        Ref: {msg.referencedNotes.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Suggested Follow-up chips */}
              {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 max-w-[85%]">
                  {msg.suggestedFollowUps.map((prompt, idx) => (
                    <button
                      key={idx}
                      id={`btn-followup-${msg.id}-${idx}`}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isLoading}
                      className="text-xs bg-white border border-stone-200 text-stone-700 hover:border-amber-600 hover:text-amber-900 px-3 py-1.5 rounded-full transition-all text-left shadow-2xs hover:shadow-xs disabled:opacity-50"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl rounded-tl-none p-4 text-sm text-stone-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Thinking & synthesizing notes...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="p-4 border-t border-stone-200 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            id="chat-user-input"
            rows={2}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              activeNotes.length > 0
                ? `Ask anything about "${activeNotes[0].title}" or your coursework... (Shift+Enter for newline)`
                : "Ask any academic question or concept clarification..."
            }
            className="flex-1 resize-none rounded-xl border border-stone-300 p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-stone-50 focus:bg-white transition-colors"
          />

          <button
            id="btn-send-message"
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="h-11 px-4 rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-stone-900 transition-colors flex items-center justify-center shrink-0 shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 text-[11px] text-stone-400 px-1">
          <span>Mode: <strong className="text-stone-600 uppercase">{mode}</strong></span>
          <span>Tip: Press <kbd className="px-1 py-0.5 bg-stone-100 border rounded text-[10px]">Enter</kbd> to send</span>
        </div>
      </div>
    </div>
  );
};
