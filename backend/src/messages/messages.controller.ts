import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { UserEligibilityGuard } from '../auth/guards/user-eligibility.guard';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotifyUserService } from '../bot/notify-user.service';

@Controller()
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly notifyUserService: NotifyUserService,
  ) {}

  @Get('tickets/:ticketId/messages')
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  async findMine(@Param('ticketId') ticketId: string, @CurrentUser() user: User) {
    await this.assertOwnsTicket(ticketId, user.id);
    const messages = await this.messagesService.findByTicket(ticketId);
    return { success: true, data: messages };
  }

  @Post('tickets/:ticketId/messages')
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  async createMine(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: User,
  ) {
    await this.assertOwnsTicket(ticketId, user.id);
    const message = await this.messagesService.create(ticketId, user.id, dto.text);
    return { success: true, data: message };
  }

  @Get('admin/tickets/:ticketId/messages')
  @UseGuards(AdminJwtAuthGuard)
  async findForAdmin(@Param('ticketId') ticketId: string) {
    const messages = await this.messagesService.findByTicket(ticketId);
    return { success: true, data: messages };
  }

  @Post('admin/tickets/:ticketId/messages')
  @UseGuards(AdminJwtAuthGuard)
  async createForAdmin(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() admin: User,
  ) {
    const message = await this.messagesService.create(ticketId, admin.id, dto.text, true);

    const ticket = await this.messagesService.findTicketForNotification(ticketId);
    if (ticket) {
      await this.notifyUserService.notifyNewMessage(ticket, dto.text);
    }

    return { success: true, data: message };
  }

  private async assertOwnsTicket(ticketId: string, userId: string): Promise<void> {
    const ownerId = await this.messagesService.findTicketOwnerId(ticketId);
    if (ownerId !== userId) {
      throw new ForbiddenException("Bu murojaatga kirish huquqingiz yo'q.");
    }
  }
}
