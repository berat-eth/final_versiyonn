#!/usr/bin/env bash

set -euo pipefail

###############################################################################
# Android SDK/NDK/CMake kurulum ve APK build otomasyon scripti (Linux)
# - NDK 26.1.10909125 ve CMake 3.22.1 kurar
# - android/local.properties oluşturur
# - release APK derler
#
# Kullanım:
#   chmod +x scripts/setup-android-linux.sh
#   ./scripts/setup-android-linux.sh
#
# İsteğe bağlı env değişkenleri:
#   ANDROID_SDK_ROOT (varsayılan: /root/Android)
#   ANDROID_HOME     (varsayılan: /root/Android)
#   NDK_VERSION      (varsayılan: 26.1.10909125)
#   CMAKE_VERSION    (varsayılan: 3.22.1)
#   ANDROID_PLATFORM (varsayılan: android-34)
#   BUILD_TOOLS      (varsayılan: 34.0.0)
###############################################################################

ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-/root/Android}
ANDROID_HOME=${ANDROID_HOME:-/root/Android}
NDK_VERSION=${NDK_VERSION:-26.1.10909125}
CMAKE_VERSION=${CMAKE_VERSION:-3.22.1}
ANDROID_PLATFORM=${ANDROID_PLATFORM:-android-34}
BUILD_TOOLS=${BUILD_TOOLS:-34.0.0}

export ANDROID_SDK_ROOT ANDROID_HOME
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"

echo "[INFO] ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT"
echo "[INFO] ANDROID_HOME    : $ANDROID_HOME"
echo "[INFO] NDK_VERSION     : $NDK_VERSION"
echo "[INFO] CMAKE_VERSION   : $CMAKE_VERSION"
echo "[INFO] PLATFORM        : $ANDROID_PLATFORM"
echo "[INFO] BUILD_TOOLS     : $BUILD_TOOLS"

# Gereksinimler
if ! command -v java >/dev/null 2>&1; then
  echo "[ERROR] Java bulunamadı. Lütfen JDK 17 kurun (ör. apt-get install -y openjdk-17-jdk)." >&2
  exit 1
fi

# sdkmanager var mı kontrol et
if ! command -v sdkmanager >/dev/null 2>&1; then
  echo "[ERROR] sdkmanager bulunamadı. Lütfen Android SDK cmdline-tools yükleyin ve PATH'e ekleyin." >&2
  echo "        Örn: mkdir -p $ANDROID_SDK_ROOT/cmdline-tools && cd $ANDROID_SDK_ROOT/cmdline-tools && \
                curl -sSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o cmdtools.zip && \
                mkdir -p latest && unzip -q cmdtools.zip -d latest && rm cmdtools.zip" >&2
  exit 1
fi

yes | sdkmanager --licenses >/dev/null || true
sdkmanager "platforms;$ANDROID_PLATFORM" "build-tools;$BUILD_TOOLS" "platform-tools" "cmake;$CMAKE_VERSION" "ndk;$NDK_VERSION"

# Ninja bazı ortamlarda gerekli
if ! command -v ninja >/dev/null 2>&1; then
  echo "[INFO] ninja bulunamadı, yükleniyor..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y && sudo apt-get install -y ninja-build
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y ninja-build
  else
    echo "[WARN] Paket yöneticisi bulunamadı. ninja yüklenemedi; devam ediliyor."
  fi
fi

# local.properties oluştur
mkdir -p android
cat > android/local.properties <<EOF
sdk.dir=$ANDROID_SDK_ROOT
ndk.dir=$ANDROID_SDK_ROOT/ndk/$NDK_VERSION
cmake.dir=$ANDROID_SDK_ROOT/cmake/$CMAKE_VERSION
EOF

echo "[INFO] android/local.properties oluşturuldu"

# Gradle temizle ve derle
pushd android >/dev/null
./gradlew --no-daemon clean
./gradlew --no-daemon assembleRelease
popd >/dev/null

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  echo "[SUCCESS] APK üretildi: $APK_PATH"
else
  echo "[ERROR] APK bulunamadı. Derleme loglarını kontrol edin." >&2
  exit 1
fi


