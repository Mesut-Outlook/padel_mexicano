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
    // Firebase bağlantısını kontrol et, hata varsa offline mod
    try {
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
          console.warn('Firebase bağlantısı başarısız, offline modda çalışıyor:', error.message);
          // Offline modda varsayılan veriyi kullan
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
          setError('Offline modda çalışıyor - Firebase bağlantısı yok');
          setLoading(false);
        }
      );

      return () => off(tournamentRef);
    } catch (error: any) {
      console.warn('Firebase başlatma hatası, offline modda devam:', error.message);
      // Firebase başlatılamazsa offline data ile devam et
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
      setError('Offline modda çalışıyor - Firebase yapılandırması yok');
      setLoading(false);
    }
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