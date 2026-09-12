export interface Installment {
  id: string;
  name: string;
  amount: number;
  totalPayments: number;
  paidPayments: number;
  dueDate: string; // Due date for the next payment (ISO date string)
  person?: string; // Lender / Store name
  accountId?: string; // Linked account to pay from
  notes?: string;
  isDemo?: number | boolean;
}
