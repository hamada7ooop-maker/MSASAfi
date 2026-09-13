import React, { useEffect } from 'react';
import { useLoyalty } from '../hooks/useLoyalty';
import { useI18n } from '../../../i18n/index';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { db as DB } from '@/core/db/core';
import { toast } from '../../../toast';
import confetti from 'canvas-confetti';
import { celebrate } from '../../../core/a11y';

const DARK_IDS = ['black', 'oled', 'midnight', 'dim', 'royal-gold', 'aurora', 'crimson', 'forest', 'vantablack'];

interface ThemeItem {
  id: string;
  cost: number;
  icon: string;
  nameKey: string;
  descKey: string;
  swatches: [string, string, string];
  mode: 'light' | 'dark';
  premium?: boolean;
}

const LIGHT_THEMES: ThemeItem[] = [
  { id: 'palette:soft',     cost: 500,  icon: 'palette',        nameKey: 'shop.theme.soft',     descKey: 'shop.theme.softDesc',     swatches: ['#fdfbf7','#f5ede0','#e8d5b7'], mode:'light' },
  { id: 'palette:cool',     cost: 500,  icon: 'palette',        nameKey: 'shop.theme.cool',     descKey: 'shop.theme.coolDesc',     swatches: ['#f1f5f9','#cbd5e1','#94a3b8'], mode:'light' },
  { id: 'palette:sepia',    cost: 500,  icon: 'palette',        nameKey: 'shop.theme.sepia',    descKey: 'shop.theme.sepiaDesc',    swatches: ['#fef9c3','#fde68a','#d97706'], mode:'light' },
  { id: 'palette:rose',     cost: 800,  icon: 'favorite',       nameKey: 'shop.theme.rose',     descKey: 'shop.theme.roseDesc',     swatches: ['#fff1f4','#fce7f3','#ec4899'], mode:'light' },
  { id: 'palette:lavender', cost: 800,  icon: 'auto_awesome',   nameKey: 'shop.theme.lavender', descKey: 'shop.theme.lavenderDesc', swatches: ['#f5f0ff','#ede9fe','#7c3aed'], mode:'light' },
  { id: 'palette:sage',     cost: 800,  icon: 'eco',            nameKey: 'shop.theme.sage',     descKey: 'shop.theme.sageDesc',     swatches: ['#edfaf4','#d1fae5','#059669'], mode:'light' },
];

const DARK_THEMES: ThemeItem[] = [
  { id: 'palette:black',      cost: 1000, icon: 'palette',                nameKey: 'shop.theme.black',    descKey: 'shop.theme.blackDesc',    swatches: ['#060c1a','#0d1b2e','#1e3a5f'], mode:'dark' },
  { id: 'palette:midnight',   cost: 1000, icon: 'bedtime',                nameKey: 'shop.theme.midnight', descKey: 'shop.theme.midnightDesc', swatches: ['#020617','#0f172a','#1e3a8a'], mode:'dark' },
  { id: 'palette:oled',       cost: 1200, icon: 'contrast',               nameKey: 'shop.theme.oled',     descKey: 'shop.theme.oledDesc',     swatches: ['#000000','#111111','#333333'], mode:'dark' },
  { id: 'palette:royal-gold', cost: 2500, icon: 'stars',                  nameKey: 'shop.theme.gold',     descKey: 'shop.theme.goldDesc',     swatches: ['#080808','#1a1a1a','#d4af37'], mode:'dark', premium: true },
  { id: 'palette:aurora',     cost: 2500, icon: 'nightlight',             nameKey: 'shop.theme.aurora',   descKey: 'shop.theme.auroraDesc',   swatches: ['#030d0f','#071a1e','#00e5c3'], mode:'dark', premium: true },
  { id: 'palette:crimson',    cost: 2500, icon: 'local_fire_department',  nameKey: 'shop.theme.crimson',  descKey: 'shop.theme.crimsonDesc',  swatches: ['#0d0005','#2d0010','#ff3366'], mode:'dark', premium: true },
  { id: 'palette:forest',     cost: 2500, icon: 'forest',                 nameKey: 'shop.theme.forest',   descKey: 'shop.theme.forestDesc',   swatches: ['#010a05','#0f2a1c','#00c853'], mode:'dark', premium: true },
  { id: 'palette:vantablack', cost: 5000, icon: 'blur_on',                nameKey: 'shop.theme.vantablack', descKey: 'shop.theme.vantablackDesc', swatches: ['#000000','#050505','#111111'], mode:'dark', premium: true },
];

