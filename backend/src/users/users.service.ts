import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/entities/audit-log.entity';

function actorDisplayName(actor: User): string {
  return actor.fullname ?? actor.adminLogin ?? actor.id;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly auditLogService: AuditLogService,
  ) {}

  findByTelegramId(telegramId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { telegramId } });
  }

  findByAdminLogin(adminLogin: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { adminLogin } });
  }

  async findOrCreateByTelegramId(
    telegramId: string,
    defaults: Partial<User>,
  ): Promise<{ user: User; created: boolean }> {
    const existing = await this.findByTelegramId(telegramId);
    if (existing) {
      return { user: existing, created: false };
    }
    const created = this.usersRepository.create({ telegramId, ...defaults });
    const user = await this.usersRepository.save(created);
    return { user, created: true };
  }

  async markStarted(telegramId: string): Promise<User> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) {
      throw new Error(`Foydalanuvchi topilmadi: telegramId=${telegramId}`);
    }
    user.isStarted = true;
    user.startedAt = new Date();
    return this.usersRepository.save(user);
  }

  async verifyPhone(telegramId: string, phoneNumber: string): Promise<User> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) {
      throw new Error(`Foydalanuvchi topilmadi: telegramId=${telegramId}`);
    }
    user.phoneNumber = phoneNumber;
    user.isPhoneVerified = true;
    user.phoneVerifiedAt = new Date();
    return this.usersRepository.save(user);
  }

  findAdmins(): Promise<User[]> {
    return this.usersRepository.find({
      where: [{ role: UserRole.ADMIN }, { role: UserRole.SUPERADMIN }],
    });
  }

  /** Web Admin Panel — Xodimlar sahifasi uchun barcha admin/superadmin ro'yxati. */
  findAllAdmins(organizationId?: string): Promise<User[]> {
    return this.usersRepository.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.SUPERADMIN]),
        ...(organizationId ? { organizationId } : {}),
      },
      relations: { organization: true },
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: { organization: true } });
  }

  /** Loyihada faqat bitta superadmin bo'lishini ta'minlaydi. */
  private async assertSuperadminSlotAvailable(excludeUserId?: string): Promise<void> {
    const existing = await this.usersRepository.findOne({
      where: { role: UserRole.SUPERADMIN },
    });
    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException("Loyihada faqat bitta superadmin bo'lishi mumkin.");
    }
  }

  async createAdmin(dto: CreateUserDto, actor: User): Promise<User> {
    const existing = await this.findByAdminLogin(dto.adminLogin);
    if (existing) {
      throw new ConflictException("Bu login band, boshqasini tanlang.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let telegramOwner: User | null = null;
    if (dto.telegramId) {
      telegramOwner = await this.findByTelegramId(dto.telegramId);
      if (telegramOwner?.adminLogin) {
        throw new ConflictException('Bu Telegram ID allaqachon boshqa xodimga biriktirilgan.');
      }
    }

    if (dto.role === UserRole.SUPERADMIN) {
      await this.assertSuperadminSlotAvailable(telegramOwner?.id);
    }

    let created: User;
    if (telegramOwner) {
      telegramOwner.fullname = dto.fullname;
      telegramOwner.adminLogin = dto.adminLogin;
      telegramOwner.passwordHash = passwordHash;
      telegramOwner.role = dto.role ?? UserRole.ADMIN;
      telegramOwner.organizationId = dto.organizationId ?? null;
      telegramOwner.isActive = true;
      created = await this.usersRepository.save(telegramOwner);
    } else {
      const user = this.usersRepository.create({
        fullname: dto.fullname,
        adminLogin: dto.adminLogin,
        passwordHash,
        role: dto.role ?? UserRole.ADMIN,
        organizationId: dto.organizationId ?? null,
        isActive: true,
        isStarted: false,
        isPhoneVerified: false,
        telegramId: dto.telegramId ?? null,
      });
      created = await this.usersRepository.save(user);
    }

    await this.auditLogService.log(
      actor.id,
      actorDisplayName(actor),
      AuditAction.EMPLOYEE_CREATED,
      'user',
      created.id,
      { fullname: created.fullname, adminLogin: created.adminLogin, role: created.role },
    );

    return created;
  }

  async updateAdmin(id: string, dto: UpdateUserDto, actor: User): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi.');
    }

    const previousRole = user.role;

    if (dto.fullname !== undefined) user.fullname = dto.fullname;
    if (dto.adminLogin !== undefined && dto.adminLogin !== user.adminLogin) {
      const existing = await this.findByAdminLogin(dto.adminLogin);
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Bu login band, boshqasini tanlang.');
      }
      user.adminLogin = dto.adminLogin;
    }
    if (dto.role !== undefined) {
      if (dto.role === UserRole.SUPERADMIN) {
        await this.assertSuperadminSlotAvailable(user.id);
      }
      user.role = dto.role;
    }
    if (dto.organizationId !== undefined) user.organizationId = dto.organizationId;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.telegramId !== undefined) {
      if (!dto.telegramId) {
        user.telegramId = null;
      } else {
        const owner = await this.findByTelegramId(dto.telegramId);
        if (owner && owner.id !== user.id) {
          throw new ConflictException('Bu Telegram ID allaqachon boshqa xodimga biriktirilgan.');
        }
        user.telegramId = dto.telegramId;
      }
    }

    const updated = await this.usersRepository.save(user);

    if (dto.role !== undefined && dto.role !== previousRole) {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.EMPLOYEE_ROLE_CHANGED,
        'user',
        updated.id,
        { from: previousRole, to: updated.role },
      );
    } else {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.EMPLOYEE_UPDATED,
        'user',
        updated.id,
        { fullname: updated.fullname, adminLogin: updated.adminLogin, isActive: updated.isActive },
      );
    }

    return updated;
  }

  async deactivateAdmin(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi.');
    }
    user.isActive = false;
    return this.usersRepository.save(user);
  }

  save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async remove(id: string, actor: User): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi.');
    }

    const ticketCount = await this.ticketsRepository.count({
      where: [{ createdById: id }, { assignedToId: id }],
    });
    if (ticketCount > 0) {
      throw new ConflictException(
        "Bu xodimga bog'liq murojaatlar mavjud, uni o'chirib bo'lmaydi.",
      );
    }

    await this.usersRepository.remove(user);

    await this.auditLogService.log(
      actor.id,
      actorDisplayName(actor),
      AuditAction.EMPLOYEE_DELETED,
      'user',
      id,
      { fullname: user.fullname, adminLogin: user.adminLogin, role: user.role },
    );
  }
}
