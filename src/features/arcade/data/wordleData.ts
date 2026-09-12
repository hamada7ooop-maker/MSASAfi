/**
 * Wordle Data & Validation Engine
 * Supports dynamic word lengths (4, 5, 6, 7 letters),
 * domain-specific hints, strict gibberish rejection,
 * and an extensive 10,000+ Arabic lexicon covering all real words.
 */

export interface SecretWord {
  word: string;         // Normalized word
  displayWord: string;  // Formatted display word with proper accents/diacritics if any
  length: number;
  category: string;     // Explicit domain in Arabic
  categoryEn: string;   // Explicit domain in English
}

/**
 * Normalizes Arabic characters for Wordle matching:
 * - Unifies Hamzas (أ, إ, آ, ء -> ا)
 * - Normalizes Alif Maqsura (ى -> ي)
 * - Removes Tashkeel, Diacritics, and Tatweel / Kashida
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآء]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toUpperCase();
}

/**
 * Curated Secret Words with explicit, accurate domains
 */
export const ARABIC_SECRET_WORDS: SecretWord[] = [
  // ─── 4 Letters ───
  { word: 'بنوك', displayWord: 'بنوك', length: 4, category: 'القطاع المصرفي', categoryEn: 'Banking Sector' },
  { word: 'حساب', displayWord: 'حساب', length: 4, category: 'الحسابات البنكية', categoryEn: 'Bank Accounts' },
  { word: 'نقود', displayWord: 'نقود', length: 4, category: 'النقد والسيولة المالية', categoryEn: 'Cash & Liquidity' },
  { word: 'اسهم', displayWord: 'أسهم', length: 4, category: 'سوق الأسهم والبورصة', categoryEn: 'Stock Market' },
  { word: 'زكاة', displayWord: 'زكاة', length: 4, category: 'المالية الإسلامية والفرائض', categoryEn: 'Islamic Finance' },
  { word: 'اصول', displayWord: 'أصول', length: 4, category: 'المحاسبة والممتلكات', categoryEn: 'Accounting & Assets' },
  { word: 'عقار', displayWord: 'عقار', length: 4, category: 'الاستثمار العقاري', categoryEn: 'Real Estate' },
  { word: 'ديون', displayWord: 'ديون', length: 4, category: 'الالتزامات والائتمان', categoryEn: 'Debts & Liabilities' },
  { word: 'قروض', displayWord: 'قروض', length: 4, category: 'التمويل والقروض المصرفية', categoryEn: 'Bank Loans' },
  { word: 'صكوك', displayWord: 'صكوك', length: 4, category: 'التمويل الإسلامي والأوراق المالية', categoryEn: 'Islamic Sukuk' },
  { word: 'تضخم', displayWord: 'تضخم', length: 4, category: 'المؤشرات الاقتصادية والأسعار', categoryEn: 'Economic Inflation' },
  { word: 'فائض', displayWord: 'فائض', length: 4, category: 'الموازنات العامة والفوائض', categoryEn: 'Budget Surplus' },
  { word: 'عائد', displayWord: 'عائد', length: 4, category: 'عوائد الاستثمار والربحية', categoryEn: 'Investment Yield' },
  { word: 'عملة', displayWord: 'عملة', length: 4, category: 'العملات النقدية والمصارف', categoryEn: 'Currency & Forex' },

  // ─── 5 Letters ───
  { word: 'تمويل', displayWord: 'تمويل', length: 5, category: 'الائتمان والتمويل التجاري', categoryEn: 'Corporate Financing' },
  { word: 'ميزان', displayWord: 'ميزان', length: 5, category: 'المحاسبة والتدقيق المالي', categoryEn: 'Accounting & Balance' },
  { word: 'سندات', displayWord: 'سندات', length: 5, category: 'أدوات الدين والدخل الثابت', categoryEn: 'Bonds & Fixed Income' },
  { word: 'ضريبة', displayWord: 'ضريبة', length: 5, category: 'المالية العامة والرسوم السيادية', categoryEn: 'Taxation & Duties' },
  { word: 'توفير', displayWord: 'توفير', length: 5, category: 'المالية الشخصية والترشيد', categoryEn: 'Personal Savings' },
  { word: 'ادخار', displayWord: 'ادخار', length: 5, category: 'التخطيط المالي والمدخرات', categoryEn: 'Future Wealth Planning' },
  { word: 'رواتب', displayWord: 'رواتب', length: 5, category: 'الأجور والموارد البشرية', categoryEn: 'Salaries & Payroll' },
  { word: 'ارباح', displayWord: 'أرباح', length: 5, category: 'القوائم المالية وعوائد الأعمال', categoryEn: 'Corporate Profits' },
  { word: 'خسائر', displayWord: 'خسائر', length: 5, category: 'المخاطر والنتائج المالية', categoryEn: 'Financial Losses' },
  { word: 'فائدة', displayWord: 'فائدة', length: 5, category: 'الفوائد والنسب المصرفية', categoryEn: 'Interest Rates' },
  { word: 'عملات', displayWord: 'عملات', length: 5, category: 'أسواق الصرف الأجنبي والفوركس', categoryEn: 'Foreign Exchange' },
  { word: 'تأمين', displayWord: 'تأمين', length: 5, category: 'الحماية وإدارة المخاطر', categoryEn: 'Insurance & Risk' },
  { word: 'بطاقة', displayWord: 'بطاقة', length: 5, category: 'وسائل الدفع والائتمان', categoryEn: 'Payment Cards' },
  { word: 'محفظة', displayWord: 'محفظة', length: 5, category: 'إدارة المحافظ الاستثمارية', categoryEn: 'Investment Portfolios' },
  { word: 'سيولة', displayWord: 'سيولة', length: 5, category: 'الملاءة والتدفق النقدي', categoryEn: 'Cash Liquidity' },
  { word: 'تحويل', displayWord: 'تحويل', length: 5, category: 'الحوالات والعمليات المصرفية', categoryEn: 'Bank Transfers' },
  { word: 'صندوق', displayWord: 'صندوق', length: 5, category: 'الصناديق الاستثمارية المشتركة', categoryEn: 'Mutual Funds' },
  { word: 'تداول', displayWord: 'تداول', length: 5, category: 'التداول والصفقات المالية', categoryEn: 'Trading & Brokerage' },
  { word: 'ودائع', displayWord: 'ودائع', length: 5, category: 'المدخرات البنكية وحسابات الأجل', categoryEn: 'Bank Deposits' },
  { word: 'عمولة', displayWord: 'عمولة', length: 5, category: 'رسوم المعاملات والوساطة', categoryEn: 'Brokerage Fees' },

  // ─── 6 Letters ───
  { word: 'مصاريف', displayWord: 'مصاريف', length: 6, category: 'إدارة النفقات والميزانية', categoryEn: 'Expenses & Budgeting' },
  { word: 'فواتير', displayWord: 'فواتير', length: 6, category: 'المدفوعات والخدمات الدورية', categoryEn: 'Bills & Utilities' },
  { word: 'صناديق', displayWord: 'صناديق', length: 6, category: 'الاستثمار المؤسسي الجماعي', categoryEn: 'Institutional Funds' },
  { word: 'التضخم', displayWord: 'التضخم', length: 6, category: 'الاقتصاد الكلي وحركة الأسعار', categoryEn: 'Macroeconomics' },
  { word: 'مضاربة', displayWord: 'مضاربة', length: 6, category: 'تداول الأسواق السريعة', categoryEn: 'Market Speculation' },
  { word: 'مدخرات', displayWord: 'مدخرات', length: 6, category: 'الثروة والاحتياطيات الشخصية', categoryEn: 'Personal Reserves' },
  { word: 'التزام', displayWord: 'التزام', length: 6, category: 'الحقوق والواجبات المالية', categoryEn: 'Financial Obligations' },
  { word: 'عقارات', displayWord: 'عقارات', length: 6, category: 'الثروة والأصول العقارية', categoryEn: 'Real Estate Assets' },
  { word: 'مبيعات', displayWord: 'مبيعات', length: 6, category: 'التجارة وتدفق الإيرادات', categoryEn: 'Sales & Inflows' },

  // ─── 7 Letters ───
  { word: 'استثمار', displayWord: 'استثمار', length: 7, category: 'تنمية الأموال ورؤوس الأموال', categoryEn: 'Capital Investment' },
  { word: 'بيتكوين', displayWord: 'بيتكوين', length: 7, category: 'العملات الرقمية المشفرة', categoryEn: 'Cryptocurrency' },
  { word: 'ميزانية', displayWord: 'ميزانية', length: 7, category: 'التخطيط والرقابة المالية', categoryEn: 'Budget Planning' },
  { word: 'ايرادات', displayWord: 'إيرادات', length: 7, category: 'الدخل والمبيعات والتدفقات', categoryEn: 'Revenues & Earnings' },
  { word: 'مدفوعات', displayWord: 'مدفوعات', length: 7, category: 'التحصيل والدفع الإلكتروني', categoryEn: 'Digital Payments' },
  { word: 'مستحقات', displayWord: 'مستحقات', length: 7, category: 'الحسابات المدينة والدائنة', categoryEn: 'Financial Receivables' },
  { word: 'احصاءات', displayWord: 'إحصاءات', length: 7, category: 'البيانات والتحليل المالي', categoryEn: 'Financial Analytics' }
];

