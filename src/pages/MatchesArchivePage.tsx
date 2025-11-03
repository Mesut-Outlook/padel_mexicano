import React from "react";

export default function MatchesArchivePage({ rounds }: any) {
  // Son tur ve oynanmamış maçlar hariç, diğer tüm turlar
  const archivedRounds = rounds.slice(0, -1).filter((r: { matches: { scoreA?: number; scoreB?: number }[] }) => r.matches.every((m: { scoreA?: number; scoreB?: number }) => m.scoreA !== undefined && m.scoreB !== undefined));
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-blue-800">📚 Tamamlanan Turlar ve Maçlar</h1>
      <div className="space-y-4">
        {archivedRounds.length === 0 && <div className="text-gray-500">Henüz arşivlenecek tamamlanmış tur yok.</div>}
        {archivedRounds.map((round: any, idx: number) => {
          // O turdaki maçların en son kaydedilme tarihi
          const matchDates = round.matches.map((m: any) => m.savedAt).filter(Boolean).sort((a: string, b: string) => (b || '').localeCompare(a || ''));
          const latestMatchDate = matchDates[0];
          const [open, setOpen] = React.useState(false);
          return (
            <div key={idx} className="border rounded-xl shadow-sm">
              <button
                className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-t-xl text-left"
                onClick={() => setOpen(o => !o)}
              >
                <span className="font-semibold">Tur {round.number}</span>
                <span className="text-xs text-gray-500">{latestMatchDate && (<>📅 {new Date(latestMatchDate).toLocaleDateString('tr-TR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</>)}</span>
                <span className="ml-2 text-gray-400">{open ? '▲' : '▼'}</span>
              </button>
              {open && (
                <div className="p-4 space-y-2">
                  {round.matches.map((m: any, mIdx: number) => (
                    <div key={mIdx} className="flex justify-between items-center border-b last:border-0 pb-2">
                      <span>{m.teamA.join(' & ')} vs {m.teamB.join(' & ')}</span>
                      <span className="font-bold text-blue-700">{m.scoreA} - {m.scoreB}</span>
                      <span className="text-xs text-gray-500">{m.savedAt && (<>({new Date(m.savedAt).toLocaleDateString('tr-TR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})})</>)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
