import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from '../../messages/entities/message.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => Message, (message) => message.attachments, { nullable: false })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'message_id', type: 'bigint' })
  messageId: string;

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
