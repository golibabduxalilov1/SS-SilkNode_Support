import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { RequestersService } from './requesters.service';
import { RequestersController } from './requesters.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), AuthModule],
  providers: [RequestersService],
  controllers: [RequestersController],
  exports: [RequestersService],
})
export class RequestersModule {}
