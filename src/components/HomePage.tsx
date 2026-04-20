import { useState } from 'react';
import { 
  Plus, Trash2, ChevronRight, Layout, Settings, 
  Cloud, CloudOff, RefreshCw, LogOut, TrendingDown,
  Download, Upload
} from 'lucide-react';
import type { Deck, Card, View } from '../types';

interface Props {
  userId: string | null;
  decks: Deck[];
  cards: Card[];
  syncing: boolean;
  lastSyncStatus: 'idle' | 'success' | 'error';
  createDeck: (name: string) => void;
  deleteDeck: (id: string) => void;
  logout: () => void;
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
  navigate: (v: View) => void;
}

export function HomePage({
  userId, decks, cards, syncing, lastSyncStatus,
  createDeck, deleteDeck, logout, exportJSON, importJSON, navigate,
}: Props) {
  const [newName, setNewName] = useState('');
  const [importError, setImportError] = useState('');

  const handleCreate = () => {
    const t = newName.trim();
    if (!t) return;
    createDeck(t);
    setNewName('');
  };

  return (
    <div className="app-shell">
      <div className="page">
        {/* Header with Sync Status */}
        <div className="flex-row" style={{ alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="flex-row" style={{ gap: 12, justifyContent: 'flex-start' }}>
              <div className="app-title">我的單字庫</div>
              <div className={`sync-indicator ${syncing ? 'syncing' : ''}`}>
                {syncing ? (
                  <RefreshCw size={14} className="spin" />
                ) : lastSyncStatus === 'error' ? (
                  <CloudOff size={14} color="var(--danger)" />
                ) : (
                  <Cloud size={14} color="var(--accent)" />
                )}
              </div>
            </div>
            <div className="page-subtitle">
              {userId} · {decks.length} 個單字庫
            </div>
          </div>
          <div className="flex-spacer" />
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: 'var(--text-muted)' }}>
            <LogOut size={14} /> 登出
          </button>
        </div>

        {/* Global actions (JSON Backup) */}
        <div className="flex-row" style={{ marginBottom: 32, gap: 12, justifyContent: 'flex-start' }}>
          <div className="section-label" style={{ marginBottom: 0, marginRight: 8 }}>本地備份</div>
          <button className="btn btn-ghost btn-sm" onClick={exportJSON}>
            <Download size={14} /> 匯出 JSON
          </button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> 匯入 JSON
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  importJSON(file)
                    .then(() => alert('匯入成功！'))
                    .catch(() => alert('匯入失敗，請檢查檔案格式。'));
                }
              }}
            />
          </label>
        </div>

        {/* New deck input */}
        <div className="surface" style={{ padding: 20, marginBottom: 40 }}>
          <div className="section-label">新增單字庫</div>
          <div className="flex-row">
            <input
              className="input"
              placeholder="輸入名稱，例如：日常對話、托福單字..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={18} /> 建立
            </button>
          </div>
        </div>

        {/* Decks list */}
        <div className="section-label">所有庫 ({decks.length})</div>
        {decks.length === 0 ? (
          <div className="empty-state">尚未建立任何單字庫。</div>
        ) : (
          <div className="deck-grid">
            {decks.map(deck => {
              const deckCards = cards.filter(c => c.deckId === deck.id);
              return (
                <div key={deck.id} className="deck-card surface">
                  <div className="deck-card-main" onClick={() => navigate({ type: 'deck', deckId: deck.id })}>
                    <div className="deck-card-icon"><Layout size={20} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="deck-card-title">{deck.name}</div>
                      <div className="deck-card-count">{deckCards.length} 張卡片</div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                  
                  <div className="deck-card-actions">
                    <button 
                      className="btn btn-sm btn-ghost"
                      onClick={() => navigate({ type: 'weaknessConfig', deckId: deck.id })}
                      style={{ color: 'var(--danger)', fontSize: '0.75rem' }}
                      disabled={deckCards.length === 0}
                    >
                      <TrendingDown size={14} /> 弱點強化
                    </button>
                    <button 
                      className="btn btn-sm btn-ghost" 
                      onClick={() => navigate({ type: 'quizConfig', deckId: deck.id })}
                      disabled={deckCards.length === 0}
                    >
                      <Settings size={14} /> 測驗
                    </button>
                    <button className="btn btn-sm btn-ghost danger" onClick={() => {
                      if (confirm(`確定要刪除「${deck.name}」嗎？內部單字也會一併刪除。`)) deleteDeck(deck.id);
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
