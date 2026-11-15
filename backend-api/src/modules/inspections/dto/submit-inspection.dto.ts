import { IsString, IsUUID, IsDateString, IsOptional, IsIn } from 'class-validator';

export class SubmitInspectionDto {
  @IsUUID()
  scheduleId: string;

  @IsUUID()
  facilityId: string;

  @IsUUID()
  inspectorId: string;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsDateString()
  remediationDeadline?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'])
  status?: string;
}
