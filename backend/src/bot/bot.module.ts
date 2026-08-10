import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { NotifyAdminsService } from './notify-admins.service';

@Module({
  imports: [UsersModule],
  providers: [BotService, BotUpdate, NotifyAdminsService],
  exports: [NotifyAdminsService, BotService],
})
export class BotModule {}
