import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleCode } from '@prisma/client';

export class QueryUsersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: RoleCode, description: 'Lọc theo vai trò người dùng' })
  @IsOptional()
  @IsEnum(RoleCode)
  role?: RoleCode;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo quận/huyện phụ trách' })
  @IsOptional()
  @IsString()
  areaCode?: string;
}

