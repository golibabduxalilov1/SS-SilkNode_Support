import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from '../../messages/entities/message.entity';

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TicketStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  WAITING_USER = 'waiting_user',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  number: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Category, (category) => category.tickets, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  categoryEntity: Category | null;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId: string | null;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.NEW })
  status: TicketStatus;

  @ManyToOne(() => Organization, (org) => org.tickets, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id', type: 'bigint' })
  createdById: string;

  /** Admin panelda qo'lda yaratilgan murojaatlar uchun — haqiqiy murojaatchining ismi (createdBy — uni yozgan xodim). */
  @Column({ name: 'requester_name', type: 'varchar', length: 255, nullable: true })
  requesterName: string | null;

  @Column({ name: 'requester_phone', type: 'varchar', length: 20, nullable: true })
  requesterPhone: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  @Column({ name: 'assigned_to_id', type: 'bigint', nullable: true })
  assignedToId: string | null;

  @OneToMany(() => Message, (message) => message.ticket)
  messages: Message[];

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'resolution_minutes', type: 'int', nullable: true })
  resolutionMinutes: number | null;

  /** closed/resolved holatidan orqaga (masalan in_progress) qaytgan sonini hisoblaydi — dashboard "reopened %" uchun. */
  @Column({ name: 'reopened_count', type: 'int', default: 0 })
  reopenedCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
