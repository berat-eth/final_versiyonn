#!/bin/bash

# Debian 11 Android Development Setup Script
# Installs required packages for React Native/Expo Android development

set -e

echo "🚀 Setting up Debian 11 for Android development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 20.x
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Java 17 (OpenJDK)
print_status "Installing Java 17..."
apt install -y openjdk-17-jdk

# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc

# Install Android SDK
print_status "Installing Android SDK..."
mkdir -p /opt/android-sdk
cd /opt/android-sdk

# Download Android command line tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
rm commandlinetools-linux-11076708_latest.zip

# Set up Android SDK environment
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo 'export ANDROID_HOME=/opt/android-sdk' >> ~/.bashrc
echo 'export ANDROID_SDK_ROOT=/opt/android-sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc

# Accept Android SDK licenses
print_status "Accepting Android SDK licenses..."
yes | sdkmanager --licenses

# Install required Android SDK components
print_status "Installing Android SDK components..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;26.1.10909125"

# Install additional tools
print_status "Installing additional tools..."
apt install -y lftp qrencode

# Install Expo CLI globally
print_status "Installing Expo CLI..."
npm install -g @expo/cli

print_success "Setup complete! 🎉"
print_status "Please run 'source ~/.bashrc' or restart your terminal to apply environment variables."
print_status "Then you can run './build-apk.sh' to build your APK."
