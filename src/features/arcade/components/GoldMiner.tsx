import React, { useEffect, useRef, useState } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface GoldMinerProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface GoldItem {
  x: number;
  y: number;
  radius: number;
  type: 'gold' | 'rock' | 'bag';
  value: number;
  weight: number; // pulls back speed divider
  color: string;
}

export function GoldMiner({ highScore, onClose, onGameOver }: GoldMinerProps) {
  const { t, isRTL } = useI18n();
  const isDark = useIsDark();
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    time: 30,
    minerX: 150,
    minerY: 20,
    clawAngle: 0,
    clawSpeed: 0.03,
    clawLength: 15,
    clawState: 'swing' as 'swing' | 'shoot' | 'retract',
    shootSpeed: 4,
    retractSpeed: 4,
    grabbedItem: null as GoldItem | null,
    items: [] as GoldItem[],
    ticks: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('miner')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('miner', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const spawnItems = () => {
    const items: GoldItem[] = [
      // Gold (Value, Weight, Radius, Color)
      { x: 50, y: 150, radius: 14, type: 'gold', value: 150, weight: 1.5, color: '#f59e0b' },
      { x: 250, y: 180, radius: 16, type: 'gold', value: 200, weight: 1.8, color: '#f59e0b' },
      { x: 150, y: 220, radius: 8, type: 'gold', value: 50, weight: 0.8, color: '#facc15' },
      { x: 100, y: 120, radius: 10, type: 'gold', value: 100, weight: 1.1, color: '#facc15' },

      // Rocks (Low value, Heavy weight)
      { x: 80, y: 180, radius: 12, type: 'rock', value: 15, weight: 2.2, color: '#64748b' },
      { x: 210, y: 130, radius: 16, type: 'rock', value: 20, weight: 3.0, color: '#475569' },

      // Bags (Mystery random value, Light weight)
      { x: 180, y: 160, radius: 10, type: 'bag', value: 0, weight: 1.0, color: '#db2777' }
    ];
    return items;
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
    setScore(0);

    let maxTime = 30;
    let speedMult = 1.0;
    if (difficulty === 'easy') { maxTime = 40; speedMult = 1.2; }
    if (difficulty === 'medium') { maxTime = 30; speedMult = 1.0; }
    if (difficulty === 'hard') { maxTime = 25; speedMult = 0.8; }

    setTimeLeft(maxTime);

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      time: maxTime,
      minerX: 150,
      minerY: 20,
      clawAngle: 0,
      clawSpeed: 0.03 * speedMult,
      clawLength: 15,
      clawState: 'swing',
      shootSpeed: 5,
      retractSpeed: 5,
      grabbedItem: null,
      items: spawnItems(),
      ticks: 0
    };

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const state = stateRef.current;
      state.time--;
      setTimeLeft(state.time);

      if (state.time <= 0) {
        setIsPlaying(false);
        clearInterval(timerRef.current!);
        if (state.score >= 500) {
          setGameWon(true);
          awardPoints();
        } else {
          setGameOver(true);
        }
        onGameOver(state.score);
        if (state.score > currentHighScore) {
          setCurrentHighScore(state.score);
        }
      }
    }, 1000);
  };

  const shootClaw = () => {
    if (!isPlaying || gameOver || gameWon) return;
    const state = stateRef.current;
    if (state.clawState === 'swing') {
      state.clawState = 'shoot';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowDown') {
      e.preventDefault();
      if (!isPlaying) startGame();
      else shootClaw();
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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.ticks++;

    // Claw logic
    if (state.clawState === 'swing') {
      state.clawAngle += state.clawSpeed;
      if (state.clawAngle > Math.PI / 2.5 || state.clawAngle < -Math.PI / 2.5) {
        state.clawSpeed *= -1; // bounce
      }
    } else if (state.clawState === 'shoot') {
      state.clawLength += state.shootSpeed;

      const tipX = state.minerX + Math.sin(state.clawAngle) * state.clawLength;
      const tipY = state.minerY + Math.cos(state.clawAngle) * state.clawLength;

      // Check collision with items
      let hitItem = false;
      for (let i = 0; i < state.items.length; i++) {
        const item = state.items[i];
        const dist = Math.hypot(tipX - item.x, tipY - item.y);
        if (dist < item.radius + 6) {
          state.grabbedItem = item;
          state.items.splice(i, 1);
          state.clawState = 'retract';
          hitItem = true;
          break;
        }
      }

      // Check boundary collision
      if (!hitItem && (tipX < 5 || tipX > canvas.width - 5 || tipY > canvas.height - 5)) {
        state.clawState = 'retract';
      }
    } else if (state.clawState === 'retract') {
      // retracting speed depends on item weight
      const weightDivider = state.grabbedItem ? state.grabbedItem.weight : 0.8;
      const speed = Math.max(1, state.retractSpeed / weightDivider);
      state.clawLength -= speed;

      // If grabbed item exists, update its position
      if (state.grabbedItem) {
        const tipX = state.minerX + Math.sin(state.clawAngle) * state.clawLength;
        const tipY = state.minerY + Math.cos(state.clawAngle) * state.clawLength;
        state.grabbedItem.x = tipX;
        state.grabbedItem.y = tipY;
      }

      if (state.clawLength <= 15) {
        state.clawLength = 15;
        state.clawState = 'swing';

        // Claim points if item grabbed
        if (state.grabbedItem) {
          let valueToAdd = state.grabbedItem.value;
          if (state.grabbedItem.type === 'bag') {
            // Random prize
            valueToAdd = Math.random() > 0.5 ? 250 : 100;
            toast(isRTL ? `حقيبة الحظ منحتك ${valueToAdd} نقطة! 🎁` : `Lucky bag gave ${valueToAdd} pts! 🎁`, 'success');
          }
          state.score += valueToAdd;
          setScore(state.score);
          state.grabbedItem = null;
        }
      }
    }

    // DRAW STAGE
    const isDarkCurrent = isDarkRef.current;
    ctx.fillStyle = isDarkCurrent ? '#0b0f19' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid underground details
    ctx.fillStyle = isDarkCurrent ? 'rgba(251, 191, 36, 0.03)' : 'rgba(217, 119, 6, 0.05)';
    ctx.fillRect(0, 45, canvas.width, canvas.height - 45);

    // Miner Station line
    ctx.strokeStyle = isDarkCurrent ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(canvas.width, 40);
    ctx.stroke();

    // Draw Miner/Collector Station
    ctx.fillStyle = '#f59e0b';
    ctx.shadowBlur = isDarkCurrent ? 6 : 2;
    ctx.shadowColor = '#f59e0b';
    ctx.beginPath();
    ctx.arc(state.minerX, state.minerY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Claw Cable/Rope
    ctx.strokeStyle = isDarkCurrent ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 1.5;
    const clawEndX = state.minerX + Math.sin(state.clawAngle) * state.clawLength;
    const clawEndY = state.minerY + Math.cos(state.clawAngle) * state.clawLength;
    ctx.beginPath();
    ctx.moveTo(state.minerX, state.minerY);
    ctx.lineTo(clawEndX, clawEndY);
    ctx.stroke();

    // Draw Claw Grabber Tip
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(clawEndX, clawEndY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw board items
    state.items.forEach(item => {
      drawMinerItem(ctx, item, isDarkCurrent);
    });

    // Draw grabbed item
    if (state.grabbedItem) {
      drawMinerItem(ctx, state.grabbedItem, isDarkCurrent);
    }

    gameLoopRef.current = requestAnimationFrame(update);
  };

  const drawMinerItem = (ctx: CanvasRenderingContext2D, item: GoldItem, isDarkCurrent: boolean) => {
    ctx.fillStyle = item.color;
    ctx.shadowBlur = isDarkCurrent ? (item.type === 'gold' ? 8 : 4) : 2;
    ctx.shadowColor = item.color;

    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  };

  return (
    <div 
      onClick={shootClaw}
      className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300 cursor-pointer"
  role="button" tabIndex={0} onKeyDown={onActivate(shootClaw)}>
      {/* Top Controls */}
      <div className="relative z-10 flex items-center justify-between">
        <button aria-label={t('action.close') || 'Close'} 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
        </button>
        
        <h2 className="text-xl font-black tracking-tighter text-amber-500 dark:text-amber-400">
          {t('arcade.miner.title') || 'صيد الذهب'} ⛏️
        </h2>

        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-amber-600 dark:text-amber-300">
          <span className="material-symbols-outlined text-amber-500 dark:text-amber-400 text-sm">schedule</span>
          <span>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,320px)] aspect-[300/260] border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={260} 
          className="w-full h-full object-contain"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-amber-500 dark:text-amber-400 animate-bounce mb-2">construction</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-amber-200">{isRTL ? 'تحدي صيد الكنز والذهب' : 'Gold Miner Adventure'}</h3>
            
            {/* Difficulty */}
            <div className="flex gap-1.5 my-3 relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'easy' 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'سهل' : 'Easy'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'medium' 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'متوسط' : 'Medium'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'hard' 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'صعب 🔥' : 'Hard 🔥'}
              </button>
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[200px] mb-3 leading-snug">
              {isRTL ? 'اصطد كتل الذهب المتوهجة وتجنب الصخور الثقيلة! حقق 500 نقطة للفوز! مكافآت: 5، 15، 30 نقطة.' : 'Shoot claw to catch gold nuggets. Avoid heavy rocks. Get 500 pts. Rewards: 5, 15, 30 pts.'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-amber-500/20"
            >
              {isRTL ? 'ابدأ الصيد' : 'Start Mining'}
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">
              {gameWon ? 'emoji_events' : 'sentiment_very_dissatisfied'}
            </span>
            <h3 className={`text-sm font-black ${gameWon ? 'text-amber-500 dark:text-yellow-400' : 'text-rose-500'}`}>
              {gameWon ? (isRTL ? 'انتصار تام! 🎉🏆' : 'VICTORY! 🎉🏆') : (isRTL ? 'انتهت اللعبة! 💔' : 'GAME OVER! 💔')}
            </h3>
            <p className="text-xs font-bold mt-2 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط المحرزة' : 'Score'}: <span className="text-amber-600 dark:text-yellow-400 font-black">{score} / 500</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
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

      {/* Tactile Button / Tap action */}
      <div className="flex flex-col items-center gap-2 relative z-10 my-2">
        <button aria-label={t('action.drop') || 'Drop'}
          onClick={(e) => { e.stopPropagation(); shootClaw(); }}
          disabled={!isPlaying || gameOver || gameWon}
          className="w-full max-w-[280px] py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">anchor</span>
          <span>{isRTL ? 'إطلاق الخطاف الآن' : 'Launch Claw Now'}</span>
        </button>
        <span className="text-[10px] font-bold text-slate-400 dark:text-white/40">
          {isRTL ? 'أو انقر في أي مكان على الشاشة لإطلاق الخطاف' : 'Or tap anywhere on screen to launch'}
        </span>
      </div>

      {/* Info Stats Bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'صيد جاري...' : 'Mining live...'}</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">
            {isRTL ? 'النقاط' : 'SCORE'}
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{score} / 500</p>
        </div>
      </div>
    </div>
  );
}
