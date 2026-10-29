ALTER TABLE "pricing_rules"
ADD COLUMN "createdById" TEXT;

UPDATE "pricing_rules"
SET "createdById" = '41aeaa50-a10b-484e-8ed3-3eae98563f18';

CREATE INDEX "pricing_rules_createdById_idx"
ON "pricing_rules"("createdById");

ALTER TABLE "pricing_rules"
ADD CONSTRAINT "pricing_rules_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
