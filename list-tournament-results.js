// Script: Belirli bir turnuvanın tüm tur ve maç sonuçlarını yazdır
// Kullanım: node list-tournament-results.js <tournamentId>
import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

function fmtTeam(arr) {
  try { return Array.isArray(arr) ? arr.join(' & ') : String(arr); } catch { return String(arr); }
}

function winnerLabel(m) {
  if (m.winner === 'A') return '(Kazanan: A)';
  if (m.winner === 'B') return '(Kazanan: B)';
  if (m.scoreA != null && m.scoreB != null) {
    if (m.scoreA > m.scoreB) return '(Kazanan: A)';
    if (m.scoreB > m.scoreA) return '(Kazanan: B)';
  }
  return '';
}

async function main() {
  const tournamentId = process.argv[2];
  if (!tournamentId) {
    console.error('Kullanım: node list-tournament-results.js <tournamentId>');
    process.exit(1);
  }

  try {
    const t = await prisma.tournament.findUnique({
      where: { tournamentId },
      include: {
        rounds: {
          include: { matches: { include: { players: { include: { player: true } } } } },
          orderBy: { number: 'asc' }
        }
      }
    });

    if (!t) {
      console.log('❌ Turnuva bulunamadı:', tournamentId);
      return;
    }

    console.log(`\n🏆 Turnuva: ${t.tournamentId}`);
    console.log(`• Başladı mı: ${t.tournamentStarted ? 'Evet' : 'Hayır'}`);
    console.log(`• Mevcut Tur: ${t.currentRound}`);
    console.log(`• Toplam Tur: ${t.rounds.length}`);

    if (t.rounds.length === 0) {
      console.log('\nℹ️ Bu turnuvada henüz tur/match kaydı yok.');
      return;
    }

    for (const r of t.rounds) {
      console.log(`\n— Tur ${r.number} ${r.submitted ? '(Tamamlandı)' : '(Devam ediyor)'}`);
      if (r.matches.length === 0) {
        console.log('   (Bu turda maç yok)');
        continue;
      }
      r.matches.forEach((m, idx) => {
        const score = (m.scoreA == null && m.scoreB == null) ? '—' : `${m.scoreA ?? 0} - ${m.scoreB ?? 0}`;
        const win = winnerLabel(m);
        console.log(`   ${idx + 1}. ${fmtTeam(m.teamA)} vs ${fmtTeam(m.teamB)} | Skor: ${score} ${win}`);
      });
    }
    console.log('');
  } catch (err) {
    console.error('🚨 Hata:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
