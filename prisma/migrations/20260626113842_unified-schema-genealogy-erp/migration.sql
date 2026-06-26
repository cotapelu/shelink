-- CreateEnum (skip, existing enums already present)
-- Lineage table creation
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

-- Indexes
CREATE UNIQUE INDEX "Lineage_personId_rootPersonId_key" ON "Lineage"("personId", "rootPersonId");
CREATE INDEX "Lineage_rootPersonId_idx" ON "Lineage"("rootPersonId");
CREATE INDEX "Lineage_generation_idx" ON "Lineage"("generation");

-- Foreign keys
ALTER TABLE "Lineage" ADD CONSTRAINT "Lineage_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lineage" ADD CONSTRAINT "Lineage_rootPersonId_fkey" FOREIGN KEY ("rootPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: TaskPriority enum change from CRITICAL to URGENT is not included; kept CRITICAL to avoid data migration. UI will map.
