import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from '../../messages/entities/message.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** Har bir fayl to'g'ridan-to'g'ri murojaatga bog'lanadi (xabar orqali bo'lmasa ham). */
  @ManyToOne(() => Ticket, { nullable: false })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId: string;

  @ManyToOne(() => Message, (message) => message.attachments, { nullable: true })
  @JoinColumn({ name: 'message_id' })
  message: Message | null;

  @Column({ name: 'message_id', type: 'bigint', nullable: true })
  messageId: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_url', type: 'varchar', length: 1024 })
  fileUrl: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
