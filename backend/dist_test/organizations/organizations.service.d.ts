import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
export declare class OrganizationsService {
    private readonly organizationsRepository;
    private readonly ticketsRepository;
    private readonly usersRepository;
    constructor(organizationsRepository: Repository<Organization>, ticketsRepository: Repository<Ticket>, usersRepository: Repository<User>);
    findAll(): Promise<Organization[]>;
    findAllActive(): Promise<Organization[]>;
    findById(id: string): Promise<Organization | null>;
    create(name: string): Promise<Organization>;
    update(id: string, data: {
        name?: string;
        isActive?: boolean;
    }): Promise<Organization>;
    remove(id: string): Promise<void>;
}
