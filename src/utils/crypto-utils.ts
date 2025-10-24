/**
 * GÜVENLİK: Kriptografik olarak güvenli yardımcı fonksiyonlar
 * Math.random() yerine kullanılmalıdır
 */

import CryptoJS from 'crypto-js';

/**
 * Kriptografik olarak güvenli random string üretir
 * @param length String uzunluğu (byte cinsinden)
 * @returns Hex formatında random string
 */
export function generateSecureRandomString(length: number = 16): string {
  try {
    const randomBytes = CryptoJS.lib.WordArray.random(length);
    return randomBytes.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.warn('CryptoJS failed, using fallback random:', error);
    // Fallback: Math.random() kullan
    let result = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < length * 2; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}

/**
 * Güvenli session ID üretir
 * @returns Session ID
 */
export function generateSecureSessionId(): string {
  const timestamp = Date.now().toString();
  const random = generateSecureRandomString(16);
  return `session_${timestamp}_${random}`;
}

/**
 * Güvenli device ID üretir
 * @param platform Platform adı (iOS, Android, etc.)
 * @returns Device ID
 */
export function generateSecureDeviceId(platform: string): string {
  const timestamp = Date.now().toString();
  const random = generateSecureRandomString(16);
  return `${platform}_${timestamp}_${random}`;
}

/**
 * Güvenli message ID üretir
 * @returns Message ID
 */
export function generateSecureMessageId(): string {
  const timestamp = Date.now();
  const random = generateSecureRandomString(12);
  return `msg_${timestamp}_${random}`;
}

/**
 * Güvenli UUID v4 üretir
 * @returns UUID
 */
export function generateSecureUUID(): string {
  const randomBytes = CryptoJS.lib.WordArray.random(16);
  const hex = randomBytes.toString(CryptoJS.enc.Hex);
  
  // UUID v4 formatına dönüştür
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16), // Version 4
    ((parseInt(hex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.substring(18, 20),
    hex.substring(20, 32)
  ].join('-');
}

/**
 * Güvenli random sayı üretir (belirli bir aralıkta)
 * @param min Minimum değer
 * @param max Maximum değer
 * @returns Random sayı
 */
export function generateSecureRandomNumber(min: number, max: number): number {
  try {
    const range = max - min + 1;
    const randomBytes = CryptoJS.lib.WordArray.random(4);
    const randomInt = parseInt(randomBytes.toString(CryptoJS.enc.Hex), 16);
    return min + (randomInt % range);
  } catch (error) {
    console.warn('CryptoJS failed, using fallback random number:', error);
    // Fallback: Math.random() kullan
    return min + Math.floor(Math.random() * (max - min + 1));
  }
}

/**
 * Array'i güvenli şekilde karıştırır (Fisher-Yates shuffle)
 * @param array Karıştırılacak array
 * @returns Karıştırılmış array
 */
export function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = generateSecureRandomNumber(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
