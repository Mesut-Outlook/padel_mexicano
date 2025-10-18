import { useState } from 'react';

interface TournamentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: TournamentSettings) => void;
  currentSettings?: TournamentSettings;
}

export interface TournamentSettings {
  name?: string;
  days?: number;
  courtCount?: number;
  estimatedRounds?: number;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export function TournamentSettingsModal({
  isOpen,
  onClose,
  onSave,
  currentSettings
}: TournamentSettingsModalProps) {
  const [name, setName] = useState(currentSettings?.name || '');
  const [startDate, setStartDate] = useState(currentSettings?.startDate || '');
  const [endDate, setEndDate] = useState(currentSettings?.endDate || '');
  const [location, setLocation] = useState(currentSettings?.location || '');
  const [days, setDays] = useState(currentSettings?.days || 5);
  const [courtCount, setCourtCount] = useState(currentSettings?.courtCount || 2);

  if (!isOpen) return null;

  // Günlere göre tahmini tur sayısını hesapla (Günde 3 tur)
  const calculateEstimatedRounds = (daysCount: number): number => {
    const roundsPerDay = 3; // Her gün 90 dakika / 30 dk maç = 3 tur
    return daysCount * roundsPerDay;
  };

  const handleSave = () => {
    onSave({
      name: name || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      location: location || undefined,
      days: days,
      courtCount: courtCount,
      estimatedRounds: calculateEstimatedRounds(days)
    });
    onClose();
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">📋 Turnuva Detayları</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          {/* Turnuva İsmi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏆 Turnuva İsmi
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: 2025 Bahar Kupası"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Turnuvanıza özel bir isim verin (İsteğe bağlı)
            </p>
          </div>

          {/* Gün Sayısı Seçimi */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-green-800 mb-2">
              📅 Turnuva Gün Sayısı
            </label>
            <p className="text-xs text-green-600 mb-3">
              Turnuva kaç gün sürecek? (Otomatik tur hesaplaması yapılacak)
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((dayOption) => (
                <button
                  key={dayOption}
                  type="button"
                  onClick={() => setDays(dayOption)}
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
          </div>

          {/* Saha Sayısı Seçimi */}
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
                    {courtCount} saha ile daha hızlı oyun
                  </div>
                  <div className="text-xs text-blue-600">
                    Daha fazla saha = Daha kısa tur süresi
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={formatDateForInput(startDate)}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {startDate && (
              <p className="text-xs text-gray-500 mt-1">
                {formatDateDisplay(startDate)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏁 Bitiş Tarihi
            </label>
            <input
              type="date"
              value={formatDateForInput(endDate)}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {endDate && (
              <p className="text-xs text-gray-500 mt-1">
                {formatDateDisplay(endDate)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Turnuva Yeri
            </label>
            <textarea
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Örn: Ankara Spor Kulübü, Ümitköy Salonu"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Turnuva yapılacak yer bilgilerini serbest formatta girebilirsiniz
            </p>
          </div>

          {startDate && endDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-lg">📊</span>
                <div className="text-sm text-blue-700">
                  <div className="font-semibold mb-1">
                    Turnuva Süresi
                  </div>
                  <div className="text-xs text-blue-600">
                    {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} gün
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Kaydet
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          💡 Bu bilgiler isteğe bağlıdır ve sonradan güncellenebilir
        </div>
      </div>
    </div>
  );
}
