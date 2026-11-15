import { IsString, IsUUID, IsOptional, IsIn } from 'class-validator';

export class VerifyResolveDto {
  @IsUUID()
  violationId: string;

  @IsIn(['RESOLVED', 'REOPENED'])
  status: string;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
