import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { useArcadeStore } from '../store/arcadeStore';

interface SpaceInvadersProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Invader {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  active: boolean;
  type: 'alpha' | 'beta' | 'gamma';
}

interface Laser {
  x: number;
  y: number;
  vy: number;
  active: boolean;
  color: string;
}

interface Bunker {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
}

export function SpaceInvaders({ highScore, onClose, onGameOver }: SpaceInvadersProps) {
  const { t, isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [currentHighScore] = useState(highScore);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    isPlaying: false,
    gameOver: false,
    gameWon: false,
    player: { x: 170, y: 340, width: 32, height: 16, color: '#22c55e' },
    lasers: [] as Laser[],
    invaders: [] as Invader[],
    bunkers: [] as Bunker[],
    ufo: { x: -40, y: 30, vx: 1.5, active: false, color: '#f43f5e' },
    invaderDirection: 1, // 1 for right, -1 for left
    invaderSpeed: 0.5,
    invaderStepDown: 10,
    shootCooldown: 0,
    ufoSpawnTimer: 300,
    shake: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('invaders')) {
      stateRef.current.pointsAwardedToday = true;
    }
    initGame();
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('invaders', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const initGame = () => {
    // Spawn Bunkers
    const bunkerList: Bunker[] = [];
    const bunkerCount = 3;
    const bunkerWidth = 40;
    const bunkerHeight = 20;
    for (let i = 0; i < bunkerCount; i++) {
      bunkerList.push({
        x: 50 + i * 110,
        y: 290,
        width: bunkerWidth,
        height: bunkerHeight,
        health: 5
      });
    }

    // Spawn Invaders Grid
    const invaderRows = 4;
    const invaderCols = 7;
    const invWidth = 24;
    const invHeight = 16;
    const paddingX = 14;
    const paddingY = 12;
    const offsetTop = 50;
    const offsetLeft = 35;

    const invList: Invader[] = [];
    const types: ('alpha' | 'beta' | 'gamma')[] = ['alpha', 'beta', 'gamma'];
    const colors = ['#f43f5e', '#a855f7', '#06b6d4', '#eab308'];

    for (let r = 0; r < invaderRows; r++) {
      for (let c = 0; c < invaderCols; c++) {
        invList.push({
          x: offsetLeft + c * (invWidth + paddingX),
          y: offsetTop + r * (invHeight + paddingY),
          width: invWidth,
          height: invHeight,
          color: colors[r % colors.length],
          points: (4 - r) * 10,
          active: true,
          type: types[r % types.length]
        });
      }
    }

    stateRef.current.player = { x: 174, y: 340, width: 32, height: 14, color: '#22c55e' };
    stateRef.current.invaders = invList;
    stateRef.current.bunkers = bunkerList;
    stateRef.current.lasers = [];
    stateRef.current.ufo = { x: -40, y: 25, vx: 1.5, active: false, color: '#f43f5e' };
    stateRef.current.invaderDirection = 1;
    stateRef.current.invaderSpeed = 0.6;
    stateRef.current.shootCooldown = 0;
    stateRef.current.ufoSpawnTimer = 300;
    stateRef.current.score = 0;
    stateRef.current.gameOver = false;
    stateRef.current.gameWon = false;
    stateRef.current.shake = 0;

    setScore(0);
    setGameOver(false);
    setGameWon(false);
  };

  const startGame = () => {
    initGame();
    setIsPlaying(true);
    stateRef.current.isPlaying = true;
  };

  const firePlayerLaser = () => {
    const state = stateRef.current;
    if (!state.isPlaying || state.gameOver || state.gameWon) return;

    // Limit active player lasers
    const activePlayerLasers = state.lasers.filter(l => l.vy < 0);
    if (activePlayerLasers.length >= 2) return;

    const p = state.player;
    state.lasers.push({
      x: p.x + p.width / 2,
      y: p.y - 4,
      vy: -7,
      active: true,
      color: '#22c55e'
    });
  };

  const movePlayer = (dx: number) => {
    const p = stateRef.current.player;
    p.x = Math.max(10, Math.min(370 - p.width, p.x + dx));
  };

  // Game Loop updates
  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const state = stateRef.current;
      if (!state.isPlaying || state.gameOver || state.gameWon) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // 1. Move UFO
      state.ufoSpawnTimer--;
      if (state.ufoSpawnTimer <= 0 && !state.ufo.active) {
        state.ufo.active = true;
        state.ufo.x = -40;
        state.ufoSpawnTimer = 600 + Math.random() * 400;
      }

      if (state.ufo.active) {
        state.ufo.x += state.ufo.vx;
        if (state.ufo.x > canvas.width + 40) {
          state.ufo.active = false;
        }
      }

      // 2. Move Invaders
      let edgeReached = false;
      const activeInvaders = state.invaders.filter(inv => inv.active);

      if (activeInvaders.length === 0) {
        // Player defeated all invaders!
        state.gameWon = true;
        state.isPlaying = false;
        setGameWon(true);
        setIsPlaying(false);
        awardPoints();
        onGameOver(state.score);
        return;
      }

      activeInvaders.forEach(inv => {
        inv.x += state.invaderSpeed * state.invaderDirection;
        if (inv.x <= 10 || inv.x + inv.width >= canvas.width - 10) {
          edgeReached = true;
        }

        // Invaders reached bunkers/player level
        if (inv.y + inv.height >= state.player.y) {
          state.gameOver = true;
          state.isPlaying = false;
          setGameOver(true);
          setIsPlaying(false);
          onGameOver(state.score);
        }
      });

      if (edgeReached) {
        state.invaderDirection *= -1;
        activeInvaders.forEach(inv => {
          inv.y += state.invaderStepDown;
        });
        // Speed up invaders as they diminish
        state.invaderSpeed = Math.min(2.5, state.invaderSpeed + 0.05);
      }

      // Invaders Shoot Randomly
      if (Math.random() < 0.035) {
        const shooters = activeInvaders.filter(inv => {
          // Bottom-most in each column can shoot
          return !activeInvaders.some(other => other.x === inv.x && other.y > inv.y);
        });

        if (shooters.length > 0) {
          const shooter = shooters[Math.floor(Math.random() * shooters.length)];
          state.lasers.push({
            x: shooter.x + shooter.width / 2,
            y: shooter.y + shooter.height,
            vy: 3.5,
            active: true,
            color: '#f43f5e'
          });
        }
      }

      // 3. Move Lasers & Handle Collisions
      state.lasers.forEach(laser => {
        laser.y += laser.vy;

        // Player laser hits Invader
        if (laser.vy < 0) {
          state.invaders.forEach(inv => {
            if (!inv.active) return;
            if (
              laser.x >= inv.x &&
              laser.x <= inv.x + inv.width &&
              laser.y >= inv.y &&
              laser.y <= inv.y + inv.height
            ) {
              inv.active = false;
              laser.active = false;
              state.score += inv.points;
              setScore(state.score);
            }
          });

          // Player laser hits UFO
          if (state.ufo.active) {
            if (
              laser.x >= state.ufo.x &&
              laser.x <= state.ufo.x + 36 &&
              laser.y >= state.ufo.y &&
              laser.y <= state.ufo.y + 16
            ) {
              state.ufo.active = false;
              laser.active = false;
              state.score += 200;
              setScore(state.score);
            }
          }
        }

        // Enemy laser hits Player
        if (laser.vy > 0) {
          const p = state.player;
          if (
            laser.x >= p.x &&
            laser.x <= p.x + p.width &&
            laser.y >= p.y &&
            laser.y <= p.y + p.height
          ) {
            laser.active = false;
            state.gameOver = true;
            state.isPlaying = false;
            setGameOver(true);
            setIsPlaying(false);
            onGameOver(state.score);
          }
        }

        // Bunker Collisions (both types of lasers)
        state.bunkers.forEach(bunker => {
          if (bunker.health <= 0) return;
          if (
            laser.x >= bunker.x &&
            laser.x <= bunker.x + bunker.width &&
            laser.y >= bunker.y &&
            laser.y <= bunker.y + bunker.height
          ) {
            laser.active = false;
            bunker.health--;
          }
        });

        // Boundary checks
        if (laser.y < 0 || laser.y > canvas.height) {
          laser.active = false;
        }
      });

      state.lasers = state.lasers.filter(l => l.active);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = stateRef.current;
      const isDarkCurrent = isDarkRef.current;

      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        state.shake--;
      }

      // Background clear
      ctx.fillStyle = isDarkCurrent ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bunkers
      state.bunkers.forEach(bunker => {
        if (bunker.health <= 0) return;
        const pct = bunker.health / 5;
        ctx.fillStyle = isDarkCurrent ? `rgba(6, 182, 212, ${0.2 + pct * 0.8})` : `rgba(14, 116, 144, ${0.3 + pct * 0.7})`;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = isDarkCurrent ? bunker.health * 2 : 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bunker.x, bunker.y, bunker.width, bunker.height, 4);
        } else {
          ctx.rect(bunker.x, bunker.y, bunker.width, bunker.height);
        }
        ctx.fill();
      });

      // Draw invaders
      state.invaders.forEach(inv => {
        if (!inv.active) return;
        ctx.fillStyle = inv.color;
        ctx.shadowColor = inv.color;
        ctx.shadowBlur = isDarkCurrent ? 8 : 2;
        
        ctx.beginPath();
        if (inv.type === 'alpha') {
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(inv.x, inv.y, inv.width, inv.height, 2);
          } else {
            ctx.rect(inv.x, inv.y, inv.width, inv.height);
          }
          ctx.fill();
          // Draw small pixel eyes
          ctx.fillStyle = isDarkCurrent ? '#1e293b' : '#ffffff';
          ctx.fillRect(inv.x + 4, inv.y + 4, 3, 3);
          ctx.fillRect(inv.x + inv.width - 7, inv.y + 4, 3, 3);
        } else {
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(inv.x + 2, inv.y, inv.width - 4, inv.height, 4);
          } else {
            ctx.rect(inv.x + 2, inv.y, inv.width - 4, inv.height);
          }
          ctx.fill();
          ctx.fillStyle = isDarkCurrent ? '#1e293b' : '#ffffff';
          ctx.fillRect(inv.x + 6, inv.y + 4, 2, 2);
          ctx.fillRect(inv.x + inv.width - 8, inv.y + 4, 2, 2);
        }
      });

      // Draw Player Base
      const p = state.player;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = isDarkCurrent ? 12 : 3;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(p.x, p.y, p.width, p.height, 4);
      } else {
        ctx.rect(p.x, p.y, p.width, p.height);
      }
      ctx.fill();
      // Tank gun turret
      ctx.fillRect(p.x + p.width / 2 - 2, p.y - 4, 4, 5);

      // Draw UFO command ship
      const ufo = state.ufo;
      if (ufo.active) {
        ctx.fillStyle = ufo.color;
        ctx.shadowColor = ufo.color;
        ctx.shadowBlur = isDarkCurrent ? 15 : 4;
        ctx.beginPath();
        ctx.ellipse(ufo.x + 18, ufo.y + 8, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ufo.x + 15, ufo.y + 2, 6, 3);
      }

      // Draw Lasers
      state.lasers.forEach(laser => {
        ctx.fillStyle = laser.color;
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = isDarkCurrent ? 8 : 2;
        ctx.fillRect(laser.x - 1, laser.y - 4, 2, 8);
      });

      ctx.restore();
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Touch controls / Click move
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const p = stateRef.current.player;
    p.x = Math.max(10, Math.min(canvas.width - p.width - 10, touchX - p.width / 2));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const p = stateRef.current.player;
    p.x = Math.max(10, Math.min(canvas.width - p.width - 10, mouseX - p.width / 2));
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        movePlayer(-20);
      } else if (e.key === 'ArrowRight') {
        movePlayer(20);
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        firePlayerLaser();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button aria-label={t('action.back') || 'Back'}
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>
        <h2 className="text-xl font-black tracking-tighter text-emerald-500 dark:text-emerald-400">
          {isRTL ? 'غزاة الفضاء' : 'Space Invaders'} 🚀
        </h2>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-300">
          <span className="material-symbols-outlined text-emerald-500 dark:text-emerald-400 text-sm">emoji_events</span>
          <span>
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="w-full flex justify-between items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-sm my-1">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">{isRTL ? 'النقاط' : 'Score'}</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{score}</span>
        </div>
        <div className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{isRTL ? 'حماية القاعدة' : 'Defend Base'}</span>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,360px)] aspect-[380/380] border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={380}
          height={380}
          onTouchMove={handleTouchMove}
          onMouseMove={handleMouseMove}
          onClick={firePlayerLaser}
          className="w-full h-full object-contain cursor-none"
        />

        {/* Start / Game Over Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-5xl text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.6)] mb-3">
              rocket_launch
            </span>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
              {gameOver 
                ? (isRTL ? 'انتهت اللعبة! 💔' : 'Game Over! 💔') 
                : gameWon 
                  ? (isRTL ? 'تم حماية كوكبك بنجاح! 🎉🏆' : 'Planet Protected! 🎉🏆')
                  : (isRTL ? 'جاهز لحماية كوكبك؟' : 'Ready to save the base?')
              }
            </h3>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              {isRTL ? 'بدء اللعب' : 'Start Game'}
            </button>
          </div>
        )}
      </div>

      {/* Tactile On-Screen Controls */}
      <div className="flex items-center justify-between gap-3 w-full max-w-[340px] mx-auto select-none my-1">
        <button
          onTouchStart={() => movePlayer(-30)}
          onMouseDown={() => movePlayer(-30)}
          className="w-14 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-emerald-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
          aria-label="Move left"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">arrow_back</span>
        </button>

        <button aria-label={t('action.boost') || 'Boost'}
          onClick={firePlayerLaser}
          disabled={!isPlaying}
          className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">bolt</span>
          <span>{isRTL ? 'إطلاق الليزر' : 'Shoot'}</span>
        </button>

        <button
          onTouchStart={() => movePlayer(30)}
          onMouseDown={() => movePlayer(30)}
          className="w-14 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-emerald-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
          aria-label="Move right"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">arrow_forward</span>
        </button>
      </div>

      {/* Touch indication */}
      <div className="text-center text-[10px] font-bold text-slate-400 dark:text-white/30">
        {isRTL ? 'اسحب لتحريك المركبة وانقر للإطلاق' : 'Drag to steer, tap to shoot'}
      </div>
    </div>
  );
}
