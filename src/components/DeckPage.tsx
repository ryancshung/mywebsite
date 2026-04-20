import { useState, useRef } from 'react';
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X,
  Upload, FileText, PlayCircle,
} from 'lucide-react';
import type { Deck, Card, View } from '../types';

interface Props {
  deck: Deck;
  cards: Card[];
  addCard: (deckId: string, word: string, content: string, tag: string) => void;
  updateCard: (id: string, word: string, content: string, tag: string) => void;
  deleteCard: (id: string) => void;
  importCSV: (deckId: string, file: File) => Promise<number>;
  navigate: (v: View) => void;
}

interface EditState { word: string; content: string; tag: string }

export function DeckPage({ deck, cards, addCard, updateCard, deleteCard, importCSV, navigate }: Props) {
  const [form, setForm] = useState<EditState>({ word: '', content: '', tag: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ word: '', content: '', tag: '' });
  const [csvMsg, setCsvMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!form.word.trim()) return;
    addCard(deck.id, form.word, form.content, form.tag);
    setForm({ word: '', content: '', tag: '' });
  };

  const startEdit = (c: Card) => {
    setEditId(c.id);
    setEditState({ word: c.word, content: c.content, tag: c.tag });
  };
  const commitEdit = () => {
    if (editId) updateCard(editId, editState.word, editState.content, editState.tag);
    setEditId(null);
  };

  const handleCSV = async (file: File) => {
    setCsvMsg('匯入中…');
    try {
      const n = await importCSV(deck.id, file);
      setCsvMsg(`✓ 成功匯入 ${n} 張卡片`);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('讀取失敗')) {
        setCsvMsg('✗ 檔案讀取失敗（此檔案可能正被 Excel 開啟，請先關閉檔案再試一次）');
      } else {
        setCsvMsg('✗ CSV 格式錯誤，請確認欄位名稱或檔案編碼');
      }
    }
  };

  const tags = [...new Set(cards.map(c => c.tag).filter(Boolean))];

  return (
    <div className="app-shell">
      {/* Breadcrumb */}
      <div className="top-bar">
        <button className="btn-icon" onClick={() => navigate({ type: 'home' })}><ArrowLeft size={18} /></button>
        <div className="breadcrumb">
          <button className="breadcrumb-link" onClick={() => navigate({ type: 'home' })}>首頁</button>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{deck.name}</span>
        </div>
        <div className="flex-spacer" />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate({ type: 'quizConfig', deckId: deck.id })}
          disabled={cards.length === 0}
        >
          <PlayCircle size={15} /> 開始測驗
        </button>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {/* Meta */}
        <div>
          <div className="page-title">{deck.name}</div>
          <div className="page-subtitle">{cards.length} 張卡片 · {tags.length} 個標籤</div>
        </div>

        {/* CSV Import zone */}
        <div>
          <label
            className={`import-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleCSV(f); }}
            style={{ padding: '32px 20px', display: 'block', background: 'var(--surface)' }}
          >
            <div className="flex-row" style={{ justifyContent: 'center', marginBottom: 12 }}>
              <Upload size={24} color="var(--accent)" />
              <FileText size={24} color="var(--text-muted)" />
            </div>
            <div className="import-zone-text" style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              匯入 CSV 單字檔案
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
              支援欄位：單字 (Word)、內容 (Content)、標籤 (Tag)<br/>
              或是直接拖曳符合格式的 CSV 檔案至此
            </div>
            <input ref={csvRef} type="file" accept=".csv" onChange={e => { if (e.target.files?.[0]) handleCSV(e.target.files[0]); e.target.value = ''; }} />
          </label>
          {csvMsg && (
            <div className="text-sm" style={{ 
              marginTop: 12, 
              padding: '10px', 
              textAlign: 'center', 
              border: '1px solid var(--border)',
              backgroundColor: csvMsg.includes('✓') ? '#F0FDF4' : '#FEF2F2',
              color: csvMsg.includes('✓') ? '#15803D' : '#DC2626',
              borderRadius: 'var(--radius-sm)'
            }}>
              {csvMsg}
            </div>
          )}
        </div>

        {/* Add card form */}
        <div className="surface">
          <div className="add-form">
            <div className="section-label" style={{ marginBottom: 0 }}>手動新增單字</div>
            <input
              className="input"
              placeholder="正面題目（單字）*"
              value={form.word}
              onChange={e => setForm(f => ({ ...f, word: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <textarea
              className="input"
              placeholder="背面答案（內容）"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
            <div className="add-form-row">
              <input
                className="input"
                placeholder="標籤（選填）"
                value={form.tag}
                onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <button className="btn btn-primary" onClick={handleAdd}>
                <Plus size={15} /> 新增
              </button>
            </div>
          </div>
        </div>

        {/* Card table */}
        {cards.length === 0 ? (
          <div className="empty-state">尚無單字。可匯入 CSV 或手動新增。</div>
        ) : (
          <div className="surface" style={{ overflowX: 'auto' }}>
            <table className="card-table">
              <thead>
                <tr>
                  <th>正面 (Word)</th>
                  <th>背面 (Content)</th>
                  <th>標籤</th>
                  <th style={{ width: 72 }}></th>
                </tr>
              </thead>
              <tbody>
                {cards.map(c => (
                  <tr key={c.id}>
                    {editId === c.id ? (
                      <>
                        <td><input className="input" value={editState.word} onChange={e => setEditState(s => ({ ...s, word: e.target.value }))} /></td>
                        <td><textarea className="input" value={editState.content} onChange={e => setEditState(s => ({ ...s, content: e.target.value }))} /></td>
                        <td><input className="input" value={editState.tag} onChange={e => setEditState(s => ({ ...s, tag: e.target.value }))} /></td>
                        <td>
                          <div className="deck-actions">
                            <button className="btn-icon" onClick={commitEdit}><Check size={14} /></button>
                            <button className="btn-icon" onClick={() => setEditId(null)}><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 500 }}>{c.word}</td>
                        <td style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{c.content}</td>
                        <td>{c.tag && <span className="tag-badge">{c.tag}</span>}</td>
                        <td>
                          <div className="deck-actions">
                            <button className="btn-icon" onClick={() => startEdit(c)}><Pencil size={14} /></button>
                            <button className="btn-icon danger" onClick={() => deleteCard(c.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
