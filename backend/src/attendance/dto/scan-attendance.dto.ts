import { IsUUID, IsNotEmpty } from 'class-validator';

export class ScanAttendanceDto {
  @IsUUID('4', { message: 'QR token tidak valid' })
  @IsNotEmpty()
  qrToken: string;
}
