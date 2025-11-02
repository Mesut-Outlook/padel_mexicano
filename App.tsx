import { useMemo, useState, useEffect, useRef } from "react";
import { usePrismaTournament } from "./src/hooks/usePrismaTournament";
import { useAuth } from "./src/hooks/useAuth";
import { LoginForm } from "./src/components/LoginForm";
import { TournamentJoinForm } from "./src/components/TournamentJoinForm";
import { TournamentSettingsModal, TournamentSettings } from "./src/components/TournamentSettingsModal";
import { AdminTournamentDashboard } from "./src/components/AdminTournamentDashboard";

// Mexicano Web App – Variable players (>=8, even). Round 1 random; subsequent rounds seeded:
// After removing required BYEs to make players divisible by 4, pair as:
// (1 & last) vs (2 & last-1), (3 & last-2) vs (4 & last-3), ... among the remaining players.
// Race-to-32: a match ends when one side reaches 32. Validation enforces one team has exactly 32 and the other 0..31.
// Points split within each team using the round's starting ranking snapshot: 55% to lower-ranked, 45% to higher-ranked.

export default function App() {
  const { user, logout, isAdmin, login } = useAuth();
  const [tournamentId, setTournamentId] = useState<string>("");
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [savedTournaments, setSavedTournaments] = useState<string[]>(() => {
    // Local storage'dan kayıtlı turnuvaları al
    const saved = localStorage.getItem('mexicano-tournaments');
    return saved ? JSON.parse(saved) : [];
  });

  // Kullanıcı giriş yapmadıysa login formu göster
  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  // Admin ise ve turnuva seçilmemişse dashboard göster
  if (isAdmin() && showJoinForm && !showAdminDashboard) {
    return (
      <AdminTournamentDashboard
        userName={user.name}
        onSelectTournament={(selectedId) => {
          setTournamentId(selectedId);
          setShowJoinForm(false);
          setShowAdminDashboard(false);
        }}
        onCreateNew={() => {
          setShowAdminDashboard(true);
        }}
        onLogout={logout}
      />
    );
  }

  // Admin yeni turnuva oluşturuyor
  if (isAdmin() && showAdminDashboard) {
    return (
      <TournamentJoinForm
        isAdmin={isAdmin()}
        userName={user.name}
        savedTournaments={savedTournaments}
        onJoinTournament={(normalizedId, days, tournamentName, courtCount) => {
          const updatedTournaments = [normalizedId, ...savedTournaments.filter(t => t !== normalizedId)].slice(0, 10);
          setSavedTournaments(updatedTournaments);
          localStorage.setItem('mexicano-tournaments', JSON.stringify(updatedTournaments));
          
          // Tüm turnuva ayarlarını localStorage'a kaydet (yeni turnuva oluşturuluyorsa)
          if (days && isAdmin()) {
            const roundsPerDay = 3; // 90 dakika / 30 dakika = 3 tur/gün
            const tournamentSettings = {
              id: normalizedId,
              name: tournamentName || undefined,
              days: days,
              courtCount: courtCount || 2,
              estimatedRounds: days * roundsPerDay,
              createdAt: new Date().toISOString()
            };
            localStorage.setItem(`tournament-settings-${normalizedId}`, JSON.stringify(tournamentSettings));
          }
          
          setTournamentId(normalizedId);
          setShowJoinForm(false);
          setShowAdminDashboard(false);
        }}
      />
    );
  }

  // Oyuncu için turnuva seçimi
  if (!isAdmin() && showJoinForm) {
    return (
      <TournamentJoinForm
        isAdmin={isAdmin()}
        userName={user.name}
        savedTournaments={savedTournaments}
        onJoinTournament={(normalizedId) => {
          const updatedTournaments = [normalizedId, ...savedTournaments.filter(t => t !== normalizedId)].slice(0, 5);
          setSavedTournaments(updatedTournaments);
          localStorage.setItem('mexicano-tournaments', JSON.stringify(updatedTournaments));
          
          setTournamentId(normalizedId);
          setShowJoinForm(false);
        }}
      />
    );
  }

  return <TournamentApp 
    tournamentId={tournamentId}
    user={user}
    onLogout={logout}
    isAdmin={isAdmin()}
    onBackToDashboard={() => {
      setShowJoinForm(true);
      setShowAdminDashboard(false);
    }}
  />;
}

interface User {
  id: string;
  name: string;
  type: 'admin' | 'player';
  createdAt: Date;
}

