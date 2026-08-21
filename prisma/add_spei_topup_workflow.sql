BEGIN;

ALTER TABLE "SpeiTopUp"
  ADD COLUMN IF NOT EXISTS "receiverBank" TEXT,
  ADD COLUMN IF NOT EXISTS "operationDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cepFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "cepMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "cepSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "cepData" BYTEA,
  ADD COLUMN IF NOT EXISTS "cepLocalMatch" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "banxicoValidated" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "banxicoValidatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "SpeiTopUp_trackingKey_unique"
  ON "SpeiTopUp" ("trackingKey")
  WHERE "trackingKey" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_speiTopUp_credit_unique"
  ON "WalletTransaction" ("speiTopUpId")
  WHERE "speiTopUpId" IS NOT NULL
    AND "type" = 'SPEI_RECHARGE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SpeiTopUp_amount_positive_check'
  ) THEN
    ALTER TABLE "SpeiTopUp"
      ADD CONSTRAINT "SpeiTopUp_amount_positive_check"
      CHECK ("amount" > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SpeiTopUp_cep_size_check'
  ) THEN
    ALTER TABLE "SpeiTopUp"
      ADD CONSTRAINT "SpeiTopUp_cep_size_check"
      CHECK (
        "cepSize" IS NULL
        OR (
          "cepSize" > 0
          AND "cepSize" <= 1048576
        )
      );
  END IF;
END $$;

COMMIT;
