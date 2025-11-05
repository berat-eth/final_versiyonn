import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { generateSecureDeviceId } from './crypto-utils';

const DEVICE_ID_KEY = 'device_id';
const API_BASE_URL = 'https://api.zerodaysoftware.tr/api';

/**
 * DeviceId'yi al veya oluştur
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Önce AsyncStorage'dan al
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Yeni deviceId oluştur
      deviceId = generateSecureDeviceId(Platform.OS);
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('✅ Yeni deviceId oluşturuldu:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('❌ DeviceId getirme hatası:', error);
    // Fallback: geçici deviceId oluştur
    return generateSecureDeviceId(Platform.OS);
  }
}

/**
 * Event gönder (hem logged-in hem anonymous)
 */
export async function sendTrackingEvent(
  eventType: string,
  eventData: any,
  userId: number | null = null,
  sessionId: string | null = null
): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    
    const payload = {
      userId: userId || null,
      deviceId,
      eventType,
      screenName: eventData.screenName || null,
      eventData: {
        ...eventData,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        platformVersion: Platform.Version?.toString()
      },
      sessionId: sessionId || null
    };

    // Non-blocking fetch - main thread'i bloklamaz
    fetch(`${API_BASE_URL}/user-data/behavior/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }).catch(error => {
      // Silent fail - tracking hatası kullanıcıyı etkilememeli
      console.error('Tracking event gönderilemedi:', error);
    });

    return true;
  } catch (error) {
    console.error('❌ Tracking event hatası:', error);
    return false;
  }
}

/**
 * Session başlat
 */
export async function startTrackingSession(
  userId: number | null = null,
  metadata: any = {}
): Promise<string | null> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
      userId: userId || null,
      deviceId,
      sessionId,
      metadata
    };

    await fetch(`${API_BASE_URL}/user-data/behavior/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }).catch(error => {
      console.error('Session start hatası:', error);
    });

    // SessionId'yi AsyncStorage'a kaydet
    await AsyncStorage.setItem('current_session_id', sessionId);
    
    return sessionId;
  } catch (error) {
    console.error('❌ Session start hatası:', error);
    return null;
  }
}

/**
 * Session bitir
 */
export async function endTrackingSession(
  sessionId: string | null,
  duration: number = 0,
  pageCount: number = 0,
  scrollDepth: number = 0,
  metadata: any = {}
): Promise<boolean> {
  try {
    if (!sessionId) {
      sessionId = await AsyncStorage.getItem('current_session_id');
    }

    if (!sessionId) {
      return false;
    }

    const payload = {
      sessionId,
      duration,
      pageCount,
      scrollDepth,
      metadata
    };

    await fetch(`${API_BASE_URL}/user-data/behavior/session/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }).catch(error => {
      console.error('Session end hatası:', error);
    });

    // SessionId'yi temizle
    await AsyncStorage.removeItem('current_session_id');
    
    return true;
  } catch (error) {
    console.error('❌ Session end hatası:', error);
    return false;
  }
}

/**
 * Device'ı user'a bağla (login sonrası)
 */
export async function linkDeviceToUser(userId: number): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    
    const payload = {
      deviceId,
      userId
    };

    const response = await fetch(`${API_BASE_URL}/user-data/behavior/link-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('❌ Device linking hatası:', error);
    return false;
  }
}

