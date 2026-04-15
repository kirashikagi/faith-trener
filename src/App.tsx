import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, Timestamp, collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { SCENARIOS, ACHIEVEMENTS, LIBRARY_ARTICLES, BIBLICAL_FACTS } from './constants';
import { Scenario, UserProfile, UserStats, Message, ResponseOption, Feedback, SessionRecord, FeedbackSubmission } from './types';
import { getChatResponse, getFeedback, getResponseOptions, getInitialMessage } from './services/gemini';
import { handleFirestoreError, OperationType } from './lib/firebase-utils';

// Components
import { Splash } from './components/Splash';
import { Navigation } from './components/Navigation';
import { Home } from './components/Home';
import { Chat } from './components/Chat';
import { Library } from './components/Library';
import { Profile } from './components/Profile';
import { Auth } from './components/Auth';
import { Admin } from './components/Admin';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { SubscriptionModal } from './components/SubscriptionModal';
import { IntroModal } from './components/IntroModal';
import ErrorBoundary from './components/ErrorBoundary';

// Hooks
import { usePWA } from './hooks/usePWA';

type View = 'home' | 'chat' | 'library' | 'profile' | 'admin';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  // App State
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  
  // PWA & Modals
  const { isStandalone, showInstallPrompt, setShowInstallPrompt, installApp } = usePWA();
  const [showSubscription, setShowSubscription] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Chat State
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ResponseOption[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Stats & Admin
  const [stats, setStats] = useState<UserStats>({
    totalSessions: 0,
    averageScore: 0,
    achievements: ACHIEVEMENTS,
    roleStats: {}
  });
  const [adminFeedback, setAdminFeedback] = useState<FeedbackSubmission[]>([]);
  const [systemStats, setSystemStats] = useState({ users: 0, feedback: 0 });

  // Daily Fact
  const dailyFact = useMemo(() => {
    const day = new Date().getDate();
    return BIBLICAL_FACTS[(day - 1) % BIBLICAL_FACTS.length];
  }, []);

  // Auth Listener
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener if it exists
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        // Profile Listener
        profileUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);
            
            // Show intro if never seen
            if (!profile.hasSeenWelcome) {
              setShowIntro(true);
            }
          } else {
            // Create initial profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: (firebaseUser.email === 'arunavsharmanaba@gmail.com' || firebaseUser.email === 'admin@vera.plus') ? 'admin' : 'user',
              createdAt: Date.now(),
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              hasSeenWelcome: false,
              streak: 1,
              lastVisit: Date.now(),
              purchasedArticles: [],
              achievements: ACHIEVEMENTS
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          }
        });
      } else {
        setUser(null);
        setUserProfile(null);
      }
      
      setIsAuthLoading(false);
      // Artificial delay for splash screen to ensure smooth transition
      setTimeout(() => setIsAppLoading(false), 1500);
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  // Fetch Admin Data
  useEffect(() => {
    if (view === 'admin' && userProfile?.role === 'admin') {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAdminFeedback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeedbackSubmission[]);
      });
      
      getDocs(collection(db, 'users')).then(snap => {
        setSystemStats(prev => ({ ...prev, users: snap.size }));
      });

      return () => unsubscribe();
    }
  }, [view, userProfile]);

  // Auth Handlers
  const handleAuth = async (email: string, pass: string, mode: 'login' | 'register') => {
    setAuthError('');
    const internalEmail = email.includes('@') ? email : `${email.trim().toLowerCase()}@vera.plus`;
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, internalEmail, pass);
      } else {
        await createUserWithEmailAndPassword(auth, internalEmail, pass);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  // Chat Handlers
  const handleStartScenario = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setView('chat');
    setIsLoading(true);
    setMessages([]);
    
    try {
      const initialText = await getInitialMessage(scenario.systemInstruction);
      const initialMsg: Message = { role: 'model', text: initialText, timestamp: Date.now() };
      setMessages([initialMsg]);
      
      if (scenario.mode === 'criticism') {
        const initialOptions = await getResponseOptions(scenario.systemInstruction, [initialMsg]);
        setOptions(initialOptions);
      }
    } catch (err) {
      console.error(err);
      setMessages([{ role: 'model', text: scenario.initialMessage, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedScenario) return;
    
    const userMsg: Message = { role: 'user', text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setOptions([]);

    try {
      const aiResponse = await getChatResponse(
        'gemini-1.5-flash',
        selectedScenario.systemInstruction,
        newMessages,
        text
      );
      
      const aiMsg: Message = { role: 'model', text: aiResponse, timestamp: Date.now() };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      if (selectedScenario.mode === 'criticism') {
        const nextOptions = await getResponseOptions(selectedScenario.systemInstruction, finalMessages);
        setOptions(nextOptions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (id: string) => {
    if (!userProfile) return;
    setIsProcessingPayment(true);
    // Simulate payment
    setTimeout(async () => {
      const purchased = [...(userProfile.purchasedArticles || []), id];
      await updateDoc(doc(db, 'users', userProfile.uid), { purchasedArticles: purchased });
      setIsProcessingPayment(false);
    }, 1500);
  };

  const handleSubscribe = async () => {
    if (!userProfile) return;
    setIsProcessingPayment(true);
    // Simulate payment
    setTimeout(async () => {
      await updateDoc(doc(db, 'users', userProfile.uid), { isSubscribed: true });
      setIsProcessingPayment(false);
      setShowSubscription(false);
    }, 1500);
  };

  const handleCloseIntro = async () => {
    setShowIntro(false);
    if (userProfile) {
      await updateDoc(doc(db, 'users', userProfile.uid), { hasSeenWelcome: true });
    }
  };

  if (isAppLoading || isAuthLoading) return <Splash />;

  if (!user) return <Auth onAuth={handleAuth} error={authError} />;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <Home scenarios={SCENARIOS} onSelectScenario={handleStartScenario} dailyFact={dailyFact} />
            </motion.div>
          )}
          {view === 'chat' && selectedScenario && (
            <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
              <Chat 
                scenario={selectedScenario} 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                onBack={() => setView('home')} 
                isLoading={isLoading}
                options={options}
                feedback={feedback}
                isAnalyzing={isAnalyzing}
              />
            </motion.div>
          )}
          {view === 'library' && (
            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <Library 
                articles={LIBRARY_ARTICLES} 
                purchasedArticles={userProfile?.purchasedArticles || []} 
                isSubscribed={!!userProfile?.isSubscribed} 
                onPurchase={handlePurchase} 
              />
            </motion.div>
          )}
          {view === 'profile' && userProfile && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <Profile 
                profile={userProfile} 
                stats={stats} 
                onLogout={handleLogout} 
                onShowSubscription={() => setShowSubscription(true)} 
              />
            </motion.div>
          )}
          {view === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <Admin feedback={adminFeedback} stats={systemStats} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {view !== 'chat' && (
        <Navigation 
          activeTab={view} 
          onTabChange={setView} 
          isAdmin={userProfile?.role === 'admin'} 
        />
      )}

      <PWAInstallPrompt 
        show={showInstallPrompt} 
        onClose={() => setShowInstallPrompt(false)} 
        onInstall={installApp} 
      />

      <SubscriptionModal 
        show={showSubscription} 
        onClose={() => setShowSubscription(false)} 
        onSubscribe={handleSubscribe}
        isLoading={isProcessingPayment}
      />

      <IntroModal 
        show={showIntro} 
        onClose={handleCloseIntro} 
      />
    </div>
  );
}
