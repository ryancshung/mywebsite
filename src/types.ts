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
  lastResult?: string;     // 最後一次評價結果 (again, hard, good, easy)
  lastReviewedAt?: number; // 最後複習時間戳
}

export interface AppData {
  userId: string | null;  // 使用者唯一 ID (UserID / Email)
  decks: Deck[];
  cards: Card[];
}

export type View =
  | { type: 'login' }
  | { type: 'home' }
  | { type: 'deck'; deckId: string }
  | { type: 'quizConfig'; deckId: string }
  | { type: 'weaknessConfig'; deckId: string }
  | { type: 'quiz'; deckId: string; cards: Card[]; mode: 'normal' | 'weakness' };
