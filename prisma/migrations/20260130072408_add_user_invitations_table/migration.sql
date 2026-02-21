-- CreateTable
CREATE TABLE "user_invitations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role_id" UUID NOT NULL,
    "invitation_token" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "invited_by" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "accepted_at" TIMESTAMPTZ(6),
    "accepted_by_user_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_invitation_token_key" ON "user_invitations"("invitation_token");

-- CreateIndex
CREATE INDEX "idx_invitations_company" ON "user_invitations"("company_id");

-- CreateIndex
CREATE INDEX "idx_invitations_email" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX "idx_invitations_token" ON "user_invitations"("invitation_token");

-- CreateIndex
CREATE INDEX "idx_invitations_status" ON "user_invitations"("status");

-- CreateIndex
CREATE INDEX "idx_invitations_expires" ON "user_invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_company_id_email_status_key" ON "user_invitations"("company_id", "email", "status");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
