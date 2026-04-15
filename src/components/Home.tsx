import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Scenario } from '../types';
import { ScenarioCard } from './ScenarioCard';
import { cn } from '../lib/utils';

interface HomeProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  dailyFact: string;
}

export function Home({ scenarios, onSelectScenario, dailyFact }: HomeProps) {
  const [filter, setFilter] = useState<'all' | 'faith' | 'life' | 'crisis'>('all');
  
  const filteredScenarios = scenarios.filter(s => filter === 'all' || s.category === filter);

  const categories = [
    { id: 'all', label: 'Все' },
    { id: 'faith', label: 'Вера' },
    { id: 'life', label: 'Жизнь' },
    { id: 'crisis', label: 'Кризис' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="px-6 pt-12 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">Вера +1</h1>
            <p className="text-sm text-slate-500">Тренажер духовного общения</p>
          </div>
          <div className="w-12 h-12 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/20 text-white flex items-center justify-center font-bold text-xl">
            V+
          </div>
        </div>

        {/* Daily Fact */}
        <div className="bg-linear-to-br from-primary-600 to-primary-800 p-6 rounded-[2.5rem] text-white shadow-xl shadow-primary-600/20 mb-8 relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg mb-3 inline-block">
              Факт дня
            </span>
            <p className="text-sm font-medium leading-relaxed">
              {dailyFact}
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 uppercase tracking-wider",
                filter === cat.id 
                  ? "bg-primary-600 text-white shadow-md shadow-primary-600/20" 
                  : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-4 app-scroll">
        <div className="grid grid-cols-1 gap-4">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard 
              key={scenario.id} 
              scenario={scenario} 
              onClick={() => onSelectScenario(scenario)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
