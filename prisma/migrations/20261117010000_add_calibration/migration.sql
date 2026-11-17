CREATE TABLE "Calibration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "knownGrams" INTEGER,
    "calibrationFactor" REAL,
    "tareOffset" REAL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Calibration_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Calibration_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "DeviceCommand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Calibration_commandId_key" ON "Calibration"("commandId");
CREATE INDEX "Calibration_feederId_createdAt_idx" ON "Calibration"("feederId", "createdAt");
CREATE INDEX "Calibration_feederId_status_idx" ON "Calibration"("feederId", "status");
