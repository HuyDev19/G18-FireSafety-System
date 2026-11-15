import { IsString, IsUUID, IsOptional, IsIn } from 'class-validator';

export class UpdateScheduleStatusDto {
  @IsOptional()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  rescheduleNote?: string;
}
