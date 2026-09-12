export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  details?: Record<string, unknown>;
}
