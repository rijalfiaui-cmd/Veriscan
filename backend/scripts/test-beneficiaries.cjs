// Run against a temporary PostgreSQL schema; existing application data is untouched.
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const bcrypt = require('bcrypt');
const originalUrl = process.env.DATABASE_URL;
assert(originalUrl, 'DATABASE_URL must be configured');
const schema = `test_3bl_${randomUUID().replaceAll('-', '')}`;
const testUrl = new URL(originalUrl);
testUrl.searchParams.set('schema', schema);
process.env.DATABASE_URL = testUrl.href;
process.env.JWT_SECRET = randomUUID();
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'absenqr-photos-'));
const admin = new PrismaClient({ datasources: { db: { url: originalUrl } } });
const prisma = new PrismaClient();
let app;
async function main() {
  execFileSync('./node_modules/.bin/prisma', ['migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  const staff = await prisma.staff.create({
    data: {
      username: 'test',
      name: 'Test Staff',
      password: await bcrypt.hash('test-password', 4),
    },
  });
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require('../dist/app.module');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1');
  app.useStaticAssets(process.env.UPLOAD_DIR, { prefix: '/uploads' });
  await app.init();
  const http = request(app.getHttpServer());
  const login = await http
    .post('/api/v1/auth/login')
    .send({ username: 'test', password: 'test-password' })
    .expect(201);
  const token = login.body.accessToken;
  const get = (path) =>
    http.get(`/api/v1${path}`).auth(token, { type: 'bearer' });
  const post = (path) =>
    http.post(`/api/v1${path}`).auth(token, { type: 'bearer' });
  const patch = (path) =>
    http.patch(`/api/v1${path}`).auth(token, { type: 'bearer' });
  const del = (path) =>
    http.delete(`/api/v1${path}`).auth(token, { type: 'bearer' });
  const payload = {
    name: 'Penerima Uji',
    nik: '0012345678901234',
    street: 'Jalan Uji 1',
    rt: '001',
    rw: '002',
    kelurahan: 'Kelurahan Uji',
    kecamatan: 'Kecamatan Uji',
    city: 'Kota Uji',
    province: 'Provinsi Uji',
    postalCode: '12345',
    foodRestrictions: 'Kacang',
    decile: 3,
    isActive: true,
  };
  await http.get('/api/v1/beneficiaries-3b').expect(401);
  for (const invalid of [
    { nik: '123' },
    { nik: 1234567890123456 },
    { decile: 0 },
    { decile: 11 },
    { decile: 1.5 },
    { isActive: null },
    { street: ' ' },
    { rt: 'abcd' },
    { postalCode: '12' },
  ]) {
    await post('/beneficiaries-3b')
      .send({ ...payload, ...invalid })
      .expect(400);
  }
  const created = await post('/beneficiaries-3b').send(payload).expect(201);
  const id = created.body.id;
  assert.equal(created.body.nik, payload.nik);
  assert.match(created.body.qrDataUrl, /^data:image\/png;base64,/);
  await post('/beneficiaries-3b').send(payload).expect(409);
  await patch(`/beneficiaries-3b/${id}`).send({ decile: null }).expect(400);
  await patch(`/beneficiaries-3b/${id}`).send({ nik: null }).expect(400);
  const other = await post('/beneficiaries-3b')
    .send({ ...payload, nik: '0012345678901235' })
    .expect(201);
  await patch(`/beneficiaries-3b/${other.body.id}`)
    .send({ nik: payload.nik })
    .expect(409);
  await del(`/beneficiaries-3b/${other.body.id}`).expect(200);
  const list = await get(
    '/beneficiaries-3b?search=001234&page=1&limit=20',
  ).expect(200);
  assert.equal(list.body.meta.total, 1);
  assert(!('qrToken' in list.body.data[0]));
  await get('/beneficiaries-3b?page=0').expect(400);
  const qr = await get(`/beneficiaries-3b/${id}/qr`).expect(200);
  assert.match(qr.body.qrDataUrl, /^data:image\/png;base64,/);
  const recipient = await prisma.beneficiary3B.findUniqueOrThrow({
    where: { id },
  });
  const png = Buffer.from(qr.body.qrDataUrl.split(',')[1], 'base64');
  await post(`/beneficiaries-3b/${id}/photo`).expect(400);
  await post(`/beneficiaries-3b/${id}/photo`)
    .attach('photo', Buffer.from('not an image'), {
      filename: 'fake.png',
      contentType: 'image/png',
    })
    .expect(400);
  await post(`/beneficiaries-3b/${id}/photo`)
    .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), {
      filename: 'large.png',
      contentType: 'image/png',
    })
    .expect(413);
  const photo = await post(`/beneficiaries-3b/${id}/photo`)
    .attach('photo', png, { filename: 'photo.png', contentType: 'image/png' })
    .expect(201);
  assert.match(photo.body.photoPath, /^\/uploads\/photos\/.*\.png$/);
  const uploaded = await http.get(photo.body.photoPath).expect(200);
  assert.deepEqual(uploaded.body, png);
  const scans = await Promise.all([
    post('/attendance/scan').send({ qrToken: recipient.qrToken }),
    post('/attendance/scan').send({ qrToken: recipient.qrToken }),
  ]);
  assert.deepEqual(scans.map((r) => r.body.status).sort(), [
    'already_present',
    'recorded',
  ]);
  const scan = scans.find((r) => r.body.status === 'recorded').body;
  assert.equal(scan.recipient.type, 'THREE_B_ELDERLY');
  assert.equal(scan.recipient.identifier, payload.nik);
  assert.equal(scan.recipient.decile, 3);
  assert(scan.recipient.address.includes('RT 001/RW 002'));
  assert.match(scan.attendance.time, /\+07:00$/);
  assert(
    Math.abs(Date.now() - new Date(scan.attendance.time).getTime()) < 10000,
  );
  await patch(`/beneficiaries-3b/${id}`)
    .send({ foodRestrictions: '', isActive: false })
    .expect(200);
  const inactive = await post('/attendance/scan')
    .send({ qrToken: recipient.qrToken })
    .expect(403);
  assert.equal(inactive.body.status, 'inactive_beneficiary');
  assert.equal(inactive.body.recipient.foodRestrictions, '');
  const student = await post('/students')
    .send({
      nisn: '0012345678',
      name: 'Siswa Uji',
      schoolName: 'Sekolah Uji',
      gender: 'LAKI_LAKI',
    })
    .expect(201);
  await post(`/students/${student.body.id}/photo`).expect(400);
  await post(`/students/${student.body.id}/photo`)
    .attach('photo', png, { filename: 'camera.png', contentType: 'image/png' })
    .expect(201);
  const studentScan = await post('/attendance/scan')
    .send({ qrToken: student.body.qrToken })
    .expect(201);
  assert.equal(studentScan.body.status, 'recorded');
  assert.equal(studentScan.body.recipient.type, 'STUDENT');
  assert.equal(studentScan.body.student.nisn, '0012345678');
  const duplicate = await post('/attendance/scan')
    .send({ qrToken: student.body.qrToken })
    .expect(201);
  assert.equal(duplicate.body.status, 'already_present');
  await post('/attendance/scan').send({ qrToken: randomUUID() }).expect(404);
  await post('/attendance/scan').send({ qrToken: 'bad-qr' }).expect(400);
  const all = await get('/attendance').expect(200);
  assert.equal(all.body.meta.total, 2);
  const filtered = await get(
    '/attendance?type=THREE_B_ELDERLY&search=001234',
  ).expect(200);
  assert.equal(filtered.body.meta.total, 1);
  assert.equal(filtered.body.data[0].recipient.type, 'THREE_B_ELDERLY');
  assert.equal(
    (await get('/attendance?type=STUDENT').expect(200)).body.meta.total,
    1,
  );
  assert.equal(
    (await get(`/attendance?date=${scan.attendance.date}`).expect(200)).body
      .meta.total,
    2,
  );
  assert.equal(
    (await get(`/attendance/${scan.attendance.id}`).expect(200)).body.recipient
      .identifier,
    payload.nik,
  );
  await get('/attendance?date=2026-02-30').expect(400);
  await get('/attendance?limit=101').expect(400);
  await get('/attendance?type=invalid').expect(400);
  const date = new Date(`${scan.attendance.date}T00:00:00Z`);
  for (const data of [
    { staffId: staff.id, attendanceDate: date, scannedAt: new Date() },
    {
      staffId: staff.id,
      studentId: student.body.id,
      beneficiary3BId: id,
      attendanceDate: new Date('2000-01-01'),
      scannedAt: new Date(),
    },
  ])
    await assert.rejects(prisma.attendance.create({ data }));
  await assert.rejects(
    prisma.beneficiary3B.create({
      data: { ...payload, nik: '0012345678901299', decile: 11 },
    }),
  );
  await del(`/beneficiaries-3b/${id}`).expect(200);
  assert.equal(
    await prisma.attendance.count({ where: { beneficiary3BId: id } }),
    0,
  );
  assert.equal(
    await prisma.attendance.count({ where: { studentId: student.body.id } }),
    1,
  );
  console.log(
    'PASS: migrations, authentication, validation, CRUD, photos, QR, concurrent duplicate protection, student compatibility, filtering, Jakarta time, database constraints, deletion.',
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  });
