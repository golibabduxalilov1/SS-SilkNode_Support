import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Message } from '../messages/entities/message.entity';
import { Attachment } from '../attachments/entities/attachment.entity';
import { Category } from '../categories/entities/category.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';
import { SavedFilter } from '../saved-filters/entities/saved-filter.entity';

export function typeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USERNAME || 'silknode',
    password: process.env.DB_PASSWORD || 'silknode',
    database: process.env.DB_DATABASE || 'silknode_support',
    entities: [User, Organization, Ticket, Message, Attachment, Category, AuditLog, SavedFilter],
    // Ishlab chiqarishda migratsiyalardan foydalaning (npm run migration:run).
    // synchronize faqat lokal ishlab chiqish uchun.
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    // Pool sozlanmagan bo'lsa pg default (10) ishlatiladi — og'ir so'rovlar bilan birga
    // ulanishlar tez tugab, yangi so'rovlar navbatda "qotib qolgandek" ko'rinishi mumkin edi.
    extra: {
      max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 20,
      connectionTimeoutMillis: 10_000,
    },
  };
}
