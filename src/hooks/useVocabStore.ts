import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import type { Deck, Card, AppData } from '../types';

const STORAGE_KEY = 'vocab_app_data';

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { decks: [], cards: [] };
    return JSON.parse(raw) as AppData;
  } catch {
    return { decks: [], cards: [] };
  }
}

function save(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e: any) {
    console.error('localStorage write failed', e);
  }
}

function uid() {
  return crypto.randomUUID();
}

export function useVocabStore() {
  const [data, setData] = useState<AppData>(load);

  const commit = useCallback((next: AppData) => {
    save(next);
    setData(next);
  }, []);

  // ── Deck CRUD ────────────────────────────────────────
  const createDeck = useCallback((name: string) => {
    const deck: Deck = { id: uid(), name: name.trim(), createdAt: Date.now() };
    commit({ ...data, decks: [...data.decks, deck] });
    return deck;
  }, [data, commit]);

  const renameDeck = useCallback((id: string, name: string) => {
    commit({
      ...data,
      decks: data.decks.map(d => d.id === id ? { ...d, name: name.trim() } : d),
    });
  }, [data, commit]);

  const deleteDeck = useCallback((id: string) => {
    commit({
      decks: data.decks.filter(d => d.id !== id),
      cards: data.cards.filter(c => c.deckId !== id),
    });
  }, [data, commit]);

  // ── Card CRUD ────────────────────────────────────────
  const addCard = useCallback((deckId: string, word: string, content: string, tag: string) => {
    const card: Card = { id: uid(), deckId, word: word.trim(), content: content.trim(), tag: tag.trim(), createdAt: Date.now() };
    commit({ ...data, cards: [...data.cards, card] });
    return card;
  }, [data, commit]);

  const updateCard = useCallback((id: string, word: string, content: string, tag: string) => {
    commit({
      ...data,
      cards: data.cards.map(c => c.id === id ? { ...c, word: word.trim(), content: content.trim(), tag: tag.trim() } : c),
    });
  }, [data, commit]);

  const deleteCard = useCallback((id: string) => {
    commit({ ...data, cards: data.cards.filter(c => c.id !== id) });
  }, [data, commit]);

  const cardsInDeck = useCallback((deckId: string) => {
    return data.cards.filter(c => c.deckId === deckId);
  }, [data]);

  // ── CSV Import ────────────────────────────────────────
  const importCSV = useCallback((deckId: string, file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (h) => h.trim(),
          complete: (result) => {
            const rows = result.data as Record<string, string>[];
            const newCards: Card[] = rows
              .map(r => ({
                id: uid(),
                deckId,
                word: (r['單字 (Word)'] ?? r['Word'] ?? r['word'] ?? Object.values(r)[0] ?? '').toString().trim(),
                content: (r['內容 (Content)'] ?? r['Content'] ?? r['content'] ?? Object.values(r)[1] ?? '').toString().trim(),
                tag: (r['標籤 (Tag)'] ?? r['Tag'] ?? r['tag'] ?? Object.values(r)[2] ?? '').toString().trim(),
                createdAt: Date.now(),
              }))
              .filter(c => c.word && c.word !== 'undefined');

            if (newCards.length > 0) {
              setData(current => {
                const next = { ...current, cards: [...current.cards, ...newCards] };
                save(next);
                return next;
              });
              resolve(newCards.length);
            } else {
              resolve(0);
            }
          },
          error: (err: any) => reject(err),
        });
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsText(file, 'UTF-8');
    });
  }, [uid]);

  // ── JSON Export / Import ──────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importJSON = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as AppData;
          if (!Array.isArray(parsed.decks) || !Array.isArray(parsed.cards)) throw new Error('Invalid format');
          commit(parsed);
          resolve();
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, [commit]);

  return {
    data,
    createDeck, renameDeck, deleteDeck,
    addCard, updateCard, deleteCard, cardsInDeck,
    importCSV, exportJSON, importJSON,
  };
}
