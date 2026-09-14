import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/index';
import { useIsDark } from '@/hooks/useIsDark';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface CyberCheckersProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

interface Piece {
  player: 1 | 2; // 1 = Human, 2 = CPU
  isKing: boolean;
}

export function CyberCheckers({ highScore: _highScore, onClose, onGameOver }: CyberCheckersProps) {
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
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameLoopRef = useRef<number | null>(null);

  const stateRef = useRef({
    pointsAwardedToday: false,
    score: 0,
    board: [] as (Piece | null)[][],
    selected: null as { r: number; c: number } | null,
    validMoves: [] as { r: number; c: number; jumpR?: number; jumpC?: number }[],
    turn: 1 as 1 | 2, // 1 = Player, 2 = CPU
    ticks: 0,
    isPlaying: false,
    gameOver: false,
    gameWon: false
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('checkers')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('checkers', pointsToAward);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const initBoard = () => {
    const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

    // Place CPU pieces (Rows 0, 1, 2 on dark tiles)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = { player: 2, isKing: false };
        }
      }
    }

    // Place Player pieces (Rows 5, 6, 7 on dark tiles)
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = { player: 1, isKing: false };
        }
      }
    }

    return board;
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
    setScore(0);

    stateRef.current = {
      pointsAwardedToday: stateRef.current.pointsAwardedToday,
      score: 0,
      board: initBoard(),
      selected: null,
      validMoves: [],
      turn: 1,
      ticks: 0,
      isPlaying: true,
      gameOver: false,
      gameWon: false
    };

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(update);
  };

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

    // DRAW STAGE
    const isDarkCurrent = isDarkRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tileSize = canvas.width / 8;

    // 1. Draw Checker Board Tiles
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDarkTile = (r + c) % 2 === 1;
        if (isDarkCurrent) {
          ctx.fillStyle = isDarkTile ? '#1e293b' : '#0b0f19';
        } else {
          ctx.fillStyle = isDarkTile ? '#cbd5e1' : '#f8fafc';
        }
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

        // Highlight selected tile
        const isSelected = state.selected && state.selected.r === r && state.selected.c === c;
        if (isSelected) {
          ctx.fillStyle = isDarkCurrent ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.35)';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }

        // Highlight valid moves
        const isValidMove = state.validMoves.some(m => m.r === r && m.c === c);
        if (isValidMove) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(c * tileSize + 2, r * tileSize + 2, tileSize - 4, tileSize - 4);
        }
      }
    }

    // 2. Draw Pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (piece) {
          const px = c * tileSize + tileSize / 2;
          const py = r * tileSize + tileSize / 2;
          const color = piece.player === 1 ? '#06b6d4' : '#ef4444';

          ctx.fillStyle = color;
          ctx.shadowBlur = isDarkCurrent ? 8 : 2;
          ctx.shadowColor = color;
          ctx.beginPath();
          ctx.arc(px, py, tileSize / 2 - 8, 0, Math.PI * 2);
          ctx.fill();

          // Draw King Star/Crown Symbol
          if (piece.isKing) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0;
            ctx.fillText('👑', px, py);
          }
          ctx.shadowBlur = 0; // reset
        }
      }
    }

    gameLoopRef.current = requestAnimationFrame(update);
  };

  const getValidMoves = (board: (Piece | null)[][], r: number, c: number) => {
    const piece = board[r][c];
    if (!piece) return [];

    const moves: { r: number; c: number; jumpR?: number; jumpC?: number }[] = [];
    const dirs: number[] = [];
    if (piece.isKing) {
      dirs.push(-1, 1);
    } else {
      dirs.push(piece.player === 1 ? -1 : 1);
    }

    dirs.forEach(dr => {
      [-1, 1].forEach(dc => {
        const nr = r + dr;
        const nc = c + dc;

        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (target === null) {
            moves.push({ r: nr, c: nc });
          } else if (target.player !== piece.player) {
            const jr = nr + dr;
            const jc = nc + dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && board[jr][jc] === null) {
              moves.push({ r: jr, c: jc, jumpR: nr, jumpC: nc });
            }
          }
        }
      });
    });

    return moves;
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver || gameWon || stateRef.current.turn !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tileSize = rect.width / 8;
    const c = Math.floor(clickX / tileSize);
    const r = Math.floor(clickY / tileSize);

    const state = stateRef.current;
    const clickedPiece = state.board[r][c];

    // Case 1: Clicked own piece (select it)
    if (clickedPiece && clickedPiece.player === 1) {
      state.selected = { r, c };
      state.validMoves = getValidMoves(state.board, r, c);
      return;
    }

    // Case 2: Clicked valid move location while piece is selected
    if (state.selected && state.validMoves.some(m => m.r === r && m.c === c)) {
      const chosenMove = state.validMoves.find(m => m.r === r && m.c === c)!;
      const sr = state.selected.r;
      const sc = state.selected.c;

      // Move the piece
      const p = state.board[sr][sc]!;
      state.board[r][c] = p;
      state.board[sr][sc] = null;

      // Was it a jump/capture?
      if (chosenMove.jumpR !== undefined && chosenMove.jumpC !== undefined) {
        state.board[chosenMove.jumpR][chosenMove.jumpC] = null; // remove jumped piece
        state.score += 100;
        setScore(state.score);
        toast(isRTL ? 'التهام قطعة للخصم! ⚔️' : 'Captured opponent piece! ⚔️', 'success');
      }

      // Check king promotion (reaching row 0)
      if (r === 0 && !p.isKing) {
        p.isKing = true;
        toast(isRTL ? 'ترقية لملكة! 👑' : 'Crowned King! 👑', 'success');
      }

      // Reset selection
      state.selected = null;
      state.validMoves = [];

      // Check Win/Loss
      if (checkWinConditions()) return;

      // Switch turn to CPU
      state.turn = 2;
      setTimeout(makeCPUMove, 600);
    }
  };

  const checkWinConditions = () => {
    const state = stateRef.current;
    let humanCount = 0;
    let cpuCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = state.board[r][c];
        if (p) {
          if (p.player === 1) humanCount++;
          if (p.player === 2) cpuCount++;
        }
      }
    }

    if (cpuCount === 0) {
      state.gameWon = true;
      setIsPlaying(false);
      setGameWon(true);
      awardPoints();
      onGameOver(state.score + 500);
      return true;
    }

    if (humanCount === 0) {
      state.gameOver = true;
      setIsPlaying(false);
      setGameOver(true);
      onGameOver(state.score);
      return true;
    }

    return false;
  };

  const makeCPUMove = () => {
    const state = stateRef.current;
    if (!state.isPlaying || state.gameOver || state.gameWon) return;

    // Collect all CPU possible moves
    const allCPUMoves: { sr: number; sc: number; move: { r: number; c: number; jumpR?: number; jumpC?: number } }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (piece && piece.player === 2) {
          const moves = getValidMoves(state.board, r, c);
          moves.forEach(m => {
            allCPUMoves.push({ sr: r, sc: c, move: m });
          });
        }
      }
    }

    if (allCPUMoves.length === 0) {
      state.gameWon = true;
      setIsPlaying(false);
      setGameWon(true);
      awardPoints();
      onGameOver(state.score + 500);
      return;
    }

    // CPU AI logic: prioritize jumps
    const jumpMoves = allCPUMoves.filter(m => m.move.jumpR !== undefined);
    let chosen: typeof allCPUMoves[0];

    if (jumpMoves.length > 0) {
      chosen = jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
    } else {
      chosen = allCPUMoves[Math.floor(Math.random() * allCPUMoves.length)];
    }

    // Execute CPU move
    const p = state.board[chosen.sr][chosen.sc]!;
    state.board[chosen.move.r][chosen.move.c] = p;
    state.board[chosen.sr][chosen.sc] = null;

    if (chosen.move.jumpR !== undefined && chosen.move.jumpC !== undefined) {
      state.board[chosen.move.jumpR][chosen.move.jumpC] = null; // remove human piece
    }

    // CPU King promotion (reaching row 7)
    if (chosen.move.r === 7 && !p.isKing) {
      p.isKing = true;
    }

    // Check Win/Loss
    if (checkWinConditions()) return;

    // Switch turn to Player
    state.turn = 1;
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Top Controls */}
      <div className="relative z-10 flex items-center justify-between">
        <button aria-label={t('action.close') || 'Close'} 
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
        </button>
        
        <h2 className="text-xl font-black tracking-tighter text-cyan-500 dark:text-cyan-400">
          {t('arcade.checkers.title') || 'تحدي الداما'} 🏁
        </h2>

        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-xs font-black text-cyan-600 dark:text-cyan-300">
          <span className="material-symbols-outlined text-cyan-500 dark:text-cyan-400 text-sm">circle</span>
          <span>
            {t('arcade.checkers.vs') || 'ضد CPU'}
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative my-auto flex items-center justify-center mx-auto shadow-lg w-full max-w-[min(100%,320px)] aspect-square border border-slate-200 dark:border-white/10 rounded-3xl bg-slate-100/90 dark:bg-black/40 backdrop-blur-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={280} 
          height={280} 
          onClick={handleBoardClick}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Start Screen */}
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 bg-white/95 dark:bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center animate-in zoom-in duration-300 z-30">
            <span className="material-symbols-outlined text-4xl text-cyan-500 dark:text-cyan-400 animate-bounce mb-2">casino</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-cyan-200">{isRTL ? 'تحدي الداما الاستراتيجية' : 'Cyber Checkers'}</h3>
            
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
              {isRTL ? 'التهام كل قطع الكمبيوتر الحمراء للفوز! حرك قطعك الزرقاء بشكل قطري. مكافآت: 5، 15، 30 نقطة.' : 'Diagonal moves, jump CPU red pieces to capture. Crown Kings! Rewards: 5, 15, 30 pts.'}
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
              {isRTL ? 'النقاط المحرزة' : 'Final Score'}: <span className="text-cyan-600 dark:text-cyan-400 font-black">{score}</span>
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

      {/* Instructions */}
      <div className="text-center text-[10px] font-bold text-slate-400 dark:text-white/30 my-1">
        {isRTL ? 'انقر على قطعتك الزرقاء ثم المربع المضاء بالأخضر للتحريك' : 'Tap your cyan piece, then tap green square to move'}
      </div>

      {/* Info Stats Bar */}
      <div className="relative z-10 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold">
        <div>
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
              <span className="text-slate-700 dark:text-white/80 font-black">
                {stateRef.current.turn === 1 ? (isRTL ? 'دورك للعب...' : 'Your turn...') : (isRTL ? 'تفكير الخصم...' : 'CPU thinking...')}
              </span>
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