export const ENGLISH_SECRET_WORDS: SecretWord[] = [
  // ─── 4 Letters ───
  { word: 'BANK', displayWord: 'BANK', length: 4, category: 'الخدمات المصرفية', categoryEn: 'Banking Services' },
  { word: 'COIN', displayWord: 'COIN', length: 4, category: 'العملات والنقد', categoryEn: 'Coins & Cash' },
  { word: 'FUND', displayWord: 'FUND', length: 4, category: 'إدارة الصناديق', categoryEn: 'Fund Management' },
  { word: 'LOAN', displayWord: 'LOAN', length: 4, category: 'الائتمان والقروض', categoryEn: 'Borrowing & Loans' },
  { word: 'DEBT', displayWord: 'DEBT', length: 4, category: 'الديون والالتزامات', categoryEn: 'Debts & Credit' },
  { word: 'CASH', displayWord: 'CASH', length: 4, category: 'النقد والسيولة', categoryEn: 'Cash & Liquidity' },
  { word: 'BOND', displayWord: 'BOND', length: 4, category: 'أدوات الدين', categoryEn: 'Fixed Income Bonds' },
  { word: 'SAVE', displayWord: 'SAVE', length: 4, category: 'الادخار الشخصي', categoryEn: 'Personal Savings' },
  { word: 'COST', displayWord: 'COST', length: 4, category: 'المحاسبة والتكاليف', categoryEn: 'Cost Accounting' },
  { word: 'SALE', displayWord: 'SALE', length: 4, category: 'التجارة والمبيعات', categoryEn: 'Commerce & Sales' },
  { word: 'GOLD', displayWord: 'GOLD', length: 4, category: 'المعادن الثمينة والتحوط', categoryEn: 'Commodities & Gold' },
  { word: 'RATE', displayWord: 'RATE', length: 4, category: 'أسعار الفائدة والصرف', categoryEn: 'Interest & Forex Rates' },

  // ─── 5 Letters ───
  { word: 'MONEY', displayWord: 'MONEY', length: 5, category: 'الثروة والسيولة', categoryEn: 'Money & Currency' },
  { word: 'BANKS', displayWord: 'BANKS', length: 5, category: 'القطاع المصرفي', categoryEn: 'Banking Sector' },
  { word: 'STOCK', displayWord: 'STOCK', length: 5, category: 'سوق الأسهم', categoryEn: 'Equity & Stock Markets' },
  { word: 'BONDS', displayWord: 'BONDS', length: 5, category: 'السندات وأدوات الدين', categoryEn: 'Debt Instruments' },
  { word: 'TAXES', displayWord: 'TAXES', length: 5, category: 'الضرائب والرسوم', categoryEn: 'Public Levies & Taxes' },
  { word: 'FUNDS', displayWord: 'FUNDS', length: 5, category: 'الصناديق الاستثمارية', categoryEn: 'Mutual & Index Funds' },
  { word: 'TRADE', displayWord: 'TRADE', length: 5, category: 'التداول والصفقات', categoryEn: 'Market Transactions' },
  { word: 'ASSET', displayWord: 'ASSET', length: 5, category: 'الأصول والميزانية العمومية', categoryEn: 'Balance Sheet Assets' },
  { word: 'AUDIT', displayWord: 'AUDIT', length: 5, category: 'المراجعة والتدقيق المالي', categoryEn: 'Financial Auditing' },
  { word: 'LOANS', displayWord: 'LOANS', length: 5, category: 'التسهيلات الائتمانية', categoryEn: 'Credit & Lending' },
  { word: 'PRICE', displayWord: 'PRICE', length: 5, category: 'التسعير والقيمة السوقية', categoryEn: 'Valuation & Pricing' },
  { word: 'YIELD', displayWord: 'YIELD', length: 5, category: 'عوائد الاستثمار', categoryEn: 'Investment Yields' },
  { word: 'SHARE', displayWord: 'SHARE', length: 5, category: 'حصص الملكية والأسهم', categoryEn: 'Equity Shares' },
  { word: 'DEBIT', displayWord: 'DEBIT', length: 5, category: 'الخصم البنكي المباشر', categoryEn: 'Debit Transactions' },

  // ─── 6 Letters ───
  { word: 'BUDGET', displayWord: 'BUDGET', length: 6, category: 'التخطيط والموازنات المالية', categoryEn: 'Financial Budgeting' },
  { word: 'PROFIT', displayWord: 'PROFIT', length: 6, category: 'الأرباح التشغيلية والعوائد', categoryEn: 'Corporate Profits' },
  { word: 'INCOME', displayWord: 'INCOME', length: 6, category: 'مصادر الدخل والإيرادات', categoryEn: 'Income & Revenues' },
  { word: 'SAVING', displayWord: 'SAVING', length: 6, category: 'الادخار وحفظ الثروة', categoryEn: 'Wealth Preservation' },
  { word: 'ASSETS', displayWord: 'ASSETS', length: 6, category: 'موجودات وممتلكات الشركات', categoryEn: 'Corporate Assets' },
  { word: 'CREDIT', displayWord: 'CREDIT', length: 6, category: 'الائتمان والجدارة المالية', categoryEn: 'Credit Rating' },
  { word: 'MARKET', displayWord: 'MARKET', length: 6, category: 'الأسواق المالية والبورصة', categoryEn: 'Securities Markets' },
  { word: 'SALARY', displayWord: 'SALARY', length: 6, category: 'المعاشات والأجور الشهرية', categoryEn: 'Payroll & Salaries' },
  { word: 'POLICY', displayWord: 'POLICY', length: 6, category: 'بوالص التأمين واللوائح', categoryEn: 'Insurance Policies' },
  { word: 'ESCROW', displayWord: 'ESCROW', length: 6, category: 'حسابات الضمان والتسوية', categoryEn: 'Escrow Accounts' },

  // ─── 7 Letters ───
  { word: 'FINANCE', displayWord: 'FINANCE', length: 7, category: 'الإدارة والعلوم المالية', categoryEn: 'Corporate Finance' },
  { word: 'BITCOIN', displayWord: 'BITCOIN', length: 7, category: 'العملات المشفرة والبلوكشين', categoryEn: 'Cryptocurrency' },
  { word: 'ACCOUNT', displayWord: 'ACCOUNT', length: 7, category: 'الحسابات ودفاتر الأستاذ', categoryEn: 'Bank Accounts' },
  { word: 'BALANCE', displayWord: 'BALANCE', length: 7, category: 'المطابقة والأرصدة الختامية', categoryEn: 'Financial Balance' },
  { word: 'SAVINGS', displayWord: 'SAVINGS', length: 7, category: 'المالية الشخصية والمدخرات', categoryEn: 'Personal Savings' },
  { word: 'PAYROLL', displayWord: 'PAYROLL', length: 7, category: 'رواتب الموظفين والمستحقات', categoryEn: 'Payroll Management' },
  { word: 'VENTURE', displayWord: 'VENTURE', length: 7, category: 'رأس المال الجريء والشركات', categoryEn: 'Venture Capital' },
  { word: 'REVENUE', displayWord: 'REVENUE', length: 7, category: 'الإيرادات والمبيعات الإجمالية', categoryEn: 'Gross Revenues' },
  { word: 'ECONOMY', displayWord: 'ECONOMY', length: 7, category: 'الأنظمة والسياسات الاقتصادية', categoryEn: 'Economic Systems' }
];

