# 🏸 Mexicano Padel Turnuva Yöneticisi (Firebase Destekli)

Bu uygulama, değişken sayıda oyuncuyla Mexicano formatında padel turnuvaları düzenlemenizi sağlar. **Real-time Firebase entegrasyonu** ile birden fazla kişi aynı turnuvayı eşzamanlı olarak takip edebilir ve yönetebilir.

## 🌟 Özellikler

### 🏆 Turnuva Yönetimi
- **Değişken oyuncu sayısı**: En az 8, çift sayıda oyuncu
- **Otomatik eşleşme**: İlk tur rastgele, sonraki turlar sıralamaya göre
- **Bay sistemi**: Oyuncu sayısı 4'ün katı değilse otomatik bay ataması
- **Race-to-32 formatı**: İlk 32'ye ulaşan takım kazanır

### 📊 Gelişmiş Sıralama
- **Toplam puan**: Her oyuncunun maçlarda aldığı toplam skor
- **Averaj sistemi**: Alınan puan - Verilen puan (performans göstergesi)
- **Akıllı sıralama**: Önce toplam puan, sonra averaj, sonra alfabetik

### 🔄 Real-time İşbirliği
- **Firebase entegrasyonu**: Anlık veri senkronizasyonu
- **Çoklu kullanıcı**: Aynı turnuvayı birden fazla kişi yönetebilir
- **Turnuva ID**: Basit kod ile turnuvaya katılım
- **Otomatik güncelleme**: Skorlar ve sıralama anlık olarak güncellenir

### 📈 Planlama Araçları
- **Optimal tur hesaplama**: Eşit oyun için gereken tur sayısı
- **İlerleme takibi**: Hangi turda olduğunuz ve kalan maç sayısı
- **Validasyon**: Tüm girişler otomatik kontrol edilir

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

3. Tarayıcınızda `http://localhost:3000` adresine gidin.

## Kullanım

### 1. Oyuncu Yönetimi
- Varsayılan olarak 8 oyuncu mevcuttur
- "Oyuncu Ekle" butonu ile yeni oyuncu ekleyebilirsiniz
- "Oyuncu Sil" butonu ile oyuncu silebilirsiniz
- Oyuncu adlarını doğrudan düzenleyebilirsiniz

### 2. Turnuva Başlatma
- "Turnuvayı Başlat" butonuna tıklayarak ilk turu oluşturun
- İlk tur tamamen rastgele eşleşmeler içerir

### 3. Skor Girişi
- Her maç için A ve B takımlarının skorlarını girin
- Kazanan takımın skoru 32 olmalıdır
- Hızlı skor butonlarını kullanabilirsiniz (32-0, 32-8, vb.)

### 4. Tur Tamamlama
- Tüm maç skorları girildikten sonra "Turu Kaydet / Puanları Dağıt" butonuna tıklayın
- Puanlar otomatik olarak dağıtılır ve sıralama güncellenir

### 5. Sonraki Turlar
- Tur kaydedildikten sonra "Sonraki Turu Oluştur" butonu görünür
- Yeni tur mevcut sıralamaya göre seeded eşleşmeler içerir

## Puan Sistemi

- **Takım İçi Dağıtım**: Sıralamada daha aşağıda olan oyuncu %55, yukarıda olan %45 alır
- **Sıralama**: Toplam puana göre (yüksekten düşüğe)
- **Beraberlik Durumu**: Alfabetik sıralama

## Bay Sistemi

- Oyuncu sayısı 4'ün katı değilse otomatik bay ataması yapılır
- Bay ataması en az bay alan oyuncular arasından yapılır
- Eşit bay sayısında olanlar arasında sıralama ve alfabetik sıra dikkate alınır

## Export Özellikleri

- **Fikstür CSV**: Tüm turların maç sonuçlarını içerir
- **Sıralama CSV**: Güncel sıralama, toplam puanlar ve bay sayılarını içerir

## Teknical Detaylar

- **React 18** + TypeScript
- **Vite** build tool
- **Tailwind CSS** styling
- **Responsive** tasarım

## Geliştirme

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Build önizleme
npm run preview

# Linting
npm run lint
```