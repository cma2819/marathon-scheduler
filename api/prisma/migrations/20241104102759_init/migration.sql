-- CreateEnum
CREATE TYPE "RunType" AS ENUM ('Single', 'Race', 'Coop', 'Relay');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discord" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "service" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beginAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" "RunType" NOT NULL,
    "estimateInSec" INTEGER NOT NULL,
    "console" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Runner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Runner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunParticipant" (
    "runId" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,

    CONSTRAINT "RunParticipant_pkey" PRIMARY KEY ("runId","runnerId")
);

-- CreateTable
CREATE TABLE "Availability" (
    "runnerId" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    "beginAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("runnerId","sort")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "beginAt" TIMESTAMPTZ NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRow" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "next" TEXT,
    "setupInSec" INTEGER NOT NULL,

    CONSTRAINT "ScheduleRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBeginning" (
    "scheduleId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PublicSchedule" (
    "scheduleId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "publishedAt" TIMESTAMPTZ NOT NULL,
    "revision" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discord_key" ON "User"("discord");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_service_userId_key" ON "Connection"("service", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Runner_userId_eventId_key" ON "Runner"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_eventId_slug_key" ON "Schedule"("eventId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRow_next_key" ON "ScheduleRow"("next");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRow_scheduleId_next_key" ON "ScheduleRow"("scheduleId", "next");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleBeginning_scheduleId_key" ON "ScheduleBeginning"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleBeginning_rowId_key" ON "ScheduleBeginning"("rowId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicSchedule_scheduleId_revision_key" ON "PublicSchedule"("scheduleId", "revision");

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Runner" ADD CONSTRAINT "Runner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Runner" ADD CONSTRAINT "Runner_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunParticipant" ADD CONSTRAINT "RunParticipant_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunParticipant" ADD CONSTRAINT "RunParticipant_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRow" ADD CONSTRAINT "ScheduleRow_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRow" ADD CONSTRAINT "ScheduleRow_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRow" ADD CONSTRAINT "ScheduleRow_next_fkey" FOREIGN KEY ("next") REFERENCES "ScheduleRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBeginning" ADD CONSTRAINT "ScheduleBeginning_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBeginning" ADD CONSTRAINT "ScheduleBeginning_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "ScheduleRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicSchedule" ADD CONSTRAINT "PublicSchedule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
