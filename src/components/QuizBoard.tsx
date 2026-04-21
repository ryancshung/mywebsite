import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Volume2, TrendingDown } from 'lucide-react';
import type { Card, Deck, View, AppSettings } from '../types';

interface Props {
  deck: Deck;
  cards: Card[];
  mode: 'normal' | 'weakness' | 'random';
  settings?: AppSettings;
  updateStats: (id: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
  navigate: (v: View) => void;
}

// ── TTS Logic ──────────────────────────────────────────
let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  voices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices();
  };
}

function speak(text: string) {
  if (!text || !window.speechSynthesis) return;
  
  // 只提取英文部分，避免唸到中文註解
  const englishMatches = text.match(/[a-zA-Z][a-zA-Z\s.,!?'";:-]*/g);
  const cleanText = englishMatches ? englishMatches.join(' ').trim() : '';
  if (!cleanText || cleanText.length < 2) return;

  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(cleanText);
  
  // 優先選擇高品質英文語音
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  let bestVoice = englishVoices.find(v => v.name.includes('Aria') && v.name.includes('Online'));
  if (!bestVoice) bestVoice = englishVoices.find(v => v.name.includes('Google US English'));
  if (!bestVoice) bestVoice = englishVoices.find(v => v.name.includes('Samantha'));
  if (!bestVoice) bestVoice = englishVoices[0];
  
  if (bestVoice) {
    utt.voice = bestVoice;
    utt.lang = bestVoice.lang;
  } else {
    utt.lang = 'en-US';
  }
  
  utt.rate = 0.95;
  window.speechSynthesis.speak(utt);
}

export function QuizBoard({ deck, cards, mode, settings, updateStats, navigate }: Props) {
  const STORAGE_KEY = `quiz_progress_${deck.id}`;
  const [sessionErrors, setSessionErrors] = useState<Record<string, number>>({});
  const initialCount = useRef(cards.length);

  const [quizCards, setQuizCards] = useState<Card[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.quizCards) return parsed.quizCards;
      } catch (e: any) {}
    }
    return cards;
  });

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.stats) return parsed.stats;
      } catch (e: any) {}
    }
    return { again: 0, hard: 0, good: 0, easy: 0 };
  });

  const [flipped, setFlipped] = useState(false);
  const done = quizCards.length === 0;
  const card = quizCards[0];
  
  useEffect(() => {
    if (done) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify({ quizCards, stats }));
  }, [quizCards, stats, done, STORAGE_KEY]);

  const progress = cards.length > 0 ? (cards.length - quizCards.length) / cards.length : 0;
  
  const flip = useCallback(() => {
    setFlipped(true);
    // 背面自動發音
    if (settings?.autoSpeakBack && card) {
      speak(card.content);
    }
  }, [settings?.autoSpeakBack, card]);

  // 正面自動發音
  useEffect(() => {
    if (!flipped && !done && card && settings?.autoSpeakFront) {
      const timer = setTimeout(() => speak(card.word), 400);
      return () => clearTimeout(timer);
    }
  }, [card, flipped, done, settings?.autoSpeakFront]);

  const handleRating = useCallback((rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!card) return;
    updateStats(card.id, rating);
    if (rating === 'again') {
      setSessionErrors(prev => ({ ...prev, [card.id]: (prev[card.id] || 0) + 1 }));
    }
    setStats((s: any) => ({ ...s, [rating]: s[rating] + 1 }));
    setFlipped(false);
    window.speechSynthesis?.cancel();
    
    setTimeout(() => {
      setQuizCards(prev => {
        if (prev.length === 0) return [];
        const [current, ...rest] = prev;
        if (rating === 'easy') return rest;
        
        switch (rating) {
          case 'again': rest.splice(Math.min(1, rest.length), 0, current); break;
          case 'hard': rest.splice(Math.floor(rest.length / 2), 0, current); break;
          case 'good': rest.push(current); break;
        }
        return [...rest];
      });
    }, 150);
  }, [card, updateStats]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === ' ' || e.key === 'Enter') { 
        e.preventDefault(); if (!flipped) flip(); else handleRating('good');
      }
      if (flipped) {
        if (e.key === '1') handleRating('again');
        if (e.key === '2') handleRating('hard');
        if (e.key === '3') handleRating('good');
        if (e.key === '4') handleRating('easy');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [done, flipped, flip, handleRating]);

  const topErrors = Object.entries(sessionErrors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => cards.find(c => c.id === id))
    .filter(Boolean) as Card[];

  if (done) {
    const totalCorrect = stats.good + stats.easy;
    const totalAnswered = stats.again + stats.hard + stats.good + stats.easy;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return (
      <div className="quiz-shell" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 480 }}>
          <div style={{ fontSize: '3rem' }}>{mode === 'weakness' ? '💪' : '🎉'}</div>
          <div>
            <div className="page-title">{mode === 'weakness' ? '強化完成！' : '測驗完成！'}</div>
            <div className="page-subtitle">共複習了 {initialCount.current} 張卡片</div>
          </div>

          <div className="surface" style={{ width: '100%', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>正確率</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent)' }}>{accuracy}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>完成題數</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{initialCount.current}</div>
            </div>
          </div>

          {topErrors.length > 0 && (
            <div className="surface" style={{ width: '100%', padding: '16px 20px', textAlign: 'left', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--danger)', fontWeight: 600 }}>
                <TrendingDown size={18} /> 最需加強的單字
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topErrors.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>{c.word}</span>
                    <span style={{ color: 'var(--text-muted)' }}>遭遇到 {sessionErrors[c.id]} 次 Again</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-row" style={{ marginTop: 8, gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => navigate({ type: 'home' })}>
              <ArrowLeft size={15} /> 回到首頁
            </button>
            <button className="btn btn-primary" onClick={() => navigate(mode === 'weakness' ? { type: 'weaknessConfig', deckId: deck.id } : { type: 'quizConfig', deckId: deck.id })}>
              <RotateCcw size={15} /> 再次練習
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-header">
        <button className="btn-icon" onClick={() => { window.speechSynthesis?.cancel(); navigate({ type: 'home' }); }}>
          <ArrowLeft size={18} />
        </button>
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="quiz-counter" style={{ textAlign: 'right' }}>
          <div>剩餘 {quizCards.length} / 共 {cards.length}</div>
          <div style={{ fontSize: '0.7rem', display: 'flex', gap: 6, marginTop: 4, fontWeight: 500 }}>
            <span style={{ color: 'var(--danger)' }}>{stats.again}</span>
            <span style={{ color: '#F59E0B' }}>{stats.hard}</span>
            <span style={{ color: '#10B981' }}>{stats.good}</span>
            <span style={{ color: '#3B82F6' }}>{stats.easy}</span>
          </div>
        </div>
      </div>
      <div className="card-scene" onClick={flip}>
        <div className={`card-flipper${flipped ? ' flipped' : ''}`}>
          <div className="card-face card-face-front">
            <div className="card-face-label">正面 · 題目</div>
            <div className="card-word">{card.word}</div>
            {card.tag && <span className="tag-badge card-tag">{card.tag}</span>}
            <div className="card-hint" style={{ marginTop: 16 }}>按 Space 翻面</div>
          </div>
          <div className="card-face card-face-back">
            <div className="card-face-label">背面 · 答案</div>
            <div className="card-content">{card.content || <span style={{ color: 'var(--text-muted)' }}>（無內容）</span>}</div>
            {card.tag && <span className="tag-badge card-tag">{card.tag}</span>}
          </div>
        </div>
      </div>
      <div className="tts-row">
        <button className="btn btn-ghost btn-sm" onClick={() => speak(card.word)}><Volume2 size={14} /> 朗讀題目</button>
        {flipped && (
          <button className="btn btn-ghost btn-sm" onClick={() => speak(card.content)}><Volume2 size={14} /> 朗讀例句</button>
        )}
      </div>
      <div className="quiz-controls" style={{ display: 'flex', gap: 12, justifyContent: 'center', width: '100%', maxWidth: 560 }}>
        {!flipped ? (
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={flip}>顯示答案 (Space)</button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%' }}>
            <button className="btn" onClick={() => handleRating('again')} style={{ flexDirection: 'column', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>1</span><div>Again</div>
            </button>
            <button className="btn" onClick={() => handleRating('hard')} style={{ flexDirection: 'column', border: '1px solid #F59E0B', color: '#F59E0B', background: 'transparent' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>2</span><div>Hard</div>
            </button>
            <button className="btn" onClick={() => handleRating('good')} style={{ flexDirection: 'column', border: '1px solid #10B981', background: '#10B981', color: '#fff' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>3 / Space</span><div>Good</div>
            </button>
            <button className="btn" onClick={() => handleRating('easy')} style={{ flexDirection: 'column', border: '1px solid #3B82F6', color: '#3B82F6', background: 'transparent' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>4</span><div>Easy</div>
            </button>
          </div>
        )}
      </div>
      <div className="card-hint">{!flipped ? 'Space 翻面顯示答案' : '1~4 鍵對應評價，Space 預設良好'}</div>
    </div>
  );
}
