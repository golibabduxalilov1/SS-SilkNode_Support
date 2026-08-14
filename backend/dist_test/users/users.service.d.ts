import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
export declare class UsersService {
    private readonly usersRepository;
    private readonly ticketsRepository;
    constructor(usersRepository: Repository<User>, ticketsRepository: Repository<Ticket>);
    findByTelegramId(telegramId: string): Promise<User | null>;
    findByAdminLogin(adminLogin: string): Promise<User | null>;
    findOrCreateByTelegramId(telegramId: string, defaults: Partial<User>): Promise<{
        user: User;
        created: boolean;
    }>;
    markStarted(telegramId: string): Promise<User>;
    verifyPhone(telegramId: string, phoneNumber: string): Promise<User>;
    findAdmins(): Promise<User[]>;
    findAllAdmins(organizationId?: string): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    private assertSuperadminSlotAvailable;
    createAdmin(dto: CreateUserDto): Promise<User>;
    updateAdmin(id: string, dto: UpdateUserDto): Promise<User>;
    deactivateAdmin(id: string): Promise<User>;
    save(user: User): Promise<User>;
    remove(id: string): Promise<void>;
}
