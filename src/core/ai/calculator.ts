/**
 * Financial calculation engine for Zakat, VAT, and retirement planning.
 */

export function calculateZakat(amount: number, goldPrice = 235): { nisab: number; isAboveNisab: boolean; zakatAmount: number } {
  const nisab = 85 * goldPrice;
  const isAboveNisab = amount >= nisab;
  const zakatAmount = isAboveNisab ? amount * 0.025 : 0;
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
  
  const realReturnRate = (inputs.expectedReturn - inputs.inflationRate) / 100;
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
