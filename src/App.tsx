/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, 
  HeartOff, 
  Compass, 
  ShieldAlert, 
  Zap, 
  Send, 
  RefreshCcw, 
  ChevronLeft,
  MessageSquare,
  Star,
  CheckCircle2,
  AlertCircle,
  Info,
  UserX,
  MessageSquareX,
  Trophy,
  BarChart3,
  Clock,
  ThumbsUp,
  Shield,
  Flag,
  Sun,
  Smile,
  Heart,
  LogIn,
  UserPlus,
  LogOut,
  Settings,
  ShieldCheck,
  Mail,
  Lock,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';

import { auth, db } from './firebase';
import { Scenario, Message, Feedback, Role, ResponseOption, Achievement, UserStats, UserProfile, FeedbackSubmission } from './types';
import { SCENARIOS, ACHIEVEMENTS, PHILOSOPHY } from './constants';
import { getChatResponse, getFeedback, getResponseOptions } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const IconMap: Record<string, React.ReactNode> = {
  Brain: <Brain className="w-6 h-6" />,
  HeartOff: <HeartOff className="w-6 h-6" />,
  Compass: <Compass className="w-6 h-6" />,
  ShieldAlert: <ShieldAlert className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  UserX: <UserX className="w-6 h-6" />,
  MessageSquareX: <MessageSquareX className="w-6 h-6" />,
  Flag: <Flag className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  Smile: <Smile className="w-5 h-5" />,
};

