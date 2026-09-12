export interface Challenge {
  id: string;
  name: string;
  type: 'avoid' | 'save' | 'custom';
  duration: number; // in days
  progress: number; // in percentage or absolute value depending on type
  startDate?: string;
  category?: string;
  categoryId?: string;
  target?: number; // Target amount to save
  saved?: number;  // Amount saved so far
  reward?: string; // Emoji or description
  icon?: string;
  createdAt?: string | number;
  isDemo?: number | boolean;
  deleted?: boolean;
}
