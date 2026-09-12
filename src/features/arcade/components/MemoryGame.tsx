import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { useArcadeStore } from '../store/arcadeStore';

interface MemoryGameProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Card {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Financial-themed icons, avoiding ANY pig/piggy icons
const FINANCIAL_ICONS = [
  'account_balance',
  'wallet',
  'monetization_on',
  'payments',
  'credit_card',
  'trending_up',
  'local_atm',
  'currency_exchange'
];

export function MemoryGame({ highScore, onClose, onGameOver }: MemoryGameProps) {
  const { isRTL } = useI18n();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [bestMoves, setBestMoves] = useState(highScore);
  const [lockBoard, setLockBoard] = useState(false);

  const stateRef = useRef({
    pointsAwardedToday: false
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('memory')) {
      stateRef.current.pointsAwardedToday = true;
    }
    startNewGame(difficulty);
  }, [difficulty]);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('memory', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const startNewGame = (diff: 'easy' | 'medium' | 'hard') => {
    let pairCount = 4; // easy: 8 cards
    if (diff === 'medium') pairCount = 6; // 12 cards
    if (diff === 'hard') pairCount = 8; // 16 cards

    const selectedIcons = FINANCIAL_ICONS.slice(0, pairCount);
    const deck = [...selectedIcons, ...selectedIcons]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({
        id: idx,
        icon,
        isFlipped: false,
        isMatched: false
      }));

    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setGameWon(false);
    setLockBoard(false);
  };

  const handleCardClick = (idx: number) => {
    if (lockBoard || cards[idx].isFlipped || cards[idx].isMatched) return;

    const updatedCards = [...cards];
    updatedCards[idx].isFlipped = true;
    setCards(updatedCards);

    const nextFlipped = [...flippedIndices, idx];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setLockBoard(true);
      const nextMoves = moves + 1;
      setMoves(nextMoves);

      const [firstIdx, secondIdx] = nextFlipped;
      if (cards[firstIdx].icon === cards[secondIdx].icon) {
        // Match found
        setTimeout(() => {
          const matchedCards = updatedCards.map((card, cidx) => {
            if (cidx === firstIdx || cidx === secondIdx) {
              return { ...card, isMatched: true };
            }
            return card;
          });
          setCards(matchedCards);
          setFlippedIndices([]);
          setLockBoard(false);
          checkWinCondition(matchedCards);
        }, 500);
      } else {
        // No match: flip back
        setTimeout(() => {
          const resetCards = updatedCards.map((card, cidx) => {
            if (cidx === firstIdx || cidx === secondIdx) {
              return { ...card, isFlipped: false };
            }
            return card;
          });
          setCards(resetCards);
          setFlippedIndices([]);
          setLockBoard(false);
        }, 1000);
      }
    }
  };

  const checkWinCondition = (currentCards: Card[]) => {
    const isWon = currentCards.every(card => card.isMatched);
    if (isWon) {
      setGameWon(true);
      if (bestMoves === 0 || moves < bestMoves) {
        setBestMoves(moves);
        onGameOver(moves);
      }
      awardPoints();
    }
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">
          {isRTL ? 'تحدي الذاكرة النيوني' : 'Neon Memory Match'}
        </h2>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-emerald-500 dark:text-emerald-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-300">
            {isRTL ? `أقل حركات: ${bestMoves}` : `Best: ${bestMoves}`}
          </span>
        </div>
      </div>

      {/* Difficulty Selectors */}
      <div className="w-full bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3.5 rounded-3xl space-y-2.5 shadow-sm mb-2">
        <div className="flex justify-between items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            {isRTL ? 'مستوى الصعوبة:' : 'Difficulty:'}
          </span>
          <div className="flex gap-1.5">
            {(['easy', 'medium', 'hard'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all capitalize ${
                  difficulty === diff
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-white/5 border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {diff === 'easy' ? (isRTL ? 'سهل' : 'Easy') : diff === 'medium' ? (isRTL ? 'متوسط' : 'Medium') : (isRTL ? 'صعب' : 'Hard')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Moves counter */}
      <div className="my-1 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">{isRTL ? 'المحاولات' : 'Moves'}</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{moves}</span>
        </div>
      </div>

      {/* Grid Game Board */}
      <div className="relative w-full max-w-[min(100%,360px)] aspect-square bg-slate-100/90 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-3xl p-3 shadow-lg overflow-hidden mx-auto my-auto flex items-center justify-center">
        <div 
          className="grid gap-2.5 h-full w-full"
          style={{ 
            gridTemplateColumns: `repeat(${difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 4}, minmax(0, 1fr))` 
          }}
        >
          {cards.map((card, idx) => {
            const isFlipped = card.isFlipped || card.isMatched;

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(idx)}
                className={`relative rounded-2xl flex items-center justify-center transition-all duration-500 active:scale-95 shadow-sm ${
                  isFlipped
                    ? 'bg-emerald-500/15 border-emerald-500/40 [transform:rotateY(180deg)]'
                    : 'bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 [transform:rotateY(0deg)] hover:bg-slate-50 dark:hover:bg-white/10'
                } border`}
              >
                {isFlipped ? (
                  <span 
                    className="material-symbols-outlined text-2xl text-emerald-600 dark:text-emerald-400 drop-shadow-sm animate-in zoom-in duration-300"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    {card.icon}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-xl text-slate-400 dark:text-slate-600">
                    help_outline
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Actions */}
      <div className="w-full flex flex-col gap-2 mt-3">
        {gameWon && (
          <div className="text-center text-sm font-black text-emerald-600 dark:text-emerald-400 animate-bounce">
            {isRTL ? `رائع جداً! تم كشف جميع الأزواج بنجاح في ${moves} محاولة 🎉` : `Fabulous! All cards matched in ${moves} moves! 🎉`}
          </div>
        )}

        <button
          onClick={() => startNewGame(difficulty)}
          className="py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-2xl text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          <span>{isRTL ? 'إعادة تشغيل اللعبة' : 'Restart Game'}</span>
        </button>
      </div>
    </div>
  );
}
