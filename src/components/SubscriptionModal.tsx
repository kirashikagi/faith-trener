import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SUBSCRIPTION_PLANS } from '../constants';

interface SubscriptionModalProps {
  show: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  isLoading?: boolean;
}

export function SubscriptionModal({ show, onClose, onSubscribe, isLoading }: SubscriptionModalProps) {
  const plan = SUBSCRIPTION_PLANS[0];

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl"
          >
            <div className="bg-linear-to-br from-amber-400 to-amber-600 p-8 text-white relative overflow-hidden">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 rounded-xl transition-colors"
              >
                Закрыть
              </button>
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 font-bold">
                  PREM
                </div>
                <h2 className="text-3xl font-bold mb-2">Вера +1 Премиум</h2>
                <p className="text-white/80 text-sm">Разблокируйте полный потенциал вашего обучения</p>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <ul className="space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{plan.price}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Отмена в любое время</p>
                </div>
                
                <button 
                  onClick={onSubscribe}
                  disabled={isLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isLoading ? 'Обработка...' : 'Подписаться сейчас'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
