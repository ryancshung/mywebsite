import { useState } from 'react';
import { Info, Copy, X } from 'lucide-react';
import { useVocabStore } from './hooks/useVocabStore';
import { HomePage } from './components/HomePage';
import { DeckPage } from './components/DeckPage';
import { QuizConfig } from './components/QuizConfig';
import { QuizBoard } from './components/QuizBoard';
import { LoginPage } from './components/LoginPage';
import { WeaknessConfig } from './components/WeaknessConfig';
import type { View } from './types';

export default function App() {
  const store = useVocabStore();
  const [view, setView] = useState<View>(() => store.data.userId ? { type: 'home' } : { type: 'login' });
  const [showInfo, setShowInfo] = useState(false);

  const navigate = (v: View) => setView(v);

  const promptText = `請幫我將我所上傳的單字表，根據以下範本，製作英文單字學習卡, 並提供CSV檔案讓我下載
學習卡製作範本:
正面: arrive
背面:
arrive (v.) 到達、抵達
【詞性變化】
arrival (n.) 到達、抵達
【搭配詞】
arrive at the airport 到達機場
arrive in London 到達倫敦
【例句】
We arrived at the hotel very late at night.(我們在深夜很晚才到達飯店。)`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    alert('已複製魔法指令到剪貼簿！');
  };

  const renderPage = () => {
    // 沒登入時強制到 Login
    if (!store.data.userId) {
      return <LoginPage onLogin={(id) => { store.login(id); setView({ type: 'home' }); }} />;
    }

    if (view.type === 'login') {
      return <LoginPage onLogin={(id) => { store.login(id); setView({ type: 'home' }); }} />;
    }

    if (view.type === 'home') {
      return (
        <HomePage
          userId={store.data.userId}
          decks={store.data.decks}
          cards={store.data.cards}
          syncing={store.syncing}
          lastSyncStatus={store.lastSyncStatus}
          createDeck={store.createDeck}
          deleteDeck={store.deleteDeck}
          logout={store.logout}
          exportJSON={store.exportJSON}
          importJSON={store.importJSON}
          navigate={navigate}
        />
      );
    }

    if (view.type === 'deck') {
      const deck = store.data.decks.find(d => d.id === view.deckId);
      if (!deck) { setView({ type: 'home' }); return null; }
      const cards = store.cardsInDeck(deck.id);
      return (
        <DeckPage
          deck={deck}
          cards={cards}
          addCard={store.addCard}
          updateCard={store.updateCard}
          deleteCard={store.deleteCard}
          importCSV={store.importCSV}
          navigate={navigate}
        />
      );
    }

    if (view.type === 'quizConfig' || view.type === 'weaknessConfig') {
      const deck = store.data.decks.find(d => d.id === view.deckId);
      if (!deck) { setView({ type: 'home' }); return null; }
      const cards = store.cardsInDeck(deck.id);
      
      if (view.type === 'weaknessConfig') {
        return <WeaknessConfig deck={deck} cards={cards} navigate={navigate} />;
      }
      return <QuizConfig deck={deck} cards={cards} navigate={navigate} />;
    }

    if (view.type === 'quiz') {
      const deck = store.data.decks.find(d => d.id === view.deckId);
      if (!deck) { setView({ type: 'home' }); return null; }
      return (
        <QuizBoard
          deck={deck}
          cards={view.cards}
          mode={view.mode}
          updateStats={store.updateCardStats}
          navigate={navigate}
        />
      );
    }

    return null;
  };

  return (
    <>
      <button 
        className="btn-icon" 
        onClick={() => setShowInfo(true)}
        style={{ 
          position: 'fixed', top: 16, right: 16, zIndex: 50, 
          background: 'var(--surface)', border: '1px solid var(--border)', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: '50%',
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        title="使用說明與快捷鍵"
      >
        <Info size={20} color="var(--text-secondary)" />
      </button>

      {renderPage()}

      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="modal-content surface" onClick={e => e.stopPropagation()}>
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="page-title" style={{ fontSize: '1.25rem' }}>使用說明</div>
              <button className="btn-icon" onClick={() => setShowInfo(false)}><X size={20}/></button>
            </div>
            
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }} className="info-scroll-area">
              <div className="section-label" style={{ fontSize: '0.85rem' }}>測驗快捷鍵與 ANKI 分類功能</div>
              <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: 20, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><b>Space (空白鍵)</b>：翻開卡片背面；翻開後再按一次預設為「Good (3)」。</li>
                <li><b>1 (Again)</b>：忘記單字。卡片會立刻安插至剩下卡片的第 2 個位置，強制稍後再複習。</li>
                <li><b>2 (Hard)</b>：有點困難。卡片會安插至剩下卡片的中間位置。</li>
                <li><b>3 (Good)</b>：熟悉單字。卡片會移至本次練習的所有卡片末端。</li>
                <li><b>4 (Easy)</b>：太簡單了。直接從本次練習中移除。</li>
              </ul>

              <div className="section-label" style={{ fontSize: '0.85rem' }}>利用 AI 產生 CSV 單字庫</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                您可以將自己的單字列表或截圖上傳至 <a href="https://www.perplexity.ai" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Perplexity</a>，並使用下方的「詠唱魔法」讓 AI 直接為您產出相容的 CSV 檔案。
              </p>
              
              <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)', position: 'relative', border: '1px solid var(--border)' }}>
                <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', margin: 0, fontFamily: 'inherit', lineHeight: 1.6 }}>
                  {promptText}
                </pre>
                <button className="btn btn-primary btn-sm" onClick={copyPrompt} style={{ position: 'absolute', top: 12, right: 12 }}>
                  <Copy size={14} /> 複製
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
