import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import type { Deck, Card, AppData, AppSettings } from '../types';

const STORAGE_KEY = 'vocab_app_data';
const CLOUD_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

const DEFAULT_SETTINGS: AppSettings = {
  autoSpeakFront: true,
  autoSpeakBack: true,
};

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { userId: null, decks: [], cards: [], settings: DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { 
      userId: parsed.userId || null, 
      decks: parsed.decks || [], 
      cards: parsed.cards || [],
      settings: parsed.settings || DEFAULT_SETTINGS
    };
  } catch {
    return { userId: null, decks: [], cards: [], settings: DEFAULT_SETTINGS };
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

  const updateSettings = useCallback((settings: AppSettings) => {
    const next = { ...data, settings };
    commit(next);
    syncToCloud(next);
  }, [data, commit]);

  // ── Cloud Sync ────────────────────────────────────────
  const syncToCloud = useCallback(async (currentData: AppData) => {
    if (!currentData.userId || !CLOUD_URL) return;
    setSyncing(true);
    try {
      await fetch(CLOUD_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all',
          userId: currentData.userId,
          payload: { decks: currentData.decks, cards: currentData.cards, settings: currentData.settings }
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
        const next = { 
          userId, 
          decks: cloudData.decks || [], 
          cards: cloudData.cards || [],
          settings: cloudData.settings || DEFAULT_SETTINGS
        };
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
    const next = { userId: null, decks: [], cards: [], settings: DEFAULT_SETTINGS };
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
      againCount: 0, hardCount: 0,
      ease: 2.5, interval: 0
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
        
        let newEase = c.ease || 2.5;
        let newInterval = c.interval || 0;
        
        // Simple SM-2 like logic
        if (rating === 'again') {
          newEase = Math.max(1.3, newEase - 0.2);
          newInterval = 0;
        } else if (rating === 'hard') {
          newEase = Math.max(1.3, newEase - 0.15);
          newInterval = newInterval === 0 ? 1 : Math.ceil(newInterval * 1.2);
        } else if (rating === 'good') {
          newInterval = newInterval === 0 ? 1 : (newInterval === 1 ? 6 : Math.ceil(newInterval * newEase));
        } else if (rating === 'easy') {
          newEase += 0.15;
          newInterval = newInterval === 0 ? 4 : (newInterval === 1 ? 7 : Math.ceil(newInterval * newEase * 1.3));
        }

        const dueAt = Date.now() + (newInterval * 24 * 60 * 60 * 1000);

        return {
          ...c,
          againCount: c.againCount + (rating === 'again' ? 1 : 0),
          hardCount: c.hardCount + (rating === 'hard' ? 1 : 0),
          lastResult: rating,
          lastReviewedAt: Date.now(),
          ease: newEase,
          interval: newInterval,
          dueAt
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
                hardCount: 0,
                ease: 2.5,
                interval: 0
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
          
          const nextData = {
            userId: parsed.userId || data.userId,
            decks: parsed.decks,
            cards: parsed.cards.map((c: any) => ({
              ...c,
              againCount: c.againCount || 0,
              hardCount: c.hardCount || 0,
              ease: c.ease || 2.5,
              interval: c.interval || 0,
              dueAt: c.dueAt || 0
            })),
            settings: parsed.settings || data.settings || DEFAULT_SETTINGS
          };
          commit(nextData);
          await syncToCloud(nextData);
          resolve();
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, [commit, data.userId, data.settings, syncToCloud]);

  return {
    data, syncing, lastSyncStatus,
    login, logout,
    createDeck, deleteDeck,
    addCard, updateCard, updateCardStats, deleteCard, cardsInDeck,
    exportJSON, importJSON, importCSV, updateSettings
  };
}
