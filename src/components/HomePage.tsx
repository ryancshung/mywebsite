import { useState, useRef } from 'react';
import {
  BookOpen, Plus, Trash2, Pencil, Check, X,
  Download, Upload, ChevronRight, PlayCircle,
} from 'lucide-react';
import type { Deck, Card, View } from '../types';

interface Props {
  decks: Deck[];
  cards: Card[];
  createDeck: (name: string) => void;
  renameDeck: (id: string, name: string) => void;
  deleteDeck: (id: string) => void;
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
  navigate: (v: View) => void;
}

export function HomePage({
  decks, cards, createDeck, renameDeck, deleteDeck,
  exportJSON, importJSON, navigate,
}: Props) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [importError, setImportError] = useState('');
  const jsonRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const t = newName.trim();
    if (!t) return;
    createDeck(t);
    setNewName('');
  };

  const startEdit = (d: Deck) => {
    setEditId(d.id);
    setEditName(d.name);
  };

  const commitEdit = () => {
    if (editId && editName.trim()) renameDeck(editId, editName);
    setEditId(null);
  };

  const handleJSONImport = async (file: File) => {
    setImportError('');
    try {
      await importJSON(file);
    } catch {
      setImportError('匯入失敗：JSON 格式不正確');
    }
  };

  const cardCount = (deckId: string) => cards.filter(c => c.deckId === deckId).length;

  return (
    <div className="app-shell">
      <div className="page">
        {/* Header */}
        <div className="flex-row">
          <BookOpen size={22} color="var(--accent)" />
          <div>
            <div className="page-title">Vocab Cards</div>
            <div className="page-subtitle">{decks.length} 個單字庫 · {cards.length} 張卡片</div>
          </div>
          <div className="flex-spacer" />
          <button className="btn btn-ghost btn-sm" onClick={exportJSON} title="匯出所有資料">
            <Download size={15} /> 匯出
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => jsonRef.current?.click()} title="匯入資料">
            <Upload size={15} /> 匯入
          </button>
          <input
            ref={jsonRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleJSONImport(e.target.files[0]); e.target.value = ''; }}
          />
        </div>

        {importError && (
          <div className="text-sm" style={{ color: 'var(--danger)' }}>{importError}</div>
        )}

        {/* New deck input */}
        <div className="flex-row">
          <input
            className="input"
            placeholder="新單字庫名稱…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} /> 建立
          </button>
        </div>

        {/* Deck list */}
        {decks.length === 0 ? (
          <div className="empty-state">尚無單字庫。點擊「建立」開始建立你的第一個單字庫。</div>
        ) : (
          <div className="deck-list">
            {decks.map(d => (
              <div key={d.id} className="deck-item">
                <BookOpen size={18} color="var(--accent)" style={{ flexShrink: 0 }} />

                {editId === d.id ? (
                  <input
                    className="input deck-name-edit"
                    value={editName}
                    autoFocus
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditId(null);
                    }}
                  />
                ) : (
                  <span className="deck-item-name" onClick={() => navigate({ type: 'deck', deckId: d.id })}>
                    {d.name}
                  </span>
                )}

                <span className="deck-item-meta">{cardCount(d.id)} 張</span>

                <div className="deck-actions">
                  {editId === d.id ? (
                    <>
                      <button className="btn-icon" onClick={commitEdit}><Check size={15} /></button>
                      <button className="btn-icon" onClick={() => setEditId(null)}><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <button className="btn-icon" onClick={() => startEdit(d)} title="重新命名"><Pencil size={15} /></button>
                      <button className="btn-icon danger" onClick={() => {
                        if (confirm(`刪除「${d.name}」及其所有單字？`)) deleteDeck(d.id);
                      }} title="刪除"><Trash2 size={15} /></button>
                      <button className="btn-icon" onClick={() => navigate({ type: 'deck', deckId: d.id })} title="瀏覽">
                        <ChevronRight size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--accent)' }}
                        title="開始測驗"
                        onClick={() => navigate({ type: 'quizConfig', deckId: d.id })}
                        disabled={cardCount(d.id) === 0}
                      >
                        <PlayCircle size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
