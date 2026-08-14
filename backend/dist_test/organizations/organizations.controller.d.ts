import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
declare class CreateOrganizationDto {
    name: string;
}
export declare class OrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    findAll(): Promise<{
        success: boolean;
        data: import("./entities/organization.entity").Organization[];
    }>;
    create(dto: CreateOrganizationDto): Promise<{
        success: boolean;
        data: import("./entities/organization.entity").Organization;
    }>;
    update(id: string, dto: UpdateOrganizationDto): Promise<{
        success: boolean;
        data: import("./entities/organization.entity").Organization;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
export declare class PublicOrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    findAllActive(): Promise<{
        success: boolean;
        data: import("./entities/organization.entity").Organization[];
    }>;
    create(dto: CreateOrganizationDto): Promise<{
        success: boolean;
        data: import("./entities/organization.entity").Organization;
    }>;
}
export {};
