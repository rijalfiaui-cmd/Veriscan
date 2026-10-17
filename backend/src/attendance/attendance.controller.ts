import { GetAttendanceQueryDto } from './dto/get-attendance-query.dto';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  scan(@Body() dto: ScanAttendanceDto, @CurrentUser() user: { id: string }) {
    return this.attendanceService.scan(dto, user.id);
  }

  @Get()
  findAll(@Query() query: GetAttendanceQueryDto) {
    return this.attendanceService.findAll(
      query.page,
      query.limit,
      query.date,
      query.search,
      query.type,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.findOne(id);
  }
}
