import React from 'react';
import { motion } from 'motion/react';
import { Scenario } from '../types';
import { cn } from '../lib/utils';

interface ScenarioCardProps {
  scenario: Scenario;
  onClick: () => void;
}

export function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  const difficultyColors = {
    easy: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    medium: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    hard: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
  };

  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card-premium w-full text-left flex flex-col gap-4 group"
    >
      <div className="flex items-start justify-between">
        <div className="px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[10px] font-bold uppercase tracking-widest">
          {scenario.category}
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg",
          difficultyColors[scenario.difficulty]
        )}>
          {scenario.difficulty}
        </span>
      </div>
      
      <div>
        <h3 className="text-lg font-bold mb-1 group-hover:text-primary-600 transition-colors">{scenario.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{scenario.description}</p>
      </div>
      
      <div className="mt-auto pt-4 flex items-center text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        Начать диалог
      </div>
    </motion.button>
  );
}
