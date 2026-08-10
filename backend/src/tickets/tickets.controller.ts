import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotifyAdminsService } from '../bot/notify-admins.service';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
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
    private readonly usersService: UsersService,
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

  /** GET /api/v1/tickets/:id — foydalanuvchi uchun bitta murojaat tafsiloti (egasi ekanini tekshirib). */
  @Get('tickets/:id')
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  async findOneMine(@Param('id') id: string, @CurrentUser() user: User) {
    const ticket = await this.ticketsService.findOneForUser(id, user.id);
    return { success: true, data: ticket };
  }

  /** GET /api/v1/admin/tickets — Web Admin Panel Dashboard uchun (bo'lim 5.3). */
  @Get('admin/tickets')
  @UseGuards(AdminJwtAuthGuard)
  async findAllForAdmin() {
    const tickets = await this.ticketsService.findAllForAdmin();
    return { success: true, data: tickets };
  }

  /** GET /api/v1/admin/dashboard/stats — bo'lim 6, 8: status kartochkalari + Time Tracking. */
  @Get('admin/dashboard/stats')
  @UseGuards(AdminJwtAuthGuard)
  async getDashboardStats() {
    const stats = await this.ticketsService.getDashboardStats();
    return { success: true, data: stats };
  }

  /** GET /api/v1/admin/users — ijrochi tayinlash uchun admin/superadmin ro'yxati. */
  @Get('admin/users')
  @UseGuards(AdminJwtAuthGuard)
  async findAdmins() {
    const admins = await this.usersService.findAdmins();
    return { success: true, data: admins };
  }

  @Get('admin/tickets/:id')
  @UseGuards(AdminJwtAuthGuard)
  async findOneForAdmin(@Param('id') id: string) {
    const ticket = await this.ticketsService.findById(id);
    return { success: true, data: ticket };
  }

  /** PATCH /api/v1/admin/tickets/:id/status — statusni o'zgartirish (bo'lim 7, 8). */
  @Patch('admin/tickets/:id/status')
  @UseGuards(AdminJwtAuthGuard)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    const ticket = await this.ticketsService.updateStatus(id, dto.status);
    return { success: true, data: ticket };
  }

  /** PATCH /api/v1/admin/tickets/:id/assign — ijrochini tayinlash. */
  @Patch('admin/tickets/:id/assign')
  @UseGuards(AdminJwtAuthGuard)
  async assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    const ticket = await this.ticketsService.assign(id, dto.assignedToId);
    return { success: true, data: ticket };
  }
}
