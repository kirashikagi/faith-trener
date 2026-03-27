export type Role = 'skeptic' | 'seeker' | 'atheist' | 'crisis' | 'youth' | 'critic';

export type Mode = 'chat' | 'criticism';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  systemInstruction: string;
  initialMessage: string;
  mode: Mode;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  explanation?: string; // For criticism mode
}

export interface ResponseOption {
  text: string;
  explanation: string;
  type: 'effective' | 'neutral' | 'ineffective';
  metrics: {
    theologicalAccuracy: number;
    logic: number;
    empathy: number;
    scriptureUsage: number;
  };
}

export interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  metrics?: {
    theologicalAccuracy: number;
    logic: number;
    scriptureUsage: number;
    empathy: number;
    speed: number;
  };
  isUnlocked?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface UserStats {
  totalSessions: number;
  averageScore: number;
  achievements: Achievement[];
  roleStats: Record<string, {
    sessions: number;
    bestScore: number;
  }>;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin';
  createdAt: number;
  isSubscribed?: boolean;
  subscriptionExpiresAt?: number;
}

export interface FeedbackSubmission {
  id: string;
  uid: string;
  email?: string;
  message: string;
  type: 'general' | 'ai_feedback';
  createdAt: number;
}

export interface LibraryArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  isPremium: boolean;
}

export interface SessionRecord {
  id: string;
  uid: string;
  scenarioId: string;
  score: number;
  detailedAnalysis: string;
  isUnlocked: boolean;
  createdAt: number;
}
