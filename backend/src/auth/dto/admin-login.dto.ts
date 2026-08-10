import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @MinLength(6)
  password: string;
}
