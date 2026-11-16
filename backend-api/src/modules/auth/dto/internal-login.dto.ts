import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InternalLoginDto {
  @ApiProperty({ example: 'canbo@pccc.gov.vn', description: 'Email cán bộ PCCC' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'MatKhau123@', description: 'Mật khẩu cán bộ' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}

