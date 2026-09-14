import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { useArcadeStore } from '../store/arcadeStore';

interface PongProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

export function Pong({ highScore: _highScore, onClose, onGameOver }: PongProps) {
  const { t, isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scoreLeft, setScoreLeft] = useState(0);
  const [scoreRight, setScoreRight] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);

  const stateRef = useRef({
    pointsAwardedToday: false,
    leftPaddle: { y: 100, width: 10, height: 60, score: 0 },
    rightPaddle: { y: 100, width: 10, height: 60, score: 0 },
    ball: { x: 150, y: 100, vx: 2.5, vy: 1.5, radius: 5 },
    speedMultiplier: 1.0,
    ticks: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('pong')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('pong', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
    setScoreLeft(0);
    setScoreRight(0);

    let speed = 1.0;
    if (difficulty === 'easy') speed = 0.8;
    if (difficulty === 'medium') speed = 1.1;
    if (difficulty === 'hard') speed = 1.5;

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      leftPaddle: { y: 70, width: 8, height: 50, score: 0 },
      rightPaddle: { y: 70, width: 8, height: 50, score: 0 },
      ball: { x: 150, y: 100, vx: 3.0 * speed, vy: 1.8 * speed, radius: 5 },
      speedMultiplier: speed,
      ticks: 0
    };

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlaying || gameOver || gameWon) return;
    const p = stateRef.current.leftPaddle;
    const step = 20;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      p.y = Math.max(0, p.y - step);
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      p.y = Math.min(200 - p.height, p.y + step);
      e.preventDefault();
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

    // 1. Move Ball
    const b = state.ball;
    b.x += b.vx;
    b.y += b.vy;

    // Top / Bottom Wall Collisions
    if (b.y - b.radius < 0 || b.y + b.radius > canvas.height) {
      b.vy *= -1;
      b.y = b.y - b.radius < 0 ? b.radius : canvas.height - b.radius;
    }

    // 2. AI right paddle movement (CPU)
    const rp = state.rightPaddle;
    const cpuSpeed = difficulty === 'easy' ? 1.0 : difficulty === 'medium' ? 1.9 : 3.0;
    const targetY = b.y - rp.height / 2;
    if (rp.y < targetY) {
      rp.y = Math.min(canvas.height - rp.height, rp.y + cpuSpeed);
    } else if (rp.y > targetY) {
      rp.y = Math.max(0, rp.y - cpuSpeed);
    }

    // 3. Paddle Collisions
    const lp = state.leftPaddle;
    
    // Left Paddle collision
    if (
      b.vx < 0 &&
      b.x - b.radius <= 15 &&
      b.x - b.radius >= 5 &&
      b.y >= lp.y &&
      b.y <= lp.y + lp.height
    ) {
      b.vx = Math.abs(b.vx) * 1.05; // speed up slightly on hit
      const relativeHit = (b.y - (lp.y + lp.height / 2)) / (lp.height / 2);
      b.vy = relativeHit * 3;
    }

    // Right Paddle collision
    if (
      b.vx > 0 &&
      b.x + b.radius >= canvas.width - 15 &&
      b.x + b.radius <= canvas.width - 5 &&
      b.y >= rp.y &&
      b.y <= rp.y + rp.height
    ) {
      b.vx = -Math.abs(b.vx) * 1.05;
      const relativeHit = (b.y - (rp.y + rp.height / 2)) / (rp.height / 2);
      b.vy = relativeHit * 3;
    }

    // 4. Scoring
    if (b.x < 0) {
      // Right scores
      rp.score++;
      setScoreRight(rp.score);
      resetBall(1);
    } else if (b.x > canvas.width) {
      // Left scores
      lp.score++;
      setScoreLeft(lp.score);
      resetBall(-1);
    }

    // Win condition check
    if (lp.score >= 5) {
      setIsPlaying(false);
      setGameWon(true);
      onGameOver(lp.score);
      awardPoints();
      return;
    } else if (rp.score >= 5) {
      setIsPlaying(false);
      setGameOver(true);
      onGameOver(lp.score);
      return;
    }

    // DRAW STAGE
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDarkCurrent = isDarkRef.current;
    if (!isDarkCurrent) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Grid center line
    ctx.strokeStyle = isDarkCurrent ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Draw Left Paddle
    ctx.fillStyle = '#06b6d4';
    ctx.shadowBlur = isDarkCurrent ? 8 : 2;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(10, lp.y, lp.width, lp.height, 3);
    } else {
      ctx.rect(10, lp.y, lp.width, lp.height);
    }
    ctx.fill();

    // Draw Right Paddle
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = isDarkCurrent ? 8 : 2;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(canvas.width - 10 - rp.width, rp.y, rp.width, rp.height, 3);
    } else {
      ctx.rect(canvas.width - 10 - rp.width, rp.y, rp.width, rp.height);
    }
    ctx.fill();

    // Draw Ball
    ctx.fillStyle = isDarkCurrent ? '#ffffff' : '#0f172a';
    ctx.shadowBlur = isDarkCurrent ? 10 : 2;
    ctx.shadowColor = isDarkCurrent ? '#ffffff' : 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    gameLoopRef.current = requestAnimationFrame(update);
  };

  const resetBall = (dir: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = stateRef.current;
    const speed = state.speedMultiplier;
    state.ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: dir * 3.0 * speed,
      vy: (Math.random() - 0.5) * 3 * speed,
      radius: 5
    };
  };

  const handlePaddleMove = (dy: number) => {
    if (!isPlaying || gameOver || gameWon) return;
    const lp = stateRef.current.leftPaddle;
    lp.y = Math.max(0, Math.min(200 - lp.height, lp.y + dy * 20));
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
        
        <h2 className="text-xl font-black tracking-tighter text-cyan-500 dark:text-cyan-400">
          {t('arcade.pong.title') || 'التنس الكلاسيكي'} 🏓
        </h2>

        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-cyan-500 dark:text-cyan-400 text-sm">sports_tennis</span>
          <span className="text-xs font-black text-cyan-600 dark:text-cyan-300">
            {scoreLeft} - {scoreRight}
          </span>
        </div>
      </div>

      {/* Canvas Game Stage */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,360px)] aspect-[3/2] border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={200} 
          className="w-full h-full object-contain"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-cyan-500 dark:text-cyan-400 animate-bounce mb-2">sports_tennis</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-cyan-200">{isRTL ? 'تحدي التنس الكلاسيكي' : 'Pong Tennis Challenge'}</h3>
            
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
              {isRTL ? 'تحرك للعب ضد الخصم! أول من يحرز 5 نقاط يفوز. مكافآت: 5، 15، 30 نقطة.' : 'Move to play against CPU. First to 5 wins. Rewards: 5, 15, 30 pts.'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-cyan-500/20"
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
            <h3 className={`text-sm font-black ${gameWon ? 'text-cyan-500 dark:text-cyan-400' : 'text-rose-500'}`}>
              {gameWon ? (isRTL ? 'انتصار تام! 🎉🏆' : 'VICTORY! 🎉🏆') : (isRTL ? 'انتهت اللعبة! 💔' : 'GAME OVER! 💔')}
            </h3>
            <p className="text-xs font-bold mt-2 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النتيجة النهائية' : 'Final Score'}: <span className="text-cyan-500 dark:text-cyan-400 font-black">{scoreLeft} - {scoreRight}</span>
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

      {/* Manual Vertical controls for Mobile */}
      <div className="flex justify-center gap-6 max-w-[200px] mx-auto select-none relative z-10 my-2">
        <button aria-label={t('action.moveUp') || 'Move up'} 
          onClick={(e) => { e.stopPropagation(); handlePaddleMove(-1); }}
          className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_up</span>
        </button>
        <button aria-label={t('action.moveDown') || 'Move down'} 
          onClick={(e) => { e.stopPropagation(); handlePaddleMove(1); }}
          className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-cyan-400 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_down</span>
        </button>
      </div>

      {/* Info Stats Bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'مباراة جارية...' : 'Match live...'}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
