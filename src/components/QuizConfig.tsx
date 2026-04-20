import { useState } from 'react';
import { ArrowLeft, Shuffle, List, Play } from 'lucide-react';
import type { Card, Deck, View } from '../types';

interface Props {
  deck: Deck;
  cards: Card[];
  navigate: (v: View) => void;
}

export function QuizConfig({ deck, cards, navigate }: Props) {
  const allTags = [...new Set(cards.map(c => c.tag).filter(Boolean))];
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(allTags));
  const [mode, setMode] = useState<'random' | 'sequential'>('random');

  const totalCards = allTags.length === 0
    ? cards
    : cards.filter(c => c.tag && selectedTags.has(c.tag));

  const maxCount = totalCards.length;
  const [count, setCount] = useState<string>('all');

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const toggleAllTags = () => {
    if (selectedTags.size === allTags.length) setSelectedTags(new Set());
    else setSelectedTags(new Set(allTags));
  };

  const startQuiz = () => {
    let pool = allTags.length === 0
      ? [...cards]
      : cards.filter(c => c.tag && selectedTags.has(c.tag));

    if (mode === 'random') pool = pool.sort(() => Math.random() - 0.5);

    const n = count === 'all' ? pool.length : parseInt(count, 10);
    const final = pool.slice(0, n);
    if (final.length === 0) return;

    // 清除舊的測驗進度，確保使用新的篩選結果
    localStorage.removeItem(`quiz_progress_${deck.id}`);
    navigate({ type: 'quiz', deckId: deck.id, cards: final });
  };

  const countOptions = ['all', 5, 10, 20, 30, 50].filter(v => v === 'all' || (v as number) <= maxCount);

  return (
    <div className="app-shell">
      <div className="top-bar">
        <button className="btn-icon" onClick={() => navigate({ type: 'deck', deckId: deck.id })}><ArrowLeft size={18} /></button>
        <div className="breadcrumb">
          <button className="breadcrumb-link" onClick={() => navigate({ type: 'home' })}>首頁</button>
          <span>/</span>
          <button className="breadcrumb-link" onClick={() => navigate({ type: 'deck', deckId: deck.id })}>{deck.name}</button>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>測驗設定</span>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        <div>
          <div className="page-title">測驗設定</div>
          <div className="page-subtitle">共 {maxCount} 張符合條件的卡片</div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="surface" style={{ padding: 16 }}>
            <div className="config-section">
              <div className="flex-row" style={{ marginBottom: 8 }}>
                <label>標籤篩選</label>
                <div className="flex-spacer" />
                <button className="btn btn-ghost btn-sm" onClick={toggleAllTags}>
                  {selectedTags.size === allTags.length ? '取消全選' : '全選'}
                </button>
              </div>
              <div className="tag-chips">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`tag-chip${selectedTags.has(tag) ? ' selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Count */}
        <div className="surface" style={{ padding: 16 }}>
          <div className="config-section">
            <label>題目數量</label>
            <select
              className="input"
              value={count}
              onChange={e => setCount(e.target.value)}
            >
              {countOptions.map(v => (
                <option key={v} value={v}>
                  {v === 'all' ? `全部（${maxCount} 題）` : `${v} 題`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order */}
        <div className="surface" style={{ padding: 16 }}>
          <div className="config-section">
            <label>出題順序</label>
            <div className="flex-row" style={{ gap: 8 }}>
              <button
                className={`btn ${mode === 'random' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('random')}
              >
                <Shuffle size={15} /> 隨機
              </button>
              <button
                className={`btn ${mode === 'sequential' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('sequential')}
              >
                <List size={15} /> 順序
              </button>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ alignSelf: 'center', marginTop: 8 }}
          onClick={startQuiz}
          disabled={maxCount === 0}
        >
          <Play size={18} /> 開始測驗
        </button>
      </div>
    </div>
  );
}