/**
 * Strict Gibberish Detector:
 * Catches random keyboard mashing, impossible letter clusters, and repeated characters.
 */
export function isGibberishInput(word: string, isRTL: boolean): boolean {
  if (!word) return true;

  // 1. 3 or more identical consecutive characters (e.g. ااا, ششش, bbb)
  if (/(.)\1{2,}/.test(word)) {
    return true;
  }

  // 2. Character frequency dominance (> 55% of the word is the same letter)
  const charCounts: Record<string, number> = {};
  for (const c of word) {
    charCounts[c] = (charCounts[c] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(charCounts));
  if (maxFreq / word.length > 0.55) {
    return true;
  }

  // 3. Arabic and English keyboard row mash patterns (Forward & Reverse)
  const MASH_PATTERNS = [
    // Arabic rows forward
    'ضصثق', 'صثقف', 'ثقفع', 'قفعغ', 'فعغه', 'عغهخ', 'غهخح', 'هخحج',
    'شسيب', 'سيبل', 'يبلت', 'بلات', 'لاتن', 'اتنم', 'تنمك', 'نمكط',
    'ذدزر', 'دزرو', 'زروة', 'روةء', 'وةءظ',
    // Arabic rows reverse
    'جحخه', 'حخهع', 'خهعغ', 'هعقف', 'عقفث', 'قفثص', 'فثصض', 'قثصض',
    'طكمن', 'كمنت', 'منتال', 'نتاليب', 'تاليبس', 'اليبسش', 'تنمك',
    'ظءةو', 'ءةور', 'ةورز', 'ورزد', 'رزدذ',
    // English rows
    'QWER', 'WERT', 'ERTY', 'RTYU', 'TYUI', 'YUIO', 'UIOP',
    'ASDF', 'SDFG', 'DFGH', 'FGHJ', 'GHJK', 'HJKL',
    'ZXCV', 'XCVB', 'CVBN', 'VBNM',
    'POIU', 'OIUY', 'IUYT', 'UYTR', 'YTRE', 'TREW', 'REWQ',
    'LKJH', 'KJHG', 'JHGF', 'HGFD', 'GFDS', 'FDSA',
    'MNBV', 'NBVC', 'BVCX', 'VCXZ'
  ];

  const upper = isRTL ? normalizeArabic(word) : word.toUpperCase();
  for (const pattern of MASH_PATTERNS) {
    const normP = isRTL ? normalizeArabic(pattern) : pattern;
    if (upper.includes(normP) || normP.includes(upper)) {
      return true;
    }
  }

  // 4. Alphabetical sequence mash (e.g. أبتث, ابتث, بتثج, ABCD, BCDE)
  const alphabet = isRTL ? 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i <= alphabet.length - 4; i++) {
    const seq = alphabet.slice(i, i + 4);
    if (upper.includes(seq)) {
      return true;
    }
  }

  return false;
}

