import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/i18n/index';
import { toast } from '../../../toast';
import { useArcadeStore } from '../store/arcadeStore';
import {
  SecretWord,
  normalizeArabic,
  isValidDictionaryWord,
  evaluateWordleGuess,
  getSecretWord
} from '../data/wordleData';

interface WordleProps {
  highScore: number;
  onClose: () => void;
  onGameOver: (score: number) => void;
}

export function Wordle({ highScore, onClose, onGameOver }: WordleProps) {
  const { t, isRTL } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [currentHighScore, setCurrentHighScore] = useState(highScore);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [secretWordMeta, setSecretWordMeta] = useState<SecretWord | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<('correct' | 'present' | 'absent')[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isInvalidShake, setIsInvalidShake] = useState(false);
  const maxGuesses = 6;

  const [pointsAwardedToday, setPointsAwardedToday] = useState(false);

  useEffect(() => {
    if (useArcadeStore.getState().isDailyPointsAwarded('wordle')) {
      setPointsAwardedToday(true);
    }
  }, []);

  const awardPoints = useCallback(async () => {
    if (pointsAwardedToday) return;

    let pointsToAward = 15;
    if (difficulty === 'easy') pointsToAward = 5;
    if (difficulty === 'medium') pointsToAward = 15;
    if (difficulty === 'hard') pointsToAward = 30;

    const awarded = await useArcadeStore.getState().awardDailyPoints('wordle', pointsToAward);
    if (awarded) {
      setPointsAwardedToday(true);
    }
  }, [difficulty, pointsAwardedToday]);

  const startGame = () => {
    const chosen = getSecretWord(difficulty, isRTL);
    setSecretWordMeta(chosen);
    setGuesses([]);
    setEvaluations([]);
    setCurrentGuess('');
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
    setIsInvalidShake(false);
  };

  const wordLength = secretWordMeta
    ? secretWordMeta.length
    : difficulty === 'easy'
    ? 4
    : difficulty === 'medium'
    ? 5
    : 6;

  // Keyboard Letter Statuses
  const keyboardStatuses = useMemo(() => {
    const map: Record<string, 'correct' | 'present' | 'absent'> = {};
    guesses.forEach((guess, rIndex) => {
      const evalRow = evaluations[rIndex];
      if (!evalRow) return;
      for (let i = 0; i < guess.length; i++) {
        const char = guess[i];
        const status = evalRow[i];
        if (status === 'correct') {
          map[char] = 'correct';
        } else if (status === 'present' && map[char] !== 'correct') {
          map[char] = 'present';
        } else if (status === 'absent' && !map[char]) {
          map[char] = 'absent';
        }
      }
    });
    return map;
  }, [guesses, evaluations]);

  const handleKeyPress = useCallback((char: string) => {
    if (gameOver || gameWon || !isPlaying || !secretWordMeta) return;

    if (char === 'ENTER') {
      // 1. Length validation
      if (currentGuess.length !== secretWordMeta.length) {
        toast(
          isRTL
            ? `يجب إكمال الكلمة المكونة من ${secretWordMeta.length} أحرف!`
            : `Word must be ${secretWordMeta.length} letters!`,
          'warning'
        );
        setIsInvalidShake(true);
        setTimeout(() => setIsInvalidShake(false), 500);
        return;
      }

      // 2. Dictionary validation (Reject gibberish / non-words)
      if (!isValidDictionaryWord(currentGuess, secretWordMeta.length, isRTL)) {
        toast(
          isRTL
            ? 'الكلمة غير موجودة في القاموس المعتمد! أدخل كلمة حقيقية.'
            : 'Word not recognized in dictionary! Please enter a real word.',
          'error'
        );
        setIsInvalidShake(true);
        setTimeout(() => setIsInvalidShake(false), 500);
        return;
      }

      // 3. Valid Word: Evaluate guess
      const evalRow = evaluateWordleGuess(currentGuess, secretWordMeta.word);
      const nextGuesses = [...guesses, currentGuess];
      const nextEvaluations = [...evaluations, evalRow];

      setGuesses(nextGuesses);
      setEvaluations(nextEvaluations);
      setCurrentGuess('');
      setIsInvalidShake(false);

      if (currentGuess === secretWordMeta.word) {
        setGameWon(true);
        setIsPlaying(false);
        const finalScore =
          (maxGuesses - guesses.length) * (difficulty === 'hard' ? 20 : difficulty === 'medium' ? 10 : 5);
        setScore(finalScore);
        if (finalScore > currentHighScore) {
          setCurrentHighScore(finalScore);
          awardPoints();
        }
        toast(isRTL ? 'إجابة صحيحة! أحسنت التخمين 🎉' : 'Correct Guess! You solved it 🎉', 'success');
      } else if (nextGuesses.length >= maxGuesses) {
        setGameOver(true);
        setIsPlaying(false);
        onGameOver(score);
        toast(
          isRTL
            ? `انتهت المحاولات! الكلمة الصحيحة هي: ${secretWordMeta.displayWord}`
            : `Game Over! The word was: ${secretWordMeta.displayWord}`,
          'error'
        );
      }
    } else if (char === 'BACKSPACE' || char === 'DELETE') {
      setCurrentGuess(prev => prev.slice(0, -1));
      setIsInvalidShake(false);
    } else {
      const normalized = isRTL ? normalizeArabic(char) : char.toUpperCase();
      if (normalized.length === 1 && currentGuess.length < secretWordMeta.length) {
        setCurrentGuess(prev => prev + normalized);
        setIsInvalidShake(false);
      }
    }
  }, [
    gameOver,
    gameWon,
    isPlaying,
    secretWordMeta,
    currentGuess,
    isRTL,
    guesses,
    evaluations,
    difficulty,
    currentHighScore,
    onGameOver,
    score,
    awardPoints
  ]);

  // Physical Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver || gameWon) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACKSPACE');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, gameWon, handleKeyPress]);

  // Complete Arabic Keyboard (Including missing letters 'ز' and 'ظ')
  const arKeyboard = [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
    ['ENTER', 'ذ', 'د', 'ز', 'ر', 'و', 'ة', 'ء', 'ظ', 'BACKSPACE']
  ];

  const enKeyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  const keyboard = isRTL ? arKeyboard : enKeyboard;

  // Responsive cell size according to word length
  const cellSizeClass =
    wordLength === 4
      ? 'w-12 h-12 sm:w-14 sm:h-14 text-base sm:text-lg'
      : wordLength === 5
      ? 'w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-base'
      : wordLength === 6
      ? 'w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm'
      : 'w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm';

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden text-slate-800 dark:text-white animate-in fade-in duration-300">
      {/* Top Controls */}
      <div className="w-full flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
            title={isRTL ? 'إغلاق' : 'Close'}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          {isPlaying && (
            <button
              onClick={() => {
                setIsPlaying(false);
                setGameOver(false);
                setGameWon(false);
              }}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-sm active:scale-90"
              title={isRTL ? 'تغيير الصعوبة' : 'Change Difficulty'}
            >
              <span className="material-symbols-outlined text-xl">tune</span>
            </button>
          )}
        </div>

        <h2 className="text-xl font-black tracking-tighter text-pink-500 dark:text-pink-400">
          {t('arcade.wordle.title') || 'تخمين الكلمة'} 🔠
        </h2>

        <div className="flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-pink-500 dark:text-pink-400 text-sm">vpn_key</span>
          <span className="text-xs font-black text-pink-600 dark:text-pink-300">
            {guesses.length} / {maxGuesses}
          </span>
        </div>
      </div>

      {/* Domain / Category Hint Banner */}
      {isPlaying && secretWordMeta && (
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/25 px-4 py-1.5 rounded-2xl mx-auto my-1 text-center shadow-xs animate-in fade-in duration-300 w-full max-w-sm">
          <span className="material-symbols-outlined text-pink-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            lightbulb
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isRTL ? 'المجال:' : 'Category:'}
            </span>
            <span className="text-xs font-black text-pink-600 dark:text-pink-400">
              {isRTL ? secretWordMeta.category : secretWordMeta.categoryEn}
            </span>
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div className="relative flex flex-col gap-1.5 items-center justify-center my-auto mx-auto w-full">
        {/* Guesses rows */}
        {Array.from({ length: maxGuesses }).map((_, rIndex) => {
          const guess = guesses[rIndex];
          const rowEval = evaluations[rIndex];
          const isActive = rIndex === guesses.length;

          return (
            <div
              key={rIndex}
              className={`flex gap-1.5 justify-center transition-transform ${
                isActive && isInvalidShake ? 'animate-shake' : ''
              }`}
            >
              {Array.from({ length: wordLength }).map((_, cIndex) => {
                let char = '';
                let statusClass =
                  'border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 text-slate-800 dark:text-white';

                if (guess && rowEval) {
                  char = guess[cIndex] || '';
                  const status = rowEval[cIndex];
                  if (status === 'correct') {
                    statusClass = 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20';
                  } else if (status === 'present') {
                    statusClass = 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20';
                  } else {
                    statusClass =
                      'bg-slate-200 dark:bg-slate-800/60 text-slate-400 dark:text-white/40 border-slate-300 dark:border-slate-700';
                  }
                } else if (isActive) {
                  char = currentGuess[cIndex] || '';
                  statusClass = char
                    ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-300 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 text-slate-800 dark:text-white';
                }

                return (
                  <div
                    key={cIndex}
                    className={`${cellSizeClass} rounded-xl border flex items-center justify-center font-black transition-all duration-300 uppercase shadow-xs ${statusClass}`}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Start / Game Over Screen Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-4 text-center z-30 shadow-xl border border-slate-200 dark:border-white/10">
            <span className="material-symbols-outlined text-4xl text-pink-500 dark:text-pink-400 animate-bounce mb-2">
              vpn_key
            </span>
            <h3 className="text-sm font-black text-slate-800 dark:text-pink-200">
              {gameOver
                ? isRTL
                  ? `للأسف! الكلمة السرية: ${secretWordMeta?.displayWord || ''}`
                  : `Game Over! Word was: ${secretWordMeta?.displayWord || ''}`
                : gameWon
                ? isRTL
                  ? 'إجابة صحيحة بالكامل! 🎉🏆'
                  : 'Puzzle Solved! 🎉🏆'
                : isRTL
                ? 'لغز تخمين الكلمة'
                : 'Word Guessing Puzzle'}
            </h3>

            {secretWordMeta && (gameOver || gameWon) && (
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                {isRTL ? `المجال: ${secretWordMeta.category}` : `Domain: ${secretWordMeta.categoryEn}`}
              </p>
            )}

            {!gameOver && !gameWon && (
              <div className="flex gap-1.5 my-3">
                <button
                  onClick={() => setDifficulty('easy')}
                  className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                    difficulty === 'easy'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-600 dark:text-pink-200'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {isRTL ? 'سهل (4 أحرف)' : 'Easy (4 letters)'}
                </button>
                <button
                  onClick={() => setDifficulty('medium')}
                  className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                    difficulty === 'medium'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-600 dark:text-pink-200'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {isRTL ? 'متوسط (5 أحرف)' : 'Medium (5 letters)'}
                </button>
                <button
                  onClick={() => setDifficulty('hard')}
                  className={`px-3 py-1 rounded-xl border text-[10px] font-black transition-all ${
                    difficulty === 'hard'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-600 dark:text-pink-200'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {isRTL ? 'صعب (6-7 أحرف) 🔥' : 'Hard (6-7 letters) 🔥'}
                </button>
              </div>
            )}

            <p className="text-[9px] text-slate-500 dark:text-white/50 max-w-[220px] mb-3 leading-snug">
              {isRTL
                ? 'خمن الكلمة السرية الصحيحة في 6 محاولات مع مطابقة عدد الخانات للحروف! تقبل اللعبة الكلمات الحقيقية فقط.'
                : 'Guess the secret word in 6 attempts! Grid dynamically matches word length. Only valid words accepted.'}
            </p>
            <button
              onClick={startGame}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-pink-500/20"
            >
              {isRTL ? 'ابدأ التحدي' : 'Start Challenge'}
            </button>
          </div>
        )}
      </div>

      {/* Virtual Keyboard */}
      <div className="flex flex-col gap-1 mx-auto w-full select-none relative z-10 my-1">
        {keyboard.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1 justify-center">
            {row.map((char, cIdx) => {
              const isSpecial = char === 'ENTER' || char === 'BACKSPACE';
              const keyStatus = keyboardStatuses[char];

              let keyClass =
                'bg-white dark:bg-white/[0.06] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white/90 hover:bg-slate-100 dark:hover:bg-white/[0.12]';

              if (keyStatus === 'correct') {
                keyClass = 'bg-emerald-500 text-white border-emerald-600';
              } else if (keyStatus === 'present') {
                keyClass = 'bg-amber-500 text-white border-amber-600';
              } else if (keyStatus === 'absent') {
                keyClass =
                  'bg-slate-200 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-800 opacity-60';
              }

              return (
                <button
                  key={cIdx}
                  data-key={char}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKeyPress(char);
                  }}
                  className={`rounded-xl flex items-center justify-center font-black transition-all active:scale-90 border shadow-xs ${
                    isSpecial
                      ? 'px-2.5 py-2 bg-pink-500 border-pink-600 text-white shadow-sm text-[9px] min-w-[40px]'
                      : `w-7 sm:w-8 py-2 text-[10px] ${keyClass}`
                  }`}
                >
                  {char === 'BACKSPACE' ? (
                    <span className="material-symbols-outlined text-sm">backspace</span>
                  ) : char === 'ENTER' ? (
                    isRTL ? 'تأكيد' : 'ENTER'
                  ) : (
                    char
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
