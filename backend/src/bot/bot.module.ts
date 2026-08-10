import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { NotifyAdminsService } from './notify-admins.service';
import { NotifyUserService } from './notify-user.service';

@Module({
  imports: [UsersModule],
  providers: [BotService, BotUpdate, NotifyAdminsService, NotifyUserService],
  exports: [NotifyAdminsService, NotifyUserService, BotService],
})
export class BotModule {}
