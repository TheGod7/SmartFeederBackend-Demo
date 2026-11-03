-- AlterTable
ALTER TABLE "DeviceCommand" ADD COLUMN "feedingEventId" TEXT;
ALTER TABLE "DeviceCommand" ADD COLUMN "executionKey" TEXT;
ALTER TABLE "DeviceCommand" ADD COLUMN "processingAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCommand_feedingEventId_key" ON "DeviceCommand"("feedingEventId");
CREATE UNIQUE INDEX "DeviceCommand_executionKey_key" ON "DeviceCommand"("executionKey");

-- AddForeignKey
ALTER TABLE "DeviceCommand" ADD CONSTRAINT "DeviceCommand_feedingEventId_fkey" FOREIGN KEY ("feedingEventId") REFERENCES "FeedingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
