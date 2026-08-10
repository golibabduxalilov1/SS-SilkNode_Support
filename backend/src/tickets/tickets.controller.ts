import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotifyAdminsService } from '../bot/notify-admins.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { UserEligibilityGuard } from '../auth/guards/user-eligibility.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { User, UserRole } from '../users/entities/user.entity';

@Controller()
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly organizationsService: OrganizationsService,
    private readonly notifyAdminsService: NotifyAdminsService,
  ) {}

  /**
   * POST /api/v1/tickets — bo'lim 6.2:
   * authMiddleware -> verifyUserEligibility -> requireRole('user') -> create
   */
  @Post('tickets')
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard, RolesGuard)
  @Roles(UserRole.USER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTicketDto, @CurrentUser() user: User) {
    const ticket = await this.ticketsService.create(dto, user);

    const organization = ticket.organizationId
      ? await this.organizationsService.findById(ticket.organizationId)
      : null;
    await this.notifyAdminsService.notifyNewTicket(ticket, organization?.name ?? '—');

    return { success: true, data: ticket };
  }

  /** GET /api/v1/tickets — foydalanuvchining o'z murojaatlari ("Mening murojaatlarim"). */
  @Get('tickets')
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  async findMine(@CurrentUser() user: User) {
    const tickets = await this.ticketsService.findMine(user.id);
    return { success: true, data: tickets };
  }

  /** GET /api/v1/admin/tickets — Web Admin Panel Dashboard uchun (bo'lim 5.3). */
  @Get('admin/tickets')
  @UseGuards(AdminJwtAuthGuard)
  async findAllForAdmin() {
    const tickets = await this.ticketsService.findAllForAdmin();
    return { success: true, data: tickets };
  }

  @Get('admin/tickets/:id')
  @UseGuards(AdminJwtAuthGuard)
  async findOneForAdmin(@Param('id') id: string) {
    const ticket = await this.ticketsService.findById(id);
    return { success: true, data: ticket };
  }
}
