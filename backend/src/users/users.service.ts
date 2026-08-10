import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

  save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
