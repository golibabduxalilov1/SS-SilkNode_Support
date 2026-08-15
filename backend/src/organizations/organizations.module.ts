import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController, PublicOrganizationsController } from './organizations.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Ticket, User]),
    AuthModule,
    UsersModule,
    AuditLogModule,
  ],
  providers: [OrganizationsService],
  controllers: [OrganizationsController, PublicOrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
