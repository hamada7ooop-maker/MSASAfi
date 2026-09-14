import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface LightRidersProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Point { x: number; y: number; }

export function LightRiders({ highScore, onClose, onGameOver }: LightRidersProps) {
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
  const [gameWon, setGameWon] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);

  // Refs to avoid stale closures in event handlers
  const isPlayingRef = useRef(false);
  const gameOverRef  = useRef(false);
  const gameWonRef   = useRef(false);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { gameOverRef.current  = gameOver;  }, [gameOver]);
  useEffect(() => { gameWonRef.current   = gameWon;   }, [gameWon]);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    player: { x: 50,  y: 120, dx: 2,  dy: 0, trail: [] as Point[], color: '#3b82f6' },
    cpu:    { x: 250, y: 120, dx: -2, dy: 0, trail: [] as Point[], color: '#ef4444' },
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    ticks: 0,
  });

  // ── Points check ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('riders')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const diff = stateRef.current.difficulty;
    const pts  = diff === 'easy' ? 5 : diff === 'hard' ? 30 : 15;
    const awarded = await useArcadeStore.getState().awardDailyPoints('riders', pts);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const checkTrailCollision = (pt: Point, trail: Point[], thresh: number): boolean => {
    for (const t of trail) {
      if (Math.hypot(pt.x - t.x, pt.y - t.y) < thresh) return true;
    }
    return false;
  };

  const drawTrail = (ctx: CanvasRenderingContext2D, trail: Point[], color: string) => {
    if (trail.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    ctx.restore();
  };

  // ── Game Loop ────────────────────────────────────────────────────────────────
  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const st = stateRef.current;
    st.ticks++;
    const p = st.player, c = st.cpu;

    // Save trails
    p.trail.push({ x: p.x, y: p.y });
    c.trail.push({ x: c.x, y: c.y });

    // Move player
    p.x += p.dx;
    p.y += p.dy;

    // CPU AI — simple reactive navigation
    const cpuSpeed = Math.abs(c.dx) || Math.abs(c.dy) || 2;
    const aheadX = c.x + c.dx * 10, aheadY = c.y + c.dy * 10;
    const blocked =
      aheadX < 4 || aheadX > W - 4 ||
      aheadY < 4 || aheadY > H - 4 ||
      checkTrailCollision({ x: aheadX, y: aheadY }, p.trail, 8) ||
      checkTrailCollision({ x: aheadX, y: aheadY }, c.trail, 8);

    if (blocked || Math.random() < 0.03) {
      const dirs = [
        { dx: cpuSpeed, dy: 0 }, { dx: -cpuSpeed, dy: 0 },
        { dx: 0, dy: cpuSpeed }, { dx: 0, dy: -cpuSpeed },
      ].filter(d => {
        if (d.dx === -c.dx && d.dy === -c.dy) return false; // no 180°
        const tx = c.x + d.dx * 14, ty = c.y + d.dy * 14;
        return tx >= 4 && tx <= W - 4 && ty >= 4 && ty <= H - 4 &&
          !checkTrailCollision({ x: tx, y: ty }, p.trail, 10) &&
          !checkTrailCollision({ x: tx, y: ty }, c.trail, 10);
      });
      if (dirs.length) {
        const pick = dirs[Math.floor(Math.random() * dirs.length)];
        c.dx = pick.dx; c.dy = pick.dy;
      }
    }

    c.x += c.dx; c.y += c.dy;

    // Collision checks
    const pCrashed =
      p.x < 0 || p.x > W || p.y < 0 || p.y > H ||
      checkTrailCollision(p, p.trail.slice(0, -6), 4) ||
      checkTrailCollision(p, c.trail, 4);

    const cCrashed =
      c.x < 0 || c.x > W || c.y < 0 || c.y > H ||
      checkTrailCollision(c, p.trail, 4) ||
      checkTrailCollision(c, c.trail.slice(0, -6), 4);

    const endGame = (won: boolean, tie: boolean) => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
      isPlayingRef.current = false;
      if (won) {
        gameWonRef.current = true;
        st.score += 500;
        setScore(st.score);
        setIsPlaying(false);
        setGameWon(true);
        if (st.score > currentHighScore) setCurrentHighScore(st.score);
        onGameOver(st.score);
        awardPoints();
      } else {
        gameOverRef.current = true;
        setIsPlaying(false);
        setGameOver(true);
        onGameOver(st.score);
        if (tie) toast(isRTL ? 'اصطدام متبادل! تعادل.' : 'Mutual crash! Tie.', 'error');
        else      toast(isRTL ? 'تحطمت مركبتك! 💔' : 'Light cycle crashed! 💔', 'error');
      }
    };

    if      (pCrashed && cCrashed) endGame(false, true);
    else if (pCrashed)             endGame(false, false);
    else if (cCrashed)             endGame(true,  false);
    else {
      // Still alive — tick score
      if (st.ticks % 6 === 0) { st.score += 1; setScore(st.score); }

      // ── DRAW ──────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      const isDarkCurrent = isDarkRef.current;
      if (!isDarkCurrent) {
        ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
        ctx.fillRect(0, 0, W, H);
      }

      // Background grid
      ctx.save();
      ctx.strokeStyle = isDarkCurrent ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 15) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      // Trails
      drawTrail(ctx, p.trail, isDarkCurrent ? p.color : '#2563eb');
      drawTrail(ctx, c.trail, isDarkCurrent ? c.color : '#dc2626');

      // Cycles
      ctx.save();
      ctx.fillStyle = isDarkCurrent ? '#fff' : '#0f172a';
      ctx.shadowBlur = isDarkCurrent ? 12 : 3; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = c.color;
      ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      gameLoopRef.current = requestAnimationFrame(loop);
    }
  };

  // ── Start ────────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

    setIsPlaying(true); setGameOver(false); setGameWon(false); setScore(0);
    isPlayingRef.current = true; gameOverRef.current = false; gameWonRef.current = false;

    const speed = difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 3 : 2;
    const H = 240; // canvas height
    const midY = H / 2;

    stateRef.current = {
      ...stateRef.current,
      score: 0,
      difficulty,
      ticks: 0,
      player: { x: 40,  y: midY, dx: speed,  dy: 0, trail: [{ x: 40,  y: midY }], color: '#3b82f6' },
      cpu:    { x: 260, y: midY, dx: -speed, dy: 0, trail: [{ x: 260, y: midY }], color: '#ef4444' },
    };

    gameLoopRef.current = requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // ── Keyboard (refs only — no stale closure) ──────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isPlayingRef.current || gameOverRef.current || gameWonRef.current) return;
      const p = stateRef.current.player;
      const s = Math.abs(p.dx) || Math.abs(p.dy) || 2;
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': if (p.dy === 0)  { p.dx = 0;  p.dy = -s; e.preventDefault(); } break;
        case 'ArrowDown':  case 's': case 'S': if (p.dy === 0)  { p.dx = 0;  p.dy =  s; e.preventDefault(); } break;
        case 'ArrowLeft':  case 'a': case 'A': if (p.dx === 0)  { p.dx = -s; p.dy =  0; e.preventDefault(); } break;
        case 'ArrowRight': case 'd': case 'D': if (p.dx === 0)  { p.dx =  s; p.dy =  0; e.preventDefault(); } break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []); // ← empty array: refs handle freshness

  const handleDpad = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!isPlayingRef.current || gameOverRef.current || gameWonRef.current) return;
    const p = stateRef.current.player;
    const s = Math.abs(p.dx) || Math.abs(p.dy) || 2;
    if (dir === 'up'    && p.dy === 0) { p.dx =  0; p.dy = -s; }
    if (dir === 'down'  && p.dy === 0) { p.dx =  0; p.dy =  s; }
    if (dir === 'left'  && p.dx === 0) { p.dx = -s; p.dy =  0; }
    if (dir === 'right' && p.dx === 0) { p.dx =  s; p.dy =  0; }
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <button aria-label={t('action.close') || 'Close'} onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
        </button>

        <h2 className="text-xl font-black tracking-tighter text-blue-500 dark:text-blue-400">
          {t('arcade.lightriders.title') || 'الدراجات المضيئة'} 🛞
        </h2>

        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-blue-600 dark:text-blue-300">
            {isRTL ? `أفضل: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Canvas Game Stage */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,360px)] aspect-[3/2.4] border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/50 backdrop-blur-xl overflow-hidden">
        <canvas ref={canvasRef} width={300} height={240} className="w-full h-full object-contain" />

        {/* Start */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-blue-500 dark:text-blue-400 animate-bounce mb-2">sports_motorsports</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-blue-200 mb-2">{isRTL ? 'الدراجات المضيئة' : 'Neon Light Riders'}</h3>

            <div className="flex gap-1.5 my-2 relative z-20">
              {(['easy','medium','hard'] as const).map(d => (
                <button key={d}
                  onClick={(e) => { e.stopPropagation(); setDifficulty(d); }}
                  className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                    difficulty === d
                      ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-200'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}>
                  {d === 'easy' ? (isRTL ? 'سهل' : 'Easy') : d === 'medium' ? (isRTL ? 'متوسط' : 'Med') : (isRTL ? 'صعب 🔥' : 'Hard 🔥')}
                </button>
              ))}
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[200px] mb-3 leading-snug">
              {isRTL
                ? 'أنت 🔵 الخصم 🔴 — اجبر الدراجة الحمراء على الاصطدام بخطك المضيء! تحكم بـ ⬆️⬇️⬅️➡️'
                : 'You 🔵 vs CPU 🔴 — force it into your neon trail! Arrow keys or D-pad.'}
            </p>
            <button onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-500/30">
              {isRTL ? 'ابدأ السباق' : 'Start Riding'}
            </button>
          </div>
        )}

        {/* End Screen */}
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl mb-2" style={{ color: gameWon ? '#3b82f6' : '#ef4444' }}>
              {gameWon ? 'emoji_events' : 'sentiment_very_dissatisfied'}
            </span>
            <h3 className={`text-sm font-black ${gameWon ? 'text-blue-500 dark:text-blue-400' : 'text-rose-500'}`}>
              {gameWon ? (isRTL ? 'انتصرت! 🎉🏆' : 'VICTORY! 🏆') : (isRTL ? 'تحطمت! 💔' : 'CRASHED! 💔')}
            </h3>
            <p className="text-xs font-bold mt-1 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط' : 'Score'}: <span className="text-blue-500 dark:text-blue-400 font-black">{score}</span>
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs uppercase transition-all active:scale-95 shadow-md">
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

      {/* D-Pad */}
      <div className="grid grid-cols-3 gap-2 max-w-[170px] mx-auto select-none relative z-10 my-2">
        <div /><button aria-label={t('action.moveUp') || 'Move up'} onClick={(e) => { e.stopPropagation(); handleDpad('up'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-blue-400 shadow-sm active:scale-90 flex items-center justify-center transition-all">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_up</span>
        </button><div />

        <button aria-label={t('action.moveLeft') || 'Move left'} onClick={(e) => { e.stopPropagation(); handleDpad('left'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-blue-400 shadow-sm active:scale-90 flex items-center justify-center transition-all">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_left</span>
        </button>
        <div className="w-12 h-12 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500/30" />
        </div>
        <button aria-label={t('action.moveRight') || 'Move right'} onClick={(e) => { e.stopPropagation(); handleDpad('right'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-blue-400 shadow-sm active:scale-90 flex items-center justify-center transition-all">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_right</span>
        </button>

        <div /><button aria-label={t('action.moveDown') || 'Move down'} onClick={(e) => { e.stopPropagation(); handleDpad('down'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-blue-400 shadow-sm active:scale-90 flex items-center justify-center transition-all">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_down</span>
        </button><div />
      </div>

      {/* Stats bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'سباق مباشر...' : 'Racing...'}</span>
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
