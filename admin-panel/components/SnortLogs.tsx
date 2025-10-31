'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Search, Filter, Download, Eye, X, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface SnortLog {
    id: number
    timestamp: string
    priority: 'high' | 'medium' | 'low'
    classification: string
    sourceIp: string
    sourcePort: number
    destIp: string
    destPort: number
    protocol: string
    message: string
    signature: string
    action: 'alert' | 'drop' | 'pass'
}

export default function SnortLogs() {
    // Mock loglar kaldırıldı - Backend entegrasyonu için hazır
    const [logs, setLogs] = useState<SnortLog[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [viewingLog, setViewingLog] = useState<SnortLog | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterPriority, setFilterPriority] = useState('all')
    const [filterAction, setFilterAction] = useState('all')
    const [ipsMode, setIpsMode] = useState(true)
    const [showIpsSettings, setShowIpsSettings] = useState(false)
    const [ipsSettings, setIpsSettings] = useState({
        autoBlock: true,
        blockDuration: '24',
        alertThreshold: '3',
        whitelistEnabled: true,
        blacklistEnabled: true
    })

    const priorityColors = {
        high: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
        medium: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
        low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' }
    }

    const actionColors = {
        alert: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
        drop: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
        pass: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' }
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.sourceIp.includes(searchTerm) ||
            log.destIp.includes(searchTerm) ||
            log.signature.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesPriority = filterPriority === 'all' || log.priority === filterPriority
        const matchesAction = filterAction === 'all' || log.action === filterAction

        return matchesSearch && matchesPriority && matchesAction
    })

    const stats = {
        total: logs.length,
        high: logs.filter(l => l.priority === 'high').length,
        medium: logs.filter(l => l.priority === 'medium').length,
        low: logs.filter(l => l.priority === 'low').length,
        dropped: logs.filter(l => l.action === 'drop').length,
        alerts: logs.filter(l => l.action === 'alert').length
    }

    const refreshLogs = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await api.get<any>('/admin/snort/logs')
            if ((res as any)?.success && Array.isArray((res as any).data)) {
                setLogs((res as any).data)
            } else {
                setLogs([])
            }
        } catch (e:any) {
            setError(e?.message || 'Snort logları alınamadı')
            setLogs([])
        } finally { setLoading(false) }
    }

    useEffect(()=>{ refreshLogs() }, [])

    const exportLogs = () => {
        alert('Loglar CSV formatında indiriliyor...')
        // Gerçek uygulamada CSV export işlemi yapılır
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                        Snort IDS Logları
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Ağ güvenlik olaylarını izleyin ve analiz edin</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={refreshLogs}
                        className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Yenile</span>
                    </button>
                    <button
                        onClick={exportLogs}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Log</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Yüksek</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.high}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Orta</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.medium}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Düşük</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.low}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Engellendi</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.dropped}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Uyarılar</p>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.alerts}</p>
                </motion.div>
            </div>

            {/* IPS Modu */}
            <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">IPS Modu (Intrusion Prevention System)</h3>
                            <p className="text-red-100 text-sm">Otomatik tehdit engelleme sistemi</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowIpsSettings(true)}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                        >
                            Ayarlar
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={ipsMode}
                                onChange={(e) => setIpsMode(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-red-100 text-xs mb-1">Durum</p>
                        <p className="text-2xl font-bold">
                            {ipsMode ? '🟢 Aktif' : '🔴 Pasif'}
                        </p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-red-100 text-xs mb-1">Engellenen IP</p>
                        <p className="text-2xl font-bold">{stats.dropped}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-red-100 text-xs mb-1">Otomatik Aksiyon</p>
                        <p className="text-2xl font-bold">{ipsSettings.autoBlock ? '✅' : '❌'}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-red-100 text-xs mb-1">Engelleme Süresi</p>
                        <p className="text-2xl font-bold">{ipsSettings.blockDuration}h</p>
                    </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <h4 className="font-semibold mb-3 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        IPS Özellikleri
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${ipsSettings.autoBlock ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span>Otomatik Engelleme</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${ipsSettings.whitelistEnabled ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span>Whitelist Koruması</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${ipsSettings.blacklistEnabled ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span>Blacklist Aktif</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            <span>Gerçek Zamanlı Koruma</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtreler */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="IP, mesaj veya signature ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                            >
                                <option value="all">Tüm Öncelikler</option>
                                <option value="high">Yüksek</option>
                                <option value="medium">Orta</option>
                                <option value="low">Düşük</option>
                            </select>
                        </div>
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                        >
                            <option value="all">Tüm Aksiyonlar</option>
                            <option value="alert">Alert</option>
                            <option value="drop">Drop</option>
                            <option value="pass">Pass</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Log Listesi */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">
                    Güvenlik Olayları ({filteredLogs.length})
                </h3>
                {loading && <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">Yükleniyor...</p>}
                {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>}
                <div className="space-y-3">
                    {filteredLogs.map((log, index) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-xl border-l-4 ${priorityColors[log.priority].border} bg-slate-50 dark:bg-slate-800 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer`}
                            onClick={() => setViewingLog(log)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${priorityColors[log.priority].bg} ${priorityColors[log.priority].text} ${priorityColors[log.priority].border}`}>
                                            <div className={`w-2 h-2 rounded-full ${priorityColors[log.priority].dot} mr-2`}></div>
                                            {log.priority.toUpperCase()}
                                        </span>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${actionColors[log.action].bg} ${actionColors[log.action].text}`}>
                                            {log.action.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{log.timestamp}</span>
                                    </div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{log.message}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{log.signature}</p>
                                    <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                                        <span>🔴 {log.sourceIp}:{log.sourcePort}</span>
                                        <span>→</span>
                                        <span>🟢 {log.destIp}:{log.destPort}</span>
                                        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300">{log.protocol}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setViewingLog(log)
                                    }}
                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                >
                                    <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </button>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2 text-xs text-slate-600 dark:text-slate-300">
                                <span className="font-medium">Sınıflandırma:</span> {log.classification}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filteredLogs.length === 0 && (
                    <div className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">Filtrelere uygun log bulunamadı</p>
                    </div>
                )}
            </div>

            {/* Detay Modal */}
            <AnimatePresence>
                {viewingLog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setViewingLog(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
                        >
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card z-10">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Log Detayları</h3>
                                <button
                                    onClick={() => setViewingLog(null)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Öncelik ve Aksiyon */}
                                <div className="flex items-center space-x-3">
                                    <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${priorityColors[viewingLog.priority].bg} ${priorityColors[viewingLog.priority].text} ${priorityColors[viewingLog.priority].border}`}>
                                        <div className={`w-3 h-3 rounded-full ${priorityColors[viewingLog.priority].dot} mr-2`}></div>
                                        {viewingLog.priority.toUpperCase()} PRIORITY
                                    </span>
                                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${actionColors[viewingLog.action].bg} ${actionColors[viewingLog.action].text}`}>
                                        ACTION: {viewingLog.action.toUpperCase()}
                                    </span>
                                </div>

                                {/* Temel Bilgiler */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Olay Bilgileri</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Zaman Damgası</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{viewingLog.timestamp}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Mesaj</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{viewingLog.message}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Signature</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{viewingLog.signature}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Sınıflandırma</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{viewingLog.classification}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ağ Bilgileri */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
                                        <h4 className="font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center">
                                            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                                            Kaynak (Source)
                                        </h4>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-red-600 dark:text-red-400 mb-1">IP Adresi</p>
                                                <p className="font-bold text-red-800 dark:text-red-300">{viewingLog.sourceIp}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Port</p>
                                                <p className="font-bold text-red-800 dark:text-red-300">{viewingLog.sourcePort}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                                        <h4 className="font-semibold text-green-800 dark:text-green-300 mb-4 flex items-center">
                                            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                            Hedef (Destination)
                                        </h4>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-green-600 dark:text-green-400 mb-1">IP Adresi</p>
                                                <p className="font-bold text-green-800 dark:text-green-300">{viewingLog.destIp}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Port</p>
                                                <p className="font-bold text-green-800 dark:text-green-300">{viewingLog.destPort}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Protokol */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">Protokol</span>
                                        <span className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                                            {viewingLog.protocol}
                                        </span>
                                    </div>
                                </div>

                                {/* Önerilen Aksiyonlar */}
                                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                                    <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        Önerilen Aksiyonlar
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                        <li className="flex items-start">
                                            <span className="text-orange-600 dark:text-orange-400 mr-2">•</span>
                                            <span>Kaynak IP adresini güvenlik duvarında engelleyin</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-orange-600 dark:text-orange-400 mr-2">•</span>
                                            <span>Hedef sistemde güvenlik açığı taraması yapın</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-orange-600 dark:text-orange-400 mr-2">•</span>
                                            <span>Olay raporunu güvenlik ekibine iletin</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => alert('IP adresi engelleniyor...')}
                                        className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
                                    >
                                        IP'yi Engelle
                                    </button>
                                    <button
                                        onClick={() => setViewingLog(null)}
                                        className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* IPS Ayarları Modal */}
            <AnimatePresence>
                {showIpsSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowIpsSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700"
                        >
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <Shield className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
                                    IPS Ayarları
                                </h3>
                                <button
                                    onClick={() => setShowIpsSettings(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Otomatik Engelleme */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center space-x-3">
                                        <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-100">Otomatik Engelleme</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Tehdit tespit edildiğinde otomatik engelle</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ipsSettings.autoBlock}
                                            onChange={(e) => setIpsSettings({ ...ipsSettings, autoBlock: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>

                                {/* Engelleme Süresi */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Engelleme Süresi (saat)
                                    </label>
                                    <select
                                        value={ipsSettings.blockDuration}
                                        onChange={(e) => setIpsSettings({ ...ipsSettings, blockDuration: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="1">1 saat</option>
                                        <option value="6">6 saat</option>
                                        <option value="12">12 saat</option>
                                        <option value="24">24 saat</option>
                                        <option value="72">3 gün</option>
                                        <option value="168">1 hafta</option>
                                        <option value="permanent">Kalıcı</option>
                                    </select>
                                </div>

                                {/* Uyarı Eşiği */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Uyarı Eşiği (kaç deneme sonra engelle)
                                    </label>
                                    <select
                                        value={ipsSettings.alertThreshold}
                                        onChange={(e) => setIpsSettings({ ...ipsSettings, alertThreshold: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="1">1 deneme</option>
                                        <option value="3">3 deneme</option>
                                        <option value="5">5 deneme</option>
                                        <option value="10">10 deneme</option>
                                    </select>
                                </div>

                                {/* Whitelist */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-100">Whitelist Koruması</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Güvenli IP listesini koru</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ipsSettings.whitelistEnabled}
                                            onChange={(e) => setIpsSettings({ ...ipsSettings, whitelistEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {/* Blacklist */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-5 h-5 bg-red-500 rounded-full"></div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-100">Blacklist Aktif</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Kara listedeki IP'leri engelle</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ipsSettings.blacklistEnabled}
                                            onChange={(e) => setIpsSettings({ ...ipsSettings, blacklistEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center">
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Önemli Notlar
                                    </h4>
                                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                                        <li>• IPS modu aktif olduğunda tehditler otomatik engellenir</li>
                                        <li>• Whitelist'teki IP'ler asla engellenmez</li>
                                        <li>• Yüksek öncelikli tehditler anında engellenir</li>
                                        <li>• Engellenen IP'ler log'larda görüntülenebilir</li>
                                    </ul>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowIpsSettings(false)
                                            alert('✅ IPS ayarları kaydedildi!')
                                        }}
                                        className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                                    >
                                        Kaydet
                                    </button>
                                    <button
                                        onClick={() => setShowIpsSettings(false)}
                                        className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
