import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AuthProps {
  onAuth: (email: string, pass: string, mode: 'login' | 'register') => void;
  error?: string;
}

export function Auth({ onAuth, error }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuth(email, password, mode);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary-600/30 mb-6 text-white font-bold text-3xl">
            V+
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Вера +1</h1>
          <p className="text-slate-500 dark:text-slate-400">Тренажер интеллектуального общения</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl flex mb-8">
          <button 
            onClick={() => setMode('login')}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
              mode === 'login' ? "bg-white dark:bg-slate-800 shadow-sm text-primary-600" : "text-slate-400"
            )}
          >
            Вход
          </button>
          <button 
            onClick={() => setMode('register')}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
              mode === 'register' ? "bg-white dark:bg-slate-800 shadow-sm text-primary-600" : "text-slate-400"
            )}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? "Имя или Email" : "Придумайте имя"}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-bold text-rose-500 px-2"
            >
              {error}
            </motion.p>
          )}

          <button type="submit" className="btn-primary w-full py-4 text-xs font-bold uppercase tracking-widest">
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
          Продолжая, вы соглашаетесь с правилами использования и политикой конфиденциальности
        </p>
      </motion.div>
    </div>
  );
}
