import { useState } from 'react';
import { useVocabStore } from './hooks/useVocabStore';
import { HomePage } from './components/HomePage';
import { DeckPage } from './components/DeckPage';
import { QuizConfig } from './components/QuizConfig';
import { QuizBoard } from './components/QuizBoard';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>({ type: 'home' });
  const store = useVocabStore();

  const navigate = (v: View) => setView(v);

  if (view.type === 'home') {
    return (
      <HomePage
        decks={store.data.decks}
        cards={store.data.cards}
        createDeck={store.createDeck}
        renameDeck={store.renameDeck}
        deleteDeck={store.deleteDeck}
        exportJSON={store.exportJSON}
        importJSON={store.importJSON}
        navigate={navigate}
      />
    );
  }

  if (view.type === 'deck') {
    const deck = store.data.decks.find(d => d.id === view.deckId);
    if (!deck) { navigate({ type: 'home' }); return null; }
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

  if (view.type === 'quizConfig') {
    const deck = store.data.decks.find(d => d.id === view.deckId);
    if (!deck) { navigate({ type: 'home' }); return null; }
    const cards = store.cardsInDeck(deck.id);
    return (
      <QuizConfig
        deck={deck}
        cards={cards}
        navigate={navigate}
      />
    );
  }

  if (view.type === 'quiz') {
    const deck = store.data.decks.find(d => d.id === view.deckId);
    if (!deck) { navigate({ type: 'home' }); return null; }
    return (
      <QuizBoard
        deck={deck}
        cards={view.cards}
        navigate={navigate}
      />
    );
  }

  return null;
}
