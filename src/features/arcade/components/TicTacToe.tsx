import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { useArcadeStore } from '../store/arcadeStore';

interface TicTacToeProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

type BoardState = ('X' | 'O' | null)[];

export function TicTacToe({ highScore: _highScore, onClose, onGameOver }: TicTacToeProps) {
  const { isRTL } = useI18n();
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [gameMode, setGameMode] = useState<'pvp' | 'ai'>('ai');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('hard'); // hard is minimax
  const [winner, setWinner] = useState<'X' | 'O' | 'Draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [wins, setWins] = useState(0);

  const stateRef = useRef({
    pointsAwardedToday: false
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('tictactoe')) {
      stateRef.current.pointsAwardedToday = true;
    }
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('tictactoe', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  const checkWinner = (tempBoard: BoardState) => {
    for (const combo of winningCombinations) {
      const [a, b, c] = combo;
      if (tempBoard[a] && tempBoard[a] === tempBoard[b] && tempBoard[a] === tempBoard[c]) {
        return { winner: tempBoard[a] as 'X' | 'O', combo };
      }
    }
    if (tempBoard.every(cell => cell !== null)) {
      return { winner: 'Draw' as const, combo: null };
    }
    return null;
  };

  // Minimax algorithm for impossible mode
  const minimax = (tempBoard: BoardState, depth: number, isMaximizing: boolean): number => {
    const result = checkWinner(tempBoard);
    if (result) {
      if (result.winner === 'O') return 10 - depth; // AI is O
      if (result.winner === 'X') return depth - 10; // Player is X
      return 0; // Draw
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'O';
          const score = minimax(tempBoard, depth + 1, false);
          tempBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'X';
          const score = minimax(tempBoard, depth + 1, true);
          tempBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (tempBoard: BoardState): number => {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (tempBoard[i] === null) {
        tempBoard[i] = 'O';
        const score = minimax(tempBoard, 0, false);
        tempBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  };

  const getMediumMove = (tempBoard: BoardState): number => {
    // 60% chance of best move, 40% random
    if (Math.random() < 0.6) {
      return getBestMove(tempBoard);
    }
    const empty = tempBoard.map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];
    return empty[Math.floor(Math.random() * empty.length)];
  };

  const getEasyMove = (tempBoard: BoardState): number => {
    const empty = tempBoard.map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];
    return empty[Math.floor(Math.random() * empty.length)];
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      if (result.combo) {
        setWinningLine(result.combo);
        if (result.winner === 'X') {
          const newWins = wins + 1;
          setWins(newWins);
          onGameOver(newWins);
          if (gameMode === 'ai' && (difficulty === 'hard' || difficulty === 'medium')) {
            awardPoints();
          }
        }
      }
      return;
    }

    if (gameMode === 'pvp') {
      setIsXNext(!isXNext);
    } else {
      // AI Move
      setIsXNext(false);
      setTimeout(() => {
        const aiBoard = [...newBoard];
        let move = -1;
        if (difficulty === 'hard') {
          move = getBestMove(aiBoard);
        } else if (difficulty === 'medium') {
          move = getMediumMove(aiBoard);
        } else {
          move = getEasyMove(aiBoard);
        }

        if (move !== -1) {
          aiBoard[move] = 'O';
          setBoard(aiBoard);
          const aiResult = checkWinner(aiBoard);
          if (aiResult) {
            setWinner(aiResult.winner);
            if (aiResult.combo) setWinningLine(aiResult.combo);
          } else {
            setIsXNext(true);
          }
        }
      }, 400);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white">
      {/* Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between mb-2">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:bg-slate-100 dark:hover:bg-white/20 active:scale-95 text-slate-700 dark:text-white shadow-sm"
        >
          <span className="material-symbols-outlined text-xl">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          {isRTL ? 'تحدي إكس أو النيوني' : 'Neon X & O Duel'}
        </h2>
        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-sm">emoji_events</span>
          <span className="text-xs font-black text-blue-600 dark:text-blue-300">
            {isRTL ? `الفوز: ${wins}` : `Wins: ${wins}`}
          </span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full max-w-md mx-auto bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/5 p-3 sm:p-4 rounded-3xl space-y-3 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => { setGameMode('ai'); resetGame(); }}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all ${
              gameMode === 'ai'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {isRTL ? 'ضد الكمبيوتر' : 'vs Computer'}
          </button>
          <button
            onClick={() => { setGameMode('pvp'); resetGame(); }}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all ${
              gameMode === 'pvp'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {isRTL ? 'لاعبين (محلي)' : '2 Players (Local)'}
          </button>
        </div>

        {gameMode === 'ai' && (
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              {isRTL ? 'مستوى الذكاء الاصطناعي:' : 'AI Difficulty:'}
            </span>
            <div className="flex gap-1">
              {(['easy', 'medium', 'hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => { setDifficulty(diff); resetGame(); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all capitalize ${
                    difficulty === diff
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-white/5 border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {diff === 'easy' ? (isRTL ? 'سهل' : 'Easy') : diff === 'medium' ? (isRTL ? 'متوسط' : 'Medium') : (isRTL ? 'مستحيل' : 'Impossible')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Turn indicator */}
      <div className="my-2 text-center">
        {!winner ? (
          <div className="text-sm font-black text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <span>{isRTL ? 'دور اللاعب:' : 'Current Player:'}</span>
            <span className={`text-xl ${isXNext ? 'text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}>
              {isXNext ? 'X' : 'O'}
            </span>
          </div>
        ) : (
          <div className="text-lg font-black animate-bounce">
            {winner === 'Draw' ? (
              <span className="text-amber-500 dark:text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                {isRTL ? 'تعادل رائع! 🤝' : "It's a Draw! 🤝"}
              </span>
            ) : (
              <span className={winner === 'X' ? 'text-blue-600 dark:text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'text-rose-600 dark:text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]'}>
                {winner === 'X'
                  ? (isRTL ? 'لقد فزت! 🎉🏆' : 'Player X Wins! 🎉🏆')
                  : (isRTL ? 'فاز الكمبيوتر! 🤖💔' : 'Computer Wins! 🤖💔')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid Game Board */}
      <div className="relative w-full max-w-[340px] aspect-square bg-slate-100/90 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-4 shadow-lg my-auto mx-auto flex items-center justify-center">
        <div className="grid grid-cols-3 gap-3 h-full w-full">
          {board.map((cell, idx) => {
            const isWinningCell = winningLine?.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`relative rounded-2xl text-4xl font-black flex items-center justify-center transition-all duration-300 ${
                  cell ? 'bg-white dark:bg-slate-950/80 shadow-sm' : 'bg-white/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.06]'
                } border ${
                  isWinningCell
                    ? winner === 'X'
                      ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-[1.03]'
                      : 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-[1.03]'
                    : 'border-slate-200 dark:border-white/5'
                }`}
              >
                {cell === 'X' && (
                  <span className="text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-in zoom-in duration-200">
                    X
                  </span>
                )}
                {cell === 'O' && (
                  <span className="text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-in zoom-in duration-200">
                    O
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="w-full max-w-md mx-auto flex gap-4 mt-2">
        <button
          onClick={resetGame}
          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          <span>{isRTL ? 'لعب مجدداً' : 'Play Again'}</span>
        </button>
      </div>
    </div>
  );
}
