// Data structures for the app
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
}

export interface AppData {
  decks: Deck[];
  cards: Card[];
}

export type View =
  | { type: 'home' }
  | { type: 'deck'; deckId: string }
  | { type: 'quizConfig'; deckId: string }
  | { type: 'quiz'; deckId: string; cards: Card[] };
