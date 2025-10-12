import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Veritabanındaki turnuvalar:');
    console.log('================================');
    
    const tournaments = await prisma.tournament.findMany({
      include: {
        players: {
          include: {
            player: true
          }
        },
        rounds: {
          include: {
            matches: true
          }
        },
        playerPool: true
      }
    });

    if (tournaments.length === 0) {
      console.log('❌ Veritabanında hiç turnuva bulunamadı.');
      return;
    }

    tournaments.forEach((tournament, index) => {
      console.log(`\n🏆 ${index + 1}. Turnuva:`);
      console.log(`   ID: ${tournament.tournamentId}`);
      console.log(`   Oluşturulma: ${tournament.createdAt.toLocaleString('tr-TR')}`);
      console.log(`   Saha Sayısı: ${tournament.courtCount}`);
      console.log(`   Başladı mı: ${tournament.tournamentStarted ? '✅ Evet' : '❌ Hayır'}`);
      console.log(`   Mevcut Tur: ${tournament.currentRound}`);
      
      console.log(`\n   👥 Oyuncular (${tournament.players.length}):`);
      tournament.players.forEach((tp, i) => {
        console.log(`      ${i + 1}. ${tp.player.name} (Puan: ${tp.totalPoints}, Bay: ${tp.byeCount})`);
      });
      
      console.log(`\n   🎽 Oyuncu Havuzu (${tournament.playerPool.length}):`);
      tournament.playerPool.forEach((player, i) => {
        console.log(`      ${i + 1}. ${player.name}`);
      });
      
      console.log(`\n   🎮 Turlar: ${tournament.rounds.length} tur`);
      if (tournament.rounds.length > 0) {
        tournament.rounds.forEach((round) => {
          console.log(`      Tur ${round.number}: ${round.matches.length} maç (${round.submitted ? 'Tamamlandı' : 'Devam ediyor'})`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Veritabanı hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
