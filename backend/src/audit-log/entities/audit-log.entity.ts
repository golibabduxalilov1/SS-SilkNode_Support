import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditAction {
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_CLOSED_AT_CHANGED = 'ticket_closed_at_changed',
  EMPLOYEE_CREATED = 'employee_created',
  EMPLOYEE_UPDATED = 'employee_updated',
  EMPLOYEE_ROLE_CHANGED = 'employee_role_changed',
  EMPLOYEE_DELETED = 'employee_deleted',
  ORGANIZATION_CREATED = 'organization_created',
  ORGANIZATION_UPDATED = 'organization_updated',
  ORGANIZATION_DELETED = 'organization_deleted',
  CATEGORY_CREATED = 'category_created',
  CATEGORY_UPDATED = 'category_updated',
  CATEGORY_DELETED = 'category_deleted',
}

/**
 * actorId/actorName — snapshot sifatida saqlanadi (FK emas): admin/xodim keyinchalik
 * o'chirilsa ham, audit tarixi o'zgarmasdan o'qilishi kerak.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_audit_logs_actor_id')
  @Column({ name: 'actor_id', type: 'bigint', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_name', type: 'varchar', length: 255 })
  actorName: string;

  @Index('idx_audit_logs_action')
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
