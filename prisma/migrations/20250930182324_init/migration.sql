-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "courtCount" INTEGER NOT NULL DEFAULT 2,
    "tournamentStarted" BOOLEAN NOT NULL DEFAULT false,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_players" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "byeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "rankingSnapshot" TEXT[],
    "byes" TEXT[],
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "tournamentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "teamA" TEXT[],
    "teamB" TEXT[],
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "winner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_matches" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlayerToTournament" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PlayerToTournament_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_tournamentId_key" ON "tournaments"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "players_name_key" ON "players"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_players_tournamentId_playerId_key" ON "tournament_players"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_tournamentId_number_key" ON "rounds"("tournamentId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "player_matches_matchId_playerId_key" ON "player_matches"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "_PlayerToTournament_B_index" ON "_PlayerToTournament"("B");

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerToTournament" ADD CONSTRAINT "_PlayerToTournament_A_fkey" FOREIGN KEY ("A") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerToTournament" ADD CONSTRAINT "_PlayerToTournament_B_fkey" FOREIGN KEY ("B") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
