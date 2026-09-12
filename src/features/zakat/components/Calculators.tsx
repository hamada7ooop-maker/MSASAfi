import React, { useState } from 'react';
import { ZakatCalculator } from './ZakatCalculator';
import { VatCalculator } from './VatCalculator';
import { RuleOf72 } from './RuleOf72';
import { SimpleInterestCalc } from './SimpleInterestCalc';
import { CompoundInterestCalc } from './CompoundInterestCalc';
import { LoanCalc } from './LoanCalc';
import { InflationCalc } from './InflationCalc';
import { RetirementCalc } from './RetirementCalc';
import { TipCalc } from './TipCalc';
import { ROICalc } from './ROICalc';
import { EmergencyCalc } from './EmergencyCalc';
import { CouponCalc } from './CouponCalc';
import { useI18n } from '../../../i18n/index';

type CalcId = 'zakat' | 'vat' | 'rule72' | 'simple' | 'compound' | 'loan' | 'inflation' | 'retirement' | 'tip' | 'roi' | 'emergency' | 'coupon';

const CALCS: { id: CalcId; icon: string; labelKey: string; fallback: string; descKey: string; fallbackDesc: string; gradient: string; shadow: string }[] = [
  { id: 'zakat',      icon: 'mosque',               labelKey: 'zakat.title',                    fallback: 'حاسبة الزكاة',         descKey: 'zakat.desc', fallbackDesc: 'حساب نصاب ومقدار الزكاة', gradient: 'from-emerald-600 to-green-400', shadow: 'shadow-emerald-500/30' },
  { id: 'vat',        icon: 'receipt_long',         labelKey: 'vat.title',                      fallback: 'حاسبة الضريبة',        descKey: 'vat.desc', fallbackDesc: 'حساب ضريبة القيمة المضافة', gradient: 'from-blue-600 to-indigo-400',   shadow: 'shadow-blue-500/30' },
  { id: 'rule72',     icon: 'query_stats',           labelKey: 'rule72.title',                   fallback: 'قاعدة 72 المالية',     descKey: 'rule72.desc', fallbackDesc: 'متى سيتضاعف استثمارك؟', gradient: 'from-purple-600 to-violet-400', shadow: 'shadow-purple-500/30' },
  { id: 'simple',     icon: 'account_balance',       labelKey: 'calc.simpleInterest.title',      fallback: 'الفائدة البسيطة',      descKey: 'calc.simpleInterest.desc', fallbackDesc: 'حساب الفوائد الثابتة', gradient: 'from-green-600 to-emerald-400', shadow: 'shadow-green-500/30' },
  { id: 'compound',   icon: 'show_chart',            labelKey: 'calc.compoundInterest.title',    fallback: 'الفائدة المركبة',      descKey: 'calc.compoundInterest.desc', fallbackDesc: 'تأثير تراكم الأرباح', gradient: 'from-indigo-600 to-blue-400',   shadow: 'shadow-indigo-500/30' },
  { id: 'loan',       icon: 'home',                  labelKey: 'calc.loan.title',                fallback: 'حاسبة القرض',          descKey: 'calc.loan.desc', fallbackDesc: 'خطة سداد القروض والفوائد', gradient: 'from-rose-600 to-pink-400',     shadow: 'shadow-rose-500/30' },
  { id: 'inflation',  icon: 'local_fire_department',  labelKey: 'calc.inflation.title',           fallback: 'حاسبة التضخم',         descKey: 'calc.inflation.desc', fallbackDesc: 'تأثير التضخم على مدخراتك', gradient: 'from-orange-600 to-amber-400',  shadow: 'shadow-orange-500/30' },
  { id: 'retirement', icon: 'elderly',               labelKey: 'calc.retirement.title',          fallback: 'حاسبة التقاعد',        descKey: 'calc.retirement.desc', fallbackDesc: 'التخطيط المالي للتقاعد', gradient: 'from-cyan-600 to-teal-400',     shadow: 'shadow-cyan-500/30' },
  { id: 'roi',        icon: 'monitoring',            labelKey: 'calc.roi.title',                 fallback: 'عائد الاستثمار',       descKey: 'calc.roi.desc', fallbackDesc: 'قياس ربحية استثماراتك', gradient: 'from-violet-600 to-purple-400', shadow: 'shadow-violet-500/30' },
  { id: 'tip',        icon: 'restaurant',            labelKey: 'calc.tip.title',                 fallback: 'البقشيش والتقسيم',     descKey: 'calc.tip.desc', fallbackDesc: 'تقسيم الفاتورة على الأصدقاء', gradient: 'from-pink-600 to-rose-400',     shadow: 'shadow-pink-500/30' },
  { id: 'emergency',  icon: 'shield',                labelKey: 'calc.emergency.title',           fallback: 'صندوق الطوارئ',        descKey: 'calc.emergency.desc', fallbackDesc: 'تأمين شبكة أمانك المالي', gradient: 'from-amber-600 to-yellow-400',  shadow: 'shadow-amber-500/30' },
  { id: 'coupon',     icon: 'local_offer',           labelKey: 'calc.coupon.title',              fallback: 'حاسبة القسائم الذكية',  descKey: 'calc.coupon.desc', fallbackDesc: 'تحقيق أقصى استفادة من الكوبون', gradient: 'from-violet-600 to-fuchsia-500', shadow: 'shadow-fuchsia-500/30' },
];

export function Calculators() {
  const { t } = useI18n();
  const [active, setActive] = useState<CalcId | null>(null);

  if (active) {
    return (
      <div className="pb-32">
        <div className="px-4 pt-4">
          <button onClick={() => setActive(null)} className="flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 mb-4 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {t('action.back') || 'رجوع'}
          </button>
        </div>
        {active === 'zakat' && <ZakatCalculator />}
        {active === 'vat' && <VatCalculator />}
        {active === 'rule72' && <RuleOf72 />}
        {active === 'simple' && <SimpleInterestCalc />}
        {active === 'compound' && <CompoundInterestCalc />}
        {active === 'loan' && <LoanCalc />}
        {active === 'inflation' && <InflationCalc />}
        {active === 'retirement' && <RetirementCalc />}
        {active === 'tip' && <TipCalc />}
        {active === 'roi' && <ROICalc />}
        {active === 'emergency' && <EmergencyCalc />}
        {active === 'coupon' && <CouponCalc />}
      </div>
    );
  }

  return (
    <div className="p-5 pb-32 space-y-6 animate-in fade-in duration-700">
      <div className="px-1 space-y-1">
        <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
          {t('nav.calculators') || 'الحاسبات المالية'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
            {CALCS.length} {t('calc.toolsCount') || 'أداة مالية'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CALCS.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className="group relative bg-white dark:bg-[#1e2124] rounded-[2rem] p-5 border border-black/5 dark:border-white/5 text-center flex flex-col items-center transition-all hover:-translate-y-1 active:scale-95 overflow-hidden"
          >
            {/* Glow */}
            <div className={`absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br ${c.gradient} rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
            
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-4 shadow-xl ${c.shadow} group-hover:scale-110 transition-transform`}>
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
              {t(c.labelKey) || c.fallback}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 opacity-80 leading-snug">
              {t(c.descKey) || c.fallbackDesc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
