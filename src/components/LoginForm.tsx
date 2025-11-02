import { useState } from 'react';

interface LoginFormProps {
  onLogin: (name: string, password?: string) => Promise<boolean>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const success = await onLogin(name, isAdminLogin ? password : undefined);
      
      if (!success) {
        if (isAdminLogin) {
          setError('Admin girişi başarısız. Şifrenizi kontrol edin.');
        } else {
          setError('Giriş başarısız. Lütfen tekrar deneyin.');
        }
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLoginType = () => {
    setIsAdminLogin(!isAdminLogin);
    setPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏸 Mexicano Padel
          </h1>
          <p className="text-gray-600">
            {isAdminLogin ? 'Admin Girişi' : 'Oyuncu Girişi'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isAdminLogin ? 'Admin Kullanıcı Adı' : 'Oyuncu Adınız'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAdminLogin ? "admin" : "İsminizi girin"}
              autoComplete="off"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {isAdminLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Şifresi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleLoginType}
            className="text-blue-600 hover:text-blue-700 text-sm underline"
          >
            {isAdminLogin ? 'Oyuncu olarak giriş yap' : 'Admin olarak giriş yap'}
          </button>
        </div>

        {!isAdminLogin && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Oyuncu Girişi</h3>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• İsminizi yazın, şifre gerekmez</li>
              <li>• Yeni isim ise otomatik kayıt olursunuz</li>
              <li>• Turnuva sonuçlarını görüntüleyebilirsiniz</li>
              <li>• Skor girişi yapılması admin yetkisi gerektirir</li>
            </ul>
          </div>
        )}

        {isAdminLogin && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-amber-800 mb-2">🔐 Admin Yetkisi</h3>
            <ul className="text-xs text-amber-600 space-y-1">
              <li>• Tüm turnuvaları yönetebilirsiniz</li>
              <li>• Skor girişi yapabilirsiniz</li>
              <li>• Oyuncu ekleyip çıkarabilirsiniz</li>
              <li>• Turnuva oluşturabilirsiniz</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
