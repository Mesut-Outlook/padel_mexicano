import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function deleteOtherTournaments() {
  const tournamentsToKeep = 'turnuva-2025-10-24-l1epsd';

  try {
    const tournamentsToDelete = await prisma.tournament.findMany({
      where: {
        NOT: {
          tournamentId: tournamentsToKeep,
        },
      },
    });

    if (tournamentsToDelete.length === 0) {
      console.log(`✅ Sadece '${tournamentsToKeep}' turnuvası bulundu. Silinecek başka turnuva yok.`);
      return;
    }

    console.log(`🗑️ Bulunan ${tournamentsToDelete.length} turnuva silinecek...`);

    for (const tournament of tournamentsToDelete) {
      console.log(`   - Siliniyor: ${tournament.tournamentId} (DB ID: ${tournament.id})`);
      await prisma.tournament.delete({
        where: {
          id: tournament.id,
        },
      });
      console.log(`   ✔ Silindi: ${tournament.tournamentId}`);
    }

    console.log(`\n✅ İşlem tamamlandı. ${tournamentsToDelete.length} turnuva başarıyla silindi.`);

  } catch (error) {
    console.error('❌ Turnuvalar silinirken bir hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOtherTournaments();
