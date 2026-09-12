import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { checkMilestone } from '../../../core/loyalty';
import { toast } from '../../../toast';
import confetti from 'canvas-confetti';
import { silentFail } from '../../../core/utils';

interface GlossaryTerm {
  id: string;
  icon: string;
  color: string;
  gradient: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'inflation',
    icon: 'trending_up',
    color: '#3b82f6',
    gradient: 'from-blue-600 to-blue-400'
  },
  {
    id: 'compound_interest',
    icon: 'all_inclusive',
    color: '#0d9488',
    gradient: 'from-teal-600 to-teal-400'
  },
  {
    id: 'roi',
    icon: 'insights',
    color: '#8b5cf6',
    gradient: 'from-purple-600 to-purple-400'
  },
  {
    id: 'asset_allocation',
    icon: 'pie_chart',
    color: '#0ea5e9',
    gradient: 'from-sky-600 to-sky-400'
  },
  {
    id: 'liquid_assets',
    icon: 'water_drop',
    color: '#06b6d4',
    gradient: 'from-cyan-600 to-cyan-400'
  },
  {
    id: 'opportunity_cost',
    icon: 'alt_route',
    color: '#f59e0b',
    gradient: 'from-amber-600 to-amber-400'
  },
  {
    id: 'emergency_fund',
    icon: 'shield',
    color: '#f43f5e',
    gradient: 'from-rose-600 to-rose-400'
  },
  {
    id: 'zakat',
    icon: 'payments',
    color: '#10b981',
    gradient: 'from-emerald-600 to-emerald-400'
  },
  {
    id: 'dca',
    icon: 'calendar_month',
    color: '#6366f1',
    gradient: 'from-indigo-600 to-indigo-400'
  },
  {
    id: 'surplus_deficit',
    icon: 'balance',
    color: '#84cc16',
    gradient: 'from-lime-600 to-lime-400'
  }
];

