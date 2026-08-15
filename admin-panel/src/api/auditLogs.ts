import { api } from './client';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  actorId?: string;
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogListResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAuditLogs(filters: AuditLogFilters): Promise<AuditLogListResult> {
  const res = await api.get('/audit-logs', { params: filters });
  return { data: res.data.data, ...res.data.meta };
}
