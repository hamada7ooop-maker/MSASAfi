import type { Asset } from '@/types';

export interface DepreciationScheduleItem {
  year: number;
  yearDate: string;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface AssetMetrics {
  elapsedYears: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  annualDepreciation: number;
  isWarrantyExpired: boolean;
  warrantyDaysLeft: number;
  depreciationSchedule: DepreciationScheduleItem[];
}

/**
 * محرك احتساب إهلاك الأصول وتتبع الضمانات
 */
export const AssetsEngine = {
  /**
   * حساب كافة المقاييس المالية والزمنية للأصل في الوقت الحالي
   */
  calculateMetrics(asset: Asset, baseDateStr = new Date().toISOString().slice(0, 10)): AssetMetrics {
    const P = Number(asset.purchasePrice) || 0;
    const S = asset.salvageValue !== undefined && !Number.isNaN(Number(asset.salvageValue)) ? Number(asset.salvageValue) : P * 0.1; // القيمة التخريدية الافتراضية 10%
    const L = Number(asset.lifespanYears) || 1;
    
    // 1. حساب الزمن المنقضي بالسنوات
    const pDate = new Date(asset.purchaseDate);
    const bDate = new Date(baseDateStr);
    const diffMs = bDate.getTime() - pDate.getTime();
    const elapsedYears = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));

    // 2. توليد جدول الإهلاك السنوي (سنة بسنة)
    const depreciationSchedule: DepreciationScheduleItem[] = [];
    let currentBookVal = P;
    let currentAccDep = 0;

    // توليد السنة 0 (تاريخ الشراء)
    depreciationSchedule.push({
      year: 0,
      yearDate: asset.purchaseDate,
      depreciationExpense: 0,
      accumulatedDepreciation: 0,
      bookValue: P
    });

    const isStraightLine = asset.depreciationMethod === 'straight_line';

    if (isStraightLine) {
      const annualExp = (P - S) / L;
      for (let i = 1; i <= L; i++) {
        const nextDate = new Date(pDate);
        nextDate.setFullYear(pDate.getFullYear() + i);
        
        const exp = Math.min(annualExp, P - S - currentAccDep);
        currentAccDep += exp;
        currentBookVal = P - currentAccDep;

        depreciationSchedule.push({
          year: i,
          yearDate: nextDate.toISOString().slice(0, 10),
          depreciationExpense: exp,
          accumulatedDepreciation: currentAccDep,
          bookValue: currentBookVal
        });
      }
    } else {
      // رصيد متناقص مضاعف Double Declining Balance
      const rate = 2 / L;
      for (let i = 1; i <= L; i++) {
        const nextDate = new Date(pDate);
        nextDate.setFullYear(pDate.getFullYear() + i);

        let exp = currentBookVal * rate;
        // التحقق من عدم تخطي القيمة التخريدية
        if (currentBookVal - exp < S) {
          exp = Math.max(0, currentBookVal - S);
        }
        
        currentAccDep += exp;
        currentBookVal = P - currentAccDep;

        depreciationSchedule.push({
          year: i,
          yearDate: nextDate.toISOString().slice(0, 10),
          depreciationExpense: exp,
          accumulatedDepreciation: currentAccDep,
          bookValue: currentBookVal
        });
      }
    }

    // 3. حساب الاستهلاك المتراكم اللحظي بالتناسب الخطي بين السنوات
    let accumulatedDepreciation = 0;
    const completedYears = Math.floor(elapsedYears);
    const fractionalYear = elapsedYears - completedYears;

    if (completedYears >= L) {
      accumulatedDepreciation = P - S;
    } else {
      const currentYearItem = depreciationSchedule[completedYears];
      const nextYearItem = depreciationSchedule[completedYears + 1];
      
      const accDepStart = currentYearItem ? currentYearItem.accumulatedDepreciation : 0;
      const nextYearExp = nextYearItem ? nextYearItem.depreciationExpense : 0;
      
      accumulatedDepreciation = accDepStart + (fractionalYear * nextYearExp);
      accumulatedDepreciation = Math.min(accumulatedDepreciation, P - S);
    }

    const currentBookValue = P - accumulatedDepreciation;

    // الاستهلاك السنوي للسنة الجارية
    let annualDepreciation = 0;
    if (completedYears < L) {
      const nextYearItem = depreciationSchedule[completedYears + 1];
      annualDepreciation = nextYearItem ? nextYearItem.depreciationExpense : 0;
    }

    // 4. معالجة الضمان
    let isWarrantyExpired = true;
    let warrantyDaysLeft = 0;

    if (asset.warrantyExpiry) {
      const wDate = new Date(asset.warrantyExpiry);
      const diffWarrantyMs = wDate.getTime() - bDate.getTime();
      isWarrantyExpired = diffWarrantyMs <= 0;
      warrantyDaysLeft = Math.max(0, Math.ceil(diffWarrantyMs / (1000 * 60 * 60 * 24)));
    }

    return {
      elapsedYears,
      accumulatedDepreciation,
      currentBookValue,
      annualDepreciation,
      isWarrantyExpired,
      warrantyDaysLeft,
      depreciationSchedule
    };
  }
};
