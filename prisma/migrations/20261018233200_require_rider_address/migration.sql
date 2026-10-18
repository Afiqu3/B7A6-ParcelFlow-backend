DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "riderProfiles"
        WHERE "address" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot require rider address: riderProfiles contains rows with a NULL address. Populate those addresses and rerun the migration.';
    END IF;
END $$;

ALTER TABLE "riderProfiles"
ALTER COLUMN "address" SET NOT NULL;
