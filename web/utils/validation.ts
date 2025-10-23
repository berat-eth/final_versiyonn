// Dosya yükleme validasyonu
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

    if (!file) {
        return { valid: false, error: 'Dosya seçilmedi' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'Dosya boyutu 5MB\'dan küçük olmalıdır' };
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Sadece PNG, JPEG veya PDF dosyaları yüklenebilir' };
    }

    return { valid: true };
}

// Dosya adını temizle
export function sanitizeFileName(fileName: string): string {
    // Türkçe karakterleri değiştir
    const turkishMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U'
    };

    let sanitized = fileName;
    Object.keys(turkishMap).forEach(key => {
        sanitized = sanitized.replace(new RegExp(key, 'g'), turkishMap[key]);
    });

    // Özel karakterleri kaldır, sadece alfanumerik, tire ve nokta bırak
    sanitized = sanitized.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Birden fazla alt çizgiyi tek alt çizgiye dönüştür
    sanitized = sanitized.replace(/_+/g, '_');

    // Başta ve sonda alt çizgi varsa kaldır
    sanitized = sanitized.replace(/^_+|_+$/g, '');

    return sanitized;
}

// Email validasyonu
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Telefon validasyonu (Türkiye)
export function validatePhone(phone: string): boolean {
    // Türkiye telefon formatları: +90, 0, veya direkt
    const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
    const cleanPhone = phone.replace(/[\s()-]/g, '');
    return phoneRegex.test(cleanPhone);
}

// Form data sanitization
export function sanitizeFormData(data: any): any {
    const sanitized: any = {};

    for (const key in data) {
        if (typeof data[key] === 'string') {
            // XSS koruması için HTML taglerini temizle
            sanitized[key] = data[key]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
        } else {
            sanitized[key] = data[key];
        }
    }

    return sanitized;
}
