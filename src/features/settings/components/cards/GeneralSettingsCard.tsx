import React from 'react';
import { useI18n } from '../../../../i18n/index';
import { LANGUAGE_META, formatCurrencyName } from '../../../../i18n/engine';
import { CURRENCIES } from '../../../../core/currency';
import { parseNum, sanitizeNumericInput } from '../../../../core/utils';

interface GeneralSettingsCardProps {
  settings: Record<string, unknown>;
  updateSetting: (key: string, value: unknown) => void;
}

// ─── Reusable Row: Icon + Label + Control ──────────────────────────────────
function Row({
  icon,
  iconColor,
  label,
  sublabel,
  children,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 active:scale-[0.99]">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${iconColor}`}>
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sublabel}</p>}
        </div>
      </div>
      <div className="shrink-0 ms-2">{children}</div>
    </div>
  );
}

// ─── Shared Select Style ───────────────────────────────────────────────────
const selectCls =
  'bg-transparent text-[11px] font-black text-blue-600 dark:text-blue-400 outline-none appearance-none cursor-pointer max-w-[130px] text-end leading-tight hover:text-blue-700 dark:hover:text-blue-300 transition-colors';

// ─── Chip Toggle Group ─────────────────────────────────────────────────────
function ChipGroup<T extends string,>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-xl gap-0.5 border border-black/[0.01] dark:border-white/[0.01]">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all active:scale-95 ${
            value === opt.value
              ? 'bg-white dark:bg-[#1f2226] text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────
