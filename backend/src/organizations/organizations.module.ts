import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController, PublicOrganizationsController } from './organizations.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), AuthModule, UsersModule],
  providers: [OrganizationsService],
  controllers: [OrganizationsController, PublicOrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
