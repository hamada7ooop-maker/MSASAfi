import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/index';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';

interface SudokuProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

type Board = number[][];
type Notes = Set<number>[][];

export function Sudoku({ highScore: _highScore, onClose, onGameOver }: SudokuProps) {
  const { isRTL } = useI18n();
  const [initialBoard, setInitialBoard] = useState<Board>(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [board, setBoard] = useState<Board>(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState<Board>(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [notes, setNotes] = useState<Notes>(Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set())));
  
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [mistakes, setMistakes] = useState(0);
  const [maxMistakes] = useState(3);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);

  const stateRef = useRef({
    pointsAwardedToday: false
  });

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('sudoku')) {
      stateRef.current.pointsAwardedToday = true;
    }
    generateNewPuzzle('easy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const awardPoints = async () => {
    if (stateRef.current.pointsAwardedToday) return;
    const awarded = await useArcadeStore.getState().awardDailyPoints('sudoku', 15);
    if (awarded) {
      stateRef.current.pointsAwardedToday = true;
    }
  };

  // Helper to validate placement
  const isValid = (grid: Board, r: number, c: number, val: number): boolean => {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === val && i !== c) return false;
      if (grid[i][c] === val && i !== r) return false;
      
      const boxRow = 3 * Math.floor(r / 3) + Math.floor(i / 3);
      const boxCol = 3 * Math.floor(c / 3) + (i % 3);
      if (grid[boxRow][boxCol] === val && (boxRow !== r || boxCol !== c)) return false;
    }
    return true;
  };

  // Backtracking solver
  const solve = (grid: Board): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const val of nums) {
            if (isValid(grid, r, c, val)) {
              grid[r][c] = val;
              if (solve(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  // Generate Sudoku puzzle
  const generateNewPuzzle = (diff: 'easy' | 'medium' | 'hard') => {
    const baseGrid: Board = Array(9).fill(null).map(() => Array(9).fill(0));
    
    // Fill diagonal boxes first to ensure randomness
    for (let i = 0; i < 9; i += 3) {
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          baseGrid[i + r][i + c] = nums[idx++];
        }
      }
    }

    solve(baseGrid);
    
    // Save full solution
    const solCopy = baseGrid.map(row => [...row]);
    setSolution(solCopy);

    // Remove cells based on difficulty
    const puzzleGrid = baseGrid.map(row => [...row]);
    let cellsToRemove = diff === 'easy' ? 30 : diff === 'medium' ? 45 : 55;

    while (cellsToRemove > 0) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (puzzleGrid[r][c] !== 0) {
        puzzleGrid[r][c] = 0;
        cellsToRemove--;
      }
    }

    setInitialBoard(puzzleGrid.map(row => [...row]));
    setBoard(puzzleGrid);
    setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set())));
    setSelectedCell(null);
    setMistakes(0);
    setGameWon(false);
    setGameOver(false);
  };

  const handleCellSelect = (r: number, c: number) => {
    if (gameOver || gameWon) return;
    setSelectedCell({ r, c });
  };

  const handleInputNumber = (val: number) => {
    if (!selectedCell || gameOver || gameWon) return;
    const { r, c } = selectedCell;

    // Check if cell is part of the starting board
    if (initialBoard[r][c] !== 0) return;

    if (isNoteMode) {
      const newNotes = notes.map((row, ri) => 
        row.map((colSet, ci) => {
          if (ri === r && ci === c) {
            const nextSet = new Set(colSet);
            if (nextSet.has(val)) {
              nextSet.delete(val);
            } else {
              nextSet.add(val);
            }
            return nextSet;
          }
          return colSet;
        })
      );
      setNotes(newNotes);
      
      // Clear number if cell has value
      const nextBoard = board.map(row => [...row]);
      nextBoard[r][c] = 0;
      setBoard(nextBoard);
    } else {
      // Input value mode
      const isCorrect = solution[r][c] === val;
      
      const nextBoard = board.map(row => [...row]);
      nextBoard[r][c] = val;
      setBoard(nextBoard);

      // Clear notes for this cell
      const newNotes = notes.map((row, ri) => 
        row.map((colSet, ci) => (ri === r && ci === c) ? new Set<number>() : colSet)
      );
      setNotes(newNotes);

      if (!isCorrect) {
        const nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);
        if (nextMistakes >= maxMistakes) {
          setGameOver(true);
          toast(isRTL ? 'خسرت المحاولة! لقد ارتكبت 3 أخطاء.' : 'Game Over! You made 3 mistakes.', 'error');
        } else {
          toast(isRTL ? `رقم غير صحيح! المحاولات المتبقية: ${maxMistakes - nextMistakes}` : `Incorrect! ${maxMistakes - nextMistakes} attempts left`, 'warning');
        }
      } else {
        // Check if won
        const won = nextBoard.every((row, ri) => 
          row.every((cellVal, ci) => cellVal === solution[ri][ci])
        );
        if (won) {
          setGameWon(true);
          const newScore = solvedCount + 1;
          setSolvedCount(newScore);
          onGameOver(newScore);
          awardPoints();
        }
      }
    }
  };

  const handleClearCell = () => {
    if (!selectedCell || gameOver || gameWon) return;
    const { r, c } = selectedCell;
    if (initialBoard[r][c] !== 0) return;

    const nextBoard = board.map(row => [...row]);
    nextBoard[r][c] = 0;
    setBoard(nextBoard);

    const newNotes = notes.map((row, ri) => 
      row.map((colSet, ci) => (ri === r && ci === c) ? new Set<number>() : colSet)
    );
    setNotes(newNotes);
  };

  const handleHint = () => {
    if (!selectedCell || gameOver || gameWon) {
      toast(isRTL ? 'يرجى تحديد خلية فارغة أولاً للحصول على تلميح' : 'Select an empty cell first to get a hint', 'info');
      return;
    }
    const { r, c } = selectedCell;
    if (initialBoard[r][c] !== 0) return;

    const nextBoard = board.map(row => [...row]);
    nextBoard[r][c] = solution[r][c];
    setBoard(nextBoard);

    // Clear notes for this cell
    const newNotes = notes.map((row, ri) => 
      row.map((colSet, ci) => (ri === r && ci === c) ? new Set<number>() : colSet)
    );
    setNotes(newNotes);

    // Check if won
    const won = nextBoard.every((row, ri) => 
      row.every((cellVal, ci) => cellVal === solution[ri][ci])
    );
    if (won) {
      setGameWon(true);
      const newScore = solvedCount + 1;
      setSolvedCount(newScore);
      onGameOver(newScore);
      awardPoints();
    }
  };

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white">
      {/* Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between mb-1">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:bg-slate-100 dark:hover:bg-white/20 active:scale-95 text-slate-700 dark:text-white shadow-sm"
        >
          <span className="material-symbols-outlined text-xl">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-400 dark:to-teal-400">
          {isRTL ? 'تحدي السودوكو النيوني' : 'Neon Sudoku Mind'}
        </h2>
        <div className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-teal-500 dark:text-teal-400 text-sm">check_circle</span>
          <span className="text-xs font-black text-teal-600 dark:text-teal-300">
            {isRTL ? `المحلولة: ${solvedCount}` : `Solved: ${solvedCount}`}
          </span>
        </div>
      </div>

      {/* Difficulty Selectors */}
      <div className="w-full max-w-md mx-auto flex justify-between items-center bg-white/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-2.5 sm:p-3 rounded-2xl mb-1 shadow-sm">
        <div className="flex gap-1.5">
          {(['easy', 'medium', 'hard'] as const).map(diff => (
            <button
              key={diff}
              onClick={() => { setDifficulty(diff); generateNewPuzzle(diff); }}
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all capitalize ${
                difficulty === diff
                  ? 'bg-teal-500/20 border border-teal-500/40 text-teal-700 dark:text-teal-300'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {diff === 'easy' ? (isRTL ? 'سهل' : 'Easy') : diff === 'medium' ? (isRTL ? 'متوسط' : 'Medium') : (isRTL ? 'صعب' : 'Hard')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الأخطاء:' : 'Mistakes:'}</span>
          <div className="flex gap-0.5">
            {Array(maxMistakes).fill(null).map((_, idx) => (
              <span
                key={idx}
                className={`material-symbols-outlined text-base ${
                  idx < mistakes ? 'text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'text-slate-300 dark:text-slate-700'
                }`}
                style={{ fontVariationSettings: idx < mistakes ? "'FILL' 1" : undefined }}
              >
                heart_broken
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Game Board */}
      <div className="w-full max-w-[360px] aspect-square bg-slate-100/90 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-3xl p-2 shadow-lg relative my-auto mx-auto">
        <div className="grid grid-cols-9 gap-0.5 h-full w-full bg-slate-200/60 dark:bg-white/5 p-0.5 rounded-2xl overflow-hidden">
          {board.map((row, r) => 
            row.map((val, c) => {
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const isStarting = initialBoard[r][c] !== 0;
              const cellNotes = notes[r][c];
              
              // Find matching numbers or active errors
              const isSameNumber = val !== 0 && selectedCell && board[selectedCell.r][selectedCell.c] === val;
              const isIncorrect = val !== 0 && val !== solution[r][c];

              // Box highlighting logic
              const inSameBox = selectedCell && (
                Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                Math.floor(selectedCell.c / 3) === Math.floor(c / 3)
              );
              const inSameRowCol = selectedCell && (selectedCell.r === r || selectedCell.c === c);

              let bgClass = 'bg-white/80 dark:bg-slate-950/20';
              if (isSelected) {
                bgClass = 'bg-teal-500/20 shadow-[inset_0_0_12px_rgba(20,184,166,0.3)]';
              } else if (isSameNumber) {
                bgClass = 'bg-teal-500/15 dark:bg-teal-500/20';
              } else if (inSameBox || inSameRowCol) {
                bgClass = 'bg-slate-100 dark:bg-white/[0.03]';
              }

              // Determine border lines for 3x3 grids
              const borderRight = (c === 2 || c === 5) ? 'border-r-2 border-slate-400/80 dark:border-white/30' : 'border-r border-slate-200 dark:border-white/5';
              const borderBottom = (r === 2 || r === 5) ? 'border-b-2 border-slate-400/80 dark:border-white/30' : 'border-b border-slate-200 dark:border-white/5';

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellSelect(r, c)}
                  className={`relative flex items-center justify-center transition-all duration-200 ${bgClass} ${borderRight} ${borderBottom}`}
                >
                  {val !== 0 ? (
                    <span 
                      className={`text-base font-black ${
                        isIncorrect
                          ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                          : isStarting 
                            ? 'text-slate-800 dark:text-slate-300' 
                            : 'text-teal-600 dark:text-teal-400 drop-shadow-[0_0_6px_rgba(20,184,166,0.4)]'
                      }`}
                    >
                      {val}
                    </span>
                  ) : (
                    // Note cell layout
                    <div className="grid grid-cols-3 grid-rows-3 gap-0 w-full h-full p-0.5 text-[8px] leading-none font-bold text-slate-400 dark:text-slate-500">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <div key={n} className="flex items-center justify-center">
                          {cellNotes.has(n) ? n : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="w-full max-w-md mx-auto flex justify-around gap-2 my-1">
        <button
          onClick={handleHint}
          className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all flex-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]">lightbulb</span>
          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{isRTL ? 'تلميح' : 'Hint'}</span>
        </button>
        <button
          onClick={() => setIsNoteMode(!isNoteMode)}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl border active:scale-90 transition-all flex-1 shadow-sm ${
            isNoteMode 
              ? 'bg-teal-500/20 border-teal-500/40 text-teal-700 dark:text-teal-300' 
              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <span className="material-symbols-outlined">edit_note</span>
          <span className="text-[10px] font-black">{isRTL ? 'الملاحظات' : 'Notes'}</span>
        </button>
        <button
          onClick={handleClearCell}
          className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all flex-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-rose-500">backspace</span>
          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{isRTL ? 'مسح' : 'Clear'}</span>
        </button>
      </div>

      {/* Number Pad */}
      <div className="w-full max-w-md mx-auto grid grid-cols-9 gap-1.5 bg-white/80 dark:bg-slate-900/60 p-2 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleInputNumber(num)}
            className="aspect-square rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-sm sm:text-base font-black flex items-center justify-center text-slate-800 dark:text-slate-200 active:scale-90 hover:bg-slate-200 dark:hover:bg-white/10 active:bg-teal-600 active:text-white transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Control Actions */}
      <div className="w-full max-w-md mx-auto flex gap-3 mt-2">
        <button
          onClick={() => generateNewPuzzle(difficulty)}
          className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          <span>{isRTL ? 'لعبة جديدة' : 'New Board'}</span>
        </button>
      </div>
    </div>
  );
}
