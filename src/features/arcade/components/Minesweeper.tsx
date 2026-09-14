import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface MinesweeperProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export function Minesweeper({ highScore: _highScore, onClose, onGameOver }: MinesweeperProps) {
  const { t, isRTL } = useI18n();
  const [rows] = useState(8);
  const [cols] = useState(8);
  const [mineCount] = useState(10);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [winCount, setWinCount] = useState(0);
  const [minesRemaining, setMinesRemaining] = useState(10);

  const stateRef = useRef({
    pointsAwardedToday: false
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('minesweeper')) {
      stateRef.current.pointsAwardedToday = true;
    }
    initializeBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('minesweeper', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const initializeBoard = () => {
    // Generate empty board
    const newBoard: Cell[][] = Array(rows).fill(null).map((_, r) =>
      Array(cols).fill(null).map((_, c) => ({
        r,
        c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      }))
    );

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!newBoard[r][c].isMine) {
        newBoard[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbors
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!newBoard[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (newBoard[nr][nc].isMine) count++;
              }
            }
          }
          newBoard[r][c].neighborMines = count;
        }
      }
    }

    setBoard(newBoard);
    setGameOver(false);
    setGameWon(false);
    setMinesRemaining(mineCount);
  };

  // Flood fill algorithm for revealing empty adjacent cells
  const revealCell = (tempBoard: Cell[][], r: number, c: number) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = tempBoard[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;

    if (cell.neighborMines === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          revealCell(tempBoard, r + dr, c + dc);
        }
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || gameWon) return;
    const tempBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = tempBoard[r][c];

    if (flagMode) {
      toggleFlag(r, c);
      return;
    }

    if (cell.isFlagged || cell.isRevealed) return;

    if (cell.isMine) {
      // Game Over: Reveal all mines
      revealAllMines(tempBoard, false);
      setGameOver(true);
      toast(isRTL ? 'بوووم! انفجر اللغم 💥' : 'BOOM! You hit a mine 💥', 'error');
      return;
    }

    revealCell(tempBoard, r, c);
    setBoard(tempBoard);
    checkWinCondition(tempBoard);
  };

  const toggleFlag = (r: number, c: number) => {
    if (gameOver || gameWon) return;
    const tempBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = tempBoard[r][c];

    if (cell.isRevealed) return;

    const nextFlagged = !cell.isFlagged;
    cell.isFlagged = nextFlagged;
    setBoard(tempBoard);

    const nextMinesRemaining = minesRemaining + (nextFlagged ? -1 : 1);
    setMinesRemaining(nextMinesRemaining);
  };

  const revealAllMines = (tempBoard: Cell[][], _won: boolean) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (tempBoard[r][c].isMine) {
          tempBoard[r][c].isRevealed = true;
        }
      }
    }
    setBoard(tempBoard);
  };

  const checkWinCondition = (tempBoard: Cell[][]) => {
    let unrevealedSafeCells = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = tempBoard[r][c];
        if (!cell.isMine && !cell.isRevealed) {
          unrevealedSafeCells++;
        }
      }
    }

    if (unrevealedSafeCells === 0) {
      setGameWon(true);
      revealAllMines(tempBoard, true);
      const nextWinCount = winCount + 1;
      setWinCount(nextWinCount);
      onGameOver(nextWinCount);
      awardPoints();
    }
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <button aria-label={t('action.back') || 'Back'}
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
          {isRTL ? 'كاسحة الألغام النيونية' : 'Neon Minesweeper'}
        </h2>
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-red-600 dark:text-red-300">
            {isRTL ? `الفوز: ${winCount}` : `Wins: ${winCount}`}
          </span>
        </div>
      </div>

      {/* Stats Counter & Mode Toggler */}
      <div className="w-full bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3.5 rounded-3xl flex justify-between items-center shadow-sm mb-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              {isRTL ? 'الألغام المتبقية' : 'Mines Left'}
            </span>
            <span className="text-lg font-black text-orange-500 dark:text-orange-400 drop-shadow-sm">
              {minesRemaining}
            </span>
          </div>
        </div>

        {/* Flag Mode Toggler */}
        <button aria-label={t('action.flag') || 'Flag'}
          onClick={() => setFlagMode(!flagMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all active:scale-95 ${
            flagMode
              ? 'bg-orange-500/20 border-orange-500/40 text-orange-600 dark:text-orange-300 shadow-sm'
              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">flag</span>
          <span className="text-xs font-black">{isRTL ? 'وضع العلم' : 'Flag Mode'}</span>
        </button>
      </div>

      {/* Grid Game Board */}
      <div className="relative w-full max-w-[min(100%,360px)] aspect-square bg-slate-100/90 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-3xl p-3 shadow-lg overflow-hidden mx-auto my-auto flex items-center justify-center">
        <div className="grid grid-cols-8 gap-1.5 h-full w-full">
          {board.map((row, r) =>
            row.map((cell, c) => {
              let cellContent: React.ReactNode = null;
              let bgClass = 'bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200/90 dark:border-white/5 text-slate-800 dark:text-slate-100';
              let shadowClass = 'shadow-xs';

              if (cell.isRevealed) {
                if (cell.isMine) {
                  bgClass = 'bg-red-500/20 dark:bg-red-500/20 border-red-500/40 text-red-500';
                  shadowClass = 'shadow-[inset_0_0_10px_rgba(239,68,68,0.3)]';
                  cellContent = (
                    <span className="material-symbols-outlined text-lg text-red-500 animate-bounce">
                      bomb
                    </span>
                  );
                } else {
                  bgClass = 'bg-slate-200/70 dark:bg-slate-950/60 border-slate-300/60 dark:border-white/5';
                  if (cell.neighborMines > 0) {
                    const colors = [
                      'text-blue-600 dark:text-blue-400',
                      'text-emerald-600 dark:text-emerald-400',
                      'text-rose-600 dark:text-rose-400',
                      'text-purple-600 dark:text-purple-400',
                      'text-amber-600 dark:text-amber-400',
                      'text-cyan-600 dark:text-cyan-400',
                      'text-pink-600 dark:text-pink-400',
                      'text-indigo-600 dark:text-indigo-400'
                    ];
                    cellContent = (
                      <span className={`text-base font-black ${colors[cell.neighborMines - 1]}`}>
                        {cell.neighborMines}
                      </span>
                    );
                  }
                }
              } else if (cell.isFlagged) {
                cellContent = (
                  <span className="material-symbols-outlined text-lg text-orange-500 dark:text-orange-400 drop-shadow-sm animate-in zoom-in duration-200">
                    flag
                  </span>
                );
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(r, c);
                  }}
                  className={`relative rounded-xl border flex items-center justify-center transition-all duration-200 ${bgClass} ${shadowClass} active:scale-90`}
                >
                  {cellContent}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Control Actions */}
      <div className="w-full flex flex-col gap-2 mt-3">
        {gameOver && (
          <div className="text-center text-sm font-black text-red-500 dark:text-red-400 animate-pulse">
            {isRTL ? 'للأسف! انفجر اللغم، حاول مرة أخرى' : 'Boom! Game Over, try again!'}
          </div>
        )}
        {gameWon && (
          <div className="text-center text-sm font-black text-emerald-600 dark:text-emerald-400 animate-bounce">
            {isRTL ? 'تهانينا! لقد اكتشفت كل الألغام بأمان 🎉' : 'Awesome! You cleared the minefield 🎉'}
          </div>
        )}

        <button aria-label={t('action.refresh') || 'Refresh'}
          onClick={initializeBoard}
          className="py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">refresh</span>
          <span>{isRTL ? 'إعادة تشغيل اللعبة' : 'Restart Game'}</span>
        </button>
      </div>
    </div>
  );
}
