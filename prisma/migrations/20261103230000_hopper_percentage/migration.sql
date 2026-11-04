-- Rename hopper readings from grams to ultrasonic percentage.
ALTER TABLE "FeederStatus" RENAME COLUMN "hopperFoodGrams" TO "hopperFoodPercent";
ALTER TABLE "DeviceTelemetry" RENAME COLUMN "hopperFoodGrams" TO "hopperFoodPercent";

-- Capacity in grams is no longer part of the device status contract.
ALTER TABLE "FeederStatus" DROP COLUMN "hopperCapacityGrams";

-- Previous values were grams and cannot be interpreted as percentages.
UPDATE "FeederStatus" SET "hopperFoodPercent" = NULL;
UPDATE "DeviceTelemetry" SET "hopperFoodPercent" = NULL;
