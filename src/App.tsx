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
  ChevronRight,
  MessageSquare,
  Star,
  CheckCircle2,
  AlertCircle,
  Info,
  UserX,
  MessageSquareX,
  Trophy,
  User,
  BarChart3,
  Clock,
  ThumbsUp,
  Shield,
  Flag,
  Sun,
  Moon,
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

const AchievementIcons: Record<string, React.ReactNode> = {
  Flag: <Flag className="w-6 h-6" />,
  Sun: <Sun className="w-6 h-6" />,
  Shield: <Shield className="w-6 h-6" />,
  Heart: <Heart className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  Smile: <Smile className="w-6 h-6" />,
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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
    <div className={cn("min-h-screen bg-bg transition-colors duration-500 font-sans selection:bg-accent/20 selection:text-accent overflow-x-hidden relative", theme)}>
      {/* Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[160px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10">
        {/* Manual Key Input Fallback */}
        {showKeyInput && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-card rounded-[2rem] p-10 max-w-md w-full shadow-2xl border border-border">
              <h3 className="text-2xl font-black mb-4 tracking-tight text-fg">Настройка API ключа</h3>
              <p className="text-sm text-muted mb-8 leading-relaxed">
                Если у вас не получается настроить ключ через панель Secrets, вы можете временно ввести его здесь. 
                Ключ не сохраняется на сервере и будет активен только в этой сессии.
              </p>
              <input
                type="password"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="AIza..."
                className="w-full p-4 bg-bg border border-border rounded-2xl mb-8 focus:ring-2 focus:ring-accent outline-none text-fg transition-all"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowKeyInput(false)}
                  className="flex-1 py-4 bg-border hover:bg-border/80 text-fg rounded-2xl font-black transition-all uppercase tracking-[0.2em] text-[10px]"
                >
                  Закрыть
                </button>
                <button
                  onClick={() => setShowKeyInput(false)}
                  className="flex-1 py-4 bg-accent hover:bg-emerald-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-accent/20 uppercase tracking-[0.2em] text-[10px]"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="sticky top-0 z-50 glass-panel border-b border-border px-8 py-6 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-vibrant-gradient rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20">
            <MessageCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter bg-vibrant-gradient bg-clip-text text-transparent font-display">Вера +1</h1>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.4em]">AI Faith Training</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-2xl bg-card border border-border hover:border-accent transition-all text-muted hover:text-accent shadow-sm"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          
          <div className="h-8 w-[1px] bg-border mx-2 hidden sm:block" />

          {userProfile?.role === 'admin' && (
            <button 
              onClick={fetchAdminFeedback}
              className="p-3 bg-card border border-border text-muted rounded-2xl hover:border-accent hover:text-accent transition-all shadow-sm"
              title="Админ-панель"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          )}
          
          <button 
            onClick={() => setShowFeedbackForm(true)}
            className="p-3 bg-card border border-border text-muted rounded-2xl hover:border-accent hover:text-accent transition-all shadow-sm"
            title="Обратная связь"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {!selectedScenario ? (
            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-3 bg-card border border-border text-muted px-5 py-3 rounded-2xl hover:border-accent hover:text-accent transition-all shadow-sm group"
            >
              <Trophy className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.2em]">Путь</span>
            </button>
          ) : (
            <button 
              onClick={reset}
              className="flex items-center gap-3 bg-card border border-border text-muted px-5 py-3 rounded-2xl hover:border-accent hover:text-accent transition-all shadow-sm group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:translate-x-[-2px] transition-transform" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.2em]">Назад</span>
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="p-3 bg-card border border-border text-muted rounded-2xl hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm"
            title="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {isAuthLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCcw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : !user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto glass-panel p-12 rounded-[3rem] shadow-2xl border border-border relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-vibrant-gradient" />
            
            <div className="text-center mb-12 space-y-6">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-accent/10 text-accent rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-accent/20 shadow-xl shadow-accent/5"
              >
                <MessageCircle className="w-10 h-10" />
              </motion.div>
              <h2 className="text-4xl font-black text-fg tracking-tighter font-display">Добро пожаловать</h2>
              <p className="text-muted text-lg font-medium leading-relaxed max-w-xs mx-auto">
                «Где двое или трое собраны во имя Мое, там Я посреди них»
              </p>
            </div>

            <div className="space-y-6">
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
                className="w-full bg-fg text-bg font-black py-6 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-fg/10 uppercase tracking-[0.3em] text-xs"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                Войти через Google
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.4em] font-black text-muted">
                  <span className="bg-card px-6">Или используйте почту</span>
                </div>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-[0.3em] ml-4">Имя / Почта</label>
                  <input 
                    type="text" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg border border-border p-5 rounded-2xl outline-none focus:ring-2 focus:ring-accent transition-all text-fg font-medium"
                    placeholder="Ваше имя"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-[0.3em] ml-4">Пароль</label>
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg border border-border p-5 rounded-2xl outline-none focus:ring-2 focus:ring-accent transition-all text-fg font-medium"
                    placeholder="••••••••"
                  />
                </div>

                {authError && (
                  <div className="text-rose-500 text-xs font-black text-center bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                    {authError}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-accent text-white font-black py-6 rounded-2xl shadow-2xl shadow-accent/20 hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-[0.3em] text-xs"
                >
                  {authMode === 'login' ? 'Войти в систему' : 'Создать аккаунт'}
                </button>
              </form>

              <div className="text-center pt-4">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-[10px] font-black text-muted hover:text-accent uppercase tracking-[0.2em] transition-colors"
                >
                  {authMode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : showIntro ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-[3rem] shadow-2xl overflow-hidden max-w-5xl mx-auto"
          >
            <div className="bg-vibrant-gradient p-16 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[120px]" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white rounded-full blur-[120px]" />
              </div>
              <div className="relative z-10">
                <h2 className="text-5xl font-black mb-6 tracking-tighter font-display">{PHILOSOPHY.title}</h2>
                <div className="w-24 h-1 bg-white/40 mx-auto rounded-full" />
              </div>
            </div>
            <div className="p-16 space-y-12">
              <div className="max-w-3xl mx-auto">
                <p className="text-2xl text-fg/80 leading-relaxed font-light text-center">
                  {PHILOSOPHY.content}
                </p>
              </div>
              
              <div className="space-y-6">
                <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] text-center">
                  Механика обучения
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {PHILOSOPHY.instruction.map((text, i) => (
                    <div key={i} className="flex gap-6 p-6 bg-card rounded-[2rem] border border-border hover:border-accent transition-all group">
                      <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center font-black shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                        {i + 1}
                      </div>
                      <p className="text-base text-muted font-medium leading-relaxed group-hover:text-fg transition-colors">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowIntro(false)}
                className="w-full max-w-md mx-auto block bg-accent text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-accent/20 hover:bg-emerald-600 transition-all active:scale-95 text-xl uppercase tracking-[0.2em]"
              >
                Начать обучение
              </button>
            </div>
          </motion.div>
        ) : showAdmin ? (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-fg tracking-tight font-display">Панель администратора</h2>
              <button 
                onClick={() => setShowAdmin(false)} 
                className="text-[10px] font-black text-accent uppercase tracking-[0.3em] hover:text-emerald-600 transition-colors"
              >
                Назад в приложение
              </button>
            </div>
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.4em] flex items-center gap-3">
                <div className="w-6 h-[1px] bg-accent" />
                Обратная связь
              </h3>
              {adminFeedback.length === 0 ? (
                <div className="glass-panel p-16 rounded-[3rem] border border-dashed border-border text-center text-muted font-medium italic">
                  Пока нет отзывов от пользователей
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {adminFeedback.map(f => (
                    <div key={f.id} className="bg-card p-8 rounded-[2rem] border border-border shadow-sm space-y-4 hover:border-accent transition-all">
                      <div className="flex justify-between items-start">
                        <div className="font-black text-accent text-xs uppercase tracking-[0.1em]">{f.email}</div>
                        <div className="text-[10px] font-black text-muted uppercase tracking-[0.1em]">{(f.createdAt as any).toDate().toLocaleString()}</div>
                      </div>
                      <p className="text-fg/80 text-sm leading-relaxed italic">"{f.message}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {apiKeyMissing && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 glass-panel border border-rose-500/20 p-8 rounded-[2rem] flex items-start gap-6 shadow-2xl shadow-rose-500/5"
          >
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-rose-500 text-sm uppercase tracking-[0.2em]">Внимание: API ключ не настроен</h3>
              <p className="text-fg/60 text-xs mt-2 leading-relaxed font-medium">
                Для работы приложения необходимо добавить <strong className="text-fg">GEMINI_API_KEY</strong> в настройках AI Studio. Без этого ИИ не сможет отвечать на ваши сообщения.
              </p>
            </div>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {showStats ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-fg tracking-tighter font-display">Ваш путь</h2>
                <button 
                  onClick={() => setShowStats(false)} 
                  className="text-[10px] font-black text-accent uppercase tracking-[0.3em] hover:text-emerald-600 transition-colors"
                >
                  Закрыть
                </button>
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
              <div className="text-center space-y-6 max-w-2xl mx-auto mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-4 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4"
                >
                  Интеллектуальный тренажер
                </motion.div>
                <h2 className="text-5xl sm:text-6xl font-black text-fg tracking-tighter leading-[1] font-display">
                  Готовы ли вы к <br/>
                  <span className="bg-vibrant-gradient bg-clip-text text-transparent">сложным вопросам?</span>
                </h2>
                <p className="text-lg text-muted font-medium leading-relaxed max-w-lg mx-auto">
                  Выберите режим и попрактикуйтесь в ведении диалога о вере, смысле жизни и Боге.
                </p>
              </div>

              <div className="space-y-24">
                <section>
                  <div className="flex items-center gap-6 mb-12">
                    <h3 className="text-[12px] font-black text-muted uppercase tracking-[0.4em] whitespace-nowrap font-display">
                      Свободный диалог
                    </h3>
                    <div className="flex-1 h-[1px] bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {SCENARIOS.filter(s => s.mode === 'chat').map((scenario) => (
                      <motion.button
                        key={scenario.id}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startScenario(scenario)}
                        className="group relative bg-card p-10 rounded-[3rem] border border-border hover:border-accent transition-all text-left flex flex-col h-full overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-accent/10"
                      >
                        <div className="relative z-10">
                          <div className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-6 group-hover:text-accent transition-colors">
                            Сценарий {scenario.id}
                          </div>
                          <h3 className="text-2xl font-black text-fg mb-4 group-hover:text-accent transition-colors font-display leading-tight">
                            {scenario.title}
                          </h3>
                          <p className="text-muted text-sm font-medium leading-relaxed flex-grow">
                            {scenario.description}
                          </p>
                          <div className="mt-10 flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                            Начать сессию <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-6 mb-12">
                    <h3 className="text-[12px] font-black text-muted uppercase tracking-[0.4em] whitespace-nowrap font-display">
                      Работа с критикой
                    </h3>
                    <div className="flex-1 h-[1px] bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {SCENARIOS.filter(s => s.mode === 'criticism').map((scenario) => (
                      <motion.button
                        key={scenario.id}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startScenario(scenario)}
                        className="group relative bg-card p-10 rounded-[3rem] border border-border hover:border-rose-500 transition-all text-left flex flex-col h-full overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-rose-500/10"
                      >
                        <div className="relative z-10">
                          <div className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-6 group-hover:text-rose-500 transition-colors">
                            Сценарий {scenario.id}
                          </div>
                          <h3 className="text-2xl font-black text-fg mb-4 group-hover:text-rose-500 transition-colors font-display leading-tight">
                            {scenario.title}
                          </h3>
                          <p className="text-muted text-sm font-medium leading-relaxed flex-grow">
                            {scenario.description}
                          </p>
                          <div className="mt-10 flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                            Начать сессию <ChevronRight className="w-4 h-4" />
                          </div>
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
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-[3rem] shadow-2xl overflow-hidden max-w-5xl mx-auto"
            >
              <div className="bg-vibrant-gradient p-16 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                  <div className="absolute -top-20 -left-20 w-96 h-96 bg-white rounded-full blur-[120px]" />
                  <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white rounded-full blur-[120px]" />
                </div>
                <div className="relative z-10">
                  <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="inline-flex items-center justify-center w-28 h-28 bg-white/20 rounded-[2.5rem] mb-8 backdrop-blur-md border border-white/30 shadow-2xl"
                  >
                    <Star className="w-14 h-14 fill-white" />
                  </motion.div>
                  <h2 className="text-5xl font-black mb-4 tracking-tighter font-display">Анализ завершен</h2>
                  <div className="text-8xl font-black mb-4 drop-shadow-2xl">{feedback.score}<span className="text-4xl opacity-60">/10</span></div>
                  <p className="text-white/70 font-bold uppercase tracking-[0.4em] text-[10px]">Ваш итоговый балл</p>
                </div>
              </div>

              <div className="p-16 space-y-16">
                {feedback.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[
                      { label: 'Вежливость', val: feedback.metrics.politeness },
                      { label: 'Тактичность', val: feedback.metrics.tact },
                      { label: 'Убеждение', val: feedback.metrics.persuasion },
                      { label: 'Уважение', val: feedback.metrics.respect },
                      { label: 'Скорость', val: feedback.metrics.speed, suffix: 'с' },
                    ].map((m, i) => (
                      <div key={i} className="bg-card p-6 rounded-[2rem] border border-border text-center shadow-sm">
                        <div className="text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                          {m.label}
                        </div>
                        <div className="text-3xl font-black text-fg">{m.val}{m.suffix}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] flex items-center gap-3">
                      <div className="w-6 h-[1px] bg-accent" />
                      Ваши сильные стороны
                    </h3>
                    <ul className="space-y-4">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="flex gap-4 text-fg/80 text-base bg-accent/5 p-5 rounded-2xl border border-accent/10">
                          <span className="font-black text-accent">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative">
                    {!feedback.isUnlocked && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-8 glass-panel rounded-[2.5rem] shadow-2xl">
                        <div className="w-16 h-16 bg-accent text-white rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl shadow-accent/20">
                          <Zap className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-black text-fg mb-2 tracking-tight">Глубокий разбор</h4>
                        <p className="text-sm text-muted mb-8 max-w-[240px] leading-relaxed">
                          Узнайте скрытые ошибки, психологические триггеры и получите персональный план роста
                        </p>
                        <button 
                          onClick={() => setFeedback({...feedback, isUnlocked: true})}
                          className="w-full py-5 bg-accent text-white font-black rounded-2xl shadow-2xl shadow-accent/20 hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-[0.2em] text-xs"
                        >
                          Открыть за 199₽
                        </button>
                      </div>
                    )}
                    
                    <div className={cn("space-y-6", !feedback.isUnlocked && "blur-xl select-none")}>
                      <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] flex items-center gap-3">
                        <div className="w-6 h-[1px] bg-amber-500" />
                        Зоны роста и ошибки
                      </h3>
                      <ul className="space-y-4">
                        {feedback.improvements.map((s, i) => (
                          <li key={i} className="flex gap-4 text-fg/80 text-base bg-amber-500/5 p-5 rounded-2xl border border-amber-500/10">
                            <span className="font-black text-amber-500">{i + 1}.</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  {!feedback.isUnlocked && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="bg-card/90 px-6 py-3 rounded-full border border-border shadow-2xl flex items-center gap-3">
                        <Lock className="w-4 h-4 text-accent" />
                        <span className="text-xs font-black text-accent uppercase tracking-[0.2em]">Резюме наставника скрыто</span>
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "bg-card p-10 rounded-[2.5rem] border border-border transition-all duration-1000",
                    !feedback.isUnlocked && "blur-[30px] grayscale opacity-30"
                  )}>
                    <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] mb-6">
                      Резюме наставника
                    </h3>
                    <p className="text-xl text-fg/90 leading-relaxed italic font-light">
                      "{feedback.summary}"
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <button 
                    onClick={reset}
                    className="flex-1 bg-accent text-white font-black py-6 rounded-2xl shadow-2xl shadow-accent/20 hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-[0.2em]"
                  >
                    Новая тренировка
                  </button>
                  <button 
                    onClick={() => setFeedback(null)}
                    className="px-10 bg-card border border-border text-muted font-black rounded-2xl hover:border-accent hover:text-accent transition-all uppercase tracking-[0.2em] text-xs"
                  >
                    Диалог
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col h-[calc(100vh-220px)] glass-panel rounded-[3rem] border border-border shadow-2xl overflow-hidden"
            >
              <div className="bg-card border-b border-border px-10 py-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent border border-accent/20">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-fg tracking-tight leading-tight">{selectedScenario.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">В сети</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleFinish}
                  disabled={isAnalyzing || messages.length < 3}
                  className={cn(
                    "px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-xl",
                    isAnalyzing ? "bg-border text-muted" : "bg-accent text-white hover:bg-emerald-600 shadow-accent/20"
                  )}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center gap-3">
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      <span>Анализ...</span>
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
                className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth"
              >
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-8 py-6 rounded-[2rem] text-base leading-relaxed shadow-sm",
                      m.role === 'user' 
                        ? "bg-accent text-white rounded-tr-none shadow-accent/10" 
                        : "bg-card text-fg rounded-tl-none border border-border"
                    )}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit dark:prose-invert">
                        <ReactMarkdown>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-muted mt-3 uppercase tracking-[0.2em]">
                      {m.role === 'user' ? 'Вы' : selectedScenario.title} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex flex-col mr-auto items-start w-full max-w-[80%]">
                    <div className="bg-card px-8 py-6 rounded-[2rem] rounded-tl-none border border-border w-full">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Вера печатает...</span>
                      </div>
                      <div className="h-[2px] w-full bg-border rounded-full overflow-hidden">
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

              <div className="p-8 bg-card border-t border-border">
                {selectedScenario.mode === 'chat' ? (
                  <div className="relative flex items-center gap-4">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Напишите ваш ответ..."
                      className="flex-1 bg-bg border border-border p-6 rounded-2xl outline-none focus:ring-2 focus:ring-accent transition-all text-fg font-medium resize-none h-[72px]"
                    />
                    <button 
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className="w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center shadow-xl shadow-accent/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs font-black text-muted uppercase tracking-[0.3em]">
                      Выберите один из вариантов выше, чтобы продолжить
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-muted text-center mt-4 font-black uppercase tracking-[0.3em] opacity-50">
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
              className="relative bg-card w-full max-w-md rounded-[3rem] border border-border shadow-2xl p-10 overflow-hidden"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-accent/10 text-accent rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-accent/20">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-fg tracking-tight">Ваш отзыв</h3>
                <p className="text-muted text-sm mt-3 font-medium">Помогите нам сделать «Вера +1» лучше</p>
              </div>
              
              <textarea 
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Что вам понравилось? Что можно улучшить?"
                className="w-full h-40 bg-bg border border-border p-6 rounded-2xl outline-none focus:ring-2 focus:ring-accent transition-all resize-none mb-8 text-fg font-medium"
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowFeedbackForm(false)}
                  className="flex-1 px-8 py-5 bg-bg border border-border text-muted font-black rounded-2xl hover:border-accent hover:text-accent transition-all uppercase tracking-[0.2em] text-xs"
                >
                  Отмена
                </button>
                <button 
                  onClick={submitFeedback}
                  className="flex-1 px-8 py-5 bg-accent text-white font-black rounded-2xl shadow-2xl shadow-accent/20 hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-[0.2em] text-xs"
                >
                  Отправить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
