import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: true, description: 'Trạng thái hoạt động của tài khoản' })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}

