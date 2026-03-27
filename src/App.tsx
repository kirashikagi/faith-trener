/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  LogOut,
  History,
  BookOpen,
  Sparkles,
  ArrowRight,
  Lock,
  X,
  Crown,
  Check,
  Sun,
  Moon,
  Smile,
  Heart,
  LogIn,
  UserPlus,
  Settings,
  ShieldCheck,
  Mail,
  MessageCircle,
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
  getDocFromServer,
  updateDoc
} from 'firebase/firestore';

import { auth, db } from './firebase';
import { Scenario, Message, Feedback, Role, ResponseOption, Achievement, UserStats, UserProfile, FeedbackSubmission, LibraryArticle } from './types';
import { SCENARIOS, ACHIEVEMENTS, PHILOSOPHY, DAILY_VERSES, LIBRARY_ARTICLES, SUBSCRIPTION_PLANS } from './constants';
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

const ScenarioIcons: Record<string, React.ReactNode> = {
  Brain: <Brain className="w-6 h-6" />,
  HeartOff: <HeartOff className="w-6 h-6" />,
  Compass: <Compass className="w-6 h-6" />,
  ShieldAlert: <ShieldAlert className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  UserX: <UserX className="w-6 h-6" />,
  MessageSquareX: <MessageSquareX className="w-6 h-6" />,
};

export default function App() {
  return <AppContent />;
}