function Toggle({
  value,
  onChange,
  color = 'bg-blue-600',
  isLTR,
}: {
  value: boolean;
  onChange: () => void;
  color?: string;
  isLTR?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={value}
      className={`w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 active:scale-95 ${value ? color : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
          value ? (isLTR ? 'translate-x-5' : '-translate-x-5') : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── Section Group ─────────────────────────────────────────────────────────
function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
        {title}
      </p>
      <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] divide-y divide-slate-100/70 dark:divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

export function GeneralSettingsCard({ settings, updateSetting }: GeneralSettingsCardProps) {
  const { t, isLTR } = useI18n();
  const [showCalc, setShowCalc] = React.useState(false);
  const [salary, setSalary] = React.useState('');
  const [workHours, setWorkHours] = React.useState('8');
  const [daysPerWeek, setDaysPerWeek] = React.useState('5');

  const savedLang = String(settings.language || 'ar');
  const currentTheme = String(settings.theme || 'auto');
  const darkPalette = String(settings.darkPalette || 'black');
  const lightPalette = String(settings.lightPalette || 'default');
  const currencyDisplayMode = String(settings.currencyDisplayMode || 'symbol');
  const numberSystem = String(settings.numberSystem || 'latn');
  const decimalPlaces = Number(settings.decimalPlaces ?? 2);
  const numberSeparator = String(settings.numberSeparator || 'comma_dot');
  const firstDayOfMonth = Number(settings.firstDayOfMonth || 1);
  const firstDayOfWeek = Number(settings.firstDayOfWeek || 0);
  const fontSize = String(settings.fontSize || 'normal');
  const baseCurrency = String(settings.baseCurrency || 'USD');

  const isDarkMode =
    currentTheme === 'dark' ||
    (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="space-y-4">

      {/* ══ Localization ════════════════════════════════════════════════════ */}
      <SectionGroup title={t('settings.sectionGeneral') || 'عام'}>
        {/* Language */}
        <Row icon="language" iconColor="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400" label={t('settings.language')}>
          <select
            value={savedLang}
            onChange={(e) => updateSetting('language', e.target.value)}
            className={selectCls}
          >
            {Object.entries(LANGUAGE_META).map(([code, meta]) => (
              <option key={code} value={code} className="dark:bg-[#1a1d21] text-black dark:text-white">
                {meta.flag} {meta.name}
              </option>
            ))}
          </select>
        </Row>

        {/* Theme */}
        <Row icon="contrast" iconColor="bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-500" label={t('settings.theme')}>
          <ChipGroup
            value={currentTheme as 'auto' | 'light' | 'dark'}
            options={[
              { label: '☀️', value: 'light' as const },
              { label: '🌙', value: 'dark' as const },
              { label: '⚡', value: 'auto' as const },
            ]}
            onChange={(v) => updateSetting('theme', v)}
          />
        </Row>

        {/* Color Palette */}
        <Row icon="palette" iconColor="bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400" label={t('settings.palette') || 'لوحة الألوان'}>
          {isDarkMode ? (
            <select value={darkPalette} onChange={(e) => updateSetting('darkPalette', e.target.value)} className={selectCls}>
              <option value="dim" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.paletteDim') || 'Dim'}</option>
              <option value="midnight" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.paletteMidnight') || 'Midnight'}</option>
              <option value="oled" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.paletteOled') || 'Pure Black'}</option>
              <option value="vantablack" className="dark:bg-[#1a1d21] text-black dark:text-white">⬛ {t('settings.paletteVantablack') || 'Vantablack'}</option>
              <option value="royal-gold" className="dark:bg-[#1a1d21] text-black dark:text-white">👑 {t('settings.paletteGold') || 'Royal Gold'}</option>
              <option value="neon" className="dark:bg-[#1a1d21] text-black dark:text-white">🔵 {t('settings.paletteNeon') || 'Neon Night'}</option>
              <option value="aurora" className="dark:bg-[#1a1d21] text-black dark:text-white">🌌 {t('settings.paletteAurora') || 'Aurora'}</option>
              <option value="crimson" className="dark:bg-[#1a1d21] text-black dark:text-white">🔴 {t('settings.paletteCrimson') || 'Crimson'}</option>
              <option value="forest" className="dark:bg-[#1a1d21] text-black dark:text-white">🌿 {t('settings.paletteForest') || 'Forest'}</option>
            </select>
          ) : (
            <select value={lightPalette} onChange={(e) => updateSetting('lightPalette', e.target.value)} className={selectCls}>
              <option value="default" className="text-black">{t('settings.paletteDefault') || 'Standard'}</option>
              <option value="soft" className="text-black">{t('settings.paletteSoft') || 'Soft Ivory'}</option>
              <option value="cool" className="text-black">{t('settings.paletteCool') || 'Cool Slate'}</option>
              <option value="sepia" className="text-black">{t('settings.paletteSepia') || 'Sepia'}</option>
              <option value="nature" className="text-black">🌿 {t('settings.paletteNature') || 'Nature'}</option>
              <option value="rose" className="text-black">🌹 {t('settings.paletteRose') || 'Rose'}</option>
              <option value="lavender" className="text-black">💜 {t('settings.paletteLavender') || 'Lavender'}</option>
              <option value="sage" className="text-black">🌱 {t('settings.paletteSage') || 'Sage'}</option>
            </select>
          )}
        </Row>
      </SectionGroup>

      {/* ══ Currency & Formatting ═══════════════════════════════════════════ */}
      <SectionGroup title={t('settings.sectionNumbers') || 'العملة والأرقام'}>
        {/* Base Currency */}
        <Row icon="payments" iconColor="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400" label={t('settings.currency')}>
          <select
            value={baseCurrency}
            onChange={(e) => updateSetting('baseCurrency', e.target.value)}
            className={`${selectCls} max-w-[150px]`}
          >
            {Object.entries(CURRENCIES).map(([code, meta]) => (
              <option key={code} value={code} className="dark:bg-[#1a1d21] text-black dark:text-white">
                {meta.flag} {code} — {formatCurrencyName(code)}
              </option>
            ))}
          </select>
        </Row>

        {/* Currency Display */}
        <Row icon="style" iconColor="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 text-amber-600 dark:text-amber-400" label={t('settings.currencyDisplay')}>
          <select
            value={currencyDisplayMode}
            onChange={(e) => updateSetting('currencyDisplayMode', e.target.value)}
            className={selectCls}
          >
            <option value="symbol" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.currencyDisplaySymbol')}</option>
            <option value="code" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.currencyDisplayCode')}</option>
            <option value="nameAr" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.currencyDisplayAr')}</option>
            <option value="nameEn" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.currencyDisplayEn')}</option>
            <option value="local" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('settings.currencyDisplayLocal')}</option>
          </select>
        </Row>

        {/* Number System */}
        <Row icon="123" iconColor="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400" label={t('settings.numbers')}>
          <ChipGroup
            value={numberSystem as 'latn' | 'arab'}
            options={[
              { label: '123', value: 'latn' },
              { label: '١٢٣', value: 'arab' },
            ]}
            onChange={(v) => updateSetting('numberSystem', v)}
          />
        </Row>

        {/* Decimal Places */}
        <Row icon="decimal_increase" iconColor="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-600 dark:text-indigo-400" label={t('settings.decimals')}>
          <ChipGroup
            value={decimalPlaces.toString() as '0' | '1' | '2'}
            options={[
              { label: '0', value: '0' },
              { label: '0.0', value: '1' },
              { label: '0.00', value: '2' },
            ]}
            onChange={(v) => updateSetting('decimalPlaces', parseInt(v))}
          />
        </Row>

        {/* Number Separator */}
        <Row icon="text_format" iconColor="bg-gradient-to-br from-slate-500/10 to-zinc-500/10 text-slate-600 dark:text-slate-400" label={t('settings.separator')}>
          <select
            value={numberSeparator}
            onChange={(e) => updateSetting('numberSeparator', e.target.value)}
            className={selectCls}
          >
            <option value="comma_dot" className="dark:bg-[#1a1d21] text-black dark:text-white">1,000.00</option>
            <option value="dot_comma" className="dark:bg-[#1a1d21] text-black dark:text-white">1.000,00</option>
            <option value="space_comma" className="dark:bg-[#1a1d21] text-black dark:text-white">1 000,00</option>
            <option value="space_dot" className="dark:bg-[#1a1d21] text-black dark:text-white">1 000.00</option>
            <option value="none" className="dark:bg-[#1a1d21] text-black dark:text-white">1000.00</option>
          </select>
        </Row>
      </SectionGroup>

      {/* ══ Calendar ════════════════════════════════════════════════════════ */}
      <SectionGroup title={t('settings.sectionCalendar') || 'التقويم'}>
        {/* Start of Month */}
        <Row icon="calendar_month" iconColor="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 text-teal-600 dark:text-teal-400" label={t('settings.startOfMonth')}>
          <select
            value={firstDayOfMonth.toString()}
            onChange={(e) => updateSetting('firstDayOfMonth', parseInt(e.target.value))}
            className={selectCls}
          >
            {[...Array(28).keys()].map((i) => (
              <option key={i + 1} value={(i + 1).toString()} className="dark:bg-[#1a1d21] text-black dark:text-white">
                {i + 1}
              </option>
            ))}
          </select>
        </Row>

        {/* First Day of Week */}
        <Row icon="calendar_view_week" iconColor="bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400" label={t('settings.firstDayOfWeek')}>
          <select
            value={firstDayOfWeek.toString()}
            onChange={(e) => updateSetting('firstDayOfWeek', parseInt(e.target.value))}
            className={selectCls}
          >
            <option value="0" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('misc.day.0') || 'الأحد'}</option>
            <option value="1" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('misc.day.1') || 'الإثنين'}</option>
            <option value="2" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('misc.day.2') || 'الثلاثاء'}</option>
            <option value="3" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('misc.day.3') || 'الأربعاء'}</option>
            <option value="4" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('misc.day.4') || 'الخميس'}</option>
            <option value="5" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('misc.day.5') || 'الجمعة'}</option>
            <option value="6" className="dark:bg-[#1a1d21] text-black dark:text-white">{t('misc.day.6') || 'السبت'}</option>
          </select>
        </Row>
      </SectionGroup>

      {/* ══ Appearance ══════════════════════════════════════════════════════ */}
      <SectionGroup title={t('settings.sectionAppearance') || 'المظهر'}>
        {/* Font Size */}
        <Row icon="format_size" iconColor="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-500" label={t('settings.fontSize')}>
          <div className="flex bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-xl gap-0.5 border border-black/[0.01] dark:border-white/[0.01]">
            {[
              { val: 'small', label: 'A', cls: 'text-[9px]' },
              { val: 'normal', label: 'A', cls: 'text-[11px]' },
              { val: 'large', label: 'A', cls: 'text-[13px]' },
              { val: 'xl', label: 'A', cls: 'text-[16px]' },
            ].map(({ val, label, cls }) => (
              <button
                key={val}
                onClick={() => updateSetting('fontSize', val)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all active:scale-95 ${cls} ${
                  fontSize === val
                    ? 'bg-white dark:bg-[#1f2226] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </SectionGroup>

      {/* ══ Productivity ════════════════════════════════════════════════════ */}
      <SectionGroup title={t('settings.sectionProductivity') || 'الإنتاجية'}>
        {/* Shake to Blur */}
        <Row
          icon="visibility_off"
          iconColor="bg-gradient-to-br from-rose-500/10 to-red-500/10 text-rose-500"
          label={t('settings.shakeToBlur')}
          sublabel={t('settings.shakeToBlurSub')}
        >
          <Toggle
            value={settings.shakeToBlur !== false}
            onChange={() => updateSetting('shakeToBlur', settings.shakeToBlur === false ? true : !settings.shakeToBlur)}
            isLTR={isLTR}
          />
        </Row>

        {/* Simple Mode */}
        <Row
          icon="toggle_off"
          iconColor="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 dark:text-indigo-400"
          label={t('settings.simpleMode')}
          sublabel={t('settings.simpleModeDesc')}
        >
          <Toggle
            value={!!settings.isSimpleMode}
            onChange={async () => {
              const current = Boolean(settings.isSimpleMode);
              await updateSetting('isSimpleMode', !current);
              const { useSettingsStore } = await import('../../../../store/settingsStore');
              useSettingsStore.getState().setIsSimpleMode(!current);
            }}
            isLTR={isLTR}
          />
        </Row>

        {/* Hourly Rate */}
        <div className={`transition-all duration-300 ${settings.isWorkHoursEnabled ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''}`}>
          <div className="flex items-center justify-between px-4 py-3.5 gap-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 active:scale-[0.99]">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm ${settings.isWorkHoursEnabled ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25' : 'bg-gradient-to-br from-slate-500/10 to-zinc-500/10 text-slate-500'}`}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight">{t('settings.hourlyRatePh')}</p>
                <button
                  onClick={() => updateSetting('isWorkHoursEnabled', !settings.isWorkHoursEnabled)}
                  className={`mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    settings.isWorkHoursEnabled ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {settings.isWorkHoursEnabled ? t('common.enabled') : t('common.disabled')}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowCalc(!showCalc)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0 ${
                showCalc ? 'bg-blue-600 text-white shadow-md' : 'bg-black/[0.03] dark:bg-white/[0.03] text-slate-400 border border-black/[0.01] dark:border-white/[0.01]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
            </button>
          </div>

          {Boolean(settings.isWorkHoursEnabled) && (
            <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between bg-white/50 dark:bg-black/20 px-4 py-3 rounded-2xl border border-black/[0.03] dark:border-white/[0.03] backdrop-blur-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings.hourlyRatePh')}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    autoComplete="off"
                    value={String(settings.hourlyRate || '')}
                    onChange={(e) => updateSetting('hourlyRate', parseNum(sanitizeNumericInput(e.target.value)) || 0)}
                    onCompositionEnd={(e) => updateSetting('hourlyRate', parseNum(sanitizeNumericInput((e.target as HTMLInputElement).value)) || 0)}
                    onBlur={(e) => updateSetting('hourlyRate', parseNum(sanitizeNumericInput(e.target.value)) || 0)}
                    placeholder="0.00"
                    className="bg-transparent text-right font-black text-blue-600 dark:text-blue-400 outline-none w-20 text-sm"
                  />
                  <span className="text-[10px] font-black text-slate-300">{String(settings.baseCurrency || '')}</span>
                </div>
              </div>

              {showCalc && (
                <div className="bg-white/40 dark:bg-white/[0.01] backdrop-blur-md rounded-2xl p-4 space-y-3 border border-blue-100/30 dark:border-blue-900/10 shadow-[0_4px_16px_rgba(0,0,0,0.02)] animate-in fade-in duration-300">
                  <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    {t('settings.hourlyRateCalc')}
                  </h4>
                  {[
                    { label: t('settings.monthlySalary'), val: salary, set: setSalary, ph: '0.00', field: 'salary' },
                    { label: t('settings.daysPerWeek'), val: daysPerWeek, set: setDaysPerWeek, ph: '5', field: 'days' },
                    { label: t('settings.dailyHours'), val: workHours, set: setWorkHours, ph: '8', field: 'hours' },
                  ].map(({ label, val, set, ph, field }) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">{label}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        autoComplete="off"
                        value={val}
                        onChange={(e) => {
                          const sanitized = sanitizeNumericInput(e.target.value);
                          set(sanitized);
                          const s = field === 'salary' ? parseNum(sanitized) || 0 : parseNum(salary) || 0;
                          const d = field === 'days' ? parseNum(sanitized) || 1 : parseNum(daysPerWeek) || 1;
                          const h = field === 'hours' ? parseNum(sanitized) || 1 : parseNum(workHours) || 1;
                          updateSetting('hourlyRate', parseFloat((s / (4.33 * d * h)).toFixed(2)));
                        }}
                        onCompositionEnd={(e) => {
                          const sanitized = sanitizeNumericInput((e.target as HTMLInputElement).value);
                          set(sanitized);
                          const s = field === 'salary' ? parseNum(sanitized) || 0 : parseNum(salary) || 0;
                          const d = field === 'days' ? parseNum(sanitized) || 1 : parseNum(daysPerWeek) || 1;
                          const h = field === 'hours' ? parseNum(sanitized) || 1 : parseNum(workHours) || 1;
                          updateSetting('hourlyRate', parseFloat((s / (4.33 * d * h)).toFixed(2)));
                        }}
                        className="bg-black/[0.02] dark:bg-white/[0.02] px-3 py-1.5 rounded-xl text-xs font-bold w-20 text-right outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                        placeholder={ph}
                      />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100/50 dark:border-slate-700/30 flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{t('settings.calcResult', { rate: '' })}</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {String(settings.hourlyRate || '0.00')} <span className="text-[10px] opacity-60">{String(settings.baseCurrency || '')}</span>
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium italic">
                    {savedLang === 'ar' ? '* بناءً على 4.33 أسبوع في الشهر.' : '* Based on 4.33 weeks per month.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <details className="group">
          <summary className="list-none flex items-center justify-between px-4 py-3.5 cursor-pointer select-none hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 active:scale-[0.99]">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 text-sky-500 flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
              </div>
              <p className="text-[13px] font-bold text-on-surface dark:text-white">{t('settings.notifications')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px] transition-transform duration-300 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="px-4 pb-4 space-y-1 bg-black/[0.01] dark:bg-white/[0.005] border-t border-black/[0.01] dark:border-white/[0.01] animate-in fade-in duration-300">
            {[
              { key: 'bills', label: t('bill.bills') },
              { key: 'budgets', label: t('budget.title') },
              { key: 'goals', label: t('goal.title') },
              { key: 'subs', label: t('bill.subs') },
              { key: 'debts', label: t('debt.title') },
              { key: 'recurring', label: t('page.recurring') },
              { key: 'spending', label: t('home.expense') },
            ].map((p) => {
              const notifPrefs = (settings.notifPrefs as Record<string, boolean> | undefined) || { bills: true, budgets: true, goals: true, subs: true, debts: true, recurring: true, spending: true };
              const on = notifPrefs[p.key] !== false;
              return (
                <div key={p.key} className="flex items-center justify-between py-2 border-b border-slate-100/70 dark:border-white/[0.04] last:border-0 hover:bg-black/[0.005] dark:hover:bg-white/[0.005] transition-all">
                  <span className={`text-[12px] font-bold ${on ? 'text-on-surface dark:text-slate-200' : 'text-slate-400'}`}>{p.label}</span>
                  <Toggle
                    value={on}
                    onChange={() => updateSetting('notifPrefs', { ...notifPrefs, [p.key]: !on })}
                    isLTR={isLTR}
                  />
                </div>
              );
            })}
          </div>
        </details>
      </SectionGroup>
    </div>
  );
}
