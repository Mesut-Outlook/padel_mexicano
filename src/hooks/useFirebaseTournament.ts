import { useEffect, useState } from 'react';
import { ref, onValue, set, off } from 'firebase/database';
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
    const tournamentRef = ref(database, `tournaments/${tournamentId}`);
    
    onValue(tournamentRef, 
      (snapshot) => {
        const value = snapshot.val();
        if (value) {
          setData(value);
        } else {
          // Turnuva yoksa varsayılan değerlerle başlat
          const defaultData: TournamentData = {
            players: [
              "Oyuncu 1", "Oyuncu 2", "Oyuncu 3", "Oyuncu 4",
              "Oyuncu 5", "Oyuncu 6", "Oyuncu 7", "Oyuncu 8"
            ],
            rounds: [],
            totals: {},
            byeCounts: {},
            tournamentStarted: false,
            currentRound: 0
          };
          setData(defaultData);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firebase error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => off(tournamentRef);
  }, [tournamentId]);

  const updateTournament = async (updates: Partial<TournamentData>) => {
    try {
      const tournamentRef = ref(database, `tournaments/${tournamentId}`);
      await set(tournamentRef, { ...data, ...updates });
    } catch (error: any) {
      console.error('Update error:', error);
      setError(error.message);
    }
  };

  return { data, loading, error, updateTournament };
}