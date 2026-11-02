-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "weightGrams" INTEGER NOT NULL,
    "birthDate" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feeder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "petId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feeder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feeder_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "dispensedAt" DATETIME,
    "completedAt" DATETIME,
    "dispensedGrams" INTEGER,
    "consumedGrams" INTEGER,
    "remainingGrams" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedingEvent_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeedingEvent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeederStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "plateFoodGrams" INTEGER NOT NULL DEFAULT 0,
    "hopperFoodGrams" INTEGER NOT NULL DEFAULT 0,
    "hopperCapacityGrams" INTEGER NOT NULL DEFAULT 2000,
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

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "species" TEXT NOT NULL,
    "proteinPercent" REAL,
    "fatPercent" REAL,
    "fiberPercent" REAL,
    "moisturePercent" REAL,
    "energyKcalPerKg" INTEGER,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FeederFood" (
    "feederId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "selectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("feederId", "foodId"),
    CONSTRAINT "FeederFood_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeederFood_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "requestedGrams" INTEGER,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "DeviceCommand_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceTelemetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "reportedAt" DATETIME NOT NULL,
    "plateFoodGrams" INTEGER,
    "hopperFoodGrams" INTEGER,
    "motorStatus" TEXT,
    "sensorStatus" TEXT,
    "wifiSignal" INTEGER,
    "firmwareVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceTelemetry_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feederId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "streamType" TEXT,
    "streamUrl" TEXT,
    "expiresAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Camera_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Feeder_deviceCode_key" ON "Feeder"("deviceCode");

-- CreateIndex
CREATE INDEX "Feeder_userId_idx" ON "Feeder"("userId");

-- CreateIndex
CREATE INDEX "Schedule_feederId_idx" ON "Schedule"("feederId");

-- CreateIndex
CREATE INDEX "FeedingEvent_feederId_createdAt_idx" ON "FeedingEvent"("feederId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedingEvent_status_idx" ON "FeedingEvent"("status");

-- CreateIndex
CREATE INDEX "FeederStatus_feederId_createdAt_idx" ON "FeederStatus"("feederId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_feederId_read_createdAt_idx" ON "Alert"("feederId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceCommand_feederId_status_createdAt_idx" ON "DeviceCommand"("feederId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceTelemetry_feederId_reportedAt_idx" ON "DeviceTelemetry"("feederId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Camera_feederId_key" ON "Camera"("feederId");

