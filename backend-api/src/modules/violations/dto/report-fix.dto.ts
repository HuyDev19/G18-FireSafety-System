import { IsString, IsUUID, IsOptional, IsIn, IsDateString } from 'class-validator';

export class ReportFixDto {
  @IsUUID()
  violationId: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsIn(['FIXING'])
  status?: string;
}
