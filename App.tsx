import { useMemo, useState, useEffect, useRef } from "react";
import { usePrismaTournament } from "./src/hooks/usePrismaTournament";
import { useAuth } from "./src/hooks/useAuth";
import { LoginForm } from "./src/components/LoginForm";
import { TournamentJoinForm } from "./src/components/TournamentJoinForm";
import { TournamentSettingsModal, TournamentSettings } from "./src/components/TournamentSettingsModal";
import { AdminTournamentDashboard } from "./src/components/AdminTournamentDashboard";
import RulesPage from "./src/pages/RulesPage";
import StandingsPage from "./src/pages/StandingsPage";
import MatchesArchivePage from "./src/pages/MatchesArchivePage";

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
    onLogout={() => {
      // Turnuva ID'sini ve session bilgilerini temizle
      setTournamentId("");
      setShowJoinForm(true);
      setShowAdminDashboard(false);
      logout();
    }}
    isAdmin={isAdmin()}
    onBackToDashboard={() => {
      setTournamentId("");
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
  const [collapsedRounds, setCollapsedRounds] = useState<Record<number, boolean>>({});
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toKey = (value: string) => value.trim().toLocaleLowerCase("tr-TR");
  const [activePage, setActivePage] = useState<'main' | 'rules' | 'standings' | 'archive'>('main');

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

  useEffect(() => {
    if (!tournamentId) return;
    if (!tournamentData?.name) return;

    setTournamentSettings((prev) => {
      const next = { ...prev, name: tournamentData.name } as TournamentSettings;
      return next;
    });

    try {
      const storageKey = `tournament-settings-${tournamentId}`;
      const existingRaw = localStorage.getItem(storageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const merged = {
        ...existing,
        name: tournamentData.name,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch (syncError) {
      console.warn('Turnuva adı localStorage\'a kaydedilemedi:', syncError);
    }
  }, [tournamentData?.name, tournamentId]);

  // Fallback to empty data if no tournamentData but not loading
  const safeData = tournamentData || {
    players: [],
    rounds: [],
    totals: {},
    byeCounts: {},
    courtCount: 2,
    tournamentStarted: false,
    currentRound: 0,
    playerPool: [],
    name: undefined
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
    name?: string;
  };

  const persistTournamentState = async (patch: TournamentStatePatch) => {
    const nextPlayers = patch.players ?? players;
    const nextPlayerPool = patch.playerPool ?? playerPool;
    const nextRounds = patch.rounds ?? rounds;
    const nextTotals = patch.totals ?? totals;
    const nextByeCounts = patch.byeCounts ?? byeCounts;
    const nextCourtCount = patch.courtCount ?? courtCount;
    let nextName = patch.name ?? tournamentSettings?.name;

    if (!nextName && tournamentId) {
      try {
        const storedSettings = localStorage.getItem(`tournament-settings-${tournamentId}`);
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (typeof parsed?.name === 'string' && parsed.name.trim().length > 0) {
            nextName = parsed.name.trim();
          }
        }
      } catch (nameError) {
        console.warn('Turnuva adı okunamadı:', nameError);
      }
    }

    if (patch.players) setPlayers(nextPlayers);
    if (patch.playerPool) setPlayerPool(nextPlayerPool);
    if (patch.rounds) setRounds(nextRounds);
    if (patch.totals) setTotals(nextTotals);
    if (patch.byeCounts) setByeCounts(nextByeCounts);
    if (patch.courtCount !== undefined) setCourtCount(nextCourtCount);

    updateTournament({
      name: nextName,
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
  const byesNeededNow = (4 - (players.length % 4)) % 4;
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

  const winLossStats = useMemo(() => {
    const stats: Record<string, { wins: number; losses: number }> = {};

    players.forEach((player) => {
      stats[player] = { wins: 0, losses: 0 };
    });

    rounds.forEach((round) => {
      if (!round.submitted) return;

      round.matches.forEach((match) => {
        const { winner, teamA, teamB } = match;
        if (winner !== 'A' && winner !== 'B') {
          return;
        }

        teamA.forEach((player) => {
          if (!stats[player]) stats[player] = { wins: 0, losses: 0 };
        });
        teamB.forEach((player) => {
          if (!stats[player]) stats[player] = { wins: 0, losses: 0 };
        });

        if (winner === 'A') {
          teamA.forEach((player) => {
            stats[player].wins += 1;
          });
          teamB.forEach((player) => {
            stats[player].losses += 1;
          });
        } else {
          teamB.forEach((player) => {
            stats[player].wins += 1;
          });
          teamA.forEach((player) => {
            stats[player].losses += 1;
          });
        }
      });
    });

    return stats;
  }, [players, rounds]);

  const matchSummary = useMemo(() => {
    let played = 0;
    let scheduled = 0;
    let pending = 0;
    let submittedRounds = 0;

    rounds.forEach((round) => {
      scheduled += round.matches.length;
      if (round.submitted) {
        submittedRounds += 1;
      }

      round.matches.forEach((match) => {
        const hasScoreA = match.scoreA != null;
        const hasScoreB = match.scoreB != null;
        if (hasScoreA && hasScoreB) {
          played += 1;
        } else {
          pending += 1;
        }
      });
    });

    return {
      played,
      scheduled,
      pending,
      submittedRounds,
      totalRounds: rounds.length,
    };
  }, [rounds]);

  const optimalPlan = useMemo(
    () => calculateOptimalRounds(players.length, courtCount),
    [players.length, courtCount, tournamentSettings.days, tournamentSettings.estimatedRounds]
  );

  const targetRounds = optimalPlan.optimalRounds > 0 ? optimalPlan.optimalRounds : matchSummary.totalRounds;
  const plannedMatchesRaw = optimalPlan.optimalRounds > 0
    ? Math.max(matchSummary.scheduled, Math.round(optimalPlan.matchesPerRound * optimalPlan.optimalRounds))
    : matchSummary.scheduled;
  const plannedMatches = Number.isFinite(plannedMatchesRaw) && plannedMatchesRaw > 0 ? plannedMatchesRaw : matchSummary.scheduled;
  const matchesRemaining = Math.max(plannedMatches - matchSummary.played, 0);
  const progressPercent = plannedMatches > 0
    ? Math.min(100, Math.round((matchSummary.played / plannedMatches) * 100))
    : 0;
  const targetRoundsLabel = targetRounds > 0 ? targetRounds : "–";

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
    court?: number; // Saha numarası
  };

  type Round = {
    number: number;
    matches: Match[];
    rankingSnapshot: string[]; // ranking at the start of the round (best -> worst)
    byes: string[]; // players resting this round
    submitted?: boolean;
    savedAt?: string; // Turun tamamlandığı zaman
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

  const updateScore = (roundNumber: number, matchIndex: number, team: 'A' | 'B', score: number) => {
    const newRounds = [...rounds];
    const round = newRounds.find(r => r.number === roundNumber);
    if (!round) return;

    const match = round.matches[matchIndex];
    if (!match) return;

    // Skorları güncelle
    const otherTeam = team === 'A' ? 'B' : 'A';
    const scoreKey = `score${team}` as 'scoreA' | 'scoreB';
    const otherScoreKey = `score${otherTeam}` as 'scoreA' | 'scoreB';

    let newScore = isNaN(score) ? undefined : Math.max(0, score);
    let otherScore = match[otherScoreKey];

    // Race-to-32 kuralı
    if (newScore !== undefined && newScore >= 32) {
      newScore = 32;
      if (otherScore !== undefined && otherScore >= 32) {
        otherScore = 31; // Rakip 32 veya üstü olamaz
      }
    }

    match[scoreKey] = newScore;
    match[otherScoreKey] = otherScore;
    match.updatedAt = new Date().toISOString();

    // Kazananı belirle
    if (match.scoreA !== undefined && match.scoreB !== undefined) {
      if (match.scoreA === 32 && match.scoreB < 32) {
        match.winner = 'A';
      } else if (match.scoreB === 32 && match.scoreA < 32) {
        match.winner = 'B';
      } else {
        match.winner = undefined; // Geçersiz skor durumu
      }
    } else {
      match.winner = undefined;
    }

    setRounds(newRounds);
    // Değişikliği anında veritabanına yansıtmak yerine, tur tamamlandığında toplu kaydetmek daha verimli.
    // Ancak anlık güncellemeler isteniyorsa buraya persistTournamentState eklenebilir.
    persistTournamentState({ rounds: newRounds });
  };

  const submitScores = async (roundNumber: number) => {
    const round = rounds.find((r) => r.number === roundNumber);
    if (!round) return;

    // 1. Tüm maçların skorlarının geçerli olduğunu doğrula
    for (const match of round.matches) {
      const { scoreA, scoreB } = match;
      const isValid =
        (scoreA === 32 && scoreB! < 32) || (scoreB === 32 && scoreA! < 32);
      if (!isValid) {
        alert(`Geçersiz skor bulundu: ${match.teamA.join(" & ")} (${scoreA}) vs ${match.teamB.join(" & ")} (${scoreB}). Bir takım 32, diğeri 31 veya daha az olmalı.`);
        return;
      }
    }

    // 2. Puanları hesapla ve state'i güncelle
    const nextTotals = { ...totals };

    round.matches.forEach((match) => {
      const { teamA, teamB, scoreA, scoreB } = match;
      
      // Puanları oyunculara dağıt
      [...teamA, ...teamB].forEach(player => {
        if (!nextTotals[player]) nextTotals[player] = 0;
      });

      // Puanları takımlara göre ekle
      teamA.forEach(player => nextTotals[player] += scoreA!);
      teamB.forEach(player => nextTotals[player] += scoreB!);

      // Maç başına puanları kaydet (opsiyonel, analiz için)
      match.perPlayerPoints = {};
      teamA.forEach(p => match.perPlayerPoints![p] = scoreA!);
      teamB.forEach(p => match.perPlayerPoints![p] = scoreB!);
      match.savedAt = new Date().toISOString();
    });

    // 3. Turu "tamamlandı" olarak işaretle
    round.submitted = true;
    round.savedAt = new Date().toISOString();

    // 4. Bay geçen oyuncuların sayısını güncelle
    const nextByeCounts = { ...byeCounts };
    round.byes.forEach((player) => {
      if (!nextByeCounts[player]) nextByeCounts[player]++;
    });

    // 5. Yeni sıralamayı hesapla
    const nextRanking = [...players].sort((a, b) => {
      const totalDiff = (nextTotals[b] ?? 0) - (nextTotals[a] ?? 0);
      if (totalDiff !== 0) return totalDiff;
      // Averaj ve alfabetik sıralama için mevcut `calculateAverage` kullanılabilir,
      // ancak `nextTotals` ile tutarlı olması için anlık hesaplama daha doğru olabilir.
      return a.localeCompare(b, "tr");
    });

    // 6. Yeni turu oluştur
    const n = players.length;
    const byesNeeded = needByesForCount(n);
    const byes = pickByes(nextRanking, byesNeeded);
    const active = nextRanking.filter((p) => !byes.includes(p));

    const matches: Match[] = [];
    const playersToPair = [...active];
    let courtCounter = 1;
    while (playersToPair.length >= 4) {
      const teamA: [string, string] = [playersToPair.shift()!, playersToPair.pop()!];
      const teamB: [string, string] = [playersToPair.shift()!, playersToPair.pop()!];
      matches.push({ teamA, teamB, court: courtCounter });
      courtCounter = (courtCounter % courtCount) + 1;
    }

    const newRound: Round = {
      number: round.number + 1,
      matches,
      rankingSnapshot: nextRanking,
      byes,
    };

    const nextRounds = [...rounds, newRound];

    // 7. Tüm state'i tek seferde kaydet
    await persistTournamentState({
      rounds: nextRounds,
      totals: nextTotals,
      byeCounts: nextByeCounts,
    });
  };

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
    for (let i = 0; teams.length > 1 && i < teams.length; i += 2) {
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

  function clearLocalStorage() {
    if (window.confirm('Tüm verileri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      localStorage.removeItem('padelTournamentState');
      window.location.reload();
    }
  }

  const toggleRoundCollapse = (roundNumber: number) => {
    setCollapsedRounds(prev => ({
      ...prev,
      [roundNumber]: !prev[roundNumber]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900">🏸 Mexicano Padel</h1>
              <p className="text-xs md:text-sm text-gray-600 mt-1 max-w-xl">
                Adil ve dengeli turnuva: ilk tur rastgele, sonraki turlar sıralamaya göre eşleşir.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs sm:text-sm text-gray-600">
                <span className="font-medium text-gray-700">
                  {rounds.length > 0 ? `${rounds.length} tur tamamlandı` : "Turnuva başlamadı"}
                </span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <span>{players.length} oyuncu kayıtlı</span>
                <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  💾 Yerel Mod
                </span>
              </div>
            </div>
            <div className="flex flex-row sm:flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-end gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{isAdmin ? "👤" : "🎾"}</span>
                  <div className="text-left sm:text-right text-xs">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">{isAdmin ? "Admin" : "Oyuncu"}</div>
                    <div className="text-sm font-bold text-gray-800 truncate max-w-[120px] sm:max-w-[150px]">{user.name}</div>
                  </div>
                </div>
                <div className="flex sm:hidden gap-2">
                  {isAdmin && onBackToDashboard && (
                    <button
                      onClick={onBackToDashboard}
                      className="text-[11px] px-2 py-1 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors font-medium whitespace-nowrap"
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
                    className="text-[11px] px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium whitespace-nowrap"
                  >
                    Çıkış
                  </button>
                </div>
              </div>
              <div className="hidden sm:flex gap-2">
                {isAdmin && onBackToDashboard && (
                  <button
                    onClick={onBackToDashboard}
                    className="text-xs px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors font-medium whitespace-nowrap"
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
                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium whitespace-nowrap"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 text-white rounded-2xl p-4 sm:p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-6">
                <div className="space-y-3 flex-1 min-w-0">
                  <span className="inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-[0.22em] text-white/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70" aria-hidden="true"></span>
                    Aktif Turnuva
                  </span>
                  <div className="space-y-2">
                    {tournamentSettings.name && (
                      <div className="text-lg sm:text-xl md:text-3xl font-black leading-tight break-words">
                        🏆 {tournamentSettings.name}
                      </div>
                    )}
                    <div className={`${tournamentSettings.name ? 'text-sm sm:text-base md:text-xl' : 'text-lg sm:text-xl md:text-4xl'} font-black leading-tight break-words ${tournamentSettings.name ? 'text-white/85' : ''}`}>
                      {tournamentId || "Turnuva ID'si seçilmedi"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-white">
                    <div className="bg-white/10 rounded-lg px-2 py-2">
                      <div className="flex items-center gap-1.5 text-sm sm:text-base font-semibold">
                        <span>👥</span>
                        <span>{players.length}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide mt-0.5">Katılımcı</div>
                    </div>
                    <div className="bg-white/10 rounded-lg px-2 py-2">
                      <div className="flex items-center gap-1.5 text-sm sm:text-base font-semibold">
                        <span>🌀</span>
                        <span>{matchSummary.submittedRounds}/{targetRoundsLabel}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide mt-0.5">Tamamlanan Tur</div>
                    </div>
                    <div className="bg-white/10 rounded-lg px-2 py-2">
                      <div className="flex items-center gap-1.5 text-sm sm:text-base font-semibold">
                        <span>✅</span>
                        <span>{matchSummary.played}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide mt-0.5">Oynanan Maç</div>
                    </div>
                    <div className="bg-white/10 rounded-lg px-2 py-2">
                      <div className="flex items-center gap-1.5 text-sm sm:text-base font-semibold">
                        <span>⏳</span>
                        <span>{matchesRemaining}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide mt-0.5">Kalan Maç</div>
                      <div className="text-[10px] text-white/60 mt-0.5">
                        {matchSummary.pending > 0 ? `${matchSummary.pending} skor bekliyor` : 'Tümü işlendi'}
                      </div>
                    </div>
                  </div>
                  {(tournamentSettings.courtCount ?? courtCount) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/70">
                      <div className="bg-white/5 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                        <span>⏸️</span>
                        <span className="font-medium text-white/85">{totalByeAssignments} bay</span>
                      </div>
                      <div className="bg-white/5 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                        <span>🏟️</span>
                        <span className="font-medium text-white/85">{tournamentSettings.courtCount ?? courtCount} saha</span>
                      </div>
                    </div>
                  )}
                  {plannedMatches > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] sm:text-xs text-white/70">
                        <span>İlerleme</span>
                        <span>%{progressPercent}</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-white/90 transition-all" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                      {optimalPlan.matchesPerRound > 0 && optimalPlan.timePerRound > 0 && (
                        <div className="text-[10px] sm:text-xs text-white/65 mt-1">
                          ~{optimalPlan.matchesPerRound} maç/tur • ≈{optimalPlan.timePerRound} dk/tur
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {isAdmin && (
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex justify-center items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-xs md:text-sm font-semibold transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 w-full sm:w-auto"
                      title="Turnuva ayarlarını düzenle"
                    >
                      ⚙️ <span>Ayarlar</span>
                    </button>
                  )}
                  <button
                    onClick={handleCopyTournamentId}
                    className="flex justify-center items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-xs md:text-sm font-semibold transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-transparent w-full sm:w-auto"
                  >
                    📋 <span>ID</span>
                  </button>
                  {copyStatus === "copied" && (
                    <span className="text-[10px] font-semibold rounded-full bg-emerald-400/25 text-white px-2 py-1 text-center">
                      Kopyalandı
                    </span>
                  )}
                  {copyStatus === "error" && (
                    <span className="text-[10px] font-semibold rounded-full bg-red-400/30 text-white px-2 py-1 text-center">
                      Kopyalanamadı
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Üstte butonlar */}
        <div className="flex flex-wrap gap-2 mb-6 text-xs sm:text-sm">
          <button onClick={() => setActivePage('rules')} className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 whitespace-nowrap">Kurallar</button>
          <button onClick={() => setActivePage('standings')} className="px-3 py-2 rounded-xl bg-green-100 text-green-700 font-semibold hover:bg-green-200 whitespace-nowrap">Sıralama</button>
          <button onClick={() => setActivePage('archive')} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 whitespace-nowrap">Maç Arşivi</button>
          {activePage !== 'main' && (
            <button onClick={() => setActivePage('main')} className="px-3 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200 whitespace-nowrap">Ana Sayfa</button>
          )}
        </div>

        {activePage === 'rules' && <RulesPage />}
        {activePage === 'standings' && (
          <StandingsPage
            ranking={ranking}
            totals={totals}
            matchBalance={matchBalance}
            byeCounts={byeCounts}
            calculateAverage={calculateAverage}
            winLossStats={winLossStats}
          />
        )}
        {activePage === 'archive' && (
          <MatchesArchivePage rounds={rounds} />
        )}
        {activePage === 'main' && (
          <>
            <section className="space-y-6">
              {rounds.length > 0 && (() => {
                const lastRound = rounds[rounds.length - 1];
                const unplayedMatches = lastRound.matches.filter(m => m.scoreA === undefined || m.scoreB === undefined);
                const playedMatches = lastRound.matches.filter(m => m.scoreA !== undefined && m.scoreB !== undefined);

                return (
                  <div className="bg-white rounded-2xl shadow p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          Son Tur <span className="text-base font-medium text-gray-500">(Tur {lastRound.number})</span>
                        </h3>
                        {lastRound.submitted && (
                          <div className="mt-1 text-xs font-medium text-white bg-green-500 px-2 py-1 rounded-full inline-block">
                            ✓ Tur Tamamlandı ({new Date(lastRound.savedAt!).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})
                          </div>
                        )}
                      </div>
                      {isAdmin && !lastRound.submitted && (
                        <button
                          onClick={() => submitScores(lastRound.number)}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 shadow-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                          disabled={unplayedMatches.length > 0}
                          title={unplayedMatches.length > 0 ? "Tüm maçların skoru girilmeden tur tamamlanamaz" : "Skorları onayla ve yeni turu oluştur"}
                        >
                          Turu Tamamla
                        </button>
                      )}
                    </div>

                    {/* Maç Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Oynanmamış Maçlar */}
                      {unplayedMatches.map((m) => {
                        const originalMatchIndex = lastRound.matches.findIndex(match => match === m);
                        return (
                          <div key={originalMatchIndex} className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-gray-700">Saha {m.court || originalMatchIndex % courtCount + 1}</h4>
                              {m.updatedAt && (
                                <span className="text-xs text-gray-400">
                                  {new Date(m.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-xs">{m.teamA.join(' & ')}</span>
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    defaultValue={m.scoreA ?? ''}
                                    onBlur={(e) => updateScore(lastRound.number, originalMatchIndex, 'A', parseInt(e.target.value))}
                                    className="w-16 text-center border rounded-md px-2 py-1 bg-white"
                                    disabled={lastRound.submitted}
                                    title={lastRound.submitted ? "Tur tamamlanmış - düzenleme kapalı" : "Skor girin"}
                                    placeholder="0-32"
                                  />
                                ) : (
                                  <span className="w-16 text-center font-bold">{m.scoreA ?? '-'}</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs">{m.teamB.join(' & ')}</span>
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    defaultValue={m.scoreB ?? ''}
                                    onBlur={(e) => updateScore(lastRound.number, originalMatchIndex, 'B', parseInt(e.target.value))}
                                    className="w-16 text-center border rounded-md px-2 py-1 bg-white"
                                    disabled={lastRound.submitted}
                                    title={lastRound.submitted ? "Tur tamamlanmış - düzenleme kapalı" : "Skor girin"}
                                    placeholder="0-32"
                                  />
                                ) : (
                                  <span className="w-16 text-center font-bold">{m.scoreB ?? '-'}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Oynanmış Maçlar */}
                      {playedMatches.map((m) => {
                        const originalMatchIndex = lastRound.matches.findIndex(match => match === m);
                        const isWinnerA = m.scoreA! > m.scoreB!;
                        return (
                          <div key={originalMatchIndex} className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-emerald-800">Saha {m.court || originalMatchIndex % courtCount + 1}</h4>
                              {m.savedAt && (
                                <span className="text-xs text-gray-500">
                                  {new Date(m.savedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${isWinnerA ? 'font-bold text-emerald-900' : 'text-gray-600'}`}>{m.teamA.join(' & ')}</span>
                                <span className={`font-bold ${isWinnerA ? 'text-emerald-900' : 'text-gray-600'}`}>{m.scoreA}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${!isWinnerA ? 'font-bold text-emerald-900' : 'text-gray-600'}`}>{m.teamB.join(' & ')}</span>
                                <span className={`font-bold ${!isWinnerA ? 'text-emerald-900' : 'text-gray-600'}`}>{m.scoreB}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Bay Geçenler */}
                    {lastRound.byes.length > 0 && (
                      <div className="mt-5 border-t pt-4">
                        <h4 className="font-semibold text-gray-600 mb-2">Bay Geçenler</h4>
                        <div className="flex flex-wrap gap-2">
                          {lastRound.byes.map(p => (
                            <span key={p} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Oynanmamış maçlar (son tur harici) */}
              {rounds.slice(0, -1).map((round) => {
                const unplayedMatches = round.matches.filter(m => m.scoreA === undefined || m.scoreB === undefined);
                if (unplayedMatches.length === 0) return null;
                
                return (
                  <div key={round.number} className="bg-white rounded-2xl shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold text-amber-800 mb-3">
                      Tur {round.number} - Oynanmamış Maçlar
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {unplayedMatches.map((m) => {
                        const originalMatchIndex = round.matches.findIndex(match => match === m);
                        return (
                          <div key={originalMatchIndex} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h4 className="font-semibold text-gray-700 mb-2">Saha {m.court || originalMatchIndex % courtCount + 1}</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-xs">{m.teamA.join(' & ')}</span>
                                <span className="font-mono text-gray-500">[skor girilmedi]</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs">{m.teamB.join(' & ')}</span>
                                <span className="font-mono text-gray-500">[skor girilmedi]</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Önceki tamamlanmış turlar: collapse/accordion */}
              <div className="space-y-2">
                {[...rounds].slice(0, -1).reverse().map((round) => {
                  const allPlayed = round.matches.every(m => m.scoreA !== undefined && m.scoreB !== undefined);
                  if (!allPlayed) return null;
                  
                  const matchDates = round.matches.map(m => m.savedAt).filter(Boolean).sort((a, b) => (b || '').localeCompare(a || ''));
                  const latestMatchDate = matchDates[0];
                  const isCollapsed = collapsedRounds[round.number] ?? true;

                  return (
                    <div key={round.number} className="bg-white rounded-2xl shadow-sm border">
                      <button
                        onClick={() => toggleRoundCollapse(round.number)}
                        className="w-full text-left p-4 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`transform transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <span className="font-semibold text-gray-800">
                            Tur {round.number}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({round.matches.length} maç)
                          </span>
                          {round.submitted && latestMatchDate && (
                            <span className="hidden sm:inline-block text-xs font-medium text-white bg-green-500 px-2 py-1 rounded-full">
                              ✓ {new Date(latestMatchDate).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-blue-600">
                          {isCollapsed ? 'Detayları Gör' : 'Gizle'}
                        </span>
                      </button>
                      
                      {!isCollapsed && (
                        <div className="p-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {round.matches.map((m, idx) => {
                              const isWinnerA = m.scoreA! > m.scoreB!;
                              return (
                                <div key={idx} className="bg-gray-50 rounded-lg p-3 border">
                                  <h5 className="font-semibold text-sm text-gray-600 mb-2">Saha {m.court || idx % courtCount + 1}</h5>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className={isWinnerA ? 'font-bold' : ''}>{m.teamA.join(' & ')}</span>
                                      <span className={isWinnerA ? 'font-bold' : ''}>{m.scoreA}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className={!isWinnerA ? 'font-bold' : ''}>{m.teamB.join(' & ')}</span>
                                      <span className={!isWinnerA ? 'font-bold' : ''}>{m.scoreB}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {round.byes.length > 0 && (
                            <div className="mt-4 pt-3 border-t">
                              <h5 className="font-semibold text-sm text-gray-600 mb-2">Bay Geçenler</h5>
                              <div className="flex flex-wrap gap-2">
                                {round.byes.map(p => (
                                  <span key={p} className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-md">{p}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

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
                  {[...Array(10).keys()].map(i => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
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
                  <span className="text-sm font-medium text-gray-800">{name}</span>
                  <button
                    onClick={() => handleAddPlayerFromPool(name)}
                    className="text-xs bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center hover:bg-green-300"
                    title={`${name} turnuvaya ekle`}
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleRemovePlayerFromPool(name)}
                    className="text-xs bg-red-200 text-red-800 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-300"
                    title={`${name} havuzdan sil`}
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
            </div>
          )}

          {isAdmin ? (
            <div className="mt-6 text-center">
              <button
                onClick={startTournament}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Turnuvayı Başlat (Tur 1 Rastgele)
              </button>
              {rounds.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">Turnuva zaten başladı.</p>
              )}
            </div>
          ) : (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">
                Tur oluşturma ve skor girişi sadece yönetici tarafından yapılabilir.
              </p>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Yönetici Paneli</h2>
            <button onClick={clearLocalStorage} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm">
              Turnuvayı Sıfırla
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Oyuncu Ekleme */}
            <div>
              {/* ... */}
            </div>
          </div>
        </section>

        {/* Standings */}
        <section className="bg-white rounded-2xl shadow p-4 mt-6">
          <h2 className="text-xl font-semibold mb-3">Güncel Sıralama</h2>
          <StandingsPage
            ranking={ranking}
            totals={totals}
            matchBalance={matchBalance}
            byeCounts={byeCounts}
            calculateAverage={calculateAverage}
            winLossStats={winLossStats}
          />
        </section>
      </div>

      {/* Turnuva Ayarları Modal */}
      <TournamentSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentSettings={tournamentSettings}
        onSave={(settings: TournamentSettings) => {
          setTournamentSettings(settings);
          
          // Saha sayısını güncelle
          if (settings.courtCount !== undefined) {
            setCourtCount(settings.courtCount);
            // Firebase'e de kaydet
            persistTournamentState({ courtCount: settings.courtCount, name: settings.name });
          }
          
          // localStorage'a kaydet
          const storageKey = `tournament-settings-${tournamentId}`;
          let currentData: Record<string, any> = {};
          try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
              currentData = JSON.parse(savedData);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
          
          const updatedSettings = {
            ...currentData,
            ...settings,
            updatedAt: new Date().toISOString()
          };
          
          localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
        }}
      />
    </div>
  );
}