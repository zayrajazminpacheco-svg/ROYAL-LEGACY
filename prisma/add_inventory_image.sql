ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "imageName" TEXT,
  ADD COLUMN IF NOT EXISTS "imageMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "imageSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "imageData" BYTEA;

ALTER TABLE "InventoryItem"
  DROP CONSTRAINT IF EXISTS "InventoryItem_imageSize_check";

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_imageSize_check"
  CHECK (
    "imageSize" IS NULL OR
    (
      "imageSize" > 0 AND
      "imageSize" <= 2097152
    )
  );