import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

/**
 * TALAB 3: har bir foydalanuvchining Telegram user_id/chat_id va tasdiqlangan
 * telefon raqami shu jadvalda saqlanadi — TALAB 1 tekshiruvining yagona manbai.
 */
@Entity('users')
@Index('idx_users_verification', ['isStarted', 'isPhoneVerified'])
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index('idx_users_telegram_id', { unique: true })
  @Column({ name: 'telegram_id', type: 'bigint', unique: true, nullable: true })
  telegramId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullname: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ name: 'is_started', type: 'boolean', default: false })
  isStarted: boolean;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'phone_verified_at', type: 'timestamptz', nullable: true })
  phoneVerifiedAt: Date | null;

  /** Faqat admin/superadmin uchun — Web Admin Panel login/parol autentifikatsiyasi. */
  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: 'admin_login', type: 'varchar', length: 255, nullable: true, unique: true })
  adminLogin: string | null;

  /** Web Admin Panel — xodim/admin hisobini vaqtincha bloklash uchun (o'chirilmaydi, faqat faolsizlantiriladi). */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Organization, (org) => org.users, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
