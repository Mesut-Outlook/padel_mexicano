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
  name?: string;
}

// LocalStorage-only mode - sunucu bağlantısı devre dışı
const USE_LOCAL_STORAGE_ONLY = false;

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
    playerPool: [...DEFAULT_PLAYER_POOL],
    name: undefined
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

    const name = typeof raw?.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : undefined;

    return {
      players: sanitizedPlayers,
      rounds: Array.isArray(raw?.rounds) ? raw!.rounds : [],
      totals: raw?.totals ?? {},
      byeCounts: raw?.byeCounts ?? {},
      courtCount: raw?.courtCount ?? 2,
      tournamentStarted: raw?.tournamentStarted ?? false,
      currentRound: raw?.currentRound ?? 0,
      playerPool: sanitizedPool,
      name
    };
  }, []);

  const fetchTournamentFromApi = useCallback(async (id: string): Promise<TournamentData | null> => {
    try {
      const response = await fetch(`/api/tournaments/${id}`);
      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status}`);
      }

      const payload = await response.json();
      if (!payload) return null;

      return normalizeTournamentData(payload);
    } catch (apiError) {
      console.warn('Turnuva API isteği başarısız oldu, localStorage verisi kullanılacak:', apiError);
      return null;
    }
  }, [normalizeTournamentData]);

  const saveTournamentToApi = useCallback(async (id: string, payload: TournamentData) => {
    try {
      const response = await fetch(`/api/tournaments/${id}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API kaydetme hatası: ${response.status}`);
      }
    } catch (apiError) {
      console.error('Turnuva API kaydı başarısız oldu:', apiError);
      // Kullanıcıyı offline bırakmak için hatayı set et ama local state güncellensin
      setError('Turnuva verisi sunucuya kaydedilemedi. İnternet bağlantınızı kontrol edin.');
    }
  }, []);

  const deleteTournamentFromApi = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`API silme hatası: ${response.status}`);
      }
    } catch (apiError) {
      console.error('Turnuva API silme isteği başarısız oldu:', apiError);
    }
  }, []);

  const loadTournamentData = useCallback(async () => {
    if (!tournamentId) {
      setData(getDefaultTournamentData());
      setLoading(false);
      return;
    }

    const storageKey = getTournamentStorageKey(tournamentId);

    if (!USE_LOCAL_STORAGE_ONLY) {
      const apiData = await fetchTournamentFromApi(tournamentId);
      if (apiData) {
        setData(apiData);
        setLoading(false);
        setError(null);
        localStorage.setItem(storageKey, JSON.stringify(apiData));
        return;
      }
    }

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

    try {
      localStorage.setItem(storageKey, JSON.stringify(newData));
      setData(newData);
      setError(null);
    } catch (err) {
      console.error('Turnuva kaydedilemedi:', err);
      setError('Turnuva localStorage\'a kaydedilemedi.');
      setData(newData);
    }

    if (!USE_LOCAL_STORAGE_ONLY) {
      await saveTournamentToApi(tournamentId, newData);
    }
  }, [getTournamentStorageKey, tournamentId, saveTournamentToApi]);

  const deleteTournament = useCallback(async () => {
    const storageKey = getTournamentStorageKey(tournamentId);

    localStorage.removeItem(storageKey);
    setData(getDefaultTournamentData());

    if (!USE_LOCAL_STORAGE_ONLY) {
      await deleteTournamentFromApi(tournamentId);
    }
  }, [getTournamentStorageKey, tournamentId, getDefaultTournamentData, deleteTournamentFromApi]);

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