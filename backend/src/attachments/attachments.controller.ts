import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AttachmentsService } from './attachments.service';
import { TicketsService } from '../tickets/tickets.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { UserEligibilityGuard } from '../auth/guards/user-eligibility.guard';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const storage = diskStorage({
  destination: process.env.UPLOAD_DIR || 'uploads',
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

/** Fayl biriktirish (bo'lim 4.4 / audit topilma #4, #5) — ticket_id orqali to'g'ridan-to'g'ri bog'lanadi. */
@Controller()
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Post('tickets/:ticketId/attachments')
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadMine(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    await this.ticketsService.findOneForUser(ticketId, user.id);
    if (!file) throw new BadRequestException('Fayl biriktirilmagan.');

    const attachment = await this.attachmentsService.create({
      ticketId,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: String(file.size),
    });
    return { success: true, data: attachment };
  }

  @Post('admin/tickets/:ticketId/attachments')
  @UseGuards(AdminJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadForAdmin(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const ticket = await this.ticketsService.findById(ticketId);
    if (!ticket) throw new BadRequestException('Murojaat topilmadi.');
    if (!file) throw new BadRequestException('Fayl biriktirilmagan.');

    const attachment = await this.attachmentsService.create({
      ticketId,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: String(file.size),
    });
    return { success: true, data: attachment };
  }
}
