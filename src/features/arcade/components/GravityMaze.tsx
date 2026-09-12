import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface GravityMazeProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

export function GravityMaze({ highScore, onClose, onGameOver }: GravityMazeProps) {
  const { t, isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [currentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const gameOverRef = useRef(false);
  const gameWonRef = useRef(false);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { gameWonRef.current = gameWon; }, [gameWon]);

  const mazeRows = 9;
  const mazeCols = 9;

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    lives: 3,
    grid: [] as number[][],
    ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 7 },
    ticks: 0,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('maze')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const diff = stateRef.current?.difficulty || 'medium';
    const pts = diff === 'easy' ? 5 : diff === 'hard' ? 25 : 15;
    const awarded = await useArcadeStore.getState().awardDailyPoints('maze', pts);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const generateMazeGrid = (diff: 'easy' | 'medium' | 'hard'): number[][] => {
    const grid: number[][] = Array(mazeRows).fill(null).map(() => Array(mazeCols).fill(1));
    const stack: [number, number][] = [];
    grid[1][1] = 0;
    stack.push([1, 1]);

    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = [];
      const dirs = [[-2,0,-1,0],[2,0,1,0],[0,-2,0,-1],[0,2,0,1]];

      dirs.forEach(([dr, dc, wr, wc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr > 0 && nr < mazeRows-1 && nc > 0 && nc < mazeCols-1 && grid[nr][nc] === 1) {
          neighbors.push([nr, nc, r+wr, c+wc]);
        }
      });

      if (neighbors.length > 0) {
        const [nr, nc, wr, wc] = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[wr][wc] = 0;
        grid[nr][nc] = 0;
        stack.push([nr, nc]);
      } else {
        stack.pop();
      }
    }

    grid[mazeRows-2][mazeCols-2] = 2; // Goal

    const pitCount = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 4;
    let spawnedPits = 0, attempts = 0;
    while (spawnedPits < pitCount && attempts < 200) {
      attempts++;
      const r = Math.floor(Math.random() * (mazeRows - 2)) + 1;
      const c = Math.floor(Math.random() * (mazeCols - 2)) + 1;
      if (grid[r][c] === 0 && !(r===1 && c===1) && !(r===mazeRows-2 && c===mazeCols-2)) {
        grid[r][c] = 3;
        spawnedPits++;
      }
    }
    return grid;
  };

  const startGame = useCallback(() => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
    setLives(3);
    setScore(0);

    isPlayingRef.current = true;
    gameOverRef.current = false;
    gameWonRef.current = false;

    const generatedGrid = generateMazeGrid(difficulty);
    const tileSize = 280 / mazeCols;

    stateRef.current = {
      ...stateRef.current,
      score: 0,
      lives: 3,
      grid: generatedGrid,
      ball: { x: tileSize * 1 + tileSize / 2, y: tileSize * 1 + tileSize / 2, vx: 0, vy: 0, radius: 7 },
      ticks: 0,
      difficulty,
    };

    gameLoopRef.current = requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const canMoveTo = (x: number, y: number, r: number, grid: number[][], tileSize: number): boolean => {
    const offsets = [-r + 2, r - 2];
    for (const ox of offsets) {
      for (const oy of offsets) {
        const checkC = Math.floor((x + ox) / tileSize);
        const checkR = Math.floor((y + oy) / tileSize);
        if (checkR < 0 || checkR >= mazeRows || checkC < 0 || checkC >= mazeCols) return false;
        if (grid[checkR][checkC] === 1) return false;
      }
    }
    return true;
  };

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.ticks++;

    const tileSize = canvas.width / mazeCols;
    const b = state.ball;

    b.vx *= 0.95;
    b.vy *= 0.95;

    const newX = b.x + b.vx;
    if (canMoveTo(newX, b.y, b.radius, state.grid, tileSize)) {
      b.x = newX;
    } else {
      b.vx = 0;
    }

    const newY = b.y + b.vy;
    if (canMoveTo(b.x, newY, b.radius, state.grid, tileSize)) {
      b.y = newY;
    } else {
      b.vy = 0;
    }

    const centerC = Math.floor(b.x / tileSize);
    const centerR = Math.floor(b.y / tileSize);

    if (centerR >= 0 && centerR < mazeRows && centerC >= 0 && centerC < mazeCols) {
      const tileVal = state.grid[centerR][centerC];

      if (tileVal === 2) {
        // WIN
        cancelAnimationFrame(gameLoopRef.current!);
        gameLoopRef.current = null;
        const pts = state.difficulty === 'easy' ? 200 : state.difficulty === 'hard' ? 600 : 350;
        state.score = pts;
        setScore(pts);
        setIsPlaying(false);
        setGameWon(true);
        isPlayingRef.current = false;
        gameWonRef.current = true;
        awardPoints();
        onGameOver(pts);
        drawFrame(ctx, state, tileSize, canvas.width, canvas.height);
        return;
      }

      if (tileVal === 3) {
        // PIT FALL
        state.lives--;
        setLives(state.lives);
        b.x = tileSize * 1 + tileSize / 2;
        b.y = tileSize * 1 + tileSize / 2;
        b.vx = 0;
        b.vy = 0;

        if (state.lives <= 0) {
          cancelAnimationFrame(gameLoopRef.current!);
          gameLoopRef.current = null;
          setIsPlaying(false);
          setGameOver(true);
          isPlayingRef.current = false;
          gameOverRef.current = true;
          onGameOver(state.score);
          drawFrame(ctx, state, tileSize, canvas.width, canvas.height);
          return;
        } else {
          toast(isRTL ? 'سقطت في الحفرة! تبقى لك ' + state.lives + ' أرواح.' : `Fell in pit! ${state.lives} lives left.`, 'error');
        }
      }
    }

    drawFrame(ctx, state, tileSize, canvas.width, canvas.height);
    gameLoopRef.current = requestAnimationFrame(loop);
  };

  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    state: typeof stateRef.current,
    tileSize: number,
    w: number,
    h: number
  ) => {
    const isDarkCurrent = isDarkRef.current;
    ctx.fillStyle = isDarkCurrent ? '#0b0f19' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < mazeRows; r++) {
      for (let c = 0; c < mazeCols; c++) {
        const val = state.grid[r][c];
        const tx = c * tileSize;
        const ty = r * tileSize;

        if (val === 1) {
          ctx.fillStyle = isDarkCurrent ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.15)';
          ctx.strokeStyle = isDarkCurrent ? 'rgba(59,130,246,0.6)' : 'rgba(37,99,235,0.4)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = isDarkCurrent ? 3 : 1;
          ctx.shadowColor = 'rgba(59,130,246,0.5)';
          ctx.fillRect(tx + 0.5, ty + 0.5, tileSize - 1, tileSize - 1);
          ctx.strokeRect(tx + 0.5, ty + 0.5, tileSize - 1, tileSize - 1);
          ctx.shadowBlur = 0;
        } else if (val === 2) {
          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = isDarkCurrent ? 14 : 4;
          ctx.shadowColor = '#10b981';
          ctx.beginPath();
          ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff';
          ctx.font = `${tileSize * 0.4}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', tx + tileSize / 2, ty + tileSize / 2);
        } else if (val === 3) {
          ctx.fillStyle = '#ef4444';
          ctx.shadowBlur = isDarkCurrent ? 10 : 3;
          ctx.shadowColor = '#ef4444';
          ctx.beginPath();
          ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize / 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff';
          ctx.font = `${tileSize * 0.35}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🕳️', tx + tileSize / 2, ty + tileSize / 2);
        } else {
          // Path — subtle floor
          ctx.fillStyle = isDarkCurrent ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
          ctx.fillRect(tx, ty, tileSize, tileSize);
        }
      }
    }

    // Draw ball
    const b = state.ball;
    ctx.fillStyle = '#06b6d4';
    ctx.shadowBlur = isDarkCurrent ? 14 : 3;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight ring
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current || gameOverRef.current || gameWonRef.current) return;
      const b = stateRef.current.ball;
      const force = 3.2;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          b.vy = -force; e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S':
          b.vy = force; e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A':
          b.vx = -force; e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D':
          b.vx = force; e.preventDefault(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  const handleDpadPress = (dx: number, dy: number) => {
    if (!isPlayingRef.current || gameOverRef.current || gameWonRef.current) return;
    const b = stateRef.current.ball;
    const force = 2.8;
    if (dx !== 0) b.vx = dx > 0 ? force : -force;
    if (dy !== 0) b.vy = dy > 0 ? force : -force;
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Top Controls */}
      <div className="relative z-10 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <h2 className="text-xl font-black tracking-tighter text-cyan-500 dark:text-cyan-400">
          {t('arcade.gravitymaze.title') || 'متاهة الجاذبية'} 🌀
        </h2>

        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-cyan-600 dark:text-cyan-300">
          <span className="material-symbols-outlined text-cyan-500 dark:text-cyan-400 text-sm">favorite</span>
          <span>
            {'❤️'.repeat(Math.max(0, lives))} {lives}
          </span>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,320px)] aspect-square border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/50 backdrop-blur-xl overflow-hidden">
        <canvas ref={canvasRef} width={280} height={280} className="w-full h-full object-contain" />

        {/* Start Screen */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-cyan-500 dark:text-cyan-400 animate-bounce mb-2">blur_on</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-cyan-200 mb-2">{isRTL ? 'متاهة الجاذبية' : 'Gravity Maze'}</h3>

            <div className="flex gap-1.5 my-2 relative z-20">
              {(['easy','medium','hard'] as const).map(d => (
                <button
                  key={d}
                  onClick={(e) => { e.stopPropagation(); setDifficulty(d); }}
                  className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                    difficulty === d
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-200'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {d === 'easy' ? (isRTL ? 'سهل' : 'Easy') : d === 'medium' ? (isRTL ? 'متوسط' : 'Med') : (isRTL ? 'صعب 🔥' : 'Hard 🔥')}
                </button>
              ))}
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[190px] mb-3 leading-snug">
              {isRTL
                ? 'حرك الكرة السماوية لتصل للنجمة الخضراء وتجنب الحفر! 3 أرواح.'
                : 'Roll cyan ball into ⭐ goal. Avoid 🕳️ pits! 3 lives.'}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-cyan-500/30"
            >
              {isRTL ? 'ابدأ التحدي' : 'Start'}
            </button>
          </div>
        )}

        {/* Game Over / Win Screen */}
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl mb-2" style={{ color: gameWon ? '#10b981' : '#ef4444' }}>
              {gameWon ? 'emoji_events' : 'sentiment_very_dissatisfied'}
            </span>
            <h3 className={`text-sm font-black ${gameWon ? 'text-cyan-500 dark:text-cyan-400' : 'text-rose-500'}`}>
              {gameWon ? (isRTL ? 'انتصار! 🎉🏆' : 'VICTORY! 🎉🏆') : (isRTL ? 'انتهت الأرواح! 💔' : 'GAME OVER! 💔')}
            </h3>
            <p className="text-xs font-bold mt-1 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط' : 'Score'}: <span className="text-cyan-600 dark:text-cyan-400 font-black">{score}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                {isRTL ? 'أعد المحاولة' : 'Retry'}
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

      {/* Tactile 48px D-Pad */}
      <div className="grid grid-cols-3 gap-2 max-w-[170px] mx-auto select-none relative z-10 my-2">
        <div />
        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(0, -1); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_up</span>
        </button>
        <div />

        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(-1, 0); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_left</span>
        </button>
        <div className="w-12 h-12 flex items-center justify-center text-cyan-500/30">
          <span className="material-symbols-outlined text-xs">circle</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(1, 0); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_right</span>
        </button>

        <div />
        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(0, 1); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_down</span>
        </button>
        <div />
      </div>

      {/* Stats */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'يلعب...' : 'Playing...'}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">
            {isRTL ? 'الرقم القياسي' : 'HIGH SCORE'}
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{currentHighScore}</p>
        </div>
      </div>
    </div>
  );
}
