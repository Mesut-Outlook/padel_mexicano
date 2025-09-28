import { useCallback, useEffect, useMemo, useState } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from '../firebase';

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

export function useFirebaseTournament(tournamentId: string) {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getTournamentStorageKey = useCallback((id: string) => `mexicano-tournament-${id}`, []);
  const tournamentRef = useMemo(() => ref(database, `tournaments/${tournamentId}`), [tournamentId]);

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

  useEffect(() => {
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
      } catch (parseError) {
        console.warn('Yerel turnuva verisi çözümlenemedi, varsayılan değer kullanılacak.', parseError);
        setData(getDefaultTournamentData());
      }
    }

    setLoading(true);
    const unsubscribe = onValue(tournamentRef, (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = normalizeTournamentData(snapshot.val());
        setData(remoteData);
        setError(null);
        localStorage.setItem(storageKey, JSON.stringify(remoteData));
      } else {
        const defaultData = getDefaultTournamentData();
        setData(defaultData);
        localStorage.setItem(storageKey, JSON.stringify(defaultData));
      }
      setLoading(false);
    }, (err) => {
      console.error('Firebase turnuva verisine erişilemedi:', err);
      setError('Turnuva verisine ulaşılamadı. Yerel veri kullanılacak.');
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [tournamentId, tournamentRef, getDefaultTournamentData, getTournamentStorageKey, normalizeTournamentData]);

  const updateTournament = useCallback(async (newData: TournamentData) => {
    const storageKey = getTournamentStorageKey(tournamentId);
    try {
      await set(tournamentRef, newData);
      localStorage.setItem(storageKey, JSON.stringify(newData));
      setData(newData);
      setError(null);
    } catch (err) {
      console.error('Turnuva güncellenemedi:', err);
      setError('Turnuva güncellenemedi. İnternet bağlantınızı kontrol edin.');
      setData(newData);
      localStorage.setItem(storageKey, JSON.stringify(newData));
    }
  }, [getTournamentStorageKey, tournamentId, tournamentRef]);

  const deleteTournament = useCallback(async () => {
    const storageKey = getTournamentStorageKey(tournamentId);
    try {
      await remove(tournamentRef);
    } catch (err) {
      console.error('Turnuva silinemedi:', err);
    }
    localStorage.removeItem(storageKey);
    setData(getDefaultTournamentData());
  }, [getTournamentStorageKey, tournamentId, tournamentRef, getDefaultTournamentData]);

  return {
    data,
    loading,
    error,
    updateTournament,
    deleteTournament
  };
}