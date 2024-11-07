/*
  Warnings:

  - A unique constraint covering the columns `[runId]` on the table `ScheduleRow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRow_runId_key" ON "ScheduleRow"("runId");
