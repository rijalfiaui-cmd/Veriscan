import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    const existing = await this.prisma.student.findUnique({
      where: { nisn: dto.nisn },
    });

    if (existing) {
      throw new ConflictException(`NISN ${dto.nisn} sudah terdaftar`);
    }

    const student = await this.prisma.student.create({
      data: dto,
    });

    const qrDataUrl = await this.generateQrCode(student.id);

    return {
      ...student,
      qrDataUrl,
    };
  }

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { nisn: { contains: search, mode: 'insensitive' as const } },
            { schoolName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: this.studentSelect(),
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: this.studentSelect(),
    });

    if (!student) {
      throw new NotFoundException(`Siswa dengan ID ${id} tidak ditemukan`);
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);

    if (dto.nisn) {
      const existing = await this.prisma.student.findFirst({
        where: { nisn: dto.nisn, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`NISN ${dto.nisn} sudah digunakan siswa lain`);
      }
    }

    return this.prisma.student.update({
      where: { id },
      data: dto,
      select: this.studentSelect(),
    });
  }

  async updatePhoto(id: string, photoPath: string) {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: { photoPath },
      select: this.studentSelect(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.attendance.deleteMany({
      where: { studentId: id },
    });
    return this.prisma.student.delete({
      where: { id },
    });
  }

  async generateQrCode(id: string): Promise<string> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { qrToken: true, name: true, isActive: true },
    });

    if (!student) {
      throw new NotFoundException(`Siswa dengan ID ${id} tidak ditemukan`);
    }

    // Hanya QR token yang disimpan dalam QR Code, bukan data pribadi
    const qrDataUrl = await QRCode.toDataURL(student.qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
      width: 300,
    });

    return qrDataUrl;
  }

  private studentSelect() {
    return {
      id: true,
      nisn: true,
      name: true,
      schoolName: true,
      gender: true,
      foodRestrictions: true,
      photoPath: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // qrToken TIDAK diekspos dalam list umum
    };
  }
}
