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
  tournamentStarted: boolean;
  currentRound: number;
}

export function useFirebaseTournament(tournamentId: string) {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(false); // Hemen false başla
  const [error] = useState<string | null>('Offline modda çalışıyor');

  useEffect(() => {
    // Tamamen offline - Firebase yok
    const offlineData: TournamentData = {
      players: [
        "Ahmet", "Mehmet", "Ali", "Can",
        "Burak", "Serkan", "Emre", "Murat"
      ],
      rounds: [],
      totals: {},
      byeCounts: {},
      tournamentStarted: false,
      currentRound: 0
    };
    
    setData(offlineData);
    setLoading(false);
    
  }, [tournamentId]);

  const updateTournament = async (updates: Partial<TournamentData>) => {
    // Offline modda sadece local state'i güncelle
    setData(prev => prev ? { ...prev, ...updates } : null);
  };

  return { data, loading, error, updateTournament };
}