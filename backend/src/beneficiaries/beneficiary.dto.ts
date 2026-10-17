import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateBeneficiaryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name: string;
  @Matches(/^\d{16}$/, { message: 'NIK harus tepat 16 digit angka' })
  nik: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  street: string;
  @Matches(/^\d{1,3}$/, { message: 'RT harus 1–3 digit angka' }) rt: string;
  @Matches(/^\d{1,3}$/, { message: 'RW harus 1–3 digit angka' }) rw: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  kelurahan: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  kecamatan: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  city: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  province: string;
  @Matches(/^\d{5}$/, { message: 'Kode pos harus 5 digit angka' })
  postalCode: string;
  @IsOptional() @IsString() foodRestrictions?: string;
  @IsInt() @Min(1) @Max(10) decile: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

// Omitted fields are allowed; explicit null cannot erase required data.
export class UpdateBeneficiaryDto extends PartialType(CreateBeneficiaryDto, {
  skipNullProperties: false,
}) {}
