import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useArcadeStore } from '../store/arcadeStore';
import { useIsDark } from '@/hooks/useIsDark';

interface SnakeGameProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

export function SnakeGame({ highScore, onClose, onGameOver }: SnakeGameProps) {
  const { t, isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Game physics & particles state
  const stateRef = useRef({
    snake: [] as Array<{ x: number; y: number }>,
    direction: { x: 0, y: -1 }, // starting upwards
    nextDirection: { x: 0, y: -1 },
    food: { x: 0, y: 0 },
    gridSize: 20,
    tileCount: 15,
    speed: 130, // interval in ms
    score: 0,
    pointsAwardedToday: false,
    lastUpdate: 0,
    particles: [] as Particle[]
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('snake')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;

    // Award points based on difficulty
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('snake', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const generateFood = () => {
    const state = stateRef.current;
    let newFood = { x: 5, y: 5 };
    let onSnake = true;
    while (onSnake) {
      newFood = {
        x: Math.floor(Math.random() * state.tileCount),
        y: Math.floor(Math.random() * state.tileCount)
      };
      onSnake = state.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    state.food = newFood;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;

      const state = stateRef.current;
      const key = e.key || '';
      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (state.direction.y === 0) state.nextDirection = { x: 0, y: -1 };
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (state.direction.y === 0) state.nextDirection = { x: 0, y: 1 };
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (state.direction.x === 0) state.nextDirection = { x: -1, y: 0 };
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (state.direction.x === 0) state.nextDirection = { x: 1, y: 0 };
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  // Swipe controls for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isPlaying || gameOver) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    
    // Minimum distance to trigger swipe
    const threshold = 30;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (Math.abs(dx) > threshold) {
        const state = stateRef.current;
        if (dx > 0) {
          if (state.direction.x === 0) state.nextDirection = { x: 1, y: 0 }; // Right
        } else {
          if (state.direction.x === 0) state.nextDirection = { x: -1, y: 0 }; // Left
        }
        touchStartRef.current = null;
      }
    } else {
      // Vertical swipe
      if (Math.abs(dy) > threshold) {
        const state = stateRef.current;
        if (dy > 0) {
          if (state.direction.y === 0) state.nextDirection = { x: 0, y: 1 }; // Down
        } else {
          if (state.direction.y === 0) state.nextDirection = { x: 0, y: -1 }; // Up
        }
        touchStartRef.current = null;
      }
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    
    const initialSnake = [
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 7, y: 9 }
    ];

    // Determine initial speed based on difficulty
    let initialSpeed = 135;
    if (difficulty === 'easy') initialSpeed = 175;
    if (difficulty === 'medium') initialSpeed = 125;
    if (difficulty === 'hard') initialSpeed = 80;

    stateRef.current = {
      snake: initialSnake,
      direction: { x: 0, y: -1 },
      nextDirection: { x: 0, y: -1 },
      food: { x: 0, y: 0 },
      gridSize: 20,
      tileCount: 15,
      speed: initialSpeed,
      score: 0,
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      lastUpdate: Date.now(),
      particles: []
    };

    generateFood();
    setScore(0);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    const now = Date.now();
    const elapsed = now - state.lastUpdate;

    if (elapsed > state.speed) {
      state.lastUpdate = now;

      // Update direction
      state.direction = state.nextDirection;

      // Calculate head
      const head = state.snake[0];
      const newHead = {
        x: head.x + state.direction.x,
        y: head.y + state.direction.y
      };

      // Collision checks (Wall and Self)
      if (
        newHead.x < 0 || 
        newHead.x >= state.tileCount || 
        newHead.y < 0 || 
        newHead.y >= state.tileCount ||
        state.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        // Game Over
        setIsPlaying(false);
        setGameOver(true);
        onGameOver(state.score);
        if (state.score > currentHighScore) {
          setCurrentHighScore(state.score);
          awardPoints();
        }
        return;
      }

      // Add new head
      state.snake.unshift(newHead);

      // Food collision
      if (newHead.x === state.food.x && newHead.y === state.food.y) {
        state.score += 10;
        setScore(state.score);
        generateFood();
        
        // Speed up slightly
        state.speed = Math.max(70, state.speed - 3);

        // Spawn 12 glowing particles for explosion
        for (let p = 0; p < 12; p++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 2;
          state.particles.push({
            x: state.food.x * state.gridSize + state.gridSize / 2,
            y: state.food.y * state.gridSize + state.gridSize / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#f59e0b',
            alpha: 1.0,
            size: Math.random() * 2 + 2
          });
        }
      } else {
        // Remove tail
        state.snake.pop();
      }
    }

    // DRAW STAGE
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Cyber Grid background
    ctx.strokeStyle = isDarkRef.current ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= state.tileCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * state.gridSize, 0);
      ctx.lineTo(i * state.gridSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * state.gridSize);
      ctx.lineTo(canvas.width, i * state.gridSize);
      ctx.stroke();
    }

    // Update and Draw particles
    state.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.04;
      
      if (p.alpha <= 0) {
        state.particles.splice(idx, 1);
        return;
      }
      
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw pulsing golden Apple (Food)
    const pulse = Math.sin(now / 120) * 1.5;
    ctx.shadowBlur = 15 + pulse * 3;
    ctx.shadowColor = '#f59e0b';
    ctx.fillStyle = '#f59e0b'; // Gold
    ctx.beginPath();
    ctx.arc(
      state.food.x * state.gridSize + state.gridSize / 2,
      state.food.y * state.gridSize + state.gridSize / 2,
      Math.max(3, state.gridSize / 2 - 2.5 + pulse * 0.4),
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw glowing Snake with custom eyes
    state.snake.forEach((segment, idx) => {
      ctx.shadowBlur = idx === 0 ? 15 : 6;
      ctx.shadowColor = '#a855f7';
      
      // Color gradient from head to tail
      ctx.fillStyle = idx === 0 ? '#e9d5ff' : '#a855f7';
      
      ctx.beginPath();
      ctx.roundRect(
        segment.x * state.gridSize + 1,
        segment.y * state.gridSize + 1,
        state.gridSize - 2,
        state.gridSize - 2,
        idx === 0 ? 8 : 4 // Rounder head
      );
      ctx.fill();

      // If head, draw directional glowing eyes
      if (idx === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000'; // black pupils
        
        const headCenterX = segment.x * state.gridSize + state.gridSize / 2;
        const headCenterY = segment.y * state.gridSize + state.gridSize / 2;
        
        let eye1X = headCenterX - 4;
        let eye1Y = headCenterY - 4;
        let eye2X = headCenterX + 4;
        let eye2Y = headCenterY - 4;
        
        if (state.direction.x !== 0) {
          eye1X = headCenterX + state.direction.x * 4;
          eye1Y = headCenterY - 4;
          eye2X = headCenterX + state.direction.x * 4;
          eye2Y = headCenterY + 4;
        } else if (state.direction.y !== 0) {
          eye1X = headCenterX - 4;
          eye1Y = headCenterY + state.direction.y * 4;
          eye2X = headCenterX + 4;
          eye2Y = headCenterY + state.direction.y * 4;
        }
        
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, 1.5, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.shadowBlur = 0; // reset
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const handleDpadPress = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    const state = stateRef.current;
    
    switch (dir) {
      case 'up':
        if (state.direction.y === 0) state.nextDirection = { x: 0, y: -1 };
        break;
      case 'down':
        if (state.direction.y === 0) state.nextDirection = { x: 0, y: 1 };
        break;
      case 'left':
        if (state.direction.x === 0) state.nextDirection = { x: -1, y: 0 };
        break;
      case 'right':
        if (state.direction.x === 0) state.nextDirection = { x: 1, y: 0 };
        break;
    }
  };

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  return (
    <div className="h-full w-full max-w-xl mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white">
      {/* Top bar controls */}
      <div className="relative z-10 flex items-center justify-between">
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-purple-600 dark:text-purple-400">
          {t('arcade.snake') || 'الثعبان'} 🐍
        </h2>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest leading-none">
              {isRTL ? 'الرقم القياسي الحالي' : 'CURRENT HIGH SCORE'}
            </p>
            <p className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5 leading-none">{currentHighScore}</p>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="relative my-auto border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,360px)] aspect-square"
      >
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={300} 
          className="w-full h-full object-contain"
        />

        {/* Start Game screen */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-purple-500 animate-bounce mb-2">gesture</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-purple-200">{isRTL ? 'تحدي الثعبان' : 'Snake Challenge'}</h3>
            
            {/* Difficulty Selector */}
            <div className="flex gap-1.5 my-3 relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'easy' 
                    ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'سهل' : 'Easy'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'medium' 
                    ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'متوسط' : 'Medium'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'hard' 
                    ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'صعب 🔥' : 'Hard 🔥'}
              </button>
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[220px] mb-3 leading-snug">
              {isRTL 
                ? 'مكافآت كسر الرقم القياسي: سهل 5، متوسط 15، صعب 30 نقطة!' 
                : 'High score bonuses: Easy 5, Medium 15, Hard 30 pts!'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-purple-500/20"
            >
              {isRTL ? 'ابدأ اللعب' : 'Start Game'}
            </button>
          </div>
        )}

        {/* Game Over screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-5xl text-rose-500 animate-pulse mb-3">sentiment_very_dissatisfied</span>
            <h3 className="text-xl font-black text-rose-500">{isRTL ? 'انتهت اللعبة!' : 'GAME OVER!'}</h3>
            <p className="text-sm font-black mt-2 text-slate-800 dark:text-white">
              {isRTL ? 'النتيجة الإجمالية' : 'Final Score'}: <span className="text-purple-600 dark:text-purple-400 text-lg">{score}</span>
            </p>
            {score >= currentHighScore && score > highScore && (
              <p className="text-xs font-black text-amber-500 dark:text-amber-400 mt-2 tracking-widest uppercase animate-pulse">
                👑 {isRTL ? 'رقم قياسي جديد!' : 'NEW HIGH SCORE!'} 👑
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
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

      {/* On-screen controls (D-Pad) for Mobile */}
      <div dir="ltr" className="grid grid-cols-3 gap-2 max-w-[170px] mx-auto my-2 relative z-10 select-none">
        <div></div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress('up'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-purple-500/20 active:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-all active:scale-90 shadow-sm"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_up</span>
        </button>
        <div></div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress('left'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-purple-500/20 active:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-all active:scale-90 shadow-sm"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_left</span>
        </button>
        <div className="w-12 h-12 flex items-center justify-center text-purple-500/20">
          <span className="material-symbols-outlined text-sm">circle</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress('right'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-purple-500/20 active:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-all active:scale-90 shadow-sm"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_right</span>
        </button>
        
        <div></div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDpadPress('down'); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-purple-500/20 active:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-all active:scale-90 shadow-sm"
        >
          <span className="material-symbols-outlined text-2xl">keyboard_arrow_down</span>
        </button>
        <div></div>
      </div>

      {/* Bottom info bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold pt-1">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'تحرك بمهارة...' : 'Steering snake...'}</span>
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
