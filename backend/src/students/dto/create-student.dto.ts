import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'NISN harus 10 digit' })
  @Matches(/^\d+$/, { message: 'NISN harus berupa angka' })
  nisn: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  schoolName: string;

  @IsEnum(Gender, { message: 'Gender harus LAKI_LAKI atau PEREMPUAN' })
  gender: Gender;

  @IsOptional()
  @IsString()
  foodRestrictions?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
