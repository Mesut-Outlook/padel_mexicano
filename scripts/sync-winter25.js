/*
 * Script to push the Winter25 tournament data to the deployed API (and Neon DB).
 * Usage: node scripts/sync-winter25.js [baseUrl]
 * baseUrl defaults to https://padel-mexicano-jwa7.vercel.app
 */

const tournamentId = 'winter25';
const baseUrl = process.argv[2] || 'https://padel-mexicano-jwa7.vercel.app';

const tournamentPayload = {
  name: 'Winter25',
  players: ['Mumtaz', 'Deniz', 'Murat', 'Berk', 'Mesut', 'Batuhan', 'Zafer', 'Ahmet'],
  playerPool: [],
  courtCount: 2,
  tournamentStarted: true,
  currentRound: 7,
  totals: {
    Mumtaz: 152,
    Deniz: 149,
    Murat: 181,
    Berk: 173,
    Mesut: 174,
    Batuhan: 177,
    Zafer: 132,
    Ahmet: 174
  },
  byeCounts: {
    Mumtaz: 0,
    Deniz: 0,
    Murat: 0,
    Berk: 0,
    Mesut: 0,
    Batuhan: 0,
    Zafer: 0,
    Ahmet: 0
  },
  rounds: [
    {
      number: 1,
      rankingSnapshot: ['Mumtaz', 'Deniz', 'Murat', 'Berk', 'Mesut', 'Batuhan', 'Zafer', 'Ahmet'],
      byes: [],
      submitted: true,
      savedAt: '2025-10-29T11:00:00.000Z',
      matches: [
        {
          teamA: ['Mumtaz', 'Deniz'],
          teamB: ['Murat', 'Berk'],
          scoreA: 19,
          scoreB: 32,
          winner: 'B',
          court: 1,
          updatedAt: '2025-10-29T11:00:00.000Z',
          savedAt: '2025-10-29T11:00:00.000Z',
          perPlayerPoints: {
            Mumtaz: 19,
            Deniz: 19,
            Murat: 32,
            Berk: 32
          }
        },
        {
          teamA: ['Mesut', 'Batuhan'],
          teamB: ['Zafer', 'Ahmet'],
          scoreA: 32,
          scoreB: 20,
          winner: 'A',
          court: 2,
          updatedAt: '2025-10-29T11:05:00.000Z',
          savedAt: '2025-10-29T11:05:00.000Z',
          perPlayerPoints: {
            Mesut: 32,
            Batuhan: 32,
            Zafer: 20,
            Ahmet: 20
          }
        }
      ]
    },
    {
      number: 2,
      rankingSnapshot: ['Murat', 'Berk', 'Mesut', 'Batuhan', 'Zafer', 'Ahmet', 'Mumtaz', 'Deniz'],
      byes: [],
      submitted: true,
      savedAt: '2025-10-29T12:30:00.000Z',
      matches: [
        {
          teamA: ['Berk', 'Mumtaz'],
          teamB: ['Murat', 'Deniz'],
          scoreA: 32,
          scoreB: 30,
          winner: 'A',
          court: 1,
          updatedAt: '2025-10-29T12:30:00.000Z',
          savedAt: '2025-10-29T12:30:00.000Z',
          perPlayerPoints: {
            Berk: 32,
            Mumtaz: 32,
            Murat: 30,
            Deniz: 30
          }
        },
        {
          teamA: ['Batuhan', 'Zafer'],
          teamB: ['Mesut', 'Ahmet'],
          scoreA: 32,
          scoreB: 27,
          winner: 'A',
          court: 2,
          updatedAt: '2025-10-29T12:35:00.000Z',
          savedAt: '2025-10-29T12:35:00.000Z',
          perPlayerPoints: {
            Batuhan: 32,
            Zafer: 32,
            Mesut: 27,
            Ahmet: 27
          }
        }
      ]
    },
    {
      number: 3,
      rankingSnapshot: ['Berk', 'Batuhan', 'Murat', 'Mumtaz', 'Deniz', 'Mesut', 'Ahmet', 'Zafer'],
      byes: [],
      submitted: true,
      savedAt: '2025-10-29T14:00:00.000Z',
      matches: [
        {
          teamA: ['Batuhan', 'Ahmet'],
          teamB: ['Berk', 'Deniz'],
          scoreA: 31,
          scoreB: 32,
          winner: 'B',
          court: 1,
          updatedAt: '2025-10-29T14:00:00.000Z',
          savedAt: '2025-10-29T14:00:00.000Z',
          perPlayerPoints: {
            Batuhan: 31,
            Ahmet: 31,
            Berk: 32,
            Deniz: 32
          }
        },
        {
          teamA: ['Murat', 'Mumtaz'],
          teamB: ['Mesut', 'Zafer'],
          scoreA: 32,
          scoreB: 19,
          winner: 'A',
          court: 2,
          updatedAt: '2025-10-29T14:05:00.000Z',
          savedAt: '2025-10-29T14:05:00.000Z',
          perPlayerPoints: {
            Murat: 32,
            Mumtaz: 32,
            Mesut: 19,
            Zafer: 19
          }
        }
      ]
    },
    {
      number: 4,
      rankingSnapshot: ['Batuhan', 'Murat', 'Berk', 'Mesut', 'Ahmet', 'Mumtaz', 'Zafer', 'Deniz'],
      byes: [],
      submitted: true,
      savedAt: '2025-10-29T15:30:00.000Z',
      matches: [
        {
          teamA: ['Berk', 'Zafer'],
          teamB: ['Batuhan', 'Ahmet'],
          scoreA: 20,
          scoreB: 32,
          winner: 'B',
          court: 1,
          updatedAt: '2025-10-29T15:30:00.000Z',
          savedAt: '2025-10-29T15:30:00.000Z',
          perPlayerPoints: {
            Berk: 20,
            Zafer: 20,
            Batuhan: 32,
            Ahmet: 32
          }
        },
        {
          teamA: ['Murat', 'Mesut'],
          teamB: ['Mumtaz', 'Deniz'],
          scoreA: 32,
          scoreB: 8,
          winner: 'A',
          court: 2,
          updatedAt: '2025-10-29T15:35:00.000Z',
          savedAt: '2025-10-29T15:35:00.000Z',
          perPlayerPoints: {
            Murat: 32,
            Mesut: 32,
            Mumtaz: 8,
            Deniz: 8
          }
        }
      ]
    },
    {
      number: 5,
      rankingSnapshot: ['Batuhan', 'Murat', 'Berk', 'Mesut', 'Ahmet', 'Deniz', 'Mumtaz', 'Zafer'],
      byes: [],
      submitted: true,
      savedAt: '2025-10-29T17:00:00.000Z',
      matches: [
        {
          teamA: ['Batuhan', 'Deniz'],
          teamB: ['Murat', 'Zafer'],
          scoreA: 32,
          scoreB: 23,
          winner: 'A',
          court: 1,
          updatedAt: '2025-10-29T17:00:00.000Z',
          savedAt: '2025-10-29T17:00:00.000Z',
          perPlayerPoints: {
            Batuhan: 32,
            Deniz: 32,
            Murat: 23,
            Zafer: 23
          }
        },
        {
          teamA: ['Berk', 'Mumtaz'],
          teamB: ['Mesut', 'Ahmet'],
          scoreA: 29,
          scoreB: 32,
          winner: 'B',
          court: 2,
          updatedAt: '2025-10-29T17:05:00.000Z',
          savedAt: '2025-10-29T17:05:00.000Z',
          perPlayerPoints: {
            Berk: 29,
            Mumtaz: 29,
            Mesut: 32,
            Ahmet: 32
          }
        }
      ]
    },
    {
      number: 6,
      rankingSnapshot: ['Murat', 'Batuhan', 'Mesut', 'Ahmet', 'Berk', 'Mumtaz', 'Deniz', 'Zafer'],
      byes: [],
      submitted: true,
      savedAt: '2025-10-29T18:30:00.000Z',
      matches: [
        {
          teamA: ['Batuhan', 'Zafer'],
          teamB: ['Murat', 'Mumtaz'],
          scoreA: 18,
          scoreB: 32,
          winner: 'B',
          court: 1,
          updatedAt: '2025-10-29T18:30:00.000Z',
          savedAt: '2025-10-29T18:30:00.000Z',
          perPlayerPoints: {
            Batuhan: 18,
            Zafer: 18,
            Murat: 32,
            Mumtaz: 32
          }
        },
        {
          teamA: ['Berk', 'Deniz'],
          teamB: ['Mesut', 'Ahmet'],
          scoreA: 28,
          scoreB: 32,
          winner: 'B',
          court: 2,
          updatedAt: '2025-10-29T18:35:00.000Z',
          savedAt: '2025-10-29T18:35:00.000Z',
          perPlayerPoints: {
            Berk: 28,
            Deniz: 28,
            Mesut: 32,
            Ahmet: 32
          }
        }
      ]
    },
    {
      number: 7,
      rankingSnapshot: ['Murat', 'Batuhan', 'Mesut', 'Ahmet', 'Berk', 'Mumtaz', 'Deniz', 'Zafer'],
      byes: [],
      submitted: false,
      matches: [
        {
          teamA: ['Murat', 'Zafer'],
          teamB: ['Batuhan', 'Deniz'],
          court: 1
        },
        {
          teamA: ['Mesut', 'Mumtaz'],
          teamB: ['Ahmet', 'Berk'],
          court: 2
        }
      ]
    }
  ]
};

const ensureFetch = async () => {
  if (typeof fetch === 'function') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
};

(async () => {
  const doFetch = await ensureFetch();
  const url = `${baseUrl.replace(/\/$/, '')}/api/tournaments/${tournamentId}`;

  console.log(`🚀 Pushing Winter25 data to ${url}`);

  const response = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tournamentPayload)
  });

  if (!response.ok) {
    console.error(`❌ API returned ${response.status}`, await response.text());
    process.exit(1);
  }

  console.log('✅ Winter25 turnuvası başarıyla gönderildi.');
})();
