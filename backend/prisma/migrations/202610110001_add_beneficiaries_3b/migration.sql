BEGIN;
-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_studentId_fkey";

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "beneficiary3BId" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "beneficiaries_3b" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "rt" TEXT NOT NULL,
    "rw" TEXT NOT NULL,
    "kelurahan" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "foodRestrictions" TEXT,
    "decile" INTEGER NOT NULL,
    "photoPath" TEXT,
    "qrToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_3b_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_3b_nik_key" ON "beneficiaries_3b"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_3b_qrToken_key" ON "beneficiaries_3b"("qrToken");

-- CreateIndex
CREATE INDEX "attendances_beneficiary3BId_idx" ON "attendances"("beneficiary3BId");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_beneficiary3BId_attendanceDate_key" ON "attendances"("beneficiary3BId", "attendanceDate");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_beneficiary3BId_fkey" FOREIGN KEY ("beneficiary3BId") REFERENCES "beneficiaries_3b"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Exactly one recipient per attendance; preserve existing student attendance.
ALTER TABLE "attendances" ADD CONSTRAINT "attendance_one_recipient"
  CHECK (num_nonnulls("studentId", "beneficiary3BId") = 1);
ALTER TABLE "beneficiaries_3b" ADD CONSTRAINT "beneficiary_decile_range" CHECK ("decile" BETWEEN 1 AND 10);
ALTER TABLE "beneficiaries_3b" ADD CONSTRAINT "beneficiary_nik_format" CHECK ("nik" ~ '^[0-9]{16}$');
COMMIT;
