import { apiService } from '../utils/api-service'

export interface LiveUserData {
    userId?: number
    sessionId: string
    ipAddress: string
    userAgent: string
    page: string
    referrer?: string
}

class LiveUserService {
    private sessionId: string = ''
    private isTracking: boolean = false
    private lastPage: string = ''
    private heartbeatInterval: NodeJS.Timeout | null = null

    constructor() {
        this.sessionId = this.generateSessionId()
        this.startTracking()
    }

    private generateSessionId(): string {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2)
        return `sess_${timestamp}_${random}`
    }

    private getCurrentPage(): string {
        // React Native'de sayfa takibi için
        // Bu fonksiyon navigation state'ine göre güncellenebilir
        return window?.location?.pathname || '/app'
    }

    private getUserAgent(): string {
        // React Native için user agent
        return 'ReactNative/1.0 (Mobile App)'
    }

    private getIPAddress(): string {
        // Gerçek IP adresi alınması için API çağrısı yapılabilir
        // Şimdilik localhost kullanılıyor
        return '127.0.0.1'
    }

    public startTracking(): void {
        if (this.isTracking) return

        this.isTracking = true
        console.log('🟢 Live user tracking started')

        // İlk kayıt
        this.recordUserActivity()

        // Her 30 saniyede bir heartbeat gönder
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat()
        }, 30000)
    }

    public stopTracking(): void {
        if (!this.isTracking) return

        this.isTracking = false
        console.log('🔴 Live user tracking stopped')

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
    }

    public updatePage(page: string): void {
        if (page === this.lastPage) return

        this.lastPage = page
        console.log('📄 Page updated:', page)

        this.recordUserActivity()
    }

    private async recordUserActivity(): Promise<void> {
        try {
            const userData: LiveUserData = {
                sessionId: this.sessionId,
                ipAddress: this.getIPAddress(),
                userAgent: this.getUserAgent(),
                page: this.getCurrentPage(),
                referrer: document?.referrer || undefined
            }

            const response = await apiService.post('/live-users', userData)
            console.log('✅ User activity recorded:', response)
        } catch (error) {
            console.warn('⚠️ Failed to record user activity:', error)
        }
    }

    private async sendHeartbeat(): Promise<void> {
        try {
            const currentPage = this.getCurrentPage()
            const duration = this.calculateSessionDuration()

            const response = await apiService.patch(`/live-users/${this.sessionId}`, {
                page: currentPage,
                duration: duration
            })

            console.log('💓 Heartbeat sent:', response)
        } catch (error) {
            console.warn('⚠️ Failed to send heartbeat:', error)
        }
    }

    private calculateSessionDuration(): number {
        // Session başlangıcından bu yana geçen süre (saniye)
        const sessionStart = parseInt(this.sessionId.split('_')[1])
        return Math.floor((Date.now() - sessionStart) / 1000)
    }

    public getSessionId(): string {
        return this.sessionId
    }

    public isActive(): boolean {
        return this.isTracking
    }
}

// Singleton instance
export const liveUserService = new LiveUserService()

// React Native için navigation listener
export const setupNavigationTracking = (navigation: any) => {
    if (!navigation) return

    // Navigation state değişikliklerini dinle
    const unsubscribe = navigation.addListener('state', () => {
        const currentRoute = navigation.getCurrentRoute()
        if (currentRoute?.name) {
            liveUserService.updatePage(`/${currentRoute.name}`)
        }
    })

    return unsubscribe
}

// App lifecycle events
export const setupAppLifecycleTracking = () => {
    // App foreground
    const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === 'active') {
            liveUserService.startTracking()
        } else if (nextAppState === 'background') {
            liveUserService.stopTracking()
        }
    }

    return handleAppStateChange
}
