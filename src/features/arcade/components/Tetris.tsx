import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/i18n/index';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface TetrisProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

// 10x20 classic grid
const COLS = 10;
const ROWS = 20;

// Tetromino shapes and their standard colors
const SHAPES = {
  I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] border-cyan-400' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] border-yellow-400' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] border-purple-400' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] border-green-400' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] border-red-400' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] border-blue-400' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] border-orange-400' }
};

type ShapeKey = keyof typeof SHAPES;
const SHAPE_KEYS: ShapeKey[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function Tetris({ highScore, onClose, onGameOver }: TetrisProps) {
  const { isRTL } = useI18n();
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
  const [score, setScore] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);

  // Active shape status
  const [currentPiece, setCurrentPiece] = useState<{
    shape: number[][];
    color: string;
    r: number;
    c: number;
  } | null>(null);

  const [nextPieceKey, setNextPieceKey] = useState<ShapeKey>('I');

  const gameIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({
    pointsAwardedToday: false,
    score,
    level,
    grid,
    currentPiece,
    nextPieceKey,
    gameOver
  });

  // Keep stateRef in sync to bypass stale closures in interval
  useEffect(() => {
    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score,
      level,
      grid,
      currentPiece,
      nextPieceKey,
      gameOver
    };
  }, [score, level, grid, currentPiece, nextPieceKey, gameOver]);

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('tetris')) {
      stateRef.current.pointsAwardedToday = true;
    }
    // Roll first next piece
    setNextPieceKey(SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)]);
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;

    const awarded = await useArcadeStore.getState().awardDailyPoints('tetris', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const spawnPiece = useCallback((nextKey: ShapeKey) => {
    const key = nextKey;
    const proto = SHAPES[key];
    const newNextKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    setNextPieceKey(newNextKey);

    const pieceWidth = proto.shape[0].length;
    const startCol = Math.floor((COLS - pieceWidth) / 2);

    const newPiece = {
      shape: proto.shape,
      color: proto.color,
      r: 0,
      c: startCol
    };

    // Check collision immediately at spawn (Game Over)
    if (checkCollision(newPiece.shape, newPiece.r, newPiece.c, stateRef.current.grid)) {
      setGameOver(true);
      setIsPlaying(false);
      onGameOver(stateRef.current.score);
      if (stateRef.current.score > 200) {
        awardPoints();
      }
      toast(isRTL ? 'انتهت اللعبة! محاولة رائعة.' : 'Game Over! Nice try.', 'error');
    } else {
      setCurrentPiece(newPiece);
    }
  }, [isRTL, onGameOver]);

  const startNewGame = () => {
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    setGameOver(false);
    setIsPlaying(true);
    
    const initialKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    const nextKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    setNextPieceKey(nextKey);

    const proto = SHAPES[initialKey];
    const startCol = Math.floor((COLS - proto.shape[0].length) / 2);

    setCurrentPiece({
      shape: proto.shape,
      color: proto.color,
      r: 0,
      c: startCol
    });
  };

  const checkCollision = (shape: number[][], r: number, c: number, currentGrid: string[][]): boolean => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const nextR = r + row;
          const nextC = c + col;

          if (nextR >= ROWS || nextC < 0 || nextC >= COLS) {
            return true;
          }

          if (nextR >= 0 && currentGrid[nextR][nextC] !== '') {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergePieceToGrid = (piece: { shape: number[][]; color: string; r: number; c: number }) => {
    const nextGrid = stateRef.current.grid.map(row => [...row]);
    
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0) {
          const gridR = piece.r + r;
          const gridC = piece.c + c;
          if (gridR >= 0 && gridR < ROWS && gridC >= 0 && gridC < COLS) {
            nextGrid[gridR][gridC] = piece.color;
          }
        }
      }
    }

    // Check line clears
    const linesToClear: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (nextGrid[r].every(cell => cell !== '')) {
        linesToClear.push(r);
      }
    }

    if (linesToClear.length > 0) {
      // Filter out completed rows and add empty ones on top
      const clearedGrid = nextGrid.filter((_, idx) => !linesToClear.includes(idx));
      const emptyRows = Array(linesToClear.length).fill(null).map(() => Array(COLS).fill(''));
      setGrid([...emptyRows, ...clearedGrid]);

      const nextLines = linesCleared + linesToClear.length;
      setLinesCleared(nextLines);

      // Score formula based on lines cleared
      const lineScoreBonus = [0, 40, 100, 300, 1200];
      const addedScore = lineScoreBonus[Math.min(linesToClear.length, 4)] * level;
      const nextScore = score + addedScore;
      setScore(nextScore);

      if (nextScore > currentHighScore) {
        setCurrentHighScore(nextScore);
      }

      // Check level up (every 5 lines)
      const nextLevel = Math.floor(nextLines / 5) + 1;
      if (nextLevel > level) {
        setLevel(nextLevel);
        toast(isRTL ? `المستوى التالي: ${nextLevel}! 🚀` : `Level Up: ${nextLevel}! 🚀`, 'success');
      }
    } else {
      setGrid(nextGrid);
    }

    // Spawn next piece
    spawnPiece(stateRef.current.nextPieceKey);
  };

  const moveDown = useCallback(() => {
    const piece = stateRef.current.currentPiece;
    if (!piece || stateRef.current.gameOver || !isPlaying) return;

    if (!checkCollision(piece.shape, piece.r + 1, piece.c, stateRef.current.grid)) {
      setCurrentPiece({ ...piece, r: piece.r + 1 });
    } else {
      mergePieceToGrid(piece);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, spawnPiece]);

  const moveLeft = () => {
    const piece = stateRef.current.currentPiece;
    if (!piece || gameOver || !isPlaying) return;

    if (!checkCollision(piece.shape, piece.r, piece.c - 1, stateRef.current.grid)) {
      setCurrentPiece({ ...piece, c: piece.c - 1 });
    }
  };

  const moveRight = () => {
    const piece = stateRef.current.currentPiece;
    if (!piece || gameOver || !isPlaying) return;

    if (!checkCollision(piece.shape, piece.r, piece.c + 1, stateRef.current.grid)) {
      setCurrentPiece({ ...piece, c: piece.c + 1 });
    }
  };

  const rotate = () => {
    const piece = stateRef.current.currentPiece;
    if (!piece || gameOver || !isPlaying) return;

    // Transpose and reverse rows for clockwise rotation
    const transposed = piece.shape[0].map((_, colIndex) =>
      piece.shape.map(row => row[colIndex])
    );
    const rotatedShape = transposed.map(row => row.reverse());

    // Check collision and adjust position if needed (wall kick)
    let newCol = piece.c;
    if (newCol + rotatedShape[0].length > COLS) {
      newCol = COLS - rotatedShape[0].length;
    }
    if (newCol < 0) newCol = 0;

    if (!checkCollision(rotatedShape, piece.r, newCol, stateRef.current.grid)) {
      setCurrentPiece({ ...piece, shape: rotatedShape, c: newCol });
    }
  };

  const dropHard = () => {
    const piece = stateRef.current.currentPiece;
    if (!piece || gameOver || !isPlaying) return;

    let currentR = piece.r;
    while (!checkCollision(piece.shape, currentR + 1, piece.c, stateRef.current.grid)) {
      currentR++;
    }

    const droppedPiece = { ...piece, r: currentR };
    setCurrentPiece(droppedPiece);
    mergePieceToGrid(droppedPiece);
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || !isPlaying) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          dropHard();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver, moveDown]);

  // Set up game loop tick
  useEffect(() => {
    if (isPlaying && !gameOver) {
      const speed = Math.max(800 - (level - 1) * 80, 100); // Speed up as level increases
      gameIntervalRef.current = setInterval(() => {
        moveDown();
      }, speed);
    }

    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, [isPlaying, gameOver, level, moveDown]);

  // Render combined view of grid + falling piece
  const getRenderGrid = () => {
    const render = grid.map(row => [...row]);
    if (currentPiece && isPlaying && !gameOver) {
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c] !== 0) {
            const gridR = currentPiece.r + r;
            const gridC = currentPiece.c + c;
            if (gridR >= 0 && gridR < ROWS && gridC >= 0 && gridC < COLS) {
              render[gridR][gridC] = currentPiece.color;
            }
          }
        }
      }
    }
    return render;
  };

  const renderedGrid = getRenderGrid();

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
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">
          {isRTL ? 'التتريس النيوني' : 'Neon Tetris Shift'}
        </h2>
        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-cyan-500 dark:text-cyan-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-cyan-600 dark:text-cyan-300">
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="w-full flex gap-3 items-stretch justify-center my-auto">
        {/* Left Side: Score & Info */}
        <div className="flex flex-col justify-between w-28 bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-3.5 rounded-3xl space-y-3 shadow-sm">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              {isRTL ? 'النقاط' : 'Score'}
            </span>
            <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 drop-shadow-sm">
              {score}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              {isRTL ? 'المستوى' : 'Level'}
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
              {level}
            </div>
          </div>

          {/* Next Piece Display */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
              {isRTL ? 'التالي' : 'Next'}
            </span>
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900/60 rounded-2xl flex items-center justify-center border border-slate-200/80 dark:border-white/5">
              {/* Draw small representation of next piece */}
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${SHAPES[nextPieceKey].shape[0].length}, minmax(0, 1fr))` }}>
                {SHAPES[nextPieceKey].shape.map((row, ri) =>
                  row.map((cell, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      className={`w-2.5 h-2.5 rounded-sm ${cell !== 0 ? SHAPES[nextPieceKey].color : 'bg-transparent'}`}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Side: Tetris Game Grid */}
        <div className="relative w-[180px] h-[340px] bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[2rem] p-2 shadow-lg overflow-hidden">
          <div className="grid grid-cols-10 grid-rows-20 gap-0.5 h-full w-full">
            {renderedGrid.map((row, r) =>
              row.map((color, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`rounded-sm transition-all duration-75 ${
                    color !== '' ? color + ' border border-white/20' : 'bg-slate-200/30 dark:bg-white/[0.02]'
                  }`}
                />
              ))
            )}
          </div>

          {/* Start Screen Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-[2rem] z-30">
              <span className="material-symbols-outlined text-4xl text-cyan-500 dark:text-cyan-400 drop-shadow-sm mb-3">
                grid_view
              </span>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4">
                {gameOver 
                  ? (isRTL ? 'انتهت اللعبة! 💔' : 'Game Over! 💔') 
                  : (isRTL ? 'جاهز للتحدي؟ 🕹️' : 'Ready to Slide? 🕹️')
                }
              </h3>
              <button
                onClick={startNewGame}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl text-xs font-black shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                {isRTL ? 'بدء اللعب' : 'Start Game'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* D-Pad Touch Controller for Mobile */}
      <div className="w-full bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 p-3.5 rounded-3xl flex flex-col gap-2.5 shadow-sm mt-2">
        <div className="flex justify-center gap-4">
          <button
            onClick={rotate}
            disabled={!isPlaying || gameOver}
            className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center active:scale-90 active:bg-cyan-500/20 active:border-cyan-500/30 transition-all text-slate-700 dark:text-slate-300 shadow-xs"
          >
            <span className="material-symbols-outlined text-xl">rotate_right</span>
          </button>
        </div>

        <div className="flex justify-around items-center">
          <button
            onClick={moveLeft}
            disabled={!isPlaying || gameOver}
            className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center active:scale-90 active:bg-cyan-500/20 active:border-cyan-500/30 transition-all text-slate-700 dark:text-slate-300 shadow-xs"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>

          <button
            onClick={dropHard}
            disabled={!isPlaying || gameOver}
            className="w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-center active:scale-90 shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-xl">arrow_downward</span>
          </button>

          <button
            onClick={moveRight}
            disabled={!isPlaying || gameOver}
            className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center active:scale-90 active:bg-cyan-500/20 active:border-cyan-500/30 transition-all text-slate-700 dark:text-slate-300 shadow-xs"
          >
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
