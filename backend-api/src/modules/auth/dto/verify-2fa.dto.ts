import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2FaDto {
  @ApiProperty({ description: 'Mã token tạm thời được trả về sau bước 1 của đăng nhập cán bộ' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @ApiProperty({ example: '123456', description: 'Mã xác thực 2 bước 6 số từ Google Authenticator' })
  @IsString()
  @Length(6, 6, { message: 'Mã xác thực 2 bước phải gồm 6 chữ số' })
  code: string;
}

