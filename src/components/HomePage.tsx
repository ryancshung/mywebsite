import { useRef, useState } from 'react';
import {
  Plus, Trash2, ChevronRight, Layout, Settings,
  Cloud, CloudOff, RefreshCw, LogOut, TrendingDown,
  Download, Upload,
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
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    createDeck(trimmedName);
    setNewName('');
  };

  const syncLabel = syncing
    ? '同步中'
    : lastSyncStatus === 'error'
      ? '同步失敗'
      : lastSyncStatus === 'success'
        ? '已同步'
        : '尚未同步';

  const syncIcon = syncing ? (
    <RefreshCw size={14} className="spin" aria-hidden="true" />
  ) : lastSyncStatus === 'error' ? (
    <CloudOff size={14} aria-hidden="true" />
  ) : (
    <Cloud size={14} aria-hidden="true" />
  );

  return (
    <div className="app-shell home-shell">
      <main className="home-page">
        <header className="home-header">
          <div className="home-identity">
            <div className="home-brand-row">
              <img
                className="brand-logo brand-logo-header"
                src={`${import.meta.env.BASE_URL}icon-192.png`}
                alt=""
              />
              <div className="home-title-wrap">
                <h1 className="app-title">我的單字庫</h1>
                <p className="page-subtitle">
                  {userId} · {decks.length} 個單字庫
                </p>
              </div>
            </div>

            <div
              className={`home-sync-status${lastSyncStatus === 'error' ? ' is-error' : ''}${syncing ? ' is-syncing' : ''}`}
              role="status"
              aria-live="polite"
            >
              {syncIcon}
              <span>{syncLabel}</span>
            </div>
          </div>

          <button className="btn btn-ghost home-logout" onClick={logout}>
            <LogOut size={15} aria-hidden="true" /> 登出
          </button>
        </header>

        <div className="home-tools">
          <section className="home-create-panel" aria-labelledby="create-deck-title">
            <h2 id="create-deck-title" className="section-label">新增單字庫</h2>
            <form
              className="home-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleCreate();
              }}
            >
              <label className="sr-only" htmlFor="new-deck-name">單字庫名稱</label>
              <input
                id="new-deck-name"
                className="input home-create-input"
                placeholder="輸入名稱，例如：日常對話、托福單字..."
                value={newName}
                onChange={event => setNewName(event.target.value)}
              />
              <button className="btn btn-primary home-create-button" type="submit" disabled={!newName.trim()}>
                <Plus size={18} aria-hidden="true" /> 建立
              </button>
            </form>
          </section>

          <section className="home-backup-panel" aria-labelledby="backup-title">
            <h2 id="backup-title" className="section-label">本地備份</h2>
            <div className="home-backup-actions">
              <button className="btn btn-ghost" onClick={exportJSON}>
                <Download size={15} aria-hidden="true" /> 匯出 JSON
              </button>
              <button
                type="button"
                className="btn btn-ghost home-import-button"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload size={15} aria-hidden="true" /> 匯入 JSON
              </button>
              <input
                ref={importInputRef}
                className="home-import-input"
                type="file"
                accept=".json"
                tabIndex={-1}
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) {
                    importJSON(file)
                      .then(() => alert('匯入成功！'))
                      .catch(() => alert('匯入失敗，請檢查檔案格式。'));
                  }
                  event.target.value = '';
                }}
              />
            </div>
          </section>
        </div>

        <section className="home-library" aria-labelledby="deck-list-title">
          <div className="home-library-heading">
            <h2 id="deck-list-title" className="section-label">所有庫 ({decks.length})</h2>
            <span className="home-card-total">{cards.length} 張卡片</span>
          </div>

          {decks.length === 0 ? (
            <div className="home-empty-state">
              <Layout size={22} aria-hidden="true" />
              <p>尚未建立任何單字庫。</p>
            </div>
          ) : (
            <div className="deck-grid">
              {decks.map(deck => {
                const deckCards = cards.filter(card => card.deckId === deck.id);
                return (
                  <article key={deck.id} className="deck-card surface">
                    <button
                      type="button"
                      className="deck-card-main"
                      onClick={() => navigate({ type: 'deck', deckId: deck.id })}
                      aria-label={`開啟單字庫：${deck.name}`}
                    >
                      <span className="deck-card-icon" aria-hidden="true"><Layout size={20} /></span>
                      <span className="deck-card-copy">
                        <span className="deck-card-title">{deck.name}</span>
                        <span className="deck-card-count">{deckCards.length} 張卡片</span>
                      </span>
                      <ChevronRight className="deck-card-chevron" size={18} aria-hidden="true" />
                    </button>

                    <div className="deck-card-actions">
                      <button
                        className="btn btn-sm btn-ghost deck-secondary-action"
                        onClick={() => navigate({ type: 'weaknessConfig', deckId: deck.id })}
                        disabled={deckCards.length === 0}
                      >
                        <TrendingDown size={14} aria-hidden="true" /> 弱點強化
                      </button>
                      <button
                        className="btn btn-sm btn-ghost deck-secondary-action"
                        onClick={() => navigate({ type: 'quizConfig', deckId: deck.id })}
                        disabled={deckCards.length === 0}
                      >
                        <Settings size={14} aria-hidden="true" /> 測驗
                      </button>
                      <button
                        className="btn-icon danger deck-delete-action"
                        aria-label={`刪除單字庫：${deck.name}`}
                        onClick={() => {
                          if (confirm(`確定要刪除「${deck.name}」嗎？內部單字也會一併刪除。`)) deleteDeck(deck.id);
                        }}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
