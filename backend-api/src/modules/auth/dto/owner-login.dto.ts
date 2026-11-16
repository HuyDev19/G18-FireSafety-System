import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OwnerLoginDto {
  @ApiProperty({ example: 'chu_coso@example.com', description: 'Email của chủ cơ sở' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'MatKhauTam@123', description: 'Mật khẩu doanh nghiệp' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;

  @ApiPropertyOptional({ description: 'Mã xác thực CAPTCHA nếu thử sai nhiều lần' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