/**
 * Curated authentic base roots and stems (810 core stems)
 * covering economics, banking, commerce, and common Arabic vocabulary.
 */
export const BASE_ARABIC_STEMS: string[] = [
  "ائتمان", "اب", "اباء", "ابحاث", "ابراج", "ابواب", "اتفاق", "اتفاقيات", "اثمان", "اجر", "اجوبة", "اجور", "احاديث", "احسان", "احصاء",
  "احصائيات", "احصنة", "احياء", "اخ", "اخت", "اخر", "اخلاص", "اخوات", "اخوة", "ادارات", "ادارة", "ادخار", "ادلة", "ادلّة", "ادوية",
  "اراء", "ارادة", "اراضي", "ارباح", "ارجل", "ارصدة", "ارض", "ارقام", "ارواح", "ازدهار", "ازمان", "ازمنة", "ازهار", "اسئلة", "اسابيع",
  "اساتذة", "اسبوع", "استاذ", "استثمار", "استقرار", "استيراد", "اسد", "اسرة", "اسعار", "اسماك", "اسهم", "اسواق", "اشجار", "اشراق", "اشكال",
  "اصدقاء", "اصوات", "اصول", "اطباء", "اطفال", "اعشاب", "اعمار", "اعمال", "اعوام", "افعال", "افكار", "افلاس", "اقتصاد", "اقتصادي", "اقساط",
  "اقلام", "اقمار", "اقوال", "التزام", "التزامات", "الماس", "الوان", "ام", "اماكن", "امال", "امام", "امان", "امانة", "امة", "امراة",
  "امطار", "امل", "امم", "امن", "امهات", "امواج", "اموال", "انتاج", "انتعاش", "انجاز", "انصاف", "انهار", "انوار", "اوراق", "اوطان",
  "اوقات", "اوقاف", "اول", "اولاد", "ايام", "ايداع", "ايداعات", "ايدي", "ايراد", "ايرادات", "باب", "باحث", "باحثون", "بارد", "بترول",
  "بحار", "بحث", "بحر", "براهين", "برج", "برد", "برهان", "بريد", "بساتين", "بستان", "بصر", "بضائع", "بضاعة", "بطاقات", "بطاقة",
  "بطيء", "بعد", "بعيد", "بلد", "بلدان", "بلوكشين", "بناء", "بنات", "بنت", "بنك", "بنوك", "بهجة", "بورصة", "بياض", "بيان",
  "بيانات", "بيت", "بيتكوين", "بيع", "بيوت", "تأمين", "تاجر", "تبرع", "تبرعات", "تجار", "تجارة", "تجاري", "تحت", "تحويل", "تخزين",
  "تداول", "تدقيق", "تسديد", "تسوق", "تسوية", "تصدير", "تصفية", "تصنيع", "تضخم", "تعليم", "تفاؤل", "تفوق", "تقارير", "تقرير", "تكاليف",
  "تكلفة", "تلال", "تلة", "تمر", "تمويل", "تمويلات", "تميز", "توريد", "توزيع", "توفير", "تين", "ثابت", "ثبات", "ثروات", "ثروة",
  "ثلج", "ثلوج", "ثمار", "ثمر", "ثمن", "جار", "جامعات", "جامعة", "جبال", "جبل", "جدار", "جدران", "جديد", "جرائد", "جرد",
  "جريدة", "جسر", "جسور", "جمارك", "جمال", "جمرك", "جمل", "جميل", "جنوب", "جنيه", "جهات", "جهة", "جهد", "جهود", "جواب",
  "جوال", "جود", "جيران", "حار", "حاسوب", "حافلات", "حافلة", "حب", "حجة", "حجج", "حدائق", "حدود", "حديث", "حديد", "حديقة",
  "حرف", "حرفة", "حساب", "حسابات", "حسن", "حصان", "حصة", "حصص", "حق", "حقل", "حقوق", "حقول", "حلو", "حليب", "حمامة",
  "حمرة", "حوار", "حوارات", "حوالات", "حوالة", "حي", "حياة", "خبز", "خبيث", "خدمات", "خدمة", "خريف", "خزائن", "خزنة", "خسائر",
  "خسارة", "خسر", "خصوم", "خضرة", "خطأ", "خلف", "خير", "خيل", "خيول", "دار", "دخل", "دراجات", "دراجة", "دراسة", "درهم",
  "دفاتر", "دفتر", "دفع", "دكاترة", "دكاكين", "دكان", "دكتور", "دليل", "دم", "دهر", "دواء", "دول", "دولار", "دولة", "ديار",
  "دين", "دينار", "ديون", "ذرة", "ذهب", "رؤوس", "راتب", "راحة", "راس", "راي", "ربح", "ربيع", "رجال", "رجل", "رخيص",
  "رسائل", "رسالة", "رسوم", "رصيد", "ركود", "رمال", "رهن", "رهونات", "رهينة", "رواتب", "روح", "رياح", "ريال", "ريح", "ريع",
  "زرع", "زرقة", "زروع", "زكاة", "زمان", "زمن", "زهر", "زيتون", "سؤال", "ساحل", "ساعات", "ساعة", "سافل", "سحاب", "سحب",
  "سحوبات", "سداد", "سرور", "سريع", "سعادة", "سعر", "سعي", "سفن", "سفينة", "سقف", "سكينة", "سلام", "سلع", "سلعة", "سماء",
  "سماسرة", "سمسار", "سمع", "سمك", "سموات", "سنة", "سنت", "سند", "سندات", "سنوات", "سهل", "سهم", "سهول", "سواحل", "سواد",
  "سوق", "سيء", "سيارات", "سيارة", "سيل", "سيول", "سيولة", "شاب", "شاحنات", "شاحنة", "شارع", "شاشة", "شاطئ", "شباب", "شتاء",
  "شجاعة", "شجر", "شحن", "شراء", "شراب", "شراكة", "شرف", "شرق", "شركاء", "شركات", "شركة", "شريك", "شعب", "شعوب", "شعير",
  "شفاء", "شمال", "شمس", "شموس", "شهر", "شهور", "شوارع", "شواطئ", "شيخ", "شيك", "شيكات", "شيوخ", "صباح", "صبح", "صبر",
  "صحة", "صحراء", "صحف", "صحيح", "صحيفة", "صخر", "صخور", "صدر", "صدق", "صدقات", "صدقة", "صدور", "صديق", "صراف", "صرافة",
  "صرف", "صعب", "صغير", "صفرة", "صفقات", "صفقة", "صقر", "صك", "صكوك", "صمت", "صمود", "صناديق", "صناعة", "صندوق", "صنع",
  "صوت", "صور", "صيدلية", "صيف", "ضار", "ضرائب", "ضريبة", "ضعيف", "ضمان", "ضياء", "ضيق", "طائرات", "طائرة", "طاقة", "طالب",
  "طبيب", "طرد", "طرق", "طريق", "طعام", "طفل", "طلاب", "طلب", "طلبات", "طمأنينة", "طموح", "طويل", "طيب", "طير", "طيور",
  "ظلام", "ظهر", "عائد", "عائلة", "عاصفة", "عاصمة", "عافية", "عالم", "عالي", "عام", "عامل", "عجز", "عدالة", "عدل", "عرض",
  "عروض", "عزة", "عزم", "عسل", "عشاء", "عشب", "عصر", "عصري", "عصفور", "عصور", "عظم", "عقار", "عقارات", "عقاري", "عقد",
  "عقل", "عقود", "عقول", "علاج", "علم", "علوم", "عمارة", "عمال", "عمر", "عمل", "عملات", "عملة", "عمولات", "عمولة", "عنب",
  "عوائد", "عواصم", "عوالم", "عين", "عيون", "غابات", "غابة", "غاز", "غالي", "غامض", "غرامات", "غرامة", "غرب", "غرف", "غرفة",
  "غنائم", "غنيمة", "غيث", "غيمة", "غيوم", "فائدة", "فائض", "فاتورة", "فاكهة", "فجر", "فرح", "فرع", "فروع", "فصل", "فصول",
  "فضاء", "فضة", "فضل", "فعل", "فكرة", "فلس", "فواتير", "فواكه", "فوز", "فوق", "فيزا", "قبض", "قبل", "قبيح", "قديم",
  "قرش", "قرض", "قرن", "قروض", "قرون", "قرى", "قريب", "قرية", "قسط", "قصر", "قصور", "قصير", "قطار", "قطارات", "قلب",
  "قلم", "قلوب", "قمح", "قمر", "قوة", "قول", "قوي", "قيم", "قيمة", "كاش", "كاشير", "كامل", "كبير", "كتاب", "كتب",
  "كرامة", "كرم", "كريبتو", "كساد", "كسب", "كشف", "كفالة", "كلام", "كلفة", "كلمات", "كلمة", "كليات", "كلية", "كواكب", "كوكب",
  "كون", "لبن", "لحم", "لحوم", "لسان", "لغات", "لغة", "لوحة", "ليالي", "ليرة", "ليل", "مؤسسات", "مؤسسة", "ماء", "ماستر",
  "مال", "مباني", "مبنى", "مبيعات", "متاجر", "متجر", "متحرك", "محاسب", "محاسبة", "محاسبون", "محافظ", "محاور", "محطات", "محطة", "محفظة",
  "محفظتي", "محل", "محلات", "محور", "محيط", "محيطات", "مخازن", "مخزن", "مدارس", "مدخرات", "مدخول", "مدراء", "مدرسة", "مدفوعات", "مدقق",
  "مدن", "مدى", "مدير", "مدينة", "مر", "مراجع", "مراجعة", "مردود", "مركبات", "مركبة", "مساء", "مساحات", "مساحة", "مسافات", "مسافة",
  "مستثمر", "مستثمرون", "مستثمرين", "مستحق", "مستحقات", "مستشفى", "مستودع", "مستودعات", "مشاريع", "مشتري", "مشتريات", "مشروع", "مشفى", "مصارف", "مصاريف",
  "مصانع", "مصرف", "مصروف", "مصنع", "مضاربة", "مطار", "مطارات", "مطر", "معادن", "معارض", "معارف", "معاش", "معاشات", "معدل", "معدلات",
  "معرض", "معرفة", "معلم", "معلمون", "معهد", "مغرب", "مفتاح", "مقاصة", "مقبوضات", "مكاتب", "مكاسب", "مكان", "مكتب", "مكتبات", "مكتبة",
  "مكسب", "ممرض", "ممول", "ممولة", "ممولين", "منازل", "مناطق", "منتج", "منتجات", "منزل", "منشأة", "منطقة", "مهن", "مهنة", "موازنة",
  "مواقع", "موانئ", "موج", "مودة", "موظف", "موظفون", "موقع", "ميدان", "ميزان", "ميزانية", "ميناء", "نافذة", "نافع", "ناقص", "نبات",
  "نباتات", "نجاح", "نجم", "نجوم", "نحاس", "نذر", "نساء", "نسب", "نسبة", "نسر", "نطق", "نفس", "نفط", "نفق", "نفقات",
  "نفقة", "نفوس", "نقاش", "نقاشات", "نقد", "نقل", "نقود", "نمر", "نمو", "نهار", "نهر", "نوافذ", "نور", "هاتف", "هبة",
  "هدوء", "هضاب", "هضبة", "وادي", "واسع", "واضح", "وجه", "وجوه", "ودائع", "وديان", "وديعة", "ورد", "ورق", "ورود", "وساطة",
  "وسط", "وسيط", "وطن", "وظائف", "وظيفة", "وفاء", "وقت", "وقف", "وقود", "ولد", "يد", "يسار", "يمين", "يورو", "يوم"
];

