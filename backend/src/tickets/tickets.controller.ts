import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CategoriesService } from '../categories/categories.service';
import { NotifyAdminsService } from '../bot/notify-admins.service';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { UserEligibilityGuard } from '../auth/guards/user-eligibility.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { User, UserRole } from '../users/entities/user.entity';

@Controller()
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly organizationsService: OrganizationsService,
    private readonly categoriesService: CategoriesService,
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
    const category = ticket.categoryId
      ? await this.categoriesService.findById(ticket.categoryId)
      : null;
    await this.notifyAdminsService.notifyNewTicket(
      ticket,
      organization?.name ?? '—',
      category?.name ?? '—',
    );

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

  /** POST /api/v1/admin/tickets — admin panelda qo'lda murojaat yaratish. */
  @Post('admin/tickets')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createFromAdmin(@Body() dto: CreateTicketDto, @CurrentUser() user: User) {
    const ticket = await this.ticketsService.create(dto, user);
    const full = await this.ticketsService.findById(ticket.id);
    return { success: true, data: full };
  }

  /**
   * GET /api/v1/admin/dashboard/stats — bo'lim 6, 8: status kartochkalari + Time Tracking.
   * Filtrlar ixtiyoriy: organizationId/categoryId/dateFrom/dateTo hisobot doirasini torlashtiradi,
   * assignedToId esa faqat boshqa statistikalarni filtrlaydi — byAssignee doim to'liq ro'yxat qaytaradi.
   */
  @Get('admin/dashboard/stats')
  @UseGuards(AdminJwtAuthGuard)
  async getDashboardStats(
    @Query('organizationId') organizationId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const stats = await this.ticketsService.getDashboardStats({
      organizationId: organizationId || undefined,
      assignedToId: assignedToId || undefined,
      categoryId: categoryId || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
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
    const ticket = await this.ticketsService.assign(id, dto.assignedToId || null);
    return { success: true, data: ticket };
  }

  /** DELETE /api/v1/admin/tickets/:id — murojaatni o'chirish, faqat superadmin uchun. */
  @Delete('admin/tickets/:id')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.ticketsService.remove(id);
    return { success: true };
  }
}
