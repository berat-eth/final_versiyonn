'use client'

import React, { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Search, Filter, Download, Eye, X, RefreshCw, Clock, Activity, TrendingUp, Ban, CheckCircle, Info, Zap, Globe, Server } from 'lucide-react'
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
    const [logs, setLogs] = useState<SnortLog[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewingLog, setViewingLog] = useState<SnortLog | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterPriority, setFilterPriority] = useState('all')
    const [filterAction, setFilterAction] = useState('all')
    const [autoRefresh, setAutoRefresh] = useState(false)

    const priorityConfig = {
        high: { 
            label: 'Yüksek', 
            color: 'red', 
            icon: AlertTriangle,
            gradient: 'from-red-500 to-rose-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
            text: 'text-red-700 dark:text-red-300',
            border: 'border-red-200 dark:border-red-800',
            dot: 'bg-red-500'
        },
        medium: { 
            label: 'Orta', 
            color: 'orange', 
            icon: AlertTriangle,
            gradient: 'from-orange-500 to-amber-600',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            text: 'text-orange-700 dark:text-orange-300',
            border: 'border-orange-200 dark:border-orange-800',
            dot: 'bg-orange-500'
        },
        low: { 
            label: 'Düşük', 
            color: 'blue', 
            icon: Info,
            gradient: 'from-blue-500 to-cyan-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-700 dark:text-blue-300',
            border: 'border-blue-200 dark:border-blue-800',
            dot: 'bg-blue-500'
        }
    }

    const actionConfig = {
        alert: { 
            label: 'Uyarı', 
            icon: AlertTriangle,
            bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
            text: 'text-yellow-700 dark:text-yellow-400',
            border: 'border-yellow-300 dark:border-yellow-700'
        },
        drop: { 
            label: 'Engellendi', 
            icon: Ban,
            bg: 'bg-red-100 dark:bg-red-900/30', 
            text: 'text-red-700 dark:text-red-400',
            border: 'border-red-300 dark:border-red-700'
        },
        pass: { 
            label: 'Geçti', 
            icon: CheckCircle,
            bg: 'bg-green-100 dark:bg-green-900/30', 
            text: 'text-green-700 dark:text-green-400',
            border: 'border-green-300 dark:border-green-700'
        }
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.sourceIp.includes(searchTerm) ||
            log.destIp.includes(searchTerm) ||
            log.signature.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.classification.toLowerCase().includes(searchTerm.toLowerCase())

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
        alerts: logs.filter(l => l.action === 'alert').length,
        passed: logs.filter(l => l.action === 'pass').length
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
        } catch (e: any) {
            setError(e?.message || 'Snort logları alınamadı')
            setLogs([])
        } finally { 
            setLoading(false) 
        }
    }

    useEffect(() => {
        refreshLogs()
    }, [])

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(refreshLogs, 30000) // 30 saniyede bir
            return () => clearInterval(interval)
        }
    }, [autoRefresh])

    const exportLogs = () => {
        const csv = [
            ['ID', 'Zaman', 'Öncelik', 'Aksiyon', 'Kaynak IP', 'Hedef IP', 'Protokol', 'Mesaj', 'Signature'].join(','),
            ...filteredLogs.map(log => [
                log.id,
                log.timestamp,
                log.priority,
                log.action,
                log.sourceIp,
                log.destIp,
                log.protocol,
                `"${log.message.replace(/"/g, '""')}"`,
                `"${log.signature.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n')
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `snort-logs-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
    }

    const blockIP = async (ip: string, reason?: string) => {
        if (!ip) return
        
        try {
            setLoading(true)
            setError(null)
            
            const response = await api.post('/admin/ip/block', {
                ip,
                reason: reason || `Snort IDS - ${viewingLog?.message || 'Security threat detected'}`
            })
            
            if ((response as any)?.success) {
                alert(`✅ IP adresi ${ip} başarıyla engellendi!`)
                setViewingLog(null)
                // Logları yenile
                await refreshLogs()
            } else {
                throw new Error((response as any)?.message || 'IP engelleme başarısız')
            }
        } catch (e: any) {
            const errorMsg = e?.response?.data?.message || e?.message || 'IP engelleme hatası'
            setError(errorMsg)
            alert(`❌ Hata: ${errorMsg}`)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp)
            return date.toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        } catch {
            return timestamp
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        Snort IDS Logları
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Ağ güvenlik olaylarını izleyin ve analiz edin</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Otomatik Yenile</span>
                    </label>
                    <button
                        onClick={refreshLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="text-slate-700 dark:text-slate-300">Yenile</span>
                    </button>
                    <button
                        onClick={exportLogs}
                        disabled={filteredLogs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        <span>Dışa Aktar</span>
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Toplam</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
                </motion.div>
                
                {(['high', 'medium', 'low'] as const).map((priority, idx) => {
                    const config = priorityConfig[priority]
                    const Icon = config.icon
                    return (
                        <motion.div
                            key={priority}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`bg-gradient-to-br ${config.gradient} rounded-2xl p-5 text-white shadow-lg`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-4 h-4" />
                                <p className="text-xs font-medium opacity-90 uppercase">{config.label}</p>
                            </div>
                            <p className="text-2xl font-bold">{stats[priority]}</p>
                        </motion.div>
                    )
                })}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Ban className="w-4 h-4" />
                        <p className="text-xs font-medium opacity-90 uppercase">Engellendi</p>
                    </div>
                    <p className="text-2xl font-bold">{stats.dropped}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <p className="text-xs font-medium opacity-90 uppercase">Uyarılar</p>
                    </div>
                    <p className="text-2xl font-bold">{stats.alerts}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <p className="text-xs font-medium opacity-90 uppercase">Geçti</p>
                    </div>
                    <p className="text-2xl font-bold">{stats.passed}</p>
                </motion.div>
            </div>

            {/* Filtreler ve Arama */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="IP, mesaj, signature veya sınıflandırma ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 appearance-none cursor-pointer min-w-[140px]"
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
                            className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 cursor-pointer min-w-[140px]"
                        >
                            <option value="all">Tüm Aksiyonlar</option>
                            <option value="alert">Uyarı</option>
                            <option value="drop">Engellendi</option>
                            <option value="pass">Geçti</option>
                        </select>
                    </div>
                </div>

                {filteredLogs.length !== logs.length && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>{filteredLogs.length}</strong> log gösteriliyor (toplam {logs.length})
                        </p>
                    </div>
                )}
            </div>

            {/* Log Listesi */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Güvenlik Olayları
                        </h3>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                            {filteredLogs.length} kayıt
                        </span>
                    </div>
                </div>

                {loading && (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">Loglar yükleniyor...</p>
                    </div>
                )}

                {error && (
                    <div className="p-6 m-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <p className="text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        <AnimatePresence>
                            {filteredLogs.map((log, index) => {
                                const priorityConf = priorityConfig[log.priority]
                                const actionConf = actionConfig[log.action]
                                const ActionIcon = actionConf.icon
                                
                                return (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        onClick={() => setViewingLog(log)}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Öncelik Badge */}
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${priorityConf.bg} ${priorityConf.border} border-2 flex items-center justify-center`}>
                                                <div className={`w-3 h-3 rounded-full ${priorityConf.dot}`} />
                                            </div>

                                            {/* İçerik */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${priorityConf.bg} ${priorityConf.text} ${priorityConf.border} border`}>
                                                                {priorityConf.label}
                                                            </span>
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${actionConf.bg} ${actionConf.text} ${actionConf.border} border`}>
                                                                {React.createElement(actionConf.icon, { className: "w-3 h-3" })}
                                                                {actionConf.label}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-mono">
                                                                {log.protocol}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-1">
                                                            {log.message}
                                                        </h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-1">
                                                            {log.signature}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setViewingLog(log)
                                                        }}
                                                        className="flex-shrink-0 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </button>
                                                </div>

                                                {/* Ağ Bilgileri */}
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                                        <Server className="w-4 h-4" />
                                                        <span className="font-mono">{log.sourceIp}:{log.sourcePort}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            const reason = `Snort IDS - ${log.priority} priority - ${log.classification}`
                                                            blockIP(log.sourceIp, reason)
                                                        }}
                                                        disabled={loading}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
                                                        title="IP'yi Engelle"
                                                    >
                                                        <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                    </button>
                                                    <span className="text-slate-400">→</span>
                                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                        <Globe className="w-4 h-4" />
                                                        <span className="font-mono">{log.destIp}:{log.destPort}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 ml-auto">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span className="text-xs">{formatTime(log.timestamp)}</span>
                                                    </div>
                                                </div>

                                                {/* Sınıflandırma */}
                                                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        <strong>Sınıflandırma:</strong> {log.classification}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}

                {!loading && !error && filteredLogs.length === 0 && (
                    <div className="text-center py-16">
                        <AlertTriangle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium mb-2">Log bulunamadı</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm">
                            {searchTerm || filterPriority !== 'all' || filterAction !== 'all' 
                                ? 'Filtrelere uygun log bulunamadı. Filtreleri temizlemeyi deneyin.'
                                : 'Henüz log kaydı bulunmuyor.'}
                        </p>
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setViewingLog(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${priorityConfig[viewingLog.priority].bg}`}>
                                        <Shield className={`w-6 h-6 ${priorityConfig[viewingLog.priority].text}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Log Detayları</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">ID: #{viewingLog.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingLog(null)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Öncelik ve Aksiyon */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${priorityConfig[viewingLog.priority].bg} ${priorityConfig[viewingLog.priority].text} ${priorityConfig[viewingLog.priority].border} border-2`}>
                                        <div className={`w-2 h-2 rounded-full ${priorityConfig[viewingLog.priority].dot}`} />
                                        {priorityConfig[viewingLog.priority].label} Öncelik
                                    </span>
                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${actionConfig[viewingLog.action].bg} ${actionConfig[viewingLog.action].text} ${actionConfig[viewingLog.action].border} border`}>
                                        {React.createElement(actionConfig[viewingLog.action].icon, { className: "w-4 h-4" })}
                                        {actionConfig[viewingLog.action].label}
                                    </span>
                                </div>

                                {/* Temel Bilgiler */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Zaman Damgası</p>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            {formatTime(viewingLog.timestamp)}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Protokol</p>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
                                            {viewingLog.protocol}
                                        </p>
                                    </div>
                                </div>

                                {/* Mesaj ve Signature */}
                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">Mesaj</p>
                                        <p className="text-sm text-slate-800 dark:text-slate-100">{viewingLog.message}</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">Signature</p>
                                        <p className="text-sm font-mono text-slate-800 dark:text-slate-100 break-all">{viewingLog.signature}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Sınıflandırma</p>
                                        <p className="text-sm text-slate-800 dark:text-slate-100">{viewingLog.classification}</p>
                                    </div>
                                </div>

                                {/* Ağ Bilgileri */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border-2 border-red-200 dark:border-red-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                                            <h4 className="font-semibold text-red-800 dark:text-red-300">Kaynak (Source)</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-red-600 dark:text-red-400 mb-1">IP Adresi</p>
                                                <p className="text-base font-bold font-mono text-red-800 dark:text-red-300">{viewingLog.sourceIp}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Port</p>
                                                <p className="text-base font-bold text-red-800 dark:text-red-300">{viewingLog.sourcePort}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border-2 border-green-200 dark:border-green-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                                            <h4 className="font-semibold text-green-800 dark:text-green-300">Hedef (Destination)</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-green-600 dark:text-green-400 mb-1">IP Adresi</p>
                                                <p className="text-base font-bold font-mono text-green-800 dark:text-green-300">{viewingLog.destIp}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Port</p>
                                                <p className="text-base font-bold text-green-800 dark:text-green-300">{viewingLog.destPort}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Önerilen Aksiyonlar */}
                                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
                                    <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Önerilen Aksiyonlar
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                                            <span>Kaynak IP adresini güvenlik duvarında engelleyin</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                                            <span>Hedef sistemde güvenlik açığı taraması yapın</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                                            <span>Olay raporunu güvenlik ekibine iletin</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex gap-3">
                                <button
                                    onClick={() => {
                                        if (viewingLog) {
                                            const reason = `Snort IDS - ${viewingLog.priority} priority - ${viewingLog.classification}`
                                            blockIP(viewingLog.sourceIp, reason)
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Ban className="w-5 h-5" />
                                    {loading ? 'Engelleniyor...' : 'IP\'yi Engelle'}
                                </button>
                                <button
                                    onClick={() => setViewingLog(null)}
                                    disabled={loading}
                                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Kapat
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
