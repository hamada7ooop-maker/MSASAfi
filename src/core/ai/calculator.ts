/**
 * Financial calculation engine for Zakat, VAT, and retirement planning.
 */
import { calculateZakat as engineCalculateZakat } from '@/core/zakatEngine';

/**
 * @deprecated Use `calculateZakat` from `@/core/zakatEngine` instead.
 *
 * This thin wrapper is kept only so existing callers keep working. It now
 * delegates to the single zakat engine rather than carrying its own copy of
 * the rules (this file previously hard-coded a stale 235/gram default and had
 * no silver nisab at all, so it disagreed with the calculator screen).
 *
 * Note this signature cannot express debt deduction or the hawl, so it always
 * reports the gross figure. Prefer the engine directly for anything
 * user-facing.
 */
export function calculateZakat(
  amount: number,
  goldPrice = 0
): { nisab: number; isAboveNisab: boolean; zakatAmount: number } {
  const { nisab, isAboveNisab, zakatAmount } = engineCalculateZakat({
    assets: { cash: amount },
    goldPricePerGram: goldPrice,
    silverPricePerGram: 0,
    nisabMethod: 'gold',
  });
  return { nisab, isAboveNisab, zakatAmount };
}

export function calculateVAT(amount: number, rate = 15): { vatAmount: number; totalWithVAT: number } {
  const vatAmount = amount * (rate / 100);
  const totalWithVAT = amount + vatAmount;
  return { vatAmount, totalWithVAT };
}

export function simulateRetirement(inputs: {
  currentAge: number;
  retireAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  inflationRate: number;
}): Array<{ age: number; balance: number; contributions: number }> {
  const years = inputs.retireAge - inputs.currentAge;
  const points: Array<{ age: number; balance: number; contributions: number }> = [];
  
  let balance = inputs.currentSavings;
  let contributions = inputs.currentSavings;
  
  // Real return via the Fisher equation, not naive subtraction.
  // At 7% nominal and 3% inflation, subtraction gives 4.00% but the true
  // real rate is 3.88%. Over a 30-year horizon that gap compounds into a
  // materially overstated balance.
  const nominal = inputs.expectedReturn / 100;
  const inflation = inputs.inflationRate / 100;
  const realReturnRate = (1 + nominal) / (1 + inflation) - 1;
  const monthlyRate = realReturnRate / 12;
  
  points.push({ age: inputs.currentAge, balance, contributions });
  
  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      balance = balance * (1 + monthlyRate) + inputs.monthlyContribution;
      contributions += inputs.monthlyContribution;
    }
    points.push({
      age: inputs.currentAge + year,
      balance: Math.round(balance),
      contributions: Math.round(contributions)
    });
  }
  
  return points;
}
