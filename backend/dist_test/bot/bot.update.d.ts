import { OnModuleInit } from '@nestjs/common';
import { BotService } from './bot.service';
import { UsersService } from '../users/users.service';
export declare class BotUpdate implements OnModuleInit {
    private readonly botService;
    private readonly usersService;
    private readonly logger;
    constructor(botService: BotService, usersService: UsersService);
    onModuleInit(): Promise<void>;
}
