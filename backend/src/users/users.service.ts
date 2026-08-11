import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Ticket } from '../tickets/entities/ticket.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
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

  async createAdmin(dto: CreateUserDto): Promise<User> {
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

    if (telegramOwner) {
      telegramOwner.fullname = dto.fullname;
      telegramOwner.adminLogin = dto.adminLogin;
      telegramOwner.passwordHash = passwordHash;
      telegramOwner.role = dto.role ?? UserRole.ADMIN;
      telegramOwner.organizationId = dto.organizationId ?? null;
      telegramOwner.isActive = true;
      return this.usersRepository.save(telegramOwner);
    }

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

    return this.usersRepository.save(user);
  }

  async updateAdmin(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi.');
    }

    if (dto.fullname !== undefined) user.fullname = dto.fullname;
    if (dto.role !== undefined) user.role = dto.role;
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

    return this.usersRepository.save(user);
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

  async remove(id: string): Promise<void> {
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
  }
}
