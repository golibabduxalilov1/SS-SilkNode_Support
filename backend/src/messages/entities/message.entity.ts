import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';
import { Attachment } from '../../attachments/entities/attachment.entity';

/** T04 — "Mijozga javob" (public) va "Ichki eslatma" (internal, faqat admin/superadmin ko'radi). */
export enum MessageVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.messages, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_id', type: 'bigint' })
  senderId: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'enum', enum: MessageVisibility, default: MessageVisibility.PUBLIC })
  visibility: MessageVisibility;

  @OneToMany(() => Attachment, (attachment) => attachment.message)
  attachments: Attachment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
