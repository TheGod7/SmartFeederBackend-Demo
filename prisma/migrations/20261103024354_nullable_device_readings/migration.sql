-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeederStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "plateFoodGrams" INTEGER,
    "hopperFoodGrams" INTEGER,
    "hopperCapacityGrams" INTEGER,
    "lastDispensedGrams" INTEGER,
    "lastDispensedAt" DATETIME,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME,
    "firmwareVersion" TEXT,
    "motorStatus" TEXT NOT NULL DEFAULT 'ready',
    "sensorStatus" TEXT NOT NULL DEFAULT 'not_calibrated',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeederStatus_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FeederStatus" ("createdAt", "feederId", "firmwareVersion", "hopperCapacityGrams", "hopperFoodGrams", "id", "isOnline", "lastDispensedAt", "lastDispensedGrams", "lastSeenAt", "motorStatus", "plateFoodGrams", "sensorStatus") SELECT "createdAt", "feederId", "firmwareVersion", "hopperCapacityGrams", "hopperFoodGrams", "id", "isOnline", "lastDispensedAt", "lastDispensedGrams", "lastSeenAt", "motorStatus", "plateFoodGrams", "sensorStatus" FROM "FeederStatus";
DROP TABLE "FeederStatus";
ALTER TABLE "new_FeederStatus" RENAME TO "FeederStatus";
CREATE INDEX "FeederStatus_feederId_createdAt_idx" ON "FeederStatus"("feederId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
