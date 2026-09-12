import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { useArcadeStore } from '../store/arcadeStore';

interface Match3Props {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Gem {
  id: number;
  type: number;
  x: number;     // visual x (col index, fractional during animation)
  y: number;     // visual y (row index, fractional during animation)
  targetX: number;
  targetY: number;
}

type Particle = { x: number; y: number; vx: number; vy: number; color: string; life: number };

const COLS = 6;
const ROWS = 6;
const ANIM_SPEED = 0.22;
const GEM_COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4'];
const GEM_SYMBOLS = ['💎', '🌟', '💚', '👑', '⭐', '💠'];

export function Match3({ highScore, onClose, onGameOver }: Match3Props) {
  const { t, isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying]   = useState(false);
  const [score, setScore]           = useState(0);
  const [movesLeft, setMovesLeft]   = useState(20);
  const [gameOver, setGameOver]     = useState(false);
  const [gameWon, setGameWon]       = useState(false);
  const [_currentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const rafRef     = useRef<number | null>(null);
  const nextGemId  = useRef(0);
  const genRef     = useRef(0);
  const timerRefs  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    moves: 20,
    grid: [] as (Gem | null)[][],
    selected: null as { r: number; c: number } | null,
    isAnimating: false,
    particles: [] as Particle[],
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('match3')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async (diff: 'easy' | 'medium' | 'hard') => {
    if (stateRef.current.pointsAwardedToday) return;
    const pts = diff === 'easy' ? 5 : diff === 'hard' ? 30 : 15;
    const awarded = await useArcadeStore.getState().awardDailyPoints('match3', pts);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const clearAllTimers = () => {
    timerRefs.current.forEach(id => clearTimeout(id));
    timerRefs.current = [];
  };

  const safeDelay = (fn: () => void, ms: number, gen: number) => {
    const id = setTimeout(() => {
      if (genRef.current === gen) fn();
    }, ms);
    timerRefs.current.push(id);
  };

  const initGrid = (): (Gem | null)[][] => {
    const grid: (Gem | null)[][] = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let attempts = 0, type = 0;
        do {
          type = Math.floor(Math.random() * GEM_COLORS.length);
          attempts++;
        } while (
          attempts < 50 &&
          ((r >= 2 && grid[r-1][c]?.type === type && grid[r-2][c]?.type === type) ||
           (c >= 2 && grid[r][c-1]?.type === type && grid[r][c-2]?.type === type))
        );
        grid[r][c] = {
          id: nextGemId.current++,
          type,
          x: c, y: r - ROWS,
          targetX: c, targetY: r,
        };
      }
    }
    return grid;
  };

  const findMatches = (grid: (Gem | null)[][]): { r: number; c: number }[] => {
    const hits: { r: number; c: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const tVal = grid[r][c]?.type;
        if (tVal !== undefined && grid[r][c+1]?.type === tVal && grid[r][c+2]?.type === tVal)
          hits.push({ r, c }, { r, c: c+1 }, { r, c: c+2 });
      }
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const tVal = grid[r][c]?.type;
        if (tVal !== undefined && grid[r+1][c]?.type === tVal && grid[r+2][c]?.type === tVal)
          hits.push({ r, c }, { r: r+1, c }, { r: r+2, c });
      }
    }
    return hits.filter((v, i, a) => a.findIndex(x => x.r === v.r && x.c === v.c) === i);
  };

  const resolveMatches = useCallback((gen: number, diff: 'easy' | 'medium' | 'hard') => {
    if (genRef.current !== gen) return;
    const st = stateRef.current;
    const tileSize = 276 / COLS;
    const matches = findMatches(st.grid);
    if (matches.length === 0) return;

    matches.forEach(({ r, c }) => {
      const g = st.grid[r][c];
      if (g) {
        for (let i = 0; i < 7; i++) {
          st.particles.push({
            x: c * tileSize + tileSize / 2,
            y: r * tileSize + tileSize / 2,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: GEM_COLORS[g.type],
            life: 25 + Math.random() * 10,
          });
        }
      }
      st.grid[r][c] = null;
    });

    const gained = matches.length * 30;
    st.score += gained;
    setScore(st.score);

    if (st.score >= 1000) {
      setIsPlaying(false);
      setGameWon(true);
      awardPoints(diff);
      onGameOver(st.score);
      return;
    }

    safeDelay(() => {
      if (genRef.current !== gen) return;
      for (let c = 0; c < COLS; c++) {
        let emptyRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (st.grid[r][c] !== null) {
            if (r !== emptyRow) {
              const gem = st.grid[r][c]!;
              gem.targetY = emptyRow;
              st.grid[emptyRow][c] = gem;
              st.grid[r][c] = null;
            }
            emptyRow--;
          }
        }
        let spawnY = -1;
        for (let r = emptyRow; r >= 0; r--) {
          const type = Math.floor(Math.random() * GEM_COLORS.length);
          st.grid[r][c] = {
            id: nextGemId.current++,
            type,
            x: c, y: spawnY,
            targetX: c, targetY: r,
          };
          spawnY--;
        }
      }
      st.isAnimating = true;

      safeDelay(() => {
        if (genRef.current === gen) {
          resolveMatches(gen, diff);
        }
      }, 350, gen);
    }, 180, gen);
  }, [onGameOver]);

  const triggerSwap = (
    r1: number, c1: number,
    r2: number, c2: number,
    gen: number,
    diff: 'easy' | 'medium' | 'hard'
  ) => {
    const st = stateRef.current;
    const g1 = st.grid[r1][c1];
    const g2 = st.grid[r2][c2];
    if (!g1 || !g2) return;

    g1.targetX = c2; g1.targetY = r2;
    g2.targetX = c1; g2.targetY = r1;
    st.grid[r1][c1] = g2;
    st.grid[r2][c2] = g1;
    st.isAnimating = true;

    safeDelay(() => {
      if (genRef.current !== gen) return;
      const matches = findMatches(st.grid);
      if (matches.length === 0) {
        g1.targetX = c1; g1.targetY = r1;
        g2.targetX = c2; g2.targetY = r2;
        st.grid[r1][c1] = g1;
        st.grid[r2][c2] = g2;
        st.isAnimating = true;
      } else {
        st.moves--;
        setMovesLeft(st.moves);
        resolveMatches(gen, diff);

        if (st.moves <= 0 && st.score < 1000) {
          safeDelay(() => {
            if (genRef.current !== gen) return;
            setIsPlaying(false);
            setGameOver(true);
            onGameOver(st.score);
          }, 450, gen);
        }
      }
    }, 260, gen);
  };

  const runLoop = (gen: number) => {
    if (genRef.current !== gen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const st = stateRef.current;
    const tileSize = canvas.width / COLS;
    const isDarkCurrent = isDarkRef.current;

    ctx.fillStyle = isDarkCurrent ? '#0b0f19' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = isDarkCurrent ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * tileSize, 0); ctx.lineTo(i * tileSize, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * tileSize); ctx.lineTo(canvas.width, i * tileSize); ctx.stroke();
    }

    let moving = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = st.grid[r][c];
        if (!gem) continue;

        const dx = gem.targetX - gem.x;
        if (Math.abs(dx) > 0.01) {
          gem.x += Math.sign(dx) * Math.min(ANIM_SPEED, Math.abs(dx));
          moving = true;
        } else {
          gem.x = gem.targetX;
        }

        const dy = gem.targetY - gem.y;
        if (Math.abs(dy) > 0.01) {
          gem.y += Math.sign(dy) * Math.min(ANIM_SPEED, Math.abs(dy));
          moving = true;
        } else {
          gem.y = gem.targetY;
        }
      }
    }
    st.isAnimating = moving;

    // Particles
    ctx.save();
    st.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 28;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.life / 8), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    st.particles = st.particles.filter(p => p.life > 0);

    // Gems
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = st.grid[r][c];
        if (!gem) continue;

        const gx = gem.x * tileSize + tileSize / 2;
        const gy = gem.y * tileSize + tileSize / 2;
        const radius = tileSize / 2 - 5;
        const isSelected = st.selected?.r === gem.targetY && st.selected?.c === gem.targetX;

        ctx.save();
        if (isSelected) {
          ctx.shadowBlur = isDarkCurrent ? 18 : 6;
          ctx.shadowColor = GEM_COLORS[gem.type];
          ctx.fillStyle = isDarkCurrent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.arc(gx, gy, radius + 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = isDarkCurrent ? 8 : 2;
        ctx.shadowColor = GEM_COLORS[gem.type];
        ctx.fillStyle = GEM_COLORS[gem.type];
        ctx.beginPath();
        ctx.arc(gx, gy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Icon
        ctx.save();
        ctx.font = `${Math.round(tileSize * 0.38)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(GEM_SYMBOLS[gem.type], gx, gy);
        ctx.restore();
      }
    }

    rafRef.current = requestAnimationFrame(() => runLoop(gen));
  };

  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearAllTimers();

    genRef.current++;
    const gen = genRef.current;

    const maxMoves = difficulty === 'easy' ? 25 : difficulty === 'hard' ? 15 : 20;

    setIsPlaying(true); setGameOver(false); setGameWon(false);
    setScore(0); setMovesLeft(maxMoves);

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      moves: maxMoves,
      grid: initGrid(),
      selected: null,
      isAnimating: true,
      particles: [],
    };

    rafRef.current = requestAnimationFrame(() => runLoop(gen));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearAllTimers();
      genRef.current = -1;
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!isPlaying || gameOver || gameWon || st.isAnimating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const tileSize = rect.width / COLS;
    const col = Math.floor((e.clientX - rect.left) / tileSize);
    const row = Math.floor((e.clientY - rect.top) / tileSize);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

    if (!st.selected) {
      st.selected = { r: row, c: col };
    } else {
      const prev = st.selected;
      const dr = Math.abs(prev.r - row), dc = Math.abs(prev.c - col);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        triggerSwap(prev.r, prev.c, row, col, genRef.current, difficulty);
      }
      st.selected = null;
    }
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <button onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <h2 className="text-xl font-black tracking-tighter text-pink-500 dark:text-pink-400">
          {t('arcade.match3.title') || 'لغز الجواهر'} 🟪
        </h2>

        <div className="flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-pink-600 dark:text-pink-300">
          <span className="material-symbols-outlined text-pink-500 dark:text-pink-400 text-sm">schedule</span>
          <span>
            {isRTL ? `حركات: ${movesLeft}` : `Moves: ${movesLeft}`}
          </span>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,320px)] aspect-square border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/50 backdrop-blur-xl overflow-hidden">
        <canvas ref={canvasRef} width={276} height={276}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain cursor-pointer" />

        {/* Start Screen */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-pink-500 dark:text-pink-400 animate-bounce mb-2">layers</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-pink-200 mb-2">{isRTL ? 'لغز الجواهر المتطابقة' : 'Neon Gem Match-3'}</h3>

            <div className="flex gap-1.5 my-2 relative z-20">
              {(['easy','medium','hard'] as const).map(d => (
                <button key={d}
                  onClick={(e) => { e.stopPropagation(); setDifficulty(d); }}
                  className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                    difficulty === d
                      ? 'bg-pink-500/20 border-pink-500 text-pink-600 dark:text-pink-200'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}>
                  {d === 'easy' ? (isRTL ? 'سهل' : 'Easy') : d === 'medium' ? (isRTL ? 'متوسط' : 'Med') : (isRTL ? 'صعب 🔥' : 'Hard 🔥')}
                </button>
              ))}
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[200px] mb-3 leading-snug">
              {isRTL
                ? 'طابق 3 جواهر أو أكثر لتفجيرها. اجمع 1000 نقطة للفوز! مكافآت: 5، 15، 30 نقطة.'
                : 'Match 3+ gems to blast them. Reach 1000 pts to win! Rewards: 5, 15, 30 pts.'}
            </p>
            <button onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-pink-500/30">
              {isRTL ? 'ابدأ اللعب' : 'Start'}
            </button>
          </div>
        )}

        {/* End screen */}
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl mb-2" style={{ color: gameWon ? '#ec4899' : '#ef4444' }}>
              {gameWon ? 'emoji_events' : 'sentiment_very_dissatisfied'}
            </span>
            <h3 className={`text-sm font-black ${gameWon ? 'text-pink-500 dark:text-pink-400' : 'text-rose-500'}`}>
              {gameWon ? (isRTL ? 'انتصار! 🎉🏆' : 'VICTORY! 🏆') : (isRTL ? 'نفدت الحركات! 💔' : 'OUT OF MOVES! 💔')}
            </h3>
            <p className="text-xs font-bold mt-1 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط' : 'Score'}: <span className="text-pink-600 dark:text-pink-400 font-black">{score}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-pink-500 hover:bg-pink-400 text-white font-black text-xs uppercase transition-all active:scale-95 shadow-md">
                {isRTL ? 'أعد المحاولة' : 'Retry'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="px-5 py-2 rounded-2xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-black text-xs uppercase transition-all active:scale-95">
                {isRTL ? 'خروج' : 'Leave'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-[10px] font-bold text-slate-400 dark:text-white/30 my-1">
        {isRTL ? 'انقر على جوهرة ثم على جوهرة مجاورة للتبديل' : 'Tap a gem, then tap an adjacent gem to swap'}
      </div>

      {/* Score bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'تطابق...' : 'Matching...'}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">
            {isRTL ? 'النقاط / 1000' : 'SCORE / 1000'}
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 leading-none tabular-nums">{score}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
          style={{ width: `${Math.min(100, (score / 1000) * 100)}%` }}
        />
      </div>
    </div>
  );
}
