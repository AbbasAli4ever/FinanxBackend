-- DropIndex
DROP INDEX "roles_code_key";

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "is_system_role" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_reset_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "password_reset_token" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_password_reset_token_key" ON "users"("password_reset_token");

-- RenameIndex
ALTER INDEX "unique_company_role_code" RENAME TO "roles_company_id_code_key";
