/*
  Warnings:

  - Added the required column `type` to the `Attribute` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('MULTISELECT', 'SHORTTEXT');

-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "type" "AttributeType" NOT NULL;

-- AlterTable
ALTER TABLE "ProductAttributeValue" ADD COLUMN     "attributeOptionId" BIGINT,
ALTER COLUMN "value" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" BIGSERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "attributeId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttributeOption_attributeId_idx" ON "AttributeOption"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_attributeId_value_key" ON "AttributeOption"("attributeId", "value");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeOptionId_idx" ON "ProductAttributeValue"("attributeOptionId");

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
