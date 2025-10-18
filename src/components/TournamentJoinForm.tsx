import { useState, useEffect } from "react";

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
  const [showDaysInfo, setShowDaysInfo] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Günlere göre tahmini tur sayısını hesapla
  const calculateEstimatedRounds = (daysCount: number): number => {
    // Her maç 30 dakika
    // Her gün 90 dakika oyun süresi
    // Günde 3 tur (90 / 30 = 3)
    const roundsPerDay = 3;
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
    // Yeni turnuva oluştur - otomatik ID
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const randomId = Math.random().toString(36).substring(2, 8);
    const newTournamentId = `turnuva-${timestamp}-${randomId}`;
    
    setTournamentId(newTournamentId);
    setIsCreatingNew(true);
    setJoinLoading(true);
    setJoinError(null);
    
    // Admin için tüm ayarları gönder (yeni turnuva)
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
      // Mevcut turnuvaya katıl - gün sayısı gönderme
      onJoinTournament(normalizedId, undefined);
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
              {isAdmin ? "Mevcut Turnuva ID'si" : "Turnuva ID'si"}
            </label>
            <input
              type="text"
              placeholder={isAdmin ? "Örn: turnuva-2025-10-14" : "Turnuva ID'sini girin"}
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              {isAdmin ? (
                <>
                  Mevcut bir turnuvaya katılmak için ID'sini girin.<br/>
                  <span className="text-blue-600 font-medium">Yeni turnuva için yukarıdaki butonu kullanın.</span>
                </>
              ) : (
                <>
                  Mevcut turnuvaya katılmak için ID'sini girin.<br/>
                  <span className="text-orange-600 font-medium">Yeni turnuva oluşturamazsınız.</span>
                </>
              )}
            </p>
          </div>

          {isAdmin && (
            <>
              {/* Turnuva İsmi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏆 Yeni Turnuva İsmi (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2025 Bahar Kupası"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Boş bırakırsanız otomatik ID kullanılır
                </p>
              </div>

              {/* Gün Sayısı */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-green-800 mb-2">
                📅 Yeni Turnuva İçin Gün Sayısı
              </label>
              <p className="text-xs text-green-600 mb-3">
                Bu ayar sadece "Yeni Turnuva Oluştur" ile kullanılır
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((dayOption) => (
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
                        ? 'bg-green-600 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {dayOption}
                  </button>
                ))}
              </div>
              <div className="mt-3 bg-white border border-green-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 text-lg">💡</span>
                  <div className="text-sm text-green-700">
                    <div className="font-semibold mb-1">
                      {days} gün = Tahmini {calculateEstimatedRounds(days)} tur
                    </div>
                    <div className="text-xs text-green-600">
                      Günde 90 dakika = 3 tur (30 dk/maç)
                    </div>
                  </div>
                </div>
              </div>
              {showDaysInfo && (
                <div className="mt-2 text-xs text-green-600 font-medium animate-pulse">
                  ✓ {days} günlük turnuva hazır
                </div>
              )}
            </div>

            {/* Saha Sayısı */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                🏟️ Saha Sayısı
              </label>
              <p className="text-xs text-blue-600 mb-3">
                Turnuvada kaç saha kullanılacak?
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((courtOption) => (
                  <button
                    key={courtOption}
                    type="button"
                    onClick={() => setCourtCount(courtOption)}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                      courtCount === courtOption
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {courtOption}
                  </button>
                ))}
              </div>
              <div className="mt-3 bg-white border border-blue-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 text-lg">⏱️</span>
                  <div className="text-sm text-blue-700">
                    <div className="font-semibold mb-1">
                      {courtCount} saha seçildi
                    </div>
                    <div className="text-xs text-blue-600">
                      Daha fazla saha = Daha hızlı oyun akışı
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
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

          {isAdmin && (
            <button
              onClick={handleCreateNew}
              disabled={joinLoading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg"
            >
              {joinLoading && isCreatingNew ? "Oluşturuluyor..." : "✨ Yeni Turnuva Oluştur"}
            </button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">veya</span>
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!tournamentId.trim() || joinLoading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {joinLoading && !isCreatingNew ? "Katılıyor..." : isAdmin ? "Mevcut Turnuvaya Katıl" : "Turnuvaya Katıl"}
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
