import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Message } from '../messages/entities/message.entity';
import { Attachment } from '../attachments/entities/attachment.entity';
import { Category } from '../categories/entities/category.entity';

export function typeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USERNAME || 'silknode',
    password: process.env.DB_PASSWORD || 'silknode',
    database: process.env.DB_DATABASE || 'silknode_support',
    entities: [User, Organization, Ticket, Message, Attachment, Category],
    // Ishlab chiqarishda migratsiyalardan foydalaning (npm run migration:run).
    // synchronize faqat lokal ishlab chiqish uchun.
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
}
