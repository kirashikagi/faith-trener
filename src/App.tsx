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
  X,
  Check,
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
  Key,
  Search,
  Users,
  Scale,
  Quote,
  Database,
  Cpu
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
  limit,
  orderBy,
  Timestamp,
  getDocFromServer,
  updateDoc,
  onSnapshot,
  deleteDoc,
  getCountFromServer
} from 'firebase/firestore';

import { auth, db } from './firebase';

import { Scenario, Message, Feedback, Role, ResponseOption, Achievement, UserStats, UserProfile, FeedbackSubmission, LibraryArticle, SessionRecord } from './types';
import { SCENARIOS, ACHIEVEMENTS, PHILOSOPHY, BIBLICAL_FACTS, LIBRARY_ARTICLES } from './constants';
import { getChatResponse, getFeedback, getResponseOptions, getInitialMessage } from './services/gemini';
import ErrorBoundary from './components/ErrorBoundary';
import { handleFirestoreError, OperationType } from './lib/firebase-utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MAINTENANCE_MODE = false;

const AvatarImage = ({ src, alt, fallback }: { src: string, alt: string, fallback: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-accent/5">
      {!hasError && (
        <img 
          src={src} 
          alt={alt} 
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            console.error(`Failed to load image: ${src}`);
            setHasError(true);
            setIsLoading(false);
          }}
        />
      )}
      {(hasError || isLoading) && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
          isLoading && !hasError ? "opacity-100" : hasError ? "opacity-100" : "opacity-0"
        )}>
           {fallback}
        </div>
      )}
    </div>
  );
};

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
  UserMinus: <UserMinus className="w-6 h-6" />,
  History: <History className="w-6 h-6" />,
  Scale: <Scale className="w-6 h-6" />,
  Users: <Users className="w-6 h-6" />,
  UserX: <UserX className="w-6 h-6" />,
  MessageSquareX: <MessageSquareX className="w-6 h-6" />,
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

