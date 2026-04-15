import React from 'react';
import { motion } from 'motion/react';

export function Splash() {
  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <div className="w-24 h-24 bg-primary-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary-600/40 text-white font-bold text-4xl">
          V+
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-primary-400 rounded-[2.5rem] -z-10 blur-2xl"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">Вера +1</h1>
        <div className="flex items-center gap-2 justify-center">
          <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" />
          <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.2s]" />
          <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </motion.div>
    </div>
  );
}
