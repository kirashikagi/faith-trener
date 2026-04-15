import React from 'react';
import { motion } from 'motion/react';
import { UserProfile, UserStats } from '../types';
import { cn } from '../lib/utils';

interface ProfileProps {
  profile: UserProfile;
  stats: UserStats;
  onLogout: () => void;
  onShowSubscription: () => void;
}

export function Profile({ profile, stats, onLogout, onShowSubscription }: ProfileProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="px-6 pt-12 pb-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-b-[3rem] shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-3xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-2xl">
            {profile.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{profile.displayName || 'Пользователь'}</h1>
            <p className="text-sm text-slate-500 truncate">{profile.email}</p>
          </div>
          <button onClick={onLogout} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">
            Выйти
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{profile.streak || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ударный день</p>
          </div>
          <div className="text-center border-x border-slate-100 dark:border-slate-800">
            <p className="text-2xl font-bold text-primary-600">{stats.totalSessions}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Сессии</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{Math.round(stats.averageScore * 10) / 10}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ср. балл</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-24 app-scroll">
        {/* Subscription Card */}
        <button 
          onClick={onShowSubscription}
          className={cn(
            "w-full p-6 rounded-3xl flex items-center justify-between group transition-all duration-300",
            profile.isSubscribed 
              ? "bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/20" 
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-400"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="text-left">
              <h3 className="font-bold">{profile.isSubscribed ? 'Премиум активен' : 'Стать Премиум'}</h3>
              <p className={cn("text-xs", profile.isSubscribed ? "text-white/80" : "text-slate-500")}>
                {profile.isSubscribed ? 'Доступ ко всем функциям открыт' : 'Разблокируйте все возможности'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Открыть</span>
        </button>

        {/* Achievements */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Достижения</h2>
            <span className="text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-lg">
              {stats.achievements.filter(a => a.unlocked).length} / {stats.achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.achievements.map((achievement) => (
              <div 
                key={achievement.id}
                className={cn(
                  "p-4 rounded-3xl border transition-all duration-300 flex flex-col items-center text-center gap-2",
                  achievement.unlocked 
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm" 
                    : "bg-slate-100/50 dark:bg-slate-900/50 border-transparent opacity-50 grayscale"
                )}
              >
                <div className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mb-1">Награда</div>
                <h4 className="text-xs font-bold">{achievement.title}</h4>
                <p className="text-[10px] text-slate-500 leading-tight">{achievement.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
