import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import './src/utils/console-config';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Linking, Text, TouchableOpacity, ActivityIndicator, Image, View } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import apiService from './src/utils/api-service';
import { AppProvider } from './src/contexts/AppContext';
import { BackendErrorProvider } from './src/services/BackendErrorService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, DEFAULT_TENANT_API_KEY, DEFAULT_TENANT_ID } from './src/utils/api-config';
// Bildirim sistemi kaldırıldı
import { setApiKey as persistApiKey } from './src/services/AuthKeyStore';
import { installGlobalErrorMonitor, ErrorBoundaryLogger } from './src/utils/error-monitor';

// TurboModule uyarılarını gizle
LogBox.ignoreLogs([
  'Module TurboModuleRegistry',
  'TurboModuleRegistry.getEnforcing(...)',
  '[runtime not ready]',
  'Sync error:',
  'Sync failed',
  'Simulated network failure',
]);

export default function App() {
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [backendReady, setBackendReady] = useState<null | boolean>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Install global error monitor early
    installGlobalErrorMonitor();

    // Network'ü başlangıçta initialize et (SQLite kaldırıldı)
    const setupApp = async () => {
      try {
        // OTA updates kaldırıldı
        // API anahtarını runtime'a erken set et (env üzerinden)
        try {
          if (DEFAULT_TENANT_API_KEY) {
            apiService.setApiKey(DEFAULT_TENANT_API_KEY);
            persistApiKey(DEFAULT_TENANT_API_KEY).catch(() => { });
          }
        } catch { }

        // Açılışta backend health zorunlu; başarısızsa uygulamayı yükleme
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const resp = await fetch(`${getApiBaseUrl()}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              // Sunucu health endpoint'inde de kimlik doğrulama gerektirebilir
              ...(DEFAULT_TENANT_API_KEY ? { 'X-API-Key': DEFAULT_TENANT_API_KEY } : {}),
              ...(DEFAULT_TENANT_ID ? { 'X-Tenant-Id': DEFAULT_TENANT_ID } : {}),
              ...(DEFAULT_TENANT_API_KEY ? { 'Authorization': `Bearer ${DEFAULT_TENANT_API_KEY}` } : {})
            }
          });
          clearTimeout(timeoutId);
          if (!resp.ok) {
            throw new Error('health_not_ok');
          }
          // Health OK: API key'i runtime ve güvenli depoya set et
          try {
            if (DEFAULT_TENANT_API_KEY) {
              apiService.setApiKey(DEFAULT_TENANT_API_KEY);
              persistApiKey(DEFAULT_TENANT_API_KEY).catch(() => { });
            }
          } catch { }
          setBackendReady(true);
        } catch (e) {
          setBackendReady(false);
          return; // Devam etme, engelle
        }

        // Bildirim sistemi kaldırıldı

        // NFC init kaldırıldı

        // Ağ/önbellek ağır işlemler kaldırıldı

        // Ntfy bildirim dinleyicisi kaldırıldı

        // Açılış health zaten yapıldı

        // IP ping kaldırıldı

        // No periodic retries after redirect requirement
        return () => { };
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        if (backendReady === null) setBackendReady(false);
      }
    };

    const cleanupPromise = setupApp();
    return () => {
      // Ensure any async cleanup if provided
      Promise.resolve(cleanupPromise).catch(() => { });
    };
  }, []);

  useEffect(() => {
    const checkOnline = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        // İnternet bağlantı testi (204 dönen hızlı uç nokta)
        const resp = await fetch('https://clients3.google.com/generate_204', { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        setIsOnline(resp.ok);
      } catch {
        setIsOnline(false);
      }
    };
    if (backendReady === false) {
      checkOnline();
    }
  }, [backendReady]);

  // Bildirim izin akışı kaldırıldı

  // Yönlendirme sayacı ve WebView fallback kaldırıldı

  // Yönlendirme ekranı kaldırıldı

  if (backendReady === false) {
    const handleRetry = async () => {
      try {
        setBackendReady(null);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(`${getApiBaseUrl()}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(DEFAULT_TENANT_API_KEY ? { 'X-API-Key': DEFAULT_TENANT_API_KEY } : {}),
            ...(DEFAULT_TENANT_ID ? { 'X-Tenant-Id': DEFAULT_TENANT_ID } : {}),
            ...(DEFAULT_TENANT_API_KEY ? { 'Authorization': `Bearer ${DEFAULT_TENANT_API_KEY}` } : {})
          }
        });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error('health_not_ok');
        try {
          if (DEFAULT_TENANT_API_KEY) {
            apiService.setApiKey(DEFAULT_TENANT_API_KEY);
            persistApiKey(DEFAULT_TENANT_API_KEY).catch(() => { });
          }
        } catch { }
        setBackendReady(true);
      } catch (e) {
        setBackendReady(false);
      }
    };
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 }} edges={['top', 'bottom']}>
          {/* ThreeJS arka plan kaldırıldı */}

          <View style={{ width: '92%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Image source={require('./assets/logo-removebg-preview.png')} style={{ width: 200, height: 200, marginBottom: 8, resizeMode: 'contain' }} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>Bağlantı Sorunu</Text>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#333', textAlign: 'center', lineHeight: 20 }}>
                {isOnline === false
                  ? 'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.'
                  : 'Şu anda sunucularımızda sorun yaşıyoruz. Lütfen daha sonra tekrar deneyin.'}
              </Text>
              <View style={{ marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: isOnline === false ? '#FFE8E8' : '#FFF7CC', borderWidth: 1, borderColor: isOnline === false ? '#FFC2C2' : '#FFE899' }}>
                <Text style={{ fontSize: 12, color: isOnline === false ? '#C62828' : '#8A6D00' }}>
                  {isOnline === false ? 'Durum: Çevrimdışı' : 'Durum: Çevrimiçi - Sunucu hatası'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 6 }}>
              <TouchableOpacity onPress={handleRetry} style={{ backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Tekrar Dene</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { try { Linking.openSettings?.(); } catch { } }} style={{ backgroundColor: '#f5f5f5', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eaeaea' }}>
                <Text style={{ color: '#111', fontSize: 15, fontWeight: '600' }}>Ayarlar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <AppProvider>
            <BackendErrorProvider navigation={null}>
              <></>
            </BackendErrorProvider>
          </AppProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (backendReady === null) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          {/* ThreeJS arka plan kaldırıldı */}
          <Image source={require('./assets/logo-removebg-preview.png')} style={{ width: 240, height: 240, marginBottom: 16, resizeMode: 'contain' }} />
          <ActivityIndicator size="small" color="#000" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <AppProvider>
          <BackendErrorProvider navigation={null}>
            <AppNavigator />
          </BackendErrorProvider>
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
