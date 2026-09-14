import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface PacManProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Ghost {
  x: number;
  y: number;
  color: string;
  dirX: number;
  dirY: number;
  isFrightened: boolean;
}

export function PacMan({ highScore, onClose, onGameOver }: PacManProps) {
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
  const [gameWon, setGameWon] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);

  // Game grid representation
  // 1 = Wall, 2 = Small Dot, 3 = Power Pellet, 0 = Empty
  const mapGrid = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,1,2,2,2,2,2,3,1],
    [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,0,1,1,2,1,1,2,1],
    [1,2,2,2,2,1,0,0,0,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,1,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,1,1,1,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,0,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,1,1,1,1,2,1,2,1,1],
    [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    grid: JSON.parse(JSON.stringify(mapGrid)),
    pacman: { x: 7, y: 11, dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0, speed: 0.15 },
    ghosts: [] as Ghost[],
    frightenedTimer: 0,
    ticks: 0
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('pacman')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('pacman', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      grid: JSON.parse(JSON.stringify(mapGrid)),
      pacman: { x: 7, y: 11, dirX: 0, dirY: -1, nextDirX: 0, nextDirY: -1, speed: 0.14 },
      ghosts: [
        { x: 6, y: 7, color: '#ef4444', dirX: 1, dirY: 0, isFrightened: false }, // Blinky (Red)
        { x: 8, y: 7, color: '#db2777', dirX: -1, dirY: 0, isFrightened: false }, // Pinky (Pink)
        { x: 7, y: 7, color: '#06b6d4', dirX: 0, dirY: -1, isFrightened: false }, // Inky (Cyan)
        { x: 7, y: 5, color: '#f97316', dirX: 1, dirY: 0, isFrightened: false }  // Clyde (Orange)
      ],
      frightenedTimer: 0,
      ticks: 0
    };

    setScore(0);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlaying || gameOver || gameWon) return;
    const p = stateRef.current.pacman;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        p.nextDirX = 0; p.nextDirY = -1;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        p.nextDirX = 0; p.nextDirY = 1;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        p.nextDirX = -1; p.nextDirY = 0;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        p.nextDirX = 1; p.nextDirY = 0;
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

    // 1. Move Pacman
    const p = state.pacman;
    
    // Check if next direction is possible (no wall)
    const nextX = Math.round(p.x + p.nextDirX);
    const nextY = Math.round(p.y + p.nextDirY);
    if (
      nextY >= 0 && nextY < state.grid.length &&
      nextX >= 0 && nextX < state.grid[0].length &&
      state.grid[nextY][nextX] !== 1
    ) {
      p.dirX = p.nextDirX;
      p.dirY = p.nextDirY;
    }

    // Move in current direction
    const targetX = p.x + p.dirX * p.speed;
    const targetY = p.y + p.dirY * p.speed;
    const roundedX = Math.round(targetX);
    const roundedY = Math.round(targetY);

    if (
      roundedY >= 0 && roundedY < state.grid.length &&
      roundedX >= 0 && roundedX < state.grid[0].length &&
      state.grid[roundedY][roundedX] !== 1
    ) {
      p.x = targetX;
      p.y = targetY;

      // Handle wraparound
      if (p.x < 0) p.x = state.grid[0].length - 1;
      if (p.x >= state.grid[0].length) p.x = 0;

      // Eat Small Dot
      if (state.grid[roundedY][roundedX] === 2) {
        state.grid[roundedY][roundedX] = 0;
        state.score += 10;
        setScore(state.score);
      }
      // Eat Power Pellet
      else if (state.grid[roundedY][roundedX] === 3) {
        state.grid[roundedY][roundedX] = 0;
        state.score += 50;
        setScore(state.score);
        state.frightenedTimer = 350; // frightened duration
        state.ghosts.forEach(g => g.isFrightened = true);
        toast(isRTL ? 'وضع الخوف نشط! التهم الأشباح 👻' : 'Power active! Eat ghosts! 👻', 'success');
      }
    }

    // 2. Frightened timer countdown
    if (state.frightenedTimer > 0) {
      state.frightenedTimer--;
      if (state.frightenedTimer === 0) {
        state.ghosts.forEach(g => g.isFrightened = false);
      }
    }

    // 3. Move Ghosts
    const ghostSpeed = state.frightenedTimer > 0 ? 0.04 : (difficulty === 'easy' ? 0.06 : difficulty === 'medium' ? 0.08 : 0.10);
    state.ghosts.forEach(g => {
      // Basic movement and intersection decisions
      const roundedGX = Math.round(g.x);
      const roundedGY = Math.round(g.y);

      // Simple AI: at intersections, pick random valid direction that doesn't go backwards
      const possibleDirs: Array<{x: number, y: number}> = [];
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
      ];

      directions.forEach(d => {
        const nextGX = roundedGX + d.x;
        const nextGY = roundedGY + d.y;
        if (
          nextGY >= 0 && nextGY < state.grid.length &&
          nextGX >= 0 && nextGX < state.grid[0].length &&
          state.grid[nextGY][nextGX] !== 1 &&
          !(d.x === -g.dirX && d.y === -g.dirY) // no backtracking
        ) {
          possibleDirs.push(d);
        }
      });

      if (possibleDirs.length > 0 && (Math.random() < 0.15 || possibleDirs.every(d => d.x !== g.dirX || d.y !== g.dirY))) {
        const chosen = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        g.dirX = chosen.x;
        g.dirY = chosen.y;
      }

      g.x += g.dirX * ghostSpeed;
      g.y += g.dirY * ghostSpeed;

      // Handle wraparound
      if (g.x < 0) g.x = state.grid[0].length - 1;
      if (g.x >= state.grid[0].length) g.x = 0;

      // Collision check with Pacman
      const dist = Math.hypot(p.x - g.x, p.y - g.y);
      if (dist < 0.6) {
        if (g.isFrightened) {
          // Eat ghost
          g.x = 7;
          g.y = 7;
          g.isFrightened = false;
          state.score += 200;
          setScore(state.score);
          toast(isRTL ? 'تم التهام الشبح! 🏆' : 'Ghost Eaten! 🏆', 'success');
        } else {
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
      }
    });

    // Check Win Condition
    let dotsRemaining = false;
    for (let r = 0; r < state.grid.length; r++) {
      for (let c = 0; c < state.grid[0].length; c++) {
        if (state.grid[r][c] === 2 || state.grid[r][c] === 3) {
          dotsRemaining = true;
          break;
        }
      }
    }

    if (!dotsRemaining) {
      setIsPlaying(false);
      setGameWon(true);
      onGameOver(state.score);
      awardPoints();
      return;
    }

    // DRAW
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDarkCurrent = isDarkRef.current;
    if (!isDarkCurrent) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const tileSize = canvas.width / state.grid[0].length;

    // Draw Map
    for (let r = 0; r < state.grid.length; r++) {
      for (let c = 0; c < state.grid[0].length; c++) {
        const val = state.grid[r][c];
        if (val === 1) {
          // Wall
          ctx.fillStyle = isDarkCurrent ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.25)';
          ctx.strokeStyle = isDarkCurrent ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.8)';
          ctx.lineWidth = 2;
          ctx.shadowBlur = isDarkCurrent ? 6 : 1;
          ctx.shadowColor = isDarkCurrent ? 'rgba(59, 130, 246, 0.5)' : 'rgba(37, 99, 235, 0.2)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(c * tileSize + 1, r * tileSize + 1, tileSize - 2, tileSize - 2, 4);
          } else {
            ctx.rect(c * tileSize + 1, r * tileSize + 1, tileSize - 2, tileSize - 2);
          }
          ctx.fill();
          ctx.stroke();
        } else if (val === 2) {
          // Dot
          ctx.fillStyle = isDarkCurrent ? '#f59e0b' : '#d97706';
          ctx.shadowBlur = isDarkCurrent ? 4 : 1;
          ctx.shadowColor = '#f59e0b';
          ctx.beginPath();
          ctx.arc(c * tileSize + tileSize / 2, r * tileSize + tileSize / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (val === 3) {
          // Power Pellet
          const pulse = Math.sin(state.ticks / 10) * 1.5;
          ctx.fillStyle = isDarkCurrent ? '#f59e0b' : '#d97706';
          ctx.shadowBlur = isDarkCurrent ? (12 + pulse) : 3;
          ctx.shadowColor = '#f59e0b';
          ctx.beginPath();
          ctx.arc(c * tileSize + tileSize / 2, r * tileSize + tileSize / 2, 6 + pulse * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.shadowBlur = 0; // reset

    // Draw Pacman
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = isDarkCurrent ? 12 : 2;
    ctx.beginPath();
    const angleOffset = Math.sin(state.ticks / 4) * 0.25 + 0.25;
    let startAngle = angleOffset * Math.PI;
    let endAngle = (2 - angleOffset) * Math.PI;

    if (p.dirX === 1) { // Right
      startAngle += 0; endAngle += 0;
    } else if (p.dirX === -1) { // Left
      startAngle += Math.PI; endAngle += Math.PI;
    } else if (p.dirY === 1) { // Down
      startAngle += Math.PI / 2; endAngle += Math.PI / 2;
    } else if (p.dirY === -1) { // Up
      startAngle += -Math.PI / 2; endAngle += -Math.PI / 2;
    }

    ctx.arc(p.x * tileSize + tileSize / 2, p.y * tileSize + tileSize / 2, tileSize / 2 - 1, startAngle, endAngle);
    ctx.lineTo(p.x * tileSize + tileSize / 2, p.y * tileSize + tileSize / 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw Ghosts
    state.ghosts.forEach(g => {
      ctx.fillStyle = g.isFrightened ? '#3b82f6' : g.color;
      ctx.shadowBlur = isDarkCurrent ? 8 : 2;
      ctx.shadowColor = g.isFrightened ? '#3b82f6' : g.color;
      const gx = g.x * tileSize + tileSize / 2;
      const gy = g.y * tileSize + tileSize / 2;

      ctx.beginPath();
      // Dome head
      ctx.arc(gx, gy - 2, tileSize / 2 - 2, Math.PI, 0);
      // Body sides
      ctx.lineTo(gx + tileSize / 2 - 2, gy + tileSize / 2 - 2);
      // Wavy bottom
      const wave = Math.sin(state.ticks / 3) * 2;
      ctx.lineTo(gx + tileSize / 3, gy + tileSize / 2 - 2 + wave);
      ctx.lineTo(gx, gy + tileSize / 2 - 2 - wave);
      ctx.lineTo(gx - tileSize / 3, gy + tileSize / 2 - 2 + wave);
      ctx.lineTo(gx - tileSize / 2 + 2, gy + tileSize / 2 - 2);
      ctx.fill();

      // Ghost Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx - 3, gy - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(gx + 3, gy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupils looking in direction of movement
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(gx - 3 + g.dirX * 1.2, gy - 3 + g.dirY * 1.2, 1.2, 0, Math.PI * 2);
      ctx.arc(gx + 3 + g.dirX * 1.2, gy - 3 + g.dirY * 1.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
    gameLoopRef.current = requestAnimationFrame(update);
  };

  const handleDpadPress = (dx: number, dy: number) => {
    if (!isPlaying || gameOver || gameWon) return;
    const p = stateRef.current.pacman;
    p.nextDirX = dx;
    p.nextDirY = dy;
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
        
        <h2 className="text-xl font-black tracking-tighter text-yellow-500 dark:text-yellow-400">
          {t('arcade.pacman.title') || 'باك مان'} 🟡
        </h2>

        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-yellow-500 dark:text-yellow-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-yellow-600 dark:text-yellow-300">
            {isRTL ? `الأعلى: ${currentHighScore}` : `Best: ${currentHighScore}`}
          </span>
        </div>
      </div>

      {/* Canvas Game Stage */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,340px)] aspect-square border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={340} 
          height={340} 
          className="w-full h-full object-contain"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-yellow-500 dark:text-yellow-400 animate-bounce mb-2">face</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-yellow-200">{isRTL ? 'تحدي باك مان' : 'Pac-Man Challenge'}</h3>
            
            {/* Difficulty */}
            <div className="flex gap-1.5 my-3 relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'easy' 
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'سهل' : 'Easy'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'medium' 
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'متوسط' : 'Medium'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
                className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                  difficulty === 'hard' 
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-200' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {isRTL ? 'صعب 🔥' : 'Hard 🔥'}
              </button>
            </div>

            <p className="text-[9px] text-slate-500 dark:text-white/40 max-w-[200px] mb-3 leading-snug">
              {isRTL ? 'التهم كل النقاط الذهبية وتفادى الأشباح الملونة! مكافآت: 5، 15، 30 نقطة.' : 'Eat gold dots, avoid ghosts. Rewards: 5, 15, 30 pts.'}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-6 py-2.5 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-yellow-500/20"
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
            <h3 className={`text-sm font-black ${gameWon ? 'text-yellow-500 dark:text-yellow-400' : 'text-rose-500'}`}>
              {gameWon ? (isRTL ? 'انتصار تام! 🎉🏆' : 'VICTORY! 🎉🏆') : (isRTL ? 'انتهت اللعبة! 💔' : 'GAME OVER! 💔')}
            </h3>
            <p className="text-xs font-bold mt-2 text-slate-700 dark:text-slate-200">
              {isRTL ? 'النقاط' : 'Score'}: <span className="text-yellow-500 dark:text-yellow-400 font-black">{score}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-5 py-2 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
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
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_up</span>
        </button>
        <div></div>
        
        <button aria-label={t('action.moveLeft') || 'Move left'} 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(-1, 0); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_left</span>
        </button>
        <div className="w-12 h-12 flex items-center justify-center text-yellow-500/20">
          <span className="material-symbols-outlined text-xs">circle</span>
        </div>
        <button aria-label={t('action.moveRight') || 'Move right'} 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(1, 0); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 shadow-sm active:scale-90 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">keyboard_arrow_right</span>
        </button>
        
        <div></div>
        <button aria-label={t('action.moveDown') || 'Move down'} 
          onClick={(e) => { e.stopPropagation(); handleDpadPress(0, 1); }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 shadow-sm active:scale-90 flex items-center justify-center transition-all"
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
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">{isRTL ? 'مطاردة جارية...' : 'Running live...'}</span>
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
