# FPL Paddock League — Girişsiz lig sitesi

Bu klasör HTML, CSS, JavaScript ve görsellerden oluşur. Sunucu kodu, veritabanı, Discord tokeni, üyelik ve giriş sistemi gerektirmez.

## GitHub Pages ile yayınlama

1. GitHub hesabında herkese açık bir depo oluştur.
2. Bu klasörün **içindeki dosyaları** (index.html dahil) deponun ana dizinine yükle.
3. Deponun Settings → Pages bölümünde “Deploy from a branch”, “main” ve “/ (root)” seçeneklerini seç.
4. GitHub’ın verdiği `.github.io` adresini Discord’da paylaş.

Ücretsiz plan için depo herkese açık olmalıdır. Burada gizli anahtar ve özel Discord hesap kimlikleri yoktur. Depo oluşturma veya GitHub’a yükleme bu paket hazırlanırken yapılmamıştır.

## Güncelleme

Lig verileri `data.js` içindedir. Yarış sonuçları, cezalar, pilotlar, takımlar ve takvim burada tek kaynaktan okunur. `currentRound`, FIA kararları kesinleşmiş son yarıştır. Yeni bir yarışın sonuçlarını ve cezalarını ekledikten sonra bu alan güncellenir. Gerekçesi paylaşılmamış kayıtlar bilinmiyor olarak korunmalıdır.

DP’nin silinmesi cezanın verildiği round + 8 ile izlenir. Grid cezasının uygulanacağı round ayrı tutulur. Kaynak sonuçlara uygulanmış zaman cezaları tekrar puandan veya sonuçtan düşülmez. Sıralamalar, sayaçlar ve DP toplamları verilerden hesaplanır. Ana sayfadaki sezon özeti ve son podyum metni de yeni GP ile birlikte güncellenmelidir.

Fotoğraflar ve temsilî F1 pilotu portreleri Formula1.com, bayraklar FlagCDN kaynaklıdır. Site bağımsız FPL ligidir. Görsel kaynakları site altındaki bilgi penceresinde açıklanır.

Resmî GitHub Pages bilgisi: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
