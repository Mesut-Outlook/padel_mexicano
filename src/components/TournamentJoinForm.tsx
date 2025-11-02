import { useState, useEffect } from "react";

interface TournamentInfo {
  id: string;
  name?: string;
  createdAt: string;
  playerCount?: number;
}

interface TournamentJoinFormProps {
  isAdmin: boolean;
  userName: string;
  savedTournaments: string[];
  onJoinTournament: (tournamentId: string, days?: number, tournamentName?: string, courtCount?: number) => void;
}

export function TournamentJoinForm({ 
  isAdmin, 
  userName, 
  savedTournaments, 
  onJoinTournament 
}: TournamentJoinFormProps) {
  const [tournamentId, setTournamentId] = useState<string>("");
  const [tournamentName, setTournamentName] = useState<string>("");
  const [days, setDays] = useState<number>(5);
  const [courtCount, setCourtCount] = useState<number>(2);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [browsing, setBrowsing] = useState<boolean>(false);
  const [availableTournaments, setAvailableTournaments] = useState<TournamentInfo[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState<boolean>(false);

  // Günlere göre tahmini tur sayısını hesapla
  const calculateEstimatedRounds = (daysCount: number): number => {
    const roundsPerDay = 3; // 90 dakika / 30 dakika = 3 tur/gün
    return daysCount * roundsPerDay;
  };

  useEffect(() => {
    let timeout: any;
    if (joinLoading) {
      timeout = setTimeout(() => {
        setJoinLoading(false);
        setJoinError("Turnuva verisi yüklenemedi. Lütfen internet bağlantınızı ve turnuva ID'sini kontrol edin.");
      }, 12000);
    }
    return () => clearTimeout(timeout);
  }, [joinLoading]);

  const handleCreateNew = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = Math.random().toString(36).substring(2, 8);
    const newTournamentId = `turnuva-${timestamp}-${randomId}`;
    
    setTournamentId(newTournamentId);
    setIsCreatingNew(true);
    setJoinLoading(true);
    setJoinError(null);
    
    onJoinTournament(newTournamentId, days, tournamentName || undefined, courtCount);
    setJoinLoading(false);
  };

  const handleJoin = () => {
    const normalizedId = tournamentId.trim();
    if (normalizedId) {
      setJoinLoading(true);
      setJoinError(null);
      if (normalizedId !== tournamentId) {
        setTournamentId(normalizedId);
      }
      onJoinTournament(normalizedId, undefined);
      setJoinLoading(false);
    } else {
      alert("Lütfen bir turnuva ID'si girin");
    }
  };

  // Açık turnuvaları yükle
  const loadAvailableTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const response = await fetch('/api/tournaments/list');
      if (response.ok) {
        const data = await response.json();
        setAvailableTournaments(data.tournaments || []);
      }
    } catch (error) {
      console.error('Turnuvalar yüklenirken hata:', error);
    } finally {
      setLoadingTournaments(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-3 text-gray-800">
          🏸 Mexicano Padel
        </h1>
        
        {/* Kullanıcı Bilgisi */}
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
            <span className="text-xs sm:text-sm font-medium text-blue-700">
              {isAdmin ? "👤 Admin" : "🎾 Oyuncu"}: {userName}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* BÖLÜM 1: YENİ TURNUVA OLUŞTUR (Sadece Admin) */}
          {isAdmin && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✨</span>
                <h2 className="text-lg sm:text-xl font-bold text-green-800">Yeni Turnuva Oluştur</h2>
              </div>

              {/* Turnuva İsmi (Opsiyonel - Yeni Turnuva için) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-green-800 mb-2">
                  🏆 Yeni Turnuva İsmi (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2025 Bahar Kupası"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
                <p className="text-xs text-green-700 mt-1.5">
                  Oluşturulacak turnuvaya bir isim verebilirsiniz.
                </p>
              </div>

              {/* Gün ve Saha Seçimi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                {/* Gün Sayısı */}
                <div className="bg-white border-2 border-green-200 rounded-xl p-3 sm:p-4">
                  <label className="block text-xs sm:text-sm font-medium text-green-800 mb-1.5 sm:mb-2">
                    📅 Gün Sayısı
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((dayOption) => (
                      <button
                        key={dayOption}
                        type="button"
                        onClick={() => {
                          setDays(dayOption);
                        }}
                        className={`px-2 py-2 sm:px-3 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all ${
                          days === dayOption
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        {dayOption}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-green-700">
                    {days} gün = ~{calculateEstimatedRounds(days)} tur
                  </div>
                </div>

                {/* Saha Sayısı */}
                <div className="bg-white border-2 border-green-200 rounded-xl p-3 sm:p-4">
                  <label className="block text-xs sm:text-sm font-medium text-green-800 mb-1.5 sm:mb-2">
                    🏟️ Saha Sayısı
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((courtOption) => (
                      <button
                        key={courtOption}
                        type="button"
                        onClick={() => setCourtCount(courtOption)}
                        className={`px-2 py-2 sm:px-3 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all ${
                          courtCount === courtOption
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        {courtOption}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-green-700">
                    {courtCount} saha seçildi
                  </div>
                </div>
              </div>

              {/* Oluştur Butonu */}
              <button
                onClick={handleCreateNew}
                disabled={joinLoading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg"
              >
                {joinLoading && isCreatingNew ? "Oluşturuluyor..." : "✨ Turnuvayı Oluştur"}
              </button>
            </div>
          )}

          {/* Ayırıcı */}
          {isAdmin && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-600 font-medium">VEYA</span>
              </div>
            </div>
          )}

          {/* BÖLÜM 2: MEVCUT TURNUVAYA KATIL */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔗</span>
              <h2 className="text-lg sm:text-xl font-bold text-blue-800">
                Mevcut Turnuvaya Katıl
              </h2>
            </div>

            {!isAdmin && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-orange-700 font-medium">
                  ℹ️ Sadece admin kullanıcılar yeni turnuva oluşturabilir. Katılmak için turnuva ID'sini girin.
                </p>
              </div>
            )}

            {/* Turnuva Tarayıcı Butonu */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setBrowsing(!browsing);
                  if (!browsing) {
                    loadAvailableTournaments();
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span className="text-lg">🔍</span>
                <span>{browsing ? "Tarayıcıyı Kapat" : "Açık Turnuvaları Gör"}</span>
              </button>
            </div>

            {/* Turnuva Listesi */}
            {browsing && (
              <div className="mb-4 bg-white border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-purple-800">🏆 Açık Turnuvalar</h3>
                  <button
                    onClick={loadAvailableTournaments}
                    disabled={loadingTournaments}
                    className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingTournaments ? "⏳" : "🔄 Yenile"}
                  </button>
                </div>
                
                {loadingTournaments ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span className="ml-2 text-sm text-purple-600">Yükleniyor...</span>
                  </div>
                ) : availableTournaments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    😔 Açık turnuva bulunamadı
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableTournaments.map((tournament) => (
                      <button
                        key={tournament.id}
                        onClick={() => {
                          setTournamentId(tournament.id);
                          setBrowsing(false);
                        }}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-lg transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-purple-900 text-sm mb-1 truncate">
                              {tournament.name || tournament.id}
                            </div>
                            <div className="text-xs text-purple-700 space-y-0.5">
                              <div className="truncate">🔑 ID: {tournament.id}</div>
                              {tournament.playerCount !== undefined && (
                                <div>👥 {tournament.playerCount} oyuncu</div>
                              )}
                              <div>📅 {new Date(tournament.createdAt).toLocaleDateString('tr-TR', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</div>
                            </div>
                          </div>
                          <div className="text-purple-400 group-hover:text-purple-600 transition-colors">
                            →
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Önceki Turnuvalar */}
            {savedTournaments.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  📝 Son Turnuvalar (Hızlı Erişim)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {savedTournaments.map((tournament, index) => (
                    <button
                      key={index}
                      onClick={() => setTournamentId(tournament)}
                      className="w-full text-left px-3 py-2 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg text-sm transition-colors break-words"
                    >
                      🏆 {tournament}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Turnuva ID Input ve Katıl Butonu - Yan Yana */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                🔑 Turnuva ID
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  type="text"
                  placeholder="Örn: turnuva-2025-10-14-abc123"
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tournamentId.trim() && !joinLoading) {
                      handleJoin();
                    }
                  }}
                  className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  onClick={handleJoin}
                  disabled={!tournamentId.trim() || joinLoading}
                  className="sm:w-auto whitespace-nowrap bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 transition-all shadow-lg"
                >
                  {joinLoading && !isCreatingNew ? "Katılıyor..." : "🚀 Katıl"}
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-1.5">
                Turnuva ID'sini girin ve Katıl butonuna basın (veya Enter tuşuna basın)
              </p>
            </div>
          </div>

          {/* Loading ve Error */}
          {joinLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-600 font-medium">
                {isCreatingNew ? "Turnuva oluşturuluyor..." : "Turnuva yükleniyor..."}
              </span>
            </div>
          )}
          {joinError && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-red-700 text-sm font-semibold text-center">
              ❌ {joinError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
