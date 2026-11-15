import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class UploadDocumentDto {
  @IsUUID()
  facilityId: string;

  @IsString()
  docType: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  docNumber?: string;

  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;
}
