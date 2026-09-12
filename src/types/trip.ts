export interface Trip {
  id: string;
  name: string;
  currency: string;
  limit: number;
  exchangeRate: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  color?: string;
  description?: string;
  isDemo?: number | boolean;
}
