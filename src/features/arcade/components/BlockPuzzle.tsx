import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface BlockPuzzleProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Shape {
  matrix: number[][];
  color: string;
}

export function BlockPuzzle({ highScore, onClose, onGameOver }: BlockPuzzleProps) {
  const { t, isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [availableShapes, setAvailableShapes] = useState<(Shape | null)[]>([]);
  const [selectedShapeIdx, setSelectedShapeIdx] = useState<number | null>(null);

  const gameLoopRef = useRef<number | null>(null);

  // Predefined Tetris-style shapes
  const shapes: Shape[] = [
    { matrix: [[1]], color: '#ec4899' }, // 1x1 Dot
    { matrix: [[1, 1]], color: '#3b82f6' }, // 1x2 Line
    { matrix: [[1, 1, 1]], color: '#10b981' }, // 1x3 Line
    { matrix: [[1], [1]], color: '#3b82f6' }, // 2x1 Vertical Line
    { matrix: [[1], [1], [1]], color: '#10b981' }, // 3x1 Vertical Line
    { matrix: [[1, 1], [1, 1]], color: '#f59e0b' }, // 2x2 Block
    { matrix: [[1, 0], [1, 1]], color: '#a855f7' }, // L-shape small
    { matrix: [[0, 1], [1, 1]], color: '#a855f7' }  // Reverse L-shape small
  ];

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    grid: Array(10).fill(null).map(() => Array(10).fill(null)) as (string | null)[][], // 10x10 grid holding colors
    ticks: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('blockpuzzle')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('blockpuzzle', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const generateNewShapes = () => {
    const newShapes: Shape[] = [];

    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * shapes.length);
      newShapes.push(shapes[idx]);
    }
    setAvailableShapes(newShapes);
    setSelectedShapeIdx(null);
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      grid: Array(10).fill(null).map(() => Array(10).fill(null)),
      ticks: 0
    };

    generateNewShapes();

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.ticks++;

    // DRAW STAGE
    const isDarkCurrent = isDarkRef.current;
    ctx.fillStyle = isDarkCurrent ? '#0b0f19' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = canvas.width / 10;

    // Draw Grid details
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const val = state.grid[r][c];

        ctx.strokeStyle = isDarkCurrent ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * tileSize, r * tileSize, tileSize, tileSize);

        if (val) {
          ctx.fillStyle = val;
          ctx.shadowBlur = isDarkCurrent ? 8 : 2;
          ctx.shadowColor = val;
          ctx.fillRect(c * tileSize + 1.5, r * tileSize + 1.5, tileSize - 3, tileSize - 3);
        } else {
          ctx.fillStyle = isDarkCurrent ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.02)';
          ctx.fillRect(c * tileSize + 1.5, r * tileSize + 1.5, tileSize - 3, tileSize - 3);
        }
        ctx.shadowBlur = 0; // reset
      }
    }

    gameLoopRef.current = requestAnimationFrame(update);
  };

  const canPlaceShape = (grid: (string | null)[][], shape: Shape, r: number, c: number): boolean => {
    const sRows = shape.matrix.length;
    const sCols = shape.matrix[0].length;

    if (r + sRows > 10 || c + sCols > 10) return false;

    for (let i = 0; i < sRows; i++) {
      for (let j = 0; j < sCols; j++) {
        if (shape.matrix[i][j] === 1) {
          if (grid[r + i][c + j] !== null) return false;
        }
      }
    }
    return true;
  };

  const handleGridClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver || selectedShapeIdx === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tileSize = rect.width / 10;
    const c = Math.floor(clickX / tileSize);
    const r = Math.floor(clickY / tileSize);

    const shape = availableShapes[selectedShapeIdx];
    if (!shape) return;
    const state = stateRef.current;

    if (canPlaceShape(state.grid, shape, r, c)) {
      // Place it
      const sRows = shape.matrix.length;
      const sCols = shape.matrix[0].length;

      for (let i = 0; i < sRows; i++) {
        for (let j = 0; j < sCols; j++) {
          if (shape.matrix[i][j] === 1) {
            state.grid[r + i][c + j] = shape.color;
          }
        }
      }

      state.score += (sRows * sCols) * 10;
      setScore(state.score);

      // Remove placed shape
      const nextShapes = [...availableShapes];
      nextShapes[selectedShapeIdx] = null; // placeholder
      setAvailableShapes(nextShapes);
      setSelectedShapeIdx(null);

      // Check lines clear
      checkLinesToClear();

      // Check if all 3 shapes placed, generate new ones
      const remainingCount = nextShapes.filter(s => s !== null).length;
      if (remainingCount === 0) {
        generateNewShapes();
      } else {
        // Check game over (if remaining shapes can be placed anywhere on board)
        checkGameOverStatus(nextShapes);
      }
    } else {
      toast(isRTL ? 'لا يمكن وضع القطعة في هذا الموقع!' : 'Invalid block placement location!', 'error');
    }
  };

  const checkLinesToClear = () => {
    const state = stateRef.current;
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    // Horizontal check
    for (let r = 0; r < 10; r++) {
      let isFull = true;
      for (let c = 0; c < 10; c++) {
        if (state.grid[r][c] === null) {
          isFull = false;
          break;
        }
      }
      if (isFull) rowsToClear.push(r);
    }

    // Vertical check
    for (let c = 0; c < 10; c++) {
      let isFull = true;
      for (let r = 0; r < 10; r++) {
        if (state.grid[r][c] === null) {
          isFull = false;
          break;
        }
      }
      if (isFull) colsToClear.push(c);
    }

    if (rowsToClear.length === 0 && colsToClear.length === 0) return;

    // Explode and Clear
    rowsToClear.forEach(r => {
      for (let c = 0; c < 10; c++) {
        state.grid[r][c] = null;
      }
    });

    colsToClear.forEach(c => {
      for (let r = 0; r < 10; r++) {
        state.grid[r][c] = null;
      }
    });

    const linesCount = rowsToClear.length + colsToClear.length;
    state.score += linesCount * 150;
    setScore(state.score);

    toast(isRTL ? `رائع! تدمير ${linesCount} خطوط مكتملة! 🎉` : `Awesome! Clear ${linesCount} lines! 🎉`, 'success');
  };

  const checkGameOverStatus = (currentShapes: (Shape | null)[]) => {
    const state = stateRef.current;

    // If there is at least one remaining shape that can be placed, it's not game over
    for (let idx = 0; idx < currentShapes.length; idx++) {
      const shape = currentShapes[idx];
      if (!shape) continue;

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (canPlaceShape(state.grid, shape, r, c)) {
            return; // Not game over!
          }
        }
      }
    }

    // No moves left for any of the shapes - Game Over!
    setIsPlaying(false);
    setGameOver(true);
    onGameOver(state.score);
    if (state.score > currentHighScore) {
      setCurrentHighScore(state.score);
      awardPoints();
    }
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Top Controls */}
      <div className="relative z-10 flex items-center justify-between">
        <button aria-label={t('action.close') || 'Close'} 
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
        </button>
        
        <h2 className="text-xl font-black tracking-tighter text-emerald-500 dark:text-emerald-400">
          {t('arcade.blockpuzzle.title') || 'لغز الكتل'} 🔲
        </h2>

        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-300">
          <span className="material-symbols-outlined text-emerald-500 dark:text-emerald-400 text-sm">emoji_events</span>
          <span>
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,320px)] aspect-square border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={280} 
          height={280} 
          onClick={handleGridClick}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-emerald-500 dark:text-emerald-400 animate-bounce mb-2">grid_view</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-emerald-200">{isRTL ? 'تحدي لغز الكتل الشبكي' : 'Neon Block Puzzle'}</h3>
            
            {/* Difficulty */}
            <div className="flex gap-1.5 my-3 relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'easy' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'سهل' : 'Easy'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'medium' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'متوسط' : 'Medium'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'hard' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'صعب 🔥' : 'Hard 🔥'}
              </button>
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[200px] mb-3 leading-snug">
              {isRTL ? 'رتب الكتل الشبكية لتعبئة صفوف مكتملة وتفجيرها! مكافآت: 5، 15، 30 نقطة.' : 'Arrange blocks on the 10x10 board to clear lines. Rewards: 5, 15, 30 pts.'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-emerald-500/20"
            >
              {isRTL ? 'ابدأ اللعب' : 'Start'}
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">sentiment_very_dissatisfied</span>
            <h3 className="text-sm font-black text-rose-500">{isRTL ? 'لا توجد حركات متبقية! 💔' : 'NO MOVES LEFT! 💔'}</h3>
            <p className="text-xs font-bold mt-2 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط المحرزة' : 'Final Score'}: <span className="text-emerald-600 dark:text-emerald-400 font-black">{score}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
              >
                {isRTL ? 'أعد المحاولة' : 'Try Again'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="px-5 py-2 rounded-2xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                {isRTL ? 'خروج' : 'Leave'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Available Shapes Shelf */}
      {isPlaying && (
        <div className="flex gap-3 items-center justify-center bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-2.5 select-none relative z-10 my-1 min-h-[70px]">
          {availableShapes.map((shape, idx) => {
            if (!shape) return <div key={idx} className="w-14 h-14 bg-slate-200/50 dark:bg-black/10 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-center opacity-30 text-[9px]">✅</div>;
            const isSelected = selectedShapeIdx === idx;
            return (
              <div
                key={idx}
                onClick={(e) => { e.stopPropagation(); setSelectedShapeIdx(idx); }}
                className={`w-14 h-14 bg-white dark:bg-black/35 border rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 shadow-sm ${
                  isSelected 
                    ? 'border-emerald-500 shadow-md shadow-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/10' 
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {/* Miniature shape matrix */}
                <div className="flex flex-col gap-0.5 scale-90">
                  {shape.matrix.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-0.5">
                      {row.map((val, cIdx) => (
                        <div
                          key={cIdx}
                          className={`w-2.5 h-2.5 rounded-sm ${val === 1 ? '' : 'opacity-0'}`}
                          style={{ backgroundColor: shape.color }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* On-Screen Instruction */}
      <div className="text-center text-[10px] font-bold text-slate-400 dark:text-white/30 my-1">
        {isRTL ? 'اختر قطعة من الأسفل، ثم انقر في الشبكة لوضعها' : 'Select a block below, then tap inside the board'}
      </div>

      {/* Info Stats Bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'ترتيب نشط...' : 'Puzzle live...'}</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">
            {isRTL ? 'النقاط' : 'SCORE'}
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{score}</p>
        </div>
      </div>
    </div>
  );
}
