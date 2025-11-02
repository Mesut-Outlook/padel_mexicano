// Script: Veritabanındaki canlı (devam eden) maçları listele
import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

function fmtTeam(arr) {
  try { return Array.isArray(arr) ? arr.join(' & ') : String(arr); } catch { return String(arr); }
}

async function listLiveMatches() {
  try {
    console.log('🔴 Canlı maçlar yükleniyor...\n');

    // Turnuvası başlamış olan ve henüz tamamlanmamış turları getir
    const tournaments = await prisma.tournament.findMany({
      where: { tournamentStarted: true },
      include: {
        rounds: {
          where: { submitted: false },
          include: { matches: true },
          orderBy: { number: 'asc' }
        }
      }
    });

    let totalLive = 0;

    for (const t of tournaments) {
      const liveRounds = t.rounds.filter(r => r.matches.length > 0);
      if (liveRounds.length === 0) continue;

      console.log(`🏆 Turnuva: ${t.tournamentId}`);
      for (const r of liveRounds) {
        const liveMatches = r.matches; // submitted=false olduğu için turun tamamı canlı kabul
        if (liveMatches.length === 0) continue;
        console.log(`  • Tur ${r.number} (canlı)`);
        liveMatches.forEach((m, idx) => {
          const score =
            (m.scoreA == null && m.scoreB == null)
              ? '—'
              : `${m.scoreA ?? 0} - ${m.scoreB ?? 0}`;
          console.log(
            `     ${idx + 1}. ${fmtTeam(m.teamA)} vs ${fmtTeam(m.teamB)}  | Skor: ${score}`
          );
        });
        totalLive += liveMatches.length;
      }
      console.log('');
    }

    if (totalLive === 0) {
      console.log('ℹ️ Şu anda canlı maç bulunmuyor.');
    } else {
      console.log(`✅ Toplam canlı maç: ${totalLive}`);
    }
  } catch (err) {
    console.error('🚨 Hata:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

listLiveMatches();
