import { Transform } from 'class-transformer';
import { IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { normalizePhoneOrUndefined } from '../../bot/utils/phone.util';

/** PATCH /admin/requesters/:key — superadmin murojaatchining ism/telefonini tahrirlashi uchun. */
export class UpdateRequesterDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => normalizePhoneOrUndefined(value))
  @IsPhoneNumber('UZ', { message: "Telefon raqami to'liq emas yoki noto'g'ri formatda." })
  @MaxLength(20)
  phone?: string;
}
