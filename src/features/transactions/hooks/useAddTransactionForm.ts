import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../core/hooks/useFormat';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { AccountRepository } from '../../../core/db/repositories/accounts';
import { db as DB } from '@/core/db/core';
import type { Category, Account, Trip, Transaction } from '../../../types';
import { toast } from '../../../toast';
import { parseSMS } from '../../../services/smsService';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { parseVoiceInput, detectDuplicates } from '../../../core/ai/detectors';
import { voiceAssistant } from '../../../services/voiceAssistant';
import { silentFail } from '../../../core/utils';

export function useAddTransactionForm() {
  const { t } = useI18n();
  const isMounted = useIsMounted();
  const { parseNum } = useFormat();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [type, setType] = useState<'income' | 'expense'>('expense');

  // Mirrors `type` so loadData can read the latest value without taking it as
  // a dependency (see the note inside loadData).
  const typeRef = useRef(type);
  useEffect(() => {
    typeRef.current = type;
  }, [type]);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [datetime, setDatetime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isShared, setIsShared] = useState(false);
  const [splitBy, setSplitBy] = useState(2);
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const [showSMSInput, setShowSMSInput] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [necessity, setNecessity] = useState<'need' | 'want'>('need');
  const [isDraft, setIsDraft] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [mood, setMood] = useState<string>('neutral');
  const [isCooling, setIsCooling] = useState<boolean>(false);
  const [coolingExpireDate, setCoolingExpireDate] = useState<string>('');

  // Travel Trips and Splits states
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [isSplitEnabled, setIsSplitEnabled] = useState<boolean>(false);
  const [splits, setSplits] = useState<Array<{ category: string; amount: string; description?: string }>>([]);

  const [, setTick] = useState(0);

  // Voice Input & Duplicate Entry states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Transaction[]>([]);

  // Accordion & Category Sheet
  const [showAdvancedAccordion, setShowAdvancedAccordion] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showOCR, setShowOCR] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  const { unlockedItems = [] } = useSettingsStore(
    useShallow((s) => ({
      unlockedItems: s.unlockedItems,
    }))
  );
  const isTurboUnlocked = unlockedItems.includes('perk:turbo-scanner');

  useEffect(() => {
    const checkDup = async () => {
      const parsedAmt = parseNum(amount);
      if (parsedAmt > 0 && selectedCategory) {
        const txs = await TransactionRepository.getAll();
        const dups = detectDuplicates({ amount: parsedAmt, category: selectedCategory, description }, txs);
        setDuplicateWarning(dups);
      } else {
        setDuplicateWarning([]);
      }
    };
    checkDup();
  }, [amount, selectedCategory, description, parseNum]);

  const isCoolingActive = coolingExpireDate ? new Date(coolingExpireDate) > new Date() : false;

  useEffect(() => {
    if (isCoolingActive) {
      const interval = setInterval(() => setTick((t) => t + 1), 60000);
      return () => clearInterval(interval);
    }
  }, [isCoolingActive]);

  const coolingTimeRemaining = () => {
    if (!coolingExpireDate) return '';
    const diffMs = new Date(coolingExpireDate).getTime() - Date.now();
    if (diffMs <= 0) return '';
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    return t('cooling.remainingTime', { hours: String(hours), mins: String(mins) });
  };

  const loadData = useCallback(async () => {
    try {
      await DB.appendMissingDefaultCategories();

      const [cats, accs, activeTrips] = await Promise.all([
        DB.getCategories(),
        AccountRepository.getAll(),
        DB.trips.toArray(),
      ]);
      if (!isMounted.current) return;
      setCategories(cats);
      setAccounts(accs);
      setTrips(activeTrips);

      if (editId) {
        const tx = await TransactionRepository.getById(editId);
        if (tx && isMounted.current) {
          setType(tx.type as 'income' | 'expense');
          setAmount(tx.amount.toString());
          setSelectedCategory(tx.category || '');
          setSelectedAccountId(tx.accountId || (accs.length > 0 ? accs[0].id : ''));
          setDescription(tx.description || '');
          setDatetime(
            new Date(new Date(tx.date || tx.createdAt!).getTime() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
          );
          setRecurrence((tx.recurrence as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly') || 'none');
          setIsShared(!!tx.shared);
          setSplitBy(tx.splitBy || 2);
          setPaymentMethod(tx.paymentMethod || 'cash');
          setNotes(tx.notes || '');
          setLocation(tx.location || '');
          setAttachment(tx.attachment);
          setNecessity(tx.necessity || 'need');
          setIsDraft(!!tx.isDraft);
          setIsFavorite(!!tx.isFavorite);
          setMood(tx.mood || 'neutral');
          setIsCooling(!!tx.coolingExpireDate);
          setCoolingExpireDate(tx.coolingExpireDate || '');
          setSelectedTripId(tx.tripId || '');
          if (tx.splits && tx.splits.length > 0) {
            setIsSplitEnabled(true);
            setSplits(tx.splits.map((s) => ({ category: s.category, amount: s.amount.toString(), description: s.description })));
          } else {
            setIsSplitEnabled(false);
            setSplits([]);
          }
        }
      } else {
        if (accs.length > 0 && isMounted.current) setSelectedAccountId(accs[0].id);
        // Read through a ref: this only picks an initial default. Depending
        // on `type` would re-run the whole load and wipe the category the
        // user just chose whenever they toggle income/expense.
        const defaultCat = cats.find(
          (c: Category) => c.type === typeRef.current || c.type === 'both'
        );
        if (defaultCat && isMounted.current) setSelectedCategory(defaultCat.name);
      }
    } catch (err) {
      silentFail('[AddTransaction] Error loading data')(err);
    }
    // `editId` IS a real dependency: it comes from the URL, so navigating
    // from one transaction's edit screen to another must reload the form.
  }, [editId, isMounted]);

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => amountRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleVoiceStart = () => {
    if (!voiceAssistant.isSupported()) {
      toast(t('voice.unsupported'), 'error');
      return;
    }

    setTranscript('');
    setIsListening(true);
    setShowVoiceSheet(true);

    voiceAssistant.onResult = (transcriptText: string) => {
      setTranscript(transcriptText);
    };

    voiceAssistant.onError = (err: string) => {
      silentFail('[Voice] Error')(err);
      setIsListening(false);
    };

    voiceAssistant.start();
  };

  const handleVoiceStopAndProcess = async () => {
    setIsListening(false);
    setShowVoiceSheet(false);

    try {
      voiceAssistant.stop();
    } catch (e) {
      silentFail('[Voice] Stop error')(e);
    }

    if (transcript.trim()) {
      try {
        const parsed = await parseVoiceInput(transcript);
        if (parsed) {
          if (parsed.amount > 0) setAmount(parsed.amount.toString());
          if (parsed.description) setDescription(parsed.description);
          if (parsed.category) setSelectedCategory(parsed.category);
          if (parsed.type) setType(parsed.type);
          toast(t('voice.autoFilled'), 'success');
        } else {
          toast(t('voice.parseError'), 'warning');
        }
      } catch (err: unknown) {
        silentFail('[Voice] Parse error')(err);
        toast(t('voice.parseError') || 'فشل تحليل النص الصوتي', 'error');
      }
    }
  };

  const handleSave = async () => {
    const txnYear = new Date(datetime).getFullYear();
    const { lockedYears = [] } = useSettingsStore.getState();
    if (lockedYears.includes(txnYear)) {
      toast(
        t('settings.yearLockedError', { year: String(txnYear) }) ||
          `السنة المالية ${txnYear} مغلقة ومؤرشفة! لا يمكن تعديل أو إضافة معاملات بها.`,
        'error'
      );
      return;
    }

    const numAmount = parseNum(amount) || 0;
    if (!isDraft && (!numAmount || numAmount <= 0)) {
      toast(t('txn.errAmount') || 'Invalid amount', 'error');
      return;
    }

    if (!isDraft && !selectedCategory && (!isSplitEnabled || type !== 'expense')) {
      toast(t('txn.errCategory') || 'Category required', 'error');
      return;
    }

    if (!isDraft && !selectedAccountId) {
      toast(t('txn.selectAccountMsg') || 'Please select an account', 'error');
      return;
    }

    if (isSplitEnabled && type === 'expense') {
      if (splits.length === 0) {
        toast(t('travel.splitAcrossCategories') || 'Please add split categories', 'error');
        return;
      }

      const categoriesSelected = splits.map((s) => s.category).filter(Boolean);
      const hasDuplicateCategory = categoriesSelected.some((cat, idx) => categoriesSelected.indexOf(cat) !== idx);
      if (hasDuplicateCategory) {
        toast(t('txn.splitDuplicateCategory'), 'error');
        return;
      }

      let sumSplits = 0;
      for (const s of splits) {
        const amtVal = parseNum(s.amount) || 0;
        if (amtVal <= 0) {
          toast(t('txn.errAmount') || 'Invalid amount', 'error');
          return;
        }
        if (!s.category) {
          toast(t('txn.errCategory') || 'Category required', 'error');
          return;
        }
        sumSplits += amtVal;
      }

      if (Math.abs(sumSplits - numAmount) > 0.01) {
        toast(
          t('travel.splitTotalMismatch', { distributed: sumSplits.toFixed(2), total: numAmount.toFixed(2) }) ||
            'Distributed total does not match total',
          'error'
        );
        return;
      }
    }

    // Record category feedback if AI was used
    if (description && selectedCategory) {
      import('../../../ai.js')
        .then((m) => m.recordCategoryFeedback(description, selectedCategory))
        .catch(() => {});
    }

    try {
      const acc = accounts.find((a) => a.id === selectedAccountId);
      const txnDate = new Date(datetime).toISOString();

      const calculatedCoolingExpire = isCooling
        ? coolingExpireDate || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        : undefined;

      const txData = {
        amount: numAmount,
        type,
        category: isSplitEnabled && type === 'expense' ? '' : selectedCategory || '',
        description: description || (selectedCategory ? t(selectedCategory) || selectedCategory : ''),
        date: txnDate,
        accountId: selectedAccountId || '',
        account: acc?.name || null,
        isRecurring: recurrence !== 'none',
        recurrence: recurrence !== 'none' ? recurrence : undefined,
        shared: isShared,
        splitBy: isShared ? splitBy : undefined,
        paymentMethod,
        notes,
        location,
        attachment,
        necessity: type === 'expense' ? necessity : undefined,
        isDraft: isCooling ? true : isDraft,
        isFavorite,
        mood,
        coolingExpireDate: calculatedCoolingExpire,
        tripId: selectedTripId || undefined,
        splits:
          isSplitEnabled && type === 'expense'
            ? splits.map((s) => ({ category: s.category, amount: parseNum(s.amount) || 0, description: s.description }))
            : undefined,
      };

      if (editId) {
        await TransactionRepository.update(editId, txData);
        toast(t('txn.updated') || 'Updated', 'success');
      } else {
        await TransactionRepository.add(txData);
        toast(t('txn.saved'), 'success');
      }

      if (isDraft) {
        const { checkMilestone } = await import('../../../core/loyalty');
        await checkMilestone('SMART_PLANNER');
      }

      if (recurrence !== 'none') {
        const nextDt = new Date(txnDate);
        if (recurrence === 'daily') nextDt.setDate(nextDt.getDate() + 1);
        else if (recurrence === 'weekly') nextDt.setDate(nextDt.getDate() + 7);
        else if (recurrence === 'monthly') nextDt.setMonth(nextDt.getMonth() + 1);
        else if (recurrence === 'yearly') nextDt.setFullYear(nextDt.getFullYear() + 1);

        await DB.addRecurringTransaction({
          amount: numAmount,
          type,
          category: selectedCategory,
          description: description || t(selectedCategory) || selectedCategory,
          frequency: recurrence,
          startDate: txnDate,
          nextDate: nextDt.toISOString().slice(0, 10),
          isActive: true,
          accountId: selectedAccountId,
          account: acc?.name || null,
        });
        await DB.processRecurringTransactions();
      }

      navigate(-1);
    } catch {
      toast(t('common.error'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    try {
      const tx = await TransactionRepository.getById(editId);
      if (tx) {
        const txYear = new Date(tx.date || tx.createdAt || Date.now()).getFullYear();
        const { lockedYears = [] } = useSettingsStore.getState();
        if (lockedYears.includes(txYear)) {
          toast(
            t('settings.yearLockedError', { year: String(txYear) }) ||
              `السنة المالية ${txYear} مغلقة ومؤرشفة! لا يمكن تعديل أو حذف المعاملات بها.`,
            'error'
          );
          return;
        }
      }
      await TransactionRepository.delete(editId);
      toast(t('txn.deleted') || 'Deleted', 'success');
      navigate(-1);
    } catch (err) {
      silentFail('[AddTransaction] Delete error')(err);
      toast(t('common.error'), 'error');
    }
  };

  const handleScanReceipt = async () => {
    if (!isTurboUnlocked) {
      toast(t('shop.perk.turboScanner') + ' Required', 'warning');
      window.location.hash = '/shop';
      return;
    }
    setShowOCR(true);
  };

  const handleAutoClassify = async (desc: string) => {
    if (desc.length > 2) {
      const { classifyTransactionSmart } = await import('../../../ai');
      const cat = await classifyTransactionSmart(desc);
      if (cat && cat !== 'other') {
        setSelectedCategory(cat);
      }
    }
  };

  const handleOCRSuccess = async (data: { amount: string; date?: string; merchant?: string }) => {
    if (data.amount) setAmount(data.amount);
    if (data.date) {
      try {
        const [d, m, y] = data.date.split(/[\/\-\.]/);
        const year = y.length === 2 ? `20${y}` : y;
        const newDate = new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00`);
        if (!isNaN(newDate.getTime())) {
          setDatetime(newDate.toISOString().slice(0, 16));
        }
      } catch {
        /* Retain default datetime on parse failure */
      }
    }
    if (data.merchant) {
      setDescription(data.merchant);
      handleAutoClassify(data.merchant);
    }
    setShowOCR(false);

    const { checkMilestone } = await import('../../../core/loyalty');
    await checkMilestone('VISIONARY');
  };

  const handleProcessSMS = () => {
    const result = parseSMS(smsText);
    if (result) {
      setAmount(result.amount.toString());
      setDescription(result.description);
      setType(result.type);
      setShowSMSInput(false);
      setSmsText('');
      handleAutoClassify(result.description);
      toast(t('txn.smsSuccess') || 'SMS processed successfully', 'success');
    } else {
      toast(t('txn.smsError') || 'Invalid SMS format', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempImage(ev.target?.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return {
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
    splitBy,
    setSplitBy,
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
    setCoolingExpireDate,
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
  };
}
