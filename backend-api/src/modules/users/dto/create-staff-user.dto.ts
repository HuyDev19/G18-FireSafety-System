import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RoleCode } from '@prisma/client';

export class CreateStaffUserDto {
  @ApiProperty({ example: 'canbo.quan1@pccc.gov.vn' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn Kiểm' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: [RoleCode.ADMIN, RoleCode.LEADER, RoleCode.INSPECTOR] })
  @IsEnum(RoleCode)
  role: RoleCode;

  @ApiPropertyOptional({ example: 'Quận 1, Quận 3', description: 'Địa bàn phụ trách (chuẩn Unicode NFC)' })
  @IsOptional()
  @IsString()
  areaCode?: string;

  @ApiProperty({ example: 'MatKhauKhoiTao@123', description: 'Mật khẩu khởi tạo' })
  @IsString()
  @MinLength(8)
  password: string;
}

