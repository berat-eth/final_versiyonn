'use client'

import { useState, useEffect } from 'react'
import { MapPin, Users, Globe, Clock, Eye, RefreshCw, Filter, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface LiveUser {
    id: string
    userId?: number
    sessionId: string
    ipAddress: string
    country: string
    city: string
    region: string
    latitude: number
    longitude: number
    userAgent: string
    device: string
    browser: string
    os: string
    lastActivity: string
    isActive: boolean
    page: string
    duration: number
    referrer?: string
}

interface UserLocation {
    lat: number
    lng: number
    user: LiveUser
}

export default function LiveUsers() {
    const [liveUsers, setLiveUsers] = useState<LiveUser[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCountry, setFilterCountry] = useState('')
    const [filterDevice, setFilterDevice] = useState('')
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

    // Canlı kullanıcıları yükle
    const loadLiveUsers = async () => {
        try {
            setLoading(true)
            console.log('📡 Canlı kullanıcılar yükleniyor...')
            const response = await api.get('/admin/live-users') as any
            console.log('📡 API Response:', response)
            
            if (response.success && response.data) {
                setLiveUsers(response.data)
                setLastUpdate(new Date())
                console.log('✅ Canlı kullanıcılar yüklendi:', response.data.length, 'kullanıcı')
            } else {
                console.warn('⚠️ API\'den veri alınamadı, boş liste kullanılıyor')
                setLiveUsers([])
                setLastUpdate(new Date())
            }
        } catch (error) {
            console.error('❌ Canlı kullanıcılar yükleme hatası:', error)
            setLiveUsers([])
            setLastUpdate(new Date())
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadLiveUsers()
        
        // Otomatik yenileme
        let interval: NodeJS.Timeout
        if (autoRefresh) {
            interval = setInterval(loadLiveUsers, 5000) // 5 saniyede bir
        }
        
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [autoRefresh])

    // Filtrelenmiş kullanıcılar
    const filteredUsers = liveUsers.filter(user => {
        const matchesSearch = user.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             user.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             user.country.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesCountry = !filterCountry || user.country === filterCountry
        const matchesDevice = !filterDevice || user.device === filterDevice
        
        return matchesSearch && matchesCountry && matchesDevice
    })

    // Benzersiz ülkeler
    const countries = [...new Set(liveUsers.map(user => user.country))].sort()
    const devices = [...new Set(liveUsers.map(user => user.device))].sort()

    // Harita için konum verileri
    const userLocations: UserLocation[] = filteredUsers.map(user => ({
        lat: user.latitude,
        lng: user.longitude,
        user
    }))

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        
        if (hours > 0) {
            return `${hours}s ${minutes}d ${secs}sn`
        } else if (minutes > 0) {
            return `${minutes}d ${secs}sn`
        } else {
            return `${secs}sn`
        }
    }

    const getDeviceIcon = (device: string) => {
        if (device.toLowerCase().includes('mobile')) return '📱'
        if (device.toLowerCase().includes('tablet')) return '📱'
        if (device.toLowerCase().includes('desktop')) return '💻'
        return '🖥️'
    }

    const getBrowserIcon = (browser: string) => {
        if (browser.toLowerCase().includes('chrome')) return '🌐'
        if (browser.toLowerCase().includes('firefox')) return '🦊'
        if (browser.toLowerCase().includes('safari')) return '🧭'
        if (browser.toLowerCase().includes('edge')) return '🌊'
        return '🌐'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Canlı Kullanıcılar</h2>
                    <p className="text-slate-500 mt-1">Gerçek zamanlı kullanıcı aktiviteleri ve konumları</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                            autoRefresh 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        <span>Otomatik Yenile</span>
                    </button>
                    <button
                        onClick={loadLiveUsers}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Yenile</span>
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Aktif Kullanıcılar</p>
                            <p className="text-3xl font-bold text-green-600">{liveUsers.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Globe className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Ülkeler</p>
                            <p className="text-3xl font-bold text-blue-600">{countries.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Şehirler</p>
                            <p className="text-3xl font-bold text-purple-600">
                                {[...new Set(liveUsers.map(u => u.city))].length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Son Güncelleme</p>
                            <p className="text-lg font-bold text-orange-600">
                                {lastUpdate.toLocaleTimeString('tr-TR')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Arama</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 pl-10"
                                placeholder="IP, şehir veya ülke ara..."
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Ülke</label>
                        <select
                            value={filterCountry}
                            onChange={(e) => setFilterCountry(e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tüm Ülkeler</option>
                            {countries.map(country => (
                                <option key={country} value={country}>{country}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Cihaz</label>
                        <select
                            value={filterDevice}
                            onChange={(e) => setFilterDevice(e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tüm Cihazlar</option>
                            {devices.map(device => (
                                <option key={device} value={device}>{device}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Harita ve Kullanıcı Listesi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Harita */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                        Kullanıcı Konumları
                    </h3>
                    <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden">
                        {/* Basit harita simülasyonu */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
                            {userLocations.map((location, index) => (
                                <motion.div
                                    key={location.user.id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                        left: `${20 + (location.lng % 60) * 1.2}%`,
                                        top: `${20 + (location.lat % 40) * 1.5}%`
                                    }}
                                >
                                    <div className="relative">
                                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
                                            {index + 1}
                                        </div>
                                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                            {location.user.city}, {location.user.country}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        {userLocations.length === 0 && (
                            <div className="text-center text-gray-500">
                                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Konum verisi bulunamadı</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Kullanıcı Listesi */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-green-600" />
                        Aktif Kullanıcılar ({filteredUsers.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredUsers.map((user, index) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-lg">{getDeviceIcon(user.device)}</span>
                                            <span className="text-lg">{getBrowserIcon(user.browser)}</span>
                                            <span className="font-medium text-slate-800">{user.ipAddress}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {user.isActive ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <MapPin className="w-3 h-3" />
                                                <span>{user.city}, {user.region}, {user.country}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Clock className="w-3 h-3" />
                                                <span>{formatDuration(user.duration)} süredir aktif</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Eye className="w-3 h-3" />
                                                <span>{user.page}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-gray-500">
                                        <div>{new Date(user.lastActivity).toLocaleTimeString('tr-TR')}</div>
                                        <div className="mt-1">{user.os}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {filteredUsers.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Filtrelere uygun kullanıcı bulunamadı</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detaylı İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h4 className="font-bold text-slate-800 mb-4">Ülke Dağılımı</h4>
                    <div className="space-y-2">
                        {countries.slice(0, 5).map(country => {
                            const count = liveUsers.filter(u => u.country === country).length
                            const percentage = (count / liveUsers.length) * 100
                            return (
                                <div key={country} className="flex items-center justify-between">
                                    <span className="text-sm">{country}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{count}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h4 className="font-bold text-slate-800 mb-4">Cihaz Dağılımı</h4>
                    <div className="space-y-2">
                        {devices.slice(0, 5).map(device => {
                            const count = liveUsers.filter(u => u.device === device).length
                            const percentage = (count / liveUsers.length) * 100
                            return (
                                <div key={device} className="flex items-center justify-between">
                                    <span className="text-sm">{device}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-green-500 h-2 rounded-full" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{count}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h4 className="font-bold text-slate-800 mb-4">Tarayıcı Dağılımı</h4>
                    <div className="space-y-2">
                        {[...new Set(liveUsers.map(u => u.browser))].slice(0, 5).map(browser => {
                            const count = liveUsers.filter(u => u.browser === browser).length
                            const percentage = (count / liveUsers.length) * 100
                            return (
                                <div key={browser} className="flex items-center justify-between">
                                    <span className="text-sm">{browser}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-purple-500 h-2 rounded-full" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{count}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
