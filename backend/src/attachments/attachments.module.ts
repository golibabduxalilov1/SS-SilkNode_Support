import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './entities/attachment.entity';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TypeOrmModule.forFeature([Attachment]), AuthModule, TicketsModule],
  providers: [AttachmentsService],
  controllers: [AttachmentsController],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
