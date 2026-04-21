import { useState } from 'react';
import { ArrowLeft, Shuffle, List, Play, Volume2 } from 'lucide-react';
import type { Card, Deck, View, AppSettings } from '../types';

interface Props {
  deck: Deck;
  cards: Card[];
  navigate: (v: View) => void;
  settings?: AppSettings;
  updateSettings: (s: AppSettings) => void;
}

export function QuizConfig({ deck, cards, navigate, settings, updateSettings }: Props) {
  const allTags = [...new Set(cards.map(c => c.tag).filter(Boolean))];
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(allTags));
  const [mode, setMode] = useState<'random' | 'sequential' | 'weighted'>('weighted');

  const filteredCards = allTags.length === 0
    ? cards
    : cards.filter(c => c.tag && selectedTags.has(c.tag));

  const maxCount = filteredCards.length;
  const [count, setCount] = useState<string>(maxCount > 20 ? '20' : 'all');

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
    const nPerTag = count === 'all' ? Infinity : parseInt(count, 10);
    let finalPool: Card[] = [];

    const activeTags = allTags.length === 0 ? ['__no_tag__'] : Array.from(selectedTags);
    const now = Date.now();

    activeTags.forEach(tag => {
      let tagCards = tag === '__no_tag__' 
        ? cards 
        : cards.filter(c => c.tag === tag);
      
      if (tagCards.length === 0) return;

      if (mode === 'weighted') {
        // 依照標籤分別進行 SRS 排序
        tagCards.sort((a, b) => {
          const aDue = (a.dueAt || 0) <= now;
          const bDue = (b.dueAt || 0) <= now;
          if (aDue && !bDue) return -1;
          if (!aDue && bDue) return 1;
          if ((a.interval || 0) !== (b.interval || 0)) return (a.interval || 0) - (b.interval || 0);
          return (b.againCount || 0) - (a.againCount || 0);
        });
        
        // 從該標籤挑出最不熟的前 N 題
        const picked = tagCards.slice(0, nPerTag);
        finalPool = [...finalPool, ...picked];
      } else if (mode === 'random') {
        const picked = tagCards.sort(() => Math.random() - 0.5).slice(0, nPerTag);
        finalPool = [...finalPool, ...picked];
      } else {
        // Sequential
        const picked = tagCards.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(0, nPerTag);
        finalPool = [...finalPool, ...picked];
      }
    });

    if (finalPool.length === 0) return;

    // 將所有標籤抽出的題目打亂，避免測驗時相同標籤的題目全部擠在一起
    const final = finalPool.sort(() => Math.random() - 0.5);

    localStorage.removeItem(`quiz_progress_${deck.id}`);
    navigate({ type: 'quiz', deckId: deck.id, cards: final, mode: mode === 'weighted' ? 'random' : 'normal' });
  };

  const handleToggleSpeak = (key: keyof AppSettings) => {
    if (!settings) return;
    updateSettings({ ...settings, [key]: !settings[key] });
  };

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

        {/* Selection Logic */}
        <div className="surface" style={{ padding: 16 }}>
          <div className="config-section">
            <label>選題演算法</label>
            <div className="flex-row" style={{ gap: 8, marginTop: 4 }}>
              <button
                className={`btn ${mode === 'weighted' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('weighted')}
                title="優先挑選不熟或該複習的單字"
              >
                <Shuffle size={15} /> 隨機 (SRS 加權)
              </button>
              <button
                className={`btn ${mode === 'random' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('random')}
              >
                純隨機
              </button>
              <button
                className={`btn ${mode === 'sequential' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('sequential')}
              >
                <List size={15} /> 依建立時間
              </button>
            </div>
          </div>
        </div>

        {/* Count */}
        <div className="surface" style={{ padding: 16 }}>
          <div className="config-section">
            <label>每標籤抽出數量 (最少 1 題)</label>
            <div className="flex-row" style={{ gap: 12, marginTop: 8 }}>
              <input
                type="number"
                className="input"
                style={{ flex: 1, padding: '8px 12px' }}
                min="1"
                value={count === 'all' ? '' : count}
                placeholder={count === 'all' ? `預設取全部單字` : "請輸入數量"}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) setCount('all');
                  else setCount(Math.max(1, val).toString());
                }}
              />
              <button 
                className={`btn ${count === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ minWidth: 80 }}
                onClick={() => setCount(count === 'all' ? '10' : 'all')}
              >
                {count === 'all' ? '已填滿' : '全部'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
              系統將從選取的每個標籤中，優先挑選 {count === 'all' ? '所有' : count} 題不熟的單字。
            </p>
          </div>
        </div>

        {/* TTS Settings */}
        <div className="surface" style={{ padding: 16 }}>
          <div className="config-section">
            <div className="flex-row" style={{ marginBottom: 8 }}>
              <label><Volume2 size={16} /> 自動發音設定</label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="flex-row" style={{ cursor: 'pointer', justifyContent: 'flex-start', gap: 12 }}>
                <input 
                  type="checkbox" 
                  checked={settings?.autoSpeakFront ?? true} 
                  onChange={() => handleToggleSpeak('autoSpeakFront')}
                  style={{ width: 18, height: 18 }}
                />
                <span>正面自動發音 (題目)</span>
              </label>
              <label className="flex-row" style={{ cursor: 'pointer', justifyContent: 'flex-start', gap: 12 }}>
                <input 
                  type="checkbox" 
                  checked={settings?.autoSpeakBack ?? true} 
                  onChange={() => handleToggleSpeak('autoSpeakBack')}
                  style={{ width: 18, height: 18 }}
                />
                <span>背面自動發音 (例句/內容)</span>
              </label>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ alignSelf: 'center', marginTop: 16 }}
          onClick={startQuiz}
          disabled={maxCount === 0}
        >
          <Play size={18} /> 開始測驗
        </button>
      </div>
    </div>
  );
}
