import React from 'react';
import { FeedbackSubmission, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface AdminProps {
  feedback: FeedbackSubmission[];
  users: UserProfile[];
  stats: { users: number; feedback: number };
}

export function Admin({ feedback, users, stats }: AdminProps) {
  const [activeTab, setActiveTab] = React.useState<'feedback' | 'users'>('feedback');

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="px-6 pt-8 pb-4">
        <h1 className="text-3xl font-bold mb-6">Админ-панель</h1>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Пользователи</span>
            </div>
            <p className="text-2xl font-bold">{stats.users}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Отзывы</span>
            </div>
            <p className="text-2xl font-bold">{stats.feedback}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('feedback')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'feedback' ? "bg-primary-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800"
            )}
          >
            Отзывы
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'users' ? "bg-primary-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800"
            )}
          >
            Пользователи
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-4 app-scroll">
        {activeTab === 'feedback' ? (
          <>
            <h2 className="text-xl font-bold mb-4">Последние отзывы</h2>
            {feedback.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>Отзывов пока нет</p>
              </div>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg",
                      item.type === 'ai_feedback' ? "bg-primary-50 text-primary-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {item.type === 'ai_feedback' ? 'ИИ Анализ' : 'Общий'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item.message}</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <span className="text-xs text-slate-500 truncate">{item.email || 'Аноним'}</span>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Список пользователей</h2>
            {users.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>Пользователей пока нет</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.uid} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{user.displayName || 'Без имени'}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-1 rounded-lg",
                      user.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {user.role}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
