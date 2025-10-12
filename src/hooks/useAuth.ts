import { useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  type: 'admin' | 'player';
  createdAt: Date;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // LocalStorage anahtarları
  const USER_STORAGE_KEY = 'padel-mexicano-user';
  const PLAYERS_STORAGE_KEY = 'padel-mexicano-players';

  // Admin bilgileri
  const ADMIN_PASSWORD = '12345678';

  useEffect(() => {
    // Uygulama açıldığında kayıtlı kullanıcıyı kontrol et
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser({
          ...userData,
          createdAt: new Date(userData.createdAt)
        });
      } catch (error) {
        console.error('Kullanıcı verisi parse edilemedi:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const savePlayersToStorage = (players: User[]) => {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
  };

  const getPlayersFromStorage = (): User[] => {
    const saved = localStorage.getItem(PLAYERS_STORAGE_KEY);
    if (saved) {
      try {
        const players = JSON.parse(saved);
        return players.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt)
        }));
      } catch (error) {
        console.error('Oyuncu verisi parse edilemedi:', error);
      }
    }
    return [];
  };

  const login = async (name: string, password?: string): Promise<boolean> => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return false;
    }

    // Admin girişi kontrolü
    if (trimmedName.toLowerCase() === 'admin') {
      if (password !== ADMIN_PASSWORD) {
        return false;
      }
      
      const adminUser: User = {
        id: 'admin',
        name: 'Admin',
        type: 'admin',
        createdAt: new Date()
      };
      
      setUser(adminUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(adminUser));
      return true;
    }

    // Oyuncu girişi - şifre istenmez
    if (password !== undefined) {
      // Eğer şifre girilmişse ama admin değilse hata
      return false;
    }

    // Mevcut oyuncuları kontrol et
    const existingPlayers = getPlayersFromStorage();
    let playerUser = existingPlayers.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());

    if (!playerUser) {
      // Yeni oyuncu oluştur
      playerUser = {
        id: `player_${Date.now()}`,
        name: trimmedName,
        type: 'player',
        createdAt: new Date()
      };

      const updatedPlayers = [...existingPlayers, playerUser];
      savePlayersToStorage(updatedPlayers);
    }

    setUser(playerUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(playerUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const isAdmin = () => {
    return user?.type === 'admin';
  };

  const isAuthenticated = user !== null;

  return {
    user,
    isAuthenticated,
    login,
    logout,
    isAdmin,
    loading
  };
}
