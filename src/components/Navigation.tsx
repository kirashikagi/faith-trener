import React from 'react';
import { cn } from '../lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  isAdmin?: boolean;
}

export function Navigation({ activeTab, onTabChange, isAdmin }: NavigationProps) {
  const tabs = [
    { id: 'home', label: 'Главная' },
    { id: 'library', label: 'Библиотека' },
    { id: 'profile', label: 'Профиль' },
    ...(isAdmin ? [{ id: 'admin', label: 'Админ' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              activeTab === tab.id 
                ? "text-primary-600 dark:text-primary-400 scale-110" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
