-- Values migrated from hopper grams are not valid infrared-sensor percentages.
UPDATE "FeederStatus" SET "hopperFoodPercent" = NULL;
UPDATE "DeviceTelemetry" SET "hopperFoodPercent" = NULL;
