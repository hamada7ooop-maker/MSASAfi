import { silentFail } from '../../../core/utils';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useI18n } from '@/i18n/index';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { useArcadeStore } from '../store/arcadeStore';

// Lazy loaded arcade games for optimal bundle size and on-demand execution
const DinoGame = lazy(() => import('./DinoGame').then(m => ({ default: m.DinoGame })));
const SnakeGame = lazy(() => import('./SnakeGame').then(m => ({ default: m.SnakeGame })));
const CoinMerger = lazy(() => import('./CoinMerger').then(m => ({ default: m.CoinMerger })));
const TicTacToe = lazy(() => import('./TicTacToe').then(m => ({ default: m.TicTacToe })));
const Sudoku = lazy(() => import('./Sudoku').then(m => ({ default: m.Sudoku })));
const Minesweeper = lazy(() => import('./Minesweeper').then(m => ({ default: m.Minesweeper })));
const SlidingPuzzle = lazy(() => import('./SlidingPuzzle').then(m => ({ default: m.SlidingPuzzle })));
const MemoryGame = lazy(() => import('./MemoryGame').then(m => ({ default: m.MemoryGame })));
const Tetris = lazy(() => import('./Tetris').then(m => ({ default: m.Tetris })));
const BrickBreaker = lazy(() => import('./BrickBreaker').then(m => ({ default: m.BrickBreaker })));
const SpaceInvaders = lazy(() => import('./SpaceInvaders').then(m => ({ default: m.SpaceInvaders })));
const Asteroids = lazy(() => import('./Asteroids').then(m => ({ default: m.Asteroids })));
const PacMan = lazy(() => import('./PacMan').then(m => ({ default: m.PacMan })));
const Frogger = lazy(() => import('./Frogger').then(m => ({ default: m.Frogger })));
const Pong = lazy(() => import('./Pong').then(m => ({ default: m.Pong })));
const FlappyBird = lazy(() => import('./FlappyBird').then(m => ({ default: m.FlappyBird })));
const Wordle = lazy(() => import('./Wordle').then(m => ({ default: m.Wordle })));
const TowerBloxx = lazy(() => import('./TowerBloxx').then(m => ({ default: m.TowerBloxx })));
const Match3 = lazy(() => import('./Match3').then(m => ({ default: m.Match3 })));
const LightRiders = lazy(() => import('./LightRiders').then(m => ({ default: m.LightRiders })));
const GoldMiner = lazy(() => import('./GoldMiner').then(m => ({ default: m.GoldMiner })));
const BlockPuzzle = lazy(() => import('./BlockPuzzle').then(m => ({ default: m.BlockPuzzle })));
const GravityMaze = lazy(() => import('./GravityMaze').then(m => ({ default: m.GravityMaze })));
const CyberCheckers = lazy(() => import('./CyberCheckers').then(m => ({ default: m.CyberCheckers })));

function GameLoadingFallback({ onClose }: { onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300 p-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest animate-pulse">
        جاري تجهيز اللعبة...
      </p>
      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 px-4 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 rounded-lg transition-colors"
        >
          إلغاء
        </button>
      )}
    </div>
  );
}

