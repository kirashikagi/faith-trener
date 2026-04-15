import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { LibraryArticle } from '../types';
import { cn } from '../lib/utils';

interface LibraryProps {
  articles: LibraryArticle[];
  purchasedArticles: string[];
  isSubscribed: boolean;
  onPurchase: (id: string) => void;
}

export function Library({ articles, purchasedArticles, isSubscribed, onPurchase }: LibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<LibraryArticle | null>(null);

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="px-6 pt-8 pb-4">
        <h1 className="text-3xl font-bold mb-6">Библиотека</h1>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск статей..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 shadow-sm"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-4 app-scroll">
        {filteredArticles.map((article) => {
          const hasAccess = !article.isPremium || isSubscribed || purchasedArticles.includes(article.id);
          
          return (
            <motion.button
              key={article.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedArticle(article)}
              className="card-premium w-full text-left flex flex-col gap-3 group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-lg">
                  {article.category}
                </span>
                {!hasAccess && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Premium</span>}
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-1 group-hover:text-primary-600 transition-colors">{article.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{article.description}</p>
              </div>
              
              <div className="flex items-center text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider gap-2">
                Читать статью
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white dark:bg-slate-950 overflow-y-auto pt-safe"
          >
            <div className="max-w-2xl mx-auto px-6 py-8">
              <button 
                onClick={() => setSelectedArticle(null)}
                className="mb-8 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Закрыть
              </button>
              
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-4 block">
                  {selectedArticle.category}
                </span>
                <h1 className="text-3xl font-bold mb-4">{selectedArticle.title}</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                  {selectedArticle.description}
                </p>
              </div>

              {(!selectedArticle.isPremium || isSubscribed || purchasedArticles.includes(selectedArticle.id)) ? (
                <div className="prose dark:prose-invert prose-slate max-w-none">
                  <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl p-8 text-center space-y-6 border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-primary-500 uppercase tracking-[0.2em]">Заблокировано</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Статья заблокирована</h3>
                    <p className="text-sm text-slate-500">Эта статья доступна только по подписке или после разовой покупки.</p>
                  </div>
                  <button 
                    onClick={() => onPurchase(selectedArticle.id)}
                    className="btn-primary w-full"
                  >
                    Купить за {selectedArticle.price} ₽
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