function MaintenanceView({ theme }: { theme: 'light' | 'dark' | 'vibrant' }) {
  return (
    <div className={cn("min-h-screen transition-colors duration-500 font-sans flex flex-col items-center justify-center p-6 text-center relative overflow-hidden", theme, theme === 'dark' ? 'bg-bg' : theme === 'vibrant' ? 'bg-[#FDF2F8]' : 'bg-[#FDFCF8]')}>
      {/* Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[160px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[200px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-10 relative z-10"
      >
        <div className="relative mx-auto w-24 h-24 bg-accent/10 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-accent/10">
          <Settings className="w-10 h-10 text-accent animate-spin-slow" />
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center border-4 border-bg shadow-lg">
            <X className="w-3 h-3 text-white" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-fg tracking-tight leading-tight">Технические работы</h1>
          <p className="text-muted text-base leading-relaxed font-medium">
            Приносим свои глубочайшие извинения! В данный момент приложение находится на техническом обслуживании. 
          </p>
          <p className="text-muted text-sm leading-relaxed">
            Мы работаем над восстановлением доступа после попытки несанкционированного доступа к нашей инфраструктуре. Ваши данные в безопасности.
          </p>
        </div>

        <div className="p-8 bg-card rounded-[2.5rem] border border-border shadow-2xl space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-black text-accent uppercase tracking-[0.2em]">Статус восстановления</p>
            <p className="text-sm font-bold text-fg">Идёт развёртывание новой системы</p>
          </div>
          <div className="h-2 w-full bg-border rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-accent"
              initial={{ width: "0%" }}
              animate={{ width: "65%" }}
              transition={{ duration: 3, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-muted italic">Ожидаемое время завершения: несколько часов</p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 px-6 py-3 bg-accent/5 rounded-2xl border border-accent/10">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="text-[11px] font-bold text-accent uppercase tracking-[0.1em]">Вера +1 скоро вернётся</span>
          </div>
          <p className="text-[10px] text-muted/60 max-w-[240px] leading-relaxed italic">
            Спасибо за ваше безграничное терпение. Мы делаем всё возможное, чтобы вы могли продолжить свое духовное развитие.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function AppContent() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'vibrant'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark' | 'vibrant';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'vibrant');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Update theme-color meta tag dynamically
    const themeColor = theme === 'light' ? '#FFFFFF' : theme === 'dark' ? '#1C1C18' : '#FDF2F8';
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (meta) meta.content = themeColor;
  }, [theme]);

  const toggleTheme = () => setTheme(prev => {
    if (prev === 'light') return 'dark';
    if (prev === 'dark') return 'vibrant';
    return 'light';
  });

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
  const [systemStats, setSystemStats] = useState<{ users: number; feedback: number; sessions: number; cost: number }>({ users: 0, feedback: 0, sessions: 0, cost: 0 });
  const [adminTab, setAdminTab] = useState<'feedback' | 'system' | 'users'>('feedback');
  const [userManagerSearchQuery, setUserManagerSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [viewingSession, setViewingSession] = useState<SessionRecord | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<LibraryArticle | null>(null);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone || 
                               document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      
      // If NOT standalone and is mobile, show prompt after 5 seconds
      if (!isStandaloneMode && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
        if (!hasSeenPrompt) {
          setTimeout(() => setShowInstallPrompt(true), 5000);
        }
      }
    };
    
    checkStandalone();
  }, []);

  const isUserAdmin = userProfile?.role === 'admin' || 
                     user?.email === 'kiraishikagi@vera.plus' || 
                     userProfile?.email === 'kiraishikagi@vera.plus';

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [options, setOptions] = useState<ResponseOption[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [isDialogueEnded, setIsDialogueEnded] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [currentMood, setCurrentMood] = useState<'neutral' | 'calm' | 'tense' | 'warm' | 'cold'>('neutral');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isSubscribed = true; // Use true for free access to everything in this simplified version

  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'error' | 'success' }[]>([]);

  const addNotification = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const closeInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
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
    addNotification("Вы получили доступ к статье", 'success');
  };

  const dailyFact = useMemo(() => {
    const day = new Date().getDate();
    return BIBLICAL_FACTS[(day - 1) % BIBLICAL_FACTS.length];
  }, []);
  
  const searchUsers = async () => {
    const queryStr = userManagerSearchQuery.trim();
    if (!queryStr) {
      addNotification("Введите Email или имя для поиска", 'info');
      return;
    }
    setIsSearchingUsers(true);
    try {
      const users: UserProfile[] = [];
      const seenUids = new Set<string>();

      const addResults = (snapshot: any) => {
        snapshot.forEach((doc: any) => {
          const data = doc.data() as UserProfile;
          if (!seenUids.has(data.uid)) {
            users.push(data);
            seenUids.add(data.uid);
          }
        });
      };

      // Query 1: Exact Email
      const qEmail = query(collection(db, 'users'), where('email', '==', queryStr.toLowerCase()), limit(5));
      const snapEmail = await getDocs(qEmail);
      addResults(snapEmail);

      // Query 2: Exact Name (if not many results yet)
      if (users.length < 10) {
        const qName = query(collection(db, 'users'), where('displayName', '==', queryStr), limit(5));
        const snapName = await getDocs(qName);
        addResults(snapName);
      }

      // Query 3: Name prefix (optional, for broader search)
      if (users.length < 10 && queryStr.length >= 3) {
        const qNamePrefix = query(
          collection(db, 'users'), 
          where('displayName', '>=', queryStr), 
          where('displayName', '<=', queryStr + '\uf8ff'),
          limit(5)
        );
        const snapPrefix = await getDocs(qNamePrefix);
        addResults(snapPrefix);
      }

      setFoundUsers(users);
      if (users.length === 0) addNotification("Пользователи не найдены", 'info');
    } catch (e: any) {
      addNotification("Ошибка поиска: " + e.message, 'error');
    } finally {
      setIsSearchingUsers(false);
    }
  };

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
            const role = (
              firebaseUser.email === 'kiraishikagi@vera.plus'
            ) ? 'admin' : 'user';

            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: role,
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
        const isAdminEmail = internalEmail === 'kiraishikagi@vera.plus' || 
                           internalEmail === 'kiraishikagi';
        
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
    addNotification("Подписка активирована", 'success');
  };

  useEffect(() => {
    if (isUserAdmin) {
      // Fetch stats silently for admin
      const fetchStats = async () => {
        try {
          const [usersCount, feedbackCount, sessionsCount] = await Promise.all([
            getCountFromServer(collection(db, 'users')),
            getCountFromServer(collection(db, 'feedback')),
            getCountFromServer(collection(db, 'sessions'))
          ]).catch(() => [null, null, null]);
          
          if (usersCount || feedbackCount || sessionsCount) {
            setSystemStats(prev => ({
              users: usersCount ? usersCount.data().count : prev.users,
              feedback: feedbackCount ? feedbackCount.data().count : prev.feedback,
              sessions: sessionsCount ? sessionsCount.data().count : prev.sessions,
              cost: sessionsCount ? sessionsCount.data().count * 0.001 : prev.cost
            }));
          }
        } catch (e) {
          console.error("Auto-fetch stats error:", e);
        }
      };
      fetchStats();
    }
  }, [isUserAdmin]);

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
        const [usersCount, feedbackCount, sessionsCount] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'feedback')),
          getCountFromServer(collection(db, 'sessions'))
        ]).catch(err => {
          console.error("Error in individual count fetch:", err);
          return [null, null, null];
        });
        
        const totalUsers = usersCount ? usersCount.data().count : systemStats.users;
        const totalFeedback = feedbackCount ? feedbackCount.data().count : systemStats.feedback;
        const totalSessions = sessionsCount ? sessionsCount.data().count : systemStats.sessions;
        
        // Cost estimation: $0.001 per session (average for gemini-pro/flash for small context)
        const estimatedCost = totalSessions * 0.001;

        setSystemStats({
          users: totalUsers,
          feedback: totalFeedback,
          sessions: totalSessions,
          cost: estimatedCost
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
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sync achievement titles and descriptions from constants
        parsed.achievements = ACHIEVEMENTS.map(ref => {
          const userAch = parsed.achievements?.find((a: any) => a.id === ref.id);
          return {
            ...ref,
            unlocked: userAch ? !!userAch.unlocked : !!ref.unlocked
          };
        });
        return parsed;
      }
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

  const getEffectiveApiKey = () => {
    // Environment variables provided by the platform/secrets
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                   process.env.VITE_GEMINI_API_KEY || 
                   process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY;
                   
    if (envKey && envKey.trim() !== '' && envKey.trim() !== 'MY_GEMINI_API_KEY') {
      return envKey.trim();
    }
    
    return "";
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
        "", // Server will use default model
        selectedScenario.systemInstruction + commonInstruction,
        messages, 
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

      let finalMessage = `Ошибка API: ${errorMessage}. Если ошибка повторяется, проверьте настройки ключа в разделе Secrets.`;
      
      if (errorMessage.includes("API_KEY_INVALID")) {
        finalMessage = `Ошибка API: Неверный ключ. Проверьте его в разделе Secrets и убедитесь, что вы нажали "Apply changes".`;
      }
      
      if (errorMessage.includes("Quota exceeded") || errorMessage.includes("429")) {
        finalMessage = "Лимит запросов ИИ исчерпан (Quota Exceeded). В бесплатном режиме Google Gemini API доступно всего 20 запросов в день. Пожалуйста, подождите до завтра.";
      } else if (errorMessage.includes("Failed to fetch")) {
        finalMessage = "Ошибка сети: Не удалось связаться с сервером. Возможно, домен заблокирован вашим провайдером. Попробуйте использовать другой браузер или привязать свой домен в Cloudflare.";
      } else if (isPlaceholder || !apiKey) {
        finalMessage += ` Пожалуйста, добавьте новый секрет с именем "VITE_GEMINI_API_KEY" и вашим реальным ключом в разделе Secrets, затем нажмите "Apply changes".`;
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

      const feedbackResult: Feedback = { ...result, isUnlocked: true };
      setFeedback(feedbackResult);

      // Save to Firestore
      if (user && selectedScenario) {
        try {
          await addDoc(collection(db, 'sessions'), {
            uid: user.uid,
            scenarioId: selectedScenario.id,
            score: result.score || 0,
            detailedAnalysis: result.summary || "",
            isUnlocked: true,
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
      if (result.metrics && result.metrics.speed < 10) unlockAchievement('inspired_impulse');
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

  if (MAINTENANCE_MODE && !isUserAdmin && user && !isAuthLoading && !isProfileLoading) {
    return (
      <div className={cn("min-h-screen relative", theme)}>
        <MaintenanceView theme={theme} />
        <div className="fixed bottom-12 left-0 w-full flex justify-center z-50">
          <button 
            onClick={() => signOut(auth)}
            className="px-8 py-4 bg-bg/80 backdrop-blur-md border border-border text-muted rounded-2xl hover:text-rose-500 hover:border-rose-500/30 transition-all font-bold text-[11px] uppercase tracking-[0.3em] shadow-2xl"
          >
            Выйти из системы (Switch Account)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-bg transition-colors duration-500 font-sans selection:bg-accent/20 selection:text-accent overflow-x-hidden relative", theme)}>
      {/* Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[160px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10">
        {user && (!MAINTENANCE_MODE || isUserAdmin) && (
          <header className="sticky top-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between transition-all duration-300 pt-safe">
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
                  title={theme === 'light' ? 'Переключить на темную' : theme === 'dark' ? 'Переключить на красочную' : 'Переключить на светлую'}
                >
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-accent" />}
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
          <div className="min-h-screen flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-bg">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.05 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 30%, var(--color-accent) 0%, transparent 50%), 
                                  radial-gradient(circle at 80% 70%, var(--color-accent) 0%, transparent 50%)`,
                filter: 'blur(100px)'
              }}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="glass-card max-w-5xl mx-auto overflow-hidden !p-0 relative z-10 border border-white/10"
            >
              <div className="flex flex-col lg:flex-row min-h-[70vh]">
                <div className="lg:w-2/5 bg-accent p-12 sm:p-20 flex flex-col justify-between relative overflow-hidden text-white">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                    className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
                  />
                  
                  <div className="relative z-10">
                    <div className="w-16 h-1 bg-white/30 mb-10" />
                    <h2 className="text-4xl sm:text-6xl font-serif leading-[1.1] tracking-tight">
                      {PHILOSOPHY.title}
                    </h2>
                  </div>

                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Искусство духовного общения</p>
                  </div>
                </div>

                <div className="lg:w-3/5 p-12 sm:p-20 bg-card/40 flex flex-col justify-center space-y-16">
                  <div className="max-w-xl">
                    <motion.p 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-2xl sm:text-4xl text-fg leading-snug font-serif italic mb-10 text-balance"
                    >
                      «Слово ваше да будет всегда с благодатию, приправлено солью, чтобы вы знали, как отвечать каждому»
                    </motion.p>
                    <div className="flex items-center gap-4 mb-10">
                      <div className="h-[1px] w-12 bg-accent/30" />
                      <span className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">Кол. 4:6</span>
                    </div>
                    
                    <p className="text-xl text-muted leading-relaxed font-medium">
                      {PHILOSOPHY.content}
                    </p>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "text-[10px] font-black uppercase tracking-[0.5em] whitespace-nowrap transition-colors duration-500",
                        theme === 'light' ? "text-muted/60" : "text-muted/30"
                      )}>Процесс</div>
                      <div className="h-[1px] flex-1 bg-border/40" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {PHILOSOPHY.instruction.map((text, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-start gap-8 group"
                        >
                          <span className={cn(
                            "text-2xl font-serif font-bold leading-none translate-y-1 transition-colors duration-500",
                            theme === 'light' ? "text-accent/40 group-hover:text-accent" : "text-accent/20 group-hover:text-accent"
                          )}>0{i + 1}</span>
                          <p className="text-lg text-fg/70 font-medium leading-relaxed group-hover:text-fg transition-colors duration-500">
                            {text}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-border/40 flex flex-col sm:flex-row items-center gap-10">
                    <button 
                      onClick={handleCloseIntro}
                      className="sber-button px-16 py-6 text-[11px] w-full sm:w-auto"
                    >
                      Начать путь
                    </button>
                    
                    <div className="text-[9px] text-muted/40 uppercase tracking-[0.2em] font-bold text-center sm:text-left leading-relaxed">
                      Нажимая кнопку, вы принимаете <br/>
                      <button 
                        onClick={() => setShowAgreement(true)} 
                        className="text-accent/60 hover:text-accent transition-colors underline underline-offset-4"
                      >
                        пользовательское соглашение
                      </button>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-border/20 flex flex-col gap-2 opacity-30">
                    <div className="text-[8px] font-bold text-muted uppercase tracking-[0.3em]">Реквизиты</div>
                    <div className="text-[9px] text-muted font-medium">ИНН: 775101376595 • Виноградов Кирилл Вячеславович</div>
                    <div className="text-[9px] text-muted font-medium">г. Москва, Российская Федерация</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : showAdmin ? (
          <div className="space-y-12 max-w-5xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border/40 pb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
                  <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Система управления</span>
                </div>
                <h2 className="text-5xl font-serif text-fg tracking-tight">Панель контроля</h2>
                
                <div className="flex flex-wrap gap-3 pt-4">
                  {[
                    { id: 'feedback', label: 'Отзывы', icon: <MessageSquare className="w-4 h-4" /> },
                    { id: 'users', label: 'Участники', icon: <Users className="w-4 h-4" /> },
                    { id: 'system', label: 'Система', icon: <ShieldCheck className="w-4 h-4" /> }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setAdminTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 border",
                        adminTab === tab.id 
                          ? "bg-accent text-white border-accent shadow-2xl shadow-accent/20 scale-105" 
                          : "bg-card border-border text-muted hover:border-accent/40 hover:text-accent"
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setShowAdmin(false)} 
                className="group flex items-center gap-4 px-10 py-5 bg-bg border border-border text-muted rounded-2xl hover:border-accent hover:text-accent transition-all shadow-sm font-black uppercase tracking-[0.2em] text-[10px]"
              >
                Закрыть сессию
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {adminTab === 'feedback' ? (
              <div className="space-y-10">
                <div className="flex items-center gap-4 py-4">
                  <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.4em]">Журнал обращений</h3>
                  <div className="h-[1px] flex-1 bg-border/40" />
                </div>
                
                {adminFeedback.length === 0 ? (
                  <div className="glass-panel p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-accent/5 rounded-[2rem] flex items-center justify-center text-accent/20 mx-auto border border-accent/10">
                      <MessageSquare className="w-10 h-10" />
                    </div>
                    <p className="text-muted font-serif italic text-2xl tracking-tight">Пока отзывов не поступало</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {adminFeedback.map(f => (
                      <div key={f.id} className="glass-panel p-10 space-y-8 group hover:shadow-2xl transition-all duration-700 border-border/40 hover:border-accent/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
                          <Quote className="w-20 h-20" />
                        </div>
                        <div className="flex justify-between items-center border-b border-border/40 pb-6">
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-accent uppercase tracking-widest leading-none">Отправитель</div>
                            <div className="text-sm font-bold text-fg tracking-tight">{f.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black text-muted uppercase tracking-widest leading-none">Дата</div>
                            <div className="text-[10px] font-bold text-muted/60 mt-1">
                              {f.createdAt && typeof (f.createdAt as any).toDate === 'function' 
                                ? (f.createdAt as any).toDate().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' }) 
                                : '—'}
                            </div>
                          </div>
                        </div>
                        <blockquote className="text-2xl font-serif text-fg italic leading-snug tracking-tight relative z-10 pl-6 border-l-2 border-accent/20">
                          «{f.message}»
                        </blockquote>
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 bg-accent rounded-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
                           <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em] opacity-60">Категория: {f.type || 'Общее'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : adminTab === 'users' ? (
              <div className="space-y-12">
                <div className="glass-panel p-10 sm:p-14 relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-serif text-fg tracking-tight">Поиск в реестре</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1 relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-all duration-500" />
                      <input 
                        type="text" 
                        value={userManagerSearchQuery}
                        onChange={(e) => setUserManagerSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                        placeholder="Email или имя пользователя..."
                        className="w-full bg-bg border border-border/60 rounded-3xl pl-16 pr-8 py-6 text-base focus:border-accent outline-none transition-all focus:ring-8 focus:ring-accent/5 font-medium placeholder:text-muted/40 shadow-inner"
                      />
                    </div>
                    <button 
                      onClick={searchUsers}
                      disabled={isSearchingUsers}
                      className="px-16 bg-accent text-white rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl shadow-accent/30 hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 transition-all py-6 sm:py-0 border border-white/10"
                    >
                      {isSearchingUsers ? 'Система ищет...' : 'Найти'}
                    </button>
                  </div>
                </div>

                {foundUsers.length > 0 && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-6 px-4">
                       <h3 className="text-[11px] font-black text-muted uppercase tracking-[0.5em] shrink-0">Результаты поиска</h3>
                       <div className="h-[1px] flex-1 bg-border/40" />
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {foundUsers.map(u => (
                        <div key={u.uid} className="glass-panel flex items-center justify-between p-10 hover:border-accent/50 transition-all duration-700 group relative overflow-hidden">
                          <div className="absolute inset-0 bg-accent/[0.01] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-8 relative z-10">
                            <div className="w-20 h-20 bg-accent/5 rounded-3xl flex items-center justify-center text-accent border border-accent/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-inner">
                              <User className="w-10 h-10" />
                            </div>
                            <div className="space-y-1.5">
                              <div className="text-2xl font-serif text-fg tracking-tight leading-none">{u.displayName || 'Без имени'}</div>
                              <div className="text-muted text-[11px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                <div className="w-1 h-1 bg-accent rounded-full" />
                                {u.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-12 relative z-10">
                             <div className="text-right hidden sm:block pointer-events-none select-none">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted mb-2 opacity-50">Уровень доступа</div>
                                <div className="text-[11px] font-black uppercase tracking-wider text-accent bg-accent/5 px-4 py-1.5 rounded-xl border border-accent/20">
                                  {u.role === 'admin' ? 'Администратор' : 'Участник'}
                                </div>
                             </div>
                             <div className="w-[1px] h-12 bg-border/40 hidden sm:block" />
                             <button className="w-12 h-12 flex items-center justify-center bg-bg border border-border/60 hover:bg-accent hover:text-white hover:border-accent rounded-2xl transition-all duration-500 shadow-sm active:scale-90">
                               <Settings className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass-panel p-12 space-y-10 overflow-hidden relative group">
                    <div className="absolute -right-6 -top-6 opacity-[0.04] group-hover:scale-125 transition-transform duration-[2000ms]">
                      <Users className="w-40 h-40" />
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-[2rem] flex items-center justify-center border border-blue-500/10 shadow-inner">
                        <User className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="text-muted font-black text-[11px] uppercase tracking-[0.5em] leading-none mb-3">Сообщество</div>
                        <div className="text-5xl font-serif text-fg tracking-tight leading-none">{systemStats.users}</div>
                      </div>
                    </div>
                    <div className="space-y-6 relative z-10">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em]">
                        <span className="text-muted opacity-60">Реестр пользователей</span>
                        <span className="text-fg font-black">Лимит 10k</span>
                      </div>
                      <div className="h-3 bg-border/30 rounded-full overflow-hidden p-0.5 border border-border/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((systemStats.users / 10000) * 100, 100)}%` }}
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_2px_15px_rgba(59,130,246,0.6)]"
                        />
                      </div>
                      <p className="text-[11px] text-muted font-medium italic opacity-60">Активный рост клиентской базы: {((systemStats.users / 10000) * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="glass-panel p-12 space-y-10 overflow-hidden relative group">
                    <div className="absolute -right-6 -top-6 opacity-[0.04] group-hover:scale-125 transition-transform duration-[2000ms]">
                      <Cpu className="w-40 h-40" />
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-[2rem] flex items-center justify-center border border-orange-500/10 shadow-inner">
                        <Key className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="text-muted font-black text-[11px] uppercase tracking-[0.5em] leading-none mb-3">API Расходы</div>
                        <div className="text-5xl font-serif text-fg tracking-tight leading-none">${systemStats.cost.toFixed(3)}</div>
                      </div>
                    </div>
                    <div className="space-y-6 relative z-10">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em]">
                        <span className="text-muted opacity-60">Сессий: {systemStats.sessions}</span>
                        <span className="text-orange-500 font-black italic">~$0.01 / 10 сессий</span>
                      </div>
                      <div className="h-3 bg-border/30 rounded-full overflow-hidden p-0.5 border border-border/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((systemStats.cost / 5) * 100, 100)}%` }}
                          className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full shadow-[0_2px_15px_rgba(249,115,22,0.5)]"
                        />
                      </div>
                      <p className="text-[11px] text-muted font-medium italic opacity-60">Текущий бюджет (лимит $5.00)</p>
                    </div>
                  </div>

                  <div className="glass-panel p-12 space-y-10 overflow-hidden relative group">
                    <div className="absolute -right-6 -top-6 opacity-[0.04] group-hover:scale-125 transition-transform duration-[2000ms]">
                      <Database className="w-40 h-40" />
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center border border-emerald-500/10 shadow-inner">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="text-muted font-black text-[11px] uppercase tracking-[0.5em] leading-none mb-3">Данные системы</div>
                        <div className="text-5xl font-serif text-fg tracking-tight leading-none">{systemStats.feedback}</div>
                      </div>
                    </div>
                    <div className="space-y-6 relative z-10">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em]">
                        <span className="text-muted opacity-60">Нагрузка Firestore</span>
                        <span className="text-emerald-500 font-black italic">Стабильно</span>
                      </div>
                      <div className="h-3 bg-border/30 rounded-full overflow-hidden p-0.5 border border-border/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((systemStats.feedback / 1000) * 100, 100)}%` }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_2px_15px_rgba(16,185,129,0.5)]"
                        />
                      </div>
                      <p className="text-[11px] text-muted font-medium italic opacity-60">Инфраструктура работает без задержек</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel bg-accent/[0.03] border-accent/20 p-14 sm:p-20 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-16 relative z-10">
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 bg-accent rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_20px_50px_rgba(var(--accent-rgb),0.3)] border border-white/20 scale-110 -rotate-3">
                        <Zap className="w-12 h-12" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--accent-rgb),0.8)]" />
                          <div className="text-[11px] font-black text-accent uppercase tracking-[0.5em]">Вычислительное ядро</div>
                        </div>
                        <h3 className="text-5xl font-serif text-fg tracking-tight">Gemini AI Engine</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 px-8 py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl shadow-lg shadow-emerald-500/5">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                      <span className="text-sm font-black text-emerald-600 uppercase tracking-[0.3em] leading-none">Система Полностью Активна</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10 mb-12">
                    {[
                      { label: 'Модель нейросети', val: 'Gemini 1.5 Flash', icon: <Cpu className="w-5 h-5" />, color: 'accent' },
                      { label: 'Отклик ядра', val: '1.2s среднее', icon: <Zap className="w-5 h-5 text-amber-500" />, color: 'amber-500' },
                      { label: 'Уровень API', val: 'Paid Enterprise', icon: <Shield className="w-5 h-5 text-blue-500" />, color: 'blue-500' }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-bg/60 backdrop-blur-xl p-8 rounded-3xl border border-border/50 space-y-4 hover:border-accent/30 transition-all duration-500 hover:shadow-xl shadow-inner group">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-bg border border-border shadow-sm rounded-xl group-hover:scale-110 transition-transform">{item.icon}</div>
                          <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{item.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-fg tracking-tight leading-none pl-1">{item.val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-500/[0.04] border border-emerald-500/20 p-10 sm:p-12 rounded-[3.5rem] flex flex-col sm:flex-row items-center sm:items-start gap-10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 shrink-0 border border-white/20">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <div className="relative z-10 text-center sm:text-left space-y-4">
                      <div className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.5em]">Ресурсный потенциал</div>
                      <p className="text-lg text-fg/80 leading-relaxed font-medium max-w-4xl italic">
                        Интеллектуальная система Gemini AI функционирует на выделенных Tier-1 мощностях Google Cloud. Платный уровень доступа минимизирует задержки и исключает ошибки квот, гарантируя стабильную работу для каждого пользователя даже в моменты пиковой вовлеченности.
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
                    
                      {/* History and Achievements are now visible to all */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {stats.achievements.map((achievement) => {
                          return (
                            <div 
                              key={achievement.id} 
                              className={cn(
                                "sber-card !p-6 flex flex-col items-center text-center gap-3 transition-all relative overflow-hidden",
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
                                <div className="text-[11px] font-bold text-fg tracking-tight leading-tight">
                                  {achievement.title}
                                </div>
                                <div className="text-[9px] text-muted font-medium leading-tight">
                                  {achievement.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-20 pb-32"
            >
              <div className="flex flex-col lg:flex-row gap-12 items-start">
                <div className="lg:w-1/2 space-y-8 sticky top-24">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-[0.3em] mb-4"
                  >
                    Академия общения
                  </motion.div>
                  <h2 className="text-5xl sm:text-7xl font-serif text-fg tracking-tight leading-[1.05]">
                    Готовность к <br/>
                    <span className="text-accent italic">диалогу</span>
                  </h2>
                  <p className="text-xl text-muted font-medium leading-relaxed max-w-md">
                    Практикуйте искусство свидетельства и защиты веры в современных реалиях.
                  </p>
                  
                  <div className="pt-8 flex flex-wrap gap-8">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-fg tracking-tight">{SCENARIOS.length}</div>
                      <div className="text-[9px] font-bold text-muted uppercase tracking-[0.2em]">Сценариев</div>
                    </div>
                    <div className="w-[1px] h-12 bg-border/40" />
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-fg tracking-tight">AI</div>
                      <div className="text-[9px] font-bold text-muted uppercase tracking-[0.2em]">Обратная связь</div>
                    </div>
                    {isUserAdmin && (
                      <>
                        <div className="w-[1px] h-12 bg-border/40" />
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-fg tracking-tight">{systemStats.users}</div>
                          <div className="text-[9px] font-bold text-muted uppercase tracking-[0.2em]">Участников</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="lg:w-1/2 space-y-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "p-10 sm:p-12 relative overflow-hidden group shadow-2xl rounded-[2.5rem] border transition-all duration-500",
                      theme === 'light'
                        ? "bg-card border-accent/20 text-fg shadow-accent/5"
                        : theme === 'vibrant' 
                          ? "bg-gradient-to-br from-[#DB2777] via-[#9333EA] to-[#4C1D95] shadow-pink-500/20 text-white border-none" 
                          : "bg-accent shadow-accent/30 text-white border-none"
                    )}
                  >
                    <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                      <Sparkles className="w-32 h-32 text-white" />
                    </div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className={cn("w-8 h-[1px]", theme === 'light' ? "bg-accent/30" : "bg-white/40")} />
                       <div className={cn("text-[10px] font-black uppercase tracking-[0.4em]", theme === 'light' ? "text-accent/60" : "text-white/70")}>Ежедневное вдохновение</div>
                    </div>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className={cn(
                        "text-2xl sm:text-3xl font-serif italic leading-snug tracking-tight mb-4",
                        theme === 'light' ? "text-fg" : "text-white"
                      )}
                    >
                      {dailyFact}
                    </motion.p>
                  </motion.div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                      <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] whitespace-nowrap">
                        Свободный диалог
                      </h3>
                      <div className="flex-1 h-[1px] bg-border/40" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                    {SCENARIOS.filter(s => s.mode === 'chat').map((scenario) => {
                      const isExpanded = expandedScenarioId === scenario.id;
                      return (
                        <div key={scenario.id} className="glass-panel !p-0 overflow-hidden border-border/50 group hover:shadow-xl transition-all duration-500">
                            <button
                              onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.id)}
                              className="w-full flex items-center justify-between p-8 hover:bg-accent/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-6">
                                <div className={cn(
                                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border overflow-hidden",
                                  isExpanded ? "bg-accent text-white border-accent/20 rotate-12 scale-110" : "bg-bg text-accent border-accent/10 group-hover:scale-105"
                                )}>
                                  {scenario.avatarUrl ? (
                                    <AvatarImage src={scenario.avatarUrl} alt={scenario.title} fallback={ScenarioIcons[scenario.icon as string]} />
                                  ) : (
                                    ScenarioIcons[scenario.icon as string]
                                  )}
                                </div>
                                <div>
                                  <h3 className={cn(
                                    "text-2xl font-serif tracking-tight transition-colors duration-500",
                                    isExpanded ? "text-accent" : "text-fg"
                                  )}>
                                    {scenario.title}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1 opacity-40">
                                    <div className="h-[1px] w-3 bg-muted" />
                                    <span className="text-[8px] font-bold text-muted uppercase tracking-[0.2em]">Диалоговый режим</span>
                                  </div>
                                </div>
                              </div>
                              <div className={cn("transition-transform duration-500", isExpanded ? "rotate-180 text-accent" : "text-muted opacity-40")}>
                                <ChevronDown className="w-6 h-6" />
                              </div>
                            </button>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                >
                                  <div className="px-8 pb-10 pt-2 space-y-10">
                                    <div className="pl-0 sm:pl-20 border-l-2 border-accent/10">
                                      <p className="text-muted text-lg leading-relaxed font-medium pl-6 italic mb-10">
                                        {scenario.description}
                                      </p>
                                      <button 
                                        onClick={() => startScenario(scenario)}
                                        className="sber-button py-5 px-12 text-[11px] flex items-center gap-4 group"
                                      >
                                        Начать диалог 
                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-2 transition-transform">
                                          <ChevronRight className="w-4 h-4" />
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                      );
                    })}
                  </div>
                </div>
              </div>

                <section className="space-y-12">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-accent rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-accent/20 rotate-6 shrink-0 border border-white/20">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-6 h-[1px] bg-accent/40" />
                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">
                          Апологетика
                        </h3>
                      </div>
                      <h2 className="text-4xl font-serif text-fg tracking-tight">Работа с критикой</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {SCENARIOS.filter(s => s.mode === 'criticism').map((scenario) => {
                      const isExpanded = expandedScenarioId === scenario.id;
                      return (
                        <div 
                          key={scenario.id} 
                          className={cn(
                            "glass-panel !p-0 overflow-hidden border-border/50 group transition-all duration-700 hover:shadow-2xl",
                            isExpanded ? "ring-2 ring-accent/20" : "hover:border-accent/30"
                          )}
                        >
                          <button
                            onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.id)}
                            className="w-full flex items-center justify-between p-10 sm:p-12 hover:bg-accent/5 transition-all text-left"
                          >
                            <div className="flex items-center gap-10">
                              <div className={cn(
                                "w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-700 border shadow-inner overflow-hidden",
                                isExpanded ? "bg-accent text-white border-accent/20 scale-110 -rotate-6" : "bg-bg text-accent border-accent/10 group-hover:scale-105"
                              )}>
                                {scenario.avatarUrl ? (
                                  <AvatarImage src={scenario.avatarUrl} alt={scenario.title} fallback={ScenarioIcons[scenario.icon as string]} />
                                ) : (
                                  ScenarioIcons[scenario.icon as string]
                                )}
                              </div>
                              <div className="space-y-3">
                                <h3 className={cn(
                                  "text-3xl font-serif tracking-tight transition-colors duration-500",
                                  isExpanded ? "text-accent" : "text-fg"
                                )}>
                                  {scenario.title}
                                </h3>
                                <div className="flex items-center gap-2 opacity-40">
                                  <div className="h-[1px] w-4 bg-muted" />
                                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Аналитическая сессия</p>
                                </div>
                              </div>
                            </div>
                            <div className={cn("transition-transform duration-700 p-4 rounded-full bg-accent/5", isExpanded ? "rotate-180 bg-accent text-white scale-110" : "text-muted opacity-30")}>
                              <ChevronDown className="w-8 h-8" />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <div className="px-10 sm:px-12 pb-12 pt-6 border-t border-border/40">
                                  <div className="pl-0 sm:pl-32 space-y-12">
                                    <div className="space-y-6 relative">
                                      <div className="absolute -left-16 top-0 bottom-0 w-[2px] bg-gradient-to-b from-accent/50 via-accent/5 to-transparent hidden sm:block" />
                                      <p className="text-muted text-2xl leading-relaxed italic font-medium pl-4">
                                        {scenario.description}
                                      </p>
                                    </div>
                                    <div className="flex items-center">
                                      <button 
                                        onClick={() => startScenario(scenario)}
                                        className="sber-button py-6 px-16 text-sm flex items-center justify-between gap-6 group"
                                      >
                                        Начать анализ 
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-3 transition-transform">
                                          <ChevronRight className="w-5 h-5" />
                                        </div>
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
                    <div className={cn("space-y-4")}>
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
                  <div className={cn(
                    "bg-bg p-6 rounded-2xl border border-border transition-all duration-500"
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
                      addNotification("Результат скопирован! Теперь вы можете отправить его наставнику.", 'success');
                    }}
                    className={cn(
                      "flex-1 px-8 font-bold rounded-xl transition-all uppercase tracking-[0.1em] text-[10px] py-4 flex items-center justify-center gap-2 bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-white"
                    )}
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
                  <div className="w-10 h-10 sm:w-14 h-14 bg-accent/10 text-accent rounded-xl sm:rounded-2xl flex items-center justify-center border border-accent/20 shrink-0 overflow-hidden">
                    {selectedScenario.avatarUrl ? (
                      <AvatarImage src={selectedScenario.avatarUrl} alt={selectedScenario.title} fallback={<User className="w-5 h-5 sm:w-7 sm:h-7" />} />
                    ) : (
                      <User className="w-5 h-5 sm:w-7 sm:h-7" />
                    )}
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
                    return (
                      <motion.div 
                        key={article.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="sber-card relative group p-10 flex flex-col h-full bg-card/50 backdrop-blur-sm cursor-pointer overflow-hidden"
                        onClick={() => {
                          setSelectedArticle(article);
                        }}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] bg-accent/5 px-3 py-1 rounded-lg border border-accent/10">{article.category}</div>
                        </div>
                        <h3 className="text-2xl font-semibold text-fg mb-6 tracking-tight leading-tight">{article.title}</h3>
                        <p className="text-muted text-sm leading-relaxed font-medium opacity-90 flex-grow line-clamp-3">{article.description}</p>
                        <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
                          <span className="text-[9px] font-bold text-muted uppercase tracking-widest">5 мин чтения</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedArticle(article);
                            }}
                            className="text-accent font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all"
                          >
                            Читать полностью <ArrowRight className="w-3 h-3" />
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
              </div>

              <div className="pt-8 border-t border-border mt-8 space-y-4">
                <div className="px-1 mb-4">
                  <div className="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-accent" />
                    Тема оформления
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn("p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all", theme === 'light' ? "bg-accent/10 border-accent text-accent" : "bg-bg border-border text-muted hover:border-accent/30")}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Свет</span>
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn("p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all", theme === 'dark' ? "bg-accent/10 border-accent text-accent" : "bg-bg border-border text-muted hover:border-accent/30")}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Тьма</span>
                    </button>
                    <button 
                      onClick={() => setTheme('vibrant')}
                      className={cn("p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all", theme === 'vibrant' ? "bg-accent/10 border-accent text-accent" : "bg-bg border-border text-muted hover:border-accent/30")}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Яркая</span>
                    </button>
                  </div>
                </div>

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

      {/* Subscription and Payment modals removed for now */}
      
      {/* PWA Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <div className="fixed bottom-0 left-0 w-full z-[250] p-4 pointer-events-none">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="max-w-md mx-auto sber-card p-6 shadow-2xl pointer-events-auto border-t-4 border-t-accent"
            >
              <div className="flex gap-5">
                <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-base font-bold text-fg tracking-tight">Установите приложение</h4>
                  <p className="text-muted text-xs leading-relaxed">
                    Добавьте "Вера +1" на главный экран, чтобы убрать адресную строку и пользоваться тренажёром как обычным приложением.
                  </p>
                  <div className="pt-2 flex flex-col gap-3">
                    {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                      <div className="p-3 bg-accent/5 rounded-xl border border-accent/10">
                        <p className="text-[10px] text-accent font-bold uppercase tracking-wider mb-2">Для iPhone/iPad:</p>
                        <ol className="text-[11px] text-muted space-y-1">
                          <li>1. Нажмите на кнопку «Поделиться» <span className="inline-block p-1 bg-white border border-border rounded text-[14px]">⎋</span> в браузере.</li>
                          <li>2. Прокрутите вниз и выберите «На экран „Домой“».</li>
                        </ol>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted italic">Нажмите на три точки в браузере и выберите «Установить приложение».</p>
                    )}
                    <button 
                      onClick={closeInstallPrompt}
                      className="w-full py-3 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-accent/20 transition-all"
                    >
                      Понятно
                    </button>
                  </div>
                </div>
                <button onClick={closeInstallPrompt} className="p-2 text-muted hover:text-fg h-fit">
                  <X className="w-5 h-5" />
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
