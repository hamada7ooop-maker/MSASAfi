import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { useArcadeStore } from '../store/arcadeStore';

interface TowerBloxxProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Block {
  y: number;
  x: number;
  width: number;
  height: number;
  color: string;
}

export function TowerBloxx({ highScore, onClose, onGameOver }: TowerBloxxProps) {
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
    crane: { angle: 0, speed: 0.04, length: 50, x: 150, y: 10 },
    fallingBlock: null as { x: number; y: number; vy: number; width: number; height: number; color: string } | null,
    placedBlocks: [] as Block[],
    cameraY: 0,
    swayingTimer: 0,
    ticks: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('bloxx')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('bloxx', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);

    let speedVal = 0.04;
    if (difficulty === 'easy') speedVal = 0.025;
    if (difficulty === 'medium') speedVal = 0.04;
    if (difficulty === 'hard') speedVal = 0.06;

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      crane: { angle: 0, speed: speedVal, length: 50, x: 150, y: 10 },
      fallingBlock: null,
      placedBlocks: [
        // base block at the bottom (y=260)
        { x: 120, y: 260, width: 60, height: 20, color: '#475569' }
      ],
      cameraY: 0,
      swayingTimer: 0,
      ticks: 0
    };

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const dropBlock = () => {
    if (!isPlaying || gameOver) return;
    const state = stateRef.current;
    if (state.fallingBlock) return; // already dropping

    // Calculate crane block x using angle
    const angleX = state.crane.x + Math.sin(state.crane.angle) * state.crane.length;
    const angleY = state.crane.y + Math.cos(state.crane.angle) * state.crane.length;

    const blockColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
    const color = blockColors[Math.floor(Math.random() * blockColors.length)];

    state.fallingBlock = {
      x: angleX - 25,
      y: angleY,
      vy: 4.5, // drop speed
      width: 50,
      height: 18,
      color
    };
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowDown') {
      e.preventDefault();
      if (!isPlaying) startGame();
      else dropBlock();
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

    // 1. Move Crane (Swaying back and forth)
    state.crane.angle += state.crane.speed;
    if (state.crane.angle > Math.PI / 4.5 || state.crane.angle < -Math.PI / 4.5) {
      state.crane.speed *= -1; // bounce angle
    }

    // 2. Move Falling Block
    const fb = state.fallingBlock;
    if (fb) {
      fb.y += fb.vy;

      // Determine top placed block to land on
      const topBlock = state.placedBlocks[state.placedBlocks.length - 1];
      const landY = topBlock.y - fb.height;

      // Collision Check
      if (fb.y >= landY) {
        // Did it land on top of the block? (overlapping x coordinates)
        const overlapX = fb.x + fb.width > topBlock.x && fb.x < topBlock.x + topBlock.width;
        if (overlapX) {
          // Success landing! Place the block
          state.placedBlocks.push({
            x: fb.x,
            y: landY,
            width: fb.width,
            height: fb.height,
            color: fb.color
          });
          state.fallingBlock = null;
          state.score += 50;
          setScore(state.score);

          // Scroll camera up dynamically if blocks exceed a certain height
          if (landY < 130) {
            state.cameraY += fb.height;
            // Shift all placed blocks down visually to maintain perspective
            state.placedBlocks.forEach(b => b.y += fb.height);
          }
        } else {
          // Off center - game over!
          setIsPlaying(false);
          setGameOver(true);
          onGameOver(state.score);
          if (state.score > currentHighScore) {
            setCurrentHighScore(state.score);
            awardPoints();
          }
          return;
        }
      }
    }

    // DRAW STAGE
    const isDarkCurrent = isDarkRef.current;
    ctx.fillStyle = isDarkCurrent ? '#0b0f19' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Background Lines (Grid)
    ctx.strokeStyle = isDarkCurrent ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw Placed Blocks
    state.placedBlocks.forEach((b, idx) => {
      // Swaying effect on the tower depending on height and perfect alignment
      let sway = 0;
      if (idx > 0) {
        sway = Math.sin(state.ticks * 0.02 + idx * 0.1) * (idx * 0.4);
      }

      ctx.fillStyle = b.color;
      ctx.shadowBlur = isDarkCurrent ? 8 : 2;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(b.x + sway, b.y, b.width, b.height, 4);
      } else {
        ctx.rect(b.x + sway, b.y, b.width, b.height);
      }
      ctx.fill();
    });
    ctx.shadowBlur = 0; // reset

    // Draw Falling Block
    if (fb) {
      ctx.fillStyle = fb.color;
      ctx.shadowBlur = isDarkCurrent ? 10 : 3;
      ctx.shadowColor = fb.color;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(fb.x, fb.y, fb.width, fb.height, 4);
      } else {
        ctx.rect(fb.x, fb.y, fb.width, fb.height);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Crane & Rope
    const c = state.crane;
    const ropeEndX = c.x + Math.sin(c.angle) * c.length;
    const ropeEndY = c.y + Math.cos(c.angle) * c.length;

    // Crane Head
    ctx.fillStyle = isDarkCurrent ? '#64748b' : '#94a3b8';
    ctx.fillRect(c.x - 20, c.y, 40, 6);

    // Rope
    ctx.strokeStyle = isDarkCurrent ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + 6);
    ctx.lineTo(ropeEndX, ropeEndY);
    ctx.stroke();

    // Crane Block attachment
    if (!fb) {
      ctx.fillStyle = isDarkCurrent ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(ropeEndX, ropeEndY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    gameLoopRef.current = requestAnimationFrame(update);
  };

  return (
    <div 
      onClick={dropBlock}
      className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300 cursor-pointer"
    >
      {/* Top Controls */}
      <div className="relative z-10 flex items-center justify-between">
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        <h2 className="text-xl font-black tracking-tighter text-indigo-500 dark:text-indigo-400">
          {t('arcade.bloxx.title') || 'كتل البناء'} 🏗️
        </h2>

        <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-300">
          <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400 text-sm">emoji_events</span>
          <span>
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Grid / Stage Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,320px)] aspect-[300/280] border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={280} 
          className="w-full h-full object-contain"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-indigo-500 dark:text-indigo-400 animate-bounce mb-2">construction</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-indigo-200">{isRTL ? 'تحدي كتل البناء' : 'Tower Bloxx Challenge'}</h3>
            
            {/* Difficulty */}
            <div className="flex gap-1.5 my-3 relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'easy' 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'سهل' : 'Easy'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'medium' 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'متوسط' : 'Medium'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'hard' 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'صعب 🔥' : 'Hard 🔥'}
              </button>
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[200px] mb-3 leading-snug">
              {isRTL ? 'اسقط الكتل بدقة فوق بعضها البعض لبناء أعلى برج! مكافآت: 5، 15، 30 نقطة.' : 'Drop swinging blocks perfectly on top to build a sky-high tower. Rewards: 5, 15, 30 pts.'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-indigo-500/20"
            >
              {isRTL ? 'ابدأ البناء' : 'Start Stacking'}
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">sentiment_very_dissatisfied</span>
            <h3 className="text-sm font-black text-rose-500">{isRTL ? 'انهار البرج! 💔' : 'TOWER COLLAPSED! 💔'}</h3>
            <p className="text-xs font-bold mt-2 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط المحرزة' : 'Final Score'}: <span className="text-indigo-600 dark:text-indigo-400 font-black">{score}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
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

      {/* On-Screen Touch Action Button & Instruction */}
      <div className="flex flex-col items-center gap-2 relative z-10 my-2">
        <button
          onClick={(e) => { e.stopPropagation(); dropBlock(); }}
          disabled={!isPlaying || gameOver}
          className="w-full max-w-[280px] py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-sm uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">arrow_downward</span>
          <span>{isRTL ? 'اسقط الكتلة الآن' : 'Drop Block Now'}</span>
        </button>
        <span className="text-[10px] font-bold text-slate-400 dark:text-white/40">
          {isRTL ? 'أو انقر في أي مكان على الشاشة للإسقاط' : 'Or tap anywhere on screen to drop'}
        </span>
      </div>

      {/* Info Stats Bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'برج متمايل...' : 'Stacking live...'}</span>
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
