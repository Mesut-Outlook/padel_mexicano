import express from 'express';
import cors from 'cors';
import { PrismaClient } from './src/generated/prisma/index.js';

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Default player pool
const DEFAULT_PLAYER_POOL = [
  'Mesut', 'Mumtaz', 'Berk', 'Erdem', 'Hulusi',
  'Emre', 'Ahmet', 'Batuhan', 'Sercan', 'Okan', 'Deniz', 'Sezgin'
];

// Types (simplified for JS)
const TournamentData = {
  players: [],
  rounds: [],
  totals: {},
  byeCounts: {},
  courtCount: 2,
  tournamentStarted: false,
  currentRound: 0,
  playerPool: []
};

// Helper function to convert DB data to TournamentData
async function convertDbToTournamentData(tournament) {
  const players = tournament.players.map((tp) => tp.player.name);
  const playerPool = tournament.playerPool.map((p) => p.name);
  const totals = {};
  const byeCounts = {};

  tournament.players.forEach((tp) => {
    totals[tp.player.name] = tp.totalPoints;
    byeCounts[tp.player.name] = tp.byeCount;
  });

  const rounds = tournament.rounds.map((r) => ({
    number: r.number,
    rankingSnapshot: r.rankingSnapshot,
    byes: r.byes,
    submitted: r.submitted,
    matches: r.matches.map((m) => ({
      teamA: m.teamA,
      teamB: m.teamB,
        scoreA: m.scoreA ?? undefined,
        scoreB: m.scoreB ?? undefined,
        winner: m.winner || undefined,
      perPlayerPoints: m.players.reduce((acc, pm) => {
        acc[pm.player.name] = pm.points;
        return acc;
      }, {})
    }))
  }));

  return {
    players,
    rounds,
    totals,
    byeCounts,
    courtCount: tournament.courtCount,
    tournamentStarted: tournament.tournamentStarted,
    currentRound: tournament.currentRound,
    playerPool,
    name: tournament.name || undefined,
    tournamentId: tournament.tournamentId
  };
}

// Routes

// List all tournaments (should be declared before :tournamentId route)
app.get('/api/tournaments/list', async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        players: {
          include: { player: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const normalizedTournaments = Array.isArray(tournaments) ? tournaments : [];

    const tournamentList = normalizedTournaments.map((t) => ({
      id: t.tournamentId,
      name: t.name || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      playerCount: t.players.length,
      tournamentStarted: t.tournamentStarted,
      currentRound: t.currentRound,
      estimatedRounds: t.estimatedRounds ?? undefined,
      days: t.days ?? undefined,
      location: t.location ?? undefined,
      startDate: t.startDate ? t.startDate.toISOString() : undefined,
      endDate: t.endDate ? t.endDate.toISOString() : undefined,
      courtCount: t.courtCount
    }));

    console.log('[api/tournaments/list] returning', tournamentList.length, 'records');

    res.json({ tournaments: tournamentList || [] });
  } catch (error) {
    console.error('Error listing tournaments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tournaments/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { tournamentId },
      include: {
        players: { include: { player: true } },
        rounds: {
          include: {
            matches: {
              include: { players: { include: { player: true } } }
            }
          },
          orderBy: { number: 'asc' }
        },
        playerPool: true
      }
    });

    if (!tournament) {
      return res.json(null);
    }

    const tournamentData = await convertDbToTournamentData(tournament);
    res.json(tournamentData);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tournaments/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournamentData = req.body;

    // Find or create tournament
    let tournament = await prisma.tournament.findUnique({
      where: { tournamentId }
    });

    if (!tournament) {
      tournament = await prisma.tournament.create({
        data: {
          tournamentId,
          name: tournamentData.name, // Turnuva ismini ekle
          courtCount: tournamentData.courtCount || 2,
          tournamentStarted: tournamentData.tournamentStarted,
          currentRound: tournamentData.currentRound,
        }
      });
    } else {
      // Update tournament basic info
      await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          name: tournamentData.name, // Turnuva ismini güncelle
          courtCount: tournamentData.courtCount || 2,
          tournamentStarted: tournamentData.tournamentStarted,
          currentRound: tournamentData.currentRound,
        }
      });
    }

    // Update players
    await prisma.tournamentPlayer.deleteMany({
      where: { tournamentId: tournament.id }
    });

    for (const playerName of tournamentData.players) {
      const player = await prisma.player.upsert({
        where: { name: playerName },
        update: {},
        create: { name: playerName }
      });

      await prisma.tournamentPlayer.create({
        data: {
          tournamentId: tournament.id,
          playerId: player.id,
          totalPoints: tournamentData.totals[playerName] || 0,
          byeCount: tournamentData.byeCounts[playerName] || 0
        }
      });
    }

    // Update player pool
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { playerPool: { set: [] } }
    });

    for (const playerName of tournamentData.playerPool) {
      const player = await prisma.player.upsert({
        where: { name: playerName },
        update: {},
        create: { name: playerName }
      });

      await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          playerPool: { connect: { id: player.id } }
        }
      });
    }

    // Update rounds and matches
    await prisma.round.deleteMany({
      where: { tournamentId: tournament.id }
    });

    for (const round of tournamentData.rounds) {
      const dbRound = await prisma.round.create({
        data: {
          tournamentId: tournament.id,
          number: round.number,
          rankingSnapshot: round.rankingSnapshot,
          byes: round.byes,
          submitted: round.submitted || false,
        }
      });

      for (const match of round.matches) {
        const dbMatch = await prisma.match.create({
          data: {
            roundId: dbRound.id,
            teamA: match.teamA,
            teamB: match.teamB,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            winner: match.winner,
          }
        });

        // Create player-match relationships
        if (match.perPlayerPoints) {
          for (const [playerName, points] of Object.entries(match.perPlayerPoints)) {
            const player = await prisma.player.findUnique({
              where: { name: playerName }
            });
            if (player) {
              await prisma.playerMatch.create({
                data: {
                  matchId: dbMatch.id,
                  playerId: player.id,
                  points: points
                }
              });
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tournaments/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    await prisma.tournament.delete({
      where: { tournamentId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Vercel'in sunucusuz ortamı için app'i dışa aktar
export default app;