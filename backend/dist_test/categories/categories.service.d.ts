import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
export declare class CategoriesService {
    private readonly categoriesRepository;
    private readonly ticketsRepository;
    constructor(categoriesRepository: Repository<Category>, ticketsRepository: Repository<Ticket>);
    findAll(): Promise<Category[]>;
    findAllActive(): Promise<Category[]>;
    findById(id: string): Promise<Category | null>;
    create(name: string): Promise<Category>;
    update(id: string, data: {
        name?: string;
        isActive?: boolean;
    }): Promise<Category>;
    remove(id: string): Promise<void>;
}
