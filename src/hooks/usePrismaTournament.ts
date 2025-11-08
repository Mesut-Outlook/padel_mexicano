import { useCallback, useEffect, useState } from 'react';

const DEFAULT_PLAYER_POOL = [
  'Mesut',
  'Mumtaz',
  'Berk',
  'Erdem',
  'Hulusi',
  'Emre',
  'Ahmet',
  'Batuhan',
  'Sercan',
  'Okan',
  'Deniz',
  'Sezgin'
];

export interface Match {
  teamA: [string, string];
  teamB: [string, string];
  scoreA?: number;
  scoreB?: number;
  winner?: "A" | "B";
  perPlayerPoints?: Record<string, number>;
}

export interface Round {
  number: number;
  matches: Match[];
  rankingSnapshot: string[];
  byes: string[];
  submitted?: boolean;
}

export interface TournamentData {
  players: string[];
  rounds: Round[];
  totals: Record<string, number>;
  byeCounts: Record<string, number>;
  courtCount?: number; // Saha sayısı
  tournamentStarted: boolean;
  currentRound: number;
  playerPool: string[];
}

// LocalStorage-only mode - sunucu bağlantısı devre dışı
const USE_LOCAL_STORAGE_ONLY = true;

export function usePrismaTournament(tournamentId: string) {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getTournamentStorageKey = useCallback((id: string) => `mexicano-tournament-${id}`, []);

  const getDefaultTournamentData = useCallback((): TournamentData => ({
    players: [],
    rounds: [],
    totals: {},
    byeCounts: {},
    courtCount: 2,
    tournamentStarted: false,
    currentRound: 0,
    playerPool: [...DEFAULT_PLAYER_POOL]
  }), []);

  const normalizeTournamentData = useCallback((raw: Partial<TournamentData> | null | undefined): TournamentData => {
    const sanitizedPlayers = Array.isArray(raw?.players)
      ? raw!.players.filter((name): name is string => typeof name === 'string' && name.trim().length > 0).map((name) => name.trim())
      : [];

    const initialPool = Array.isArray(raw?.playerPool) && raw?.playerPool?.length
      ? raw.playerPool
      : DEFAULT_PLAYER_POOL;

    const sanitizedPool = Array.from(
      new Set(
        initialPool
          .filter((name): name is string => typeof name === 'string')
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && !sanitizedPlayers.includes(name))
      )
    );

    return {
      players: sanitizedPlayers,
      rounds: Array.isArray(raw?.rounds) ? raw!.rounds : [],
      totals: raw?.totals ?? {},
      byeCounts: raw?.byeCounts ?? {},
      courtCount: raw?.courtCount ?? 2,
      tournamentStarted: raw?.tournamentStarted ?? false,
      currentRound: raw?.currentRound ?? 0,
      playerPool: sanitizedPool
    };
  }, []);

  // API fonksiyonu kaldırıldı - sadece localStorage kullanılıyor

  const loadTournamentData = useCallback(async () => {
    if (!tournamentId) {
      setData(getDefaultTournamentData());
      setLoading(false);
      return;
    }

    const storageKey = getTournamentStorageKey(tournamentId);
    const savedDataRaw = localStorage.getItem(storageKey);

    if (savedDataRaw) {
      try {
        const savedData = JSON.parse(savedDataRaw);
        setData(normalizeTournamentData(savedData));
        setLoading(false);
        setError(null);
      } catch (parseError) {
        console.warn('Yerel turnuva verisi çözümlenemedi, varsayılan değer kullanılacak.', parseError);
        const defaultData = getDefaultTournamentData();
        setData(defaultData);
        setLoading(false);
        localStorage.setItem(storageKey, JSON.stringify(defaultData));
      }
    } else {
      // Veri yoksa varsayılan değer oluştur
      const defaultData = getDefaultTournamentData();
      setData(defaultData);
      setLoading(false);
      localStorage.setItem(storageKey, JSON.stringify(defaultData));
    }

    // API kullanımı devre dışı - sadece localStorage
    if (USE_LOCAL_STORAGE_ONLY) {
      // API çağrısı yok, offline modda çalışıyoruz
      console.info('LocalStorage-only mode: API bağlantısı devre dışı');
    }
  }, [tournamentId, getDefaultTournamentData, getTournamentStorageKey, normalizeTournamentData]);

  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  const updateTournament = useCallback(async (newData: TournamentData) => {
    const storageKey = getTournamentStorageKey(tournamentId);

    // Sadece localStorage kullan - API devre dışı
    try {
      localStorage.setItem(storageKey, JSON.stringify(newData));
      setData(newData);
      setError(null);
    } catch (err) {
      console.error('Turnuva kaydedilemedi:', err);
      setError('Turnuva localStorage\'a kaydedilemedi.');
      setData(newData);
    }
  }, [getTournamentStorageKey, tournamentId]);

  const deleteTournament = useCallback(async () => {
    const storageKey = getTournamentStorageKey(tournamentId);

    // Sadece localStorage'dan sil - API devre dışı
    localStorage.removeItem(storageKey);
    setData(getDefaultTournamentData());
  }, [getTournamentStorageKey, tournamentId, getDefaultTournamentData]);

  const refreshTournament = useCallback(async () => {
    setLoading(true);
    await loadTournamentData();
  }, [loadTournamentData]);

  return {
    data,
    loading,
    error,
    updateTournament,
    deleteTournament,
    refreshTournament
  };
}