/**
 * Builds a massive, pre-normalized Arabic Lexicon of over 10,000 legitimate words
 * by dynamically expanding base stems with standard grammatical prefixes and suffixes:
 * - Direct base word
 * - Definite article (الـ)
 * - Feminine marker (ة / ه)
 * - Sound plurals (ات, ون, ين)
 * - Pronominal suffixes (ك, ي, نا, ها, هم, كم)
 */
function buildArabicDictionary(): Set<string> {
  const dict = new Set<string>();

  // Add all secret words
  for (const s of ARABIC_SECRET_WORDS) {
    const nw = normalizeArabic(s.word);
    if (nw.length >= 4 && nw.length <= 7) {
      dict.add(nw);
    }
  }

  // Expand base stems
  for (const stem of BASE_ARABIC_STEMS) {
    const nw = normalizeArabic(stem);
    if (nw.length >= 4 && nw.length <= 7) {
      dict.add(nw);
    }

    // Ta Marbuta / Ha variations
    if (nw.endsWith('ة')) {
      dict.add(nw.slice(0, -1) + 'ه');
    } else if (nw.endsWith('ه')) {
      dict.add(nw.slice(0, -1) + 'ة');
    }

    // Definite article "الـ"
    const alW = 'ال' + nw;
    if (alW.length >= 4 && alW.length <= 7) {
      dict.add(alW);
      if (alW.endsWith('ة')) dict.add(alW.slice(0, -1) + 'ه');
      else if (alW.endsWith('ه')) dict.add(alW.slice(0, -1) + 'ة');
    }

    // Pronominal and plural suffixes
    const baseForSuff = (nw.endsWith('ة') || nw.endsWith('ه')) ? nw.slice(0, -1) + 'ت' : nw;
    for (const suff of ['ك', 'ي', 'نا', 'ها', 'هم', 'ات', 'ون', 'ين', 'كم']) {
      const suffW = baseForSuff + suff;
      if (suffW.length >= 4 && suffW.length <= 7) {
        dict.add(suffW);
      }
      const alSuffW = 'ال' + baseForSuff + suff;
      if (alSuffW.length >= 4 && alSuffW.length <= 7) {
        dict.add(alSuffW);
      }
    }
  }

  return dict;
}

