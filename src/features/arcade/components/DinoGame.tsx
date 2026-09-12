import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useArcadeStore } from '../store/arcadeStore';
import { useIsDark } from '@/hooks/useIsDark';

interface DinoGameProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

export function DinoGame({ highScore, onClose, onGameOver }: DinoGameProps) {
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

  // Game physics state
  const stateRef = useRef({
    dinoY: 0,
    dinoVelocityY: 0,
    isJumping: false,
    obstacles: [] as Array<{ x: number; width: number; height: number; type: number }>,
    nextObstacleTimer: 0,
    speed: 6,
    score: 0,
    highScore: highScore,
    pointsAwardedToday: false
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('dino')) {
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

    const awarded = await useArcadeStore.getState().awardDailyPoints('dino', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const jump = () => {
    if (!stateRef.current.isJumping && isPlaying && !gameOver) {
      stateRef.current.dinoVelocityY = -12;
      stateRef.current.isJumping = true;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameOver) {
          restartGame();
        } else if (!isPlaying) {
          startGame();
        } else {
          jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver]);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);

    // Speed and obstacles initial state based on difficulty
    let initialSpeed = 6;
    let initialObstacleTimer = 30;
    if (difficulty === 'easy') {
      initialSpeed = 4.5;
      initialObstacleTimer = 35;
    } else if (difficulty === 'medium') {
      initialSpeed = 6;
      initialObstacleTimer = 25;
    } else if (difficulty === 'hard') {
      initialSpeed = 8.5;
      initialObstacleTimer = 15;
    }

    stateRef.current = {
      dinoY: 150,
      dinoVelocityY: 0,
      isJumping: false,
      obstacles: [],
      nextObstacleTimer: initialObstacleTimer,
      speed: initialSpeed,
      score: 0,
      highScore: currentHighScore,
      pointsAwardedToday: stateRef.current.pointsAwardedToday
    };
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const restartGame = () => {
    startGame();
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const state = stateRef.current;

    // Update Dino Position
    state.dinoVelocityY += 0.6; // Gravity
    state.dinoY += state.dinoVelocityY;

    // Ground collision
    if (state.dinoY >= 150) {
      state.dinoY = 150;
      state.dinoVelocityY = 0;
      state.isJumping = false;
    }

    // Add Obstacles
    state.nextObstacleTimer--;
    if (state.nextObstacleTimer <= 0) {
      const obstacleType = Math.random() > 0.5 ? 1 : 2; // 1 = Short Cactus, 2 = Tall
      state.obstacles.push({
        x: canvas.width,
        width: obstacleType === 1 ? 15 : 25,
        height: obstacleType === 1 ? 30 : 45,
        type: obstacleType
      });
      // Random interval between obstacles
      state.nextObstacleTimer = 60 + Math.random() * 80 - (state.speed * 3);
    }

    // Draw Ground
    ctx.beginPath();
    ctx.strokeStyle = isDarkRef.current ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.moveTo(0, 195);
    ctx.lineTo(canvas.width, 195);
    ctx.stroke();

    // Draw Dino (Vector Dino shape)
    ctx.fillStyle = '#22c55e'; // Dino Green
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22c55e';
    ctx.beginPath();
    // Body / Head
    ctx.arc(60, state.dinoY + 20, 15, 0, Math.PI * 2);
    ctx.rect(50, state.dinoY + 20, 20, 25);
    ctx.arc(68, state.dinoY + 12, 8, 0, Math.PI * 2); // Head snout
    ctx.fill();

    // Dino Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(63, state.dinoY + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(63, state.dinoY + 10, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Dino legs (animated)
    ctx.fillStyle = '#16a34a';
    const legOffset = Math.sin(Date.now() / 60) * 6;
    ctx.fillRect(52, state.dinoY + 42, 6, 8 + (state.isJumping ? 0 : legOffset));
    ctx.fillRect(62, state.dinoY + 42, 6, 8 + (state.isJumping ? 0 : -legOffset));

    // Update and Draw Obstacles
    ctx.fillStyle = '#f43f5e'; // Obstacle Red
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f43f5e';
    
    let isHit = false;
    state.obstacles.forEach((obs) => {
      obs.x -= state.speed;

      // Draw obstacle
      ctx.beginPath();
      ctx.roundRect(obs.x, 195 - obs.height, obs.width, obs.height, 4);
      ctx.fill();

      // Check collision (AABB)
      const dinoLeft = 45;
      const dinoRight = 75;
      const dinoTop = state.dinoY + 5;
      const dinoBottom = state.dinoY + 45;

      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;
      const obsTop = 195 - obs.height;
      const obsBottom = 195;

      if (
        dinoRight > obsLeft + 3 && 
        dinoLeft < obsRight - 3 && 
        dinoBottom > obsTop + 3 && 
        dinoTop < obsBottom - 3
      ) {
        isHit = true;
      }
    });

    ctx.shadowBlur = 0; // reset glow

    // Clean up out of bounds obstacles
    state.obstacles = state.obstacles.filter(obs => obs.x > -50);

    // Increase Score
    state.score += 0.15;
    const roundedScore = Math.floor(state.score);
    setScore(roundedScore);

    // Speed increase slowly
    if (roundedScore > 0 && roundedScore % 100 === 0) {
      state.speed += 0.05;
    }

    if (isHit) {
      // Game Over
      setIsPlaying(false);
      setGameOver(true);
      onGameOver(roundedScore);
      if (roundedScore > currentHighScore) {
        setCurrentHighScore(roundedScore);
        awardPoints();
      }
      return;
    }

    gameLoopRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  return (
    <div 
      onClick={jump}
      onTouchStart={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button')) {
          e.preventDefault();
          jump();
        }
      }}
      className="h-full w-full max-w-2xl mx-auto flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden text-slate-800 dark:text-white cursor-pointer"
    >
      {/* Top bar controls */}
      <div className="relative z-10 flex items-center justify-between">
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
          {t('arcade.dino') || 'قفز الديناصور'} 🦖
        </h2>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest leading-none">
              {isRTL ? 'الرقم القياسي الحالي' : 'CURRENT HIGH SCORE'}
            </p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 leading-none">{currentHighScore}</p>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        onClick={jump}
        className="relative my-auto border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden cursor-pointer flex items-center justify-center shadow-lg w-full aspect-[3/1] max-h-[320px]"
      >
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={200} 
          className="w-full h-full object-contain"
        />

        {/* Start Game screen */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-emerald-500 animate-bounce mb-2">sports_esports</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-emerald-200">{isRTL ? 'تحدي قفز الديناصور' : 'Dino Run Challenge'}</h3>
            
            {/* Difficulty Selector */}
            <div className="flex gap-1.5 my-3 relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'easy' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'سهل' : 'Easy'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'medium' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'متوسط' : 'Medium'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'hard' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-200' 
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
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-emerald-500/20"
            >
              {isRTL ? 'ابدأ اللعب الآن' : 'Start Running'}
            </button>
          </div>
        )}

        {/* Game Over screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-5xl text-rose-500 animate-pulse mb-3">sentiment_very_dissatisfied</span>
            <h3 className="text-xl font-black text-rose-500">{isRTL ? 'انتهت اللعبة!' : 'GAME OVER!'}</h3>
            <p className="text-sm font-black mt-2 text-slate-800 dark:text-white">
              {isRTL ? 'النتيجة الإجمالية' : 'Final Score'}: <span className="text-emerald-600 dark:text-emerald-400 text-lg">{score}</span>
            </p>
            {score >= currentHighScore && score > highScore && (
              <p className="text-xs font-black text-amber-500 dark:text-amber-400 mt-2 tracking-widest uppercase animate-pulse">
                👑 {isRTL ? 'رقم قياسي جديد!' : 'NEW HIGH SCORE!'} 👑
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button 
                onClick={(e) => { e.stopPropagation(); restartGame(); }}
                className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
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

      {/* Bottom info bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold pt-2">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'اضغط للشاشة أو المسطرة للقفز...' : 'Tap screen or Space to jump...'}</span>
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
