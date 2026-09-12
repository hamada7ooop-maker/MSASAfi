export interface ClassificationRule {
  id: string;
  pattern: string;
  category: string;
  isRegex: boolean;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
