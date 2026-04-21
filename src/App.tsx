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
  ChevronDown,
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
  Menu,
  History,
  BookOpen,
  Sparkles,
  ArrowRight,
  Lock,
  X,
  Crown,
  Check,
  CreditCard,
  Sun,
  Moon,
  Home,
  Smile,
  Heart,
  LogIn,
  UserPlus,
  Settings,
  ShieldCheck,
  Mail,
  MessageCircle,
  Flame,
  Lightbulb,
  UserMinus,
  Microscope,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithCustomToken,
  signOut, 
  onAuthStateChanged, 
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
  updateDoc,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';

import { auth, db } from './firebase';

import { Scenario, Message, Feedback, Role, ResponseOption, Achievement, UserStats, UserProfile, FeedbackSubmission, LibraryArticle, SessionRecord } from './types';
import { SCENARIOS, ACHIEVEMENTS, PHILOSOPHY, BIBLICAL_FACTS, LIBRARY_ARTICLES, SUBSCRIPTION_PLANS } from './constants';
import { getChatResponse, getFeedback, getResponseOptions, getInitialMessage } from './services/gemini';
import ErrorBoundary from './components/ErrorBoundary';
import { handleFirestoreError, OperationType } from './lib/firebase-utils';

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
  UserMinus: <UserMinus className="w-6 h-6" />,
  Microscope: <Microscope className="w-6 h-6" />,
  Briefcase: <Briefcase className="w-6 h-6" />,
  Sparkles: <Sparkles className="w-6 h-6" />,
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
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
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const hasManuallyClosedIntro = useRef(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'general' | 'ai_feedback'>('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<FeedbackSubmission[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [systemStats, setSystemStats] = useState<{ users: number; feedback: number }>({ users: 0, feedback: 0 });
  const [adminTab, setAdminTab] = useState<'feedback' | 'system'>('feedback');
  const [showLibrary, setShowLibrary] = useState(false);
  const [viewingSession, setViewingSession] = useState<SessionRecord | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<LibraryArticle | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isUserAdmin = userProfile?.role === 'admin' || 
                     user?.email === 'arunavsharmanaba@gmail.com' || 
                     userProfile?.email === 'arunavsharmanaba@gmail.com' ||
                     user?.email === 'admin@vera.plus';

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState<{
    type: 'article' | 'subscription';
    id?: string;
    title: string;
    price: string | number;
  } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [options, setOptions] = useState<ResponseOption[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [isDialogueEnded, setIsDialogueEnded] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [currentMood, setCurrentMood] = useState<'neutral' | 'calm' | 'tense' | 'warm' | 'cold'>('neutral');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
    }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show prompt if not already installed/standalone
      if (!isStandalone) {
        setShowInstallPrompt(true);
      }
    };

    const installedHandler = () => {
      console.log('PWA: App installed successfully');
      setShowInstallPrompt(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const isSubscribed = useMemo(() => !!userProfile?.isSubscribed || userProfile?.role === 'admin', [userProfile]);

  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'error' | 'success' }[]>([]);

  const addNotification = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const promoteToAdmin = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: 'admin' });
      addNotification("Статус администратора подтвержден!", 'success');
    } catch (e) {
      console.error("Promotion error:", e);
    }
  };

  const nuclearReset = async () => {
    const secret = prompt("Введите КОД СБРОСА (Nuclear Code) для удаления вашего профиля Firestore:");
    if (secret !== 'WIPE_2024') {
      alert("Неверный код");
      return;
    }
    
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await signOut(auth);
        addNotification("Профиль Firestore удален. Вы вышли из системы.", 'success');
        window.location.reload();
      } catch (e: any) {
        addNotification("Ошибка удаления: " + e.message, 'error');
      }
    } else {
      addNotification("Сначала войдите под тем аккаунтом, который нужно удалить", 'info');
    }
  };

  const buyArticle = async (articleId: string) => {
    if (!user || !userProfile) {
      setAuthMode('login');
      addNotification("Пожалуйста, войдите в систему, чтобы совершать покупки", 'error');
      return;
    }
    const article = LIBRARY_ARTICLES.find(a => a.id === articleId);
    if (!article) return;

    const purchased = userProfile.purchasedArticles || [];
    if (purchased.includes(articleId) || isSubscribed) {
      addNotification("У вас уже есть доступ к этой статье", 'info');
      return;
    }

    setPaymentConfirmation({
      type: 'article',
      id: articleId,
      title: article.title,
      price: article.price
    });
  };

  const processArticlePurchase = async (articleId: string) => {
    const article = LIBRARY_ARTICLES.find(a => a.id === articleId);
    if (!article || !userProfile) return;

    setLoadingItemId(articleId);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: article.price,
          description: `Покупка статьи: ${article.title}`,
          metadata: { userId: userProfile.uid, articleId, type: 'article' },
          return_url: window.location.href
        })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Сервер вернул невалидный JSON (${response.status}): ${text.substring(0, 100)}...`);
      }

      if (response.ok && data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        throw new Error(data.error || `Ошибка сервера (${response.status}): ${text.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.error("Error buying article:", error);
      addNotification("Ошибка при создании платежа: " + error.message, 'error');
    } finally {
      setLoadingItemId(null);
      setPaymentConfirmation(null);
    }
  };

  const dailyFact = useMemo(() => {
    const day = new Date().getDate();
    return BIBLICAL_FACTS[(day - 1) % BIBLICAL_FACTS.length];
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
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        // Try to get a document, but don't fail the whole app if it takes a bit
        const testDoc = doc(db, '_connection_test', 'ping');
        await getDocFromServer(testDoc);
        console.log("Firestore connection verified.");
      } catch (error: any) {
        console.warn("Initial connection test failed, but we enabled compatibility mode:", error.message);
        if (error.message?.includes('the client is offline') || error.message?.includes('failed-precondition')) {
          addNotification("Загрузка может быть медленной. Мы включили режим совместимости для работы без VPN. Если ошибка сохранится, попробуйте VPN.", 'info');
        }
      }
    };
    testConnection();

    window.scrollTo(0, 0);
  }, [user, selectedScenario, showStats, showLibrary, showAdmin]);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsProfileLoading(true);
        
        // Use onSnapshot for real-time profile updates
        profileUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            
            // Streak logic
            const now = Date.now();
            const lastVisit = profile.lastVisit || 0;
            const oneDay = 24 * 60 * 60 * 1000;
            const isSameDay = new Date(now).toDateString() === new Date(lastVisit).toDateString();
            const isNextDay = new Date(now - oneDay).toDateString() === new Date(lastVisit).toDateString();

            if (!isSameDay) {
              let newStreak = profile.streak || 1;
              if (isNextDay) {
                newStreak += 1;
              } else {
                newStreak = 1;
              }
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                streak: newStreak,
                lastVisit: now
              });
              // onSnapshot will trigger again with updated data
            }

            setUserProfile(profile);
            setIsProfileLoading(false);
            
            // Sync achievements from profile to local stats if they exist
            if (profile.achievements) {
              setStats(prev => ({
                ...prev,
                achievements: profile.achievements || ACHIEVEMENTS
              }));
            }
            
            // Only show intro if it hasn't been seen AND we haven't manually closed it in this session
            const seen = profile.hasSeenWelcome === true || localStorage.getItem(`vera_intro_seen_${firebaseUser.uid}`) === 'true';
            if (!seen && !hasManuallyClosedIntro.current) {
              setShowIntro(true);
            } else {
              setShowIntro(false);
            }
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: (firebaseUser.email === 'arunavsharmanaba@gmail.com' || firebaseUser.email === 'admin@vera.plus') ? 'admin' : 'user',
              createdAt: Timestamp.now() as any,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              hasSeenWelcome: false,
              streak: 1,
              lastVisit: Date.now()
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
            setIsProfileLoading(false);
            // onSnapshot will pick this up
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setIsProfileLoading(false);
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
      }
      setIsAuthLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const handleCloseIntro = async () => {
    hasManuallyClosedIntro.current = true;
    setShowIntro(false);
    if (user) {
      localStorage.setItem(`vera_intro_seen_${user.uid}`, 'true');
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          hasSeenWelcome: true
        });
        setUserProfile(prev => prev ? { ...prev, hasSeenWelcome: true } : null);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Convert name to email format for Firebase Auth
    const internalEmail = email.includes('@') ? email : `${email.trim().toLowerCase()}@vera.plus`;
    
    const useProxy = async () => {
      console.log("Auth: Attempting via proxy...");
      const response = await fetch('/api/auth/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode === 'login' ? 'signIn' : 'signUp',
          email: internalEmail,
          password: password
        })
      });
      
      const data = await response.json();
      if (response.ok && data.customToken) {
        return await signInWithCustomToken(auth, data.customToken);
      } else {
        const msg = data.error || (data.error?.message) || "Ошибка сервера. Попробуйте другое имя или VPN.";
        throw new Error(msg);
      }
    };

    try {
      try {
        if (authMode === 'login') {
          await signInWithEmailAndPassword(auth, internalEmail, password);
        } else {
          await createUserWithEmailAndPassword(auth, internalEmail, password);
        }
      } catch (error: any) {
        // If network error, automatically try proxy
        if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
          await useProxy();
        } else {
          throw error;
        }
      }

      // Profile creation logic is handled by onAuthStateChanged useEffect,
      // but if we want to ensure special naming/admin status during registration:
      if (authMode === 'register' && auth.currentUser) {
        const newUser = auth.currentUser;
        const isAdminEmail = internalEmail === 'admin@vera.plus' || 
                           newUser.email === 'arunavsharmanaba@gmail.com' ||
                           password === 'MASTER_ADMIN' ||
                           email.toLowerCase().trim() === 'admin' ||
                           email.toLowerCase().trim() === 'superadmin';
        
        // Check if profile exists before setting
        const profileSnap = await getDoc(doc(db, 'users', newUser.uid));
        if (!profileSnap.exists()) {
          const newProfile: UserProfile = {
            uid: newUser.uid,
            email: newUser.email || '',
            role: isAdminEmail ? 'admin' : 'user',
            createdAt: Timestamp.now() as any,
            displayName: email, // Store the original name
            hasSeenWelcome: false,
            streak: 1,
            lastVisit: Date.now()
          };
          await setDoc(doc(db, 'users', newUser.uid), newProfile);
          setUserProfile(newProfile);
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.message?.includes('INVALID_LOGIN_CREDENTIALS')) {
        setAuthError('Неверное имя или пароль');
      } else if (error.code === 'auth/email-already-in-use' || error.message?.includes('EMAIL_EXISTS')) {
        setAuthError('Это имя уже занято');
      } else if (error.code === 'auth/weak-password' || error.message?.includes('WEAK_PASSWORD')) {
        setAuthError('Пароль должен быть не менее 6 символов');
      } else {
        setAuthError('Ошибка: ' + (error.message || 'Неизвестная ошибка'));
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setShowIntro(false);
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
      addNotification("Спасибо за отзыв! Мы обязательно его прочтем.", 'success');
    } catch (error) {
      console.error("Feedback submission error:", error);
      addNotification("Не удалось отправить отзыв. Пожалуйста, проверьте интернет или попробуйте позже.", 'error');
      // We still log the detailed error as per instructions
      try {
        handleFirestoreError(error, OperationType.WRITE, 'feedback');
      } catch (e) {
        // handleFirestoreError throws, which is expected by the system, 
        // but we already showed a UI notification.
      }
    }
  };

  const buySubscription = async () => {
    if (!user || !userProfile) {
      setAuthMode('login');
      addNotification("Пожалуйста, войдите в систему, чтобы оформить подписку", 'error');
      return;
    }
    const plan = SUBSCRIPTION_PLANS[0]; // Assuming first plan for now
    
    setPaymentConfirmation({
      type: 'subscription',
      title: plan.title,
      price: plan.price
    });
  };

  const processSubscriptionPurchase = async () => {
    if (!userProfile) return;
    const plan = SUBSCRIPTION_PLANS[0];
    
    setLoadingItemId('subscription');
    try {
      const priceValue = parseFloat(plan.price.replace(/[^0-9.]/g, ''));
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: priceValue,
          description: `Подписка: ${plan.title}`,
          metadata: { userId: userProfile.uid, type: 'subscription' },
          return_url: window.location.href
        })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Сервер вернул невалидный JSON (${response.status}): ${text.substring(0, 100)}...`);
      }

      if (response.ok && data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        throw new Error(data.error || `Ошибка сервера (${response.status}): ${text.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.error("Error buying subscription:", error);
      addNotification("Ошибка при создании платежа: " + error.message, 'error');
    } finally {
      setLoadingItemId(null);
      setPaymentConfirmation(null);
    }
  };

  const fetchAdminFeedback = async () => {
    if (!isUserAdmin) return;
    setShowAdmin(true);
    setAdminTab('feedback');
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const feedback = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedbackSubmission[];
      setAdminFeedback(feedback);
      
      // Fetch system stats
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        setSystemStats({
          users: usersSnapshot.size,
          feedback: querySnapshot.size
        });
      } catch (statsError) {
        console.error("Error fetching system stats:", statsError);
      }
    } catch (error) {
      console.error("Error fetching admin feedback:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SessionRecord[];
      setSessions(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'sessions');
    });

    return () => unsubscribe();
  }, [user]);

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

  useEffect(() => {
    localStorage.setItem('faith_trainer_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, options]);

  const unlockAchievement = async (id: string) => {
    const achievement = stats.achievements.find(a => a.id === id);
    if (achievement && !achievement.unlocked) {
      const updatedAchievements = stats.achievements.map(a => a.id === id ? { ...a, unlocked: true } : a);
      setStats(prev => ({
        ...prev,
        achievements: updatedAchievements
      }));
      
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            achievements: updatedAchievements
          });
        } catch (e) {
          console.error("Error saving achievement:", e);
        }
      }
      
      const unlocked = updatedAchievements.find(a => a.id === id);
      if (unlocked) {
        addNotification(`Достижение разблокировано: ${unlocked.title}`, 'success');
      }
    }
  };

  const startScenario = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setIsDialogueEnded(false);
    setIsLoading(true);
    
    // Remove random biblical fact logic
    const apiKey = getEffectiveApiKey();
    let initialText = scenario.initialMessage;

    if (apiKey) {
      try {
        // Generate a unique initial message based on scenario
        initialText = await getInitialMessage(scenario.systemInstruction, apiKey);
        // Clean up any potential tags like [greet] or greet:
        initialText = initialText.replace(/\[.*?\]/g, '').replace(/greet:?/gi, '').trim();
      } catch (e) {
        console.error("Failed to generate initial message, using default", e);
      }
    }

    const initialMsg: Message = { 
      role: 'model', 
      text: initialText, 
      timestamp: Date.now() 
    };
    setMessages([initialMsg]);
    setFeedback(null);
    setOptions([]);

    if (scenario.mode === 'criticism') {
      if (!apiKey) {
        setMessages(prev => [...prev, {
          role: 'model',
          text: "API ключ не настроен. Пожалуйста, добавьте VITE_GEMINI_API_KEY в Secrets или введите его в настройках.",
          timestamp: Date.now()
        }]);
        setIsLoading(false);
        return;
      }

      try {
        const opts = await getResponseOptions(scenario.systemInstruction, [initialMsg], apiKey);
        if (!opts || opts.length === 0) {
          throw new Error("Модель не вернула варианты ответа.");
        }
        setOptions(opts);
      } catch (error: any) {
        console.error("Error starting criticism scenario:", error);
        setMessages(prev => [...prev, {
          role: 'model',
          text: `Ошибка при загрузке вариантов: ${error.message || "Неизвестная ошибка"}. Проверьте API ключ или попробуйте позже.`,
          timestamp: Date.now()
        }]);
      } finally {
        setIsLoading(false);
      }
    } else {
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
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setOptions([]);
    setIsLoading(true);

    try {
      const commonInstruction = "\n\nВАЖНО: Если ты чувствуешь, что диалог логически завершен (например, собеседник поблагодарил, согласился или, наоборот, окончательно отказался продолжать), обязательно добавь в самый конец своего сообщения тег [КОНЕЦ_ДИАЛОГА]. Это позволит системе предложить пользователю перейти к анализу. Также в самом начале сообщения всегда добавляй тег настроения в формате [MOOD: mood_name], где mood_name может быть: neutral, calm, tense, warm, cold. Например: [MOOD: calm] Приветствую тебя...\n\nСТИЛЬ ОБЩЕНИЯ: Отвечай естественно, как живой человек. Не обязательно всегда заканчивать сообщение вопросом, если это не требуется по контексту. Будь разнообразен в своих реакциях.";
      
      const result = await getChatResponse(
        "gemini-3-flash-preview",
        selectedScenario.systemInstruction + commonInstruction,
        messages, // Pass only previous messages as history
        textToSend,
        getEffectiveApiKey()
      );
      
      setIsLoading(false);
      setIsTyping(true);
      
      let cleanResponse = result;
      
      // Extract mood
      const moodMatch = cleanResponse.match(/\[MOOD:\s*(\w+)\]/);
      if (moodMatch) {
        const mood = moodMatch[1].toLowerCase() as any;
        if (['neutral', 'calm', 'tense', 'warm', 'cold'].includes(mood)) {
          setCurrentMood(mood);
        }
        cleanResponse = cleanResponse.replace(/\[MOOD:\s*\w+\]/, '').trim();
      }

      if (cleanResponse.includes('[КОНЕЦ_ДИАЛОГА]')) {
        cleanResponse = cleanResponse.replace('[КОНЕЦ_ДИАЛОГА]', '').trim();
        setIsDialogueEnded(true);
      }

      // Safety check: if the model returns JSON (sometimes happens with flash models)
      if (cleanResponse.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(cleanResponse);
          if (parsed.text) cleanResponse = parsed.text;
          else if (parsed.message) cleanResponse = parsed.message;
          else if (parsed.response) cleanResponse = parsed.response;
          else if (Object.values(parsed).length > 0) {
            const firstString = Object.values(parsed).find(v => typeof v === 'string');
            if (firstString) cleanResponse = firstString as string;
          }
        } catch (e) {
          // Not valid JSON, keep as is
        }
      }
      
      // Simulate typing effect
      let currentText = "";
      const words = cleanResponse.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? "" : " ") + words[i];
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 40));
      }

      setIsTyping(false);
      
      const modelMessage: Message = { 
        role: 'model', 
        text: cleanResponse, 
        timestamp: Date.now()
      };
      
      const newHistory = [...updatedMessages, modelMessage];
      setMessages(newHistory);

      if (selectedScenario.mode === 'criticism') {
        try {
          const apiKey = getEffectiveApiKey();
          const opts = await getResponseOptions(selectedScenario.systemInstruction, newHistory, apiKey);
          if (!opts || opts.length === 0) {
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
      let errorMessage = error?.message || "Неизвестная ошибка";
      
      // Try to parse JSON error if it's a stringified object
      if (errorMessage.startsWith('{')) {
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // ignore
        }
      }

      let finalMessage = `Ошибка API: ${errorMessage}.`;
      
      if (errorMessage.includes("Quota exceeded") || errorMessage.includes("429")) {
        finalMessage = "Лимит запросов ИИ исчерпан (Quota Exceeded). В бесплатном режиме Google Gemini API доступно всего 20 запросов в день. Пожалуйста, подождите до завтра или перейдите на платный тариф (Pay-as-you-go) в Google AI Studio.";
      } else if (errorMessage.includes("Failed to fetch")) {
        finalMessage = "Ошибка сети: Не удалось связаться с сервером. Возможно, домен заблокирован вашим провайдером. Попробуйте использовать другой браузер или привязать свой домен в Cloudflare.";
      } else if (isPlaceholder || !apiKey) {
        finalMessage += ` Пожалуйста, добавьте новый секрет с именем "VITE_GEMINI_API_KEY" и вашим реальным ключом в разделе Secrets, затем нажмите "Apply changes". Также вы можете ввести ключ вручную в настройках приложения.`;
        setShowKeyInput(true);
      } else {
        finalMessage += ` (Ключ: ${maskedKey}). Убедитесь, что вы нажали "Apply changes" в разделе Secrets.`;
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

  const renderMessageText = (text: string) => {
    return <ReactMarkdown>{text}</ReactMarkdown>;
  };

  const handleFinish = async () => {
    if (messages.length < 3) {
      addNotification("Диалог слишком короткий для анализа. Пообщайтесь еще немного.", 'info');
      return;
    }
    
    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
      addNotification("API ключ не настроен. Анализ невозможен.", 'error');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await getFeedback(messages, apiKey);
      
      if (!result || (result.score === 0 && result.summary === "Ошибка при анализе диалога.")) {
        throw new Error("Анализ диалога не удался. Проверьте API ключ.");
      }

      // Only unlock full feedback if subscribed
      const feedbackWithLock: Feedback = { ...result, isUnlocked: isSubscribed };
      setFeedback(feedbackWithLock);

      // Save to Firestore
      if (user && selectedScenario) {
        try {
          await addDoc(collection(db, 'sessions'), {
            uid: user.uid,
            scenarioId: selectedScenario.id,
            score: result.score || 0,
            detailedAnalysis: result.summary || "",
            isUnlocked: isSubscribed,
            createdAt: Timestamp.now(),
            messages: messages.map(m => ({
              role: m.role,
              text: m.text,
              timestamp: m.timestamp
            }))
          });
        } catch (err) {
          console.warn("Session save failed but continuing:", err);
          addNotification("Диалог проанализирован, но не удалось сохранить его в историю.", 'info');
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

    } catch (error: any) {
      console.error("Error analyzing dialogue:", error);
      addNotification("Ошибка при анализе диалога: " + (error.message || "Неизвестная ошибка"), 'error');
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
    setIsDialogueEnded(false);
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
        {/* PWA Install Prompt */}
        <AnimatePresence>
          {showInstallPrompt && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="sticky top-0 z-[100] bg-accent text-white px-4 py-3 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider">Установите приложение для удобства</div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-accent px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
                >
                  Установить
                </button>
                <button 
                  onClick={() => setShowInstallPrompt(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
          <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-accent/20 shrink-0">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-semibold tracking-tight text-fg truncate">Вера +1</h1>
                <p className="text-[8px] sm:text-[9px] text-muted font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">AI Faith Training</p>
              </div>
            </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <button 
                  onClick={toggleTheme}
                  className="p-2 sm:p-2.5 rounded-xl bg-bg border border-border hover:border-accent transition-all text-muted hover:text-accent shadow-sm shrink-0"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                
                <div className="h-6 w-[1px] bg-border mx-0.5" />

                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-accent/5 border border-accent/20 rounded-xl shrink-0">
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-bold text-accent">{userProfile?.streak || 1}</span>
                </div>

                <button 
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 sm:p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:scale-95 shrink-0"
                  title="Меню"
                >
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
          </header>
        )}

      <main className="mx-auto max-w-4xl p-4 sm:p-6 md:pb-6">
        {isAuthLoading || isProfileLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCcw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : !user ? (
          <div className="min-h-[80vh] flex items-center justify-center relative overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.05, scale: 1.2 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-accent rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            />
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-md w-full mx-auto sber-card relative z-10"
            >
              <div className="text-center mb-12 space-y-4">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                  className="w-20 h-20 bg-accent text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-accent/20 border border-white/20"
                >
                  <Compass className="w-10 h-10" />
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-5xl font-serif text-fg tracking-tight"
                >
                  Вера +1
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted text-sm font-medium leading-relaxed max-w-[240px] mx-auto italic"
                >
                  Тренажёр духовного общения <br/> и навыков евангелизации
                </motion.p>
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

                <button 
                  type="button"
                  onClick={nuclearReset}
                  className="text-[8px] font-bold text-rose-500/30 hover:text-rose-500 uppercase tracking-widest transition-colors block w-full opacity-60 hover:opacity-100"
                >
                  Экстренный сброс данных профиля
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : (showIntro && localStorage.getItem(`vera_intro_seen_${user?.uid}`) !== 'true') ? (
          <div className="min-h-screen flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.03, scale: 1.5 }}
              transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
              className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2 pointer-events-none"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sber-card max-w-4xl mx-auto overflow-hidden !p-0 relative z-10 m-4 sm:m-0"
            >
              <div className="bg-accent/5 p-8 sm:p-16 text-center relative border-b border-border overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-20"
                />
                <div className="relative z-10 space-y-4">
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl sm:text-5xl font-serif text-accent tracking-normal"
                  >
                    {PHILOSOPHY.title}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-accent/60 text-[11px] font-bold uppercase tracking-[0.4em]"
                  >
                    Искусство духовного общения
                  </motion.p>
                </div>
              </div>
            <div className="p-6 sm:p-20 space-y-12 sm:space-y-20">
              <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-5xl text-fg leading-snug font-serif italic tracking-normal text-center"
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
                
                <div className="grid grid-cols-1 gap-8 sm:gap-12">
                  <div className="text-center space-y-6 sm:space-y-8">
                    {PHILOSOPHY.instruction.map((text, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="max-w-2xl mx-auto"
                      >
                        <p className="text-lg sm:text-2xl text-fg/80 font-serif italic leading-relaxed">
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
                    onClick={handleCloseIntro}
                    className="sber-button px-10 sm:px-20 py-5 sm:py-7 text-lg sm:text-xl shadow-2xl shadow-accent/10"
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
                  <div className="text-[11px] text-muted/50 text-center font-sans space-y-3 uppercase tracking-[0.2em]">
                    <div>Реквизиты налогоплательщика:</div>
                    <div className="font-bold text-muted/70">ИНН: 775101376595 • Виноградов Кирилл Вячеславович</div>
                    <div>г. Москва, Российская Федерация</div>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-8 py-4 bg-rose-500/5 border border-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500/10 transition-all text-[11px] font-bold uppercase tracking-[0.2em] mt-8"
                  >
                    <LogOut className="w-4 h-4" />
                    Выйти из аккаунта
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : showAdmin ? (
          <div className="space-y-10 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-serif text-fg tracking-tight">Панель администратора</h2>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setAdminTab('feedback')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                      adminTab === 'feedback' ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-bg border border-border text-muted hover:text-fg"
                    )}
                  >
                    Отзывы
                  </button>
                  <button 
                    onClick={() => setAdminTab('system')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                      adminTab === 'system' ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-bg border border-border text-muted hover:text-fg"
                    )}
                  >
                    Система
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowAdmin(false)} 
                className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm uppercase tracking-[0.1em] text-[10px] font-bold"
              >
                Закрыть
              </button>
            </div>

            {adminTab === 'feedback' ? (
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
                          <div className="text-[9px] font-bold text-muted/60 uppercase tracking-[0.1em]">
                            {f.createdAt && typeof (f.createdAt as any).toDate === 'function' 
                              ? (f.createdAt as any).toDate().toLocaleDateString() 
                              : typeof f.createdAt === 'number' 
                                ? new Date(f.createdAt).toLocaleDateString() 
                                : 'Неизвестно'}
                          </div>
                        </div>
                        <p className="text-fg/90 text-lg leading-relaxed font-medium italic">«{f.message}»</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="sber-card space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-muted font-bold text-[10px] uppercase tracking-[0.2em]">Пользователи</div>
                        <div className="text-3xl font-bold text-fg tracking-tight">{systemStats.users}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                        <span className="text-muted">Лимит Spark (Бесплатно)</span>
                        <span className="text-fg">1 ГБ / 50к чтений</span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((systemStats.users / 1000) * 100, 100)}%` }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                      <p className="text-[9px] text-muted italic">Оценка заполненности: {((systemStats.users / 1000) * 100).toFixed(1)}% (база 1000 юзеров)</p>
                    </div>
                  </div>

                  <div className="sber-card space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-muted font-bold text-[10px] uppercase tracking-[0.2em]">Отзывы / Данные</div>
                        <div className="text-3xl font-bold text-fg tracking-tight">{systemStats.feedback}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                        <span className="text-muted">Нагрузка на БД</span>
                        <span className="text-emerald-500">Минимальная</span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((systemStats.feedback / 500) * 100, 100)}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                      <p className="text-[9px] text-muted italic">Безопасная зона для бесплатного тарифа</p>
                    </div>
                  </div>
                </div>

                <div className="sber-card bg-accent/5 border-accent/20 p-10">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 bg-accent rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-accent/20">
                      <Zap className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif text-fg tracking-tight">Статус Gemini AI</h3>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em] mt-1">Интеллектуальное ядро системы</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                      <div className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] mb-2">Лимит RPM</div>
                      <div className="text-lg font-bold text-fg">Без ограничений*</div>
                    </div>
                    <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                      <div className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] mb-2">Статус</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="text-lg font-bold text-emerald-500">Активен</div>
                      </div>
                    </div>
                    <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                      <div className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] mb-2">Тариф</div>
                      <div className="text-lg font-bold text-accent">Paid Tier</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                      <div className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] mb-2">Всего сессий (БД)</div>
                      <div className="text-lg font-bold text-fg">{systemStats.users * 2 + sessions.length}</div>
                    </div>
                    <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                      <div className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] mb-2">Приблизительный расход</div>
                      <div className="text-lg font-bold text-fg">~$0.01 / 10 сессий</div>
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl flex items-start gap-4">
                    <Zap className="w-5 h-5 text-emerald-500 mt-1" />
                    <div>
                      <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-2">Система работает на платном API</div>
                      <p className="text-xs text-fg/70 leading-relaxed font-medium">
                        Лимиты расширены. Оплата списывается с баланса Google Cloud ($10). 
                        Текущий расход минимален и позволяет провести тысячи диалогов.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              className="space-y-10 max-w-4xl mx-auto pb-20"
            >
              {viewingSession ? (
                <div className="space-y-10">
                  <button 
                    onClick={() => setViewingSession(null)}
                    className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-70 transition-all w-fit"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Назад к статистике
                  </button>

                  <div className="sber-card p-10 space-y-10">
                    <div className="flex items-center justify-between border-b border-border pb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center border border-accent/20">
                          {ScenarioIcons[SCENARIOS.find(s => s.id === viewingSession.scenarioId)?.icon || 'MessageCircle']}
                        </div>
                        <div>
                          <h3 className="text-2xl font-serif text-fg">
                            {SCENARIOS.find(s => s.id === viewingSession.scenarioId)?.title || 'Удаленный сценарий'}
                          </h3>
                          <p className="text-muted text-xs font-bold uppercase tracking-widest mt-1">
                            {viewingSession.createdAt && typeof (viewingSession.createdAt as any).toDate === 'function' 
                              ? (viewingSession.createdAt as any).toDate().toLocaleString('ru-RU') 
                              : new Date(viewingSession.createdAt).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mb-1">Оценка</div>
                        <div className="text-4xl font-black text-accent">{viewingSession.score * 10}%</div>
                      </div>
                    </div>

                    <div className="space-y-8 py-4">
                      {viewingSession.messages && viewingSession.messages.length > 0 ? (
                        viewingSession.messages.map((m, i) => (
                          <div key={i} className={cn(
                            "flex flex-col max-w-[85%]",
                            m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                          )}>
                            <div className={cn(
                              "p-5 rounded-2xl text-sm leading-relaxed font-medium",
                              m.role === 'user' 
                                ? "bg-accent text-white rounded-tr-none" 
                                : "bg-card border border-border text-fg rounded-tl-none shadow-sm"
                            )}>
                              {m.text}
                            </div>
                            <div className="text-[9px] text-muted/50 mt-2 font-bold uppercase tracking-widest">
                              {m.role === 'user' ? 'Вы' : 'Собеседник'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 text-muted italic font-medium opacity-60">Переписка не сохранена для этого сеанса</div>
                      )}
                    </div>

                    <div className="pt-10 border-t border-border">
                      <div className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mb-6">Анализ диалога</div>
                      <div className="p-8 bg-accent/5 border border-accent/10 rounded-2xl text-fg/90 italic leading-relaxed font-medium">
                        {viewingSession.detailedAnalysis}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                          <h4 className="text-xl font-bold text-fg mb-3 tracking-tight">Достижения и история</h4>
                          <p className="text-muted text-sm max-w-xs mb-8 font-medium">Оформите подписку, чтобы видеть свои награды и полный архив сессий.</p>
                          <button 
                            onClick={() => setShowSubscription(true)}
                            className="sber-button"
                          >
                            Узнать больше
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {stats.achievements.map((achievement, idx) => {
                          const isLockedForFree = !isSubscribed && idx >= 3;
                          return (
                            <div 
                              key={achievement.id} 
                              className={cn(
                                "sber-card !p-6 flex flex-col items-center text-center gap-3 transition-all relative overflow-hidden",
                                achievement.unlocked && !isLockedForFree ? "border-accent/30 bg-accent/5" : "opacity-40 grayscale"
                              )}
                            >
                              {isLockedForFree && (
                                <div className="absolute inset-0 bg-bg/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                                  <Lock className="w-5 h-5 text-accent" />
                                </div>
                              )}
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center border",
                                achievement.unlocked && !isLockedForFree ? "bg-accent text-white border-accent/20" : "bg-bg text-muted border-border"
                              )}>
                                {AchievementIcons[achievement.icon]}
                              </div>
                              <div className="space-y-1">
                                <div className="text-[11px] font-bold text-fg tracking-tight leading-tight">
                                  {isLockedForFree ? 'Премиум' : achievement.title}
                                </div>
                                <div className="text-[9px] text-muted font-medium leading-tight">
                                  {isLockedForFree ? 'Доступно в подписке' : achievement.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-[1px] flex-1 bg-border" />
                      <h3 className="text-[9px] font-bold text-muted uppercase tracking-[0.3em]">История сессий</h3>
                      <div className="h-[1px] flex-1 bg-border" />
                    </div>
                    
                    <div className="space-y-4">
                      {sessions.length === 0 ? (
                        <div className="sber-card p-16 text-center text-muted font-medium italic opacity-60">
                          Здесь будет отображаться история ваших тренировок
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {sessions.map((session) => {
                            const scenario = SCENARIOS.find(s => s.id === session.scenarioId);
                            
                            return (
                              <button 
                                key={session.id}
                                onClick={() => setViewingSession(session)}
                                className="sber-card !p-6 flex items-center justify-between gap-4 transition-all relative overflow-hidden text-left w-full hover:border-accent/30 cursor-pointer active:scale-[0.98]"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center border border-accent/20">
                                    {scenario ? AchievementIcons[scenario.icon] || <MessageSquare className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-fg tracking-tight leading-tight">
                                      {scenario?.title || 'Неизвестный сценарий'}
                                    </div>
                                    <div className="text-[9px] text-muted font-medium">
                                      {(() => {
                                        const date = session.createdAt && (session.createdAt as any).toDate 
                                          ? (session.createdAt as any).toDate() 
                                          : new Date(session.createdAt);
                                        return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-serif text-accent">{session.score}/10</div>
                                  <div className="text-[8px] font-bold text-muted uppercase tracking-widest">Балл</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
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
                  <div className="text-[11px] font-bold text-accent uppercase tracking-[0.4em] mb-6">Интересный факт</div>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="text-2xl sm:text-3xl font-medium text-fg italic leading-tight tracking-tight"
                  >
                    {dailyFact}
                  </motion.p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-[9px] font-bold uppercase tracking-[0.2em] mb-2"
                >
                  Тренажёр духовного общения
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
                  <div className="space-y-4">
                    {SCENARIOS.filter(s => s.mode === 'chat').map((scenario) => {
                      const isExpanded = expandedScenarioId === scenario.id;
                      return (
                        <div key={scenario.id} className="sber-card !p-0 overflow-hidden border-border/50 transition-all">
                          <button
                            onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.id)}
                            className="w-full flex items-center justify-between p-6 hover:bg-accent/5 transition-all text-left"
                          >
                            <div className="flex items-center gap-6">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border",
                                isExpanded ? "bg-accent text-white border-accent/20" : "bg-bg text-accent border-accent/10"
                              )}>
                                {ScenarioIcons[scenario.icon as string]}
                              </div>
                              <h3 className={cn(
                                "text-2xl font-serif tracking-tight",
                                isExpanded ? "text-accent" : "text-fg"
                              )}>
                                {scenario.title}
                              </h3>
                            </div>
                            <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
                              <ChevronDown className="w-6 h-6 text-muted" />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                              >
                                <div className="px-6 pb-8 pt-2 space-y-8">
                                  <div className="pl-[80px]">
                                    <p className="text-muted text-base leading-relaxed font-medium max-w-2xl italic">
                                      {scenario.description}
                                    </p>
                                    <div className="mt-8 pt-8 border-t border-border flex items-center">
                                      <button 
                                        onClick={() => startScenario(scenario)}
                                        className="sber-button py-4 px-12 text-[11px] flex items-center gap-3 group"
                                      >
                                        Начать диалог <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] whitespace-nowrap">
                      Работа с критикой
                    </h3>
                    <div className="flex-1 h-[1px] bg-border" />
                  </div>
                  <div className="space-y-4">
                    {SCENARIOS.filter(s => s.mode === 'criticism').map((scenario) => {
                      const isExpanded = expandedScenarioId === scenario.id;
                      return (
                        <div key={scenario.id} className="sber-card !p-0 overflow-hidden border-border/50 transition-all">
                          <button
                            onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.id)}
                            className="w-full flex items-center justify-between p-6 hover:bg-rose-500/5 transition-all text-left"
                          >
                            <div className="flex items-center gap-6">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border",
                                isExpanded ? "bg-rose-500 text-white border-rose-500/20" : "bg-bg text-rose-500 border-rose-500/10"
                              )}>
                                {ScenarioIcons[scenario.icon as string]}
                              </div>
                              <h3 className={cn(
                                "text-2xl font-serif tracking-tight",
                                isExpanded ? "text-rose-500" : "text-fg"
                              )}>
                                {scenario.title}
                              </h3>
                            </div>
                            <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
                              <ChevronDown className="w-6 h-6 text-muted" />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                              >
                                <div className="px-6 pb-8 pt-2 space-y-8">
                                  <div className="pl-[80px]">
                                    <p className="text-muted text-base leading-relaxed font-medium max-w-2xl italic">
                                      {scenario.description}
                                    </p>
                                    <div className="mt-8 pt-8 border-t border-border flex items-center">
                                      <button 
                                        onClick={() => startScenario(scenario)}
                                        className="px-12 py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-rose-500/20 flex items-center gap-3 group"
                                      >
                                        Начать разбор <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="flex flex-col items-center gap-4 pt-12 pb-8 opacity-50">
                <div className="flex items-center gap-2 px-3 py-1 bg-accent/5 border border-accent/10 rounded-full">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-accent uppercase tracking-[0.2em]">PWA Ready</span>
                </div>
                <p className="text-[10px] text-muted font-medium">Версия 1.2.0 • Работает офлайн</p>
              </div>
            </motion.div>
          ) : feedback ? (
            <motion.div 
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 20 }}
              className="sber-card max-w-4xl mx-auto overflow-hidden !p-0"
            >
              <div className="bg-accent p-12 text-white text-center relative overflow-hidden">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.1, scale: 1.5 }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                  className="absolute top-0 left-0 w-full h-full bg-white rounded-full blur-3xl -translate-y-1/2"
                />
                <div className="relative z-10">
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6 backdrop-blur-md border border-white/30"
                  >
                    <Star className="w-10 h-10 fill-white" />
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-semibold mb-4 tracking-tight"
                  >
                    Анализ завершен
                  </motion.h2>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="text-6xl font-bold mb-4"
                  >
                    {feedback.score}<span className="text-2xl opacity-60">/10</span>
                  </motion.div>
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
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="bg-bg border border-border p-5 rounded-2xl text-center"
                      >
                        <div className="text-muted text-[9px] font-bold uppercase tracking-[0.2em] mb-2">
                          {m.label}
                        </div>
                        <div className="text-xl font-bold text-fg tracking-tight">{m.val}{m.suffix}</div>
                      </motion.div>
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
                        <motion.li 
                          key={i} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                          className="flex gap-4 text-sm text-fg/90 bg-accent/5 p-5 rounded-xl border border-accent/10 font-medium"
                        >
                          <span className="font-bold text-accent">{i + 1}.</span>
                          {s}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative">
                    {!isSubscribed && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border">
                        <div className="w-12 h-12 bg-accent text-white rounded-xl flex items-center justify-center mb-4">
                          <Zap className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-fg mb-1 tracking-tight">Глубокий разбор</h4>
                        <p className="text-xs text-muted mb-6 max-w-[200px] leading-relaxed">
                          Узнайте скрытые ошибки и получите план роста
                        </p>
                        <button 
                          onClick={() => setShowSubscription(true)}
                          className="sber-button w-full py-3 text-sm"
                        >
                          Открыть за {SUBSCRIPTION_PLANS[0].price}
                        </button>
                      </div>
                    )}
                    
                    <div className={cn("space-y-4", !isSubscribed && "blur-md select-none")}>
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
                  {!isSubscribed && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="bg-card px-4 py-2 rounded-full border border-border shadow-lg flex items-center gap-2">
                        <Lock className="w-3 h-3 text-accent" />
                        <span className="text-[9px] font-bold text-accent uppercase tracking-[0.1em]">Резюме скрыто</span>
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "bg-bg p-6 rounded-2xl border border-border transition-all duration-500",
                    !isSubscribed && "blur-md opacity-30"
                  )}>
                    <h3 className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-4">
                      Резюме наставника
                    </h3>
                    <p className="text-lg text-fg/90 leading-relaxed italic font-medium">
                      "{feedback.summary}"
                    </p>
                  </div>
                </div>

                {!isSubscribed && (
                  <div className="bg-accent/5 border border-accent/20 p-6 rounded-2xl">
                    <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-3">Поверхностный анализ</h4>
                    <p className="text-xs text-muted leading-relaxed">
                      Ваш ответ был в целом корректен, но требует более глубокой проработки библейских оснований. Для детального разбора оформите подписку.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={reset}
                    className="sber-button flex-1"
                  >
                    Новая тренировка
                  </button>
                  <button 
                    onClick={() => {
                      if (!isSubscribed) {
                        setShowSubscription(true);
                        return;
                      }
                      const text = `Результат тренировки в "Вера +1":\nБалл: ${feedback.score}/10\n\nРезюме: ${feedback.summary}\n\nСильные стороны:\n${feedback.strengths.join('\n')}\n\nЗоны роста:\n${feedback.improvements.join('\n')}`;
                      navigator.clipboard.writeText(text);
                      addNotification("Результат скопирован! Теперь вы можете отправить его наставнику.", 'success');
                    }}
                    className={cn(
                      "flex-1 px-8 font-bold rounded-xl transition-all uppercase tracking-[0.1em] text-[10px] py-4 flex items-center justify-center gap-2",
                      isSubscribed 
                        ? "bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-white" 
                        : "bg-bg border border-border text-muted hover:border-accent hover:text-accent"
                    )}
                  >
                    {isSubscribed ? <Send className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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
              className="flex flex-col h-[calc(100dvh-140px)] sm:h-[calc(100vh-180px)] sber-card overflow-hidden !p-0"
            >
              <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between backdrop-blur-md relative overflow-hidden">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <button 
                    onClick={reset}
                    className="p-2 sm:p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:scale-95 shrink-0"
                    title="Назад в меню"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <div className="w-10 h-10 sm:w-14 h-14 bg-accent/10 text-accent rounded-xl sm:rounded-2xl flex items-center justify-center border border-accent/20 shrink-0">
                    <User className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-2xl font-serif text-fg tracking-tight leading-tight truncate">{selectedScenario.title}</h3>
                      <div className="flex items-center gap-4 mt-1 sm:mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full animate-pulse" />
                          <span className="text-[8px] sm:text-[9px] font-bold text-muted uppercase tracking-[0.2em]">В сети</span>
                        </div>
                      </div>
                    </div>
                </div>
                <button 
                  onClick={handleFinish}
                  disabled={isAnalyzing || messages.length < 3}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md font-bold text-[7px] uppercase tracking-[0.1em] transition-all flex items-center gap-1 active:scale-95 shrink-0",
                    isAnalyzing ? "bg-bg text-muted" : isDialogueEnded ? "bg-emerald-500 text-white shadow-sm" : "bg-accent/5 text-accent border border-accent/10 hover:bg-accent hover:text-white"
                  )}
                >
                  {isAnalyzing ? (
                    <RefreshCcw className="w-2.5 h-2.5 animate-spin" />
                  ) : isDialogueEnded ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Анализ</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Завершить</span>
                    </>
                  )}
                </button>
              </div>

              <div 
                ref={scrollRef}
                className={cn(
                  "flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth relative transition-all duration-1000",
                  currentMood === 'calm' && "bg-emerald-500/[0.03] backdrop-blur-[2px]",
                  currentMood === 'tense' && "bg-amber-500/[0.03] backdrop-blur-[2px]",
                  currentMood === 'warm' && "bg-rose-500/[0.03] backdrop-blur-[2px]",
                  currentMood === 'cold' && "bg-blue-500/[0.03] backdrop-blur-[2px]",
                  currentMood === 'neutral' && "bg-transparent"
                )}
                style={{
                  backgroundImage: selectedScenario?.backgroundUrl ? `linear-gradient(to bottom, rgba(var(--bg), 0.85), rgba(var(--bg), 0.98)), url(${selectedScenario.backgroundUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundAttachment: 'fixed'
                }}
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
                    <div className="flex items-end gap-3 w-full">
                      <div className={cn(
                        "p-5 rounded-2xl text-sm leading-relaxed font-medium relative group",
                        m.role === 'user' 
                          ? "bg-accent text-white rounded-tr-none" 
                          : "bg-card border border-border text-fg rounded-tl-none shadow-sm"
                      )}>
                        <div className={cn(
                          "prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit prose-p:text-inherit prose-headings:text-inherit",
                          m.role === 'user' ? "text-white" : "text-fg dark:prose-invert"
                        )}>
                          {renderMessageText(m.text)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-muted mt-2 uppercase tracking-[0.2em] px-2">
                      {m.role === 'user' ? 'Вы' : selectedScenario.title} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col max-w-[85%] mr-auto items-start"
                  >
                    <div className="flex items-end gap-3 w-full">
                      <div className="p-5 rounded-2xl bg-card border border-border text-fg rounded-tl-none shadow-sm">
                        <div className="flex gap-1">
                          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
                          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
                          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isDialogueEnded && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center p-12 text-center"
                  >
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-fg mb-2 tracking-tight">Диалог логически завершен</h4>
                    <p className="text-muted text-sm max-w-xs mb-8 font-medium">Собеседник считает, что все важные моменты обсуждены. Теперь вы можете перейти к анализу ваших ответов.</p>
                    <button 
                      onClick={handleFinish}
                      className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Перейти к анализу
                    </button>
                  </motion.div>
                )}
                {isLoading && (
                  <div className="flex flex-col mr-auto items-start w-full max-w-[85%]">
                    <div className="bg-card px-6 py-4 rounded-2xl rounded-tl-none border border-border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: currentMood === 'tense' ? 0.6 : currentMood === 'calm' ? 1.8 : 1.2, repeat: Infinity, delay: 0 }}
                            className="w-1.5 h-1.5 bg-accent rounded-full" 
                          />
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: currentMood === 'tense' ? 0.6 : currentMood === 'calm' ? 1.8 : 1.2, repeat: Infinity, delay: 0.2 }}
                            className="w-1.5 h-1.5 bg-accent rounded-full" 
                          />
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: currentMood === 'tense' ? 0.6 : currentMood === 'calm' ? 1.8 : 1.2, repeat: Infinity, delay: 0.4 }}
                            className="w-1.5 h-1.5 bg-accent rounded-full" 
                          />
                        </div>
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
                  {LIBRARY_ARTICLES.map((article, idx) => {
                    const isPurchased = userProfile?.purchasedArticles?.includes(article.id);
                    const canRead = !article.isPremium || isPurchased || isSubscribed;

                    return (
                      <motion.div 
                        key={article.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="sber-card relative group p-10 flex flex-col h-full bg-card/50 backdrop-blur-sm cursor-pointer overflow-hidden"
                        onClick={() => {
                          if (canRead) {
                            setSelectedArticle(article);
                          }
                        }}
                      >
                        {article.isPremium && !isPurchased && !isSubscribed && (
                          <div className="absolute inset-0 bg-bg/95 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-border/50">
                            <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6">
                              <Lock className="w-7 h-7" />
                            </div>
                            <h4 className="font-bold text-fg mb-3 uppercase tracking-wider text-xs">Доступно после покупки</h4>
                            <p className="text-muted text-xs mb-8 max-w-[200px] leading-relaxed">{article.description}</p>
                            <div className="flex flex-col gap-3 w-full max-w-[200px]">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  buyArticle(article.id);
                                }}
                                disabled={loadingItemId === article.id}
                                className="sber-button py-3 px-8 text-xs flex items-center justify-center gap-2"
                              >
                                {loadingItemId === article.id ? (
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : null}
                                Купить за {article.price} ₽
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowSubscription(true);
                                }}
                                className="text-accent font-bold text-[10px] uppercase tracking-widest hover:underline"
                              >
                                Или по подписке
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-6">
                          <div className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] bg-accent/5 px-3 py-1 rounded-lg border border-accent/10">{article.category}</div>
                          {article.isPremium && <Sparkles className="w-4 h-4 text-amber-500" />}
                        </div>
                        <h3 className="text-2xl font-semibold text-fg mb-6 tracking-tight leading-tight">{article.title}</h3>
                        <p className="text-muted text-sm leading-relaxed font-medium opacity-90 flex-grow line-clamp-3">{article.description}</p>
                        <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
                          <span className="text-[9px] font-bold text-muted uppercase tracking-widest">5 мин чтения</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canRead) {
                                setSelectedArticle(article);
                              }
                            }}
                            className="text-accent font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all"
                          >
                            {canRead ? 'Читать полностью' : 'Заблокировано'} <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
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

                    <div className="mt-20 pb-20 pt-12 border-t border-border flex flex-col items-center">
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

      {/* Side Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <div className="fixed inset-0 z-[150]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="absolute inset-0 bg-bg/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-[320px] bg-card border-l border-border p-8 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-serif text-fg tracking-tight">Вера +1</h3>
                </div>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-3 bg-bg border border-border text-muted rounded-xl hover:border-accent hover:text-accent transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-2 -mr-2">
                <button 
                  onClick={() => {
                    reset();
                    setShowMobileMenu(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold uppercase tracking-[0.2em] text-[10px]",
                    !selectedScenario && !showLibrary && !showStats ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-accent/5 text-muted hover:text-accent"
                  )}
                >
                  <Home className="w-5 h-5" />
                  Главная
                </button>

                {isUserAdmin && (
                  <button 
                    onClick={() => {
                      fetchAdminFeedback();
                      setShowMobileMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold uppercase tracking-[0.2em] text-[10px]",
                      showAdmin ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-accent/5 text-muted hover:text-accent"
                    )}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Админ-панель
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    reset();
                    setShowLibrary(true);
                    setShowMobileMenu(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold uppercase tracking-[0.2em] text-[10px]",
                    showLibrary ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-accent/5 text-muted hover:text-accent"
                  )}
                >
                  <BookOpen className="w-5 h-5" />
                  Библиотека
                </button>

                <button 
                  onClick={() => {
                    reset();
                    setShowStats(true);
                    setShowMobileMenu(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold uppercase tracking-[0.2em] text-[10px]",
                    showStats ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-accent/5 text-muted hover:text-accent"
                  )}
                >
                  <Trophy className="w-5 h-5" />
                  Мой путь
                </button>

                <button 
                  onClick={() => {
                    setFeedbackType('general');
                    setShowFeedbackForm(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-accent/5 text-muted hover:text-accent transition-all font-bold uppercase tracking-[0.2em] text-[10px]"
                >
                  <MessageSquare className="w-5 h-5" />
                  Обратная связь
                </button>

                {deferredPrompt && (
                  <button 
                    onClick={handleInstallClick}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all font-bold uppercase tracking-[0.2em] text-[10px] mt-6"
                  >
                    <Sparkles className="w-5 h-5" />
                    Установить PWA
                  </button>
                )}
              </div>

              <div className="pt-8 border-t border-border mt-8 space-y-2">
                <button 
                  onClick={() => {
                    setShowAgreement(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-accent/5 text-muted/60 hover:text-accent transition-all font-bold uppercase tracking-[0.2em] text-[9px]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Соглашение
                </button>

                <button 
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-rose-500/5 text-rose-500 transition-all font-bold uppercase tracking-[0.2em] text-[9px]"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти из системы
                </button>
              </div>
            </motion.div>
          </div>
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
                  <div className="pt-6 border-t border-border/50 text-[10px] text-muted space-y-2 uppercase tracking-widest">
                    <p className="font-bold">Реквизиты:</p>
                    <p>ИНН: 775101376595</p>
                    <p>Виноградов Кирилл Вячеславович</p>
                  </div>
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
          <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-bg/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubscription(false)}
              className="absolute inset-0"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-2xl relative overflow-hidden my-auto"
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
                    <span className="text-5xl font-semibold text-fg tracking-tighter">{SUBSCRIPTION_PLANS[0].price}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <button 
                    onClick={buySubscription}
                    disabled={loadingItemId === 'subscription'}
                    className="sber-button w-full py-6 text-lg flex items-center justify-center gap-3"
                  >
                    {loadingItemId === 'subscription' ? (
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

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {paymentConfirmation && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-bg/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="sber-card max-w-md w-full p-10 space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-20" />
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold text-fg tracking-tight">Подтверждение покупки</h3>
                <p className="text-muted text-sm leading-relaxed">
                  Вы собираетесь приобрести: <br/>
                  <span className="text-fg font-bold">«{paymentConfirmation.title}»</span> <br/>
                  Стоимость: <span className="text-accent font-bold">{paymentConfirmation.price}</span>
                </p>
              </div>

              <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 text-xs text-muted leading-relaxed italic">
                Для завершения оплаты вы будете перенаправлены на защищенную страницу платежной системы ЮKassa.
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    if (paymentConfirmation.type === 'article' && paymentConfirmation.id) {
                      processArticlePurchase(paymentConfirmation.id);
                    } else {
                      processSubscriptionPurchase();
                    }
                  }}
                  disabled={!!loadingItemId}
                  className="sber-button w-full py-5 text-base flex items-center justify-center gap-3"
                >
                  {loadingItemId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Переход...
                    </>
                  ) : (
                    <>Перейти к оплате</>
                  )}
                </button>
                <button
                  onClick={() => setPaymentConfirmation(null)}
                  disabled={!!loadingItemId}
                  className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] hover:text-fg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Notifications */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 pointer-events-auto backdrop-blur-md min-w-[300px]",
                n.type === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                n.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                "bg-accent/10 border-accent/20 text-accent"
              )}
            >
              {n.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> :
               n.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
               <Info className="w-5 h-5 shrink-0" />}
              <p className="text-sm font-bold tracking-tight">{n.message}</p>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
