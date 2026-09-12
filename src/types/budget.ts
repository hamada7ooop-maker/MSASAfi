/**
 * Represents a monthly budget for a category.
 */
export interface Budget {
  id: string;
  category: string;
  limit: number;
  name?: string;
  categories?: string[];
  period?: string;
  rollover?: boolean;
  spent?: number;
  month?: string;
  createdAt?: string | number;
  isDemo?: number | boolean;
}