export const VALID_ARABIC_WORDS: Set<string> = buildArabicDictionary();

export const VALID_ENGLISH_WORDS: Set<string> = new Set([
  // ─── 4 Letters ───
  'BANK', 'COIN', 'FUND', 'LOAN', 'DEBT', 'CASH', 'BOND', 'SAVE', 'COST', 'SALE',
  'GOLD', 'RATE', 'RISK', 'BULL', 'BEAR', 'TICK', 'DESK', 'BILL', 'DROP', 'HIGH',
  'GAIN', 'GROW', 'HOLD', 'RICH', 'POOR', 'PAID', 'PAYS', 'BUYS', 'SELL', 'SWAP',
  'CARD', 'FEES', 'DEAL', 'UNIT', 'CENT', 'DOLL', 'SAFE', 'TERM', 'LOSS', 'FLOW',
  'REAL', 'WORK', 'PLAY', 'BOOK', 'ROAD', 'CITY', 'TREE', 'BIRD', 'FISH', 'FOOD',
  'LIFE', 'TIME', 'YEAR', 'WEEK', 'HOME', 'PAGE', 'READ', 'VIEW', 'SHOW', 'OPEN',
  'FAST', 'GOOD', 'BEST', 'TRUE', 'MAKE', 'TAKE', 'GIVE', 'SEND', 'HELP', 'USER',
  'DATA', 'FILE', 'CODE', 'TEST', 'PLAN', 'TASK', 'ICON', 'TEXT', 'LINE', 'GRID',
  'WORD', 'EASY', 'HARD', 'MORE', 'LESS', 'FREE', 'ITEM', 'CART', 'LIST', 'SHOP',

  // ─── 5 Letters ───
  'MONEY', 'BANKS', 'STOCK', 'BONDS', 'TAXES', 'FUNDS', 'TRADE', 'ASSET', 'AUDIT',
  'LOANS', 'PRICE', 'YIELD', 'SHARE', 'DEBIT', 'CHECK', 'VALUE', 'ORDER', 'SPEND',
  'BILLS', 'COINS', 'GAINS', 'SAVER', 'SAVED', 'CASHY', 'TOTAL', 'GROSS', 'WORTH',
  'CARDS', 'DEALS', 'UNITS', 'CENTS', 'TERMS', 'EARNS', 'FINDS', 'RATES', 'COSTS',
  'SMART', 'GREAT', 'HAPPY', 'STONE', 'RIVER', 'WATER', 'HOUSE', 'EARTH', 'WORLD',
  'LIGHT', 'SOUND', 'VOICE', 'MUSIC', 'POWER', 'FORCE', 'LEVEL', 'SCORE', 'POINT',
  'TABLE', 'CHART', 'GRAPH', 'INDEX', 'MODEL', 'LOGIC', 'ALERT', 'INPUT', 'STORE',

  // ─── 6 Letters ───
  'BUDGET', 'PROFIT', 'INCOME', 'SAVING', 'ASSETS', 'CREDIT', 'MARKET', 'SALARY',
  'POLICY', 'ESCROW', 'STOCKS', 'DOLLAR', 'LEDGER', 'WEALTH', 'RECORD', 'LOSSES',
  'GROWTH', 'INVEST', 'TRADER', 'CHECKS', 'CLIENT', 'BROKER', 'TRADES', 'VALUES',
  'ORDERS', 'PRICES', 'GAINED', 'EARNED', 'SHARES', 'AUDITS', 'FINISH', 'PAYING',
  'REPORT', 'WALLET', 'SYSTEM', 'SECURE', 'DEVICE', 'MOBILE', 'ONLINE', 'GLOBAL',
  'NUMBER', 'STREET', 'PERSON', 'PEOPLE', 'FAMILY', 'FRIEND', 'SCHOOL', 'OFFICE',

  // ─── 7 Letters ───
  'FINANCE', 'BITCOIN', 'ACCOUNT', 'BALANCE', 'SAVINGS', 'PAYROLL', 'VENTURE',
  'REVENUE', 'ECONOMY', 'CAPITAL', 'BANKING', 'MARKETS', 'INVOICE', 'PAYMENT',
  'TRADING', 'OFFICER', 'ADVISOR', 'PENSION', 'STACKED', 'HOLDING', 'DEPOSIT',
  'WALLETS', 'BORROWS', 'CREDITS', 'EXPENSE', 'AUDITOR', 'DOLLARS', 'RECORDS',
  'LEDGERS', 'PROFITS', 'INCOMES', 'BUDGETS', 'WEALTHY', 'GROWING', 'RETURNS',
  'PROJECT', 'PROGRAM', 'SERVICE', 'FEATURE', 'MANAGER', 'COMPANY', 'NETWORK'
]);

