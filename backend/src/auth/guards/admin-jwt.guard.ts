import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Web Admin Panel'ning yagona kirish nuqtasi (bo'lim 5.3) uchun guard. */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('jwt') {}
