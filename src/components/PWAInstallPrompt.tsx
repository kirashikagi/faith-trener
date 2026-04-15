import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAInstallPromptProps {
  show: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export function PWAInstallPrompt({ show, onClose, onInstall }: PWAInstallPromptProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 z-[100] max-w-md mx-auto"
        >
          <div className="bg-primary-600 text-white p-6 rounded-[2.5rem] shadow-2xl shadow-primary-600/40 flex items-center gap-4 relative overflow-hidden group">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl">
              V+
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight">Установить Вера +1</h3>
              <p className="text-xs text-white/80">Добавьте на главный экран для быстрого доступа</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={onInstall}
                className="bg-white text-primary-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-50 transition-colors"
              >
                Установить
              </button>
              <button 
                onClick={onClose}
                className="text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
