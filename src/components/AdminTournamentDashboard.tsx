import { useState, useEffect } from 'react';

interface Tournament {
  id: string;
  name: string;
  days: number;
  estimatedRounds: number;
  players: number;
  currentRound: number;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

interface AdminTournamentDashboardProps {
  userName: string;
  onSelectTournament: (tournamentId: string) => void;
  onCreateNew: () => void;
  onLogout: () => void;
}

export function AdminTournamentDashboard({
  userName,
  onSelectTournament,
  onCreateNew,
  onLogout
}: AdminTournamentDashboardProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      // localStorage'dan kayıtlı turnuvaları yükle
      const savedTournaments = localStorage.getItem('mexicano-tournaments');
      if (savedTournaments) {
        const tournamentIds = JSON.parse(savedTournaments) as string[];
        
        const tournamentData: Tournament[] = [];
        for (const id of tournamentIds) {
          const settingsKey = `tournament-settings-${id}`;
          const dataKey = `mexicano-${id}`;
          
          const settingsData = localStorage.getItem(settingsKey);
          const tournamentDataStr = localStorage.getItem(dataKey);
          
          let settings: any = {};
          let tournamentInfo: any = {};
          
          if (settingsData) {
            settings = JSON.parse(settingsData);
          }
          
          if (tournamentDataStr) {
            tournamentInfo = JSON.parse(tournamentDataStr);
          }
          
          tournamentData.push({
            id,
            name: id,
            days: settings.days || 0,
            estimatedRounds: settings.estimatedRounds || 0,
            players: tournamentInfo.players?.length || 0,
            currentRound: tournamentInfo.rounds?.filter((r: any) => r.submitted).length || 0,
            createdAt: settings.createdAt || new Date().toISOString(),
            startDate: settings.startDate,
            endDate: settings.endDate,
            location: settings.location
          });
        }
        
        // En yeniden en eskiye sırala
        tournamentData.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setTournaments(tournamentData);
      }
    } catch (error) {
      console.error('Turnuvalar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTournament = (tournamentId: string) => {
    if (window.confirm(`"${tournamentId}" turnuvasını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      try {
        // Tüm ilgili verileri sil
        localStorage.removeItem(`mexicano-${tournamentId}`);
        localStorage.removeItem(`tournament-settings-${tournamentId}`);
        
        // Liste'den çıkar
        const savedTournaments = localStorage.getItem('mexicano-tournaments');
        if (savedTournaments) {
          const tournamentIds = JSON.parse(savedTournaments) as string[];
          const filtered = tournamentIds.filter(id => id !== tournamentId);
          localStorage.setItem('mexicano-tournaments', JSON.stringify(filtered));
        }
        
        // State'i güncelle
        setTournaments(prev => prev.filter(t => t.id !== tournamentId));
        
        alert('✅ Turnuva başarıyla silindi!');
      } catch (error) {
        console.error('Turnuva silinemedi:', error);
        alert('❌ Turnuva silinirken bir hata oluştu!');
      }
    }
  };

  const deleteAllTournaments = () => {
    const confirmMessage = `⚠️ UYARI: TÜM TURNUVALARI SİLMEK ÜZERE SİNİZ!\n\n` +
      `Toplam ${tournaments.length} turnuva silinecek:\n` +
      `- ${activeTournaments.length} aktif turnuva\n` +
      `- ${completedTournaments.length} tamamlanmış turnuva\n\n` +
      `Bu işlem GERİ ALINAMAZ!\n\n` +
      `Devam etmek istediğinizden emin misiniz?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Çift onay
    const secondConfirm = window.prompt(
      `Son onay için "SİL" yazın (büyük harflerle):`,
      ''
    );

    if (secondConfirm !== 'SİL') {
      alert('❌ İşlem iptal edildi.');
      return;
    }

    try {
      // Tüm turnuva verilerini sil
      const savedTournaments = localStorage.getItem('mexicano-tournaments');
      if (savedTournaments) {
        const tournamentIds = JSON.parse(savedTournaments) as string[];
        
        // Her turnuvanın verilerini sil
        tournamentIds.forEach(id => {
          localStorage.removeItem(`mexicano-${id}`);
          localStorage.removeItem(`tournament-settings-${id}`);
        });
      }
      
      // Turnuva listesini temizle
      localStorage.removeItem('mexicano-tournaments');
      
      // State'i güncelle
      setTournaments([]);
      
      alert(`✅ Tüm turnuvalar başarıyla silindi!\n\nToplam ${tournaments.length} turnuva temizlendi.`);
    } catch (error) {
      console.error('Turnuvalar silinirken hata:', error);
      alert('❌ Turnuvalar silinirken bir hata oluştu!');
    }
  };

  const activeTournaments = tournaments.filter(t => 
    t.estimatedRounds === 0 || t.currentRound < t.estimatedRounds
  );
  
  const completedTournaments = tournaments.filter(t => 
    t.estimatedRounds > 0 && t.currentRound >= t.estimatedRounds
  );

  const displayTournaments = selectedTab === 'active' ? activeTournaments : completedTournaments;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Turnuvalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🏸 Admin Turnuva Yönetimi
              </h1>
              <p className="text-gray-600">
                Hoş geldin, <span className="font-semibold text-blue-600">{userName}</span> 👤
              </p>
            </div>
            <div className="flex items-center gap-3">
              {tournaments.length > 0 && (
                <button
                  onClick={deleteAllTournaments}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border-2 border-red-200 hover:border-red-300"
                  title="Tüm turnuvaları sil"
                >
                  🗑️ Tümünü Sil
                </button>
              )}
              <button
                onClick={onLogout}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                🚪 Çıkış Yap
              </button>
            </div>
          </div>
        </div>

        {/* Yeni Turnuva Oluştur Butonu */}
        <button
          onClick={onCreateNew}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all mb-6 flex items-center justify-center gap-3 text-lg font-semibold hover:from-green-700 hover:to-emerald-700"
        >
          <span className="text-2xl">✨</span>
          Yeni Turnuva Oluştur
        </button>

        {/* Tab Seçimi */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('active')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                selectedTab === 'active'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🎯 Aktif Turnuvalar ({activeTournaments.length})
            </button>
            <button
              onClick={() => setSelectedTab('completed')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                selectedTab === 'completed'
                  ? 'text-green-600 bg-green-50 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              ✅ Tamamlananlar ({completedTournaments.length})
            </button>
          </div>

          {/* Turnuva Listesi */}
          <div className="p-6">
            {displayTournaments.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-6xl mb-4">
                  {selectedTab === 'active' ? '📭' : '🎉'}
                </div>
                <p className="text-xl mb-2 font-medium">
                  {selectedTab === 'active' 
                    ? 'Aktif turnuva bulunmuyor' 
                    : 'Tamamlanmış turnuva bulunmuyor'}
                </p>
                <p className="text-sm text-gray-400">
                  {selectedTab === 'active' 
                    ? 'Yukarıdaki butona tıklayarak yeni bir turnuva oluşturabilirsiniz!'
                    : 'Tamamlanan turnuvalar burada görünecek.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayTournaments.map(tournament => {
                  const progress = tournament.estimatedRounds > 0
                    ? Math.round((tournament.currentRound / tournament.estimatedRounds) * 100)
                    : 0;

                  const createdDate = new Date(tournament.createdAt);
                  const formattedDate = createdDate.toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={tournament.id}
                      className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      {/* Turnuva Başlığı */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-800 truncate" title={tournament.id}>
                            🏆 {tournament.id}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            📅 {formattedDate}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTournament(tournament.id);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors ml-2"
                          title="Turnuvayı Sil"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* İstatistikler */}
                      <div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">👥 Oyuncular:</span>
                          <span className="font-semibold text-gray-800">{tournament.players || 0}</span>
                        </div>
                        {tournament.days > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">📅 Süre:</span>
                            <span className="font-semibold text-gray-800">{tournament.days} gün</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">🏆 Tur:</span>
                          <span className="font-semibold text-gray-800">
                            {tournament.currentRound}
                            {tournament.estimatedRounds > 0 && `/${tournament.estimatedRounds}`}
                          </span>
                        </div>
                        {tournament.location && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">📍 Yer:</span>
                            <span className="font-semibold text-gray-800 text-xs truncate" title={tournament.location}>
                              {tournament.location}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* İlerleme Çubuğu */}
                      {tournament.estimatedRounds > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>İlerleme</span>
                            <span className="font-semibold">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${
                                progress === 100
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : progress > 66
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                  : progress > 33
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-red-500 to-pink-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Aksiyonlar */}
                      <button
                        onClick={() => onSelectTournament(tournament.id)}
                        className={`w-full py-2.5 px-4 rounded-lg transition-colors font-medium shadow-sm ${
                          selectedTab === 'active'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                        }`}
                      >
                        {selectedTab === 'active' ? '⚙️ Yönet & Düzenle' : '👁️ Görüntüle'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bilgi */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Toplam {tournaments.length} turnuva • {activeTournaments.length} aktif • {completedTournaments.length} tamamlanmış</p>
        </div>
      </div>
    </div>
  );
}
