import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface BrickBreakerProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  active: boolean;
  hits?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'wide' | 'laser' | 'multiball';
  color: string;
  width: number;
  height: number;
  active: boolean;
}

export function BrickBreaker({ highScore, onClose, onGameOver }: BrickBreakerProps) {
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
  const [level, setLevel] = useState(1);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    isPlaying: false,
    gameOver: false,
    gameWon: false,
    level: 1,
    paddle: { x: 150, y: 350, width: 80, height: 12, color: '#a855f7' },
    balls: [{ x: 190, y: 300, vx: 3, vy: -3, radius: 6, active: true }],
    bricks: [] as Brick[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    laserMode: false,
    laserCooldown: 0,
    lasers: [] as { x: number; y: number; vy: number }[]
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('brick')) {
      stateRef.current.pointsAwardedToday = true;
    }
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('brick', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const initBricksForLevel = (lvl: number) => {
    const brickRows = 4 + lvl;
    const brickCols = 6;
    const brickWidth = 52;
    const brickHeight = 16;
    const padding = 6;
    const offsetTop = 40;
    const offsetLeft = 20;

    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
    const bricksList: Brick[] = [];

    for (let r = 0; r < Math.min(brickRows, 6); r++) {
      for (let c = 0; c < brickCols; c++) {
        let hits = 1;
        let points = (5 - r) * 10;
        
        // Multi-hits logic based on level
        if (lvl === 2 && r === 0) {
          hits = 2; // red bricks require 2 hits
          points = 150;
        } else if (lvl === 3 && r <= 1) {
          hits = r === 0 ? 3 : 2; // very hard bricks!
          points = r === 0 ? 250 : 150;
        }

        bricksList.push({
          x: offsetLeft + c * (brickWidth + padding),
          y: offsetTop + r * (brickHeight + padding),
          width: brickWidth,
          height: brickHeight,
          color: hits === 3 ? '#a855f7' : hits === 2 ? '#ef4444' : colors[r % colors.length],
          points,
          active: true,
          hits
        });
      }
    }
    return bricksList;
  };

  const initGame = (lvl = 1) => {
    stateRef.current.level = lvl;
    setLevel(lvl);

    const bricksList = initBricksForLevel(lvl);

    stateRef.current.bricks = bricksList;
    stateRef.current.paddle = { x: 150, y: 360, width: 80, height: 10, color: '#06b6d4' };
    
    // Increase ball speed dynamically per stage level
    const speedMultiplier = 1 + (lvl - 1) * 0.22;
    stateRef.current.balls = [{ 
      x: 190, 
      y: 340, 
      vx: 2.5 * speedMultiplier, 
      vy: -3.5 * speedMultiplier, 
      radius: 5, 
      active: true 
    }];
    
    stateRef.current.particles = [];
    stateRef.current.powerUps = [];
    stateRef.current.lasers = [];
    stateRef.current.laserMode = false;
    stateRef.current.laserCooldown = 0;
    
    if (lvl === 1) {
      stateRef.current.score = 0;
      setScore(0);
    }
    
    stateRef.current.gameOver = false;
    stateRef.current.gameWon = false;

    setGameOver(false);
    setGameWon(false);
  };

  const startGame = () => {
    initGame(1);
    setIsPlaying(true);
    stateRef.current.isPlaying = true;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      stateRef.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color,
        alpha: 1,
        life: 30 + Math.random() * 20
      });
    }
  };

  // Game Loop updates
  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const state = stateRef.current;
      if (!state.isPlaying || state.gameOver || state.gameWon) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // 1. Move Active Balls
      state.balls.forEach(ball => {
        if (!ball.active) return;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collisions
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
          ball.vx *= -1;
          ball.x = ball.x - ball.radius < 0 ? ball.radius : canvas.width - ball.radius;
        }
        if (ball.y - ball.radius < 0) {
          ball.vy *= -1;
          ball.y = ball.radius;
        }

        // Paddle collision
        const p = state.paddle;
        if (
          ball.x + ball.radius >= p.x &&
          ball.x - ball.radius <= p.x + p.width &&
          ball.y + ball.radius >= p.y &&
          ball.y - ball.radius <= p.y + p.height
        ) {
          // Bounce with angle variation
          ball.vy = -Math.abs(ball.vy);
          const hitPoint = (ball.x - (p.x + p.width / 2)) / (p.width / 2);
          ball.vx = hitPoint * 4;
        }

        // Bricks collision
        state.bricks.forEach(brick => {
          if (!brick.active) return;
          if (
            ball.x + ball.radius >= brick.x &&
            ball.x - ball.radius <= brick.x + brick.width &&
            ball.y + ball.radius >= brick.y &&
            ball.y - ball.radius <= brick.y + brick.height
          ) {
            ball.vy *= -1;

            if (brick.hits && brick.hits > 1) {
              brick.hits--;
              // Damage indication colors
              if (brick.hits === 2) brick.color = '#ef4444'; // Red
              else if (brick.hits === 1) brick.color = '#f97316'; // Orange
              spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, '#ffffff');
            } else {
              brick.active = false;
              spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
              
              // Score increment
              state.score += brick.points;
              setScore(state.score);

              // Chance to drop power-up
              if (Math.random() < 0.25) {
                const types: ('wide' | 'laser' | 'multiball')[] = ['wide', 'laser', 'multiball'];
                const chosenType = types[Math.floor(Math.random() * types.length)];
                const colorsMap = { wide: '#10b981', laser: '#f43f5e', multiball: '#3b82f6' };
                state.powerUps.push({
                  x: brick.x + brick.width / 2,
                  y: brick.y + brick.height,
                  type: chosenType,
                  color: colorsMap[chosenType],
                  width: 14,
                  height: 14,
                  active: true
                });
              }
            }
          }
        });

        // Bottom boundary check (ball lost)
        if (ball.y - ball.radius > canvas.height) {
          ball.active = false;
        }
      });

      // Check if all balls lost
      const activeBalls = state.balls.filter(b => b.active);
      if (activeBalls.length === 0) {
        state.gameOver = true;
        state.isPlaying = false;
        setGameOver(true);
        setIsPlaying(false);
        onGameOver(state.score);
        return;
      }

      // Check level cleared
      const remainingBricks = state.bricks.filter(b => b.active);
      if (remainingBricks.length === 0) {
        if (state.level < 3) {
          // Proceed to next level
          initGame(state.level + 1);
          toast(isRTL ? `المرحلة ${state.level} اكتملت! 🚀` : `Level ${state.level} Cleared! 🚀`, 'success');
        } else {
          // Completed all levels!
          state.gameWon = true;
          state.isPlaying = false;
          setGameWon(true);
          setIsPlaying(false);
          awardPoints();
          onGameOver(state.score);
        }
        return;
      }

      // 2. Move PowerUps
      state.powerUps.forEach(pu => {
        if (!pu.active) return;
        pu.y += 2.2; // Fall speed

        // Catch with paddle
        const p = state.paddle;
        if (
          pu.x + pu.width >= p.x &&
          pu.x <= p.x + p.width &&
          pu.y + pu.height >= p.y &&
          pu.y <= p.y + p.height
        ) {
          pu.active = false;
          applyPowerUp(pu.type);
        }

        if (pu.y > canvas.height) pu.active = false;
      });

      // 3. Move Lasers (if active)
      if (state.laserMode) {
        state.laserCooldown++;
        if (state.laserCooldown % 12 === 0) {
          // Shoot 2 lasers from paddle ends
          state.lasers.push({ x: state.paddle.x + 5, y: state.paddle.y, vy: -6 });
          state.lasers.push({ x: state.paddle.x + state.paddle.width - 5, y: state.paddle.y, vy: -6 });
        }
      }

      state.lasers.forEach(laser => {
        laser.y += laser.vy;

        // Brick collisions with laser
        state.bricks.forEach(brick => {
          if (!brick.active) return;
          if (
            laser.x >= brick.x &&
            laser.x <= brick.x + brick.width &&
            laser.y >= brick.y &&
            laser.y <= brick.y + brick.height
          ) {
            laser.y = -100; // destroy laser
            brick.active = false;
            spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
            state.score += brick.points;
            setScore(state.score);
          }
        });
      });
      state.lasers = state.lasers.filter(l => l.y > 0);

      // 4. Update Particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = Math.max(0, p.life / 50);
      });
      state.particles = state.particles.filter(p => p.life > 0);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = stateRef.current;
      const isDarkCurrent = isDarkRef.current;

      // Clear with elegant gradient trail
      ctx.fillStyle = isDarkCurrent ? 'rgba(15, 23, 42, 0.35)' : 'rgba(241, 245, 249, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bricks
      state.bricks.forEach(brick => {
        if (!brick.active) return;
        ctx.fillStyle = brick.color;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = isDarkCurrent ? 10 : 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        } else {
          ctx.rect(brick.x, brick.y, brick.width, brick.height);
        }
        ctx.fill();
      });

      // Draw paddle
      const p = state.paddle;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = isDarkCurrent ? 15 : 4;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(p.x, p.y, p.width, p.height, 6);
      } else {
        ctx.rect(p.x, p.y, p.width, p.height);
      }
      ctx.fill();

      // Draw balls
      state.balls.forEach(ball => {
        ctx.fillStyle = isDarkCurrent ? '#ffffff' : '#0284c7';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = isDarkCurrent ? 12 : 3;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw lasers
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = isDarkCurrent ? 8 : 2;
      state.lasers.forEach(laser => {
        ctx.fillRect(laser.x - 1, laser.y - 6, 2, 8);
      });

      // Draw powerUps
      state.powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = isDarkCurrent ? 8 : 2;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.width / 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw particles
      ctx.shadowBlur = 0;
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1; // Restore alpha
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

  const applyPowerUp = (type: 'wide' | 'laser' | 'multiball') => {
    const state = stateRef.current;
    if (type === 'wide') {
      state.paddle.width = 120;
      state.paddle.color = '#10b981';
      // Revert after 8 seconds
      setTimeout(() => {
        state.paddle.width = 80;
        state.paddle.color = '#06b6d4';
      }, 8000);
      toast(isRTL ? 'مضرب عريض نشط! 🏹' : 'Wide Paddle Active! 🏹', 'success');
    } else if (type === 'laser') {
      state.laserMode = true;
      state.paddle.color = '#f43f5e';
      setTimeout(() => {
        state.laserMode = false;
        state.paddle.color = '#06b6d4';
      }, 7000);
      toast(isRTL ? 'إطلاق الليزر نشط! 🔫' : 'Laser Cannon Active! 🔫', 'success');
    } else if (type === 'multiball') {
      // Spawn 2 extra balls
      const primary = state.balls[0] || { x: 190, y: 300, vx: 2, vy: -3 };
      state.balls.push({
        x: primary.x,
        y: primary.y,
        vx: -primary.vx * 1.2,
        vy: primary.vy,
        radius: 5,
        active: true
      });
      state.balls.push({
        x: primary.x,
        y: primary.y,
        vx: primary.vx,
        vy: primary.vy * 0.8,
        radius: 5,
        active: true
      });
      toast(isRTL ? 'الكرات المتعددة! 🔮' : 'Multiball Spawned! 🔮', 'success');
    }
  };

  const movePaddle = (dx: number) => {
    const p = stateRef.current.paddle;
    p.x = Math.max(0, Math.min(380 - p.width, p.x + dx));
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 25;
      if (e.key === 'ArrowLeft') {
        movePaddle(-step);
      } else if (e.key === 'ArrowRight') {
        movePaddle(step);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse / Touch drag control
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const p = stateRef.current.paddle;
    p.x = Math.max(0, Math.min(canvas.width - p.width, touchX - p.width / 2));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const p = stateRef.current.paddle;
    p.x = Math.max(0, Math.min(canvas.width - p.width, mouseX - p.width / 2));
  };

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
        <h2 className="text-xl font-black tracking-tighter text-cyan-500 dark:text-cyan-400">
          {isRTL ? 'تدمير الكتل' : 'Brick Breaker'} 🧱
        </h2>
        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-cyan-600 dark:text-cyan-300">
          <span className="material-symbols-outlined text-cyan-500 dark:text-cyan-400 text-sm">emoji_events</span>
          <span>
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Stats Sub-Header */}
      <div className="w-full flex justify-between items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-sm my-1">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">{isRTL ? 'النقاط' : 'Score'}</span>
          <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 tabular-nums">{score}</span>
        </div>
        <div className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          <span>{isRTL ? `المرحلة: ${level} / 3` : `Level: ${level} / 3`}</span>
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
          className="w-full h-full object-contain cursor-none"
        />

        {/* Start / Game Over Screen Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-5xl text-cyan-500 dark:text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] mb-3">
              layers
            </span>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
              {gameOver 
                ? (isRTL ? 'انتهت اللعبة! 💔' : 'Game Over! 💔') 
                : gameWon 
                  ? (isRTL ? 'لقد فزت بالكامل! 🎉🏆' : 'You Won! 🎉🏆')
                  : (isRTL ? `المرحلة ${level} من 3` : `Level ${level} of 3`)
              }
            </h3>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              {gameOver || gameWon
                ? (isRTL ? 'إعادة اللعب' : 'Play Again')
                : (isRTL ? 'ابدأ اللعب الآن' : 'Start Play Now')
              }
            </button>
          </div>
        )}
      </div>

      {/* Tactile Paddle Controls for Mobile */}
      <div className="flex items-center justify-between gap-3 w-full max-w-[340px] mx-auto select-none my-1">
        <button
          onTouchStart={() => movePaddle(-40)}
          onMouseDown={() => movePaddle(-40)}
          className="w-14 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
          aria-label="Move paddle left"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">arrow_back</span>
        </button>

        <button aria-label={t('action.refresh') || 'Refresh'}
          onClick={isPlaying ? () => initGame(1) : startGame}
          className="flex-1 py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">refresh</span>
          <span>{isRTL ? 'إعادة' : 'Restart'}</span>
        </button>

        <button
          onTouchStart={() => movePaddle(40)}
          onMouseDown={() => movePaddle(40)}
          className="w-14 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
          aria-label="Move paddle right"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">arrow_forward</span>
        </button>
      </div>

      {/* Info indicator */}
      <div className="text-center text-[10px] font-bold text-slate-400 dark:text-white/30">
        {isRTL ? 'اسحب بإصبعك على الشاشة لتحريك المضرب بسهولة' : 'Drag on canvas or use arrow buttons to move'}
      </div>
    </div>
  );
}
