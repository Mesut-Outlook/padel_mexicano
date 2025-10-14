import { useState, useEffect } from "react";

interface TournamentJoinFormProps {
  isAdmin: boolean;
  userName: string;
  savedTournaments: string[];
  onJoinTournament: (tournamentId: string, days?: number) => void;
}

export function TournamentJoinForm({ 
  isAdmin, 
  userName, 
  savedTournaments, 
  onJoinTournament 
}: TournamentJoinFormProps) {
  const [tournamentId, setTournamentId] = useState<string>("");
  const [days, setDays] = useState<number>(5);
  const [showDaysInfo, setShowDaysInfo] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Günlere göre tahmini tur sayısını hesapla
  const calculateEstimatedRounds = (daysCount: number, courts: number = 2): number => {
    // Her maç 30 dakika
    // Her gün 180 dakika (3 saat) oyun süresi
    // Her turda: matchesPerRound = playingPlayers / 4
    // Tur süresi: Math.ceil(matchesPerRound / courts) * 30
    
    // Basitleştirilmiş hesaplama: 
    // 2 saha için günde yaklaşık 6 tur (180 / 30 = 6)
    // 3 saha için günde yaklaşık 9 tur
    const roundsPerDay = Math.floor((180 / 30) * courts);
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

  const handleJoin = () => {
    const normalizedId = tournamentId.trim();
    if (normalizedId) {
      setJoinLoading(true);
      setJoinError(null);
      if (normalizedId !== tournamentId) {
        setTournamentId(normalizedId);
      }
      // Admin için gün sayısını gönder, oyuncular için undefined
      onJoinTournament(normalizedId, isAdmin ? days : undefined);
      setJoinLoading(false);
    } else {
      alert("Lütfen bir turnuva ID'si girin");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-gray-800">
          🏸 Mexicano Padel
        </h1>
        
        {/* Kullanıcı Bilgisi */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
            <span className="text-sm font-medium text-blue-700">
              {isAdmin ? "👤 Admin" : "🎾 Oyuncu"}: {userName}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isAdmin ? "Turnuva ID'si (Oluştur veya Katıl)" : "Turnuva ID'si (Katıl)"}
            </label>
            <input
              type="text"
              placeholder="turnuva-ismi-2024"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              {isAdmin ? (
                <>
                  Admin olarak turnuva oluşturabilir veya mevcut turnuvalara katılabilirsiniz.<br/>
                  <span className="text-blue-600 font-medium">Turnuva yoksa otomatik oluşturulur.</span>
                </>
              ) : (
                <>
                  Oyuncu olarak sadece <span className="font-semibold">mevcut turnuvalara</span> katılabilirsiniz.<br/>
                  <span className="text-orange-600 font-medium">Yeni turnuva oluşturamazsınız.</span>
                </>
              )}
            </p>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Turnuva Kaç Gün Sürecek?
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[3, 4, 5, 6, 7].map((dayOption) => (
                  <button
                    key={dayOption}
                    type="button"
                    onClick={() => {
                      setDays(dayOption);
                      setShowDaysInfo(true);
                      setTimeout(() => setShowDaysInfo(false), 3000);
                    }}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                      days === dayOption
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {dayOption}
                  </button>
                ))}
              </div>
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 text-lg">💡</span>
                  <div className="text-sm text-blue-700">
                    <div className="font-semibold mb-1">
                      {days} gün = Tahmini {calculateEstimatedRounds(days, 2)} tur
                    </div>
                    <div className="text-xs text-blue-600">
                      Günde 180 dakika (3 saat) = ~6 tur (30 dk/maç, 2 saha)
                    </div>
                  </div>
                </div>
              </div>
              {showDaysInfo && (
                <div className="mt-2 text-xs text-green-600 font-medium animate-pulse">
                  ✓ {days} günlük turnuva seçildi
                </div>
              )}
            </div>
          )}

          {savedTournaments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Önceki Turnuvalar
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {savedTournaments.map((tournament, index) => (
                  <button
                    key={index}
                    onClick={() => setTournamentId(tournament)}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors break-words"
                  >
                    🏆 {tournament}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={!tournamentId.trim() || joinLoading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {joinLoading ? "Katılıyor..." : isAdmin ? "Turnuvayı Başlat / Katıl" : "Turnuvaya Katıl"}
          </button>

          {joinLoading && (
            <div className="flex items-center justify-center mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-600 font-medium">Turnuva yükleniyor...</span>
            </div>
          )}
          {joinError && (
            <div className="mt-4 text-red-600 text-sm font-semibold text-center">
              {joinError}
            </div>
          )}

          {isAdmin && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Örnek ID'ler:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => setTournamentId("demo-turnuva")}
                  className="text-xs bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  demo-turnuva
                </button>
                <button 
                  onClick={() => setTournamentId("test-2024")}
                  className="text-xs bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  test-2024
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
