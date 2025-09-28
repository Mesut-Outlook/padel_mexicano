import { useEffect, useState } from 'react';

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
}

export function useFirebaseTournament(tournamentId: string) {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const getTournamentStorageKey = (id: string) => `mexicano-tournament-${id}`;

  useEffect(() => {
    // localStorage'dan turnuva verilerini yükle
    const storageKey = getTournamentStorageKey(tournamentId);
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setData(parsedData);
      } catch (err) {
        console.error('Turnuva verisi yüklenirken hata:', err);
        // Hatalı veri varsa default data kullan
        setData(getDefaultTournamentData());
      }
    } else {
      // Yeni turnuva - default verilerle başla
      setData(getDefaultTournamentData());
    }
    
    setLoading(false);
  }, [tournamentId]);

  function getDefaultTournamentData(): TournamentData {
    return {
      players: [],
      rounds: [],
      totals: {},
      byeCounts: {},
      tournamentStarted: false,
      currentRound: 0
    };
  }

  const updateTournament = (newData: TournamentData) => {
    setData(newData);
    // localStorage'a kaydet
    const storageKey = getTournamentStorageKey(tournamentId);
    localStorage.setItem(storageKey, JSON.stringify(newData));
  };

  const deleteTournament = () => {
    const storageKey = getTournamentStorageKey(tournamentId);
    localStorage.removeItem(storageKey);
    setData(getDefaultTournamentData());
  };

  return {
    data,
    loading,
    error,
    updateTournament,
    deleteTournament
  };
}