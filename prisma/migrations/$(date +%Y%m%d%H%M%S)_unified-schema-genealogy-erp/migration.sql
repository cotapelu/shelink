-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "RelationType" AS ENUM ('PARENT_CHILD', 'SPOUSE', 'SIBLING', 'GRANDPARENT', 'GRANDCHILD', 'UNCLE_AUNT', 'NEPHEW_NIECE', 'COUSIN', 'PARTNER', 'GUARDIAN', 'WARD');
CREATE TYPE "EventType" AS ENUM ('BIRTH', 'DEATH', 'MARRIAGE', 'DIVORCE', 'ADOPTION', 'MIGRATION', 'EDUCATION', 'EMPLOYMENT', 'MEDICAL', 'CUSTOM');
-- (Note: TaskStatus, TaskPriority, ProjectStatus, WorkflowState đã có)

-- CreateTable
CREATE TABLE "Lineage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "personId" TEXT NOT NULL,
    "rootPersonId" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lineage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lineage_personId_rootPersonId_key" ON "Lineage"("personId", "rootPersonId");
CREATE INDEX "Lineage_rootPersonId_idx" ON "Lineage"("rootPersonId");
CREATE INDEX "Lineage_generation_idx" ON "Lineage"("generation");

-- AddForeignKey
ALTER TABLE "Lineage" ADD CONSTRAINT "Lineage_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lineage" ADD CONSTRAINT "Lineage_rootPersonId_fkey" FOREIGN KEY ("rootPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add relation fields on Person (Prisma will manage these via relations)
-- No need for extra columns