function AppContent() {
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
  const [feedbackType, setFeedbackType] = useState<'general' | 'ai_feedback'>('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<FeedbackSubmission[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<LibraryArticle | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [options, setOptions] = useState<ResponseOption[]>([]);
  const [showStats, setShowStats] = useState(false);

  const isSubscribed = useMemo(() => true, []);

  const dailyVerse = useMemo(() => {
    const day = new Date().getDate();
    return DAILY_VERSES[(day - 1) % DAILY_VERSES.length];
  }, []);
  
  const handleFirestoreError = (error: unknown, operation: string, path: string) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName,
          email: p.email,
          photoUrl: p.photoURL
        })) || []
      },
      operationType: operation,
      path
    };
    console.error(`Firestore Error [${operation}]:`, JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  // Firebase Auth & Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: (firebaseUser.email === 'arunavsharmanaba@gmail.com' || firebaseUser.email === 'admin@vera.plus') ? 'admin' : 'user',
              createdAt: Timestamp.now() as any,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setUserProfile(newProfile);
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }
      } else {
        setUser(null);
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
    const internalEmail = email.includes('@') ? email : `${email.trim().toLowerCase()}@vera.plus`;
    
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, internalEmail, password);
      } else {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, internalEmail, password);
        const isAdminEmail = internalEmail === 'admin@vera.plus' || newUser.email === 'arunavsharmanaba@gmail.com';
        const newProfile: UserProfile = {
          uid: newUser.uid,
          email: newUser.email || '',
          role: isAdminEmail ? 'admin' : 'user',
          createdAt: Timestamp.now() as any,
          displayName: email // Store the original name
        };
        try {
          await setDoc(doc(db, 'users', newUser.uid), newProfile);
          setUserProfile(newProfile);
        } catch (e) {
          handleFirestoreError(e, 'create', `users/${newUser.uid}`);
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setAuthError('Неверное имя или пароль');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('Это имя уже занято');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Пароль должен быть не менее 6 символов');
      } else {
        setAuthError('Ошибка: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim() || !user) return;
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user.uid,
        email: user.email,
        message: feedbackMessage,
        type: feedbackType,
        createdAt: Timestamp.now()
      });
      setFeedbackMessage('');
      setFeedbackType('general');
      setShowFeedbackForm(false);
      alert("Спасибо за отзыв! Мы обязательно его прочтем.");
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  const buySubscription = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isSubscribed: true,
        subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      });
      setUserProfile(prev => prev ? { ...prev, isSubscribed: true } : null);
      setShowSubscription(false);
      alert("Подписка успешно оформлена!");
    } catch (error) {
      console.error("Error buying subscription:", error);
    } finally {
      setIsLoading(false);
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
  // We don't show the warning if we are in production-like environment where server key is expected
  const showApiKeyWarning = apiKeyMissing && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

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
      try {
        const opts = await getResponseOptions(scenario.systemInstruction, [initialMsg], getEffectiveApiKey());
        if (opts.length === 0) {
          throw new Error("Не удалось получить варианты ответа. Попробуйте перезапустить сценарий или проверьте API ключ.");
        }
        setOptions(opts);
      } catch (error: any) {
        console.error("Error starting criticism scenario:", error);
        setMessages(prev => [...prev, {
          role: 'model',
          text: `Ошибка при загрузке вариантов: ${error.message || "Неизвестная ошибка"}. Попробуйте обновить страницу или использовать другой API ключ.`,
          timestamp: Date.now()
        }]);
      } finally {
        setIsLoading(false);
      }
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
        try {
          const opts = await getResponseOptions(selectedScenario.systemInstruction, newHistory, getEffectiveApiKey());
          if (opts.length === 0) {
            throw new Error("Не удалось получить варианты ответа для следующего шага.");
          }
          setOptions(opts);
        } catch (error: any) {
          console.error("Error getting options in handleSend:", error);
          setMessages(prev => [...prev, {
            role: 'model',
            text: `Ошибка при загрузке вариантов ответа: ${error.message || "Неизвестная ошибка"}.`,
            timestamp: Date.now()
          }]);
        }
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
      const feedbackWithLock: Feedback = { ...result, isUnlocked: true };
      setFeedback(feedbackWithLock);

      // Save to Firestore
      if (user && selectedScenario) {
        try {
          await addDoc(collection(db, 'sessions'), {
            uid: user.uid,
            scenarioId: selectedScenario.id,
            score: result.score,
            detailedAnalysis: result.summary,
            isUnlocked: true,
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
      if (result.metrics && result.metrics.theologicalAccuracy > 9) unlockAchievement('theological_master');
      if (selectedScenario?.id === 'skeptic' && result.score > 8 && result.metrics && result.metrics.logic > 8) unlockAchievement('apologetic_expert');
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

        {user && (
          <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-fg">Вера +1</h1>
                <p className="text-[9px] text-muted font-bold uppercase tracking-[0.3em]">AI Faith Training</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-bg border border-border hover:border-accent transition-all text-muted hover:text-accent shadow-sm"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              
              <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />

              {userProfile?.role === 'admin' && (
                <button 
                  onClick={fetchAdminFeedback}
                  className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:scale-95"
                  title="Админ-панель"
                >
                  <ShieldCheck className="w-5 h-5" />
                </button>
              )}
              
              <button 
                onClick={() => setShowLibrary(true)}
                className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:scale-95"
                title="Библиотека знаний"
              >
                <BookOpen className="w-5 h-5" />
              </button>

              <button 
                onClick={() => {
                  setFeedbackType('general');
                  setShowFeedbackForm(true);
                }}
                className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:scale-95"
                title="Обратная связь"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {!selectedScenario ? (
                <button 
                  onClick={() => setShowStats(!showStats)}
                  className="flex items-center gap-3 bg-bg border border-border text-muted px-4 py-2.5 rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm group active:scale-95"
                >
                  <Trophy className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.2em]">Путь</span>
                </button>
              ) : (
                <button 
                  onClick={reset}
                  className="flex items-center gap-3 bg-bg border border-border text-muted px-4 py-2.5 rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm group active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:translate-x-[-2px] transition-transform" />
                  <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.2em]">Назад</span>
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm active:scale-95"
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        {isAuthLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCcw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : !user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-md mx-auto sber-card mt-12"
          >
            <div className="text-center mb-8 space-y-3">
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto mb-4 border border-accent/20"
              >
                <MessageCircle className="w-7 h-7" />
              </motion.div>
              <h2 className="text-4xl font-serif text-fg tracking-normal">Вера +1</h2>
              <p className="text-muted text-sm font-medium leading-relaxed max-w-[240px] mx-auto italic">
                Интеллектуальный тренажер <br/> духовного общения
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Имя</label>
                <input 
                  type="text" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg border border-border p-3.5 rounded-xl outline-none focus:border-accent transition-all text-fg font-medium placeholder:text-muted/30"
                  placeholder="Ваше имя"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Пароль</label>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg border border-border p-3.5 rounded-xl outline-none focus:border-accent transition-all text-fg font-medium placeholder:text-muted/30"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <div className="text-rose-500 text-[10px] font-bold text-center bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                  {authError}
                </div>
              )}

              <button 
                type="submit"
                className="sber-button w-full"
              >
                {authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </button>

              <div className="text-center pt-2 space-y-4">
                <button 
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-[10px] font-bold text-muted hover:text-accent uppercase tracking-widest transition-colors block w-full"
                >
                  {authMode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : showIntro ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sber-card max-w-4xl mx-auto overflow-hidden !p-0"
          >
            <div className="bg-accent/5 p-16 text-center relative border-b border-border">
              <div className="relative z-10 space-y-4">
                <h2 className="text-5xl font-serif text-accent tracking-normal">{PHILOSOPHY.title}</h2>
                <p className="text-accent/60 text-[11px] font-bold uppercase tracking-[0.4em]">Искусство духовного общения</p>
              </div>
            </div>
            <div className="p-10 sm:p-20 space-y-20">
              <div className="max-w-3xl mx-auto space-y-12">
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl sm:text-5xl text-fg leading-snug font-serif italic tracking-normal text-center"
                >
                  «Слово ваше да будет всегда с благодатию, приправлено солью, чтобы вы знали, как отвечать каждому» (Кол. 4:6)
                </motion.p>
                <div className="text-xl text-muted/90 text-center leading-relaxed max-w-2xl mx-auto font-medium">
                  {PHILOSOPHY.content}
                </div>
              </div>
              
              <div className="space-y-12">
                <div className="flex items-center gap-8">
                  <div className="h-[1px] flex-1 bg-border" />
                  <h3 className="text-[11px] font-bold text-muted uppercase tracking-[0.5em] whitespace-nowrap">
                    Путь обучения
                  </h3>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>
                
                <div className="grid grid-cols-1 gap-12">
                  <div className="text-center space-y-8">
                    {PHILOSOPHY.instruction.map((text, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="max-w-2xl mx-auto"
                      >
                        <p className="text-2xl text-fg/80 font-serif italic leading-relaxed">
                          <span className="text-accent font-sans not-italic font-bold mr-4 opacity-40">{i + 1}.</span>
                          {text}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-4">
                  <button 
                    onClick={() => setShowIntro(false)}
                    className="sber-button px-20 py-7 text-xl shadow-2xl shadow-accent/10"
                  >
                    Начать обучение
                  </button>
                  <p className="text-[10px] text-muted/60 text-center uppercase tracking-[0.2em] font-bold max-w-[300px] leading-relaxed">
                    Нажимая кнопку, вы принимаете <br/>
                    <button 
                      onClick={() => setShowAgreement(true)} 
                      className="text-accent hover:text-accent/80 transition-colors underline underline-offset-4"
                    >
                      пользовательское соглашение
                    </button>
                  </p>
                </div>

                <div className="w-full pt-16 border-t border-border flex flex-col items-center gap-10">
                  <button 
                    onClick={() => setShowAgreement(true)}
                    className="text-[11px] text-muted hover:text-accent transition-colors uppercase tracking-[0.4em] font-bold border-b border-muted/20 pb-1"
                  >
                    Пользовательское соглашение
                  </button>
                  
                  <div className="text-[11px] text-muted/50 text-center font-sans space-y-3 uppercase tracking-[0.2em]">
                    <div>Реквизиты налогоплательщика:</div>
                    <div className="font-bold text-muted/70">ИНН: [ВАШ_ИНН] • ОГРНИП: [ВАШ_ОГРНИП]</div>
                    <div>г. Москва, Российская Федерация</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : showAdmin ? (
          <div className="space-y-10 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-serif text-fg tracking-tight">Панель администратора</h2>
              <button 
                onClick={() => setShowAdmin(false)} 
                className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm uppercase tracking-[0.1em] text-[10px] font-bold"
              >
                Закрыть
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-border" />
                <h3 className="text-[9px] font-bold text-muted uppercase tracking-[0.3em]">Обратная связь</h3>
                <div className="h-[1px] flex-1 bg-border" />
              </div>
              
              {adminFeedback.length === 0 ? (
                <div className="sber-card p-16 text-center text-muted font-medium italic opacity-60">
                  Пока нет отзывов от пользователей
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adminFeedback.map(f => (
                    <div key={f.id} className="sber-card space-y-6 hover:border-accent/30 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-20 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-accent text-[10px] uppercase tracking-[0.1em] bg-accent/10 px-3 py-1 rounded-lg border border-accent/20">{f.email}</div>
                        <div className="text-[9px] font-bold text-muted/60 uppercase tracking-[0.1em]">{(f.createdAt as any).toDate().toLocaleDateString()}</div>
                      </div>
                      <p className="text-fg/90 text-lg leading-relaxed font-medium italic">«{f.message}»</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {showApiKeyWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-rose-500/5 border border-rose-500/20 p-6 rounded-2xl flex items-start gap-5 shadow-sm"
          >
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center shrink-0 border border-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-rose-500 text-[10px] uppercase tracking-[0.1em]">Внимание: API ключ не настроен</h3>
              <p className="text-muted text-xs mt-1.5 leading-relaxed font-medium">
                Для работы приложения необходимо добавить <strong className="text-fg">GEMINI_API_KEY</strong> в настройках. Без этого ИИ не сможет отвечать на ваши сообщения.
              </p>
            </div>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {showStats ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-serif text-fg tracking-tight">Ваш путь</h2>
                <button 
                  onClick={() => setShowStats(false)} 
                  className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm uppercase tracking-[0.1em] text-[10px] font-bold"
                >
                  Закрыть
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="sber-card">
                  <div className="text-muted mb-2 font-bold text-[10px] uppercase tracking-[0.2em]">Всего сессий</div>
                  <div className="text-3xl font-bold text-fg tracking-tight">{stats.totalSessions}</div>
                </div>
                <div className="sber-card">
                  <div className="text-muted mb-2 font-bold text-[10px] uppercase tracking-[0.2em]">Средний балл</div>
                  <div className="text-3xl font-bold text-fg tracking-tight">{stats.averageScore.toFixed(1)}</div>
                </div>
                <div className="sber-card">
                  <div className="text-muted mb-2 font-bold text-[10px] uppercase tracking-[0.2em]">Достижения</div>
                  <div className="text-3xl font-bold text-fg tracking-tight">{stats.achievements.filter(a => a.unlocked).length}/{stats.achievements.length}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-border" />
                  <h3 className="text-[9px] font-bold text-muted uppercase tracking-[0.3em]">Достижения</h3>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>
                
                <div className="relative">
                  {!isSubscribed && (
                    <div className="absolute inset-0 bg-bg/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem] border border-border/50">
                      <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-bold text-fg mb-3 tracking-tight">Достижения доступны в Премиум</h4>
                      <p className="text-muted text-sm max-w-xs mb-8 font-medium">Оформите подписку, чтобы видеть свои награды и цели.</p>
                      <button 
                        onClick={() => setShowSubscription(true)}
                        className="sber-button"
                      >
                        Узнать больше
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {stats.achievements.map((achievement) => (
                      <div 
                        key={achievement.id} 
                        className={cn(
                          "sber-card !p-6 flex flex-col items-center text-center gap-3 transition-all",
                          achievement.unlocked ? "border-accent/30 bg-accent/5" : "opacity-40 grayscale"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center border",
                          achievement.unlocked ? "bg-accent text-white border-accent/20" : "bg-bg text-muted border-border"
                        )}>
                          {AchievementIcons[achievement.icon]}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-fg tracking-tight leading-tight">{achievement.title}</div>
                          <div className="text-[9px] text-muted font-medium leading-tight">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-border" />
                  <h3 className="text-[9px] font-bold text-muted uppercase tracking-[0.3em]">История сессий</h3>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>
                
                <div className="relative">
                  {!isSubscribed && (
                    <div className="absolute inset-0 bg-bg/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem] border border-border/50">
                      <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-bold text-fg mb-3 tracking-tight">История доступна в Премиум</h4>
                      <p className="text-muted text-sm max-w-xs mb-8 font-medium">Оформите подписку, чтобы отслеживать свой прогресс и анализировать прошлые диалоги.</p>
                      <button 
                        onClick={() => setShowSubscription(true)}
                        className="sber-button"
                      >
                        Узнать больше
                      </button>
                    </div>
                  )}
                  <div className="sber-card p-16 text-center text-muted font-medium italic opacity-60">
                    Здесь будет отображаться история ваших тренировок
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !selectedScenario ? (
            <motion.div 
              key="selector"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card bg-accent/5 border-accent/20 mb-16 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-20 h-20 text-accent" />
                  </div>
                  <div className="text-[11px] font-bold text-accent uppercase tracking-[0.4em] mb-6">Слово дня</div>
                  <p className="text-2xl sm:text-3xl font-medium text-fg italic leading-tight tracking-tight">
                    {dailyVerse}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-[9px] font-bold uppercase tracking-[0.2em] mb-2"
                >
                  Интеллектуальный тренажер
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-serif text-fg tracking-tight leading-tight">
                  Готовы ли вы к <br/>
                  <span className="text-accent italic">сложным вопросам?</span>
                </h2>
                <p className="text-base text-muted font-medium leading-relaxed max-w-lg mx-auto">
                  Выберите режим и попрактикуйтесь в ведении диалога о вере, смысле жизни и Боге.
                </p>
              </div>

              <div className="space-y-16">
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] whitespace-nowrap">
                      Свободный диалог
                    </h3>
                    <div className="flex-1 h-[1px] bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SCENARIOS.filter(s => s.mode === 'chat').map((scenario) => (
                      <motion.button
                        key={scenario.id}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startScenario(scenario)}
                        className="group sber-card text-left flex flex-col h-full"
                      >
                        <h3 className="text-2xl font-serif text-fg mb-4 group-hover:text-accent transition-colors leading-tight tracking-tight">
                          {scenario.title}
                        </h3>
                        <p className="text-muted text-sm font-medium leading-relaxed flex-grow opacity-80">
                          {scenario.description}
                        </p>
                        <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
                          <div className="w-12 h-12 bg-accent/5 text-accent rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all border border-accent/10">
                            {ScenarioIcons[scenario.icon as string]}
                          </div>
                          <div className="text-accent font-bold text-[11px] uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">
                            Начать <ChevronRight className="w-3 h-3 inline" />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] whitespace-nowrap">
                      Работа с критикой
                    </h3>
                    <div className="flex-1 h-[1px] bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SCENARIOS.filter(s => s.mode === 'criticism').map((scenario) => (
                      <motion.button
                        key={scenario.id}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startScenario(scenario)}
                        className="group sber-card text-left flex flex-col h-full"
                      >
                        <h3 className="text-2xl font-serif text-fg mb-4 group-hover:text-rose-500 transition-colors leading-tight tracking-tight">
                          {scenario.title}
                        </h3>
                        <p className="text-muted text-sm font-medium leading-relaxed flex-grow opacity-80">
                          {scenario.description}
                        </p>
                        <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
                          <div className="w-12 h-12 bg-rose-500/5 text-rose-500 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all border border-rose-500/10">
                            {ScenarioIcons[scenario.icon as string]}
                          </div>
                          <div className="text-rose-500 font-bold text-[11px] uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">
                            Начать <ChevronRight className="w-3 h-3 inline" />
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sber-card max-w-4xl mx-auto overflow-hidden !p-0"
            >
              <div className="bg-accent p-12 text-white text-center relative">
                <div className="relative z-10">
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6 backdrop-blur-md border border-white/30"
                  >
                    <Star className="w-10 h-10 fill-white" />
                  </motion.div>
                  <h2 className="text-2xl font-semibold mb-4 tracking-tight">Анализ завершен</h2>
                  <div className="text-6xl font-bold mb-4">{feedback.score}<span className="text-2xl opacity-60">/10</span></div>
                  <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-[10px]">Ваш итоговый балл</p>
                </div>
              </div>

              <div className="p-10 space-y-12">
                {feedback.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Библейская точность', val: feedback.metrics.theologicalAccuracy },
                      { label: 'Логика', val: feedback.metrics.logic },
                      { label: 'Писание', val: feedback.metrics.scriptureUsage },
                      { label: 'Эмпатия', val: feedback.metrics.empathy },
                      { label: 'Скорость', val: feedback.metrics.speed, suffix: 'с' },
                    ].map((m, i) => (
                      <div key={i} className="bg-bg border border-border p-5 rounded-2xl text-center">
                        <div className="text-muted text-[9px] font-bold uppercase tracking-[0.2em] mb-2">
                          {m.label}
                        </div>
                        <div className="text-xl font-bold text-fg tracking-tight">{m.val}{m.suffix}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-4 h-[1px] bg-accent" />
                      Сильные стороны
                    </h3>
                    <ul className="space-y-3">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="flex gap-4 text-sm text-fg/90 bg-accent/5 p-5 rounded-xl border border-accent/10 font-medium">
                          <span className="font-bold text-accent">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative">
                    {!feedback.isUnlocked && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border">
                        <div className="w-12 h-12 bg-accent text-white rounded-xl flex items-center justify-center mb-4">
                          <Zap className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-fg mb-1 tracking-tight">Глубокий разбор</h4>
                        <p className="text-xs text-muted mb-6 max-w-[200px] leading-relaxed">
                          Узнайте скрытые ошибки и получите план роста
                        </p>
                        <button 
                          onClick={() => setFeedback({...feedback, isUnlocked: true})}
                          className="sber-button w-full py-3 text-sm"
                        >
                          Открыть за 199₽
                        </button>
                      </div>
                    )}
                    
                    <div className={cn("space-y-4", !feedback.isUnlocked && "blur-md select-none")}>
                      <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-4 h-[1px] bg-amber-500" />
                        Зоны роста
                      </h3>
                      <ul className="space-y-3">
                        {feedback.improvements.map((s, i) => (
                          <li key={i} className="flex gap-4 text-sm text-fg/90 bg-amber-500/5 p-5 rounded-xl border border-amber-500/10 font-medium">
                            <span className="font-bold text-amber-500">{i + 1}.</span>
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
                      <div className="bg-card px-4 py-2 rounded-full border border-border shadow-lg flex items-center gap-2">
                        <Lock className="w-3 h-3 text-accent" />
                        <span className="text-[9px] font-bold text-accent uppercase tracking-[0.1em]">Резюме скрыто</span>
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "bg-bg p-6 rounded-2xl border border-border transition-all duration-500",
                    !feedback.isUnlocked && "blur-md opacity-30"
                  )}>
                    <h3 className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-4">
                      Резюме наставника
                    </h3>
                    <p className="text-lg text-fg/90 leading-relaxed italic font-medium">
                      "{feedback.summary}"
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={reset}
                    className="sber-button flex-1"
                  >
                    Новая тренировка
                  </button>
                  <button 
                    onClick={() => {
                      const text = `Результат тренировки в "Вера +1":\nБалл: ${feedback.score}/10\n\nРезюме: ${feedback.summary}\n\nСильные стороны:\n${feedback.strengths.join('\n')}\n\nЗоны роста:\n${feedback.improvements.join('\n')}`;
                      navigator.clipboard.writeText(text);
                      alert("Результат скопирован! Теперь вы можете отправить его наставнику.");
                    }}
                    className="flex-1 px-8 bg-accent/10 border border-accent/20 text-accent font-bold rounded-xl hover:bg-accent hover:text-white transition-all uppercase tracking-[0.1em] text-[10px] py-4 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Поделиться с наставником
                  </button>
                  <button 
                    onClick={() => setFeedback(null)}
                    className="px-8 bg-bg border border-border text-muted font-bold rounded-xl hover:border-accent hover:text-accent transition-all uppercase tracking-[0.1em] text-[10px] py-4"
                  >
                    Диалог
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col h-[calc(100vh-180px)] sber-card overflow-hidden !p-0"
            >
              <div className="bg-card border-b border-border px-8 py-6 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center border border-accent/20">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif text-fg tracking-tight leading-tight">{selectedScenario.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                      <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em]">В сети</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleFinish}
                  disabled={isAnalyzing || messages.length < 3}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95",
                    isAnalyzing ? "bg-bg text-muted" : "sber-button"
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
                className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth bg-bg/30"
              >
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-5 rounded-2xl text-sm leading-relaxed font-medium",
                      m.role === 'user' 
                        ? "bg-accent text-white rounded-tr-none" 
                        : "bg-card border border-border text-fg rounded-tl-none"
                    )}>
                      <div className={cn(
                        "prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit prose-p:text-inherit prose-headings:text-inherit",
                        m.role === 'user' ? "text-white" : "text-fg dark:prose-invert"
                      )}>
                        <ReactMarkdown>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-muted mt-2 uppercase tracking-[0.2em] px-2">
                      {m.role === 'user' ? 'Вы' : selectedScenario.title} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex flex-col mr-auto items-start w-full max-w-[85%]">
                    <div className="bg-card px-6 py-4 rounded-2xl rounded-tl-none border border-border">
                      <div className="flex items-center gap-1.5">
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                          className="w-1.5 h-1.5 bg-accent rounded-full" 
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                          className="w-1.5 h-1.5 bg-accent rounded-full" 
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                          className="w-1.5 h-1.5 bg-accent rounded-full" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {options.length > 0 && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-8 border-t border-border"
                  >
                    <div className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-accent" />
                      Выберите вариант ответа:
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleOptionSelect(opt)}
                          className="group sber-card !p-5 text-left hover:border-accent/50 transition-all"
                        >
                          <div className="text-sm text-fg mb-2 font-medium leading-relaxed group-hover:text-accent transition-colors">{opt.text}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-muted font-medium italic group-hover:text-fg transition-colors opacity-60">
                              {opt.explanation}
                            </div>
                            <div className="flex gap-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex gap-2">
                                  <div className="text-[8px] text-muted uppercase w-12">Точность</div>
                                  <div className="flex gap-0.5">
                                    {[...Array(10)].map((_, idx) => (
                                      <div key={idx} className={cn("w-1 h-2 rounded-full", idx < opt.metrics.theologicalAccuracy ? "bg-accent" : "bg-border")} />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <div className="text-[8px] text-muted uppercase w-12">Логика</div>
                                  <div className="flex gap-0.5">
                                    {[...Array(10)].map((_, idx) => (
                                      <div key={idx} className={cn("w-1 h-2 rounded-full", idx < opt.metrics.logic ? "bg-accent" : "bg-border")} />
                                    ))}
                                  </div>
                                </div>
                              </div>
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
                      className="flex-1 bg-bg border border-border p-4 rounded-xl outline-none focus:border-accent transition-all text-fg font-medium resize-none h-[64px] placeholder:text-muted/30"
                    />
                    <button 
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className="w-16 h-16 bg-accent text-white rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 hover:bg-brand-secondary transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-[9px] font-bold text-muted uppercase tracking-[0.2em]">
                      Выберите один из вариантов выше, чтобы продолжить
                    </p>
                  </div>
                )}
                <p className="text-[9px] text-muted text-center mt-4 font-bold uppercase tracking-[0.2em] opacity-40">
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedbackForm(false)}
              className="absolute inset-0 bg-bg/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center border border-accent/20">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold text-fg tracking-tight">Обратная связь</h3>
                </div>
                <button 
                  onClick={() => setShowFeedbackForm(false)}
                  className="p-3 text-muted hover:text-accent transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="flex p-1.5 bg-bg/50 border border-border rounded-2xl">
                  <button 
                    onClick={() => setFeedbackType('general')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                      feedbackType === 'general' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted hover:text-fg"
                    )}
                  >
                    Общее
                  </button>
                  <button 
                    onClick={() => setFeedbackType('ai_feedback')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                      feedbackType === 'ai_feedback' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted hover:text-fg"
                    )}
                  >
                    Ошибки ИИ
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] ml-1">Ваше сообщение</label>
                  <textarea 
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder={feedbackType === 'general' ? "Что вам понравилось? Что можно улучшить?" : "Опишите ошибку или странное поведение ИИ..."}
                    className="w-full h-48 p-6 bg-bg/50 border border-border rounded-[1.5rem] text-fg placeholder:text-muted/50 focus:border-accent/50 focus:ring-4 focus:ring-accent/5 outline-none transition-all resize-none text-sm font-medium"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowFeedbackForm(false)}
                    className="flex-1 px-8 py-4 bg-bg border border-border text-muted font-bold rounded-2xl hover:border-accent hover:text-accent transition-all uppercase tracking-[0.15em] text-[11px]"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={submitFeedback}
                    disabled={!feedbackMessage.trim()}
                    className="flex-1 sber-button"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Library Modal */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-bg overflow-y-auto"
          >
            <div className="max-w-5xl mx-auto p-6 sm:p-12">
              <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center border border-accent/20">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-semibold text-fg tracking-tight">Библиотека знаний</h2>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em] mt-1">Мудрость и практика духовного общения</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLibrary(false)}
                  className="p-4 bg-card border border-border text-muted rounded-2xl hover:border-accent hover:text-accent transition-all shadow-sm group"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {LIBRARY_ARTICLES.map(article => (
                  <motion.div 
                    key={article.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sber-card relative group p-10 flex flex-col h-full bg-card/50 backdrop-blur-sm cursor-pointer"
                    onClick={() => {
                      if (!article.isPremium || isSubscribed) {
                        setSelectedArticle(article);
                      } else {
                        setShowSubscription(true);
                      }
                    }}
                  >
                    {article.isPremium && !isSubscribed && (
                      <div className="absolute inset-0 bg-bg/95 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-border/50">
                        <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6">
                          <Lock className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-fg mb-3 uppercase tracking-wider text-xs">Доступно в Премиум</h4>
                        <p className="text-muted text-xs mb-8 max-w-[200px] leading-relaxed">Оформите подписку, чтобы открыть полный доступ к этой статье.</p>
                        <button 
                          onClick={() => setShowSubscription(true)}
                          className="sber-button py-3 px-8 text-xs"
                        >
                          Оформить подписку
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] bg-accent/5 px-3 py-1 rounded-lg border border-accent/10">{article.category}</div>
                      {article.isPremium && <Sparkles className="w-4 h-4 text-amber-500" />}
                    </div>
                    <h3 className="text-2xl font-semibold text-fg mb-6 tracking-tight leading-tight">{article.title}</h3>
                    <p className="text-muted text-sm leading-relaxed font-medium opacity-90 flex-grow">{article.content}</p>
                    <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-widest">5 мин чтения</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!article.isPremium || isSubscribed) {
                            setSelectedArticle(article);
                          } else {
                            setShowSubscription(true);
                          }
                        }}
                        className="text-accent font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all"
                      >
                        Читать полностью <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-20 text-center">
                <button 
                  onClick={() => setShowLibrary(false)}
                  className="px-12 py-5 bg-card border border-border text-muted font-bold rounded-2xl hover:border-accent hover:text-accent transition-all uppercase tracking-[0.2em] text-xs shadow-sm"
                >
                  Вернуться на главную
                </button>
              </div>
            </div>

            {/* Article Detail View */}
            <AnimatePresence>
              {selectedArticle && (
                <motion.div 
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="fixed inset-0 z-[110] bg-bg overflow-y-auto"
                >
                  <div className="max-w-3xl mx-auto p-6 sm:p-12">
                    <button 
                      onClick={() => setSelectedArticle(null)}
                      className="mb-12 flex items-center gap-3 text-muted hover:text-accent transition-colors font-bold uppercase tracking-widest text-[10px]"
                    >
                      <ChevronLeft className="w-4 h-4" /> Назад в библиотеку
                    </button>

                    <div className="mb-10">
                      <div className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] bg-accent/5 px-3 py-1 rounded-lg border border-accent/10 inline-block mb-6">
                        {selectedArticle.category}
                      </div>
                      <h2 className="text-4xl sm:text-5xl font-semibold text-fg tracking-tight leading-tight mb-8">
                        {selectedArticle.title}
                      </h2>
                      <div className="flex items-center gap-6 text-muted text-[10px] font-bold uppercase tracking-widest border-y border-border/50 py-6">
                        <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> 5 минут чтения</span>
                        <span className="flex items-center gap-2"><BookOpen className="w-3 h-3" /> Теория и практика</span>
                      </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                      <div className="text-fg/90 text-lg leading-relaxed space-y-8 font-medium whitespace-pre-wrap">
                        {selectedArticle.content}
                      </div>
                    </div>

                    <div className="mt-20 pt-12 border-t border-border flex flex-col items-center">
                      <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] mb-8">Понравилась статья?</p>
                      <button 
                        onClick={() => setSelectedArticle(null)}
                        className="sber-button px-12 py-5"
                      >
                        Завершить чтение
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Agreement Modal */}
      <AnimatePresence>
        {showAgreement && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAgreement(false)}
              className="absolute inset-0 bg-bg/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center border border-accent/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif text-fg tracking-tight">Пользовательское соглашение</h3>
                </div>
                <button 
                  onClick={() => setShowAgreement(false)}
                  className="p-3 text-muted hover:text-accent transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <div className="space-y-6 text-muted/90 font-medium leading-relaxed">
                  <p className="text-lg text-fg font-serif italic">
                    Добро пожаловать в приложение «Вера +1».
                  </p>
                  <p>
                    1. Приложение носит исключительно развлекательный и образовательный характер. Оно предназначено для тренировки навыков общения и не является источником догматических истин.
                  </p>
                  <p>
                    2. Искусственный интеллект, используемый в приложении, может генерировать неточную или ошибочную информацию. Ответы ИИ не являются официальной позицией какой-либо религиозной организации.
                  </p>
                  <p>
                    3. Приложение не заменяет живого общения с духовным наставником или священнослужителем. В сложных жизненных ситуациях мы рекомендуем обращаться за личной консультацией.
                  </p>
                  <p>
                    4. Используя приложение, вы подтверждаете, что несете полную ответственность за свои личные решения и действия, предпринятые на основе диалогов в приложении.
                  </p>
                  <p>
                    5. Мы уважаем вашу конфиденциальность. Данные диалогов используются только для улучшения качества работы ИИ и вашего личного прогресса.
                  </p>
                </div>
              </div>

              <div className="pt-10">
                <button 
                  onClick={() => setShowAgreement(false)}
                  className="sber-button w-full py-5"
                >
                  Я принимаю условия
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subscription Modal */}
      <AnimatePresence>
        {showSubscription && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubscription(false)}
              className="absolute inset-0 bg-bg/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <Crown className="w-48 h-48 text-accent" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center border border-accent/20">
                    <Crown className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-semibold text-fg tracking-tight">Премиум доступ</h2>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em] mt-1">Раскройте полный потенциал</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                  {SUBSCRIPTION_PLANS[0].features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-bg/30 rounded-2xl border border-border/50">
                      <div className="w-8 h-8 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-fg font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-accent/5 border border-accent/20 rounded-[2rem] p-10 mb-12 text-center">
                  <div className="text-[10px] font-bold text-accent uppercase tracking-[0.4em] mb-4">Ежемесячная подписка</div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-semibold text-fg tracking-tighter">{SUBSCRIPTION_PLANS[0].price} ₽</span>
                    <span className="text-muted font-medium">/ месяц</span>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <button 
                    onClick={buySubscription}
                    disabled={isLoading}
                    className="sber-button w-full py-6 text-lg flex items-center justify-center gap-3"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>Подключить сейчас</>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowSubscription(false)}
                    className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] hover:text-fg transition-colors"
                  >
                    Вернуться назад
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
