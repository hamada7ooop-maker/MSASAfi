import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

/** حاسبة القسائم الذكية */
export function CouponCalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  
  const [purchaseAmount, setPurchaseAmount] = useState('100');
  const [discountRate, setDiscountRate] = useState('15');
  const [maxDiscount, setMaxDiscount] = useState('50');
  const [minPurchase, setMinPurchase] = useState('100');

  const amount = parseNum(purchaseAmount) || 0;
  const rate = parseNum(discountRate) || 0;
  const maxD = parseNum(maxDiscount) || Infinity;
  const minP = parseNum(minPurchase) || 0;

  const valid = amount >= minP;
  const rawDiscount = amount * (rate / 100);
  const actualDiscount = valid ? Math.min(rawDiscount, maxD) : 0;
  const finalPrice = amount - actualDiscount;
  const effectiveRate = amount > 0 ? (actualDiscount / amount) * 100 : 0;
  
  const optimalAmount = rate > 0 ? Math.max(minP, maxD / (rate / 100)) : 0;

  const getStatus = () => {
    if (amount === 0) return null;
    
    if (!valid) {
      const needs = minP - amount;
      return { 
        text: (t('calc.coupon.insight.needsMore') || 'أضف {amount} لتتمكن من استخدام الكوبون').replace('{amount}', fmt(needs)), 
        color: 'text-orange-400', 
        bg: 'from-orange-600 to-amber-500',
        icon: 'warning'
      };
    }
    
    if (amount < optimalAmount && maxD < Infinity) {
      const needs = optimalAmount - amount;
      return { 
        text: (t('calc.coupon.insight.maximize') || 'أضف {amount} للوصول لأقصى استفادة من الكوبون').replace('{amount}', fmt(needs)), 
        color: 'text-blue-300', 
        bg: 'from-blue-600 to-sky-500',
        icon: 'trending_up'
      };
    }
    
    if (amount > optimalAmount && maxD < Infinity) {
      return { 
        text: t('calc.coupon.insight.maxedOut') || 'لقد وصلت للحد الأقصى للخصم', 
        color: 'text-slate-300', 
        bg: 'from-slate-600 to-slate-500',
        icon: 'info'
      };
    }

    return { 
      text: t('calc.coupon.insight.optimal') || 'أنت تستغل الكوبون بأفضل شكل ممكن 🌟', 
      color: 'text-green-300', 
      bg: 'from-emerald-600 to-green-500',
      icon: 'star'
    };
  };

  const status = getStatus();

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-fuchsia-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_offer</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.coupon.title') || 'حاسبة القسائم الذكية'}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.coupon.desc') || 'تعرف على الاستغلال الأمثل لأكواد الخصم'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('calc.coupon.purchaseAmount') || 'قيمة المشتريات', value: purchaseAmount, set: setPurchaseAmount, icon: 'shopping_cart' },
          { label: t('calc.coupon.discountRate') || 'نسبة الخصم (%)', value: discountRate, set: setDiscountRate, icon: 'percent' },
          { label: t('calc.coupon.maxDiscount') || 'الحد الأقصى للخصم', value: maxDiscount, set: setMaxDiscount, icon: 'vertical_align_top' },
          { label: t('calc.coupon.minPurchase') || 'الحد الأدنى للطلب', value: minPurchase, set: setMinPurchase, icon: 'vertical_align_bottom' },
        ].map((f, i) => (
          <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-4 py-3 flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-fuchsia-500">{f.icon}</span>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</label>
            </div>
            <input 
              type="text" 
              inputMode="decimal"
              dir="ltr"
              value={f.value} 
              onChange={e => f.set(sanitizeNumericInput(e.target.value))} 
              onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))}
              className="w-full bg-transparent text-lg font-black text-slate-800 dark:text-white focus:outline-none" 
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-fuchsia-500 p-0.5 mt-2">
        <div className="relative bg-slate-900/90 rounded-[1.875rem] p-6 overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/20 blur-3xl rounded-full" />
          
          <div className="relative z-10 space-y-6">
            <div className="text-center">
              <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                {t('calc.coupon.finalPrice') || 'السعر النهائي'}
              </p>
              <div className="text-5xl font-black text-white">
                {fmt(finalPrice)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-1">
                  {t('calc.coupon.actualDiscount') || 'قيمة الخصم'}
                </p>
                <div className="text-xl font-black text-emerald-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  {fmt(actualDiscount)}
                </div>
              </div>
              <div>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-1">
                  {t('calc.coupon.effectiveRate') || 'الخصم الفعال'}
                </p>
                <div className="text-xl font-black text-white">
                  {effectiveRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {status && (
              <div className={`mt-4 p-4 rounded-2xl bg-gradient-to-r ${status.bg} bg-opacity-20 flex items-start gap-3`}>
                <span className={`material-symbols-outlined ${status.color} bg-white/10 p-1.5 rounded-xl`}>{status.icon}</span>
                <p className={`text-sm font-bold leading-relaxed ${status.color}`}>
                  {status.text}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
