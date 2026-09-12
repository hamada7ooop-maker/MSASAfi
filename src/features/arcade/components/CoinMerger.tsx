import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '@/i18n/index';
import { useArcadeStore } from '../store/arcadeStore';

interface CoinMergerProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

type Board = number[][];

export function CoinMerger({ highScore, onClose, onGameOver }: CoinMergerProps) {
  const { isRTL } = useI18n();
  const [board, setBoard] = useState<Board>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [isPlaying, setIsPlaying] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef({
    pointsAwardedToday: false
  });

  useEffect(() => {
    // Check if points already awarded today for this game
    if (useArcadeStore.getState().isDailyPointsAwarded('coins')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('coins', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  // Get metadata for coin values
  const getCoinMeta = (val: number) => {
    switch (val) {
      case 1:
        return { label: '1', color: 'bg-gradient-to-br from-slate-200 to-slate-300 border-slate-300 text-slate-800 shadow-[0_0_10px_rgba(255,255,255,0.1)]' };
      case 2:
        return { label: '2', color: 'bg-gradient-to-br from-orange-100 to-orange-300 border-orange-200 text-slate-800 shadow-[0_0_10px_rgba(251,146,60,0.15)]' };
      case 4:
        return { label: '4', color: 'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.25)]' };
      case 8:
        return { label: '8', color: 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' };
      case 16:
        return { label: '16', color: 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]' };
      case 32:
        return { label: '32', color: 'bg-gradient-to-br from-red-500 to-red-700 border-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]' };
      case 64:
        return { label: '64', color: 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-400 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.4)] font-black' };
      case 128:
        return { label: '128', color: 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-500 text-white shadow-[0_0_18px_rgba(234,179,8,0.5)] font-black' };
      case 256:
        return { label: '256', color: 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] font-black' };
      case 512:
        return { label: '512', color: 'bg-gradient-to-br from-teal-400 to-teal-600 border-teal-500 text-white shadow-[0_0_22px_rgba(20,184,166,0.6)] font-black animate-pulse' };
      case 1024:
        return { label: '1024', color: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 border-blue-400 text-white shadow-[0_0_30px_rgba(59,130,246,0.8)] font-black animate-bounce' };
      case 2048:
        return { label: '2048', color: 'bg-gradient-to-br from-purple-600 via-pink-600 to-rose-700 border-purple-400 text-white shadow-[0_0_35px_rgba(168,85,247,0.9)] font-black animate-pulse' };
      default:
        if (val > 2048) {
          return { label: String(val), color: 'bg-gradient-to-br from-purple-600 via-pink-600 to-rose-700 border-purple-400 text-white shadow-[0_0_35px_rgba(168,85,247,0.9)] font-black animate-pulse' };
        }
        return { label: '', color: 'bg-slate-200/60 dark:bg-white/[0.04] border-slate-300/60 dark:border-white/5' };
    }
  };

  const addRandomTile = useCallback((currentBoard: Board): Board => {
    const emptyTiles: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) {
          emptyTiles.push({ r, c });
        }
      }
    }

    if (emptyTiles.length > 0) {
      const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      const nextBoard = currentBoard.map(row => [...row]);
      nextBoard[r][c] = Math.random() > 0.9 ? 2 : 1; // 90% chance of 1, 10% chance of 2
      return nextBoard;
    }
    return currentBoard;
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    
    let initialBoard = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    initialBoard = addRandomTile(initialBoard);
    initialBoard = addRandomTile(initialBoard);
    setBoard(initialBoard);
  };

  const checkGameOver = useCallback((currentBoard: Board): boolean => {
    // Check empty tiles
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) return false;
      }
    }
    // Check adjacent matches
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = currentBoard[r][c];
        if (r < 3 && currentBoard[r + 1][c] === val) return false;
        if (c < 3 && currentBoard[r][c + 1] === val) return false;
      }
    }
    return true;
  }, []);

  const slide = useCallback((row: number[]): { newRow: number[]; gainedScore: number } => {
    // Filter out zeros
    const filtered = row.filter(val => val !== 0);
    let gainedScore = 0;
    
    // Merge adjacent duplicates
    const merged: number[] = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        const nextVal = filtered[i] * 2;
        merged.push(nextVal);
        gainedScore += nextVal;
        i++; // skip next since it's merged
      } else {
        merged.push(filtered[i]);
      }
    }

    // Pad with zeros at the end
    while (merged.length < 4) {
      merged.push(0);
    }

    return { newRow: merged, gainedScore };
  }, []);

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (!isPlaying || gameOver) return;

    const nextBoard = board.map(row => [...row]);
    let totalGainedScore = 0;
    let boardChanged = false;

    if (direction === 'left' || direction === 'right') {
      for (let r = 0; r < 4; r++) {
        let row = nextBoard[r];
        if (direction === 'right') row = [...row].reverse();

        const { newRow, gainedScore } = slide(row);
        let finalRow = newRow;
        if (direction === 'right') finalRow = [...finalRow].reverse();

        if (JSON.stringify(nextBoard[r]) !== JSON.stringify(finalRow)) {
          boardChanged = true;
        }
        nextBoard[r] = finalRow;
        totalGainedScore += gainedScore;
      }
    } else {
      // UP or DOWN (transpose, slide, transpose back)
      for (let c = 0; c < 4; c++) {
        let col = [nextBoard[0][c], nextBoard[1][c], nextBoard[2][c], nextBoard[3][c]];
        if (direction === 'down') col = [...col].reverse();

        const { newRow, gainedScore } = slide(col);
        let finalCol = newRow;
        if (direction === 'down') finalCol = [...finalCol].reverse();

        for (let r = 0; r < 4; r++) {
          if (nextBoard[r][c] !== finalCol[r]) {
            boardChanged = true;
          }
          nextBoard[r][c] = finalCol[r];
        }
        totalGainedScore += gainedScore;
      }
    }

    if (boardChanged) {
      const boardWithNewTile = addRandomTile(nextBoard);
      setBoard(boardWithNewTile);
      
      const newScore = score + totalGainedScore;
      setScore(newScore);

      const isFinished = checkGameOver(boardWithNewTile);
      if (isFinished) {
        setGameOver(true);
        setIsPlaying(false);
        onGameOver(newScore);
        if (newScore > currentHighScore) {
          setCurrentHighScore(newScore);
          awardPoints();
        }
      }
    }
  }, [board, score, isPlaying, gameOver, addRandomTile, slide, checkGameOver, onGameOver, currentHighScore]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      const key = e.key || '';
      switch (key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          move(isRTL ? 'right' : 'left');
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          move(isRTL ? 'left' : 'right');
          e.preventDefault();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          move('up');
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          move('down');
          e.preventDefault();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, move, isRTL]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isPlaying || gameOver) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    
    const threshold = 35;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > threshold) {
        if (dx > 0) move(isRTL ? 'left' : 'right');
        else move(isRTL ? 'right' : 'left');
        touchStartRef.current = null;
      }
    } else {
      if (Math.abs(dy) > threshold) {
        if (dy > 0) move('down');
        else move('up');
        touchStartRef.current = null;
      }
    }
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white">
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-amber-600 dark:text-amber-400">
          {isRTL ? 'لعبة 2048 الرقمية' : '2048 Puzzle'} 🪙
        </h2>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest leading-none">
              {isRTL ? 'الرقم القياسي الحالي' : 'CURRENT HIGH SCORE'}
            </p>
            <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 leading-none">{currentHighScore}</p>
          </div>
        </div>
      </div>

      {/* Grid Game Board */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="relative my-auto p-4 rounded-3xl bg-slate-100/90 dark:bg-black/40 border border-slate-200 dark:border-white/10 backdrop-blur-xl max-w-[360px] mx-auto w-full aspect-square flex flex-col justify-center shadow-lg"
      >
        <div className="grid grid-cols-4 gap-3 aspect-square w-full">
          {board.map((row, rIdx) => 
            row.map((val, cIdx) => {
              const meta = getCoinMeta(val);
              return (
                <div 
                  key={`${rIdx}-${cIdx}`}
                  className={`aspect-square rounded-2xl border flex items-center justify-center font-black text-[13px] transition-all duration-300 ${meta.color} relative overflow-hidden`}
                >
                  {val > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
                  )}
                  {meta.label}
                </div>
              );
            })
          )}
        </div>

        {/* Start Overlay */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/75 rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-5xl text-amber-500 animate-bounce mb-3">toll</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">{isRTL ? 'لعبة 2048 الرقمية' : '2048 Classic Puzzle'}</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-[240px] leading-relaxed">
              {isRTL ? 'اسحب أو استخدم مفاتيح الأسهم لدمج الأرقام المتطابقة حتى تصل إلى 2048!' : 'Swipe or use Arrow Keys to merge matching numbers to reach the glowing 2048 tile!'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="mt-6 px-7 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-500/25"
            >
              {isRTL ? 'ابدأ اللعب الآن' : 'Start Playing'}
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-5xl text-rose-500 mb-3">sentiment_very_dissatisfied</span>
            <h3 className="text-xl font-black text-rose-500">{isRTL ? 'لا توجد حركات متاحة!' : 'NO MORE MOVES!'}</h3>
            <p className="text-sm font-black mt-2 text-slate-800 dark:text-white">
              {isRTL ? 'النتيجة النهائية' : 'Final Score'}: <span className="text-amber-600 dark:text-amber-400 text-lg">{score}</span>
            </p>
            {score >= currentHighScore && score > highScore && (
              <p className="text-xs font-black text-amber-500 dark:text-amber-400 mt-2 tracking-widest uppercase animate-pulse">
                👑 {isRTL ? 'رقم قياسي جديد!' : 'NEW HIGH SCORE!'} 👑
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
              >
                {isRTL ? 'أعد المحاولة' : 'Try Again'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="px-6 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                {isRTL ? 'العودة للمركز' : 'Leave Hub'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold pt-2">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'اسحب لدمج الأرقام...' : 'Swipe to merge numbers...'}</span>
            </div>
          )}
        </div>
        
        {/* Real-time score display */}
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 dark:text-white/35 uppercase tracking-widest leading-none">
            {isRTL ? 'النقاط الحالية' : 'SCORE'}
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{score}</p>
        </div>
      </div>

    </div>
  );
}
