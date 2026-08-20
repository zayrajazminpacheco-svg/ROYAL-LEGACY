CREATE TABLE IF NOT EXISTS "SupportReport" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "saleItemId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'OTHER',
  "subject" TEXT,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "adminResponse" TEXT,
  "attachmentName" TEXT,
  "attachmentMimeType" TEXT,
  "attachmentSize" INTEGER,
  "attachmentData" BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "SupportReport_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "SupportReport_type_check"
    CHECK (
      "type" IN (
        'ACCESS',
        'PASSWORD',
        'CODE',
        'PROFILE',
        'EXPIRATION',
        'PAYMENT',
        'OTHER'
      )
    ),

  CONSTRAINT "SupportReport_status_check"
    CHECK (
      "status" IN (
        'OPEN',
        'IN_REVIEW',
        'WAITING_CLIENT',
        'RESOLVED',
        'CLOSED'
      )
    ),

  CONSTRAINT "SupportReport_priority_check"
    CHECK (
      "priority" IN (
        'LOW',
        'NORMAL',
        'HIGH',
        'URGENT'
      )
    ),

  CONSTRAINT "SupportReport_attachment_size_check"
    CHECK (
      "attachmentData" IS NULL OR
      OCTET_LENGTH("attachmentData") <= 2097152
    )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SupportReport_clientId_fkey'
  ) THEN
    ALTER TABLE "SupportReport"
      ADD CONSTRAINT "SupportReport_clientId_fkey"
      FOREIGN KEY ("clientId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SupportReport_saleId_fkey'
  ) THEN
    ALTER TABLE "SupportReport"
      ADD CONSTRAINT "SupportReport_saleId_fkey"
      FOREIGN KEY ("saleId")
      REFERENCES "Sale"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SupportReport_saleItemId_fkey'
  ) THEN
    ALTER TABLE "SupportReport"
      ADD CONSTRAINT "SupportReport_saleItemId_fkey"
      FOREIGN KEY ("saleItemId")
      REFERENCES "SaleItem"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS
  "SupportReport_clientId_createdAt_idx"
ON "SupportReport"(
  "clientId",
  "createdAt"
);

CREATE INDEX IF NOT EXISTS
  "SupportReport_saleId_idx"
ON "SupportReport"(
  "saleId"
);

CREATE INDEX IF NOT EXISTS
  "SupportReport_saleItemId_idx"
ON "SupportReport"(
  "saleItemId"
);

CREATE INDEX IF NOT EXISTS
  "SupportReport_status_createdAt_idx"
ON "SupportReport"(
  "status",
  "createdAt"
);