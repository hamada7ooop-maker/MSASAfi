export interface AppNotification {
  id: string;
  type: 'error' | 'warn' | 'success' | 'info';
  icon: string;
  title: string;
  body: string;
  message?: string;
  page?: string;
  cat?: string;
  amount?: number;
  time?: Date | number;
  canSnooze?: boolean;
  read?: number;
  timestamp?: number;
  tag?: string;
  date?: string;
}
