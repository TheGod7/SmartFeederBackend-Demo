-- Add metadata required by the food catalog.
ALTER TABLE "Food" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'dry';
ALTER TABLE "Food" ADD COLUMN "lifeStage" TEXT NOT NULL DEFAULT 'adult';
ALTER TABLE "Food" ADD COLUMN "imageAlt" TEXT;
ALTER TABLE "Food" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Food" ADD COLUMN "nutritionBasis" TEXT NOT NULL DEFAULT 'as_fed';
