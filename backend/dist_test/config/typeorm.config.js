"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = typeOrmConfig;
const user_entity_1 = require("../users/entities/user.entity");
const organization_entity_1 = require("../organizations/entities/organization.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const message_entity_1 = require("../messages/entities/message.entity");
const attachment_entity_1 = require("../attachments/entities/attachment.entity");
const category_entity_1 = require("../categories/entities/category.entity");
function typeOrmConfig() {
    return {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        username: process.env.DB_USERNAME || 'silknode',
        password: process.env.DB_PASSWORD || 'silknode',
        database: process.env.DB_DATABASE || 'silknode_support',
        entities: [user_entity_1.User, organization_entity_1.Organization, ticket_entity_1.Ticket, message_entity_1.Message, attachment_entity_1.Attachment, category_entity_1.Category],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
    };
}
//# sourceMappingURL=typeorm.config.js.map