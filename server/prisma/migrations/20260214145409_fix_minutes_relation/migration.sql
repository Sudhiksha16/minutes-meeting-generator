/*
  Warnings:

  - You are about to drop the `Minutes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Minutes" DROP CONSTRAINT "Minutes_meetingId_fkey";

-- DropTable
DROP TABLE "Minutes";

-- CreateTable
CREATE TABLE "MeetingMinutes" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "mom" TEXT NOT NULL,
    "decisions" JSONB NOT NULL,
    "actionItems" JSONB NOT NULL,
    "tags" TEXT[],
    "isSensitive" BOOLEAN NOT NULL,
    "sensitivityReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingMinutes_meetingId_key" ON "MeetingMinutes"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingMinutes_orgId_idx" ON "MeetingMinutes"("orgId");

-- CreateIndex
CREATE INDEX "MeetingMinutes_generatedBy_idx" ON "MeetingMinutes"("generatedBy");

-- AddForeignKey
ALTER TABLE "MeetingMinutes" ADD CONSTRAINT "MeetingMinutes_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
