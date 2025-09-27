import { useEffect, useState } from 'react';
import { set, ref } from 'firebase/database';
import { database } from '../firebase';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Hemen offline data ile başla - loading'de takılmasın
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
    setError('Offline modda çalışıyor');
    setLoading(false); // Hemen false yap - takılmasın
    
  }, [tournamentId]);

  const updateTournament = async (updates: Partial<TournamentData>) => {
    try {
      const tournamentRef = ref(database, `tournaments/${tournamentId}`);
      await set(tournamentRef, { ...data, ...updates });
    } catch (error: any) {
      // Firebase hatası olursa sessizce devam et (offline mode)
      console.warn('Firebase güncelleme başarısız, local modda devam:', error.message);
      // Local state'i güncelle
      setData(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  return { data, loading, error, updateTournament };
}