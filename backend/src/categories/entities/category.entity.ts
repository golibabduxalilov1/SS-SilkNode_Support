import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';

/** T16 — minimal klasterlash; to'liq ierarxiya (parent_category_id) Phase 4'ga qoldirilgan. */
export enum CategoryCluster {
  YONALISH = 'yonalish',
  MAHSULOT = 'mahsulot',
}

@Entity('categories')
export class Category {
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

  @Column({ type: 'enum', enum: CategoryCluster, default: CategoryCluster.MAHSULOT })
  cluster: CategoryCluster;

  @OneToMany(() => Ticket, (ticket) => ticket.categoryEntity)
  tickets: Ticket[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
