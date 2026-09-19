import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };
  let manager: {
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let organizationsRepository: { manager: { transaction: jest.Mock } };

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    manager = {
      query: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => queryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((_entity, data) => data),
    };

    organizationsRepository = {
      manager: { transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationsRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: { count: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { count: jest.fn() },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OrganizationsService);
  });

  describe('create', () => {
    it('creates the organization when no existing org shares its name', async () => {
      manager.save.mockResolvedValue({ id: '1', name: 'Lazana' } as Organization);

      const result = await service.create('Lazana');

      expect(manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext(LOWER($1))::bigint)',
        ['Lazana'],
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('LOWER(organization.name) = LOWER(:name)', {
        name: 'Lazana',
      });
      expect(manager.save).toHaveBeenCalled();
      expect(result).toEqual({ id: '1', name: 'Lazana' });
    });

    // Regression: two "Lazana" rows were appearing in the admin organizations
    // list because create() never checked for an existing org with the same
    // name before inserting. This must now be rejected as a conflict.
    it('rejects creating a second organization with an already-used name', async () => {
      queryBuilder.getOne.mockResolvedValue({ id: '1', name: 'Lazana' } as Organization);

      await expect(service.create('Lazana')).rejects.toThrow(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('treats names as duplicates case-insensitively and ignoring surrounding whitespace', async () => {
      queryBuilder.getOne.mockResolvedValue({ id: '1', name: 'Lazana' } as Organization);

      await expect(service.create('  lazana  ')).rejects.toThrow(ConflictException);
      expect(queryBuilder.where).toHaveBeenCalledWith('LOWER(organization.name) = LOWER(:name)', {
        name: 'lazana',
      });
    });

    it('rejects a whitespace-only name without touching the database', async () => {
      await expect(service.create('   ')).rejects.toThrow(BadRequestException);
      expect(organizationsRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('serializes the duplicate check via a per-name advisory lock, closing the create/create race', async () => {
      manager.save.mockResolvedValue({ id: '1', name: 'Lazana' } as Organization);

      await service.create('Lazana');

      // The lock must be acquired before the duplicate check runs, so a second
      // concurrent request for the same name blocks until the first commits.
      const lockCallOrder = manager.query.mock.invocationCallOrder[0];
      const checkCallOrder = queryBuilder.getOne.mock.invocationCallOrder[0];
      expect(lockCallOrder).toBeLessThan(checkCallOrder);
    });
  });

  describe('update', () => {
    it('rejects renaming an organization to a name already used by another one', async () => {
      manager.findOne.mockResolvedValue({ id: '2', name: 'BYW' } as Organization);
      queryBuilder.getOne.mockResolvedValue({ id: '1', name: 'Lazana' } as Organization);

      await expect(service.update('2', { name: 'Lazana' })).rejects.toThrow(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('excludes the organization itself when checking for name conflicts', async () => {
      const organization = { id: '1', name: 'Lazana' } as Organization;
      manager.findOne.mockResolvedValue(organization);
      manager.save.mockResolvedValue(organization);

      await service.update('1', { name: 'Lazana' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('organization.id != :excludeId', {
        excludeId: '1',
      });
    });

    it('throws NotFoundException when the organization does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'Lazana' })).rejects.toThrow(NotFoundException);
    });

    it('rejects renaming to a whitespace-only name without touching the database', async () => {
      await expect(service.update('1', { name: '   ' })).rejects.toThrow(BadRequestException);
      expect(organizationsRepository.manager.transaction).not.toHaveBeenCalled();
    });
  });
});
