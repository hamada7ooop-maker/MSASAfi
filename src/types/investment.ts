export interface Investment {
  id: string;
  name: string;
  type: 'stocks' | 'crypto' | 'real_estate' | 'gold' | 'other' | 'reit' | 'bonds';
  value: number;
  cost: number;
  icon?: string;
  accountId?: string;
  notes?: string;
  createdAt?: string | number;
  isDemo?: number | boolean;
}
