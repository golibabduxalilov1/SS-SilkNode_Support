import { IsNumber, Min } from 'class-validator';

export class UpdateTicketResolutionMinutesDto {
  @IsNumber()
  @Min(0)
  resolutionMinutes: number;
}
