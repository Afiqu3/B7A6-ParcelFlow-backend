DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "pricing_rules"
        WHERE "createdById" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot require pricing-rule creator: pricing_rules contains rows with a NULL createdById.';
    END IF;
END $$;

DROP INDEX IF EXISTS "pricing_rules_createdById_idx";

ALTER TABLE "pricing_rules"
DROP CONSTRAINT IF EXISTS "pricing_rules_createdById_fkey";

ALTER TABLE "pricing_rules"
ALTER COLUMN "createdById" SET NOT NULL;

ALTER TABLE "pricing_rules"
ADD CONSTRAINT "pricing_rules_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
