/**
 * Represents a financial goal.
 */
export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  targetDate?: string;
  autopilotPercent?: number;
  icon?: string;
  color?: string;
  accountId?: string;
  createdAt?: string | number;
  isDemo?: number | boolean;
}