export function Glossary() {
  const { t } = useI18n();
  const { fmt } = useFormat();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [readTerms, setReadTerms] = useState<string[]>([]);
  const [isRewardClaimed, setIsRewardClaimed] = useState(false);

  // Load read terms and reward state on mount
  useEffect(() => {
    const savedRead = localStorage.getItem('masarifi_read_glossary_terms');
    if (savedRead) {
      try {
        setReadTerms(JSON.parse(savedRead));
      } catch (e) {
        silentFail('[Glossary] Error parsing read terms')(e);
      }
    }

    const completedMilestones = useSettingsStore.getState().completedMilestones || [];
    if (completedMilestones.includes('GLOSSARY_EXPLORE')) {
      setIsRewardClaimed(true);
    }
  }, []);

  // Resolve terms dynamically with current active language using t(...)
  const resolvedTerms = GLOSSARY_TERMS.map(term => ({
    ...term,
    category: t(`glossary.terms.${term.id}.category`) || '',
    title: t(`glossary.terms.${term.id}.title`) || '',
    teaser: t(`glossary.terms.${term.id}.teaser`) || '',
    description: t(`glossary.terms.${term.id}.description`) || '',
    example: t(`glossary.terms.${term.id}.example`) || '',
    insight: t(`glossary.terms.${term.id}.insight`) || ''
  }));

  const handleCardClick = (id: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card from flipping back when clicking the button

    if (readTerms.includes(id)) return;

    const nextRead = [...readTerms, id];
    setReadTerms(nextRead);
    localStorage.setItem('masarifi_read_glossary_terms', JSON.stringify(nextRead));

    // Award loyalty points for the FIRST exploration of the glossary
    if (!isRewardClaimed) {
      const success = await checkMilestone('GLOSSARY_EXPLORE');
      if (success) {
        setIsRewardClaimed(true);
        toast(t('glossary.rewardClaimed') || 'تم استلام مكافأة القاموس! 🎉', 'success');
        try {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          /* Confetti effect is non-critical UI decoration — silently fallback */
        }
      }
    } else {
      toast(t('glossary.markedReadSuccess') || 'Term marked as read! 📚', 'success');
    }
  };

  // Categories list
  const categories = ['all', ...Array.from(new Set(resolvedTerms.map(term => term.category)))];

  // Filtering terms
  const filteredTerms = resolvedTerms.filter(term => {
    const termTitle = term.title.toLowerCase();
    const termCategory = term.category;
    const query = search.toLowerCase();
    
    const matchesSearch = termTitle.includes(query) || 
                          term.teaser.toLowerCase().includes(query) ||
                          term.description.toLowerCase().includes(query);

    const matchesCategory = selectedCategory === 'all' || termCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      
      {/* CSS for 3D Flipping Card */}
      <style>{`
        .glossary-card-container {
          perspective: 1000px;
          height: 340px;
        }
        .glossary-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          cursor: pointer;
        }
        .glossary-card-container.flipped .glossary-card-inner {
          transform: rotateY(180deg);
        }
        .glossary-card-front, .glossary-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 2.2rem;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }
        .dark .glossary-card-front, .dark .glossary-card-back {
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
        }
        .glossary-card-back {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100 flex items-center gap-2">
            {t('nav.glossary') || 'قاموس المصطلحات المالية 📘'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-80 leading-relaxed">
              {t('glossary.tagline') || 'دليلك السريع لفهم عالم المال والاستثمار'}
            </p>
          </div>
        </div>

        {/* Loyalty Badge */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 dark:from-amber-500/5 dark:to-yellow-500/0.5 border border-amber-500/20 rounded-2xl p-3 pr-4 shadow-sm animate-in slide-in-from-top-4 duration-500 max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-xl">monetization_on</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {isRewardClaimed ? t('glossary.rewardClaimed') : t('glossary.rewardTitle')}
            </p>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">
              {isRewardClaimed 
                ? t('glossary.rewardSuccessDesc')
                : t('glossary.rewardEarnDesc')
              }
            </p>
          </div>
        </div>
      </div>

      {/* Progress Tracker Card */}
      <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-6 shadow-sm border border-black/5 dark:border-white/5 mx-1 flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1.5 text-center sm:text-right">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{t('glossary.knowledgeLevel')}</span>
          <h3 className="text-lg font-black dark:text-white">
            {t('glossary.progressText', { read: fmt(readTerms.length), total: fmt(resolvedTerms.length) })}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold max-w-md">
            {t('glossary.progressDesc')}
          </p>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative w-20 h-20 shrink-0 rounded-full flex items-center justify-center shadow-inner border border-black/5 dark:border-white/5" 
             style={{ 
               background: `conic-gradient(#3b82f6 ${(readTerms.length / resolvedTerms.length) * 360}deg, #f1f5f9 0deg)`
             }}>
          <div className="absolute inset-2 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center font-black text-slate-700 dark:text-white text-xs">
            <span className="text-base font-black tabular-nums">{Math.round((readTerms.length / resolvedTerms.length) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Search & Categories Section */}
      <div className="space-y-4">
        
        {/* Search Input */}
        <div className="relative mx-1 bg-white dark:bg-[#1e2124] rounded-3xl p-1.5 shadow-sm border border-black/5 dark:border-white/5 flex items-center">
          <span className="material-symbols-outlined text-slate-400 px-3.5 text-xl select-none">search</span>
          <input
            type="text"
            dir="auto"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onCompositionEnd={e => setSearch(e.currentTarget.value)}
            placeholder={t('glossary.search') || 'ابحث عن مصطلح مالي...'}
            className="w-full bg-transparent py-3 pr-4 pl-1 text-sm font-bold focus:outline-none dark:text-white placeholder:text-slate-400/80"
          />
          {search && (
            <button onClick={() => setSearch('')} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all mr-2">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            const displayLabel = cat === 'all' ? t('glossary.all') : cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border-transparent'
                    : 'bg-white dark:bg-[#1e2124] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-black/5 dark:border-white/5'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Glossary Cards Grid */}
      {filteredTerms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
          <span className="material-symbols-outlined text-5xl">menu_book</span>
          <p className="text-sm font-bold">{t('glossary.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
          {filteredTerms.map(term => {
            const isFlipped = !!flippedCards[term.id];
            const isRead = readTerms.includes(term.id);

            return (
              <div 
                key={term.id} 
                onClick={() => handleCardClick(term.id)}
                className={`glossary-card-container ${isFlipped ? 'flipped' : ''}`}
              >
                <div className="glossary-card-inner">
                  
                  {/* FRONT SIDE */}
                  <div className="glossary-card-front bg-white dark:bg-[#1e2124] p-6 flex flex-col justify-between overflow-hidden">
                    
                    {/* Glowing Accent Top border */}
                    <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${term.gradient}`} />
                    
                    {/* Card Top: Category and Read Status */}
                    <div className="flex justify-between items-start pt-2">
                      <span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/40 text-slate-500 dark:text-slate-400 border border-black/5 dark:border-white/5`}>
                        {term.category}
                      </span>
                      {isRead && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/25">
                          <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span>
                          {t('glossary.readStatus')}
                        </span>
                      )}
                    </div>

                    {/* Card Body: Title and Teaser */}
                    <div className="space-y-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${term.gradient} text-white flex items-center justify-center shadow-md shadow-blue-500/10`}>
                          <span className="material-symbols-outlined text-lg">{term.icon}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">
                          {term.title}
                        </h3>
                      </div>
                      
                      <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed font-bold">
                        {term.teaser}
                      </p>
                    </div>

                    {/* Card Footer: Flip Instruction */}
                    <div className="border-t border-slate-50 dark:border-white/5 pt-4 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs animate-bounce">lightbulb</span>
                        {t('glossary.flip') || 'انقر لقلب البطاقة ومعرفة المزيد 💡'}
                      </span>
                      <span className="material-symbols-outlined text-base text-blue-500">arrow_forward</span>
                    </div>

                  </div>

                  {/* BACK SIDE */}
                  <div className="glossary-card-back bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-[#1b1d20] dark:to-[#222529] p-6 flex flex-col justify-between overflow-hidden">
                    
                    {/* Glowing Accent Top border */}
                    <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${term.gradient}`} />
                    
                    {/* Scrollable Definition Content */}
                    <div className="space-y-4 overflow-y-auto pr-1 scrollbar-hide pt-2">
                      
                      {/* Title */}
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-base text-slate-800 dark:text-white">
                          {term.title}
                        </h4>
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {term.category}
                        </span>
                      </div>

                      {/* Main Explanation */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed font-semibold">
                        {term.description}
                      </p>

                      {/* Example Section */}
                      <div className="bg-white/80 dark:bg-[#1e2124]/60 p-3 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">info</span>
                          {t('glossary.realWorldExample')}
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                          {term.example}
                        </p>
                      </div>

                      {/* Insight Section */}
                      <div className="bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10 space-y-1">
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">emoji_objects</span>
                          {t('glossary.strategicTip')}
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                          {term.insight}
                        </p>
                      </div>

                    </div>

                    {/* Card Actions: Mark as Read & Flip Back */}
                    <div className="border-t border-slate-100 dark:border-white/5 pt-4 flex gap-3 z-30">
                      
                      {/* Mark as read button */}
                      <button
                        onClick={(e) => handleMarkAsRead(term.id, e)}
                        disabled={isRead}
                        className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                          isRead
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/15 active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isRead ? 'check_circle' : 'visibility'}
                        </span>
                        {isRead ? t('glossary.learned') : t('glossary.markAsRead')}
                      </button>

                      {/* Flip back icon */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center shrink-0 transition-all hover:bg-slate-200/50 dark:hover:bg-slate-700/50">
                        <span className="material-symbols-outlined text-base">flip</span>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