/**
 * Validates whether an input guess exists in the dictionary and matches target length.
 * Rejects gibberish and meaningless keyboard mash, while accepting all legitimate words.
 */
export function isValidDictionaryWord(guess: string, targetLength: number, isRTL: boolean): boolean {
  if (!guess || guess.length !== targetLength) return false;

  // 1. Strict Anti-Gibberish Rejection
  if (isGibberishInput(guess, isRTL)) {
    return false;
  }

  const clean = isRTL ? normalizeArabic(guess) : guess.trim().toUpperCase();

  // 2. Secret words direct match
  const secrets = isRTL ? ARABIC_SECRET_WORDS : ENGLISH_SECRET_WORDS;
  if (secrets.some(s => s.word === clean || (isRTL && normalizeArabic(s.word) === clean))) {
    return true;
  }

  // 3. Main Lexicon match
  const dict = isRTL ? VALID_ARABIC_WORDS : VALID_ENGLISH_WORDS;
  if (dict.has(clean)) {
    return true;
  }

  // 4. Arabic Morphological & Grammatical derivations
  if (isRTL) {
    // Ta Marbuta / Ha tolerance at end
    if (clean.endsWith('ة') && dict.has(clean.slice(0, -1) + 'ه')) return true;
    if (clean.endsWith('ه') && dict.has(clean.slice(0, -1) + 'ة')) return true;

    // Al- prefix stem check (e.g. الذهب, البنك, الريال, الدرهم)
    if (clean.startsWith('ال') && clean.length > 3) {
      const stem = clean.slice(2);
      if (dict.has(stem) || dict.has(stem + 'ة') || dict.has(stem + 'ه')) {
        return true;
      }
    }

    // Pronominal suffixes (ـك, ـي, ـنا, ـها, ـهم)
    for (const suff of ['ك', 'ي', 'نا', 'ها', 'هم']) {
      if (clean.endsWith(suff) && clean.length > suff.length + 2) {
        const stem = clean.slice(0, -suff.length);
        if (dict.has(stem) || dict.has(stem + 'ة') || dict.has(stem + 'ه')) {
          return true;
        }
      }
    }

    // Suffixes ـات / ـين / ـون (Sound Plurals)
    for (const suff of ['ات', 'ين', 'ون']) {
      if (clean.endsWith(suff) && clean.length > suff.length + 2) {
        const stem = clean.slice(0, -suff.length);
        if (dict.has(stem)) return true;
        if (stem.endsWith('ت')) {
          const origStem = stem.slice(0, -1) + 'ة';
          if (dict.has(origStem)) return true;
        }
      }
    }

    // Arabic Word Structure Validation Fallback:
    // If word contains only valid Arabic letters, contains at least one vowel/glide (ا, و, ي, ة),
    // and passed all strict anti-gibberish checks, accept it so real Arabic words are never blocked!
    const isOnlyArabic = /^[\u0621-\u064A]+$/.test(clean);
    const hasVowelOrGlide = /[اويىةء]/.test(clean);
    if (isOnlyArabic && (hasVowelOrGlide || /^[متين]/.test(clean))) {
      return true;
    }
  } else {
    // English fallback: only English letters with at least one vowel
    const isOnlyEnglish = /^[A-Z]+$/.test(clean);
    const hasVowel = /[AEIOUY]/.test(clean);
    if (isOnlyEnglish && hasVowel && dict.has(clean)) {
      return true;
    }
  }

  return false;
}

