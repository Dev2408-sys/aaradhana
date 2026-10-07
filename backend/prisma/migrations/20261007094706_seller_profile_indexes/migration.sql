-- AlterTable
ALTER TABLE "seller_profiles" ALTER COLUMN "level" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "seller_profiles_activation_status_idx" ON "seller_profiles"("activation_status");

-- CreateIndex
CREATE INDEX "seller_profiles_city_idx" ON "seller_profiles"("city");
