export interface AmortizationScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface AmortizationSummary {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  schedule: AmortizationScheduleRow[];
}

/**
 * Calculates the amortization schedule for a loan.
 * 
 * @param principal The initial loan amount (total debt).
 * @param annualRate The annual interest rate as a percentage (e.g. 10 for 10%).
 * @param termMonths The loan term in months (e.g. 12).
 * @param interestType The type of interest: 'declining' or 'flat'.
 */
export function calculateAmortization(
  principal: number,
  annualRate: number,
  termMonths: number,
  interestType: 'declining' | 'flat'
): AmortizationSummary {
  const schedule: AmortizationScheduleRow[] = [];
  
  if (principal <= 0 || termMonths <= 0) {
    return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0, schedule: [] };
  }

  // Handle 0% interest rate case
  if (annualRate <= 0) {
    const monthlyPayment = principal / termMonths;
    let remaining = principal;
    
    for (let m = 1; m <= termMonths; m++) {
      remaining -= monthlyPayment;
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: monthlyPayment,
        interest: 0,
        remainingBalance: Math.max(0, remaining),
      });
    }
    
    return {
      monthlyPayment,
      totalInterest: 0,
      totalPayment: principal,
      schedule,
    };
  }

  const monthlyRate = (annualRate / 100) / 12;

  if (interestType === 'flat') {
    // 1. FLAT INTEREST RATE
    const monthlyInterest = principal * (annualRate / 100) / 12;
    const monthlyPrincipal = principal / termMonths;
    const monthlyPayment = monthlyPrincipal + monthlyInterest;
    const totalInterest = monthlyInterest * termMonths;
    const totalPayment = principal + totalInterest;

    let remaining = principal;
    for (let m = 1; m <= termMonths; m++) {
      remaining -= monthlyPrincipal;
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: monthlyPrincipal,
        interest: monthlyInterest,
        remainingBalance: Math.max(0, remaining),
      });
    }

    return {
      monthlyPayment,
      totalInterest,
      totalPayment,
      schedule,
    };
  } else {
    // 2. DECLINING INTEREST RATE (Standard Amortization EMI)
    // EMI Formula: P * r * (1+r)^n / ((1+r)^n - 1)
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                (Math.pow(1 + monthlyRate, termMonths) - 1);

    let remaining = principal;
    let totalInterest = 0;

    for (let m = 1; m <= termMonths; m++) {
      const interest = remaining * monthlyRate;
      const monthlyPrincipal = emi - interest;
      remaining -= monthlyPrincipal;
      totalInterest += interest;

      schedule.push({
        month: m,
        payment: emi,
        principal: monthlyPrincipal,
        interest: interest,
        remainingBalance: Math.max(0, remaining),
      });
    }

    return {
      monthlyPayment: emi,
      totalInterest,
      totalPayment: principal + totalInterest,
      schedule,
    };
  }
}
