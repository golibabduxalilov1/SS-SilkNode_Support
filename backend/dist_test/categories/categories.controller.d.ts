import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
declare class CreateCategoryDto {
    name: string;
}
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<{
        success: boolean;
        data: import("./entities/category.entity").Category[];
    }>;
    create(dto: CreateCategoryDto): Promise<{
        success: boolean;
        data: import("./entities/category.entity").Category;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        success: boolean;
        data: import("./entities/category.entity").Category;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
export declare class PublicCategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAllActive(): Promise<{
        success: boolean;
        data: import("./entities/category.entity").Category[];
    }>;
    create(dto: CreateCategoryDto): Promise<{
        success: boolean;
        data: import("./entities/category.entity").Category;
    }>;
}
export {};
