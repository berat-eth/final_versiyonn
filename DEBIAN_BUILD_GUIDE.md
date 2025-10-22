# Debian 11 Android APK Build Guide

Bu rehber Debian 11 Bullseye'de Huglu Outdoor mobil uygulamasının APK'sını derlemek için gerekli adımları içerir.

## Ön Gereksinimler

### 1. Sistem Güncellemesi
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Gerekli Paketlerin Kurulumu
```bash
# Temel paketler
sudo apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Java 17 (OpenJDK)
sudo apt install -y openjdk-17-jdk

# Android SDK için gerekli paketler
sudo apt install -y lftp qrencode
```

### 3. Android SDK Kurulumu
```bash
# Android SDK dizini oluştur
sudo mkdir -p /opt/android-sdk
sudo chown $USER:$USER /opt/android-sdk
cd /opt/android-sdk

# Android command line tools indir
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
rm commandlinetools-linux-11076708_latest.zip

# Environment variables ayarla
echo 'export ANDROID_HOME=/opt/android-sdk' >> ~/.bashrc
echo 'export ANDROID_SDK_ROOT=/opt/android-sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc

# Terminal'i yeniden başlat veya source ~/.bashrc
source ~/.bashrc

# Android SDK lisanslarını kabul et
yes | sdkmanager --licenses

# Gerekli SDK bileşenlerini yükle
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;26.1.10909125"
```

### 4. Expo CLI Kurulumu
```bash
sudo npm install -g @expo/cli
```

## APK Derleme

### Otomatik Kurulum (Önerilen)
```bash
# Setup script'ini çalıştır
chmod +x setup-debian-android.sh
./setup-debian-android.sh

# Terminal'i yeniden başlat
source ~/.bashrc

# APK'yı derle
chmod +x build-apk-debian.sh
./build-apk-debian.sh
```

### Manuel Derleme
```bash
# Proje dizinine git
cd /root/final_versiyonn

# Bağımlılıkları yükle
npm install

# Expo prebuild çalıştır
npx expo prebuild --platform android --clean --no-install

# Android dizinine git
cd android

# Gradle wrapper'ı çalıştırılabilir yap
chmod +x gradlew

# APK'yı derle
./gradlew assembleRelease --no-daemon --no-parallel
```

## Sorun Giderme

### 1. Gradle Daemon Hatası
```bash
# Gradle daemon'ı durdur
./gradlew --stop

# Yeniden dene
./gradlew assembleRelease --no-daemon --no-parallel
```

### 2. Memory Hatası
```bash
# gradle.properties dosyasını düzenle
echo "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m" >> android/gradle.properties
```

### 3. Android SDK Bulunamadı Hatası
```bash
# Environment variables'ları kontrol et
echo $ANDROID_HOME
echo $ANDROID_SDK_ROOT
echo $JAVA_HOME

# Eğer boşsa, manuel olarak ayarla
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

### 4. Expo Modules Core Kotlin Hatası
```bash
# expo-modules-core'u eski versiyona düşür
npm install expo-modules-core@1.12.0

# Android klasörünü temizle ve yeniden oluştur
rm -rf android
npx expo prebuild --platform android --clean
```

## Build Script Özellikleri

- **Otomatik FTP Upload**: APK otomatik olarak FTP sunucusuna yüklenir
- **QR Code Generation**: İndirme linki için QR kod oluşturulur
- **Error Handling**: Hata durumlarında detaylı bilgi verir
- **Environment Detection**: Gerekli ortam değişkenlerini otomatik ayarlar
- **Debian 11 Optimized**: Debian 11'e özel optimizasyonlar içerir

## Çıktı Dosyaları

- `huglu-outdoor-v1.0.0-YYYYMMDD-HHMMSS.apk`: Derlenmiş APK dosyası
- `huglu-outdoor-v1.0.0-YYYYMMDD-HHMMSS_qr.png`: İndirme linki QR kodu
- FTP sunucusunda: `http://46.202.158.159/files/public_html/app/1.apk`

## Notlar

- İlk derleme daha uzun sürebilir (5-10 dakika)
- Gradle daemon'ı kapatmak için `--no-daemon` flag'i kullanılır
- Memory kullanımı için `-Xmx2048m` ayarı yapılır
- Debian 11'de Java 17 kullanılması önerilir
