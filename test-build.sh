#!/bin/bash

# Quick test script for Debian 11 APK build
# Tests the build process step by step

set -e

echo "🧪 Testing APK build process..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[TEST]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Test 1: Environment
print_status "Testing environment..."
if command -v node &> /dev/null; then
    print_success "Node.js: $(node --version)"
else
    print_error "Node.js not found"
    exit 1
fi

if command -v java &> /dev/null; then
    print_success "Java: $(java -version 2>&1 | head -n 1)"
else
    print_error "Java not found"
    exit 1
fi

# Test 2: Android SDK
print_status "Testing Android SDK..."
if [ -n "$ANDROID_HOME" ] || [ -n "$ANDROID_SDK_ROOT" ]; then
    print_success "Android SDK configured"
else
    print_error "Android SDK not configured"
    exit 1
fi

# Test 3: Dependencies
print_status "Testing dependencies..."
if [ -f "package.json" ]; then
    print_success "package.json found"
else
    print_error "package.json not found"
    exit 1
fi

# Test 4: Expo CLI
print_status "Testing Expo CLI..."
if command -v expo &> /dev/null; then
    print_success "Expo CLI found"
else
    print_warning "Expo CLI not found, installing..."
    npm install -g @expo/cli
fi

# Test 5: Non-interactive mode
print_status "Testing non-interactive mode..."
export EXPO_NONINTERACTIVE=1
export EXPO_UNSTABLE_CORE_AUTOLINKING=1

# Test 6: Clean build
print_status "Cleaning previous builds..."
rm -rf android/app/build android/build .expo

print_success "All tests passed! Ready to build APK."
echo "Run: ./build-apk-debian-fixed.sh"
