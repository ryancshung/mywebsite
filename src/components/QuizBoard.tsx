import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Volume2 } from 'lucide-react';
import type { Card, Deck, View } from '../types';

interface Props {
  deck: Deck;
  cards: Card[];
  navigate: (v: View) => void;
}

function speak(text: string) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  const utt = new SpeechSynthesisUtterance(text);
  
  // 優先挑選自然的高品質女性英文語音模型
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  
  // 優先權順序：微軟 Aria (神經網路女聲) -> Google US (女聲) -> Apple Samantha (女聲) -> 微軟 Zira (女聲)
  let bestVoice = englishVoices.find(v => v.name.includes('Aria') && v.name.includes('Online'));
  if (!bestVoice) bestVoice = englishVoices.find(v => v.name.includes('Google US English'));
  if (!bestVoice) bestVoice = englishVoices.find(v => v.name.includes('Samantha'));
  if (!bestVoice) bestVoice = englishVoices.find(v => v.name.includes('Zira'));
  if (!bestVoice) bestVoice = englishVoices.find(v => v.name.includes('Female'));
  if (!bestVoice && englishVoices.length > 0) bestVoice = englishVoices[0];
  
  if (bestVoice) {
    utt.voice = bestVoice;
    utt.lang = bestVoice.lang;
  } else {
    utt.lang = 'en-US'; // 系統預設英文
  }
  
  utt.rate = 0.95;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

// 僅提取英文語句（排除中文字元與括號）
function extractEnglish(text: string): string {
  if (!text) return '';
  // 匹配所有非中文字元的連續片段 (包含英文、空格、標點)
  const matches = text.match(/[A-Za-z0-9\s.,!?'";:-]+/g);
  if (!matches) return '';
  // 挑選長度最長的部分，通常是例句 (過濾掉單個符號或極短片段)
  const sentences = matches
    .map(s => s.trim())
    .filter(s => s.length > 2 && /[A-Za-z]/.test(s));
  return sentences.join('. ');
}

export function QuizBoard({ deck, cards, navigate }: Props) {
  const [quizCards, setQuizCards] = useState<Card[]>(cards);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [flipped, setFlipped] = useState(false);

  const done = quizCards.length === 0;
  const card = quizCards[0];
  const progress = cards.length > 0 ? (cards.length - quizCards.length) / cards.length : 0;

  const flip = useCallback(() => setFlipped(true), []);

  const handleRating = useCallback((rating: 'again' | 'hard' | 'good' | 'easy') => {
    setStats(s => ({ ...s, [rating]: s[rating] + 1 }));
    setFlipped(false);
    window.speechSynthesis?.cancel();
    
    setTimeout(() => {
      setQuizCards(prev => {
        if (prev.length === 0) return [];
        const [current, ...rest] = prev;
        
        if (rating === 'easy') return rest;
        
        switch (rating) {
          case 'again':
            rest.splice(Math.min(1, rest.length), 0, current);
            break;
          case 'hard':
            rest.splice(Math.floor(rest.length / 2), 0, current);
            break;
          case 'good':
            rest.push(current);
            break;
        }
        return [...rest]; // return new array reference
      });
    }, 150);
  }, []);

  const restart = () => { 
    setQuizCards(cards);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setFlipped(false); 
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === ' ' || e.key === 'Enter') { 
        e.preventDefault(); 
        if (!flipped) flip();
        else handleRating('good');
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

  // 自動朗讀功能
  useEffect(() => {
    if (done || !card) return;
    if (!flipped) {
      // 正面：直接讀單字
      const timer = setTimeout(() => speak(card.word), 300);
      return () => clearTimeout(timer);
    } else {
      // 背面：僅朗讀英文例句部分
      const englishSnippet = extractEnglish(card.content);
      if (englishSnippet) {
        speak(englishSnippet);
      }
    }
  }, [card, flipped, done]);

  if (done) {
    return (
      <div className="quiz-shell" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: '3rem' }}>🎉</div>
          <div className="page-title">完成了！</div>
          <div className="page-subtitle">共複習了 {cards.length} 張卡片</div>
          <div className="flex-row" style={{ marginTop: 8, gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => navigate({ type: 'quizConfig', deckId: deck.id })}>
              <ArrowLeft size={15} /> 重新設定
            </button>
            <button className="btn btn-primary" onClick={restart}>
              <RotateCcw size={15} /> 再來一次
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-shell">
      {/* Header */}
      <div className="quiz-header">
        <button className="btn-icon" onClick={() => { window.speechSynthesis?.cancel(); navigate({ type: 'quizConfig', deckId: deck.id }); }}>
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

      {/* Flashcard */}
      <div className="card-scene" onClick={flip}>
        <div className={`card-flipper${flipped ? ' flipped' : ''}`}>
          {/* Front */}
          <div className="card-face card-face-front">
            <div className="card-face-label">正面 · 題目</div>
            <div className="card-word">{card.word}</div>
            {card.tag && <span className="tag-badge card-tag">{card.tag}</span>}
            <div className="card-hint" style={{ marginTop: 16 }}>按 Space 翻面</div>
          </div>
          {/* Back */}
          <div className="card-face card-face-back">
            <div className="card-face-label">背面 · 答案</div>
            <div className="card-content">{card.content || <span style={{ color: 'var(--text-muted)' }}>（無內容）</span>}</div>
            {card.tag && <span className="tag-badge card-tag">{card.tag}</span>}
          </div>
        </div>
      </div>

      {/* TTS */}
      <div className="tts-row">
        <button className="btn btn-ghost btn-sm" onClick={() => speak(card.word)}>
          <Volume2 size={14} /> 朗讀題目
        </button>
        {flipped && extractEnglish(card.content) && (
          <button className="btn btn-ghost btn-sm" onClick={() => speak(extractEnglish(card.content))}>
            <Volume2 size={14} /> 朗讀例句
          </button>
        )}
      </div>

      {/* Navigation / ANKI Rating */}
      <div className="quiz-controls" style={{ display: 'flex', gap: 12, justifyContent: 'center', width: '100%', maxWidth: 560 }}>
        {!flipped ? (
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={flip}>
            顯示答案 (Space)
          </button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%' }}>
            <button className="btn" onClick={() => handleRating('again')} style={{ flexDirection: 'column', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>1</span>
              <div>Again</div>
            </button>
            <button className="btn" onClick={() => handleRating('hard')} style={{ flexDirection: 'column', border: '1px solid #F59E0B', color: '#F59E0B', background: 'transparent' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>2</span>
              <div>Hard</div>
            </button>
            <button className="btn" onClick={() => handleRating('good')} style={{ flexDirection: 'column', border: '1px solid #10B981', background: '#10B981', color: '#fff' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>3 / Space</span>
              <div>Good</div>
            </button>
            <button className="btn" onClick={() => handleRating('easy')} style={{ flexDirection: 'column', border: '1px solid #3B82F6', color: '#3B82F6', background: 'transparent' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>4</span>
              <div>Easy</div>
            </button>
          </div>
        )}
      </div>

      <div className="card-hint">
        {!flipped ? 'Space 翻面顯示答案' : '1~4 鍵對應評價，Space 預設良好'}
      </div>
    </div>
  );
}
