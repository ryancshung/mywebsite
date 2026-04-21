export interface Deck {
  id: string;
  name: string;
  createdAt: number;
}

export interface Card {
  id: string;
  deckId: string;
  word: string;    // 正面題目
  content: string; // 背面答案
  tag: string;     // 標籤
  createdAt: number;
  againCount: number;      // "再次 (Again)" 點擊次數
  hardCount: number;       // "困難 (Hard)" 點擊次數
  lastResult?: 'again' | 'hard' | 'good' | 'easy';
  lastReviewedAt?: number; // 最後複習時間戳
  interval?: number;       // 複習間隔 (天)
  ease?: number;           // 熟悉度係數 (E-Factor)
  dueAt?: number;          // 下次複習時間戳
}

export interface AppSettings {
  autoSpeakFront: boolean;
  autoSpeakBack: boolean;
}

export interface AppData {
  userId: string | null;
  decks: Deck[];
  cards: Card[];
  settings?: AppSettings;
}

export type View =
  | { type: 'login' }
  | { type: 'home' }
  | { type: 'deck'; deckId: string }
  | { type: 'quizConfig'; deckId: string }
  | { type: 'weaknessConfig'; deckId: string }
  | { type: 'quiz'; deckId: string; cards: Card[]; mode: 'normal' | 'weakness' | 'random' };
