ALTER TABLE "pricing_rules"
ADD COLUMN "updatedById" TEXT;

ALTER TABLE "pricing_rules"
ADD CONSTRAINT "pricing_rules_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
