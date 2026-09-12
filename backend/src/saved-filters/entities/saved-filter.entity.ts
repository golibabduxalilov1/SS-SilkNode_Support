import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** T13 — Murojaatlar jadvalidagi filtr kombinatsiyasini nom bilan saqlash (shaxsiy, user_id bo'yicha). */
@Entity('saved_filters')
export class SavedFilter {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'filter_json', type: 'jsonb' })
  filterJson: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