const PERK_ITEMS: ThemeItem[] = [
  { id: 'perk:ai-pro',        cost: 500, icon: 'psychology',     nameKey: 'shop.perk.aiPro',    descKey: 'shop.perk.aiProDesc',    swatches: ['#f0f9ff','#e0f2fe','#0284c7'], mode: 'light' },
  { id: 'perk:icon-pack',     cost: 300, icon: 'face',           nameKey: 'shop.perk.icons',    descKey: 'shop.perk.iconsDesc',    swatches: ['#f5f3ff','#ede9fe','#7c3aed'], mode: 'light' },
  { id: 'perk:widget-unlock', cost: 400, icon: 'widgets',        nameKey: 'shop.perk.widgets',  descKey: 'shop.perk.widgetsDesc',  swatches: ['#ecfdf5','#d1fae5','#059669'], mode: 'light' },
  { id: 'perk:zakat-pro',     cost: 600, icon: 'mosque',         nameKey: 'shop.perk.zakatPro', descKey: 'shop.perk.zakatProDesc', swatches: ['#f0fdf4','#dcfce7','#16a34a'], mode: 'light' },
  { id: 'perk:turbo-scanner', cost: 800, icon: 'linked_camera',  nameKey: 'shop.perk.turboScanner', descKey: 'shop.perk.turboScannerDesc', swatches: ['#f0fdfa','#ccfbf1','#0d9488'], mode: 'light' },
];

export type ShopItem = ThemeItem | (typeof PERK_ITEMS)[number];

const UTIL_ITEMS = [
  { id: 'item:streak-shield', cost: 200, icon: 'shield',         nameKey: 'shop.item.shield',   descKey: 'shop.item.shieldDesc',   swatches: ['#eff6ff','#dbeafe','#3b82f6'] as [string, string, string], mode: 'light' as const },
];

