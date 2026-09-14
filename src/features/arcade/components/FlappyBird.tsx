import React, { useEffect, useRef, useState } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { useArcadeStore } from '../store/arcadeStore';

interface FlappyBirdProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

export function FlappyBird({ highScore, onClose, onGameOver }: FlappyBirdProps) {
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
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    bird: { y: 100, vy: 0, gravity: 0.35, jumpPower: -5.5, size: 8 },
    pipes: [] as Pipe[],
    pipeSpeed: 2.0,
    gap: 90,
    spawnTimer: 0,
    ticks: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('flappy')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;

    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('flappy', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);

    let speed = 2.0;
    let pipeGap = 90;
    let birdGravity = 0.35;
    if (difficulty === 'easy') {
      speed = 1.6;
      pipeGap = 110;
      birdGravity = 0.28;
    } else if (difficulty === 'medium') {
      speed = 2.1;
      pipeGap = 90;
      birdGravity = 0.35;
    } else if (difficulty === 'hard') {
      speed = 2.7;
      pipeGap = 75;
      birdGravity = 0.42;
    }

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      bird: { y: 100, vy: 0, gravity: birdGravity, jumpPower: -5.2, size: 8 },
      pipes: [],
      pipeSpeed: speed,
      gap: pipeGap,
      spawnTimer: 0,
      ticks: 0
    };

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const jump = () => {
    if (!isPlaying) {
      startGame();
    } else {
      const b = stateRef.current.bird;
      b.vy = b.jumpPower;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver]);

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

    // 1. Move Bird
    const b = state.bird;
    b.vy += b.gravity;
    b.y += b.vy;

    // Ground and Ceiling collision
    if (b.y - b.size < 0 || b.y + b.size > canvas.height) {
      handleGameOver();
      return;
    }

    // 2. Spawn Pipes
    state.spawnTimer--;
    if (state.spawnTimer <= 0) {
      const minHeight = 40;
      const maxHeight = canvas.height - state.gap - minHeight;
      const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
      const bottomHeight = canvas.height - state.gap - topHeight;

      state.pipes.push({
        x: canvas.width,
        topHeight,
        bottomHeight,
        passed: false
      });
      // Spawn spacing interval
      state.spawnTimer = difficulty === 'easy' ? 110 : difficulty === 'medium' ? 90 : 70;
    }

    // 3. Move and Collision Checks on Pipes
    let hit = false;
    state.pipes.forEach(pipe => {
      pipe.x -= state.pipeSpeed;

      // Score increment
      if (!pipe.passed && pipe.x < 50) {
        pipe.passed = true;
        state.score++;
        setScore(state.score);
      }

      // Box Collision Check
      const birdLeft = 50 - b.size;
      const birdRight = 50 + b.size;
      const birdTop = b.y - b.size;
      const birdBottom = b.y + b.size;

      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + 32; // pipe width

      if (birdRight > pipeLeft + 2 && birdLeft < pipeRight - 2) {
        // Collide with top pipe
        if (birdTop < pipe.topHeight - 2) hit = true;
        // Collide with bottom pipe
        if (birdBottom > canvas.height - pipe.bottomHeight + 2) hit = true;
      }
    });

    if (hit) {
      handleGameOver();
      return;
    }

    // Filter off-screen pipes
    state.pipes = state.pipes.filter(pipe => pipe.x > -50);

    // DRAW STAGE
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDarkCurrent = isDarkRef.current;
    if (!isDarkCurrent) {
      ctx.fillStyle = 'rgba(240, 249, 255, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw Pipes
    state.pipes.forEach(pipe => {
      ctx.fillStyle = isDarkCurrent ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.85)';
      ctx.strokeStyle = isDarkCurrent ? 'rgba(16, 185, 129, 0.8)' : 'rgba(5, 150, 105, 0.95)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = isDarkCurrent ? 8 : 2;
      ctx.shadowColor = '#10b981';

      // Top Pipe
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pipe.x, 0, 32, pipe.topHeight, [0, 0, 6, 6]);
      } else {
        ctx.rect(pipe.x, 0, 32, pipe.topHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Bottom Pipe
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pipe.x, canvas.height - pipe.bottomHeight, 32, pipe.bottomHeight, [6, 6, 0, 0]);
      } else {
        ctx.rect(pipe.x, canvas.height - pipe.bottomHeight, 32, pipe.bottomHeight);
      }
      ctx.fill();
      ctx.stroke();
    });
    ctx.shadowBlur = 0; // reset

    // Draw Bird
    ctx.fillStyle = isDarkCurrent ? '#06b6d4' : '#0284c7';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = isDarkCurrent ? 12 : 3;
    ctx.beginPath();
    ctx.arc(50, b.y, b.size + 1, 0, Math.PI * 2);
    ctx.fill();

    // Wing animations
    ctx.fillStyle = isDarkCurrent ? '#e0f2fe' : '#bae6fd';
    ctx.shadowBlur = 0;
    const wingOffset = Math.sin(state.ticks / 3) * 4;
    ctx.beginPath();
    ctx.ellipse(46, b.y + wingOffset / 2, 4, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Bird eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(52, b.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eye pupil
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(52.5, b.y - 3, 1, 0, Math.PI * 2);
    ctx.fill();

    gameLoopRef.current = requestAnimationFrame(update);
  };

  const handleGameOver = () => {
    setIsPlaying(false);
    setGameOver(true);
    onGameOver(stateRef.current.score);
    if (stateRef.current.score > currentHighScore) {
      setCurrentHighScore(stateRef.current.score);
      awardPoints();
    }
  };

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
      className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white cursor-pointer animate-in fade-in duration-300"
  role="button" tabIndex={0} onKeyDown={onActivate(jump)}>
      
      {/* Top Controls */}
      <div className="w-full flex items-center justify-between mb-2">
        <button aria-label={t('action.close') || 'Close'} 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
        </button>
        
        <h2 className="text-xl font-black tracking-tighter text-cyan-500 dark:text-cyan-400">
          {t('arcade.flappy.title') || 'الطائر الرفراف'} 🐦
        </h2>

        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-cyan-500 dark:text-cyan-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-cyan-600 dark:text-cyan-300">
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Canvas Game Stage */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,360px)] aspect-[3/2.6] border border-slate-200 dark:border-white/10 rounded-3xl bg-sky-50/80 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={260} 
          className="w-full h-full object-contain"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-cyan-500 dark:text-cyan-400 animate-bounce mb-2">flight_takeoff</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-cyan-200">{isRTL ? 'تحدي الطائر الرفراف' : 'Flappy Bird Challenge'}</h3>
            
            {/* Difficulty */}
            <div className="flex gap-1.5 my-3 relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'easy' 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'سهل' : 'Easy'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'medium' 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'متوسط' : 'Medium'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'hard' 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'صعب 🔥' : 'Hard 🔥'}
              </button>
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[200px] mb-3 leading-snug">
              {isRTL ? 'انقر على الشاشة لجعل الطائر يطير عبر الفجوات! مكافآت: 5، 15، 30 نقطة ولاء.' : 'Tap screen to flap wings, avoid glass pipes. Rewards: 5, 15, 30 pts.'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-cyan-500/20"
            >
              {isRTL ? 'ابدأ الطيران' : 'Start Flapping'}
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">sentiment_very_dissatisfied</span>
            <h3 className="text-sm font-black text-rose-500">{isRTL ? 'انتهت اللعبة! 💔' : 'GAME OVER! 💔'}</h3>
            <p className="text-xs font-bold mt-2 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط المحرزة' : 'Score'}: <span className="text-cyan-500 dark:text-cyan-400 font-black">{score}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
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

      {/* On-Screen Flap Button & Indicator */}
      <div className="flex flex-col items-center gap-1 my-2 relative z-10">
        <button aria-label={t('action.flap') || 'Flap'}
          onClick={(e) => { e.stopPropagation(); jump(); }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-md active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">flight_takeoff</span>
        </button>
        <span className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-wider">
          {isRTL ? 'انقر في أي مكان أو الزر للتحليق' : 'Tap anywhere or button to flap'}
        </span>
      </div>

      {/* Info Stats Bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'تحليق نشط...' : 'Flapping live...'}</span>
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
