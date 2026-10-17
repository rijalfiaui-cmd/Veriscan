import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto } from './beneficiary.dto';

export const beneficiarySelect = {
  id: true,
  name: true,
  nik: true,
  street: true,
  rt: true,
  rw: true,
  kelurahan: true,
  kecamatan: true,
  city: true,
  province: true,
  postalCode: true,
  foodRestrictions: true,
  decile: true,
  photoPath: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.Beneficiary3BSelect;

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBeneficiaryDto) {
    try {
      const recipient = await this.prisma.beneficiary3B.create({
        data: dto,
        select: beneficiarySelect,
      });
      return { ...recipient, ...(await this.generateQrCode(recipient.id)) };
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const where: Prisma.Beneficiary3BWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nik: { contains: search } },
            { kelurahan: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.beneficiary3B.findMany({
        where,
        select: beneficiarySelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.beneficiary3B.count({ where }),
    ]);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const recipient = await this.prisma.beneficiary3B.findUnique({
      where: { id },
      select: beneficiarySelect,
    });
    if (!recipient)
      throw new NotFoundException('Penerima manfaat tidak ditemukan');
    return recipient;
  }

  async update(id: string, dto: UpdateBeneficiaryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.beneficiary3B.update({
        where: { id },
        data: dto,
        select: beneficiarySelect,
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async updatePhoto(id: string, photoPath: string) {
    await this.findOne(id);
    return this.prisma.beneficiary3B.update({
      where: { id },
      data: { photoPath },
      select: beneficiarySelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.attendance.deleteMany({ where: { beneficiary3BId: id } }),
      this.prisma.beneficiary3B.delete({ where: { id } }),
    ]);
    return { message: 'Penerima manfaat berhasil dihapus' };
  }

  async generateQrCode(id: string) {
    const recipient = await this.prisma.beneficiary3B.findUnique({
      where: { id },
      select: { qrToken: true },
    });
    if (!recipient)
      throw new NotFoundException('Penerima manfaat tidak ditemukan');
    return {
      qrDataUrl: await QRCode.toDataURL(recipient.qrToken, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'H',
      }),
    };
  }

  private handleConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('NIK sudah terdaftar');
    }
    throw error;
  }
}
