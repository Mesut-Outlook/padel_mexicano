// Script: Firebase'den AKTİF turnuvaları listele
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDemoKey123456789",
  authDomain: "padel-mexicano-demo.firebaseapp.com", 
  databaseURL: "https://padel-mexicano-demo-default-rtdb.firebaseio.com/",
  projectId: "padel-mexicano-demo",
  storageBucket: "padel-mexicano-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function isActiveTournament(data) {
  const completedFlag = data?.completed === true || data?.status === 'completed';
  const rounds = Array.isArray(data?.rounds) ? data.rounds : [];
  const submittedRounds = rounds.filter(r => r?.submitted).length;
  const estimatedRounds =
    data?.settings?.estimatedRounds ??
    data?.estimatedRounds ??
    null;

  // Tahmini tur sayısı biliniyorsa ona göre, bilinmiyorsa completed flag'e göre karar ver
  const activeByProgress = estimatedRounds ? submittedRounds < estimatedRounds : true;
  return !completedFlag && activeByProgress;
}

async function listAllTournaments() {
  try {
    console.log('🔍 Firebase\'den turnuvalar alınıyor...\n');

    const tournamentsRef = ref(database, 'tournaments');
    const snapshot = await get(tournamentsRef);

    if (!snapshot.exists()) {
      console.log('❌ Hiç turnuva bulunamadı.');
      return;
    }

    const tournaments = snapshot.val();
    const tournamentList = Object.entries(tournaments); // [ [id, data], ... ]

    const active = tournamentList.filter(([_, data]) => isActiveTournament(data));

    console.log(`✅ Aktif turnuva sayısı: ${active.length}\n`);
    console.log('═'.repeat(80));

    active.forEach(([id, data], index) => {
      const name = data?.settings?.name || data?.name || id;
      const playersCount = Array.isArray(data?.players) ? data.players.length : 0;
      const rounds = Array.isArray(data?.rounds) ? data.rounds : [];
      const submittedRounds = rounds.filter(r => r?.submitted).length;
      const estimatedRounds =
        data?.settings?.estimatedRounds ??
        data?.estimatedRounds ??
        '∼';

      const days = data?.settings?.days ?? data?.days ?? '∼';
      const courts = data?.settings?.courtCount ?? data?.courtCount ?? '∼';

      console.log(`${index + 1}. ${name}`);
      console.log(`   • ID: ${id}`);
      console.log(`   • Oyuncu: ${playersCount}`);
      console.log(`   • Turlar: ${submittedRounds}/${estimatedRounds}`);
      console.log(`   • Gün: ${days} | Saha: ${courts}`);
      if (data?.settings?.location) {
        console.log(`   • Konum: ${data.settings.location}`);
      }
      console.log('');
    });

    if (active.length === 0) {
      console.log('ℹ️ Aktif turnuva bulunamadı (tüm turnuvalar tamamlanmış olabilir).');
    }
  } catch (error) {
    console.error('🚨 Hata:', error?.message || error);
  } finally {
    console.log('🟢 Bitti.');
  }
}

listAllTournaments();
