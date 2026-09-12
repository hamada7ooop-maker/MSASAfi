import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useFocusTrap } from '../../../core/hooks/useFocusTrap';
import type { Asset } from '../../../types';
import { toast } from '../../../toast';

export interface AssetFormModalProps {
  asset?: Asset | Partial<Asset> | null;
  onSave: (data: Omit<Asset, 'id'>) => void;
  onClose: () => void;
}

export function AssetFormModal({
  asset,
  onSave,
  onClose
}: AssetFormModalProps) {
  const { t } = useI18n();
  const { parseNum, sanitizeNumericInput, sanitizeIntegerInput } = useFormat();
  const containerRef = useFocusTrap<HTMLDivElement>();

  const [name, setName] = useState(asset?.name || '');
  const [purchasePrice, setPurchasePrice] = useState(asset?.purchasePrice != null ? String(asset.purchasePrice) : '');
  const [salvageValue, setSalvageValue] = useState(asset?.salvageValue != null ? String(asset.salvageValue) : '');
  const [lifespanYears, setLifespanYears] = useState(asset?.lifespanYears != null ? String(asset.lifespanYears) : '5');
  const [category, setCategory] = useState<Asset['category']>(asset?.category || 'electronics');
  const [depreciationMethod, setDepreciationMethod] = useState<Asset['depreciationMethod']>(asset?.depreciationMethod || 'straight_line');
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate || new Date().toISOString().slice(0, 10));
  const [warrantyExpiry, setWarrantyExpiry] = useState(asset?.warrantyExpiry || '');
  const [notes, setNotes] = useState(asset?.notes || '');

  // Accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePriceChange = (val: string) => {
    const sanitized = sanitizeNumericInput(val);
    setPurchasePrice(sanitized);
    const currentSalvage = parseNum(salvageValue) || 0;
    const currentPrice = parseNum(purchasePrice) || 0;
    if (!salvageValue || currentSalvage === Math.round(currentPrice * 0.1)) {
      const newPrice = parseNum(sanitized) || 0;
      setSalvageValue(newPrice > 0 ? String(Math.round(newPrice * 0.1)) : '');
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const price = parseNum(purchasePrice) || 0;
    if (!trimmedName) {
      toast(t('bill.fillAll') || 'الرجاء إدخال اسم الأصل', 'warning');
      return;
    }
    if (price <= 0) {
      toast(t('txn.errAmount') || 'الرجاء إدخال قيمة الشراء', 'warning');
      return;
    }

    onSave({
      name: trimmedName,
      category,
      purchasePrice: price,
      purchaseDate,
      lifespanYears: Math.floor(parseNum(lifespanYears)) || 5,
      salvageValue: parseNum(salvageValue) || 0,
      depreciationMethod,
      warrantyExpiry: warrantyExpiry || undefined,
      notes: notes || undefined
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-form-title"
    >
      <div 
        ref={containerRef}
        className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 id="asset-form-title" className="text-xl font-black dark:text-white flex items-center justify-between">
          {asset?.id ? t('asset.edit') || 'تعديل أصل' : t('asset.new') || 'إضافة أصل جديد'}
        </h3>

        <div className="space-y-4 text-right" dir="rtl">
          {/* اسم الأصل */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">اسم الأصل / الممتلك</label>
            <input 
              type="text"
              value={name} 
              onChange={e => setName(e.target.value)}
              onCompositionEnd={e => setName((e.target as HTMLInputElement).value)}
              onBlur={e => setName(e.target.value)}
              dir="auto"
              autoComplete="off"
              placeholder="مثال: سيارة كورولا، فيلا الرياض، ماكبوك..."
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all text-right" 
            />
          </div>

          {/* الفئة وطريقة الاستهلاك */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">فئة الأصل</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Asset['category'])}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all appearance-none text-right"
              >
                <option value="real_estate">🏠 عقارات ومبانٍ</option>
                <option value="vehicle">🚗 سيارات ومركبات</option>
                <option value="electronics">💻 أجهزة وإلكترونيات</option>
                <option value="other">💎 أصول وممتلكات أخرى</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">طريقة حساب الاستهلاك</label>
              <select
                value={depreciationMethod}
                onChange={e => setDepreciationMethod(e.target.value as Asset['depreciationMethod'])}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all appearance-none text-right"
              >
                <option value="straight_line">📈 القسط الثابت (الخطي)</option>
                <option value="double_declining">📉 الرصيد المتناقص المضاعف</option>
              </select>
            </div>
          </div>

          {/* قيمة الشراء والقيمة التخريدية */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">قيمة الشراء</label>
              <input 
                type="text"
                inputMode="decimal"
                value={purchasePrice} 
                onChange={e => handlePriceChange(e.target.value)}
                onCompositionEnd={e => handlePriceChange((e.target as HTMLInputElement).value)}
                onBlur={e => handlePriceChange(e.target.value)}
                dir="auto"
                autoComplete="off"
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all text-right" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">القيمة التخريدية (الخردة)</label>
              <input 
                type="text"
                inputMode="decimal"
                value={salvageValue} 
                onChange={e => setSalvageValue(sanitizeNumericInput(e.target.value))}
                onCompositionEnd={e => setSalvageValue(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                onBlur={e => setSalvageValue(sanitizeNumericInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all text-right" 
              />
            </div>
          </div>

          {/* تاريخ الشراء والعمر الافتراضي */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">تاريخ الشراء</label>
              <input 
                type="date"
                value={purchaseDate} 
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all text-right" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">العمر الخدمي الافتراضي (سنة)</label>
              <input 
                type="text"
                inputMode="numeric"
                value={lifespanYears} 
                onChange={e => setLifespanYears(sanitizeIntegerInput(e.target.value))}
                onCompositionEnd={e => setLifespanYears(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
                onBlur={e => setLifespanYears(sanitizeIntegerInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                placeholder="5"
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all text-right" 
              />
            </div>
          </div>

          {/* انتهاء الضمان */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">تاريخ انتهاء الضمان (اختياري)</label>
            <input 
              type="date"
              value={warrantyExpiry} 
              onChange={e => setWarrantyExpiry(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all text-right" 
            />
          </div>

          {/* ملاحظات */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">ملاحظات إضافية</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              onCompositionEnd={e => setNotes((e.target as HTMLTextAreaElement).value)}
              onBlur={e => setNotes(e.target.value)}
              dir="auto"
              autoComplete="off"
              rows={2}
              placeholder="اكتب أي ملاحظات إضافية هنا..."
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all text-right resize-none" 
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm active:scale-95 transition-transform">
            إلغاء
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-4 rounded-2xl bg-[#002b59] dark:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
          >
            حفظ الأصل
          </button>
        </div>
      </div>
    </div>
  );
}
