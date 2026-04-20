import { useState } from 'react';
import { ArrowLeft, Play, TrendingDown, Info } from 'lucide-react';
import type { Card, Deck, View } from '../types';

interface Props {
  deck: Deck;
  cards: Card[];
  navigate: (v: View) => void;
}

export function WeaknessConfig({ deck, cards, navigate }: Props) {
  const [targetCount, setTargetCount] = useState<number | 'all'>(20);

  // 弱點分數計算與排序
  const getWeaknessList = () => {
    return [...cards]
      .map(c => {
        const score = (c.againCount * 2) + (c.hardCount * 1);
        return { ...c, weaknessScore: score };
      })
      .sort((a, b) => {
        // 1. 分數由高到低
        if (b.weaknessScore !== a.weaknessScore) return b.weaknessScore - a.weaknessScore;
        // 2. 如果分數相同，優先選擇最近一次結果為 Again 的
        if (a.lastResult === 'again' && b.lastResult !== 'again') return -1;
        if (b.lastResult === 'again' && a.lastResult !== 'again') return 1;
        // 3. 次要對比最後複習時間 (越老的越優先)
        return (a.lastReviewedAt || 0) - (b.lastReviewedAt || 0);
      });
  };

  const sortedList = getWeaknessList();
  const maxCount = targetCount === 'all' ? sortedList.length : Math.min(targetCount, sortedList.length);
  const finalPool = sortedList.slice(0, maxCount);

  const startQuiz = () => {
    if (finalPool.length === 0) return;
    localStorage.removeItem(`quiz_progress_${deck.id}`);
    navigate({ type: 'quiz', deckId: deck.id, cards: finalPool, mode: 'weakness' });
  };

  return (
    <div className="app-shell">
      <div className="top-bar">
        <button className="btn-icon" onClick={() => navigate({ type: 'home' })}><ArrowLeft size={18} /></button>
        <div className="breadcrumb">
          <button className="breadcrumb-link" onClick={() => navigate({ type: 'home' })}>首頁</button>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>弱點強化模式</span>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 48, height: 48, background: 'rgba(239, 68, 68, 0.1)', 
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <TrendingDown color="var(--danger)" size={24} />
          </div>
          <div>
            <div className="page-title">弱點強化模式</div>
            <div className="page-subtitle">針對您最常遺忘或感到困難的單字進行密集練習</div>
          </div>
        </div>

        <div className="surface" style={{ padding: 20 }}>
          <div className="config-section">
            <div className="flex-row" style={{ marginBottom: 12 }}>
              <label>選擇複習數量</label>
              <div className="tag-badge" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
                預計抽測 {maxCount} / {cards.length}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {[10, 20, 30, 50, 'all'].map(n => (
                <button
                  key={n}
                  className={`btn ${targetCount === n ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTargetCount(n as number | 'all')}
                >
                  {n === 'all' ? `全部 (${cards.length})` : n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="surface" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Info size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <b>篩選邏輯：</b>系統會根據您的測驗紀錄計算「弱點分數」。<br/>
              分數計算式：<code>(Again次數 × 2) + (Hard次數 × 1)</code>。<br/>
              分數越高且最近一次結果為「再次 (Again)」的單字將優先出現。
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ alignSelf: 'center', marginTop: 12, width: '100%' }}
          onClick={startQuiz}
          disabled={cards.length === 0}
        >
          <Play size={18} /> 開始強化練習
        </button>

        {/* Preview List */}
        <div className="section-label" style={{ marginTop: 20 }}>預計複習的弱點單字 (Top 5)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedList.slice(0, 5).map(c => (
            <div key={c.id} className="surface" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.word}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>分數: {c.weaknessScore} | 失敗: {c.againCount}次</div>
              </div>
              {c.lastResult === 'again' && <span className="tag-badge" style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.65rem' }}>再次推薦</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
