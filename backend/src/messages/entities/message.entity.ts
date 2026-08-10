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

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.messages, { nullable: false })
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

  @OneToMany(() => Attachment, (attachment) => attachment.message)
  attachments: Attachment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
