// Script to list all active tournaments from Firebase
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

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

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
    const tournamentList = Object.entries(tournaments);
    
    console.log(`✅ Toplam ${tournamentList.length} turnuva bulundu:\n`);
    console.log('═'.repeat(80));
    
    tournamentList.forEach(([id, data], index) => {
      console.log(`\n${index + 1}. 🏆 ${id}`);
      console.log('─'.repeat(80));
      
      // Oyuncu sayısı
      const playerCount = data.players?.length || 0;
      console.log(`👥 Oyuncu Sayısı: ${playerCount}`);
      
      if (playerCount > 0) {
        console.log(`   Oyuncular: ${data.players.join(', ')}`);
      }
      
      // Tur bilgisi
      const roundCount = data.rounds?.length || 0;
      console.log(`🌀 Tur Sayısı: ${roundCount}`);
      
      if (roundCount > 0) {
        const submittedRounds = data.rounds.filter(r => r.submitted).length;
        console.log(`   Tamamlanan: ${submittedRounds}/${roundCount}`);
      }
      
      // Turnuva durumu
      const isStarted = data.tournamentStarted || false;
      const status = isStarted 
        ? (roundCount > 0 ? '🟢 Aktif' : '🟡 Başlatıldı') 
        : '⚪ Hazırlık';
      console.log(`📊 Durum: ${status}`);
      
      // Saha sayısı
      const courtCount = data.courtCount || 2;
      console.log(`🏟️ Saha Sayısı: ${courtCount}`);
      
      // Mevcut tur
      const currentRound = data.currentRound || 0;
      if (currentRound > 0) {
        console.log(`📍 Mevcut Tur: ${currentRound}`);
      }
      
      // Havuz oyuncuları
      const poolCount = data.playerPool?.length || 0;
      if (poolCount > 0) {
        console.log(`💼 Havuzda Bekleyen: ${poolCount} oyuncu`);
      }
      
      console.log('─'.repeat(80));
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n📈 İstatistikler:`);
    console.log(`   • Aktif turnuvalar: ${tournamentList.filter(([_, d]) => d.tournamentStarted).length}`);
    console.log(`   • Hazırlık aşamasında: ${tournamentList.filter(([_, d]) => !d.tournamentStarted).length}`);
    
    const totalPlayers = tournamentList.reduce((sum, [_, d]) => sum + (d.players?.length || 0), 0);
    console.log(`   • Toplam oyuncu: ${totalPlayers}`);
    
    const totalRounds = tournamentList.reduce((sum, [_, d]) => sum + (d.rounds?.length || 0), 0);
    console.log(`   • Toplam tur: ${totalRounds}`);
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\n⚠️  Firebase veritabanı izinleri gerekiyor.');
      console.log('   Demo modda çalışıyor olabilir.');
    }
  } finally {
    process.exit(0);
  }
}

// Script'i çalıştır
listAllTournaments();
