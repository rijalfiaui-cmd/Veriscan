import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetAttendanceQueryDto } from '../attendance/dto/get-attendance-query.dto';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto } from './beneficiary.dto';
import { photoUploadOptions, saveUploadedPhoto } from '../common/photo-upload';

@UseGuards(JwtAuthGuard)
@Controller('beneficiaries-3b')
export class BeneficiariesController {
  constructor(private readonly service: BeneficiariesService) {}
  @Get() findAll(@Query() query: GetAttendanceQueryDto) {
    return this.service.findAll(query.page, query.limit, query.search);
  }
  @Post() create(@Body() dto: CreateBeneficiaryDto) {
    return this.service.create(dto);
  }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
  @Patch(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBeneficiaryDto,
  ) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
  @Get(':id/qr') qr(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.generateQrCode(id);
  }
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', photoUploadOptions))
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return saveUploadedPhoto(file, (path) =>
      this.service.updatePhoto(id, path),
    );
  }
}
