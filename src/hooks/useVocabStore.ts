import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import type { Deck, Card, AppData } from '../types';

const STORAGE_KEY = 'vocab_app_data';
const CLOUD_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { userId: null, decks: [], cards: [] };
    const parsed = JSON.parse(raw);
    return { 
      userId: parsed.userId || null, 
      decks: parsed.decks || [], 
      cards: parsed.cards || [] 
    };
  } catch {
    return { userId: null, decks: [], cards: [] };
  }
}

function saveLocal(data: AppData) {
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
  const [data, setData] = useState<AppData>(loadLocal);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const commit = useCallback((next: AppData) => {
    saveLocal(next);
    setData(next);
  }, []);

  // ── Cloud Sync ────────────────────────────────────────
  const syncToCloud = useCallback(async (currentData: AppData) => {
    if (!currentData.userId || !CLOUD_URL) return;
    setSyncing(true);
    try {
      // NOTE: GAS requires 'no-cors' for POST from browser often, or handled via Redir
      // But we use it to 'push' data.
      await fetch(CLOUD_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all',
          userId: currentData.userId,
          payload: { decks: currentData.decks, cards: currentData.cards }
        })
      });
      setLastSyncStatus('success');
    } catch (e) {
      console.error('Cloud sync failed', e);
      setLastSyncStatus('error');
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  }, []);

  const fetchFromCloud = useCallback(async (userId: string) => {
    if (!CLOUD_URL) return;
    setSyncing(true);
    try {
      const res = await fetch(`${CLOUD_URL}?userId=${userId}&action=get_data`);
      const cloudData = await res.json();
      if (cloudData.success) {
        const next = { userId, decks: cloudData.decks || [], cards: cloudData.cards || [] };
        commit(next);
        setLastSyncStatus('success');
      }
    } catch (e) {
      console.error('Cloud fetch failed', e);
      setLastSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  }, [commit]);

  const login = useCallback((userId: string) => {
    const next = { ...data, userId: userId.trim() };
    commit(next);
    fetchFromCloud(userId.trim());
  }, [data, commit, fetchFromCloud]);

  const logout = useCallback(() => {
    const next = { userId: null, decks: [], cards: [] };
    commit(next);
    setLastSyncStatus('idle');
  }, [commit]);

  // ── Deck CRUD ────────────────────────────────────────
  const createDeck = useCallback((name: string) => {
    const deck: Deck = { id: uid(), name: name.trim(), createdAt: Date.now() };
    const next = { ...data, decks: [...data.decks, deck] };
    commit(next);
    syncToCloud(next);
    return deck;
  }, [data, commit, syncToCloud]);

  const deleteDeck = useCallback((id: string) => {
    const next = {
      ...data,
      decks: data.decks.filter(d => d.id !== id),
      cards: data.cards.filter(c => c.deckId !== id),
    };
    commit(next);
    syncToCloud(next);
  }, [data, commit, syncToCloud]);

  // ── Card CRUD ────────────────────────────────────────
  const addCard = useCallback((deckId: string, word: string, content: string, tag: string) => {
    const card: Card = { 
      id: uid(), deckId, word: word.trim(), content: content.trim(), tag: tag.trim(), 
      createdAt: Date.now(),
      againCount: 0, hardCount: 0 
    };
    const next = { ...data, cards: [...data.cards, card] };
    commit(next);
    syncToCloud(next);
    return card;
  }, [data, commit, syncToCloud]);

  const updateCard = useCallback((id: string, word: string, content: string, tag: string) => {
    const next = {
      ...data,
      cards: data.cards.map(c => c.id === id ? { ...c, word: word.trim(), content: content.trim(), tag: tag.trim() } : c)
    };
    commit(next);
    syncToCloud(next);
  }, [data, commit, syncToCloud]);

  const updateCardStats = useCallback((id: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
    const next = {
      ...data,
      cards: data.cards.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          againCount: c.againCount + (rating === 'again' ? 1 : 0),
          hardCount: c.hardCount + (rating === 'hard' ? 1 : 0),
          lastResult: rating,
          lastReviewedAt: Date.now(),
        };
      }),
    };
    commit(next);
    syncToCloud(next);
  }, [data, commit, syncToCloud]);

  const deleteCard = useCallback((id: string) => {
    const next = { ...data, cards: data.cards.filter(c => c.id !== id) };
    commit(next);
    syncToCloud(next);
  }, [data, commit, syncToCloud]);

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
          complete: async (result) => {
            const rows = result.data as Record<string, string>[];
            const newCards: Card[] = rows
              .map(r => ({
                id: uid(),
                deckId,
                word: (r['單字 (Word)'] ?? r['Word'] ?? r['word'] ?? Object.values(r)[0] ?? '').toString().trim(),
                content: (r['內容 (Content)'] ?? r['Content'] ?? r['content'] ?? Object.values(r)[1] ?? '').toString().trim(),
                tag: (r['標籤 (Tag)'] ?? r['Tag'] ?? r['tag'] ?? Object.values(r)[2] ?? '').toString().trim(),
                createdAt: Date.now(),
                againCount: 0,
                hardCount: 0
              }))
              .filter(c => c.word && c.word !== 'undefined');

            if (newCards.length > 0) {
              const next = { ...data, cards: [...data.cards, ...newCards] };
              commit(next);
              await syncToCloud(next);
              resolve(newCards.length);
            } else {
              resolve(0);
            }
          },
          error: (err: any) => reject(err),
        });
      };
      reader.onerror = () => reject(new Error('讀取失敗'));
      reader.readAsText(file, 'UTF-8');
    });
  }, [data, commit, syncToCloud]);

  // ── JSON Export / Import ──────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-backup-${data.userId || 'local'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importJSON = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!Array.isArray(parsed.decks) || !Array.isArray(parsed.cards)) throw new Error('Invalid JSON');
          
          // 保留原本的 UserId，除非匯入的檔案有指定的 UserId
          const nextData = {
            userId: parsed.userId || data.userId,
            decks: parsed.decks,
            cards: parsed.cards.map((c: any) => ({
              ...c,
              againCount: c.againCount || 0,
              hardCount: c.hardCount || 0
            }))
          };
          commit(nextData);
          await syncToCloud(nextData);
          resolve();
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, [commit, data.userId, syncToCloud]);

  return {
    data, syncing, lastSyncStatus,
    login, logout,
    createDeck, deleteDeck,
    addCard, updateCard, updateCardStats, deleteCard, cardsInDeck,
    exportJSON, importJSON, importCSV
  };
}
