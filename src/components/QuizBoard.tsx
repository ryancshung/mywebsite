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
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  const card = cards[index];
  const progress = (index + (flipped ? 0.5 : 0)) / cards.length;

  const flip = useCallback(() => setFlipped(f => !f), []);

  const goNext = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (index >= cards.length - 1) { setDone(true); return; }
    setFlipped(false);
    setTimeout(() => setIndex(i => i + 1), 50);
  }, [index, cards.length]);

  const goPrev = useCallback(() => {
    if (index <= 0) return;
    window.speechSynthesis?.cancel();
    setFlipped(false);
    setTimeout(() => setIndex(i => i - 1), 50);
  }, [index]);

  const restart = () => { setIndex(0); setFlipped(false); setDone(false); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flip, goNext, goPrev]);

  // 自動朗讀功能
  useEffect(() => {
    if (done) return;
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
  }, [index, flipped, card, done]);

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
        <div className="quiz-counter">{index + 1} / {cards.length}</div>
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

      {/* Navigation */}
      <div className="quiz-controls">
        <button className="btn btn-ghost" onClick={goPrev} disabled={index === 0}>
          <ArrowLeft size={16} /> 上一題
        </button>
        <button className="btn btn-ghost" onClick={flip}>
          {flipped ? '收起' : '翻面'}
        </button>
        <button className="btn btn-primary" onClick={goNext}>
          {index === cards.length - 1 ? '完成' : '下一題'} <ArrowRight size={16} />
        </button>
      </div>

      <div className="card-hint">← → 方向鍵換題　Space / Enter 翻面</div>
    </div>
  );
}