export function ArcadeHub() {
  const { t, isRTL } = useI18n();
  const navigate = useNavigate();
  const userPoints = useAppStore(s => s.userPoints);
  
  // Game states
  const [activeGame, setActiveGame] = useState<'dino' | 'snake' | 'coins' | 'tictactoe' | 'sudoku' | 'minesweeper' | 'sliding' | 'memory' | 'tetris' | 'brick' | 'invaders' | 'asteroids' | 'pacman' | 'frogger' | 'pong' | 'flappy' | 'wordle' | 'bloxx' | 'match3' | 'lightriders' | 'goldminer' | 'blockpuzzle' | 'gravitymaze' | 'cybercheckers' | null>(null);

  // High Scores local state (persisted via arcadeStore → IndexedDB)
  const [highScores, setHighScores] = useState({
    dino: 0,
    snake: 0,
    coins: 0,
    tictactoe: 0,
    sudoku: 0,
    minesweeper: 0,
    sliding: 0,
    memory: 0,
    tetris: 0,
    brick: 0,
    invaders: 0,
    asteroids: 0,
    pacman: 0,
    frogger: 0,
    pong: 0,
    flappy: 0,
    wordle: 0,
    bloxx: 0,
    match3: 0,
    lightriders: 0,
    goldminer: 0,
    blockpuzzle: 0,
    gravitymaze: 0,
    cybercheckers: 0
  });

  useEffect(() => {
    try {
      const getScore = useArcadeStore.getState().getHighScore;
      const loaded = { ...highScores };
      (Object.keys(highScores) as (keyof typeof highScores)[]).forEach((game) => {
        loaded[game] = getScore(game);
      });
      setHighScores(loaded);
    } catch (e) {
      silentFail('[Arcade] Failed to read high scores')(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame]);

  const updateHighScore = (game: keyof typeof highScores, score: number) => {
    if (score > highScores[game]) {
      try {
        useArcadeStore.getState().setHighScore(game, score);
        setHighScores(prev => ({ ...prev, [game]: score }));
      } catch (e) {
        silentFail('[Arcade] Failed to write score:')(e);
      }
    }
  };

  const games = [
    {
      id: 'coins' as const,
      title: isRTL ? 'لعبة 2048 الرقمية' : '2048 Puzzle',
      icon: 'toll',
      description: isRTL 
        ? 'ادمج الأرقام المتطابقة لتصل إلى البلاطة المتوهجة 2048! لغز كلاسيكي ممتع وعميق.' 
        : 'Merge matching numbers to reach the glowing 2048 tile! Classic additive puzzle.',
      color: '#f59e0b',
      gradient: 'from-amber-600/20 to-orange-500/10 border-amber-500/30 shadow-amber-500/5',
      glowColor: 'rgba(245,158,11,0.4)',
      score: highScores.coins,
      scoreLabel: isRTL ? 'أعلى رقم:' : 'Highest Tile:'
    },
    {
      id: 'dino' as const,
      title: t('arcade.dino') || 'قفز الديناصور',
      icon: 'sports_esports',
      description: isRTL 
        ? 'اقفز فوق الصبار وتفادى العقبات في سباق لانهائي مبهر وبسرعة 60 إطار.' 
        : 'Jump over obstacles and bypass flying birds in an endless pixel-perfect run.',
      color: '#22c55e',
      gradient: 'from-emerald-600/20 to-teal-500/10 border-emerald-500/30 shadow-emerald-500/5',
      glowColor: 'rgba(34,197,94,0.4)',
      score: highScores.dino,
      scoreLabel: isRTL ? 'الرقم القياسي:' : 'High Score:'
    },
    {
      id: 'snake' as const,
      title: t('arcade.snake') || 'الثعبان',
      icon: 'gesture',
      description: isRTL 
        ? 'تحكم بالثعبان ليلتهم التفاح الذهبي ويكبر حجمه مع إيماءات تحكم سريعة.' 
        : 'Control the snake to consume golden apples and grow larger. High-end grid layout.',
      color: '#a855f7',
      gradient: 'from-purple-600/20 to-indigo-500/10 border-purple-500/30 shadow-purple-500/5',
      glowColor: 'rgba(168,85,247,0.4)',
      score: highScores.snake,
      scoreLabel: isRTL ? 'أعلى نتيجة:' : 'Best Score:'
    },
    {
      id: 'tictactoe' as const,
      title: isRTL ? 'تحدي X & O' : 'X & O Duel',
      icon: 'close',
      description: isRTL
        ? 'العب ضد صديقك أو واجه الذكاء الاصطناعي المستحيل MiniMax في واجهة نيون فخمة.'
        : 'Play vs friends or test your brain against the impossible MiniMax AI engine.',
      color: '#3b82f6',
      gradient: 'from-blue-600/20 to-indigo-500/10 border-blue-500/30 shadow-blue-500/5',
      glowColor: 'rgba(59,130,246,0.4)',
      score: highScores.tictactoe,
      scoreLabel: isRTL ? 'مرات الفوز:' : 'Total Wins:'
    },
    {
      id: 'sudoku' as const,
      title: isRTL ? 'سودوكو الذكاء' : 'Sudoku Mind',
      icon: 'grid_on',
      description: isRTL
        ? 'اختبر مهاراتك الرياضية مع ألغاز سودوكو مولدة ديناميكياً بوضع الملاحظات والتلميحات.'
        : 'Sharpen your mathematics with backtracking generated puzzles, notes, and hints.',
      color: '#0d9488',
      gradient: 'from-teal-600/20 to-emerald-500/10 border-teal-500/30 shadow-teal-500/5',
      glowColor: 'rgba(13,148,136,0.4)',
      score: highScores.sudoku,
      scoreLabel: isRTL ? 'ألواح محلولة:' : 'Solved Boards:'
    },
    {
      id: 'minesweeper' as const,
      title: isRTL ? 'كاسحة الألغام المتطورة' : 'Minesweeper',
      icon: 'brightness_high',
      description: isRTL
        ? 'اكتشف حقل الألغام بأمان مستخدماً Flood Fill السريع ووضع الأعلام المخصص.'
        : 'Safely clear the minefield with flood fill cascades and customized flag systems.',
      color: '#ea580c',
      gradient: 'from-orange-600/20 to-red-500/10 border-orange-500/30 shadow-orange-500/5',
      glowColor: 'rgba(234,88,12,0.4)',
      score: highScores.minesweeper,
      scoreLabel: isRTL ? 'مرات الفوز:' : 'Total Wins:'
    },
    {
      id: 'sliding' as const,
      title: isRTL ? 'بازل الترتيب المنزلق' : 'Sliding Puzzle',
      icon: 'widgets',
      description: isRTL
        ? 'رتب اللوحة المنزلقة بالأرقام أو بشعار مصاريفي المتوهج بسلاسة 60 FPS.'
        : 'Reorder sliding blocks by numbers or neon agency logos in 60 FPS fluidity.',
      color: '#db2777',
      gradient: 'from-pink-600/20 to-fuchsia-500/10 border-pink-500/30 shadow-pink-500/5',
      glowColor: 'rgba(219,39,119,0.4)',
      score: highScores.sliding,
      scoreLabel: isRTL ? 'أقل حركات:' : 'Best Moves:'
    },
    {
      id: 'memory' as const,
      title: isRTL ? 'تحدي الذاكرة المالي' : 'Memory Match',
      icon: 'psychology',
      description: isRTL
        ? 'نمي ذاكرتك مع بطاقات ثلاثية الأبعاد ثلاثية الأبعاد للرموز المالية الآمنة.'
        : 'Test your cognitive memory with safe 3D flip card sets and glowing financial themes.',
      color: '#10b981',
      gradient: 'from-emerald-600/20 to-cyan-500/10 border-emerald-500/30 shadow-emerald-500/5',
      glowColor: 'rgba(16,185,129,0.4)',
      score: highScores.memory,
      scoreLabel: isRTL ? 'أقل محاولات:' : 'Best Moves:'
    },
    {
      id: 'tetris' as const,
      title: isRTL ? 'التتريس المطور' : 'Tetris Shift',
      icon: 'grid_view',
      description: isRTL
        ? 'تحكم بكتل التتريس المتساقطة ورتب الصفوف لتدمرها مع زيادة السرعة تدريجياً.'
        : 'Control falling blocks and clear horizontal rows as gravity speeds up over levels.',
      color: '#06b6d4',
      gradient: 'from-cyan-600/20 to-blue-500/10 border-cyan-500/30 shadow-cyan-500/5',
      glowColor: 'rgba(6,182,212,0.4)',
      score: highScores.tetris,
      scoreLabel: isRTL ? 'أعلى نقاط:' : 'Best Score:'
    },
    {
      id: 'brick' as const,
      title: isRTL ? 'تدمير الكتل' : 'Brick Breaker',
      icon: 'layers',
      description: isRTL
        ? 'حرك مضربك الزجاجي لارتداد الكرات وتدمير كتل النيون المتوهجة مع ترقيات متساقطة.'
        : 'Bounce physical balls to destroy neon bricks with falling multi-powers and lasers.',
      color: '#06b6d4',
      gradient: 'from-cyan-600/20 to-indigo-500/10 border-cyan-500/30 shadow-cyan-500/5',
      glowColor: 'rgba(6,182,212,0.4)',
      score: highScores.brick,
      scoreLabel: isRTL ? 'أعلى نتيجة:' : 'Best Score:'
    },
    {
      id: 'invaders' as const,
      title: isRTL ? 'غزاة الفضاء' : 'Space Invaders',
      icon: 'rocket_launch',
      description: isRTL
        ? 'قد مركبتك الدفاعية وصد جحافل الكائنات الفضائية النيونية مع حواجز زجاجية متحللة.'
        : 'Defend your planet from falling neon aliens with depleting protective bunkers.',
      color: '#22c55e',
      gradient: 'from-emerald-600/20 to-green-500/10 border-emerald-500/30 shadow-emerald-500/5',
      glowColor: 'rgba(34,197,94,0.4)',
      score: highScores.invaders,
      scoreLabel: isRTL ? 'أعلى نتيجة:' : 'Best Score:'
    },
    {
      id: 'asteroids' as const,
      title: isRTL ? 'الكويكبات' : 'Asteroids Duel',
      icon: 'blur_on',
      description: isRTL
        ? 'حلق بمركبتك النيونية وفتت الكويكبات الهندسية الضخمة لقطع أصغر دون اصطدام.'
        : 'Navigate your spaceship and blast rolling space hazards into glowing fragments.',
      color: '#f43f5e',
      gradient: 'from-rose-600/20 to-amber-500/10 border-rose-500/30 shadow-rose-500/5',
      glowColor: 'rgba(244,63,94,0.4)',
      score: highScores.asteroids,
      scoreLabel: isRTL ? 'أعلى نتيجة:' : 'Best Score:'
    },
    {
      id: 'pacman' as const,
      title: isRTL ? 'باك مان' : 'Pac-Man',
      icon: 'face',
      description: isRTL
        ? 'التهم كل النقاط الذهبية في المتاهة وتجنب الأشباح الأربعة الأذكياء.'
        : 'Consume gold dots in the maze while escaping four clever ghosts.',
      color: '#facc15',
      gradient: 'from-yellow-600/20 to-amber-500/10 border-yellow-500/30 shadow-yellow-500/5',
      glowColor: 'rgba(250,204,21,0.4)',
      score: highScores.pacman,
      scoreLabel: isRTL ? 'أعلى نقاط:' : 'Best Score:'
    },
    {
      id: 'frogger' as const,
      title: isRTL ? 'عبور الضفدع' : 'Frogger',
      icon: 'nature_people',
      description: isRTL
        ? 'ساعد الضفدع على عبور الطريق السريع المزدحم وتخطي النهر بأمان.'
        : 'Help the frog cross busy roads and navigate the flowing river safely.',
      color: '#22c55e',
      gradient: 'from-emerald-600/20 to-green-500/10 border-emerald-500/30 shadow-emerald-500/5',
      glowColor: 'rgba(34,197,150,0.4)',
      score: highScores.frogger,
      scoreLabel: isRTL ? 'أعلى نقاط:' : 'Best Score:'
    },
    {
      id: 'pong' as const,
      title: isRTL ? 'التنس الكلاسيكي' : 'Pong Tennis',
      icon: 'sports_tennis',
      description: isRTL
        ? 'تحدَ الكمبيوتر أو صديقك محلياً في لعبة التنس الكلاسيكية الأسطورية.'
        : 'Challenge CPU or local friends in the legendary classic tennis match.',
      color: '#06b6d4',
      gradient: 'from-cyan-600/20 to-blue-500/10 border-cyan-500/30 shadow-cyan-500/5',
      glowColor: 'rgba(6,182,212,0.4)',
      score: highScores.pong,
      scoreLabel: isRTL ? 'مرات الفوز:' : 'Total Wins:'
    },
    {
      id: 'flappy' as const,
      title: isRTL ? 'الطائر الرفراف' : 'Flappy Bird',
      icon: 'flight_takeoff',
      description: isRTL
        ? 'حلق بالطائر الصغير عبر فجوات الأنابيب وتفادَ الاصطدام بفيزياء رائعة.'
        : 'Flap and navigate between narrow glass pipes under real gravity physics.',
      color: '#06b6d4',
      gradient: 'from-cyan-600/20 to-teal-500/10 border-cyan-500/30 shadow-cyan-500/5',
      glowColor: 'rgba(6,182,212,0.4)',
      score: highScores.flappy,
      scoreLabel: isRTL ? 'أعلى نقاط:' : 'Best Score:'
    },
    {
      id: 'wordle' as const,
      title: isRTL ? 'تخمين الكلمة' : 'Word Guess',
      icon: 'vpn_key',
      description: isRTL
        ? 'خمن الكلمة المالية أو العامة السرية (4 إلى 7 أحرف) مع تلميح المجال في 6 محاولات.'
        : 'Guess the secret financial or general word (4 to 7 letters) with field hints in 6 attempts.',
      color: '#db2777',
      gradient: 'from-pink-600/20 to-rose-500/10 border-pink-500/30 shadow-pink-500/5',
      glowColor: 'rgba(219,39,119,0.4)',
      score: highScores.wordle,
      scoreLabel: isRTL ? 'أقل محاولات:' : 'Best Attempt:'
    },
    {
      id: 'bloxx' as const,
      title: isRTL ? 'كتل البناء' : 'Tower Bloxx',
      icon: 'construction',
      description: isRTL
        ? 'اسقط الكتل المتأرجحة من الرافعة بدقة لبناء أطول برج متماسك ومتزن.'
        : 'Drop swaying crane blocks perfectly to stack the highest stable sky tower.',
      color: '#6366f1',
      gradient: 'from-indigo-600/20 to-blue-500/10 border-indigo-500/30 shadow-indigo-500/5',
      glowColor: 'rgba(99,102,241,0.4)',
      score: highScores.bloxx,
      scoreLabel: isRTL ? 'أعلى برج:' : 'Best Tower:'
    },
    {
      id: 'match3' as const,
      title: isRTL ? 'لغز الجواهر المتطابقة' : 'Gem Blast Match-3',
      icon: 'diamond',
      description: isRTL
        ? 'طابق ثلاثة جواهر متجاورة أو أكثر لتفجيرها وجمع النقاط قبل نفاد الحركات!'
        : 'Match three or more adjacent gems to blast them before you run out of moves!',
      color: '#a855f7',
      gradient: 'from-purple-600/20 to-fuchsia-500/10 border-purple-500/30 shadow-purple-500/5',
      glowColor: 'rgba(168,85,247,0.4)',
      score: highScores.match3,
      scoreLabel: isRTL ? 'أعلى نقاط:' : 'Best Score:'
    },
    {
      id: 'lightriders' as const,
      title: isRTL ? 'الدراجات النيونية' : 'Light Riders',
      icon: 'electric_bolt',
      description: isRTL
        ? 'تحكم في دراجتك النيونية وأجبر خصومك على الاصطدام بذيولك المضيئة.'
        : 'Control your neon bike and force rivals to crash into your glowing light trail.',
      color: '#22d3ee',
      gradient: 'from-cyan-600/20 to-blue-500/10 border-cyan-500/30 shadow-cyan-500/5',
      glowColor: 'rgba(34,211,238,0.4)',
      score: highScores.lightriders,
      scoreLabel: isRTL ? 'أعلى نقاط:' : 'Best Score:'
    },
    {
      id: 'goldminer' as const,
      title: isRTL ? 'صياد الذهب والكنوز' : 'Gold Miner',
      icon: 'monetization_on',
      description: isRTL
        ? 'أطلق خطافك الذهبي لسحب قطع الذهب والكنوز وتجنب الصخور الثقيلة.'
        : 'Swing your golden hook to grab treasure and gold while avoiding heavy rocks.',
      color: '#f59e0b',
      gradient: 'from-amber-600/20 to-yellow-500/10 border-amber-500/30 shadow-amber-500/5',
      glowColor: 'rgba(245,158,11,0.4)',
      score: highScores.goldminer,
      scoreLabel: isRTL ? 'أعلى ثروة:' : 'Best Wealth:'
    },
    {
      id: 'blockpuzzle' as const,
      title: isRTL ? 'لغز الكتل الشبكي' : 'Block Puzzle',
      icon: 'view_module',
      description: isRTL
        ? 'اسحب الكتل على الشبكة وأكمل صفوف وأعمدة كاملة لتمسحها وتجمع نقاطاً.'
        : 'Drag blocks onto the grid and complete full rows and columns to clear them.',
      color: '#10b981',
      gradient: 'from-emerald-600/20 to-teal-500/10 border-emerald-500/30 shadow-emerald-500/5',
      glowColor: 'rgba(16,185,129,0.4)',
      score: highScores.blockpuzzle,
      scoreLabel: isRTL ? 'أعلى نقاط:' : 'Best Score:'
    },
    {
      id: 'gravitymaze' as const,
      title: isRTL ? 'متاهة الجاذبية' : 'Gravity Maze',
      icon: 'blur_circular',
      description: isRTL
        ? 'تحكم في الجاذبية وأدر المتاهة ليصل الكرة إلى الهدف الذهبي بدقة رائعة.'
        : 'Control gravity direction and tilt the maze to guide the ball to the golden goal.',
      color: '#f43f5e',
      gradient: 'from-rose-600/20 to-pink-500/10 border-rose-500/30 shadow-rose-500/5',
      glowColor: 'rgba(244,63,94,0.4)',
      score: highScores.gravitymaze,
      scoreLabel: isRTL ? 'مراحل محلولة:' : 'Levels Cleared:'
    },
    {
      id: 'cybercheckers' as const,
      title: isRTL ? 'الداما السيبرانية' : 'Cyber Checkers',
      icon: 'account_balance',
      description: isRTL
        ? 'العب الداما التكتيكية ضد ذكاء اصطناعي حسابي في رقعة نيون مستقبلية.'
        : 'Play tactical checkers against a computational AI on a futuristic neon board.',
      color: '#6366f1',
      gradient: 'from-indigo-600/20 to-violet-500/10 border-indigo-500/30 shadow-indigo-500/5',
      glowColor: 'rgba(99,102,241,0.4)',
      score: highScores.cybercheckers,
      scoreLabel: isRTL ? 'مرات الفوز:' : 'Total Wins:'
    }
  ];

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'dino':
        return <DinoGame highScore={highScores.dino} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('dino', score)} />;
      case 'snake':
        return <SnakeGame highScore={highScores.snake} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('snake', score)} />;
      case 'coins':
        return <CoinMerger highScore={highScores.coins} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('coins', score)} />;
      case 'tictactoe':
        return <TicTacToe highScore={highScores.tictactoe} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('tictactoe', score)} />;
      case 'sudoku':
        return <Sudoku highScore={highScores.sudoku} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('sudoku', score)} />;
      case 'minesweeper':
        return <Minesweeper highScore={highScores.minesweeper} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('minesweeper', score)} />;
      case 'sliding':
        return <SlidingPuzzle highScore={highScores.sliding} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('sliding', score)} />;
      case 'memory':
        return <MemoryGame highScore={highScores.memory} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('memory', score)} />;
      case 'tetris':
        return <Tetris highScore={highScores.tetris} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('tetris', score)} />;
      case 'brick':
        return <BrickBreaker highScore={highScores.brick} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('brick', score)} />;
      case 'invaders':
        return <SpaceInvaders highScore={highScores.invaders} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('invaders', score)} />;
      case 'asteroids':
        return <Asteroids highScore={highScores.asteroids} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('asteroids', score)} />;
      case 'pacman':
        return <PacMan highScore={highScores.pacman} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('pacman', score)} />;
      case 'frogger':
        return <Frogger highScore={highScores.frogger} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('frogger', score)} />;
      case 'pong':
        return <Pong highScore={highScores.pong} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('pong', score)} />;
      case 'flappy':
        return <FlappyBird highScore={highScores.flappy} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('flappy', score)} />;
      case 'wordle':
        return <Wordle highScore={highScores.wordle} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('wordle', score)} />;
      case 'bloxx':
        return <TowerBloxx highScore={highScores.bloxx} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('bloxx', score)} />;
      case 'match3':
        return <Match3 highScore={highScores.match3} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('match3', score)} />;
      case 'lightriders':
        return <LightRiders highScore={highScores.lightriders} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('lightriders', score)} />;
      case 'goldminer':
        return <GoldMiner highScore={highScores.goldminer} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('goldminer', score)} />;
      case 'blockpuzzle':
        return <BlockPuzzle highScore={highScores.blockpuzzle} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('blockpuzzle', score)} />;
      case 'gravitymaze':
        return <GravityMaze highScore={highScores.gravitymaze} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('gravitymaze', score)} />;
      case 'cybercheckers':
        return <CyberCheckers highScore={highScores.cybercheckers} onClose={() => setActiveGame(null)} onGameOver={(score) => updateHighScore('cybercheckers', score)} />;
      default:
        return null;
    }
  };

  if (activeGame) {
    return (
      <div className="fixed top-16 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-24 left-0 right-0 z-30 flex flex-col w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-y-auto overflow-x-hidden animate-in fade-in duration-300">
        <Suspense fallback={<GameLoadingFallback onClose={() => setActiveGame(null)} />}>
          {renderActiveGame()}
        </Suspense>
      </div>
    );
  }


  return (
    <div className="animate-in fade-in duration-700 pb-20 space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/home')}
            className="w-9 h-9 rounded-xl bg-surface-container-low text-slate-500 hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </span>
          </button>
          <div>
            <h1 className="text-2xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
              {t('nav.arcade') || 'مركز الألعاب'}
            </h1>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest opacity-70 mt-0.5">
              {isRTL ? 'ألعاب ترفيهية خفيفة تعمل بالكامل أوفلاين' : 'Premium offline games for mental relaxation'}
            </p>
          </div>
        </div>

        {/* Loyalty Points display widget */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-500 text-base animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
            monetization_on
          </span>
          <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
            {userPoints} {t('shop.points') || 'نقطة'}
          </span>
        </div>
      </div>

      {/* Main Hub Content */}
      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {games.map(game => (
          <div 
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className={`relative overflow-hidden rounded-xl p-3 border bg-gradient-to-br ${game.gradient} group cursor-pointer transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]`}
            style={{ 
              boxShadow: `0 8px 16px -8px ${game.glowColor || 'rgba(0,0,0,0.1)'}, inset 0 0 10px rgba(255,255,255,0.01)`
            }}
          >
            {/* Ambient Background Glow Spot */}
            <div 
              className="absolute -right-6 -top-6 w-16 h-16 rounded-full blur-[15px] opacity-10 group-hover:opacity-15 transition-opacity duration-700" 
              style={{ backgroundColor: game.color }}
            />

            <div className="relative z-10 flex flex-col justify-between h-full min-h-[105px]">
              <div>
                {/* Game Icon and Title Row to save vertical space */}
                <div className="flex items-center gap-2 mb-1.5">
                  {/* Game Icon */}
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white border border-white/20 shadow-sm shrink-0"
                    style={{ 
                      background: `linear-gradient(135deg, ${game.color}, ${game.color}dd)`,
                      boxShadow: `0 3px 6px -2px ${game.color}`
                    }}
                  >
                    <span className="material-symbols-outlined text-lg font-light">
                      {game.icon}
                    </span>
                  </div>

                  {/* Game Title */}
                  <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-1">
                    {game.title}
                  </h3>
                </div>

                {/* Game Description */}
                <p className="text-[9px] text-slate-400 dark:text-slate-400 leading-snug font-bold line-clamp-1 opacity-80">
                  {game.description}
                </p>
              </div>

              {/* High Score and Play Action Row */}
              <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-slate-400 text-[10px]">emoji_events</span>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                    {game.scoreLabel} {game.score}
                  </span>
                </div>

                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm active:scale-90 transition-all"
                  style={{ backgroundColor: game.color }}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    play_arrow
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
