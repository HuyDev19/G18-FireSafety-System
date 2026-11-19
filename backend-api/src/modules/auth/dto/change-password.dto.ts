import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  oldPassword: string;

  @ApiProperty({ description: 'Mật khẩu mới (tối thiểu 8 ký tự)' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải từ 8 ký tự trở lên' })
  newPassword: string;
}

