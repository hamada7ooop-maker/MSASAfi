import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { bridge } from '../../../core/AppBridge';
import { ImageCropper } from '../../../components/ImageCropper';
import { Calculator } from '../../../components/Calculator';
import { OCRScanner } from './OCRScanner';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { getCategoryIcon } from '../../../core/categoryUtils';
import { toast } from '../../../toast';
import { useAddTransactionForm } from '../hooks/useAddTransactionForm';
import { SmsInputModal } from './SmsInputModal';
import { VoiceTransactionDrawer } from './VoiceTransactionDrawer';
import { CategorySelectDrawer } from './CategorySelectDrawer';

export function AddTransactionPage() {
  const { t, isLTR } = useI18n();
  const { decimalPlaces, isWorkHoursEnabled, hourlyRate, setIsWorkHoursEnabled } = useSettingsStore(
    useShallow((s) => ({
      decimalPlaces: s.decimalPlaces,
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate,
      setIsWorkHoursEnabled: s.setIsWorkHoursEnabled,
    }))
  );
  const { fmt, parseNum, getCurrencySymbol, sanitizeNumericInput } = useFormat();
  const navigate = useNavigate();

  const {
    editId,
    type,
    setType,
    amount,
    setAmount,
    selectedCategory,
    setSelectedCategory,
    selectedAccountId,
    setSelectedAccountId,
    description,
    setDescription,
    categories,
    accounts,
    datetime,
    setDatetime,
    isShared,
    setIsShared,
    attachment,
    setAttachment,
    showSMSInput,
    setShowSMSInput,
    smsText,
    setSmsText,
    paymentMethod,
    setPaymentMethod,
    notes,
    setNotes,
    location,
    setLocation,
    recurrence,
    setRecurrence,
    showCropper,
    setShowCropper,
    tempImage,
    setTempImage,
    showCalculator,
    setShowCalculator,
    isDeleting,
    setIsDeleting,
    necessity,
    setNecessity,
    isDraft,
    setIsDraft,
    isFavorite,
    setIsFavorite,
    mood,
    setMood,
    isCooling,
    setIsCooling,
    coolingExpireDate,
    trips,
    selectedTripId,
    setSelectedTripId,
    isSplitEnabled,
    setIsSplitEnabled,
    splits,
    setSplits,
    isListening,
    setIsListening,
    transcript,
    showVoiceSheet,
    setShowVoiceSheet,
    duplicateWarning,
    showAdvancedAccordion,
    setShowAdvancedAccordion,
    showCategorySheet,
    setShowCategorySheet,
    categorySearchQuery,
    setCategorySearchQuery,
    showOCR,
    setShowOCR,
    amountRef,
    isTurboUnlocked,
    isCoolingActive,
    coolingTimeRemaining,
    handleVoiceStart,
    handleVoiceStopAndProcess,
    handleSave,
    handleDelete,
    handleScanReceipt,
    handleOCRSuccess,
    handleProcessSMS,
    handleAutoClassify,
    handleFileChange,
  } = useAddTransactionForm();




  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121214] pb-32 animate-in fade-in duration-500">
      {/* Cooling-off Countdown Header Banner */}
      {editId && coolingExpireDate && (
        <div className={`p-4 text-center font-black text-xs flex flex-col items-center justify-center gap-2 border-b transition-all ${
          isCoolingActive 
            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
        }`}>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="material-symbols-outlined text-sm animate-pulse">ac_unit</span>
            <span>
              {isCoolingActive 
                ? t('txn.cooling.headerActive', { time: coolingTimeRemaining() })
                : t('txn.cooling.headerExpired')}
            </span>
          </div>
          {isCoolingActive && (
            <button
              type="button"
              onClick={() => {
                bridge.confirmSheet(
                  t('txn.cooling.skipConfirm') || '',
                  () => {
                    setIsCooling(false);
                    setIsDraft(false);
                    toast(t('txn.cooling.skipSuccessMsg'), 'info');
                  },
                  t('action.confirm') || 'تأكيد',
                  t('action.cancel') || 'إلغاء'
                );
              }}
              className="px-3 py-1 bg-cyan-500 text-white rounded-full text-[9px] hover:bg-cyan-600 transition-all font-black"
            >
              {t('txn.cooling.skipBtnLabel')}
            </button>
          )}
          {!isCoolingActive && isDraft && (
            <button
              type="button"
              onClick={() => {
                setIsCooling(false);
                setIsDraft(false);
                toast(t('txn.cooling.confirmSuccessMsg'), 'success');
              }}
              className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[9px] hover:bg-emerald-600 transition-all font-black"
            >
              {t('txn.cooling.confirmBtnLabel')}
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-[#1c1f23] p-6 pt-12 rounded-b-[3rem] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-black text-[#002b59] dark:text-blue-100">
            {editId ? (t('txn.editTitle') || 'Edit Transaction') : (t('txn.addTitle') || 'New Transaction')}
          </h2>
          <div className="w-10"></div>
        </div>

        {/* Type Selector - Interactive Switcher with Glowing Effect */}
        <div className="flex p-1.5 bg-slate-100/80 dark:bg-slate-800/40 backdrop-blur-md rounded-[2rem] max-w-xs mx-auto border border-slate-200/30 dark:border-slate-700/20 shadow-inner">
          <button 
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              type === 'expense' 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30 scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t('txn.expense')}
          </button>
          <button 
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              type === 'income' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30 scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t('home.income')}
          </button>
        </div>

        {/* كرت البطل العلوي الموحد الفاخر (Hero Input Card) */}
        <div className="backdrop-blur-xl bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/30 shadow-2xl rounded-[2.5rem] p-6 space-y-6 mt-6 max-w-lg mx-auto">
          
          {/* قسم حقل المبلغ الفاخر المتوسط مع تناظر الأزرار */}
          <div className="space-y-2 text-center relative">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{t('txn.amount')}</label>
            <div className="flex items-center justify-between gap-2 px-2">
              
              {/* زر الآلة الحاسبة الذكية */}
              <button 
                type="button"
                onClick={() => setShowCalculator(true)}
                className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center justify-center active:scale-90 transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)] cursor-pointer"
                title={t('common.calculator') || 'الآلة الحاسبة'}
              >
                <span className="material-symbols-outlined text-xl">calculate</span>
              </button>

              {/* حقل الإدخال المركزي للمبلغ */}
              <div className="flex items-center justify-center gap-1.5 flex-1 mx-2">
                <span className="text-2xl font-black text-slate-400 dark:text-slate-500">{getCurrencySymbol()}</span>
                <input 
                  ref={amountRef}
                  type="text" 
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={(e) => setAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                  placeholder="0.00"
                  className="w-full max-w-[160px] bg-transparent border-none outline-none text-5xl font-black text-[#002b59] dark:text-blue-100 text-center placeholder:text-slate-200 dark:placeholder:text-slate-700"
                />
              </div>

              {/* زر الماسح الضوئي البصري */}
              <button 
                type="button"
                onClick={handleScanReceipt}
                className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)] cursor-pointer ${
                  isTurboUnlocked 
                    ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-60'
                }`}
                title={t('txn.scan') || 'Scan Receipt'}
              >
                <span className="material-symbols-outlined text-xl">
                  {isTurboUnlocked ? 'document_scanner' : 'lock'}
                </span>
              </button>

            </div>
          </div>

          <div className="border-t border-slate-200/50 dark:border-white/5 my-2"></div>

          {/* قسم حقل الوصف السريع الشفاف المدمج مع تناظر الأزرار */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{t('txn.description')}</label>
            <div className="flex items-center justify-between gap-2 px-2 bg-slate-100/50 dark:bg-[#1c1f23]/50 rounded-2xl p-2 border border-slate-200/30 dark:border-slate-800/30">
              
              {/* زر الإدخال الصوتي الذكي */}
              <button 
                type="button"
                onClick={handleVoiceStart}
                className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title={t('voice.inputBtn')}
              >
                <span className="material-symbols-outlined text-lg">mic</span>
              </button>

              {/* حقل الإدخال الشفاف */}
              <input 
                type="text"
                dir="auto"
                autoComplete="off"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  handleAutoClassify(e.target.value);
                }}
                onCompositionEnd={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setDescription(val);
                  handleAutoClassify(val);
                }}
                onBlur={(e) => setDescription(e.target.value)}
                placeholder={t('txn.descPlaceholder') || 'What was this for?'}
                className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-[#002b59] dark:text-blue-100 text-center placeholder:text-slate-300 dark:placeholder:text-slate-600 py-1"
              />

              {/* زر لصق رسائل البنوك SMS */}
              <button 
                type="button"
                onClick={() => setShowSMSInput(true)}
                className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title={t('txn.pasteSms') || 'Paste SMS'}
              >
                <span className="material-symbols-outlined text-lg">sms</span>
              </button>

            </div>
          </div>
          
          {/* مؤشار ساعات العمل الذكي المدمج */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <button 
              type="button"
              onClick={() => setIsWorkHoursEnabled(!isWorkHoursEnabled)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                isWorkHoursEnabled 
                ? 'bg-blue-600/10 text-blue-600 border-blue-600/20 shadow-sm' 
                : 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${isWorkHoursEnabled ? 'animate-pulse' : ''}`}>
                hourglass_empty
              </span>
              <span className="text-[10px] font-black uppercase tracking-tight">
                {isWorkHoursEnabled ? t('common.enabled') : t('common.disabled')}
              </span>
            </button>

            {isWorkHoursEnabled && hourlyRate > 0 && parseNum(amount) > 0 && type === 'expense' && (
              <div className="animate-in zoom-in slide-in-from-top-2 duration-500 bg-[#002b59] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </div>
                <div className="flex flex-col text-right rtl:text-right">
                  <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest leading-tight">{t('settings.hourlyRatePh')}</span>
                  <span className="text-sm font-black leading-tight">
                    {t('txn.workHours', { hours: (parseNum(amount) / hourlyRate).toFixed(1) })}
                  </span>
                </div>
              </div>
            )}

            {isWorkHoursEnabled && hourlyRate <= 0 && (
              <p className="text-[9px] font-bold text-rose-500 animate-bounce mt-1">
                {t('settings.hourlyRateCalc')}!
              </p>
            )}
          </div>

        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Duplicate Warning */}
        {duplicateWarning.length > 0 && (
          <div className="p-4 rounded-[2rem] bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex flex-col gap-1.5 justify-center animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-1.5 justify-center font-black">
              <span className="material-symbols-outlined text-sm animate-pulse">warning</span>
              <span>{t('txn.duplicateWarningTitle')}</span>
            </div>
            <span className="text-center font-medium leading-relaxed">
              {t('txn.duplicateWarningDesc', { amount: fmt(parseNum(amount)), category: t(selectedCategory) })}
            </span>
          </div>
        )}

        {/* Account Selector - Horizontal Slide Chips */}
        <section className="bg-white dark:bg-[#1c1f23] rounded-[2.2rem] p-6 shadow-sm border border-slate-100/50 dark:border-slate-800/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">account_balance</span>
              </div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                {t('txn.selectAccount') || 'اختر الحساب'}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {accounts.map((a) => {
              const isActive = selectedAccountId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAccountId(a.id)}
                  className={`snap-center flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md scale-105 shadow-blue-500/5' 
                      : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/40 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {a.type === 'credit' ? 'credit_card' : a.type === 'savings' ? 'account_balance_wallet' : 'wallet'}
                  </span>
                  <div className="text-right rtl:text-right">
                    <p className="text-xs font-black leading-tight">{a.name}</p>
                    <p className="text-[9px] font-bold opacity-60 leading-tight">
                      {fmt(a.balance)} {getCurrencySymbol()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Category Selection - Compressed Grid with Bottom Sheet Search */}
        <section className="bg-white dark:bg-[#1c1f23] rounded-[2.2rem] p-6 shadow-sm border border-slate-100/50 dark:border-slate-800/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              {t('settings.categories')}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {(() => {
              const activeCats = categories.filter(c => c.type === type || c.type === 'both');
              // Preview only top 7 categories, and make the 8th slot the 'Show All' search button
              const previewCats = activeCats.slice(0, 7);
              
              return (
                <>
                  {previewCats.map(c => {
                    const isSelected = selectedCategory === c.name;
                    return (
                      <button 
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategory(c.name)}
                        className="flex flex-col items-center gap-2 group cursor-pointer"
                      >
                        <div 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isSelected 
                              ? 'ring-4 ring-blue-500/30 scale-105 shadow-md' 
                              : 'opacity-60 grayscale-[0.3] hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ 
                            backgroundColor: c.color === 'transparent' ? 'transparent' : `${c.color}20`, 
                            color: c.color === 'transparent' ? 'var(--color-primary)' : (c.color === 'white' ? '#64748b' : c.color), 
                            border: `2px solid ${c.color === 'transparent' ? 'rgba(0,0,0,0.1)' : `${c.color}30`}` 
                          }}
                        >
                          {(() => {
                            let icon = c.icon || 'category';
                            if (icon === 'folder_open' || icon === 'payments') {
                              const smartIcon = getCategoryIcon(c.name);
                              if (smartIcon !== '🏷️') icon = smartIcon;
                            }
                            const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                            return (
                              <span className={isEmoji ? "text-2xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                                {icon}
                              </span>
                            );
                          })()}
                        </div>
                        <span className={`text-[10px] font-black truncate w-full text-center ${isSelected ? 'text-[#002b59] dark:text-blue-300' : 'text-slate-400'}`}>
                          {t(c.name)}
                        </span>
                      </button>
                    );
                  })}
                  
                  {/* Category Show All Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      setCategorySearchQuery('');
                      setShowCategorySheet(true);
                    }}
                    className="flex flex-col items-center gap-2 group cursor-pointer animate-[pulse_2s_infinite]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border-2 border-dashed border-blue-500/30 group-hover:scale-105 transition-all">
                      <span className="material-symbols-outlined text-2xl font-black">search</span>
                    </div>
                    <span className="text-[10px] font-black text-blue-500 truncate w-full text-center">
                      {t('category.showAll') || 'عرض الكل 🏷️'}
                    </span>
                  </button>
                </>
              );
            })()}
          </div>
        </section>

        {/* Advanced Options Accordion for progressive disclosure */}
        <section className="backdrop-blur-md bg-white/40 dark:bg-[#1c1f23]/40 border border-white/20 dark:border-slate-800/20 shadow-lg rounded-[2.2rem] overflow-hidden transition-all duration-500">
          <button
            type="button"
            onClick={() => setShowAdvancedAccordion(!showAdvancedAccordion)}
            className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-slate-100/10 dark:hover:bg-slate-800/10 transition-colors"
          >
            <div className="flex items-center gap-3 text-right rtl:text-right">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined">settings_suggest</span>
              </div>
              <div className="text-right rtl:text-right">
                <span className="font-black text-sm text-[#002b59] dark:text-blue-100 block">
                  {t('txn.advancedOptions') || 'الخيارات المتقدمة ⚙️'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">
                  {t('txn.advancedOptionsDesc') || 'المزاج، التكرار، التقسيم، الملاحظات والمرفقات...'}
                </span>
              </div>
            </div>
            
            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showAdvancedAccordion ? 'rotate-180 text-blue-500' : ''}`}>
              expand_more
            </span>
          </button>

          {/* Collapsible Accordion Container */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
            showAdvancedAccordion 
              ? 'max-h-[3000px] opacity-100 p-6 pt-0 space-y-6 border-t border-slate-100/50 dark:border-slate-800/30' 
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}>
            
            {/* Necessity Selector (Need vs Want) */}
            {type === 'expense' && (
              <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner mt-4">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4 px-2 text-right rtl:text-right">
                  {t('txn.necessity')}
                </label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => setNecessity('need')}
                    className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      necessity === 'need'
                        ? 'bg-[#002b59] dark:bg-blue-600 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    {t('txn.necessity.need')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNecessity('want')}
                    className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      necessity === 'want'
                        ? 'bg-amber-500 dark:bg-amber-600 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">local_mall</span>
                    {t('txn.necessity.want')}
                  </button>
                </div>
              </section>
            )}

            {/* Mood/Emotional Spending Section */}
            <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner space-y-4">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2 text-right rtl:text-right">
                {t('txn.mood.title')}
              </label>
              <div className="flex justify-around items-center gap-2">
                {[
                  { id: 'happy', emoji: '😃' },
                  { id: 'sad', emoji: '😔' },
                  { id: 'stressed', emoji: '🤯' },
                  { id: 'tired', emoji: '😴' },
                  { id: 'neutral', emoji: '😐' }
                ].map((m) => {
                  const fullLabel = t(`txn.mood.${m.id}`) || '';
                  const cleanLabel = fullLabel.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all cursor-pointer ${
                        mood === m.id
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 scale-110 border border-blue-500/20'
                          : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                      }`}
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500">{cleanLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Cooling-off Period Switch */}
            {type === 'expense' && necessity === 'want' && (
              <section className="bg-cyan-500/5 dark:bg-cyan-500/10 rounded-[2rem] p-6 border border-cyan-500/20 shadow-sm space-y-4 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-right rtl:text-right">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                      <span className="material-symbols-outlined">ac_unit</span>
                    </div>
                    <div>
                      <span className="font-black text-sm text-[#002b59] dark:text-blue-100 block">{t('txn.cooling.switchTitle')}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{t('txn.cooling.switchDesc')}</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsCooling(!isCooling)}
                    className={`w-10 h-6 rounded-full flex p-1 transition-colors relative cursor-pointer ${isCooling ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isCooling ? (isLTR ? 'translate-x-4' : '-translate-x-4') : 'translate-x-0'}`}></div>
                  </button>
                </div>
                {isCooling && (
                  <p className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold leading-relaxed text-right rtl:text-right">
                    {t('txn.cooling.switchInfo')}
                  </p>
                )}
              </section>
            )}

            {/* Travel Trips Section */}
            {trips.length > 0 && (
              <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">flight_takeoff</span>
                  </div>
                  <div className="flex-1 text-right rtl:text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      {t('travel.associatedTrip')}
                    </label>
                    <select 
                      value={selectedTripId}
                      onChange={(e) => setSelectedTripId(e.target.value)}
                      className="w-full bg-transparent border-none outline-none font-bold text-sm text-[#002b59] dark:text-blue-100"
                    >
                      <option value="">{t('travel.none')}</option>
                      {trips.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.currency})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Transaction Splitting Section */}
            {type === 'expense' && (
              <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-right rtl:text-right">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-500 flex items-center justify-center">
                      <span className="material-symbols-outlined">call_split</span>
                    </div>
                    <div>
                      <span className="font-bold text-sm text-[#002b59] dark:text-blue-100 block">
                        {t('travel.splitTransaction')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {t('travel.splitAcrossCategories')}
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSplitEnabled(!isSplitEnabled);
                      if (!isSplitEnabled && splits.length === 0) {
                        setSplits([{ category: selectedCategory, amount: amount }]);
                      }
                    }}
                    className={`w-10 h-6 rounded-full flex p-1 transition-colors relative cursor-pointer ${isSplitEnabled ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isSplitEnabled ? (isLTR ? 'translate-x-4' : '-translate-x-4') : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {isSplitEnabled && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/30 animate-in fade-in duration-300">
                    {splits.map((s, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-100/50 dark:bg-slate-800/30 p-3 rounded-2xl">
                        <div className="flex-1 text-right rtl:text-right">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            {t('settings.categories')}
                          </label>
                          <select
                            value={s.category}
                            onChange={(e) => {
                              const newSplits = [...splits];
                              newSplits[idx].category = e.target.value;
                              setSplits(newSplits);
                            }}
                            className="w-full bg-transparent border-none outline-none font-bold text-xs text-[#002b59] dark:text-blue-100"
                          >
                            <option value="">{t('travel.selectTrip') || 'Select...'}</option>
                            {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                              <option key={c.id} value={c.name}>{t(c.name)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24 text-right rtl:text-right">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            {t('txn.amount')}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            autoComplete="off"
                            value={s.amount}
                            onChange={(e) => {
                              const newSplits = [...splits];
                              newSplits[idx].amount = sanitizeNumericInput(e.target.value);
                              setSplits(newSplits);
                            }}
                            onCompositionEnd={(e) => {
                              const newSplits = [...splits];
                              newSplits[idx].amount = sanitizeNumericInput((e.target as HTMLInputElement).value);
                              setSplits(newSplits);
                            }}
                            placeholder="0.00"
                            className="w-full bg-transparent border-none outline-none font-bold text-xs text-[#002b59] dark:text-blue-100 placeholder:text-slate-300"
                          />
                        </div>

                        <div className="flex-1 text-right rtl:text-right">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            {t('txn.description')}
                          </label>
                          <input
                            type="text"
                            dir="auto"
                            autoComplete="off"
                            value={s.description || ''}
                            onChange={(e) => {
                              const newSplits = [...splits];
                              newSplits[idx].description = e.target.value;
                              setSplits(newSplits);
                            }}
                            onCompositionEnd={(e) => {
                              const newSplits = [...splits];
                              newSplits[idx].description = (e.target as HTMLInputElement).value;
                              setSplits(newSplits);
                            }}
                            placeholder={t('txn.splitDescPh') || 'Split description...'}
                            className="w-full bg-transparent border-none outline-none font-bold text-xs text-[#002b59] dark:text-blue-100 placeholder:text-slate-300"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSplits(splits.filter((_, i) => i !== idx));
                          }}
                          className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-90 transition-all mt-3"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setSplits([...splits, { category: '', amount: '', description: '' }]);
                      }}
                      className="w-full py-3 rounded-2xl bg-violet-50 dark:bg-violet-900/10 text-violet-600 dark:text-violet-400 font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {t('travel.splitAddCategory')}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const totalVal = parseNum(amount) || 0;
                          if (totalVal <= 0 || splits.length === 0) return;
                          const count = splits.length;
                          const shareVal = parseFloat((totalVal / count).toFixed(decimalPlaces));
                          const newSplits = splits.map(s => ({
                            ...s,
                            amount: shareVal.toFixed(decimalPlaces)
                          }));
                          setSplits(newSplits);
                          toast(t('travel.splitEqually') + ' ✓', 'success');
                        }}
                        disabled={splits.length === 0 || parseNum(amount) <= 0}
                        className="py-2.5 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">balance</span>
                        {t('travel.splitEqually') || 'Distribute equally'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSplits([{ category: selectedCategory, amount: amount, description: '' }]);
                          toast(t('travel.splitReset') + ' ✓', 'info');
                        }}
                        className="py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold text-[10px] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">restart_alt</span>
                        {t('travel.splitReset') || 'Reset'}
                      </button>
                    </div>

                    {/* Calculations & Status Messages */}
                    {(() => {
                      const totalVal = parseNum(amount) || 0;
                      const distributed = splits.reduce((sum, s) => sum + (parseNum(s.amount) || 0), 0);
                      const remaining = totalVal - distributed;

                      const hasEmptyOrZeroAmount = splits.some(s => !s.amount || parseNum(s.amount) <= 0);
                      const hasEmptyCategory = splits.some(s => !s.category);
                      const categoriesSelected = splits.map(s => s.category).filter(Boolean);
                      const hasDuplicateCategory = categoriesSelected.some((cat, idx) => categoriesSelected.indexOf(cat) !== idx);

                      const isPerfect = splits.length >= 2 && Math.abs(remaining) < 0.005 && !hasEmptyOrZeroAmount && !hasEmptyCategory && !hasDuplicateCategory;
                      const showDiscrepancy = Math.abs(remaining) >= 0.005 || (splits.length >= 2 && !isPerfect);

                      return (
                        <div className="pt-2">
                          {isPerfect ? (
                            <div className="p-4 rounded-3xl bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 text-green-600 dark:text-green-400 text-center font-bold text-[11px] flex flex-col gap-1.5 items-center justify-center animate-in fade-in duration-300">
                              <span className="material-symbols-outlined text-lg animate-bounce">check_circle</span>
                              <span>{t('travel.splitPerfect') || 'تم توزيع المبلغ بالكامل بنجاح! 🎉'}</span>
                            </div>
                          ) : showDiscrepancy ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <div className="p-4 rounded-3xl bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] space-y-2">
                                <div className="flex items-center justify-center gap-1.5 text-rose-500 mb-1">
                                  <span className="material-symbols-outlined text-lg animate-pulse">warning</span>
                                  <span className="font-black">
                                    {hasDuplicateCategory
                                      ? t('txn.splitDuplicateCategoryWarning')
                                      : hasEmptyOrZeroAmount || hasEmptyCategory
                                      ? t('txn.splitIncompleteWarning')
                                      : t('txn.splitDiscrepancyWarning')}
                                  </span>
                                </div>
                                
                                <div className="space-y-1.5 pt-1.5 border-t border-rose-500/15 text-center leading-relaxed">
                                  <p className="text-[11px]">
                                    <span className={remaining > 0 ? "text-amber-500 font-black" : remaining < 0 ? "text-rose-500 font-black" : "text-slate-500 dark:text-slate-400 font-black"}>
                                      {t('txn.splitRemainingUndistributed', { amount: remaining.toFixed(decimalPlaces) })}
                                    </span>
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-black">
                                    {t('txn.splitMismatchDesc', {
                                      distributed: distributed.toFixed(decimalPlaces),
                                      total: totalVal.toFixed(decimalPlaces)
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* Solver Action Grid */}
                              {splits.length > 0 && (
                                <div className="p-4 rounded-3xl backdrop-blur-md bg-white/40 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/40 shadow-xl space-y-4">
                                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-indigo-500">lightbulb</span>
                                    {t('txn.splitSolveSelect')}
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSplits = [...splits];
                                        const lastIdx = newSplits.length - 1;
                                        const currentLastAmt = parseNum(newSplits[lastIdx].amount) || 0;
                                        const adjustedAmt = Math.max(0, currentLastAmt + remaining);
                                        newSplits[lastIdx] = {
                                          ...newSplits[lastIdx],
                                          amount: adjustedAmt.toFixed(decimalPlaces)
                                        };
                                        setSplits(newSplits);
                                        toast(t('txn.splitSolveLastSuccess'), 'success');
                                      }}
                                      className="p-3 text-right rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                                    >
                                      <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">magic_button</span>
                                        {t('txn.splitSolveLastCategory')}
                                      </span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                                        {t('txn.splitSolveLastCategoryDesc')}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const remainingCents = Math.round(remaining * 100);
                                        const sign = Math.sign(remainingCents);
                                        let absCents = Math.abs(remainingCents);
                                        
                                        const newSplits = splits.map(s => ({ ...s }));
                                        let idx = 0;
                                        while (absCents > 0 && newSplits.length > 0) {
                                          const currentAmtCents = Math.round((parseNum(newSplits[idx].amount) || 0) * 100);
                                          const adjustedCents = Math.max(0, currentAmtCents + sign);
                                          newSplits[idx].amount = (adjustedCents / 100).toFixed(decimalPlaces);
                                          absCents--;
                                          idx = (idx + 1) % newSplits.length;
                                        }
                                        setSplits(newSplits);
                                        toast(t('txn.splitSolveSeqSuccess'), 'success');
                                      }}
                                      className="p-3 text-right rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                                    >
                                      <span className="font-black text-xs text-emerald-600 dark:emerald-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">balance</span>
                                        {t('txn.splitSolveSequentially')}
                                      </span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                                        {t('txn.splitSolveSequentiallyDesc')}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAmount(distributed.toFixed(decimalPlaces));
                                        toast(t('txn.splitSolveTotalSuccess'), 'success');
                                      }}
                                      className="p-3 text-right rounded-2xl bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-amber-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                                    >
                                      <span className="font-black text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">ads_click</span>
                                        {t('txn.splitSolveUpdateTotal')}
                                      </span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                                        {t('txn.splitSolveUpdateTotalDesc', {
                                          distributed: distributed.toFixed(decimalPlaces),
                                          total: totalVal.toFixed(decimalPlaces)
                                        })}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSplits = splits.map(s => {
                                          const rounded = Math.round(parseNum(s.amount) || 0);
                                          return { ...s, amount: rounded.toFixed(decimalPlaces) };
                                        });
                                        const newSum = newSplits.reduce((sum, s) => sum + (parseNum(s.amount) || 0), 0);
                                        setSplits(newSplits);
                                        setAmount(newSum.toFixed(decimalPlaces));
                                        toast(t('txn.splitSolveRoundSuccess'), 'success');
                                      }}
                                      className="p-3 text-right rounded-2xl bg-sky-50/50 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border border-sky-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                                    >
                                      <span className="font-black text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm group-hover:rotate-45 transition-transform">pin</span>
                                        {t('txn.splitSolveRoundAll')}
                                      </span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                                        {t('txn.splitSolveRoundAllDesc')}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </section>
            )}

            {/* Payment Methods */}
            <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 text-right rtl:text-right">{t('txn.paymentMethod')}</label>
              <div className="flex gap-2 flex-wrap justify-end">
                {['card', 'cash', 'digital_wallet', 'transfer', 'crypto'].map((id) => (
                  <button 
                    key={id}
                    type="button" 
                    onClick={() => setPaymentMethod(id)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                      paymentMethod === id 
                        ? 'bg-[#002b59] text-white shadow-lg shadow-blue-900/20' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200/50'
                    }`}
                  >
                    {t('txn.pay.' + id) || id}
                  </button>
                ))}
              </div>
            </section>

            {/* Additional Info (Notes & Location) */}
            <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">edit_note</span>
                </div>
                <div className="flex-1 text-right rtl:text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('txn.notes')}</label>
                  <input 
                    type="text"
                    dir="auto"
                    autoComplete="off"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onCompositionEnd={(e) => setNotes((e.target as HTMLInputElement).value)}
                    onBlur={(e) => setNotes(e.target.value)}
                    placeholder={t('txn.placeholderNotes') || 'Add extra details...'}
                    className="w-full bg-transparent border-none outline-none font-bold text-sm text-[#002b59] dark:text-blue-100 placeholder:text-slate-300"
                  />
                </div>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-800/30"></div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div className="flex-1 text-right rtl:text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('txn.location')}</label>
                  <input 
                    type="text"
                    dir="auto"
                    autoComplete="off"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onCompositionEnd={(e) => setLocation((e.target as HTMLInputElement).value)}
                    onBlur={(e) => setLocation(e.target.value)}
                    placeholder={t('txn.placeholderLocation') || 'Where did this happen?'}
                    className="w-full bg-transparent border-none outline-none font-bold text-sm text-[#002b59] dark:text-blue-100 placeholder:text-slate-300"
                  />
                </div>
              </div>
            </section>

            {/* Recurrence, Family, Date, Draft, and Favorite Options */}
            <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">event_repeat</span>
                  </div>
                  <div className="flex-1 text-right rtl:text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('nav.recurring')}</label>
                    <p className="text-[10px] text-slate-400 font-bold">{t('txn.recurrence.desc') || 'Automatically repeat this transaction'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRecurrence(opt)}
                      className={`snap-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                        recurrence === opt 
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200/50'
                      }`}
                    >
                      {t(`txn.recurrence.${opt}`) || opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-right rtl:text-right">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">diversity_1</span>
                  </div>
                  <span className="font-bold text-sm text-[#002b59] dark:text-blue-100">{t('title.family')}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsShared(!isShared)}
                  className={`w-10 h-6 rounded-full flex p-1 transition-colors relative cursor-pointer ${isShared ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isShared ? (isLTR ? 'translate-x-4' : '-translate-x-4') : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-right rtl:text-right">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">calendar_today</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('txn.date')}</label>
                    <input 
                      type="datetime-local"
                      value={datetime}
                      onChange={(e) => setDatetime(e.target.value)}
                      className="bg-transparent border-none outline-none font-bold text-sm text-[#002b59] dark:text-blue-100"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/30 my-2"></div>

              {/* Save as Draft Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-right rtl:text-right">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-sm text-[#002b59] dark:text-blue-100 block">{t('txn.isDraft') || 'Save as Draft'}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{t('txn.draftDesc') || 'Keep transaction active as a draft'}</span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsDraft(!isDraft)}
                  className={`w-10 h-6 rounded-full flex p-1 transition-colors relative cursor-pointer ${isDraft ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isDraft ? (isLTR ? 'translate-x-4' : '-translate-x-4') : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* Add to Favorites Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-right rtl:text-right">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-sm text-[#002b59] dark:text-blue-100 block">{t('txn.isFavorite') || 'Add to Favorites'}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{t('txn.favDesc') || 'Pin this transaction to favorites list'}</span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`w-10 h-6 rounded-full flex p-1 transition-colors relative cursor-pointer ${isFavorite ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isFavorite ? (isLTR ? 'translate-x-4' : '-translate-x-4') : 'translate-x-0'}`}></div>
                </button>
              </div>
            </section>

            {/* Attachment */}
            <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner">
              <input 
                type="file" 
                id="txn-attachment" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              {!attachment ? (
                <button 
                  type="button"
                  onClick={() => document.getElementById('txn-attachment')?.click()}
                  className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center gap-3 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-500 cursor-pointer"
                >
                  <span className="material-symbols-outlined">attach_file</span>
                  {t('txn.attachment') || 'Add Attachment'}
                </button>
              ) : (
                <div className="relative animate-in zoom-in-95 duration-300">
                  <img 
                    src={attachment} 
                    className="w-full h-40 object-cover rounded-2xl shadow-lg" 
                    alt="Attachment preview" 
                  />
                  <button 
                    type="button"
                    onClick={() => setAttachment(undefined)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </section>

          </div>
        </section>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            type="button"
            onClick={handleSave}
            className="w-full py-5 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-lg shadow-xl shadow-blue-500/30 active:scale-95 transition-all cursor-pointer"
          >
            {t('action.save')}
          </button>
          
          {editId && (
            <div className="flex flex-col gap-2 pt-2">
              {!isDeleting ? (
                <button 
                  type="button"
                  onClick={() => setIsDeleting(true)}
                  className="w-full py-4 rounded-[2rem] bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                  {t('action.delete') || 'Delete Transaction'}
                </button>
              ) : (
                <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    type="button"
                    onClick={() => setIsDeleting(false)}
                    className="flex-1 py-4 rounded-[2rem] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-sm active:scale-95 transition-all cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="button"
                    onClick={handleDelete}
                    className="flex-[2] py-4 rounded-[2rem] bg-rose-600 text-white font-black text-sm active:scale-95 transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    {t('txn.deleteOne') || 'Confirm Delete'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SMS Paste Modal */}
      <SmsInputModal 
        isOpen={showSMSInput}
        smsText={smsText}
        onSmsTextChange={setSmsText}
        onClose={() => setShowSMSInput(false)}
        onProcess={handleProcessSMS}
      />

      {/* Image Cropper Modal */}
      {showCropper && tempImage && (
        <ImageCropper 
          image={tempImage} 
          onCrop={(cropped) => {
            setAttachment(cropped);
            setShowCropper(false);
            setTempImage(null);
            toast(t('txn.attachmentAdded') || 'Attachment added', 'success');
          }} 
          onCancel={() => {
            setShowCropper(false);
            setTempImage(null);
          }} 
        />
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <Calculator 
          initialValue={amount}
          onConfirm={(val) => {
            setAmount(val);
            setShowCalculator(false);
          }}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* OCR Scanner Modal */}
      {showOCR && (
        <OCRScanner 
          onScan={handleOCRSuccess}
          onClose={() => setShowOCR(false)}
        />
      )}

      {/* Voice BottomSheet Modal */}
      <VoiceTransactionDrawer
        isOpen={showVoiceSheet}
        isListening={isListening}
        transcript={transcript}
        onClose={() => {
          setShowVoiceSheet(false);
          setIsListening(false);
        }}
        onConfirmAndProcess={handleVoiceStopAndProcess}
      />

      {/* Premium Category Search Bottom Sheet */}
      <CategorySelectDrawer 
        isOpen={showCategorySheet}
        type={type}
        categories={categories}
        selectedCategory={selectedCategory}
        categorySearchQuery={categorySearchQuery}
        onSearchChange={setCategorySearchQuery}
        onSelectCategory={(catName) => {
          setSelectedCategory(catName);
          setShowCategorySheet(false);
        }}
        onClose={() => setShowCategorySheet(false)}
      />

    </div>
  );
}
