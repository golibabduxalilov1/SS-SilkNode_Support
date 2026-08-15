import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditAction, AuditLog } from './entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<Repository<AuditLog>>;
  let queryBuilder: {
    orderBy: jest.Mock;
    andWhere: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn((data) => data),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get(AuditLogService);
    repository = module.get(getRepositoryToken(AuditLog));
  });

  describe('log', () => {
    it('saves an audit log entry with the given fields', async () => {
      repository.save.mockResolvedValue({} as AuditLog);

      await service.log('1', 'Superadmin', AuditAction.EMPLOYEE_CREATED, 'user', '2', {
        role: 'admin',
      });

      expect(repository.create).toHaveBeenCalledWith({
        actorId: '1',
        actorName: 'Superadmin',
        action: AuditAction.EMPLOYEE_CREATED,
        entityType: 'user',
        entityId: '2',
        metadata: { role: 'admin' },
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('does not throw when saving fails — the caller must not be interrupted', async () => {
      repository.save.mockRejectedValue(new Error('db unavailable'));

      await expect(
        service.log('1', 'Superadmin', AuditAction.EMPLOYEE_DELETED, 'user', '2'),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('applies pagination defaults and returns total count', async () => {
      const logs = [{ id: 'a' } as AuditLog];
      queryBuilder.getManyAndCount.mockResolvedValue([logs, 1]);

      const result = await service.findAll({});

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({ data: logs, total: 1, page: 1, limit: 20 });
    });

    it('caps the page size at the maximum allowed limit', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ limit: 500, page: 2 });

      expect(queryBuilder.skip).toHaveBeenCalledWith(100);
      expect(queryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('filters by actorId, entityType, action and date range', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-02-01');

      await service.findAll({
        actorId: '5',
        entityType: 'ticket',
        action: AuditAction.TICKET_STATUS_CHANGED,
        dateFrom,
        dateTo,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.actorId = :actorId', { actorId: '5' });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.entityType = :entityType', {
        entityType: 'ticket',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.action = :action', {
        action: AuditAction.TICKET_STATUS_CHANGED,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.createdAt >= :dateFrom', { dateFrom });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.createdAt <= :dateTo', { dateTo });
    });
  });
});
