import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { useArcadeStore } from '../store/arcadeStore';

interface AsteroidsProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  sides: number;
  offsets: number[];
  color: string;
  points: number;
  active: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
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

export function Asteroids({ highScore, onClose, onGameOver }: AsteroidsProps) {
  const { isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [currentHighScore] = useState(highScore);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    isPlaying: false,
    gameOver: false,
    ship: {
      x: 190,
      y: 190,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      rotation: 0,
      thrust: false,
      radius: 10
    },
    bullets: [] as Bullet[],
    asteroids: [] as Asteroid[],
    particles: [] as Particle[],
    shootCooldown: 0,
    asteroidSpawnTimer: 0,
    shake: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('asteroids')) {
      stateRef.current.pointsAwardedToday = true;
    }
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('asteroids', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const createAsteroid = (x: number, y: number, radius: number): Asteroid => {
    const sides = 8 + Math.floor(Math.random() * 5);
    const offsets: number[] = [];
    for (let i = 0; i < sides; i++) {
      offsets.push(0.75 + Math.random() * 0.5); // irregular shape
    }
    const colors = ['#f43f5e', '#a855f7', '#06b6d4', '#eab308', '#3b82f6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const pointsMap = { 30: 10, 18: 20, 10: 40 };

    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      radius,
      sides,
      offsets,
      color,
      points: pointsMap[radius as 30 | 18 | 10] || 10,
      active: true
    };
  };

  const initGame = () => {
    stateRef.current.ship = {
      x: 190,
      y: 190,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      rotation: 0,
      thrust: false,
      radius: 10
    };
    stateRef.current.bullets = [];
    stateRef.current.asteroids = [];
    stateRef.current.particles = [];
    stateRef.current.shootCooldown = 0;
    stateRef.current.asteroidSpawnTimer = 0;
    stateRef.current.score = 0;
    stateRef.current.gameOver = false;
    stateRef.current.shake = 0;

    // Spawn 4 initial big asteroids away from center
    for (let i = 0; i < 4; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) { x = Math.random() * 380; y = 20; }
      else if (edge === 1) { x = 360; y = Math.random() * 380; }
      else if (edge === 2) { x = Math.random() * 380; y = 360; }
      else { x = 20; y = Math.random() * 380; }

      stateRef.current.asteroids.push(createAsteroid(x, y, 30));
    }

    setScore(0);
    setGameOver(false);
  };

  const startGame = () => {
    initGame();
    setIsPlaying(true);
    stateRef.current.isPlaying = true;
  };

  const spawnParticles = (x: number, y: number, color: string, count = 6) => {
    for (let i = 0; i < count; i++) {
      stateRef.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color,
        alpha: 1,
        life: 20 + Math.random() * 15
      });
    }
  };

  const fireBullet = () => {
    const state = stateRef.current;
    if (!state.isPlaying || state.gameOver) return;

    const ship = state.ship;
    const speed = 7;
    state.bullets.push({
      x: ship.x + Math.cos(ship.angle) * ship.radius,
      y: ship.y + Math.sin(ship.angle) * ship.radius,
      vx: Math.cos(ship.angle) * speed + ship.vx * 0.5,
      vy: Math.sin(ship.angle) * speed + ship.vy * 0.5,
      life: 50,
      active: true
    });
  };

  // Game loop updates
  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const state = stateRef.current;
      if (!state.isPlaying || state.gameOver) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ship = state.ship;

      // 1. Rotate and Thrust Ship
      ship.angle += ship.rotation;

      if (ship.thrust) {
        ship.vx += Math.cos(ship.angle) * 0.15;
        ship.vy += Math.sin(ship.angle) * 0.15;

        // Thrust thruster particles
        if (Math.random() < 0.6) {
          spawnParticles(
            ship.x - Math.cos(ship.angle) * ship.radius,
            ship.y - Math.sin(ship.angle) * ship.radius,
            '#f97316',
            2
          );
        }
      }

      // Space friction
      ship.vx *= 0.985;
      ship.vy *= 0.985;

      ship.x += ship.vx;
      ship.y += ship.vy;

      // Screen wrapping for ship
      if (ship.x < 0) ship.x = canvas.width;
      else if (ship.x > canvas.width) ship.x = 0;
      if (ship.y < 0) ship.y = canvas.height;
      else if (ship.y > canvas.height) ship.y = 0;

      // 2. Move Bullets
      state.bullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        // Screen wrapping for bullets
        if (b.x < 0) b.x = canvas.width;
        else if (b.x > canvas.width) b.x = 0;
        if (b.y < 0) b.y = canvas.height;
        else if (b.y > canvas.height) b.y = 0;

        if (b.life <= 0) b.active = false;
      });
      state.bullets = state.bullets.filter(b => b.active);

      // 3. Move Asteroids
      state.asteroids.forEach(ast => {
        ast.x += ast.vx;
        ast.y += ast.vy;

        // Screen wrapping for asteroids
        if (ast.x < -ast.radius) ast.x = canvas.width + ast.radius;
        else if (ast.x > canvas.width + ast.radius) ast.x = -ast.radius;
        if (ast.y < -ast.radius) ast.y = canvas.height + ast.radius;
        else if (ast.y > canvas.height + ast.radius) ast.y = -ast.radius;
      });

      // 4. Bullet vs Asteroid Collisions
      const newAsteroids: Asteroid[] = [];

      state.bullets.forEach(b => {
        state.asteroids.forEach(ast => {
          if (!ast.active || !b.active) return;

          const dist = Math.hypot(b.x - ast.x, b.y - ast.y);
          if (dist < ast.radius) {
            b.active = false;
            ast.active = false;

            spawnParticles(ast.x, ast.y, ast.color, 12);
            state.score += ast.points;
            setScore(state.score);

            // Split asteroid into smaller ones
            if (ast.radius > 20) {
              newAsteroids.push(createAsteroid(ast.x, ast.y, 18));
              newAsteroids.push(createAsteroid(ast.x, ast.y, 18));
            } else if (ast.radius > 12) {
              newAsteroids.push(createAsteroid(ast.x, ast.y, 10));
              newAsteroids.push(createAsteroid(ast.x, ast.y, 10));
            }
          }
        });
      });

      state.asteroids = [...state.asteroids.filter(a => a.active), ...newAsteroids];

      // Respawn asteroids if all destroyed
      if (state.asteroids.length === 0) {
        awardPoints();
        for (let i = 0; i < 5; i++) {
          state.asteroids.push(createAsteroid(Math.random() * 380, 10, 30));
        }
      }

      // 5. Ship vs Asteroid Collisions
      state.asteroids.forEach(ast => {
        if (!ast.active) return;
        const dist = Math.hypot(ship.x - ast.x, ship.y - ast.y);
        if (dist < ast.radius + ship.radius) {
          // Crash!
          spawnParticles(ship.x, ship.y, '#f43f5e', 20);
          state.gameOver = true;
          state.isPlaying = false;
          setGameOver(true);
          setIsPlaying(false);
          onGameOver(state.score);
        }
      });

      // 6. Update Particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = Math.max(0, p.life / 30);
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

      ctx.save();

      // Clear trail
      ctx.fillStyle = isDarkCurrent ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw asteroids
      state.asteroids.forEach(ast => {
        if (!ast.active) return;
        ctx.strokeStyle = ast.color;
        ctx.shadowColor = ast.color;
        ctx.shadowBlur = isDarkCurrent ? 8 : 2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Draw irregular polygon
        for (let i = 0; i < ast.sides; i++) {
          const angle = (i / ast.sides) * Math.PI * 2;
          const r = ast.radius * ast.offsets[i];
          const x = ast.x + Math.cos(angle) * r;
          const y = ast.y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      });

      // Draw triangular player ship
      const ship = state.ship;
      if (state.isPlaying && !state.gameOver) {
        ctx.strokeStyle = isDarkCurrent ? '#22c55e' : '#16a34a';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = isDarkCurrent ? 12 : 3;
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Calculate triangle tips based on angle
        const tipX = ship.x + Math.cos(ship.angle) * ship.radius;
        const tipY = ship.y + Math.sin(ship.angle) * ship.radius;
        const leftX = ship.x + Math.cos(ship.angle + 2.3) * ship.radius;
        const leftY = ship.y + Math.sin(ship.angle + 2.3) * ship.radius;
        const rightX = ship.x + Math.cos(ship.angle - 2.3) * ship.radius;
        const rightY = ship.y + Math.sin(ship.angle - 2.3) * ship.radius;

        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.stroke();
      }

      // Draw bullets
      ctx.fillStyle = isDarkCurrent ? '#f59e0b' : '#d97706';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isDarkCurrent ? 8 : 2;
      state.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw particles
      ctx.shadowBlur = 0;
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1; // Restore alpha

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

  // Touch Controller Functions
  const setRotation = (val: number) => {
    stateRef.current.ship.rotation = val;
  };

  const setThrust = (val: boolean) => {
    stateRef.current.ship.thrust = val;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ship = stateRef.current.ship;
      if (e.key === 'ArrowLeft') ship.rotation = -0.08;
      else if (e.key === 'ArrowRight') ship.rotation = 0.08;
      else if (e.key === 'ArrowUp') ship.thrust = true;
      else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        fireBullet();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const ship = stateRef.current.ship;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ship.rotation = 0;
      else if (e.key === 'ArrowUp') ship.thrust = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>
        <h2 className="text-xl font-black tracking-tighter text-rose-500 dark:text-rose-400">
          {isRTL ? 'الكويكبات' : 'Asteroids Duel'} ☄️
        </h2>
        <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-rose-600 dark:text-rose-300">
          <span className="material-symbols-outlined text-rose-500 dark:text-rose-400 text-sm">emoji_events</span>
          <span>
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="w-full flex justify-between items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-sm my-1">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">{isRTL ? 'النقاط' : 'Score'}</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">{score}</span>
        </div>
        <div className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>{isRTL ? 'مناورة الفضاء' : 'Deep Space'}</span>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,360px)] aspect-[380/380] border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={380}
          height={380}
          className="w-full h-full object-contain"
        />

        {/* Start / Game Over Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-5xl text-rose-500 dark:text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)] mb-3">
              blur_on
            </span>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
              {gameOver 
                ? (isRTL ? 'انتهت اللعبة! 💔' : 'Game Over! 💔') 
                : (isRTL ? 'جاهز للمناورة وتفتيت الكويكبات؟' : 'Ready to blast asteroids?')
              }
            </h3>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white rounded-2xl text-xs font-black shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
            >
              {isRTL ? 'بدء اللعب' : 'Start Game'}
            </button>
          </div>
        )}
      </div>

      {/* Tactile Controls */}
      <div className="flex items-center justify-between gap-2 w-full max-w-[360px] mx-auto select-none my-1">
        <button
          onTouchStart={() => setRotation(-0.08)}
          onTouchEnd={() => setRotation(0)}
          onMouseDown={() => setRotation(-0.08)}
          onMouseUp={() => setRotation(0)}
          disabled={!isPlaying}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-rose-400 shadow-sm active:scale-90 flex items-center justify-center transition-all disabled:opacity-40"
          aria-label="Rotate left"
        >
          <span className="material-symbols-outlined text-xl">rotate_left</span>
        </button>

        <button
          onTouchStart={() => setThrust(true)}
          onTouchEnd={() => setThrust(false)}
          onMouseDown={() => setThrust(true)}
          onMouseUp={() => setThrust(false)}
          disabled={!isPlaying}
          className="flex-1 max-w-[105px] h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 disabled:opacity-40 text-white flex items-center justify-center active:scale-90 shadow-md transition-all gap-1 font-black text-xs"
        >
          <span className="material-symbols-outlined text-lg">rocket</span>
          <span>{isRTL ? 'دفع' : 'Thrust'}</span>
        </button>

        <button
          onClick={fireBullet}
          disabled={!isPlaying}
          className="flex-1 max-w-[110px] h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white flex items-center justify-center active:scale-90 shadow-md transition-all gap-1 font-black text-xs"
        >
          <span className="material-symbols-outlined text-lg">bolt</span>
          <span>{isRTL ? 'إطلاق' : 'Shoot'}</span>
        </button>

        <button
          onTouchStart={() => setRotation(0.08)}
          onTouchEnd={() => setRotation(0)}
          onMouseDown={() => setRotation(0.08)}
          onMouseUp={() => setRotation(0)}
          disabled={!isPlaying}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-rose-400 shadow-sm active:scale-90 flex items-center justify-center transition-all disabled:opacity-40"
          aria-label="Rotate right"
        >
          <span className="material-symbols-outlined text-xl">rotate_right</span>
        </button>
      </div>

      <div className="text-center text-[10px] font-bold text-slate-400 dark:text-white/30">
        {isRTL ? 'استخدم أزرار التدوير والدفع للمناورة بدقة' : 'Use rotate & thrust to navigate asteroid field'}
      </div>
    </div>
  );
}
