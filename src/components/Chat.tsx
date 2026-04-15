import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Scenario, Message, ResponseOption, Feedback } from '../types';
import { cn } from '../lib/utils';

interface ChatProps {
  scenario: Scenario;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onBack: () => void;
  isLoading: boolean;
  options?: ResponseOption[];
  feedback?: Feedback | null;
  isAnalyzing?: boolean;
}

export function Chat({ scenario, messages, onSendMessage, onBack, isLoading, options, feedback, isAnalyzing }: ChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, options, isAnalyzing]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-10 px-4 py-3 flex items-center gap-4">
        <button onClick={onBack} className="px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          Назад
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold truncate">{scenario.title}</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{scenario.mode === 'chat' ? 'Свободный диалог' : 'Работа с критикой'}</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 app-scroll">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-primary-600 text-white rounded-tr-none" 
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none"
              )}>
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 p-2">
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          </motion.div>
        )}

        {/* Response Options for Criticism Mode */}
        {scenario.mode === 'criticism' && options && options.length > 0 && !isLoading && (
          <div className="space-y-3 mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Выберите вариант ответа:</p>
            {options.map((opt, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onSendMessage(opt.text)}
                className="w-full text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-400 transition-all shadow-sm group"
              >
                <p className="text-sm font-medium group-hover:text-primary-600 transition-colors">{opt.text}</p>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {scenario.mode === 'chat' && (
        <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
          <div className="max-w-3xl mx-auto flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ваш ответ..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 resize-none max-h-32"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              Отправить
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
