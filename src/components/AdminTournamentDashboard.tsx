import { useState, useEffect } from 'react';

interface Tournament {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt?: string;
  playerCount: number;
  currentRound: number;
  estimatedRounds?: number;
  days?: number;
  startDate?: string;
  endDate?: string;
  location?: string;
  courtCount?: number;
  source: 'remote' | 'local';
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

  const readLocalTournament = (id: string): Tournament | null => {
    try {
      const settingsRaw = localStorage.getItem(`tournament-settings-${id}`);
      const stateRaw = localStorage.getItem(`mexicano-tournament-${id}`) || localStorage.getItem(`mexicano-${id}`);

      let settings: Record<string, any> = {};
      let state: Record<string, any> = {};

      if (settingsRaw) {
        try {
          settings = JSON.parse(settingsRaw);
        } catch (parseError) {
          console.warn('Turnuva ayarları okunamadı:', parseError);
        }
      }

      if (stateRaw) {
        try {
          state = JSON.parse(stateRaw);
        } catch (parseError) {
          console.warn('Turnuva durumu okunamadı:', parseError);
        }
      }

      const name = typeof settings.name === 'string' && settings.name.trim().length > 0
        ? settings.name.trim()
        : (typeof state.name === 'string' && state.name.trim().length > 0 ? state.name.trim() : undefined);

      const createdAt = typeof settings.createdAt === 'string'
        ? settings.createdAt
        : (typeof state.createdAt === 'string' ? state.createdAt : new Date().toISOString());

      const updatedAt = typeof settings.updatedAt === 'string'
        ? settings.updatedAt
        : (typeof state.updatedAt === 'string' ? state.updatedAt : undefined);

      const playerCount = Array.isArray(state.players)
        ? state.players.filter(Boolean).length
        : (typeof settings.playerCount === 'number' ? settings.playerCount : 0);

      const currentRound = Array.isArray(state.rounds)
        ? state.rounds.filter((round: any) => round && round.submitted).length
        : (typeof state.currentRound === 'number' ? state.currentRound : 0);

      const estimatedRounds = typeof settings.estimatedRounds === 'number'
        ? settings.estimatedRounds
        : (typeof state.estimatedRounds === 'number' ? state.estimatedRounds : undefined);

      const days = typeof settings.days === 'number' ? settings.days : undefined;
      const courtCount = typeof settings.courtCount === 'number'
        ? settings.courtCount
        : (typeof state.courtCount === 'number' ? state.courtCount : undefined);

      const startDate = typeof settings.startDate === 'string' ? settings.startDate : undefined;
      const endDate = typeof settings.endDate === 'string' ? settings.endDate : undefined;
      const location = typeof settings.location === 'string' ? settings.location : undefined;

      return {
        id,
        name,
        createdAt,
        updatedAt,
        playerCount,
        currentRound,
        estimatedRounds,
        days,
        startDate,
        endDate,
        location,
        courtCount,
        source: 'local'
      };
    } catch (error) {
      console.warn('Yerel turnuva bilgisi okunamadı:', error);
      return null;
    }
  };

  const loadLocalTournamentSnapshots = (): Tournament[] => {
    const savedRaw = localStorage.getItem('mexicano-tournaments');
    if (!savedRaw) return [];

    let savedIds: unknown = [];
    try {
      savedIds = JSON.parse(savedRaw);
    } catch (error) {
      console.warn('Kayıtlı turnuva listesi çözümlenemedi:', error);
      return [];
    }

    if (!Array.isArray(savedIds)) return [];

    const uniqueIds = Array.from(new Set(savedIds)).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const locals: Tournament[] = [];

    uniqueIds.forEach((id) => {
      const snapshot = readLocalTournament(id);
      if (snapshot) {
        locals.push(snapshot);
      }
    });

    return locals;
  };

  const fetchRemoteTournaments = async (): Promise<Tournament[]> => {
    try {
      const response = await fetch('/api/tournaments/list');
      if (!response.ok) {
        throw new Error(`API listesi ${response.status} ile döndü`);
      }

      const payload = await response.json();
      const list = Array.isArray(payload?.tournaments) ? payload.tournaments : [];

      return list.map((item: any): Tournament => ({
        id: item.id,
        name: typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : undefined,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
        playerCount: typeof item.playerCount === 'number' ? item.playerCount : 0,
        currentRound: typeof item.currentRound === 'number' ? item.currentRound : 0,
        estimatedRounds: typeof item.estimatedRounds === 'number' ? item.estimatedRounds : undefined,
        days: typeof item.days === 'number' ? item.days : undefined,
        startDate: typeof item.startDate === 'string' ? item.startDate : undefined,
        endDate: typeof item.endDate === 'string' ? item.endDate : undefined,
        location: typeof item.location === 'string' ? item.location : undefined,
        courtCount: typeof item.courtCount === 'number' ? item.courtCount : undefined,
        source: 'remote'
      }));
    } catch (error) {
      console.warn('Uzak turnuva listesi alınamadı:', error);
      return [];
    }
  };

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const [remoteTournaments, localTournaments] = await Promise.all([
        fetchRemoteTournaments(),
        Promise.resolve(loadLocalTournamentSnapshots())
      ]);

