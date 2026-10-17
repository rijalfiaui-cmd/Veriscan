import {
  PrismaClient,
  Gender,
  AttendanceStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai seed data...');

  // Hapus data lama
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.staff.deleteMany();

  // Buat akun petugas
  const hashedPassword = await bcrypt.hash('petugas123', 10);
  const staff = await prisma.staff.create({
    data: {
      username: 'petugas01',
      name: 'Ahmad Fauzi',
      password: hashedPassword,
      isActive: true,
    },
  });
  console.log(`✅ Petugas dibuat: ${staff.username} (password: petugas123)`);

  // Admin dengan akses lebih
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.staff.create({
    data: {
      username: 'admin',
      name: 'Administrator',
      password: adminHash,
      isActive: true,
    },
  });
  console.log(`✅ Admin dibuat: ${admin.username} (password: admin123)`);

  // Buat data siswa sintetis
  const students = [
    {
      nisn: '0011223344',
      name: 'Budi Santoso',
      schoolName: 'SMA Negeri 1 Jakarta',
      gender: Gender.LAKI_LAKI,
      foodRestrictions: null,
      isActive: true,
    },
    {
      nisn: '0011223345',
      name: 'Siti Rahayu',
      schoolName: 'SMA Negeri 1 Jakarta',
      gender: Gender.PEREMPUAN,
      foodRestrictions: 'Seafood',
      isActive: true,
    },
    {
      nisn: '0011223346',
      name: 'Rizky Firmansyah',
      schoolName: 'SMA Negeri 2 Jakarta',
      gender: Gender.LAKI_LAKI,
      foodRestrictions: 'Kacang',
      isActive: true,
    },
    {
      nisn: '0011223347',
      name: 'Dewi Anggraeni',
      schoolName: 'SMA Negeri 2 Jakarta',
      gender: Gender.PEREMPUAN,
      foodRestrictions: null,
      isActive: true,
    },
    {
      nisn: '0011223348',
      name: 'Fajar Nugroho',
      schoolName: 'SMA Negeri 3 Jakarta',
      gender: Gender.LAKI_LAKI,
      foodRestrictions: 'Susu',
      isActive: false, // Siswa tidak aktif
    },
  ];

  for (const s of students) {
    const student = await prisma.student.create({ data: s });
    console.log(`✅ Siswa: ${student.name} | QR Token: ${student.qrToken}`);
  }

  console.log('\n🎉 Seed selesai!');
  console.log('\n📋 Akun login:');
  console.log('  Petugas → username: petugas01, password: petugas123');
  console.log('  Admin   → username: admin, password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
