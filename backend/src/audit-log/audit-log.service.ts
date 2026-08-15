import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLog } from './entities/audit-log.entity';

export interface FindAuditLogsFilter {
  actorId?: string;
  entityType?: string;
  action?: AuditAction;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log yozish amaliy operatsiyani to'xtatmasligi kerak — shuning uchun xatolik
   * throw qilinmaydi, faqat log qilinadi (chaqiruvchi service davom etaveradi).
   */
  async log(
    actorId: string,
    actorName: string,
    action: AuditAction,
    entityType: string,
    entityId?: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      const entry = this.auditLogRepository.create({
        actorId,
        actorName,
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: metadata ?? null,
      });
      await this.auditLogRepository.save(entry);
    } catch (err) {
      this.logger.error(
        `Audit log yozib bo'lmadi: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  async findAll(filter: FindAuditLogsFilter): Promise<PaginatedAuditLogs> {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit =
      filter.limit && filter.limit > 0 ? Math.min(filter.limit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    const qb = this.auditLogRepository.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (filter.actorId) qb.andWhere('log.actorId = :actorId', { actorId: filter.actorId });
    if (filter.entityType) qb.andWhere('log.entityType = :entityType', { entityType: filter.entityType });
    if (filter.action) qb.andWhere('log.action = :action', { action: filter.action });
    if (filter.dateFrom) qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) qb.andWhere('log.createdAt <= :dateTo', { dateTo: filter.dateTo });

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
