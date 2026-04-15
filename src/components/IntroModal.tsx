import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PHILOSOPHY } from '../constants';

interface IntroModalProps {
  show: boolean;
  onClose: () => void;
}

export function IntroModal({ show, onClose }: IntroModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{PHILOSOPHY.title}</h2>
              </div>
              <button 
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Закрыть
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 app-scroll">
              <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-3xl border border-primary-100 dark:border-primary-900/20">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{PHILOSOPHY.content}"
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Как это работает:</h3>
                <div className="grid gap-3">
                  {PHILOSOPHY.instruction.map((text, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-primary-600 shrink-0 shadow-sm">
                        {i + 1}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={onClose}
                className="btn-primary w-full"
              >
                Понятно, приступим
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
