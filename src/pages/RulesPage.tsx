export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-blue-800">📋 Oyun Kuralları</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">🎯 Maç Formatı</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Maçlar <strong>32 puana kadar</strong> oynanır</li>
            <li>• İlk 32'ye ulaşan takım kazanır</li>
            <li>• Örnek skorlar: 32-15, 32-20, 32-8</li>
            <li>• Her oyuncu takımının aldığı puanı alır</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">🏆 Tur Sistemi</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• <strong>1. Tur:</strong> Rastgele eşleştirme</li>
            <li>• <strong>Sonraki turlar:</strong> Sıralamaya göre</li>
            <li>• En iyi + en kötü vs 2. + son 2.</li>
            <li>• Minimum 8 oyuncu (çift sayı)</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">📊 Sıralama</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• <strong>1. Kriter:</strong> Toplam puan</li>
            <li>• <strong>2. Kriter:</strong> Averaj (alınan - verilen)</li>
            <li>• <strong>3. Kriter:</strong> Alfabetik sıra</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">⏸️ Bay Sistemi</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Oyuncu sayısı 4'ün katı değilse bay verilir</li>
            <li>• Bay sırası adil rotasyonla</li>
            <li>• En az bay alan önceliklidir</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
