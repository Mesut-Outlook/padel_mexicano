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

// API base URL - development için localhost, production için gerçek URL
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : '';

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

  const loadTournamentFromAPI = useCallback(async (tournamentId: string): Promise<TournamentData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('API error:', err);
      throw err;
    }
  }, []);

  const loadTournamentData = useCallback(async () => {
    if (!tournamentId) {
      setData(getDefaultTournamentData());
      setLoading(false);
      return;
    }

    const storageKey = getTournamentStorageKey(tournamentId);
    const savedDataRaw = localStorage.getItem(storageKey);
    let hasInitialData = false;

    if (savedDataRaw) {
      try {
        const savedData = JSON.parse(savedDataRaw);
        setData(normalizeTournamentData(savedData));
        setLoading(false);
        hasInitialData = true;
      } catch (parseError) {
        console.warn('Yerel turnuva verisi çözümlenemedi, varsayılan değer kullanılacak.', parseError);
      }
    }

    if (!hasInitialData) {
      const defaultData = getDefaultTournamentData();
      setData(defaultData);
      setLoading(false);
      localStorage.setItem(storageKey, JSON.stringify(defaultData));
    }

    // Try to load from API
    try {
      const apiData = await loadTournamentFromAPI(tournamentId);
      if (apiData) {
        setData(apiData);
        setError(null);
        localStorage.setItem(storageKey, JSON.stringify(apiData));
      }
    } catch (err) {
      console.error('API connection error:', err);
      setError('Veritabanına bağlanılamadı. Yerel veri kullanılacak.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, getDefaultTournamentData, getTournamentStorageKey, normalizeTournamentData, loadTournamentFromAPI]);

  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  const updateTournament = useCallback(async (newData: TournamentData) => {
    const storageKey = getTournamentStorageKey(tournamentId);

    try {
      // Update API
      const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state and storage
      localStorage.setItem(storageKey, JSON.stringify(newData));
      setData(newData);
      setError(null);
    } catch (err) {
      console.error('Turnuva güncellenemedi:', err);
      setError('Turnuva güncellenemedi. İnternet bağlantınızı kontrol edin.');

      // Still update local state and storage as fallback
      setData(newData);
      localStorage.setItem(storageKey, JSON.stringify(newData));
    }
  }, [getTournamentStorageKey, tournamentId]);

  const deleteTournament = useCallback(async () => {
    const storageKey = getTournamentStorageKey(tournamentId);

    try {
      await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Turnuva silinemedi:', err);
    }

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