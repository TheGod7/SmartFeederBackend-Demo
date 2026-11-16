-- Persist the before/after plate measurements and link them to the feeding event.
CREATE TABLE "PetPresenceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "feedingEventId" TEXT,
    "detectedAt" DATETIME NOT NULL,
    "leftAt" DATETIME,
    "foodBeforeGrams" INTEGER,
    "foodAfterGrams" INTEGER,
    "consumedGrams" INTEGER,
    "expectedGrams" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PetPresenceSession_feederId_fkey"
      FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PetPresenceSession_feedingEventId_fkey"
      FOREIGN KEY ("feedingEventId") REFERENCES "FeedingEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PetPresenceSession_feederId_status_detectedAt_idx"
  ON "PetPresenceSession"("feederId", "status", "detectedAt");

CREATE INDEX "PetPresenceSession_feedingEventId_idx"
  ON "PetPresenceSession"("feedingEventId");