export function Shop() {
  const { t } = useI18n();
  const { points, streak: _streak, shields, unlocked, isLoading, spendPoints } = useLoyalty();
  const { setDarkPalette, setLightPalette, setTheme } = useSettingsStore(
    useShallow((s) => ({
      setDarkPalette: s.setDarkPalette,
      setLightPalette: s.setLightPalette,
      setTheme: s.setTheme
    }))
  );
  const setPreviewActive = useAppStore((s) => s.setPreviewActive);

  // Reset preview on unmount
  useEffect(() => {
    return () => {
      setPreviewActive(false);
      document.documentElement.removeAttribute('data-preview-active');
    };
  }, [setPreviewActive]);

  const handlePreview = (item: ThemeItem) => {
    const palette = item.id.split(':')[1];
    const isDark = DARK_IDS.includes(palette);
    const html = document.documentElement;

    setPreviewActive(true);

    if (isDark) {
      html.classList.add('dark');
      html.setAttribute('data-palette', palette);
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-light-palette', palette);
    }

    html.setAttribute('data-preview-active', 'true');
    toast(t('shop.toast.preview') || 'Preview mode active', 'info');
  };

  const resetPreview = () => {
    setPreviewActive(false);
    document.documentElement.removeAttribute('data-preview-active');
    // ThemeManager will handle the rest as it listens to store changes
  };

  const applyTheme = async (item: ThemeItem) => {
    const paletteId = item.id.split(':')[1];
    const isDark = DARK_IDS.includes(paletteId);

    if (isDark) {
      setTheme('dark');
      setDarkPalette(paletteId);
      await Promise.all([
        DB.setSetting('theme', 'dark'),
        DB.setSetting('darkPalette', paletteId)
      ]);
    } else {
      setTheme('light');
      setLightPalette(paletteId);
      await Promise.all([
        DB.setSetting('theme', 'light'),
        DB.setSetting('lightPalette', paletteId)
      ]);
    }
    resetPreview();
    toast(t('shop.toast.purchased') || t('common.saved') || 'Applied successfully', 'success');
  };

  const handleBuy = async (item: ShopItem) => {
    if (unlocked.includes(item.id)) {
      return applyTheme(item as ThemeItem);
    }

    const success = await spendPoints(item.cost, item.id);
    if (success) {
      celebrate(() => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }));
      if (item.id.startsWith('palette:')) {
        await applyTheme(item as ThemeItem);
      }
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading')}
    </div>
  );

  const renderCard = (item: ThemeItem) => {
    const isUnlocked = unlocked.includes(item.id);
    const isPalette = item.id.startsWith('palette:');
    const isPremium = item.premium;
    const [c1, c2, c3] = item.swatches || ['#f1f5f9','#e2e8f0','#94a3b8'];

    const cardStyle = isPremium
      ? { border: `1px solid ${c3}44`, boxShadow: `0 4px 24px ${c3}22` }
      : {};

    const iconColor = item.mode === 'dark' ? c3 : (c3 || '#6366f1');

    return (
      <div key={item.id} className="group relative rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-2xl bg-white dark:bg-[#1e2124] border border-slate-100 dark:border-slate-800" style={cardStyle}>
        {/* Accent bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3})` }}></div>

        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon + Swatches */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                <span className="material-symbols-outlined text-3xl font-variation-fill" style={{ color: iconColor }}>{item.icon}</span>
              </div>
              <div className="flex gap-1">
                {item.swatches.map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full border border-white/30 shadow-sm" style={{ background: c }}></div>
                ))}
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight">{t(item.nameKey)}</h3>
                {isPremium && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: `${c3}22`, color: c3 }}>✦ PREMIUM</span>}
                {isUnlocked && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">✓ {t('shop.owned') || 'Owned'}</span>}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{t(item.descKey)}</p>
            </div>
          </div>

          {/* Actions */}

      {/* Utilities */}
          <div className="mt-4">
            {!isUnlocked ? (
              <div className="flex gap-2">
                {isPalette && (
                  <button 
                    onClick={() => handlePreview(item)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121214] text-slate-600 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span> {t('shop.preview')}
                  </button>
                )}
                <button 
                  onClick={() => handleBuy(item)}
                  className="flex-[2] py-2.5 rounded-xl text-white font-black text-sm active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${c2}, ${c3})` }}
                >
                  <span className="material-symbols-outlined text-sm">shopping_cart</span>
                  {item.cost} 🪙
                </button>
              </div>
            ) : (
              <button 
                onClick={() => isPalette && applyTheme(item)}
                className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 border transition-all ${isPalette ? 'active:scale-95' : 'cursor-default'}`}
                style={{ background: `${c3}18`, color: c3, borderColor: `${c3}40` }}
              >
                <span className="material-symbols-outlined text-sm">{isPalette ? 'check_circle' : 'verified'}</span> 
                {isPalette ? (t('shop.apply') || 'Apply Theme') : (t('shop.active') || 'Active')}
              </button>
            )}
          </div>
        </div>

        {/* Decorative glow */}
        <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 blur-2xl transition-opacity pointer-events-none" style={{ background: c3 }}></div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in duration-500 bg-[#f8f9fa] dark:bg-[#121214] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          {t('page.shop')}
        </h2>
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded-2xl flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
            <span className="text-lg">🪙</span>
            <span className="font-black text-amber-700 dark:text-amber-400 tabular-nums text-sm">{points}</span>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-2xl flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">shield</span>
            <span className="font-black text-blue-700 dark:text-blue-400 tabular-nums text-sm">{shields}</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-white dark:bg-[#1c1f23] p-4 rounded-3xl flex items-start gap-3 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-slate-500 text-sm">info</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
          {t('shop.desc')}<br/><br/>
          <b className="text-amber-600 dark:text-amber-400">💡 {t('shop.item.shieldHint')}</b>
        </p>
      </div>

      {/* Light Themes Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-500 text-xl font-variation-fill">light_mode</span>
          </div>
          <h3 className="font-black text-slate-800 dark:text-white text-lg">{t('shop.lightThemes') || 'Light Themes'}</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {LIGHT_THEMES.map(renderCard)}
        </div>
      </div>

      {/* Dark Themes Section */}
      <div className="space-y-4">
        <h3 className="px-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">dark_mode</span>
          {t('shop.section.dark') || 'Dark & Premium Themes'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DARK_THEMES.map(renderCard)}
        </div>
      </div>

      {/* Intelligence & Perks */}
      <div className="space-y-4">
        <h3 className="px-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">psychology</span>
          {t('shop.section.perks') || 'Intelligence & Features'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERK_ITEMS.map(renderCard)}
        </div>
      </div>

      {/* Utility Items Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-500 text-xl font-variation-fill">category</span>
          </div>
          <h3 className="font-black text-slate-800 dark:text-white text-lg">{t('shop.utils') || 'Utilities'}</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {UTIL_ITEMS.map(item => {
            const [c1, c2, c3] = item.swatches;
            return (
              <div key={item.id} className="relative rounded-[2rem] overflow-hidden bg-white dark:bg-[#1e2124] border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl shadow-sm">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3})` }}></div>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                    <span className="material-symbols-outlined text-3xl font-variation-fill" style={{ color: c3 }}>{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-slate-800 dark:text-white text-sm">{t(item.nameKey)}</h3>
                      {item.id.includes('shield') && shields > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          {t('shop.owned')}: {shields}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{t(item.descKey)}</p>
                    <button 
                      onClick={() => handleBuy(item)}
                      className="mt-3 w-full py-2.5 rounded-xl text-white font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${c2}, ${c3})` }}
                    >
                      <span className="material-symbols-outlined text-sm">add_shopping_cart</span> {item.cost} 🪙
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Preview Banner */}
      <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 text-center shadow-sm">
        <p className="text-xs text-amber-800 dark:text-amber-400 font-bold mb-4">{t('shop.previewWarn')}</p>
        <button 
          onClick={resetPreview}
          className="px-8 py-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-black text-xs active:scale-95 transition-all shadow-sm border border-amber-200 dark:border-amber-700"
        >
          {t('shop.resetTheme')}
        </button>
      </div>
    </div>
  );
}
