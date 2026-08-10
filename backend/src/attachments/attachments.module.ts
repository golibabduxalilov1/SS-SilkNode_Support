import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './entities/attachment.entity';
import { AttachmentsService } from './attachments.service';

/**
 * Fayl biriktirish (upload) mexanizmi asosiy TZ'da tavsiflangan bo'lib,
 * ushbu hujjat doirasiga kirmaydi (bo'lim 9, "MUHIM ESLATMA"). Bu yerda
 * faqat ma'lumotlar qatlami (entity + service) tayyorlangan — HTTP upload
 * endpoint'i asosiy TZ implementatsiyasi bilan birga qo'shiladi.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Attachment])],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
