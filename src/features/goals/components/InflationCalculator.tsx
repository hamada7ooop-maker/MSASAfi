import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { toast } from '../../../toast';
import { checkMilestone } from '../../../core/loyalty';
import { silentFail, parseNum, sanitizeNumericInput } from '../../../core/utils';

interface InflationCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', defaultRate: 2.1 },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', defaultRate: 2.5 },
  { code: 'QA', name: 'Qatar', nameAr: 'دولة قطر', defaultRate: 2.8 },
  { code: 'KW', name: 'Kuwait', nameAr: 'دولة الكويت', defaultRate: 3.2 },
  { code: 'OM', name: 'Oman', nameAr: 'سلطنة عمان', defaultRate: 1.8 },
  { code: 'BH', name: 'Bahrain', nameAr: 'مملكة البحرين', defaultRate: 1.5 },
  { code: 'JO', name: 'Jordan', nameAr: 'المملكة الأردنية الهاشمية', defaultRate: 2.5 },
  { code: 'MA', name: 'Morocco', nameAr: 'المملكة المغربية', defaultRate: 4.5 },
  { code: 'EG', name: 'Egypt', nameAr: 'جمهورية مصر العربية', defaultRate: 15.8 },
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة الأمريكية', defaultRate: 3.1 },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', defaultRate: 3.4 },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', defaultRate: 2.9 },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', defaultRate: 2.5 },
  { code: 'TR', name: 'Turkey', nameAr: 'الجمهورية التركية', defaultRate: 52.4 },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', defaultRate: 2.0 },
  { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', defaultRate: 3.0 },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', defaultRate: 1.2 }
];

