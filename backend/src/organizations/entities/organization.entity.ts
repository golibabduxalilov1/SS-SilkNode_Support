import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** T14 — ixtiyoriy, saqlash uchun majburiy emas. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'color_tag', type: 'varchar', length: 7, nullable: true })
  colorTag: string | null;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Ticket, (ticket) => ticket.organization)
  tickets: Ticket[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
