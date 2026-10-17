import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';

@Module({
  imports: [MulterModule.register({ dest: './uploads' })],
  providers: [StudentsService],
  controllers: [StudentsController],
})
export class StudentsModule {}