export function InflationCalculator({ isOpen, onClose }: InflationCalculatorProps) {
  const { t, isLTR } = useI18n();
  const [savingsTargetStr, setSavingsTargetStr] = useState('10000');
  const [years, setYears] = useState(5);
  const [countryCode, setCountryCode] = useState('SA');
  const [inflationRateStr, setInflationRateStr] = useState('2.1');
  const [loading, setLoading] = useState(false);
  const [selectedYearIndex, setSelectedYearIndex] = useState<number | null>(null);

  // Fetch inflation from World Bank API
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    const fetchInflation = async () => {
      setLoading(true);
      try {
        // World Bank API URL for CPI inflation: FP.CPI.TOTL.ZG
        const res = await fetch(`https://api.worldbank.org/v2/country/${countryCode}/indicator/FP.CPI.TOTL.ZG?format=json&date=2023`, {
          signal: controller.signal
        });
        if (!res.ok) throw new Error('API response error');
        const data = await res.json();
        
        if (!controller.signal.aborted) {
          const rate = data?.[1]?.[0]?.value;
          if (rate !== undefined && rate !== null) {
            const roundedRate = Math.round(rate * 10) / 10;
            setInflationRateStr(String(roundedRate));
            toast(t('goal.inflation.fetched') || 'تم تحديث معدل التضخم الحقيقي من البنك الدولي! 📈', 'success');
            
            // Award Loyalty Points for fetching real inflation data
            checkMilestone('FIRST_INFLATION');
          } else {
            // Fallback to defaults
            const fallback = COUNTRIES.find(c => c.code === countryCode)?.defaultRate || 3.0;
            setInflationRateStr(String(fallback));
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        silentFail('[WorldBank API] Failed to fetch inflation')(err);
        const fallback = COUNTRIES.find(c => c.code === countryCode)?.defaultRate || 3.0;
        if (!controller.signal.aborted) {
          setInflationRateStr(String(fallback));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchInflation();
    return () => {
      controller.abort();
    };
  }, [countryCode, isOpen, t]);

  if (!isOpen) return null;

  const savingsTarget = Math.max(1, parseNum(savingsTargetStr) || 1);
  const inflationRate = parseNum(inflationRateStr) || 0;

  // Calculate coordinates and data points
  const points: { year: number; nominal: number; realTarget: number }[] = [];
  for (let i = 0; i <= years; i++) {
    const nominal = savingsTarget;
    const realTarget = savingsTarget * Math.pow(1 + inflationRate / 100, i);
    points.push({ year: i, nominal, realTarget });
  }

  const finalRealTarget = points[points.length - 1].realTarget;

  // SVG dimensions
  const width = 500;
  const height = 220;
  const paddingX = 40;
  const paddingY = 25;

  const minVal = savingsTarget * 0.9;
  const maxVal = finalRealTarget * 1.1;

  const getX = (index: number) => paddingX + (index / years) * (width - 2 * paddingX);
  const getY = (val: number) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);

  // SVG Paths
  let nominalPath = '';
  let realPath = '';

  points.forEach((p, idx) => {
    const x = getX(idx);
    const yNominal = getY(p.nominal);
    const yReal = getY(p.realTarget);

    if (idx === 0) {
      nominalPath = `M ${x} ${yNominal}`;
      realPath = `M ${x} ${yReal}`;
    } else {
      nominalPath += ` L ${x} ${yNominal}`;
      realPath += ` L ${x} ${yReal}`;
    }
  });

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-all duration-300"
      ></div>

      {/* Main Glass Modal Card */}
      <div className="relative w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.25rem] border border-white/40 dark:border-white/5 shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-300">
        
        {/* Glowing Decorative Blob */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex justify-between items-center relative z-10">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-[#002b59] dark:text-blue-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500">trending_up</span>
              {t('goal.inflation.title') || 'حاسبة الادخار وتأثير التضخم'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {t('goal.inflation.subtitle') || 'قياس القيمة الشرائية المستقبلية لأهدافك'}
            </p>
          </div>
          <button aria-label={t('action.close') || 'Close'} 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Dynamic Calculator Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
          {/* Target Amount */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
              {t('goal.inflation.target') || 'مبلغ الادخار المستهدف'}
            </label>
            <input 
              type="text" 
              inputMode="decimal"
              dir="ltr"
              value={savingsTargetStr} 
              onChange={(e) => setSavingsTargetStr(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={(e) => setSavingsTargetStr(sanitizeNumericInput(e.currentTarget.value))}
              onBlur={(e) => setSavingsTargetStr(sanitizeNumericInput(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 text-xs text-on-surface dark:text-white font-bold outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Years Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between px-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <span>{t('goal.inflation.years') || 'مدة الادخار (سنوات)'}</span>
              <span className="text-indigo-500">{years} {t('time.years') || 'سنوات'}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={years} 
              onChange={(e) => {
                setYears(parseInt(e.target.value));
                setSelectedYearIndex(null);
              }}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 rounded-lg bg-slate-200 dark:bg-slate-700"
            />
          </div>

          {/* Country Selection (World Bank Integration) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
              {t('goal.inflation.country') || 'الدولة المرجعية للبنك الدولي'}
            </label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 text-xs text-on-surface dark:text-white font-bold outline-none focus:border-indigo-500 transition-all"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                  {isLTR ? c.name : c.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Manual / Fetched Rate Adjustment */}
          <div className="space-y-1.5">
            <div className="flex justify-between px-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <span>{t('goal.inflation.rate') || 'معدل التضخم السنوي'}</span>
              {loading && <span className="text-[9px] text-indigo-500 animate-pulse">{t('goal.inflation.loading') || 'جارٍ جلب البيانات...'}</span>}
            </div>
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                inputMode="decimal"
                dir="ltr"
                value={inflationRateStr} 
                onChange={(e) => setInflationRateStr(sanitizeNumericInput(e.target.value))}
                onCompositionEnd={(e) => setInflationRateStr(sanitizeNumericInput(e.currentTarget.value))}
                onBlur={(e) => setInflationRateStr(sanitizeNumericInput(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 text-xs text-on-surface dark:text-white font-bold outline-none focus:border-indigo-500 transition-all"
              />
              <span className="text-sm font-black text-slate-500">%</span>
            </div>
          </div>
        </div>

        {/* Real-time Insights */}
        <div className="p-4 rounded-3xl bg-indigo-500/10 dark:bg-indigo-950/20 border border-indigo-500/20 dark:border-indigo-900/30 flex gap-4 items-center relative z-10">
          <span className="material-symbols-outlined text-3xl text-indigo-500">info</span>
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-[#002b59] dark:text-blue-200">
              {t('goal.inflation.insightTitle') || 'حقيقة النفقات والادخار:'}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-normal font-bold">
              {t('goal.inflation.insightText', {
                rate: String(inflationRate),
                nominal: savingsTarget.toLocaleString(),
                adjusted: Math.round(savingsTarget / Math.pow(1 + inflationRate / 100, years)).toLocaleString(),
                years: String(years),
                required: Math.round(finalRealTarget).toLocaleString()
              }) || `بسبب التضخم السنوي بمعدل ${inflationRate}%، ستنخفض القوة الشرائية لمدخراتك الاسمية البالغة ${savingsTarget.toLocaleString()} إلى ${Math.round(savingsTarget / Math.pow(1 + inflationRate / 100, years)).toLocaleString()} خلال ${years} سنوات. لتحقيق نفس القيمة الشرائية الفعلية، ستحتاج إلى توفير ${Math.round(finalRealTarget).toLocaleString()}.`}
            </p>
          </div>
        </div>

        {/* Interactive SVG Chart */}
        <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-white/5 p-4 space-y-2 relative z-10">
          <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
            <span>📈 {t('goal.inflation.projection') || 'المقارنة البيانية للمدخرات'}</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-slate-400 inline-block"></span> {t('goal.inflation.nominal') || 'الاسمي'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-indigo-500 inline-block"></span> {t('goal.inflation.adjusted') || 'المعدل'}
              </span>
            </div>
          </div>

          <div className="relative w-full h-[220px] flex items-center justify-center">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
              <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />

              {/* Nominal Line (Flat Target) */}
              <path d={nominalPath} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="4" opacity="0.8" />
              
              {/* Real Inflation-Adjusted Target Line */}
              <path d={realPath} fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" className="drop-shadow-lg shadow-indigo-500/50" />

              {/* Interactive Interaction Area & Dots */}
              {points.map((p, idx) => {
                const x = getX(idx);
                const yNominal = getY(p.nominal);
                const yReal = getY(p.realTarget);
                const isSelected = selectedYearIndex === idx;

                return (
                  <g key={idx} className="cursor-pointer" onClick={() => setSelectedYearIndex(idx)}>
                    {/* Hover vertical bar */}
                    {isSelected && (
                      <line x1={x} y1={paddingY} x2={x} y2={height - paddingY} stroke="#6366f1" strokeWidth="1" strokeDasharray="2" />
                    )}

                    {/* Nominal Dot */}
                    <circle cx={x} cy={yNominal} r={isSelected ? 5 : 3.5} fill="#94a3b8" stroke="white" strokeWidth="1" />

                    {/* Real Target Dot */}
                    <circle cx={x} cy={yReal} r={isSelected ? 6 : 4} fill="#6366f1" stroke="white" strokeWidth="1.5" className="transition-all" />

                    {/* X-Axis labels */}
                    {idx % Math.max(1, Math.round(years / 5)) === 0 && (
                      <text x={x} y={height - 8} textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-black">
                        {t('time.year') || 'سنة'} {idx}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Data Tooltip Popover */}
            {selectedYearIndex !== null && (
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-indigo-500/20 shadow-xl text-center space-y-1 animate-in zoom-in-95 duration-200 pointer-events-none"
              >
                <p className="text-[9px] font-black text-slate-400">{t('time.year') || 'السنة'} {selectedYearIndex}</p>
                <div className="flex gap-4">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 block">{t('goal.inflation.nominal') || 'الاسمي'}</span>
                    <span className="text-xs font-black text-slate-500">{Math.round(points[selectedYearIndex].nominal).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-indigo-500 block">{t('goal.inflation.required') || 'المطلوب فعلياً'}</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{Math.round(points[selectedYearIndex].realTarget).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedYearIndex === null && (
            <p className="text-[9px] text-center text-slate-400 font-bold tracking-tight py-1 animate-pulse">
              💡 {t('goal.inflation.clickTooltip') || 'انقر على نقاط المنحنى لرؤية تفاصيل القيمة النقدية لكل سنة.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
