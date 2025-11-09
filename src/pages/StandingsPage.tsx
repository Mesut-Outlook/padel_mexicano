interface StandingsPageProps {
  ranking: string[];
  totals: Record<string, number>;
  matchBalance: {
    counts: Record<string, number>;
    [key: string]: unknown;
  };
  byeCounts: Record<string, number>;
  calculateAverage: (playerName: string) => number;
  winLossStats: Record<string, { wins: number; losses: number }>;
}

export default function StandingsPage({ ranking, totals, matchBalance, byeCounts, calculateAverage, winLossStats }: StandingsPageProps) {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-blue-800">🏅 Güncel Sıralama</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Oyuncu</th>
              <th className="py-2 pr-4">Toplam Puan</th>
              <th className="py-2 pr-4">Averaj</th>
              <th className="py-2 pr-4">Oynanan Maç</th>
              <th className="py-2 pr-4">Galibiyet</th>
              <th className="py-2 pr-4">Mağlubiyet</th>
              <th className="py-2 pr-4">Bay</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((p: string, i: number) => {
              const avg = calculateAverage(p);
              const matchesPlayed = matchBalance.counts[p] ?? 0;
              const record = winLossStats[p] ?? { wins: 0, losses: 0 };
              return (
                <tr key={p} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{i + 1}</td>
                  <td className="py-2 pr-4">{p}</td>
                  <td className="py-2 pr-4 font-semibold">{totals[p] ?? 0}</td>
                  <td className={`py-2 pr-4 font-semibold ${avg > 0 ? 'text-green-600' : avg < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {avg > 0 ? '+' : ''}{avg}
                  </td>
                  <td className="py-2 pr-4">{matchesPlayed}</td>
                  <td className="py-2 pr-4 text-green-600 font-semibold">{record.wins}</td>
                  <td className="py-2 pr-4 text-red-600 font-semibold">{record.losses}</td>
                  <td className="py-2 pr-4">{byeCounts[p] ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
