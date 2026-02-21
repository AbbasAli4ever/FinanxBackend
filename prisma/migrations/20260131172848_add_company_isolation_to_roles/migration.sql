-- Add company_id column to roles table (nullable for system roles)
ALTER TABLE "roles" ADD COLUMN "company_id" UUID;

-- Add foreign key constraint
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the old unique constraint on code
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_code_key";

-- Add new unique constraint for company_id + code combination
-- This allows same code across different companies, but unique within a company
ALTER TABLE "roles" ADD CONSTRAINT "unique_company_role_code"
  UNIQUE ("company_id", "code");

-- Add index for company_id for faster queries
CREATE INDEX "idx_roles_company" ON "roles"("company_id");

-- Update existing system roles to have NULL company_id (already NULL by default)
-- Custom roles will need company_id set when created
