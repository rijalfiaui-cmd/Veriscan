import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class GetAttendanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsIn(['STUDENT', 'THREE_B_ELDERLY'])
  type?: 'STUDENT' | 'THREE_B_ELDERLY';

  @IsOptional()
  @IsString()
  search?: string;
}
