import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { Prisma, Student, Beneficiary3B } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { beneficiarySelect } from '../beneficiaries/beneficiaries.service';

const TIMEZONE = 'Asia/Jakarta';
const studentSelect = {
  id: true,
  name: true,
  nisn: true,
  schoolName: true,
  gender: true,
  foodRestrictions: true,
  photoPath: true,
  isActive: true,
} satisfies Prisma.StudentSelect;
const attendanceInclude = {
  student: { select: studentSelect },
  beneficiary3B: { select: beneficiarySelect },
  staff: { select: { name: true, username: true } },
} satisfies Prisma.AttendanceInclude;
type StudentData = Pick<Student, keyof typeof studentSelect>;
type BeneficiaryData = Pick<Beneficiary3B, keyof typeof beneficiarySelect>;
export type RecipientType = 'STUDENT' | 'THREE_B_ELDERLY';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async scan(dto: ScanAttendanceDto, staffId: string) {
    const student = await this.prisma.student.findUnique({
      where: { qrToken: dto.qrToken },
      select: studentSelect,
    });
    const beneficiary = student
      ? null
      : await this.prisma.beneficiary3B.findUnique({
          where: { qrToken: dto.qrToken },
          select: beneficiarySelect,
        });
    const person = student || beneficiary;
    if (!person)
      throw new NotFoundException({
        status: 'invalid_qr',
        message: 'QR Code tidak valid atau penerima manfaat tidak ditemukan',
      });
    const recipient = this.formatRecipient(student, beneficiary);
    // Keep the student response for older clients using student QR codes.
    const legacyStudent = student
      ? {
          ...student,
          gender: student.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
          photoUrl: student.photoPath,
        }
      : undefined;
    if (!person.isActive)
      throw new ForbiddenException({
        status: student ? 'inactive_student' : 'inactive_beneficiary',
        message: 'Penerima manfaat tidak aktif',
        recipient,
        student: legacyStudent,
      });
    const now = new Date();
    const date = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);
    const identity = student
      ? { studentId: student.id }
      : { beneficiary3BId: beneficiary!.id };
    try {
      const attendance = await this.prisma.attendance.create({
        data: {
          ...identity,
          staffId,
          attendanceDate,
          scannedAt: now,
          status: 'HADIR',
        },
      });
      return {
        status: 'recorded',
        message: 'Absensi berhasil dicatat',
        recipient,
        student: legacyStudent,
        attendance: { id: attendance.id, date, time: this.formatTime(now) },
      };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const existing = await this.prisma.attendance.findFirst({
        where: { ...identity, attendanceDate },
      });
      return {
        status: 'already_present',
        message: 'Penerima manfaat sudah melakukan absensi hari ini',
        recipient,
        student: legacyStudent,
        attendance: { date, time: this.formatTime(existing?.scannedAt || now) },
      };
    }
  }

  async findAll(
    page = 1,
    limit = 20,
    dateStr?: string,
    search?: string,
    type?: RecipientType,
  ) {
    const where: Prisma.AttendanceWhereInput = {};
    if (dateStr) where.attendanceDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (type === 'STUDENT') where.studentId = { not: null };
    if (type === 'THREE_B_ELDERLY') where.beneficiary3BId = { not: null };
    if (search)
      where.OR = [
        {
          student: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { nisn: { contains: search } },
            ],
          },
        },
        {
          beneficiary3B: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { nik: { contains: search } },
            ],
          },
        },
      ];
    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ attendanceDate: 'desc' }, { scannedAt: 'desc' }],
        include: attendanceInclude,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return {
      data: records.map((r) => this.formatRecord(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: attendanceInclude,
    });
    if (!record) throw new NotFoundException('Data absensi tidak ditemukan');
    return this.formatRecord(record);
  }

  private formatTime(date: Date) {
    return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }

  private formatRecord(
    record: Prisma.AttendanceGetPayload<{ include: typeof attendanceInclude }>,
  ) {
    return {
      id: record.id,
      attendanceDate: record.attendanceDate.toISOString().slice(0, 10),
      scannedAt: this.formatTime(record.scannedAt),
      status: record.status,
      student: record.student,
      beneficiary3B: record.beneficiary3B,
      recipient: this.formatRecipient(record.student, record.beneficiary3B),
      scannedBy: record.staff,
    };
  }

  private formatRecipient(
    student: StudentData | null,
    beneficiary: BeneficiaryData | null,
  ) {
    const person = student || beneficiary!;
    return {
      type: student ? ('STUDENT' as const) : ('THREE_B_ELDERLY' as const),
      name: person.name,
      identifier: student ? student.nisn : beneficiary!.nik,
      schoolName: student?.schoolName,
      gender: student?.gender,
      address: beneficiary
        ? `${beneficiary.street}, RT ${beneficiary.rt}/RW ${beneficiary.rw}, ${beneficiary.kelurahan}, ${beneficiary.kecamatan}, ${beneficiary.city}, ${beneficiary.province} ${beneficiary.postalCode}`
        : undefined,
      decile: beneficiary?.decile,
      foodRestrictions: person.foodRestrictions,
      photoUrl: person.photoPath,
    };
  }
}
