# Mexicano Padel Tournament Management System

Bu proje, Mexicano formatında padel turnuvaları düzenlemek için geliştirilmiş bir web uygulamasıdır.

## Özellikler

- **Değişken Oyuncu Sayısı**: En az 8 oyuncu (çift sayıda olmalı)
- **İlk Tur Rastgele**: İlk tur eşleşmeleri tamamen rastgele oluşturulur
- **Sonraki Turlar Sıralamaya Göre**: Mevcut sıralamaya göre seeded eşleşmeler
- **Race-to-32 Format**: Maçlar 32 puana kadar oynanır
- **Adil Puan Dağıtımı**: Takım içinde %55/%45 oranında puan dağıtımı
- **Otomatik Bay Sistemi**: 4'ün katı olmayan oyuncu sayıları için otomatik bay ataması
- **CSV Export**: Fikstür ve sıralamayı CSV olarak dışa aktarma

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