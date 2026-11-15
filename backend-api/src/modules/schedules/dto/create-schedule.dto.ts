import { IsString, IsUUID, IsDateString, IsOptional, IsIn, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateScheduleDto {
  @IsUUID()
  facilityId: string;

  @IsUUID()
  inspectorId: string;

  @IsOptional()
  @IsString()
  inspectionType?: string;

  @IsDateString()
  plannedDate: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateScheduleStatusDto {
  @IsOptional()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  rescheduleNote?: string;
}
