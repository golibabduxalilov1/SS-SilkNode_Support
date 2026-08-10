import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentsRepository: Repository<Attachment>,
  ) {}

  findByMessage(messageId: string): Promise<Attachment[]> {
    return this.attachmentsRepository.find({ where: { messageId } });
  }

  create(data: Partial<Attachment>): Promise<Attachment> {
    return this.attachmentsRepository.save(this.attachmentsRepository.create(data));
  }
}
