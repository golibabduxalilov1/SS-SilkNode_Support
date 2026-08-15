import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './entities/audit-log.entity';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/** Web Admin Panel — "Loglar" bo'limi, faqat superadmin uchun (bo'lim 5.3 naqshi bilan bir xil). */
@Controller('audit-logs')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@Roles(UserRole.SUPERADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: AuditAction,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const result = await this.auditLogService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      actorId: actorId || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    return {
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }
}
