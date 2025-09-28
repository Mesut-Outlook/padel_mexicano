import { useMemo, useState, useEffect } from "react";
import { useFirebaseTournament } from "./src/hooks/useFirebaseTournament";

// Mexicano Web App – Variable players (>=8, even). Round 1 random; subsequent rounds seeded:
// After removing required BYEs to make players divisible by 4, pair as:
// (1 & last) vs (2 & last-1), (3 & last-2) vs (4 & last-3), ... among the remaining players.
// Race-to-32: a match ends when one side reaches 32. Validation enforces one team has exactly 32 and the other 0..31.
// Points split within each team using the round's starting ranking snapshot: 55% to lower-ranked, 45% to higher-ranked.

export default function App() {
  const [tournamentId, setTournamentId] = useState<string>("");
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [savedTournaments, setSavedTournaments] = useState<string[]>(() => {
    // Local storage'dan kayıtlı turnuvaları al
    const saved = localStorage.getItem('mexicano-tournaments');
    return saved ? JSON.parse(saved) : [];
  });

  // Turnuva ID'si yoksa giriş formu göster
  if (showJoinForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            🏸 Mexicano Padel
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turnuva ID'si
              </label>
              <input
                type="text"
                placeholder="turnuva-ismi-2024"
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Aynı turnuvaya katılacak herkes aynı ID'yi kullanmalı.<br/>
                <span className="text-blue-600 font-medium">Turnuva yoksa otomatik oluşturulur.</span>
              </p>
            </div>

            {savedTournaments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Önceki Turnuvalar
                </label>
                <div className="space-y-2">
                  {savedTournaments.map((tournament, index) => (
                    <button
                      key={index}
                      onClick={() => setTournamentId(tournament)}
                      className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                    >
                      🏆 {tournament}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                if (tournamentId.trim()) {
                  // Turnuva ID'sini kayıtlı listesine ekle
                  const updatedTournaments = [tournamentId, ...savedTournaments.filter(t => t !== tournamentId)].slice(0, 5);
                  setSavedTournaments(updatedTournaments);
                  localStorage.setItem('mexicano-tournaments', JSON.stringify(updatedTournaments));
                  setShowJoinForm(false);
                } else {
                  alert("Lütfen bir turnuva ID'si girin");
                }
              }}
              disabled={!tournamentId.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              Turnuvayı Başlat / Katıl
            </button>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Örnek ID'ler:</p>
              <div className="space-x-2">
                <button 
                  onClick={() => setTournamentId("demo-turnuva")}
                  className="text-xs bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200"
                >
                  demo-turnuva
                </button>
                <button 
                  onClick={() => setTournamentId("test-2024")}
                  className="text-xs bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200"
                >
                  test-2024
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <TournamentApp tournamentId={tournamentId} setShowJoinForm={setShowJoinForm} />;
}

function TournamentApp({ tournamentId, setShowJoinForm }: { 
  tournamentId: string; 
  setShowJoinForm: (show: boolean) => void; 
}) {
  const { data: tournamentData, loading, error, updateTournament, deleteTournament } = useFirebaseTournament(tournamentId);

  // Tüm useState'leri en üstte tanımla - conditional render'dan önce!
  const [players, setPlayers] = useState<string[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [byeCounts, setByeCounts] = useState<Record<string, number>>({});

  // Firebase'den gelen verileri local state'e senkronize et
  useEffect(() => {
    if (tournamentData) {
      setPlayers(tournamentData.players || []);
      setRounds(tournamentData.rounds || []);
      setTotals(tournamentData.totals || {});
      setByeCounts(tournamentData.byeCounts || {});
    }
  }, [tournamentData]);

  // State değişikliklerini localStorage'a kaydetmek için helper fonksiyonlar
  const updatePlayersAndSave = (newPlayers: string[]) => {
    setPlayers(newPlayers);
    const newData = {
      players: newPlayers,
      rounds,
      totals,
      byeCounts,
      tournamentStarted: newPlayers.length > 0 && rounds.length > 0,
      currentRound: rounds.length
    };
    updateTournament(newData);
  };

  const updateRoundsAndSave = (newRounds: Round[]) => {
    setRounds(newRounds);
    const newData = {
      players,
      rounds: newRounds,
      totals,
      byeCounts,
      tournamentStarted: players.length > 0 && newRounds.length > 0,
      currentRound: newRounds.length
    };
    updateTournament(newData);
  };

  const updateTotalsAndSave = (newTotals: Record<string, number>) => {
    setTotals(newTotals);
    const newData = {
      players,
      rounds,
      totals: newTotals,
      byeCounts,
      tournamentStarted: players.length > 0 && rounds.length > 0,
      currentRound: rounds.length
    };
    updateTournament(newData);
  };

  const updateByeCountsAndSave = (newByeCounts: Record<string, number>) => {
    setByeCounts(newByeCounts);
    const newData = {
      players,
      rounds,
      totals,
      byeCounts: newByeCounts,
      tournamentStarted: players.length > 0 && rounds.length > 0,
      currentRound: rounds.length
    };
    updateTournament(newData);
  };

  // Fonksiyonları ve useMemo'yu da hooks bölümünde tanımla
  function currentRanking(): string[] {
    // Best (highest total) first; break ties by average, then by name
    return [...players].sort((a, b) => {
      const totalDiff = (totals[b] ?? 0) - (totals[a] ?? 0);
      if (totalDiff !== 0) return totalDiff;
      
      // Eşit toplam puan durumunda averaja bak
      const avgA = calculateAverage(a);
      const avgB = calculateAverage(b);
      const avgDiff = avgB - avgA;
      if (avgDiff !== 0) return avgDiff;
      
      // Hem toplam hem averaj eşitse alfabetik sıralama
      return a.localeCompare(b, "tr");
    });
  }

  const ranking = useMemo(() => currentRanking(), [players, totals]);
  const byesNeededNow = needByesForCount(players.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Turnuva yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Firebase hatası varsa offline uyarısı göster ama uygulamayı çalıştır
    console.warn('Firebase offline, local modda çalışıyor:', error);
  }

  if (!tournamentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <p className="text-gray-600">Turnuva verisi yükleniyor...</p>
      </div>
    );
  }

  type Match = {
    teamA: [string, string];
    teamB: [string, string];
    scoreA?: number; // team A total points
    scoreB?: number; // team B total points
    winner?: "A" | "B";
    perPlayerPoints?: Record<string, number>; // computed after submit
  };

  type Round = {
    number: number;
    matches: Match[];
    rankingSnapshot: string[]; // ranking at the start of the round (best -> worst)
    byes: string[]; // players resting this round
    submitted?: boolean;
  };

  function calculateAverage(playerName: string): number {
    // Averaj = Alınan Puan - Verilen Puan
    let takenPoints = 0;
    let givenPoints = 0;

    rounds.forEach(round => {
      if (!round.submitted) return;
      
      round.matches.forEach(match => {
        const { teamA, teamB, scoreA = 0, scoreB = 0 } = match;
        
        if (teamA.includes(playerName)) {
          takenPoints += scoreA;
          givenPoints += scoreB;
        } else if (teamB.includes(playerName)) {
          takenPoints += scoreB;
          givenPoints += scoreA;
        }
      });
    });

    return takenPoints - givenPoints;
  }

  function calculateMatchesPlayed(playerName: string): number {
    let matchesPlayed = 0;
    
    rounds.forEach(round => {
      if (!round.submitted) return; // Only count submitted rounds
      
      round.matches.forEach(match => {
        const { teamA, teamB } = match;
        
        if (teamA.includes(playerName) || teamB.includes(playerName)) {
          matchesPlayed++;
        }
      });
    });

    return matchesPlayed;
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function calculateOptimalRounds(playerCount: number) {
    if (playerCount < 8 || playerCount % 2 !== 0) {
      return { optimalRounds: 0, matchesPerPlayer: 0, description: "Geçersiz oyuncu sayısı" };
    }

    const playingPerRound = Math.floor(playerCount / 4) * 4;
    const byesPerRound = playerCount - playingPerRound;
    
    let optimalRounds;
    if (byesPerRound === 0) {
      optimalRounds = Math.max(6, Math.floor(playerCount * 0.75));
    } else {
      optimalRounds = Math.ceil(playerCount * 0.6);
    }
    
    const matchesPerPlayer = Math.floor((optimalRounds * 4) / playerCount);
    
    let description = `${playerCount} oyuncu için optimal: ${optimalRounds} tur`;
    if (byesPerRound > 0) {
      description += ` (her turda ${byesPerRound} bay)`;
    }
    
    return { optimalRounds, matchesPerPlayer, description };
  }

  function ensureEvenAtLeastEight(): boolean {
    if (players.length < 8) {
      alert("Oyuncu sayısı en az 8 olmalı.");
      return false;
    }
    if (players.length % 2 !== 0) {
      alert("Oyuncu sayısı çift olmalı (8, 10, 12, ...).");
      return false;
    }
    return true;
  }

  function needByesForCount(n: number): number {
    // We need a multiple of 4 to form 2v2 matches. Return how many byes are required for this round.
    const r = n % 4;
    if (r === 0) return 0;
    if (r === 2) return 2;
    // For odd counts we don't allow; UI restricts to even.
    return 0;
  }

  function pickByes(ranking: string[], count: number): string[] {
    if (count <= 0) return [];
    // Fair rotation: choose players with the lowest bye count; tie-break by lower totals (worse rank => earlier), then name.
    const sorted = [...ranking]
      .sort((a, b) => {
        const bc = (byeCounts[a] ?? 0) - (byeCounts[b] ?? 0);
        if (bc !== 0) return bc;
        // worse rank means later in ranking array; we want those later first => sort by index descending
        const ia = ranking.indexOf(a);
        const ib = ranking.indexOf(b);
        const rc = ib - ia;
        if (rc !== 0) return rc;
        return a.localeCompare(b, "tr");
      });
    return sorted.slice(0, count);
  }

  function seededPairs(available: string[]): Array<[[string, string], [string, string]]> {
    // available is best->worst by ranking
    const pairs: Array<[[string, string], [string, string]]> = [];
    const n = available.length;
    // We will pair (1&n) vs (2&n-1), (3&n-2) vs (4&n-3), ...
    for (let i = 0; i < n / 4; i++) {
      const a1 = available[i * 2 + 0];
      const a2 = available[n - 1 - (i * 2 + 0)];
      const b1 = available[i * 2 + 1];
      const b2 = available[n - 1 - (i * 2 + 1)];
      pairs.push([[a1, a2], [b1, b2]]);
    }
    return pairs;
  }

  function splitTeamPoints(
    p1: string,
    p2: string,
    teamScore: number
  ): Record<string, number> {
    // Her oyuncu kendi takımının aldığı gerçek skor sayısını alır
    return { [p1]: teamScore, [p2]: teamScore };
  }

  function startTournament() {
    if (!ensureEvenAtLeastEight()) return;
    const initialTotals = Object.fromEntries(players.map((p) => [p, 0]));
    setTotals(initialTotals);
    setByeCounts(Object.fromEntries(players.map((p) => [p, 0])));

    // Round 1: random within playable set (apply byes if needed for N%4==2)
    const ranking0 = currentRanking();
    const n = players.length;
    const byesNeeded = needByesForCount(n);
    let byes: string[] = [];
    if (byesNeeded > 0) {
      byes = pickByes(ranking0, byesNeeded);
    }
    const active = shuffle(players.filter((p) => !byes.includes(p)));
    const teams: [string, string][] = [];
    for (let i = 0; i < active.length; i += 2) {
      teams.push([active[i], active[i + 1]]);
    }
    const matches: Match[] = [];
    for (let i = 0; i < teams.length; i += 2) {
      matches.push({ teamA: teams[i], teamB: teams[i + 1] });
    }
    const newRounds = [
      {
        number: 1,
        matches,
        rankingSnapshot: ranking0,
        byes,
      },
    ];
    updateRoundsAndSave(newRounds);
  }

  function addNextRound() {
    if (!ensureEvenAtLeastEight()) return;
    const nextNo = rounds.length + 1;
    const ranking = currentRanking();

    // Determine byes for this round based on player count
    const n = players.length;
    const byesNeeded = needByesForCount(n);
    const byes = byesNeeded > 0 ? pickByes(ranking, byesNeeded) : [];

    // Available players for seeded pairing
    const available = ranking.filter((p) => !byes.includes(p));
    const pairs = seededPairs(available);
    const matches: Match[] = pairs.map(([[a1, a2], [b1, b2]]) => ({ teamA: [a1, a2], teamB: [b1, b2] }));

    const newRounds = [
      ...rounds,
      { number: nextNo, matches, rankingSnapshot: ranking, byes },
    ];
    updateRoundsAndSave(newRounds);

    // track byes
    if (byes.length) {
      const newByeCounts = { ...byeCounts };
      byes.forEach((p) => (newByeCounts[p] = (newByeCounts[p] ?? 0) + 1));
      updateByeCountsAndSave(newByeCounts);
    }
  }

  function updateMatchScore(
    roundIndex: number,
    matchIndex: number,
    data: Partial<Match>
  ) {
    const newRounds = rounds.map((r, i) => {
      if (i !== roundIndex) return r;
      const copy = { ...r };
      let m = { ...copy.matches[matchIndex], ...data };
      
      // 32'den fazla skor girilmesini engelle
      if (m.scoreA != null && m.scoreA > 32) m.scoreA = 32;
      if (m.scoreB != null && m.scoreB > 32) m.scoreB = 32;
      
      // Auto-set winner if a valid race-to-32 score is entered
      if (m.scoreA != null && m.scoreB != null) {
        if (m.scoreA === 32 && m.scoreB < 32) m.winner = "A";
        else if (m.scoreB === 32 && m.scoreA < 32) m.winner = "B";
        else m.winner = undefined; // neither team has exactly 32 or both have 32+
      }
      copy.matches = [...copy.matches];
      copy.matches[matchIndex] = m;
      return copy;
    });
    updateRoundsAndSave(newRounds);
  }

  function submitRound(roundIndex: number) {
    const r = rounds[roundIndex];
    // validate each match respects race-to-32
    for (const m of r.matches) {
      if (m.scoreA == null || m.scoreB == null) {
        alert("Her maç için skor girilmeli.");
        return;
      }
      if (m.scoreA > 32 || m.scoreB > 32) {
        alert("Skor 32'den fazla olamaz. Race-to-32 formatında maksimum skor 32'dir.");
        return;
      }
      if (!(m.scoreA === 32 || m.scoreB === 32)) {
        alert("Race-to-32: Bir takım mutlaka 32 puana ulaşmalı.");
        return;
      }
      if (m.scoreA === 32 && m.scoreB === 32) {
        alert("Her iki takım da 32 puana ulaşamaz. Sadece kazanan 32 puana ulaşır.");
        return;
      }
      if (m.scoreA < 0 || m.scoreB < 0) {
        alert("Skorlar negatif olamaz.");
        return;
      }
      // winner auto-detected above; just in case
      m.winner = m.scoreA === 32 ? "A" : "B";
    }

    // compute per-player points and update totals based on rankingSnapshot at the start of this round
    const perPlayerUpdates: Record<string, number> = {};

    r.matches.forEach((m) => {
      const { teamA, teamB, scoreA = 0, scoreB = 0 } = m;
      const splitA = splitTeamPoints(
        teamA[0],
        teamA[1],
        scoreA
      );
      const splitB = splitTeamPoints(
        teamB[0],
        teamB[1],
        scoreB
      );
      const per = { ...splitA, ...splitB };
      m.perPlayerPoints = per;
      for (const [name, pts] of Object.entries(per)) {
        perPlayerUpdates[name] = (perPlayerUpdates[name] ?? 0) + pts;
      }
    });

    const newTotals = { ...totals };
    for (const [n, v] of Object.entries(perPlayerUpdates)) {
      newTotals[n] = (newTotals[n] ?? 0) + v;
    }
    updateTotalsAndSave(newTotals);

    const newRounds = [...rounds];
    newRounds[roundIndex] = { ...r, submitted: true };
    updateRoundsAndSave(newRounds);
  }

  function resetTournament() {
    const initialTotals = Object.fromEntries(players.map((p) => [p, 0]));
    const initialByes = Object.fromEntries(players.map((p) => [p, 0]));
    
    updateRoundsAndSave([]);
    updateTotalsAndSave(initialTotals);
    updateByeCountsAndSave(initialByes);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Mexicano Padel – Değişken Oyuncu Sayısı (≥8, çift)</h1>
              <p className="text-sm text-gray-600 mt-1">
                Tur 1 rastgele; sonraki turlar, o turun başındaki sıralamaya göre: kalan oyuncular (gerekli baylar çıkarıldıktan sonra) {" "}
                <span className="font-semibold">(1&son) vs (2&son-1), (3&son-2) vs (4&son-3)</span> şeklinde eşleşir.
                Maçlar <span className="font-semibold">32'ye kadar</span> oynanır; kazananın skoru 32 olmalıdır.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  🏆 Turnuva: {tournamentId}
                </span>
                <span className="text-sm text-gray-500">
                  {rounds.length > 0 ? `${rounds.length} tur tamamlandı` : 'Turnuva başlamadı'}
                </span>
                {error && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                    📱 Offline Mod
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm('Bu turnuvayı tamamen silmek istediğinizden emin misiniz? Tüm veriler kaybolacak!')) {
                    deleteTournament();
                    setShowJoinForm(true);
                  }
                }}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg transition-colors"
              >
                🗑️ Sil
              </button>
              <button
                onClick={() => setShowJoinForm(true)}
                className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg transition-colors"
              >
                🚪 Çıkış
              </button>
            </div>
          </div>
        </header>

        {/* Player editor */}
        <section className="bg-white rounded-2xl shadow p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Oyuncular</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {players.map((p, idx) => (
              <input
                key={idx}
                value={p}
                onChange={(e) => {
                  const next = [...players];
                  const old = next[idx];
                  const val = e.target.value;
                  next[idx] = val;
                  setPlayers(next);
                  setTotals((prev) => {
                    const copy = { ...prev } as Record<string, number>;
                    // migrate score to new name
                    copy[val] = copy[old] ?? 0;
                    if (val !== old) delete copy[old];
                    return copy;
                  });
                  setByeCounts((prev) => {
                    const copy = { ...prev } as Record<string, number>;
                    copy[val] = copy[old] ?? 0;
                    if (val !== old) delete copy[old];
                    return copy;
                  });
                }}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring w-full"
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => {
                const name = prompt("Yeni oyuncu adı (oyuncu sayısı çift ve ≥8 olmalı)");
                if (!name) return;
                const next = [...players, name];
                updatePlayersAndSave(next);
                setTotals((prev) => ({ ...prev, [name]: 0 }));
                setByeCounts((prev) => ({ ...prev, [name]: 0 }));
              }}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
            >
              Oyuncu Ekle
            </button>
            <button
              onClick={() => {
                if (players.length <= 8) {
                  alert("En az 8 oyuncu olmalı.");
                  return;
                }
                const name = prompt("Silinecek oyuncu adı");
                if (!name) return;
                if (!players.includes(name)) {
                  alert("Bu isim mevcut değil.");
                  return;
                }
                const next = players.filter((p) => p !== name);
                updatePlayersAndSave(next);
                setTotals((prev) => {
                  const { [name]: _, ...rest } = prev;
                  return rest as Record<string, number>;
                });
                setByeCounts((prev) => {
                  const { [name]: _, ...rest } = prev;
                  return rest as Record<string, number>;
                });
              }}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
            >
              Oyuncu Sil
            </button>
            <div className="text-sm text-gray-600">Oyuncu sayısı: {players.length} (bu tur için gerekli bay: {byesNeededNow})</div>
          </div>

          {/* Tur Hesaplama Bilgi Paneli */}
          {(() => {
            const calc = calculateOptimalRounds(players.length);
            const currentRounds = rounds.length;
            const progress = Math.min(100, (currentRounds / calc.optimalRounds) * 100);
            const remaining = Math.max(0, calc.optimalRounds - currentRounds);
            
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  🏆 Turnuva Planlama
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-700">Eşit Dağılım İçin</div>
                    <div className="text-lg font-bold text-blue-900">
                      {calc.optimalRounds} Tur
                    </div>
                    <div className="text-blue-600">
                      Oyuncu başına ~{calc.matchesPerPlayer} maç
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-700">Mevcut Durum</div>
                    <div className="text-lg font-bold text-blue-900">
                      {currentRounds}/{calc.optimalRounds} Tur
                    </div>
                    <div className="text-blue-600">
                      {remaining > 0 ? `${remaining} tur daha önerilen` : "Hedef tamamlandı!"}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-700">İlerleme</div>
                    <div className="w-full bg-blue-200 rounded-full h-3 mt-2">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-blue-800 font-medium mt-1">
                      %{Math.round(progress)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={startTournament}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
            >
              Turnuvayı Başlat (Tur 1 Rastgele)
            </button>
            <button
              onClick={resetTournament}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
            >
              Sıfırla
            </button>
          </div>
        </section>

        {/* Rounds */}
        <section className="space-y-6">
          {rounds.map((r, rIdx) => (
            <div key={r.number} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Tur {r.number}</h3>
                <div className="text-sm text-gray-500">
                  Başlangıç sıralaması: {r.rankingSnapshot.join(" • ")}
                </div>
              </div>

              {r.byes.length > 0 && (
                <div className="mt-2 text-sm text-amber-700">
                  Bu tur bay: <span className="font-medium">{r.byes.join(" • ")}</span>
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {r.matches.map((m, mIdx) => (
                  <div key={mIdx} className="border rounded-xl p-4 bg-gradient-to-r from-blue-50 to-green-50">
                    {/* Match Header */}
                    <div className="text-center mb-4">
                      <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                        🏸 Maç {mIdx + 1}
                      </div>
                    </div>
                    
                    {/* Teams Display */}
                    <div className="flex items-center justify-center mb-4 text-lg">
                      <div className="flex items-center bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-blue-200">
                        <span className="font-bold text-blue-700">{m.teamA[0]}</span>
                        <span className="text-blue-500 mx-1">&</span>
                        <span className="font-bold text-blue-700">{m.teamA[1]}</span>
                      </div>
                      
                      <div className="mx-4 bg-gradient-to-r from-orange-400 to-red-400 text-white px-3 py-1 rounded-full font-bold text-sm shadow">
                        VS
                      </div>
                      
                      <div className="flex items-center bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-green-200">
                        <span className="font-bold text-green-700">{m.teamB[0]}</span>
                        <span className="text-green-500 mx-1">&</span>
                        <span className="font-bold text-green-700">{m.teamB[1]}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-3 border-2 border-blue-200">
                        <label className="block text-sm font-medium text-blue-700 mb-2">
                          🔵 Takım A Skoru
                          <span className="block text-xs text-gray-500 font-normal">İlk 32'ye ulaşan kazanır</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={32}
                          value={m.scoreA ?? ""}
                          onChange={(e) => {
                            const value = Math.min(32, Math.max(0, Number(e.target.value)));
                            updateMatchScore(rIdx, mIdx, { scoreA: value });
                          }}
                          className="w-full border-2 border-blue-300 rounded-xl px-3 py-3 text-center text-lg font-bold text-blue-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="0"
                        />
                      </div>
                      <div className="bg-white rounded-xl p-3 border-2 border-green-200">
                        <label className="block text-sm font-medium text-green-700 mb-2">
                          🟢 Takım B Skoru  
                          <span className="block text-xs text-gray-500 font-normal">İlk 32'ye ulaşan kazanır</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={32}
                          value={m.scoreB ?? ""}
                          onChange={(e) => {
                            const value = Math.min(32, Math.max(0, Number(e.target.value)));
                            updateMatchScore(rIdx, mIdx, { scoreB: value });
                          }}
                          className="w-full border-2 border-green-300 rounded-xl px-3 py-3 text-center text-lg font-bold text-green-700 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Match Result Display */}
                    {m.scoreA !== undefined && m.scoreB !== undefined && (
                      <div className="mt-4 bg-white rounded-xl p-3 border-l-4 border-yellow-400">
                        <div className="text-center">
                          {m.scoreA === 32 || m.scoreB === 32 ? (
                            <div className="flex items-center justify-center">
                              <span className="text-2xl font-bold mr-2">
                                {m.scoreA} - {m.scoreB}
                              </span>
                              {m.scoreA === 32 && (
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                  🏆 Takım A Kazandı!
                                </span>
                              )}
                              {m.scoreB === 32 && (
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                                  🏆 Takım B Kazandı!
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-lg font-semibold text-gray-600">
                              {m.scoreA} - {m.scoreB} (Devam ediyor...)
                            </span>
                          )}
                        </div>
                      </div>
                    )}


                    {m.perPlayerPoints && (
                      <div className="mt-2 text-sm">
                        <div className="text-gray-500">Dağıtılan Puanlar:</div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {Object.entries(m.perPlayerPoints).map(([n, v]) => (
                            <div key={n} className="flex justify-between">
                              <span>{n}</span>
                              <span className="font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                {!r.submitted && (
                  <button
                    onClick={() => submitRound(rIdx)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                  >
                    Turu Kaydet / Puanları Dağıt
                  </button>
                )}
                {r.submitted && (
                  <button
                    onClick={addNextRound}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
                  >
                    Sonraki Turu Oluştur
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Standings */}
        <section className="bg-white rounded-2xl shadow p-4 mt-6">
          <h2 className="text-xl font-semibold mb-3">Güncel Sıralama</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Oyuncu</th>
                  <th className="py-2 pr-4">Toplam Puan</th>
                  <th className="py-2 pr-4">Averaj</th>
                  <th className="py-2 pr-4">Oynanan Maç</th>
                  <th className="py-2 pr-4">Bay</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((p, i) => {
                  const avg = calculateAverage(p);
                  const matchesPlayed = calculateMatchesPlayed(p);
                  return (
                    <tr key={p} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{i + 1}</td>
                      <td className="py-2 pr-4">{p}</td>
                      <td className="py-2 pr-4 font-semibold">{totals[p] ?? 0}</td>
                      <td className={`py-2 pr-4 font-semibold ${
                        avg > 0 ? 'text-green-600' : avg < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {avg > 0 ? '+' : ''}{avg}
                      </td>
                      <td className="py-2 pr-4">{matchesPlayed}</td>
                      <td className="py-2 pr-4">{byeCounts[p] ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-xs text-gray-500 mt-6">
          Notlar: (1) Race-to-32: İlk 32 puana ulaşan takım kazanır (örn. 32-15, 32-20 vb. geçerlidir). (2) Her oyuncu kendi takımının aldığı skor sayısını puan olarak alır. (3) Averaj = Alınan Puan - Verilen Puan (pozitif iyi, negatif kötü). (4) Sıralama: Önce toplam puan, sonra averaj. (5) Oyuncu sayısı 4'ün katı değilse her turda gerekli sayıda bay otomatik atanır.
        </footer>
      </div>
    </div>
  );
}