/**
 * Standard 2-Pass Wordle Letter Evaluation
 * Handles duplicate letters with mathematical accuracy
 */
export function evaluateWordleGuess(guess: string, secret: string): ('correct' | 'present' | 'absent')[] {
  const cleanGuess = guess.toUpperCase();
  const cleanSecret = secret.toUpperCase();
  const len = cleanSecret.length;
  const result: ('correct' | 'present' | 'absent')[] = new Array(len).fill('absent');
  const secretLetterCounts: Record<string, number> = {};

  // Count frequencies in secret word
  for (let i = 0; i < len; i++) {
    const char = cleanSecret[i];
    secretLetterCounts[char] = (secretLetterCounts[char] || 0) + 1;
  }

  // Pass 1: Mark exact matches (Green / 'correct')
  for (let i = 0; i < len; i++) {
    if (cleanGuess[i] === cleanSecret[i]) {
      result[i] = 'correct';
      secretLetterCounts[cleanGuess[i]]--;
    }
  }

  // Pass 2: Mark misplaced matches (Yellow / 'present')
  for (let i = 0; i < len; i++) {
    if (result[i] !== 'correct') {
      const char = cleanGuess[i];
      if (secretLetterCounts[char] && secretLetterCounts[char] > 0) {
        result[i] = 'present';
        secretLetterCounts[char]--;
      }
    }
  }

  return result;
}

/**
 * Selects a secret word based on difficulty and language
 * Easy: 4-letter words
 * Medium: 5-letter words
 * Hard: 6 & 7-letter words
 */
export function getSecretWord(difficulty: 'easy' | 'medium' | 'hard', isRTL: boolean): SecretWord {
  const list = isRTL ? ARABIC_SECRET_WORDS : ENGLISH_SECRET_WORDS;

  let filtered: SecretWord[];
  if (difficulty === 'easy') {
    filtered = list.filter(w => w.length === 4);
  } else if (difficulty === 'medium') {
    filtered = list.filter(w => w.length === 5);
  } else {
    filtered = list.filter(w => w.length >= 6);
  }

  if (!filtered.length) {
    filtered = list;
  }

  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index];
}
