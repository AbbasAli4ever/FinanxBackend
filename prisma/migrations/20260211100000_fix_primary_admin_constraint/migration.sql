-- Drop the broken unique constraint (only allowed 1 true + 1 false per company)
DROP INDEX IF EXISTS "idx_users_one_primary_admin";

-- Create a partial unique index: only ONE primary admin per company
CREATE UNIQUE INDEX "idx_users_one_primary_admin" ON "users" ("company_id")
WHERE "is_primary_admin" = true;
