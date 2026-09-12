import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { useArcadeStore } from '../store/arcadeStore';

interface SlidingPuzzleProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

export function SlidingPuzzle({ highScore, onClose, onGameOver }: SlidingPuzzleProps) {
  const { isRTL } = useI18n();
  const [gridSize, setGridSize] = useState<3 | 4>(3);
  const [board, setBoard] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [bestMoves, setBestMoves] = useState(highScore);
  const [mode, setMode] = useState<'numbers' | 'image'>('numbers');

  const stateRef = useRef({
    pointsAwardedToday: false
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('sliding')) {
      stateRef.current.pointsAwardedToday = true;
    }
    startNewGame(gridSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, mode]);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('sliding', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  // Check if a generated board is solvable
  const isSolvable = (puzzle: number[], size: number): boolean => {
    let inversions = 0;
    const len = puzzle.length;
    for (let i = 0; i < len - 1; i++) {
      for (let j = i + 1; j < len; j++) {
        if (puzzle[i] !== 0 && puzzle[j] !== 0 && puzzle[i] > puzzle[j]) {
          inversions++;
        }
      }
    }
    if (size % 2 !== 0) {
      return inversions % 2 === 0;
    } else {
      const emptyRowFromBottom = size - Math.floor(puzzle.indexOf(0) / size);
      if (emptyRowFromBottom % 2 === 0) {
        return inversions % 2 !== 0;
      } else {
        return inversions % 2 === 0;
      }
    }
  };

  const startNewGame = (size: number) => {
    const totalTiles = size * size;
    const tiles = Array.from({ length: totalTiles - 1 }, (_, i) => i + 1);
    tiles.push(0); // 0 represents the empty tile

    let shuffled: number[] = [];
    let solvable = false;

    // Keep shuffling until solvable
    while (!solvable) {
      shuffled = [...tiles].sort(() => Math.random() - 0.5);
      solvable = isSolvable(shuffled, size);
    }

    setBoard(shuffled);
    setMoves(0);
    setIsPlaying(true);
    setGameWon(false);
  };

  const handleTileClick = (index: number) => {
    if (gameWon) return;

    const size = gridSize;
    const emptyIndex = board.indexOf(0);

    const tileRow = Math.floor(index / size);
    const tileCol = index % size;
    const emptyRow = Math.floor(emptyIndex / size);
    const emptyCol = emptyIndex % size;

    // Check if the clicked tile is adjacent to the empty tile
    const isAdjacent =
      (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) ||
      (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow);

    if (isAdjacent) {
      const newBoard = [...board];
      newBoard[emptyIndex] = board[index];
      newBoard[index] = 0;
      setBoard(newBoard);

      const nextMoves = moves + 1;
      setMoves(nextMoves);

      // Check win condition
      checkWinCondition(newBoard);
    }
  };

  const checkWinCondition = (currentBoard: number[]) => {
    const totalTiles = gridSize * gridSize;
    let isWon = true;
    for (let i = 0; i < totalTiles - 1; i++) {
      if (currentBoard[i] !== i + 1) {
        isWon = false;
        break;
      }
    }
    if (isWon && currentBoard[totalTiles - 1] === 0) {
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
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">
          {isRTL ? 'بازل الترتيب النيوني' : 'Neon Sliding Puzzle'}
        </h2>
        <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-violet-500 dark:text-violet-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-violet-600 dark:text-violet-300">
            {isRTL ? `أقل حركات: ${bestMoves}` : `Best: ${bestMoves}`}
          </span>
        </div>
      </div>

      {/* Mode and Size Selectors */}
      <div className="w-full bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3.5 rounded-3xl space-y-2.5 shadow-sm mb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('numbers')}
            className={`flex-1 py-2 rounded-2xl text-xs font-black transition-all ${
              mode === 'numbers'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {isRTL ? 'وضع الأرقام' : 'Numbers Mode'}
          </button>
          <button
            onClick={() => setMode('image')}
            className={`flex-1 py-2 rounded-2xl text-xs font-black transition-all ${
              mode === 'image'
                ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {isRTL ? 'وضع الشعار' : 'Logo Mode'}
          </button>
        </div>

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            {isRTL ? 'حجم اللوحة:' : 'Board Size:'}
          </span>
          <div className="flex gap-1.5">
            {[3, 4].map(size => (
              <button
                key={size}
                onClick={() => setGridSize(size as 3 | 4)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                  gridSize === size
                    ? 'bg-violet-500/20 border border-violet-500/40 text-violet-600 dark:text-violet-300'
                    : 'bg-slate-100 dark:bg-white/5 border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {size} x {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Turn indicator / Stats */}
      <div className="my-1 text-center flex justify-center gap-8">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">{isRTL ? 'عدد الحركات' : 'Moves Played'}</span>
          <span className="text-xl font-black text-violet-600 dark:text-violet-400 drop-shadow-sm">{moves}</span>
        </div>
      </div>

      {/* Grid Game Board */}
      <div className="relative w-full max-w-[min(100%,360px)] aspect-square bg-slate-100/90 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-3xl p-3 shadow-lg overflow-hidden mx-auto my-auto flex items-center justify-center">
        <div 
          className="grid gap-2 h-full w-full"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {board.map((tile, idx) => {
            if (tile === 0) {
              return <div key={idx} className="bg-slate-200/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-300 dark:border-white/5" />;
            }

            const correctIdx = tile - 1;
            const isCorrect = correctIdx === idx;

            // Render numbers mode or custom logo block
            return (
              <button
                key={idx}
                onClick={() => handleTileClick(idx)}
                className={`relative rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-sm ${
                  isCorrect
                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-600 dark:text-violet-400'
                    : 'bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10'
                } border active:scale-95`}
              >
                {mode === 'numbers' ? (
                  <span className={`text-2xl font-black ${isCorrect ? 'text-violet-600 dark:text-violet-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {tile}
                  </span>
                ) : (
                  // Custom Logo Mode: Draw neat neon blocks
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="material-symbols-outlined text-xl text-fuchsia-500 dark:text-fuchsia-400 drop-shadow-sm">
                      account_balance
                    </span>
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                      {tile}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="w-full flex flex-col gap-2 mt-3">
        {gameWon && (
          <div className="text-center text-sm font-black text-emerald-600 dark:text-emerald-400 animate-bounce">
            {isRTL ? `رائع جداً! تم حل البازل في ${moves} خطوة 🎉` : `Solved perfectly in ${moves} moves! 🎉`}
          </div>
        )}

        <button
          onClick={() => startNewGame(gridSize)}
          className="py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          <span>{isRTL ? 'إعادة خلط اللوحة' : 'Shuffle Board'}</span>
        </button>
      </div>
    </div>
  );
}
