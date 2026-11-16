import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class ProvisionOwnerDto {
  @ApiProperty({ example: 'chu_coso@example.com', description: 'Email đăng nhập của chủ cơ sở' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn Doanh', description: 'Họ và tên người đại diện chủ cơ sở' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại liên hệ' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001', description: 'ID cơ sở gắn liền với tài khoản' })
  @IsUUID('all', { message: 'ID cơ sở phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'ID cơ sở không được để trống' })
  facilityId: string;

  @ApiPropertyOptional({ example: 'MatKhauTam@123', description: 'Mật khẩu tạm (nếu để trống hệ thống sẽ tự sinh ngẫu nhiên)' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tạm tối thiểu 8 ký tự' })
  temporaryPassword?: string;
}

