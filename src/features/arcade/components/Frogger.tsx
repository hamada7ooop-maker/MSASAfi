import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface FroggerProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Car {
  x: number;
  y: number;
  width: number;
  speed: number;
  color: string;
}

interface Log {
  x: number;
  y: number;
  width: number;
  speed: number;
  color: string;
}

export function Frogger({ highScore, onClose, onGameOver }: FroggerProps) {
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
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    lives: 3,
    frog: { x: 140, y: 260, size: 14, defaultX: 140, defaultY: 260 },
    cars: [] as Car[],
    logs: [] as Log[],
    ticks: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('frogger')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('frogger', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
    setLives(3);
    setScore(0);

    let speedMult = 1.0;
    if (difficulty === 'easy') speedMult = 0.7;
    if (difficulty === 'medium') speedMult = 1.0;
    if (difficulty === 'hard') speedMult = 1.4;

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      lives: 3,
      frog: { x: 140, y: 260, size: 14, defaultX: 140, defaultY: 260 },
      cars: [
        // Road Lanes (y-positions: 180, 200, 220, 240)
        { x: 0, y: 180, width: 35, speed: 2.2 * speedMult, color: '#f43f5e' },
        { x: 150, y: 180, width: 35, speed: 2.2 * speedMult, color: '#f43f5e' },
        { x: 280, y: 200, width: 45, speed: -1.5 * speedMult, color: '#3b82f6' },
        { x: 80, y: 200, width: 45, speed: -1.5 * speedMult, color: '#3b82f6' },
        { x: 20, y: 220, width: 30, speed: 1.8 * speedMult, color: '#eab308' },
        { x: 180, y: 220, width: 30, speed: 1.8 * speedMult, color: '#eab308' },
        { x: 100, y: 240, width: 40, speed: -2.0 * speedMult, color: '#10b981' }
      ],
      logs: [
        // River Lanes (y-positions: 40, 60, 80, 100, 120)
        { x: 0, y: 40, width: 70, speed: 1.2 * speedMult, color: '#854d0e' },
        { x: 180, y: 40, width: 70, speed: 1.2 * speedMult, color: '#854d0e' },
        { x: 100, y: 60, width: 85, speed: -0.9 * speedMult, color: '#15803d' }, // Turtles (green logs)
        { x: 250, y: 60, width: 85, speed: -0.9 * speedMult, color: '#15803d' },
        { x: 40, y: 80, width: 100, speed: 1.5 * speedMult, color: '#854d0e' },
        { x: 200, y: 80, width: 100, speed: 1.5 * speedMult, color: '#854d0e' },
        { x: 10, y: 100, width: 75, speed: -1.1 * speedMult, color: '#15803d' },
        { x: 190, y: 100, width: 75, speed: -1.1 * speedMult, color: '#15803d' },
        { x: 80, y: 120, width: 90, speed: 1.3 * speedMult, color: '#854d0e' }
      ],
      ticks: 0
    };

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlaying || gameOver || gameWon) return;
    const f = stateRef.current.frog;
    const stepX = 20;
    const stepY = 20;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        f.y = Math.max(20, f.y - stepY);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        f.y = Math.min(260, f.y + stepY);
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        f.x = Math.max(10, f.x - stepX);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        f.x = Math.min(270, f.x + stepX);
        e.preventDefault();
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver, gameWon]);

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

    // 1. Update Cars
    state.cars.forEach(car => {
      car.x += car.speed;
      if (car.speed > 0 && car.x > canvas.width) car.x = -car.width;
      if (car.speed < 0 && car.x < -car.width) car.x = canvas.width;
    });

    // 2. Update Logs
    state.logs.forEach(log => {
      log.x += log.speed;
      if (log.speed > 0 && log.x > canvas.width) log.x = -log.width;
      if (log.speed < 0 && log.x < -log.width) log.x = canvas.width;
    });

    // 3. Collision Checks
    const f = state.frog;
    let hit = false;

    // Road Collision Check
    if (f.y >= 180 && f.y <= 240) {
      state.cars.forEach(car => {
        if (
          f.y === car.y &&
          f.x + f.size > car.x &&
          f.x - f.size < car.x + car.width
        ) {
          hit = true;
        }
      });
    }

    // River Collision Check
    let onLog = false;
    let logSpeed = 0;
    if (f.y >= 40 && f.y <= 120) {
      state.logs.forEach(log => {
        if (
          f.y === log.y &&
          f.x + 3 > log.x &&
          f.x - 3 < log.x + log.width
        ) {
          onLog = true;
          logSpeed = log.speed;
        }
      });

      if (!onLog) {
        hit = true; // drown in water
      } else {
        // Carry frog on the log
        f.x += logSpeed;
        if (f.x < 10 || f.x > 290) {
          hit = true; // carry off screen
        }
      }
    }

    // Handle Hit / Death
    if (hit) {
      state.lives--;
      setLives(state.lives);
      f.x = f.defaultX;
      f.y = f.defaultY;

      if (state.lives <= 0) {
        setIsPlaying(false);
        setGameOver(true);
        onGameOver(state.score);
        if (state.score > currentHighScore) {
          setCurrentHighScore(state.score);
          awardPoints();
        }
        return;
      }
      toast(isRTL ? 'اصطدام! انتبه للطريق والنهر.' : 'Splash/Crash! Watch your steps.', 'error');
    }

    // Win condition (Reaching top safe zone)
    if (f.y <= 20) {
      state.score += 250;
      setScore(state.score);
      f.x = f.defaultX;
      f.y = f.defaultY;
      toast(isRTL ? 'نجاح! لقد أوصلت الضفدع لبر الأمان 🏆' : 'Goal! Safe at home 🏆', 'success');

      // Check ultimate win
      if (state.score >= 1000) {
        setIsPlaying(false);
        setGameWon(true);
        onGameOver(state.score);
        awardPoints();
        return;
      }
    }

    // DRAW STAGE
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDarkCurrent = isDarkRef.current;
    if (!isDarkCurrent) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // River Area (Blue)
    ctx.fillStyle = isDarkCurrent ? 'rgba(29, 78, 216, 0.4)' : 'rgba(147, 197, 253, 0.45)';
    ctx.fillRect(0, 40, canvas.width, 100);

    // River Bank/Safe Zones (Purple/Indigo)
    ctx.fillStyle = isDarkCurrent ? 'rgba(76, 29, 149, 0.5)' : 'rgba(224, 231, 255, 0.7)';
    ctx.fillRect(0, 0, canvas.width, 40);
    ctx.fillRect(0, 140, canvas.width, 40); // center median
    ctx.fillRect(0, 260, canvas.width, 40); // starting line

    // Draw Logs / Turtles
    state.logs.forEach(log => {
      ctx.fillStyle = log.color;
      ctx.shadowBlur = isDarkCurrent ? 6 : 1;
      ctx.shadowColor = log.color;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(log.x, log.y - 8, log.width, 16, 6);
      } else {
        ctx.rect(log.x, log.y - 8, log.width, 16);
      }
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Draw Cars
    state.cars.forEach(car => {
      ctx.fillStyle = car.color;
      ctx.shadowBlur = isDarkCurrent ? 8 : 2;
      ctx.shadowColor = car.color;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(car.x, car.y - 7, car.width, 14, 4);
      } else {
        ctx.rect(car.x, car.y - 7, car.width, 14);
      }
      ctx.fill();
      
      // Draw Wheels
      ctx.fillStyle = '#000000';
      ctx.shadowBlur = 0;
      ctx.fillRect(car.x + 3, car.y - 9, 6, 2);
      ctx.fillRect(car.x + car.width - 9, car.y - 9, 6, 2);
      ctx.fillRect(car.x + 3, car.y + 7, 6, 2);
      ctx.fillRect(car.x + car.width - 9, car.y + 7, 6, 2);
    });

    // Draw Lane Markings
    ctx.strokeStyle = isDarkCurrent ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    [200, 220, 240].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(0, y - 10);
      ctx.lineTo(canvas.width, y - 10);
      ctx.stroke();
    });
    ctx.setLineDash([]); // reset

    // Draw Frog
    ctx.fillStyle = isDarkCurrent ? '#22c55e' : '#16a34a'; // Green
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = isDarkCurrent ? 10 : 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size / 2 + 1, 0, Math.PI * 2);
    ctx.fill();

    // Frog Eyes
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(f.x - 4, f.y - 4, 3, 0, Math.PI * 2);
    ctx.arc(f.x + 4, f.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(f.x - 4, f.y - 4, 1.2, 0, Math.PI * 2);
    ctx.arc(f.x + 4, f.y - 4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    gameLoopRef.current = requestAnimationFrame(update);
  };

  const handleDpadPress = (dx: number, dy: number) => {
    if (!isPlaying || gameOver || gameWon) return;
    const f = stateRef.current.frog;
    f.x = Math.max(10, Math.min(270, f.x + dx * 20));
    f.y = Math.max(20, Math.min(260, f.y + dy * 20));
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      
      {/* Top Controls */}
      <div className="w-full flex items-center justify-between mb-2">
        <button aria-label={t('action.close') || 'Close'} 
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
        </button>
        
        <h2 className="text-xl font-black tracking-tighter text-emerald-500 dark:text-emerald-400">
          {t('arcade.frogger.title') || 'عبور الضفدع'} 🐸
        </h2>

        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-emerald-500 dark:text-emerald-400 text-sm">favorite</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-300">
            {isRTL ? `الأرواح: ${lives}` : `Lives: ${lives}`}
          </span>
        </div>
      </div>

      {/* Canvas Game Stage */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,360px)] aspect-[3/2.8] border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={280} 
          className="w-full h-full object-contain"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-emerald-500 dark:text-emerald-400 animate-bounce mb-2">nature_people</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-emerald-200">{isRTL ? 'تحدي عبور الضفدع' : 'Frogger Challenge'}</h3>
            
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
              {isRTL ? 'تخط السيارات المسرعة واعبر النهر بأمان! حقق 1000 نقطة للفوز.' : 'Avoid cars, jump on logs. Get 1000 pts to win.'}
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
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">
              {gameWon ? 'emoji_events' : 'sentiment_very_dissatisfied'}
            </span>
            <h3 className={`text-sm font-black ${gameWon ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'}`}>
              {gameWon ? (isRTL ? 'انتصار تام! 🎉🏆' : 'VICTORY! 🎉🏆') : (isRTL ? 'انتهت اللعبة! 💔' : 'GAME OVER! 💔')}
            </h3>
            <p className="text-xs font-bold mt-2 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط' : 'Score'}: <span className="text-emerald-500 dark:text-emerald-400 font-black">{score}</span>
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

      {/* D-Pad Controller */}
      <div className="grid grid-cols-3 gap-2 max-w-[170px] mx-auto select-none relative z-10 my-2">
        <div></div>
        <button aria-label={t('action.moveUp') || 'Move up'} 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(0, -1); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-emerald-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_up</span>
        </button>
        <div></div>
        
        <button aria-label={t('action.moveLeft') || 'Move left'} 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(-1, 0); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-emerald-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_left</span>
        </button>
        <div className="w-12 h-12 flex items-center justify-center text-emerald-500/20">
          <span className="material-symbols-outlined text-xs">circle</span>
        </div>
        <button aria-label={t('action.moveRight') || 'Move right'} 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(1, 0); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-emerald-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_right</span>
        </button>
        
        <div></div>
        <button aria-label={t('action.moveDown') || 'Move down'} 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(0, 1); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-emerald-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_down</span>
        </button>
        <div></div>
      </div>

      {/* Info Stats Bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'العبور نشط...' : 'Steering live...'}</span>
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
