import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestersService } from './requesters.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User, UserRole } from '../users/entities/user.entity';

function makeStaff(id: string): User {
  return { id, role: UserRole.ADMIN } as User;
}

function makeCitizen(id: string): User {
  return { id, role: UserRole.USER } as User;
}

function makeTicket(overrides: Partial<Ticket>): Ticket {
  return {
    id: overrides.id ?? '1',
    requesterName: null,
    requesterPhone: null,
    createdById: overrides.createdBy?.id ?? 'staff-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as Ticket;
}

describe('RequestersService', () => {
  let service: RequestersService;
  let repository: jest.Mocked<Repository<Ticket>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestersService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RequestersService);
    repository = module.get(getRepositoryToken(Ticket));
  });

  describe('findAll', () => {
    it('does not merge two different same-named citizens into one requester when staff files phone-less tickets for them', async () => {
      const staff = makeStaff('staff-1');
      const tickets = [
        makeTicket({
          id: 'ticket-1',
          requesterName: 'Aliyev Vali',
          requesterPhone: null,
          createdBy: staff,
          createdById: staff.id,
        }),
        makeTicket({
          id: 'ticket-2',
          requesterName: 'Aliyev Vali',
          requesterPhone: null,
          createdBy: staff,
          createdById: staff.id,
        }),
      ];
      repository.find.mockResolvedValue(tickets);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      const keys = result.map((r) => r.key);
      expect(new Set(keys).size).toBe(2);
    });

    it('still groups a citizen-created ticket by their own stable user id when no phone is recorded', async () => {
      const citizen = makeCitizen('citizen-1');
      const tickets = [
        makeTicket({ id: 'ticket-1', createdBy: citizen, createdById: citizen.id, requesterPhone: null }),
        makeTicket({ id: 'ticket-2', createdBy: citizen, createdById: citizen.id, requesterPhone: null }),
      ];
      repository.find.mockResolvedValue(tickets);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].ticketsCount).toBe(2);
    });

    it('groups by phone when requesterPhone is present, regardless of creator', async () => {
      const staff = makeStaff('staff-1');
      const tickets = [
        makeTicket({ id: 'ticket-1', requesterPhone: '+998901112233', createdBy: staff, createdById: staff.id }),
        makeTicket({ id: 'ticket-2', requesterPhone: '+998 90 111 22 33', createdBy: staff, createdById: staff.id }),
      ];
      repository.find.mockResolvedValue(tickets);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].ticketsCount).toBe(2);
    });
  });

  describe('remove', () => {
    it('finds a citizen requester by its user: key, which requires the createdBy relation to be loaded', async () => {
      const citizen = makeCitizen('citizen-1');
      const ticket = makeTicket({ id: 'ticket-1', createdBy: citizen, createdById: citizen.id, requesterPhone: null });
      repository.find.mockResolvedValue([ticket]);
      (repository.save as jest.Mock).mockResolvedValue([ticket]);

      await service.remove('user:citizen-1');

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ relations: expect.arrayContaining(['createdBy']) }),
      );
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
