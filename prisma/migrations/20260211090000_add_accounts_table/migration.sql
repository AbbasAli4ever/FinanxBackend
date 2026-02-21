-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "account_number" VARCHAR(20),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "account_type" VARCHAR(50) NOT NULL,
    "detail_type" VARCHAR(100) NOT NULL,
    "normal_balance" VARCHAR(10) NOT NULL,
    "parent_account_id" UUID,
    "is_sub_account" BOOLEAN NOT NULL DEFAULT false,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "full_path" VARCHAR(500),
    "current_balance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "is_system_account" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_company_account_number" ON "accounts"("company_id", "account_number");

-- CreateIndex
CREATE UNIQUE INDEX "unique_company_account_name" ON "accounts"("company_id", "name", "parent_account_id");

-- CreateIndex
CREATE INDEX "idx_accounts_company" ON "accounts"("company_id");

-- CreateIndex
CREATE INDEX "idx_accounts_type" ON "accounts"("company_id", "account_type");

-- CreateIndex
CREATE INDEX "idx_accounts_active" ON "accounts"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_accounts_parent" ON "accounts"("parent_account_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