function TournamentApp({ 
  tournamentId, 
  user,
  onLogout,
  isAdmin,
  onBackToDashboard
}: { 
  tournamentId: string; 
  user: User;
  onLogout: () => void;
  isAdmin: boolean;
  onBackToDashboard?: () => void;
}) {
  const { data: tournamentData, loading, error, updateTournament } = usePrismaTournament(tournamentId);

  // Tüm useState'leri en üstte tanımla - conditional render'dan önce!
  const [players, setPlayers] = useState<string[]>([]);
  const [playerPool, setPlayerPool] = useState<string[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [byeCounts, setByeCounts] = useState<Record<string, number>>({});
  const [courtCount, setCourtCount] = useState<number>(2); // Saha sayısı
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings>({});
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toKey = (value: string) => value.trim().toLocaleLowerCase("tr-TR");

  // Turnuva ayarlarını yükle
  useEffect(() => {
    const savedSettings = localStorage.getItem(`tournament-settings-${tournamentId}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setTournamentSettings({
          name: parsed.name,
          days: parsed.days,
          courtCount: parsed.courtCount,
          estimatedRounds: parsed.estimatedRounds
        });
        
        // Eğer settings'te courtCount varsa ve Firebase'den gelen veriyle farklıysa, settings'teki değeri kullan
        if (parsed.courtCount && parsed.courtCount !== courtCount) {
          setCourtCount(parsed.courtCount);
        }
      } catch (error) {
        console.error('Tournament settings parse error:', error);
      }
    }
  }, [tournamentId]);

  // Fallback to empty data if no tournamentData but not loading
  const safeData = tournamentData || {
    players: [],
    rounds: [],
    totals: {},
    byeCounts: {},
    courtCount: 2,
    tournamentStarted: false,
    currentRound: 0,
    playerPool: []
  };

  // Firebase'den gelen verileri local state'e senkronize et
  useEffect(() => {
    const data = safeData;
    setPlayers(data.players || []);
    setPlayerPool(data.playerPool || []);
    setRounds(data.rounds || []);
    setTotals(data.totals || {});
    setByeCounts(data.byeCounts || {});
    setCourtCount(data.courtCount || 2);
  }, [tournamentData]); // Keep dependency on tournamentData

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  type TournamentStatePatch = {
    players?: string[];
    playerPool?: string[];
    rounds?: Round[];
    totals?: Record<string, number>;
    byeCounts?: Record<string, number>;
    courtCount?: number;
  };

  const persistTournamentState = async (patch: TournamentStatePatch) => {
    const nextPlayers = patch.players ?? players;
    const nextPlayerPool = patch.playerPool ?? playerPool;
    const nextRounds = patch.rounds ?? rounds;
    const nextTotals = patch.totals ?? totals;
    const nextByeCounts = patch.byeCounts ?? byeCounts;
    const nextCourtCount = patch.courtCount ?? courtCount;

    if (patch.players) setPlayers(nextPlayers);
    if (patch.playerPool) setPlayerPool(nextPlayerPool);
    if (patch.rounds) setRounds(nextRounds);
    if (patch.totals) setTotals(nextTotals);
    if (patch.byeCounts) setByeCounts(nextByeCounts);
    if (patch.courtCount !== undefined) setCourtCount(nextCourtCount);

    updateTournament({
      players: nextPlayers,
      playerPool: nextPlayerPool,
      rounds: nextRounds,
      totals: nextTotals,
      byeCounts: nextByeCounts,
      courtCount: nextCourtCount,
      tournamentStarted: nextPlayers.length > 0 && nextRounds.length > 0,
      currentRound: nextRounds.length
    });
  };

  const queueCopyFeedbackReset = () => {
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const handleCopyTournamentId = async () => {
    if (!tournamentId) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(tournamentId);
        setCopyStatus("copied");
        queueCopyFeedbackReset();
        return;
      }
      throw new Error("Clipboard API not supported");
    } catch (clipboardError) {
      try {
        const fallbackPrompt = window.prompt("Turnuva ID'sini kopyalamak için metni seçin ve kopyalayın", tournamentId);
        if (fallbackPrompt !== null) {
          setCopyStatus("copied");
        } else {
          setCopyStatus("error");
        }
      } catch (promptError) {
        console.error("Turnuva ID'si kopyalanamadı:", promptError || clipboardError);
        setCopyStatus("error");
      } finally {
        queueCopyFeedbackReset();
      }
    }
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
  const totalByeAssignments = useMemo(() => Object.values(byeCounts).reduce((sum, count) => sum + count, 0), [byeCounts]);
  const byesNeededNow = needByesForCount(players.length);
  const matchBalance = useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach((p) => {
      counts[p] = 0;
    });

    rounds.forEach((round) => {
      if (!round.submitted) return;
      round.matches.forEach(({ teamA, teamB }) => {
        [...teamA, ...teamB].forEach((player) => {
          if (counts[player] == null) counts[player] = 0;
          counts[player] += 1;
        });
      });
    });

    const values = Object.values(counts);
    const max = values.length ? Math.max(...values) : 0;
    const min = values.length ? Math.min(...values) : 0;
    const playersNeedingRest = Object.entries(counts)
      .filter(([, value]) => value === max)
      .map(([name]) => name);
    const playersNeedingPlay = Object.entries(counts)
      .filter(([, value]) => value === min)
      .map(([name]) => name);

    return {
      counts,
      max,
      min,
      spread: max - min,
      isBalanced: max === min,
      playersNeedingRest,
      playersNeedingPlay,
    };
  }, [players, rounds]);

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

  if (!tournamentData && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Turnuva verisi yükleniyor...</p>
        </div>
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
    updatedAt?: string; // son skor değişikliği zamanı
    savedAt?: string; // veritabanına en son kaydedilme zamanı
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

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function calculateOptimalRounds(playerCount: number, courts: number = 2) {
    if (playerCount < 8 || playerCount % 2 !== 0) {
      return { 
        optimalRounds: 0, 
        matchesPerPlayer: 0, 
        description: "Geçersiz oyuncu sayısı",
        timePerRound: 0,
        totalTime: 0,
        matchesPerRound: 0
      };
    }

    const playingPerRound = Math.floor(playerCount / 4) * 4;
    const byesPerRound = playerCount - playingPerRound;
    const matchesPerRound = playingPerRound / 4;
    const MATCH_DURATION = 30; // Maç süresi 30 dakika
    const timePerRound = Math.ceil(matchesPerRound / courts) * MATCH_DURATION;
    
    // Eğer turnuva ayarlarında gün ve saha sayısı varsa, ona göre hesapla
    const plannedDays = tournamentSettings.days;
    let optimalRounds;
    
    if (plannedDays && courts) {
      // Gün sayısı ve saha sayısına göre hesaplama
      // Her gün maksimum süre: 90 dakika
      const dailyPlayTime = 90; // dakika
      const roundsPerDay = Math.floor(dailyPlayTime / timePerRound);
      optimalRounds = plannedDays * roundsPerDay;
    } else {
      // Varsayılan hesaplama (eski mantık)
      if (byesPerRound === 0) {
        optimalRounds = Math.max(6, Math.floor(playerCount * 0.75));
      } else {
        optimalRounds = Math.ceil(playerCount * 0.6);
      }
    }
    
    const matchesPerPlayer = Math.floor((optimalRounds * 4) / playerCount);
    const totalTime = optimalRounds * timePerRound;
    
    let description = `${playerCount} oyuncu, ${courts} saha için optimal: ${optimalRounds} tur`;
    if (byesPerRound > 0) {
      description += ` (her turda ${byesPerRound} bay)`;
    }
    if (plannedDays) {
      description += ` | ${plannedDays} gün x ${Math.floor(90 / timePerRound)} tur/gün`;
    }
    
    return { 
      optimalRounds, 
      matchesPerPlayer, 
      description, 
      timePerRound, 
      totalTime,
      matchesPerRound
    };
  }

  function ensureEvenAtLeastEight(): boolean | "auto-add" {
    if (players.length < 8) {
      const availableInPool = playerPool.length;
      const needed = 8 - players.length;
      if (availableInPool >= needed) {
        const confirm = window.confirm(
          `Turnuva başlatmak için en az 8 oyuncu gerekli. Şu an ${players.length} oyuncu var.\n\n` +
          `Havuzdan ${needed} oyuncu daha eklensin mi? (Toplam: ${availableInPool} oyuncu mevcut)`
        );
        if (confirm) {
          return "auto-add";
        }
      } else {
        alert(
          `Turnuva başlatmak için en az 8 oyuncu gerekli.\n\n` +
          `Şu an: ${players.length} oyuncu\n` +
          `Havuzda: ${availableInPool} oyuncu\n` +
          `Eksik: ${needed - availableInPool} oyuncu daha eklemelisiniz.`
        );
      }
      return false;
    }
    if (players.length % 2 !== 0) {
      alert("Oyuncu sayısı çift olmalı (8, 10, 12, ...). Bir oyuncu daha ekleyin veya bir oyuncu çıkarın.");
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
        const matchesA = matchBalance.counts[a] ?? 0;
        const matchesB = matchBalance.counts[b] ?? 0;
        const matchDiff = matchesB - matchesA; // more matches => higher priority for bye
        if (matchDiff !== 0) return matchDiff;

        const byeDiff = (byeCounts[a] ?? 0) - (byeCounts[b] ?? 0);
        if (byeDiff !== 0) return byeDiff;

        // worse rank means later in ranking array; we want those later first => sort by index descending
        const ia = ranking.indexOf(a);
        const ib = ranking.indexOf(b);
        const rc = ib - ia;
        if (rc !== 0) return rc;
        return a.localeCompare(b, "tr");
      });
    return sorted.slice(0, count);
  }

  function handleAddPlayerFromPool(candidate: string) {
    const name = candidate.trim();
    if (!name) return;
    if (players.some((p) => toKey(p) === toKey(name))) {
      alert(`${name} zaten turnuvada.`);
      return;
    }

    const newPlayers = [...players, name];
    const newTotals = { ...totals, [name]: totals[name] ?? 0 };
    const newByeCounts = { ...byeCounts, [name]: byeCounts[name] ?? 0 };
    const newPool = playerPool.filter((p) => toKey(p) !== toKey(name));

    persistTournamentState({
      players: newPlayers,
      totals: newTotals,
      byeCounts: newByeCounts,
      playerPool: newPool
    });
  }

  function handleRemovePlayerFromPool(candidate: string) {
    const name = candidate.trim();
    if (!name) return;
    const newPool = playerPool.filter((p) => toKey(p) !== toKey(name));
    persistTournamentState({ playerPool: newPool });
  }

  function handleAddPlayerToPool() {
    const name = prompt("Havuza eklenecek oyuncu adı");
    if (!name) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (players.some((p) => toKey(p) === toKey(trimmedName))) {
      alert("Bu oyuncu zaten turnuvada. Önce turnuvadan çıkarın.");
      return;
    }
    if (playerPool.some((p) => toKey(p) === toKey(trimmedName))) {
      alert("Bu oyuncu havuzda zaten var.");
      return;
    }

    const newPool = [...playerPool, trimmedName].sort((a, b) => a.localeCompare(b, "tr"));
    persistTournamentState({ playerPool: newPool });
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

  async function startTournament() {
    console.log("startTournament called");
    const validation = ensureEvenAtLeastEight();
    console.log("validation result:", validation);
    if (validation === false) return;
    
    let currentPlayers = [...players];
    let currentPool = [...playerPool];
    
    // Auto-add players from pool if requested
    if (validation === "auto-add") {
      const needed = 8 - currentPlayers.length;
      const toAdd = currentPool.slice(0, needed);
      currentPlayers = [...currentPlayers, ...toAdd];
      currentPool = currentPool.slice(needed);
      
      // Update state immediately
      const newTotals = Object.fromEntries(currentPlayers.map((p) => [p, 0]));
      const newByeCounts = Object.fromEntries(currentPlayers.map((p) => [p, 0]));
      
      await persistTournamentState({
        players: currentPlayers,
        playerPool: currentPool,
        totals: newTotals,
        byeCounts: newByeCounts
      });
    }
    
    const initialTotals = Object.fromEntries(currentPlayers.map((p) => [p, 0]));
    const initialByes = Object.fromEntries(currentPlayers.map((p) => [p, 0]));

    // Round 1: random within playable set (apply byes if needed for N%4==2)
    const ranking0 = currentPlayers.sort((a, b) => {
      const totalDiff = (initialTotals[b] ?? 0) - (initialTotals[a] ?? 0);
      if (totalDiff !== 0) return totalDiff;
      return a.localeCompare(b, "tr");
    });
    const n = currentPlayers.length;
    const byesNeeded = needByesForCount(n);
    let byes: string[] = [];
    if (byesNeeded > 0) {
      byes = pickByes(ranking0, byesNeeded);
    }
    const active = shuffle(currentPlayers.filter((p) => !byes.includes(p)));
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
    await persistTournamentState({
      players: currentPlayers,
      playerPool: currentPool,
      totals: initialTotals,
      byeCounts: initialByes,
      rounds: newRounds
    });
  }

  function addNextRound() {
    if (!ensureEvenAtLeastEight()) return;
    if (rounds.length === 0) {
      alert("Önce ilk turu başlatın.");
      return;
    }

    const lastRound = rounds[rounds.length - 1];
    if (!lastRound?.submitted) {
      alert("Sonraki turu oluşturmadan önce mevcut turdaki tüm maçları tamamlayıp puanları kaydedin.");
      return;
    }
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
    const updatedByeCounts = (() => {
      if (!byes.length) return byeCounts;
      const next = { ...byeCounts } as Record<string, number>;
      byes.forEach((p) => (next[p] = (next[p] ?? 0) + 1));
      return next;
    })();

    persistTournamentState({
      rounds: newRounds,
      byeCounts: updatedByeCounts
    });
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
      
      // Skor değişikliğinde zaman damgası (unsaved)
      m.updatedAt = new Date().toISOString();
      
      copy.matches = [...copy.matches];
      copy.matches[matchIndex] = m;
      return copy;
    });
    
    // Sadece UI state'i güncelle, kaydı beklet (round kaydedilene kadar)
    setRounds(newRounds);
  }

  // Tek bir maçın skorunu anında veritabanına kaydet (round'u kapatmadan)
  function saveMatchScore(roundIndex: number, matchIndex: number) {
    const newRounds = rounds.map((r, i) => {
      if (i !== roundIndex) return r;
      const copy = { ...r };
      const m = { ...copy.matches[matchIndex] };
      // Her iki skor da girilmişse kaydetme zamanı ekle
      if (m.scoreA != null && m.scoreB != null) {
        m.savedAt = new Date().toISOString();
      }
      copy.matches = [...copy.matches];
      copy.matches[matchIndex] = m;
      return copy;
    });
    persistTournamentState({ rounds: newRounds });
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

    const newRounds = [...rounds];
    newRounds[roundIndex] = { ...r, submitted: true };

    persistTournamentState({
      totals: newTotals,
      rounds: newRounds
    });
  }

  function resetTournament() {
    const initialTotals = Object.fromEntries(players.map((p) => [p, 0]));
    const initialByes = Object.fromEntries(players.map((p) => [p, 0]));

    persistTournamentState({
      rounds: [],
      totals: initialTotals,
      byeCounts: initialByes
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">🏸 Mexicano Padel</h1>
              <p className="text-sm text-gray-600 mt-1">
                Adil ve dengeli bir turnuva sistemi. İlk tur rastgele, sonraki turlar sıralamaya göre eşleştirme.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-600">
                <span className="font-medium text-gray-700">
                  {rounds.length > 0 ? `${rounds.length} tur tamamlandı` : "Turnuva başlamadı"}
                </span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <span>{players.length} oyuncu kayıtlı</span>
                {error && (
                  <span className="flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    📱 Offline Mod
                  </span>
                )}
              </div>
            </div>
            {/* Kullanıcı Bilgileri ve Çıkış */}
            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <span className="text-2xl">{isAdmin ? "👤" : "🎾"}</span>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{isAdmin ? "Admin" : "Oyuncu"}</div>
                  <div className="text-sm font-bold text-gray-800">{user.name}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {isAdmin && onBackToDashboard && (
                  <button
                    onClick={onBackToDashboard}
                    className="text-xs px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors font-medium"
                  >
                    🏠 Dashboard
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm("Çıkış yapmak istediğinize emin misiniz?")) {
                      onLogout();
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 text-white rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/70">Aktif Turnuva</span>
                  <div className="space-y-1">
                    {tournamentSettings.name && (
                      <div className="text-2xl md:text-3xl font-black leading-tight break-words">
                        🏆 {tournamentSettings.name}
                      </div>
                    )}
                    <div className={`${tournamentSettings.name ? 'text-lg md:text-xl' : 'text-2xl md:text-4xl'} font-black leading-tight break-words ${tournamentSettings.name ? 'text-white/80' : ''}`}>
                      {tournamentId || "Turnuva ID'si seçilmedi"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-white/80">
                    <div className="flex items-center gap-1">
                      <span>👥</span>
                      <span>{players.length} oyuncu</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🌀</span>
                      <span>{rounds.length} tur</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>⏸️</span>
                      <span>{totalByeAssignments} bay hakkı</span>
                    </div>
                  </div>
                  {/* Tarih/yer alanları kaldırıldı */}
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
                      title="Turnuva tarih ve yer bilgilerini düzenle"
                    >
                      ⚙️ <span>Ayarlar</span>
                    </button>
                  )}
                  <button
                    onClick={handleCopyTournamentId}
                    className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-transparent"
                  >
                    📋 <span>ID'yi Kopyala</span>
                  </button>
                  {copyStatus === "copied" && (
                    <span className="text-xs font-semibold rounded-full bg-emerald-400/25 text-white px-3 py-1">
                      Kopyalandı!
                    </span>
                  )}
                  {copyStatus === "error" && (
                    <span className="text-xs font-semibold rounded-full bg-red-400/30 text-white px-3 py-1">
                      Kopyalanamadı
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Player editor */}
        <section className="bg-white rounded-2xl shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">Oyuncular</h2>
            {!isAdmin && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                👁️ Sadece Görüntüleme
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {players.map((p, idx) => (
              <input
                key={idx}
                value={p}
                aria-label={`Oyuncu ${idx + 1}`}
                placeholder={`Oyuncu ${idx + 1}`}
                disabled={!isAdmin}
                onChange={(e) => {
                  if (!isAdmin) return;
                  const next = [...players];
                  const old = next[idx];
                  const val = e.target.value;
                  next[idx] = val;
                  
                  // Sadece state'i güncelle, Firebase kaydını onChange'de yapma
                  // Çünkü her tuş basımında kaydetmek performans sorunu yaratır
                  setPlayers(next);
                  
                  // Puanları ve bay sayılarını da güncelle
                  const newTotals = { ...totals };
                  newTotals[val] = newTotals[old] ?? 0;
                  if (val !== old && old !== "") delete newTotals[old];
                  setTotals(newTotals);
                  
                  const newByeCounts = { ...byeCounts };
                  newByeCounts[val] = newByeCounts[old] ?? 0;
                  if (val !== old && old !== "") delete newByeCounts[old];
                  setByeCounts(newByeCounts);
                }}
                onBlur={() => {
                  if (!isAdmin) return;
                  persistTournamentState({
                    players,
                    totals,
                    byeCounts
                  });
                }}
                className={`border rounded-xl px-3 py-2 focus:outline-none focus:ring w-full ${
                  !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            ))}
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={() => {
                const name = prompt("Yeni oyuncu adı (oyuncu sayısı çift ve ≥8 olmalı)");
                if (!name || name.trim() === "") return;
                const trimmedName = name.trim();
                
                // Aynı isimde oyuncu var mı kontrol et
                const existsInPlayers = players.some((p) => toKey(p) === toKey(trimmedName));
                if (existsInPlayers) {
                  alert("Bu isimde bir oyuncu zaten var!");
                  return;
                }

                const existsInPool = playerPool.some((p) => toKey(p) === toKey(trimmedName));
                
                // Tüm güncellemeleri tek seferde yap
                const newPlayers = [...players, trimmedName];
                const newTotals = { ...totals, [trimmedName]: 0 };
                const newByeCounts = { ...byeCounts, [trimmedName]: 0 };
                const newPool = existsInPool
                  ? playerPool.filter((p) => toKey(p) !== toKey(trimmedName))
                  : playerPool;
                
                persistTournamentState({
                  players: newPlayers,
                  totals: newTotals,
                  byeCounts: newByeCounts,
                  playerPool: newPool
                });
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
                if (!name || name.trim() === "") return;
                const trimmedName = name.trim();
                const targetPlayer = players.find((p) => toKey(p) === toKey(trimmedName));
                if (!targetPlayer) {
                  alert("Bu isim mevcut değil.");
                  return;
                }
                
                // Tüm güncellemeleri tek seferde yap
                const newPlayers = players.filter((p) => toKey(p) !== toKey(trimmedName));
                const { [targetPlayer]: _, ...newTotals } = totals;
                const { [targetPlayer]: __, ...newByeCounts } = byeCounts;
                const shouldReturnToPool = confirm(`${targetPlayer} havuza geri eklensin mi?`);
                const filteredPool = playerPool.filter((p) => toKey(p) !== toKey(trimmedName));
                const newPool = shouldReturnToPool
                  ? [...filteredPool, targetPlayer].sort((a, b) => a.localeCompare(b, "tr"))
                  : filteredPool;

                persistTournamentState({
                  players: newPlayers,
                  totals: newTotals as Record<string, number>,
                  byeCounts: newByeCounts as Record<string, number>,
                  playerPool: newPool
                });
              }}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
            >
              Oyuncu Sil
            </button>
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">
                🏟️ Saha Sayısı:
                <select
                  value={courtCount}
                  onChange={(e) => setCourtCount(Number(e.target.value))}
                  className="ml-2 border rounded-lg px-2 py-1 text-sm"
                >
                  <option value={1}>1 Saha</option>
                  <option value={2}>2 Saha</option>
                  <option value={3}>3 Saha</option>
                  <option value={4}>4 Saha</option>
                  <option value={5}>5 Saha</option>
                </select>
              </label>
              <div className="text-sm text-gray-600">
                Oyuncu sayısı: {players.length} | Bay: {byesNeededNow}
              </div>
            </div>
            </div>
          )}

          {isAdmin && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-800">Oyuncu Havuzu</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAddPlayerToPool}
                    className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 text-sm hover:bg-blue-200"
                  >
                    + Havuza Oyuncu Ekle
                  </button>
                </div>
              </div>
            <p className="text-xs text-gray-500 mt-1">
              Havuzdaki oyuncuları tek tıkla turnuvaya ekleyebilir veya listeden kaldırabilirsiniz.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {playerPool.length === 0 && (
                <span className="text-sm text-gray-500">Havuz boş. Yeni oyuncular ekleyebilirsiniz.</span>
              )}
              {playerPool.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 shadow-sm border border-gray-200"
                >
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAddPlayerFromPool(name)}
                      className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200"
                    >
                      Oyuna Al
                    </button>
                    <button
                      onClick={() => handleRemovePlayerFromPool(name)}
                      className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg hover:bg-red-200"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Tur Hesaplama Bilgi Paneli */}
          {(() => {
            const calc = calculateOptimalRounds(players.length, courtCount);
            const currentRounds = rounds.length;
            const progress = Math.min(100, (currentRounds / calc.optimalRounds) * 100);
            const remaining = Math.max(0, calc.optimalRounds - currentRounds);
            
            // Gün bazlı planlama bilgileri
            const plannedDays = tournamentSettings.days || null;
            const estimatedRounds = tournamentSettings.estimatedRounds || null;
            const roundsPerDay = 3; // 90 dakika / 30 dakika = 3 tur/gün
            const currentDay = plannedDays ? Math.ceil(currentRounds / roundsPerDay) : null;
            const roundsToday = plannedDays ? (currentRounds % roundsPerDay || roundsPerDay) : null;
            
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  🏆 Turnuva Planlama
                </h3>
                
                {/* Gün Bazlı İlerleme Kartı */}
                {plannedDays && estimatedRounds && currentDay && roundsToday !== null ? (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5">
                    {/* Ana Başlık */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-blue-900">
                          📅 Gün {currentDay}/{plannedDays}
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Tur {currentRounds}/{estimatedRounds} (%{Math.round((currentRounds / estimatedRounds) * 100)})
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">
                          {roundsToday}/{roundsPerDay}
                        </div>
                        <div className="text-xs text-blue-600">
                          Bugün tamamlanan
                        </div>
                      </div>
                    </div>

                    {/* Ana İlerleme Çubuğu */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-blue-700 mb-1">
                        <span>Genel İlerleme</span>
                        <span className="font-semibold">%{Math.round((currentRounds / estimatedRounds) * 100)}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{width: `${Math.min(100, (currentRounds / estimatedRounds) * 100)}%`}}
                        >
                          {currentRounds > 0 && (
                            <span className="text-xs text-white font-semibold">
                              {currentRounds}/{estimatedRounds}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Günlük İlerleme */}
                    <div className="bg-white/70 rounded-lg p-3 mb-3">
                      <div className="flex justify-between text-xs text-blue-700 mb-1">
                        <span>📍 Bugünün İlerlemesi</span>
                        <span className="font-semibold">%{Math.round((roundsToday / roundsPerDay) * 100)}</span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-500"
                          style={{width: `${(roundsToday / roundsPerDay) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        {roundsToday === roundsPerDay 
                          ? "✅ Bugünün turu tamamlandı!" 
                          : `⏳ ${roundsPerDay - roundsToday} tur daha kaldı (90 dk = 3 tur/gün)`}
                      </p>
                    </div>

                    {/* Ek Bilgiler */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/70 rounded-lg p-2.5">
                        <div className="text-blue-600 text-xs">Kalan Gün</div>
                        <div className="text-blue-900 font-bold text-lg">
                          {Math.max(0, plannedDays - currentDay)} gün
                        </div>
                      </div>
                      <div className="bg-white/70 rounded-lg p-2.5">
                        <div className="text-blue-600 text-xs">Kalan Tur</div>
                        <div className="text-blue-900 font-bold text-lg">
                          {Math.max(0, estimatedRounds - currentRounds)} tur
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Planlama Olmadan - Basit Görünüm */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-blue-700">Önerilen Tur</div>
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
                          style={{width: `${Math.round(progress)}%`}}
                        ></div>
                      </div>
                      <div className="text-blue-800 font-medium mt-1">
                        %{Math.round(progress)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-3 text-xs text-blue-600">
                  💡 {calc.matchesPerRound} maç/tur × {courtCount} saha = {calc.timePerRound} dk (maç başına 30dk)
                </div>
              </div>
            );
          })()}

          {isAdmin ? (
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
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-orange-700">
                🔒 Sadece <span className="font-bold">Admin</span> kullanıcılar turnuvayı başlatabilir ve sıfırlayabilir.
              </p>
            </div>
          )}
        </section>

        {/* Rounds */}
        <section className="space-y-6">
          {rounds.map((r, rIdx) => (
            <div key={rIdx} className="bg-white rounded-2xl shadow p-4 mb-6">
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

              <div className="grid md:grid-cols-2 gap-4">
                {(() => {
                  const sorted = r.matches
                    .map((m, idx) => ({ m, idx }))
                    .sort((a, b) => {
                      const ad = a.m.updatedAt || a.m.savedAt || '';
                      const bd = b.m.updatedAt || b.m.savedAt || '';
                      return bd.localeCompare(ad); // yeni üstte
                    });
                  return sorted.map(({ m, idx: mIdx }) => (
                    <div key={mIdx} className="border rounded-2xl p-4 shadow-sm bg-gradient-to-br from-gray-50 to-white">
                      {/* Takımlar */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-gray-700">
                          {m.teamA.join(" & ")} vs {m.teamB.join(" & ")}
                        </div>
                      </div>

                      {/* Skor Girişi */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-xl p-3 border-2 border-blue-200 shadow-sm">
                          <label className="block text-sm font-semibold text-blue-700 mb-2">
                            🔵 Takım A Skoru
                            <span className="block text-xs text-gray-500 font-normal mt-1">İlk 32'ye ulaşan kazanır</span>
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={0}
                            max={32}
                            value={m.scoreA ?? ""}
                            aria-label="A takımı skoru"
                            placeholder="0"
                            disabled={!isAdmin || r.submitted}
                            onChange={(e) => {
                              if (!isAdmin) return;
                              const inputValue = e.target.value;
                              
                              // Boş string ise temizle
                              if (inputValue === "") {
                                updateMatchScore(rIdx, mIdx, { scoreA: undefined });
                                return;
                              }
                              
                              // Sayıya çevir ve kontrol et
                              const numValue = parseInt(inputValue, 10);
                              
                              // Geçersiz değerleri engelle
                              if (isNaN(numValue) || numValue < 0) {
                                return;
                              }
                              
                              // 32'den büyükse 32 yap
                              const value = Math.min(32, numValue);
                              updateMatchScore(rIdx, mIdx, { scoreA: value });
                            }}
                            onKeyDown={(e) => {
                              // Negatif değer girişini engelle
                              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                e.preventDefault();
                              }
                            }}
                            className={`w-full border-2 border-blue-300 rounded-xl px-3 py-3 text-center text-xl font-bold text-blue-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none ${
                              !isAdmin || r.submitted ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          />
                        </div>
                        <div className="bg-white rounded-xl p-3 border-2 border-green-200 shadow-sm">
                          <label className="block text-sm font-semibold text-green-700 mb-2">
                            🟢 Takım B Skoru
                            <span className="block text-xs text-gray-500 font-normal mt-1">İlk 32'ye ulaşan kazanır</span>
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={0}
                            max={32}
                            value={m.scoreB ?? ""}
                            aria-label="B takımı skoru"
                            placeholder="0"
                            disabled={!isAdmin || r.submitted}
                            onChange={(e) => {
                              if (!isAdmin) return;
                              const inputValue = e.target.value;
                              
                              // Boş string ise temizle
                              if (inputValue === "") {
                                updateMatchScore(rIdx, mIdx, { scoreB: undefined });
                                return;
                              }
                              
                              // Sayıya çevir ve kontrol et
                              const numValue = parseInt(inputValue, 10);
                              
                              // Geçersiz değerleri engelle
                              if (isNaN(numValue) || numValue < 0) {
                                return;
                              }
                              
                              // 32'den büyükse 32 yap
                              const value = Math.min(32, numValue);
                              updateMatchScore(rIdx, mIdx, { scoreB: value });
                            }}
                            onKeyDown={(e) => {
                              // Negatif değer girişini engelle
                              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                e.preventDefault();
                              }
                            }}
                            className={`w-full border-2 border-green-300 rounded-xl px-3 py-3 text-center text-xl font-bold text-green-700 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none ${
                              !isAdmin || r.submitted ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Tarih ve Kaydet Alanı */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-gray-500">
                          {m.savedAt || m.updatedAt ? (
                            <span>
                              🕒 Maç tarihi: {new Date(m.savedAt || m.updatedAt!).toLocaleString('tr-TR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">🕒 Henüz skor girilmedi</span>
                          )}
                        </div>
                        {isAdmin && !r.submitted && (
                          <div className="flex items-center gap-2">
                            {m.scoreA != null && m.scoreB != null && (
                              <button
                                onClick={() => saveMatchScore(rIdx, mIdx)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                              >
                                💾 Skoru Kaydet
                              </button>
                            )}
                            {m.scoreA != null && m.scoreB != null && (!m.savedAt || (m.updatedAt && m.savedAt < m.updatedAt)) && (
                              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Kaydedilmedi</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Maç Sonucu Görünümü */}
                      {m.scoreA !== undefined && m.scoreB !== undefined && (m.scoreA > 0 || m.scoreB > 0) && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-l-4 border-yellow-400 shadow-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800 mb-2">
                              {m.scoreA} - {m.scoreB}
                            </div>
                            {m.scoreA === 32 && (
                              <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-bold">
                                🏆 Takım A Kazandı!
                              </div>
                            )}
                            {m.scoreB === 32 && (
                              <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold">
                                🏆 Takım B Kazandı!
                              </div>
                            )}
                            {m.scoreA < 32 && m.scoreB < 32 && (m.scoreA > 0 || m.scoreB > 0) && (
                              <div className="text-gray-600 font-medium">
                                Maç devam ediyor...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {m.perPlayerPoints && (
                        <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
                          <div className="text-sm font-semibold text-gray-700 mb-2">📋 Dağıtılan Puanlar:</div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(m.perPlayerPoints).map(([n, v]) => (
                              <div key={n} className="flex justify-between items-center bg-white rounded-lg px-2 py-1 text-sm">
                                <span className="font-medium text-gray-700">{n}</span>
                                <span className="font-bold text-blue-600">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-3 flex items-center gap-3">
                {isAdmin ? (
                  <>
                    {!r.submitted && (
                      <button
                        onClick={() => submitRound(rIdx)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                      >
                        Turu Kaydet / Puanları Dağıt
                      </button>
                    )}
                    {!r.submitted && rIdx === rounds.length - 1 && (
                      <span className="text-xs text-gray-500">
                        ➡️ Bu turdaki tüm maçları kaydetmeden yeni eşleşmeler oluşturulamaz.
                      </span>
                    )}
                    {r.submitted && rIdx === rounds.length - 1 && (
                      <button
                        onClick={addNextRound}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
                      >
                        Sonraki Turu Oluştur
                      </button>
                    )}
                  </>
                ) : (
                  r.submitted ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                      <span className="text-sm text-green-700">✅ Tur tamamlandı</span>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
                      <span className="text-sm text-orange-700">⏳ Tur henüz kaydedilmedi</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Standings */}
        <section className="bg-white rounded-2xl shadow p-4 mt-6">
          <h2 className="text-xl font-semibold mb-3">Güncel Sıralama</h2>
          {!matchBalance.isBalanced && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              <div className="font-semibold text-amber-800 mb-1">Maç dağılımı henüz dengede değil</div>
              <div>
                En yüksek maç sayısı {matchBalance.max} ({matchBalance.playersNeedingRest.join(" • ")}) ve en düşük {matchBalance.min}
                {matchBalance.playersNeedingPlay.length ? ` (${matchBalance.playersNeedingPlay.join(" • ")})` : ""}.
                Farkı kapatmak için sonraki turda daha az maç yapan oyunculara saha vermeyi unutmayın.
              </div>
            </div>
          )}
          {matchBalance.isBalanced && rounds.some((round) => round.submitted) && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <div className="font-semibold text-emerald-800">Tebrikler! Her oyuncu eşit sayıda maç oynadı.</div>
            </div>
          )}
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
                  const matchesPlayed = matchBalance.counts[p] ?? 0;
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

        {/* Kurallar Bölümü */}
        <section className="bg-white rounded-2xl shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">📋 Oyun Kuralları</h2>
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
        </section>
      </div>

      {/* Turnuva Ayarları Modal */}
      <TournamentSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentSettings={tournamentSettings}
        onSave={(settings) => {
          setTournamentSettings(settings);
          
          // Saha sayısını güncelle
          if (settings.courtCount !== undefined) {
            setCourtCount(settings.courtCount);
            // Firebase'e de kaydet
            persistTournamentState({ courtCount: settings.courtCount });
          }
          
          // localStorage'a kaydet
          const savedSettings = localStorage.getItem(`tournament-settings-${tournamentId}`);
          let currentData = {};
          if (savedSettings) {
            try {
              currentData = JSON.parse(savedSettings);
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
          
          const updatedSettings = {
            ...currentData,
            ...settings,
            updatedAt: new Date().toISOString()
          };
          
          localStorage.setItem(`tournament-settings-${tournamentId}`, JSON.stringify(updatedSettings));
        }}
      />
    </div>
  );
}