      const merged = new Map<string, Tournament>();

      remoteTournaments.forEach((tournament) => {
        merged.set(tournament.id, tournament);
      });

      localTournaments.forEach((localTournament) => {
        const existing = merged.get(localTournament.id);
        if (existing) {
          merged.set(localTournament.id, {
            ...localTournament,
            ...existing,
            name: existing.name || localTournament.name,
            playerCount: existing.playerCount || localTournament.playerCount,
            estimatedRounds: existing.estimatedRounds ?? localTournament.estimatedRounds,
            days: existing.days ?? localTournament.days,
            startDate: existing.startDate ?? localTournament.startDate,
            endDate: existing.endDate ?? localTournament.endDate,
            location: existing.location ?? localTournament.location,
            courtCount: existing.courtCount ?? localTournament.courtCount,
            source: existing.source
          });
        } else {
          merged.set(localTournament.id, localTournament);
        }
      });

      const combined = Array.from(merged.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setTournaments(combined);
    } catch (error) {
      console.error('Turnuvalar yüklenemedi:', error);
      setTournaments(loadLocalTournamentSnapshots());
    } finally {
      setLoading(false);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    const tournament = tournaments.find((t) => t.id === tournamentId);
    const tournamentName = tournament?.name || tournamentId;

    if (!window.confirm(`"${tournamentName}" turnuvasını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    setLoading(true);
    let remoteError: Error | null = null;

    if (tournament?.source !== 'local') {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`API silme hatası: ${response.status}`);
        }
      } catch (error) {
        console.error('Turnuva sunucudan silinemedi:', error);
        remoteError = error as Error;
      }
    }

    try {
      localStorage.removeItem(`mexicano-tournament-${tournamentId}`);
      localStorage.removeItem(`mexicano-${tournamentId}`);
      localStorage.removeItem(`tournament-settings-${tournamentId}`);

      const savedRaw = localStorage.getItem('mexicano-tournaments');
      if (savedRaw) {
        try {
          const ids = JSON.parse(savedRaw);
          if (Array.isArray(ids)) {
            const filtered = ids.filter((id: string) => id !== tournamentId);
            localStorage.setItem('mexicano-tournaments', JSON.stringify(filtered));
          }
        } catch (error) {
          console.warn('Kayıtlı turnuva listesi güncellenemedi:', error);
        }
      }
    } catch (storageError) {
      console.warn('Yerel veriler silinirken hata oluştu:', storageError);
    }

    await loadTournaments();

    if (remoteError) {
      alert('⚠️ Turnuva yerelden silindi ancak sunucudan silinirken hata oluştu. İnternet bağlantınızı kontrol edin.');
    } else {
      alert('✅ Turnuva başarıyla silindi!');
    }
  };

  const activeTournaments = tournaments.filter((t) => {
    const targetRounds = t.estimatedRounds;
    if (typeof targetRounds !== 'number' || targetRounds <= 0) {
      return true;
    }
    return t.currentRound < targetRounds;
  });

  const completedTournaments = tournaments.filter((t) => {
    const targetRounds = t.estimatedRounds;
    return typeof targetRounds === 'number' && targetRounds > 0 && t.currentRound >= targetRounds;
  });

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header - Responsive */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
                🏸 Admin Turnuva Yönetimi
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Hoş geldin, <span className="font-semibold text-blue-600">{userName}</span> 👤
              </p>
            </div>
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm sm:text-base"
            >
              🚪 Çıkış Yap
            </button>
          </div>
        </div>

        {/* Yeni Turnuva Kartı */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Yeni Bir Maceraya Başla</h2>
              <p className="text-sm text-gray-600 mt-1">Yeni bir turnuva oluşturarak topluluğu bir araya getirin.</p>
            </div>
            <button
              onClick={onCreateNew}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base font-semibold hover:from-green-700 hover:to-emerald-700 flex-shrink-0"
            >
              <span className="text-xl">✨</span>
              <span>Yeni Turnuva Oluştur</span>
            </button>
          </div>
        </div>

        {/* Mevcut Turnuvalar */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
          <div className="p-3 sm:p-6 border-b border-gray-200">
             <h2 className="text-lg sm:text-xl font-bold text-gray-800">Mevcut Turnuvalar</h2>
          </div>
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('active')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-xs sm:text-base ${
                selectedTab === 'active'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="hidden sm:inline">🎯 Aktif Turnuvalar ({activeTournaments.length})</span>
              <span className="sm:hidden">🎯 Aktif ({activeTournaments.length})</span>
            </button>
            <button
              onClick={() => setSelectedTab('completed')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-xs sm:text-base ${
                selectedTab === 'completed'
                  ? 'text-green-600 bg-green-50 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="hidden sm:inline">✅ Tamamlananlar ({completedTournaments.length})</span>
              <span className="sm:hidden">✅ Bitti ({completedTournaments.length})</span>
            </button>
          </div>

          {/* Turnuva Listesi - Responsive */}
          <div className="p-3 sm:p-6">
            {displayTournaments.length === 0 ? (
              <div className="text-center py-12 sm:py-16 text-gray-500">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">
                  {selectedTab === 'active' ? '📭' : '🎉'}
                </div>
                <p className="text-base sm:text-xl mb-2 font-medium px-4">
                  {selectedTab === 'active' 
                    ? 'Aktif turnuva bulunmuyor' 
                    : 'Tamamlanmış turnuva bulunmuyor'}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 px-4">
                  {selectedTab === 'active' 
                    ? 'Yukarıdaki butona tıklayarak yeni bir turnuva oluşturabilirsiniz!'
                    : 'Tamamlanan turnuvalar burada görünecek.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {displayTournaments.map((tournament) => {
                  const displayName = tournament.name || tournament.id;
                  const targetRounds = typeof tournament.estimatedRounds === 'number' ? tournament.estimatedRounds : 0;
                  const progress = targetRounds > 0
                    ? Math.round((Math.min(tournament.currentRound, targetRounds) / targetRounds) * 100)
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
                      className="bg-gradient-to-br from-white to-gray-50 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      {/* Turnuva Başlığı - Responsive */}
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm sm:text-lg text-gray-800 truncate" title={displayName}>
                            🏆 {displayName}
                          </h3>
                          <p className="text-[11px] text-gray-400 truncate" title={tournament.id}>
                            ID: {tournament.id}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                            📅 {formattedDate}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                            tournament.source === 'remote'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {tournament.source === 'remote' ? '🔗 Neon' : '💾 Yerel'}
                          </span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteTournament(tournament.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition-colors ml-1 sm:ml-2 flex-shrink-0"
                            title="Turnuvayı Sil"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* İstatistikler - Responsive */}
                      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 bg-gray-50 rounded-lg p-2 sm:p-3">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">👥 Oyuncular:</span>
                          <span className="font-semibold text-gray-800">{tournament.playerCount}</span>
                        </div>
                        {typeof tournament.days === 'number' && tournament.days > 0 && (
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600">📅 Süre:</span>
                            <span className="font-semibold text-gray-800">{tournament.days} gün</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">🏆 Tur:</span>
                          <span className="font-semibold text-gray-800">
                            {tournament.currentRound}
                            {targetRounds > 0 && `/${targetRounds}`}
                          </span>
                        </div>
                        {tournament.location && (
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600">📍 Yer:</span>
                            <span className="font-semibold text-gray-800 text-xs truncate max-w-[150px] sm:max-w-none" title={tournament.location}>
                              {tournament.location}
                            </span>
                          </div>
                        )}
                        {typeof tournament.courtCount === 'number' && (
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600">🏟️ Saha:</span>
                            <span className="font-semibold text-gray-800">{tournament.courtCount}</span>
                          </div>
                        )}
                      </div>

                      {/* İlerleme Çubuğu - Responsive */}
                      {targetRounds > 0 && (
                        <div className="mb-3 sm:mb-4">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>İlerleme</span>
                            <span className="font-semibold">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 overflow-hidden">
                            <div
                              className={`h-2 sm:h-2.5 rounded-full transition-all duration-500 ${
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

                      {/* Aksiyonlar - Responsive */}
                      <button
                        onClick={() => onSelectTournament(tournament.id)}
                        className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-colors font-medium shadow-sm text-xs sm:text-base ${
                          selectedTab === 'active'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                        }`}
                      >
                        <span className="hidden sm:inline">
                          {selectedTab === 'active' ? '⚙️ Yönet & Düzenle' : '👁️ Görüntüle'}
                        </span>
                        <span className="sm:hidden">
                          {selectedTab === 'active' ? '⚙️ Yönet' : '👁️ Görüntüle'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Maçlar */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Maçlar</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* ...existing code... */}
                </tr>
              </thead>
              <tbody>
                {/* ...existing code... */}
              </tbody>
            </table>
          </div>
        </div>

        {/* Oyuncular */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          {/* ...existing code... */}
        </div>

        {/* Footer Bilgi - Responsive */}
        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
          <p className="hidden sm:block">
            Toplam {tournaments.length} turnuva • {activeTournaments.length} aktif • {completedTournaments.length} tamamlanmış
          </p>
          <p className="sm:hidden">
            {tournaments.length} turnuva • {activeTournaments.length} aktif • {completedTournaments.length} bitti
          </p>
        </div>
      </div>
    </div>
  );
}