const AchievementIcons: Record<string, React.ReactNode> = {
  Flag: <Flag className="w-6 h-6" />,
  Sun: <Sun className="w-6 h-6" />,
  Shield: <Shield className="w-6 h-6" />,
  Heart: <Heart className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  Smile: <Smile className="w-6 h-6" />,
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<FeedbackSubmission[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [options, setOptions] = useState<ResponseOption[]>([]);
  const [showStats, setShowStats] = useState(false);
  
  // Firebase Auth & Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: 'user',
              createdAt: Date.now()
            };
            await setDoc(docRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    // Convert name to email format for Firebase Auth
    const internalEmail = email.includes('@') ? email : `${email.trim().toLowerCase()}@slovo.app`;
    
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, internalEmail, password);
      } else {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, internalEmail, password);
        const newProfile: UserProfile = {
          uid: newUser.uid,
          email: newUser.email || '',
          role: 'user',
          createdAt: Date.now(),
          displayName: email // Store the original name
        };
        await setDoc(doc(db, 'users', newUser.uid), newProfile);
        setUserProfile(newProfile);
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setAuthError('Неверное имя или пароль');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('Это имя уже занято');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Пароль должен быть не менее 6 символов');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('Вход по имени/паролю не включен в консоли Firebase. Пожалуйста, следуйте инструкциям в чате.');
      } else {
        setAuthError('Ошибка: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    reset();
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim() || !user) return;
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user.uid,
        email: user.email,
        message: feedbackMessage,
        createdAt: Timestamp.now()
      });
      setFeedbackMessage('');
      setShowFeedbackForm(false);
      alert("Спасибо за отзыв! Мы обязательно его прочтем.");
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  const fetchAdminFeedback = async () => {
    if (userProfile?.role !== 'admin') return;
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const feedback = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedbackSubmission[];
      setAdminFeedback(feedback);
      setShowAdmin(true);
    } catch (error) {
      console.error("Error fetching admin feedback:", error);
    }
  };

  // Telegram Web App Integration
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#ffffff');
      tg.setBackgroundColor('#fcfdfd');
    }
  }, []);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      if (selectedScenario || showStats) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => reset());
      } else {
        tg.BackButton.hide();
      }
    }
    return () => {
      const tg = (window as any).Telegram?.WebApp;
      tg?.BackButton.offClick(() => reset());
    };
  }, [selectedScenario, showStats]);

  // Stats & Achievements State
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem('faith_trainer_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error loading stats:", e);
    }
    return {
      totalSessions: 0,
      averageScore: 0,
      achievements: ACHIEVEMENTS,
      roleStats: {}
    };
  });

  const [manualKey, setManualKey] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const getEffectiveApiKey = () => {
    if (manualKey) return manualKey;
    const envKeys = [
      process.env.GEMINI_API_KEY,
      process.env.VITE_GEMINI_API_KEY,
      process.env.GOOGLE_API_KEY,
      (import.meta as any).env?.VITE_GEMINI_API_KEY
    ];
    return envKeys.find(k => k && k.trim() !== '' && k.trim() !== 'MY_GEMINI_API_KEY') || "";
  };

  const apiKeyMissing = !getEffectiveApiKey();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('faith_trainer_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, options]);

  const unlockAchievement = (id: string) => {
    setStats(prev => {
      const achievement = prev.achievements.find(a => a.id === id);
      if (achievement && !achievement.unlocked) {
        return {
          ...prev,
          achievements: prev.achievements.map(a => a.id === id ? { ...a, unlocked: true } : a)
        };
      }
      return prev;
    });
  };

  const startScenario = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    const initialMsg: Message = { 
      role: 'model', 
      text: scenario.initialMessage, 
      timestamp: Date.now() 
    };
    setMessages([initialMsg]);
    setFeedback(null);
    setOptions([]);

    if (scenario.mode === 'criticism') {
      setIsLoading(true);
      const opts = await getResponseOptions(scenario.systemInstruction, [initialMsg], getEffectiveApiKey());
      setOptions(opts);
      setIsLoading(false);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || !selectedScenario || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      text: textToSend, 
      timestamp: Date.now() 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setOptions([]);
    setIsLoading(true);

    try {
      const response = await getChatResponse(
        "gemini-3-flash-preview",
        selectedScenario.systemInstruction,
        messages, // Pass only previous messages as history
        textToSend,
        getEffectiveApiKey()
      );
      
      const modelMessage: Message = { 
        role: 'model', 
        text: response, 
        timestamp: Date.now() 
      };
      
      const newHistory = [...messages, userMessage, modelMessage];
      setMessages(newHistory);

      if (selectedScenario.mode === 'criticism') {
        const opts = await getResponseOptions(selectedScenario.systemInstruction, newHistory, getEffectiveApiKey());
        setOptions(opts);
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const apiKey = getEffectiveApiKey();
      const isPlaceholder = apiKey.trim() === 'MY_GEMINI_API_KEY';
      const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : "отсутствует";
      const errorMessage = error?.message || "Неизвестная ошибка";
      
      let finalMessage = `Ошибка API: ${errorMessage}. (Ключ: ${maskedKey}).`;
      
      if (errorMessage.includes("Failed to fetch")) {
        finalMessage = "Ошибка сети: Не удалось связаться с сервером. Возможно, домен заблокирован вашим провайдером. Попробуйте использовать другой браузер или привязать свой домен в Cloudflare.";
      } else if (isPlaceholder || !apiKey) {
        finalMessage += ` Пожалуйста, добавьте новый секрет с именем "VITE_GEMINI_API_KEY" и вашим реальным ключом в разделе Secrets, затем нажмите "Apply changes". Также вы можете ввести ключ вручную в настройках приложения.`;
        setShowKeyInput(true);
      } else {
        finalMessage += ` Убедитесь, что вы нажали "Apply changes" в разделе Secrets.`;
      }
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: finalMessage, 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option: ResponseOption) => {
    handleSend(option.text);
  };

  const handleFinish = async () => {
    if (messages.length < 3) {
      alert("Диалог слишком короткий для анализа. Пообщайтесь еще немного.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await getFeedback(messages, getEffectiveApiKey());
      const feedbackWithLock: Feedback = { ...result, isUnlocked: false };
      setFeedback(feedbackWithLock);

      // Save to Firestore
      if (user && selectedScenario) {
        try {
          await addDoc(collection(db, 'sessions'), {
            uid: user.uid,
            scenarioId: selectedScenario.id,
            score: result.score,
            detailedAnalysis: result.summary,
            isUnlocked: false,
            createdAt: Timestamp.now()
          });
        } catch (err) {
          console.error("Error saving session to Firestore:", err);
        }
      }

      // Update Stats
      setStats(prev => {
        const newTotal = prev.totalSessions + 1;
        const newAvg = (prev.averageScore * prev.totalSessions + result.score) / newTotal;
        const roleId = selectedScenario?.id || 'unknown';
        const roleStat = prev.roleStats[roleId] || { sessions: 0, bestScore: 0 };
        
        return {
          ...prev,
          totalSessions: newTotal,
          averageScore: newAvg,
          roleStats: {
            ...prev.roleStats,
            [roleId]: {
              sessions: roleStat.sessions + 1,
              bestScore: Math.max(roleStat.bestScore, result.score)
            }
          }
        };
      });

      // Check Achievements
      unlockAchievement('first_step');
      if (result.score === 10 && selectedScenario?.mode === 'criticism') unlockAchievement('master_of_calm');
      if (result.metrics && result.metrics.speed < 10) unlockAchievement('speed_demon');
      if (result.metrics && result.metrics.politeness > 9) unlockAchievement('polite_soul');
      if (selectedScenario?.id === 'skeptic' && result.score > 8) unlockAchievement('logical_titan');
      if (selectedScenario?.id === 'crisis' && result.score > 8) unlockAchievement('empathy_pro');

    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setSelectedScenario(null);
    setMessages([]);
    setFeedback(null);
    setOptions([]);
    setShowStats(false);
    setShowAdmin(false);
    setShowFeedbackForm(false);
  };

  return (
    <div className="min-h-screen bg-soft-gradient text-[#1a1c1e] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Manual Key Input Fallback */}
      {showKeyInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Настройка API ключа</h3>
            <p className="text-sm text-gray-600 mb-4">
              Если у вас не получается настроить ключ через панель Secrets, вы можете временно ввести его здесь. 
              Ключ не сохраняется на сервере и будет активен только в этой сессии.
            </p>
            <input
              type="password"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="AIza..."
              className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowKeyInput(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => setShowKeyInput(false)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-lg border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-vibrant-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-vibrant-gradient bg-clip-text text-transparent font-display">Слово</h1>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.3em]">AI Christian Training</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono opacity-30 hidden sm:block">v1.0.5-stable</div>
          {userProfile?.role === 'admin' && (
            <button 
              onClick={fetchAdminFeedback}
              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
              title="Админ-панель"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setShowFeedbackForm(true)}
            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
            title="Обратная связь"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
            title="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </button>
          {apiKeyMissing && (
            <div className="hidden md:flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-rose-100">
              <ShieldAlert className="w-3 h-3" />
              API ключ не настроен
            </div>
          )}
          {!selectedScenario && (
            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-emerald-600 transition-all px-4 py-2 rounded-xl hover:bg-white hover:shadow-sm"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Достижения</span>
            </button>
          )}
          {selectedScenario && (
            <button 
              onClick={reset}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-emerald-600 transition-all px-3 py-2 rounded-xl hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Назад</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {isAuthLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCcw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : !user ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Добро пожаловать</h2>
              <p className="text-gray-500 text-sm mt-2">Войдите, чтобы сохранять свой прогресс</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Имя</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 p-3.5 pl-11 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Ваше имя"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Пароль</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 p-3.5 pl-11 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {authError && (
                <div className="text-rose-500 text-xs font-bold text-center bg-rose-50 p-3 rounded-xl border border-rose-100">
                  {authError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
              >
                {authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-gray-400">
                  <span className="bg-white px-4">Или</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={async () => {
                  try {
                    const provider = new GoogleAuthProvider();
                    await signInWithPopup(auth, provider);
                  } catch (error: any) {
                    setAuthError('Ошибка входа через Google: ' + error.message);
                  }
                }}
                className="w-full bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Войти через Google
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-sm font-bold text-emerald-600 hover:underline"
              >
                {authMode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
              </button>
            </div>
          </motion.div>
        ) : showIntro ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden"
          >
            <div className="bg-vibrant-gradient p-12 text-white text-center relative">
              <div className="relative z-10">
                <h2 className="text-4xl font-black mb-4 tracking-tight">{PHILOSOPHY.title}</h2>
                <div className="w-20 h-1 bg-white/30 mx-auto rounded-full" />
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="prose prose-emerald max-w-none">
                <p className="text-lg text-gray-700 leading-relaxed font-medium italic text-center">
                  {PHILOSOPHY.content}
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Как это работает
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PHILOSOPHY.instruction.map((text, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-black shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowIntro(false)}
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 text-lg uppercase tracking-widest"
              >
                Начать обучение
              </button>
            </div>
          </motion.div>
        ) : showAdmin ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900">Панель администратора</h2>
              <button onClick={() => setShowAdmin(false)} className="text-emerald-600 font-bold">Назад</button>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-500 uppercase text-xs tracking-widest">Обратная связь от пользователей</h3>
              {adminFeedback.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400">
                  Пока нет отзывов
                </div>
              ) : (
                adminFeedback.map(f => (
                  <div key={f.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-emerald-600 text-sm">{f.email}</div>
                      <div className="text-[10px] text-gray-400">{(f.createdAt as any).toDate().toLocaleString()}</div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{f.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {apiKeyMissing && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-4"
          >
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-rose-900 text-sm">Внимание: API ключ не настроен</h3>
              <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                Для работы приложения необходимо добавить <strong>GEMINI_API_KEY</strong> в настройках AI Studio (Settings -&gt; Environment Variables). Без этого ИИ не сможет отвечать на ваши сообщения.
              </p>
            </div>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {showStats ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-gray-900">Ваш прогресс</h2>
                <button onClick={() => setShowStats(false)} className="text-emerald-600 font-bold">Закрыть</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-gray-400 mb-1 font-bold text-xs uppercase tracking-widest">Всего сессий</div>
                  <div className="text-4xl font-black text-emerald-600">{stats.totalSessions}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-gray-400 mb-1 font-bold text-xs uppercase tracking-widest">Средний балл</div>
                  <div className="text-4xl font-black text-emerald-600">{stats.averageScore.toFixed(1)}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-gray-400 mb-1 font-bold text-xs uppercase tracking-widest">Достижения</div>
                  <div className="text-4xl font-black text-emerald-600">{stats.achievements.filter(a => a.unlocked).length}/{stats.achievements.length}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Достижения</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.achievements.map(a => (
                    <div 
                      key={a.id} 
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                        a.unlocked ? "bg-white border-emerald-100 shadow-sm" : "bg-gray-50 border-gray-100 opacity-50 grayscale"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        a.unlocked ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-400"
                      )}>
                        {AchievementIcons[a.icon]}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{a.title}</div>
                        <div className="text-sm text-gray-500">{a.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : !selectedScenario ? (
            <motion.div 
              key="selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] mb-4"
                >
                  Интеллектуальный тренажер
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1] font-display">
                  Готовы ли вы к <br/>
                  <span className="bg-vibrant-gradient bg-clip-text text-transparent">сложным вопросам?</span>
                </h2>
                <p className="text-base text-gray-500 font-medium leading-relaxed max-w-lg mx-auto">
                  Выберите режим и попрактикуйтесь в ведении диалога о вере, смысле жизни и Боге.
                </p>
              </div>

              <div className="space-y-16">
                <section>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <div className="w-8 h-[1px] bg-gray-200" />
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    Свободный диалог
                    <div className="flex-1 h-[1px] bg-gray-200" />
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SCENARIOS.filter(s => s.mode === 'chat').map((scenario) => (
                      <motion.button
                        key={scenario.id}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startScenario(scenario)}
                        className="group relative bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-100/30 hover:border-emerald-100 transition-all text-left flex flex-col h-full overflow-hidden"
                      >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-150" />
                        <div className="relative z-10">
                          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:bg-vibrant-gradient group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-200 transition-all duration-300 mb-6">
                            {IconMap[scenario.icon]}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors font-display">
                            {scenario.title}
                          </h3>
                          <p className="text-gray-500 text-sm font-normal leading-relaxed flex-grow">
                            {scenario.description}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <div className="w-8 h-[1px] bg-gray-200" />
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Работа с критикой
                    <div className="flex-1 h-[1px] bg-gray-200" />
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SCENARIOS.filter(s => s.mode === 'criticism').map((scenario) => (
                      <motion.button
                        key={scenario.id}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startScenario(scenario)}
                        className="group relative bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-rose-100/30 hover:border-rose-100 transition-all text-left flex flex-col h-full overflow-hidden"
                      >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-150" />
                        <div className="relative z-10">
                          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:bg-gradient-to-br group-hover:from-rose-500 group-hover:to-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-rose-200 transition-all duration-300 mb-6">
                            {IconMap[scenario.icon]}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-rose-600 transition-colors font-display">
                            {scenario.title}
                          </h3>
                          <p className="text-gray-500 text-sm font-normal leading-relaxed flex-grow">
                            {scenario.description}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          ) : feedback ? (
            <motion.div 
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden"
            >
              <div className="bg-vibrant-gradient p-10 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                  <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-[100px]" />
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10">
                  <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-[2rem] mb-6 backdrop-blur-md border border-white/30 shadow-2xl"
                  >
                    <Star className="w-12 h-12 fill-white" />
                  </motion.div>
                  <h2 className="text-4xl font-black mb-2 tracking-tight">Анализ завершен</h2>
                  <div className="text-7xl font-black mb-2 drop-shadow-lg">{feedback.score}<span className="text-3xl opacity-60">/10</span></div>
                  <p className="text-emerald-50 font-bold uppercase tracking-[0.2em] text-xs">Ваш итоговый балл</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {feedback.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Вежливость', val: feedback.metrics.politeness, icon: <Smile className="w-4 h-4" /> },
                      { label: 'Тактичность', val: feedback.metrics.tact, icon: <Heart className="w-4 h-4" /> },
                      { label: 'Убеждение', val: feedback.metrics.persuasion, icon: <Shield className="w-4 h-4" /> },
                      { label: 'Уважение', val: feedback.metrics.respect, icon: <ThumbsUp className="w-4 h-4" /> },
                      { label: 'Скорость', val: feedback.metrics.speed, icon: <Clock className="w-4 h-4" />, suffix: 'с' },
                    ].map((m, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                          {m.icon}
                          {m.label}
                        </div>
                        <div className="text-xl font-black text-gray-900">{m.val}{m.suffix}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                  {!feedback.isUnlocked && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-8 bg-white/60 backdrop-blur-md rounded-3xl border border-white/50 shadow-xl">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-black text-gray-900 mb-2">Анализ заблокирован</h4>
                      <p className="text-sm text-gray-500 mb-6 max-w-xs">
                        Узнайте свои сильные стороны, ошибки и получите советы по духовному росту
                      </p>
                      <button 
                        onClick={() => setFeedback({...feedback, isUnlocked: true})}
                        className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest"
                      >
                        Разблокировать (199₽)
                      </button>
                    </div>
                  )}

                  <div className={cn("space-y-4", !feedback.isUnlocked && "blur-sm select-none")}>
                    <h3 className="flex items-center gap-2 font-bold text-gray-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Сильные стороны
                    </h3>
                    <ul className="space-y-3">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="flex gap-3 text-gray-600 text-sm bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                          <span className="font-bold text-emerald-600">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={cn("space-y-4", !feedback.isUnlocked && "blur-sm select-none")}>
                    <h3 className="flex items-center gap-2 font-bold text-gray-900">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      Области для роста
                    </h3>
                    <ul className="space-y-3">
                      {feedback.improvements.map((s, i) => (
                        <li key={i} className="flex gap-3 text-gray-600 text-sm bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                          <span className="font-bold text-amber-600">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 relative overflow-hidden">
                  <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                    <Info className="w-5 h-5 text-blue-500" />
                    Резюме наставника
                  </h3>
                  
                  <div className="relative">
                    <p className={cn(
                      "text-gray-700 leading-relaxed italic transition-all duration-500",
                      !feedback.isUnlocked && "blur-md select-none"
                    )}>
                      "{feedback.summary}"
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={reset}
                    className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Новая тренировка
                  </button>
                  <button 
                    onClick={() => setFeedback(null)}
                    className="px-6 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Посмотреть диалог
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden"
            >
              <div className="bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                    selectedScenario.mode === 'criticism' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {IconMap[selectedScenario.icon]}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 tracking-tight">{selectedScenario.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        selectedScenario.mode === 'criticism' ? "bg-rose-500" : "bg-emerald-500"
                      )} />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        {selectedScenario.mode === 'criticism' ? 'Разбор критики' : 'Диалог активен'}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleFinish}
                  disabled={isAnalyzing || messages.length < 3}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm",
                    isAnalyzing ? "bg-gray-100 text-gray-400" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-emerald-100"
                  )}
                >
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                        <span>Анализ...</span>
                      </div>
                      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Завершить</span>
                    </>
                  )}
                </button>
              </div>

              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
              >
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed",
                      m.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-100" 
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    )}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit">
                        <ReactMarkdown>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1.5 font-medium uppercase tracking-tighter">
                      {m.role === 'user' ? 'Вы' : selectedScenario.title} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex flex-col mr-auto items-start w-full max-w-[85%]">
                    <div className="bg-gray-100 px-5 py-4 rounded-2xl rounded-tl-none w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Вера печатает...</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="h-full bg-vibrant-gradient rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {options.length > 0 && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 pt-4 border-t border-gray-50"
                  >
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="w-3 h-3" />
                      Выберите вариант ответа:
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleOptionSelect(opt)}
                          className="group relative bg-white border border-gray-200 p-4 rounded-2xl text-left hover:border-emerald-500 hover:shadow-lg transition-all"
                        >
                          <div className="text-[15px] text-gray-800 mb-2 font-medium">{opt.text}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] text-gray-400 italic group-hover:text-emerald-600 transition-colors">
                              {opt.explanation}
                            </div>
                            <div className="flex gap-2">
                              {Object.entries(opt.metrics).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-0.5 text-[9px] font-bold text-gray-400">
                                  <div className="w-1 h-1 rounded-full bg-emerald-500" style={{ opacity: val / 10 }} />
                                  {val}
                                </div>
                              ))}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-gray-100">
                {selectedScenario.mode === 'chat' ? (
                  <div className="relative flex items-center gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Введите ваш ответ..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none max-h-32 min-h-[56px] text-[16px]"
                      rows={1}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className={cn(
                        "absolute right-2 p-2.5 rounded-xl transition-all active:scale-90",
                        input.trim() && !isLoading 
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700" 
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-400 font-medium italic">
                      В режиме разбора выберите один из предложенных вариантов выше
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 text-center mt-2 font-medium uppercase tracking-widest">
                  {selectedScenario.mode === 'chat' ? 'Shift + Enter для новой строки' : 'Анализируйте варианты перед выбором'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )}
  </main>
      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedbackForm(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Ваш отзыв</h3>
                <p className="text-gray-500 text-sm mt-2">Помогите нам сделать «Слово» лучше</p>
              </div>
              
              <textarea 
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Что вам понравилось? Что можно улучшить?"
                className="w-full h-32 bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none mb-6"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFeedbackForm(false)}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={submitFeedback}
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                  Отправить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
