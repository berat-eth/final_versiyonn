'use client'

import { useState, useEffect } from 'react'
import { Server, Cpu, HardDrive, Activity, Wifi, Database, Zap, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function ServerStats() {
  const [cpuUsage, setCpuUsage] = useState(0)
  const [ramUsage, setRamUsage] = useState(0)
  const [diskUsage, setDiskUsage] = useState(0)
  const [networkSpeed, setNetworkSpeed] = useState(0)
  const [cpuData, setCpuData] = useState<any[]>([])
  const [networkData, setNetworkData] = useState<any[]>([])
  const [servers, setServers] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveSeries, setLiveSeries] = useState<any[]>([])
  const [lastAlertAt, setLastAlertAt] = useState<number>(0)
  const [alertActive, setAlertActive] = useState(false)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/server-stats')
      if ((res as any)?.success && (res as any).data) {
        const d = (res as any).data
        setCpuUsage(d.cpuUsage || 0)
        setRamUsage(d.ramUsage || 0)
        setDiskUsage(d.diskUsage || 0)
        setNetworkSpeed(d.networkSpeed || 0)
        setCpuData(d.cpuHistory || [])
        setNetworkData(d.networkHistory || [])
        setServers(d.servers || [])
        setProcesses(d.processes || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sunucu istatistikleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const timer = setInterval(fetchStats, 45000)
    return () => clearInterval(timer)
  }, [])

  // Eşik aşımı için sesli uyarı ve banner tetikle
  useEffect(() => {
    const cpuHigh = cpuUsage >= 80
    const ramHigh = ramUsage >= 50
    setAlertActive(cpuHigh || ramHigh)

    if (cpuHigh || ramHigh) {
      const now = Date.now()
      if (now - lastAlertAt > 30000) { // 30 sn debounce
        setLastAlertAt(now)
        try {
          const AudioContextCtor: any = (window as any).AudioContext || (window as any).webkitAudioContext
          if (AudioContextCtor) {
            const ctx = new AudioContextCtor()
            const o = ctx.createOscillator()
            const g = ctx.createGain()
            o.type = 'sine'
            o.frequency.value = 880
            o.connect(g)
            g.connect(ctx.destination)
            g.gain.setValueAtTime(0.0001, ctx.currentTime)
            g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
            o.start()
            o.stop(ctx.currentTime + 0.42)
          }
        } catch {}
      }
    }
  }, [cpuUsage, ramUsage])

  // Akan canlı grafik için seri oluştur
  useEffect(() => {
    const point = {
      t: new Date().toLocaleTimeString('tr-TR', { minute: '2-digit', second: '2-digit' }),
      cpu: Number(cpuUsage || 0),
      ram: Number(ramUsage || 0)
    }
    setLiveSeries(prev => {
      const next = [...prev, point]
      if (next.length > 30) next.shift() // son ~5 dakika (10sn aralıkta)
      return next
    })
  }, [cpuUsage, ramUsage])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-700 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'offline': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertCircle className="w-4 h-4" />
      case 'offline': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Sunucu İstatistikleri</h2>
          <p className="text-slate-500 mt-1">Gerçek zamanlı sunucu performans takibi</p>
        </div>
        {!alertActive ? (
          <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 border border-green-200 rounded-xl">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Tüm Sistemler Çalışıyor</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-4 py-2 bg-red-100 border border-red-200 rounded-xl animate-pulse">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Yüksek kullanım uyarısı</span>
          </div>
        )}
      </div>

      {/* Real-time Stats */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{cpuUsage.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-2">CPU Kullanımı</p>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${cpuUsage}%` }}
            ></div>
          </div>
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{ramUsage.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-2">RAM Kullanımı</p>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${ramUsage}%` }}
            ></div>
          </div>
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{(typeof diskUsage === 'number' && diskUsage > 0) ? `${diskUsage}%` : 'N/A'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-2">Disk Kullanımı</p>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, Number(diskUsage)||0))}%` }}
            ></div>
          </div>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Wifi className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{Number(networkSpeed||0) > 0 ? networkSpeed.toFixed(0) : 'N/A'}</p>
              <p className="text-xs text-slate-500">Mbps</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-2">Ağ Hızı</p>
          <div className="flex items-center space-x-2 text-xs">
            <TrendingUp className="w-3 h-3 text-green-600" />
            <span className="text-slate-600">Download: {Number(networkSpeed||0) > 0 ? networkSpeed.toFixed(0) : 0} Mbps</span>
          </div>
        </motion.div>
      </div>

      {/* Akan Canlı Grafik (CPU/RAM) */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Canlı CPU ve RAM</h3>
        <p className="text-slate-500 text-sm mb-4">Son ölçümler • 10sn aralık</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={liveSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="t" stroke="#94a3b8" interval={4} />
            <YAxis stroke="#94a3b8" domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="cpu" stroke="#ef4444" fill="#ef444433" strokeWidth={2} isAnimationActive />
            <Line type="monotone" dataKey="ram" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-2">CPU Kullanımı</h3>
          <p className="text-slate-500 text-sm mb-4">1, 5 ve 15 dk ortalamaları</p>
          <ResponsiveContainer width="100%" height={260}>
            {cpuData && cpuData.length > 0 ? (
            <ComposedChart data={cpuData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Bar dataKey="load1" barSize={18} fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="load5" barSize={18} fill="#8b5cf6" radius={[4,4,0,0]} />
              <Line type="monotone" dataKey="load15" stroke="#ef4444" strokeWidth={2} dot={false} />
            </ComposedChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Ağ Trafiği</h3>
          <p className="text-slate-500 text-sm mb-4">Download/Upload (Mbps)</p>
          <ResponsiveContainer width="100%" height={260}>
            {networkData && networkData.length > 0 ? (
            <ComposedChart data={networkData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="download" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
              <Line type="monotone" dataKey="upload" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </ComposedChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Server List */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Sunucu Durumu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server, index) => (
            <motion.div
              key={server.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{server.name}</p>
                    <p className="text-xs text-slate-500">{server.ip}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(server.status)}`}>
                  {getStatusIcon(server.status)}
                  <span className="capitalize">{server.status}</span>
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Uptime</span>
                  <span className="font-semibold text-slate-800">{server.uptime}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Load</span>
                  <span className="font-semibold text-slate-800">{server.load}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      server.load > 70 ? 'bg-red-500' : server.load > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${server.load}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Process List */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Çalışan Süreçler</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Süreç</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">CPU %</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Bellek (MB)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processes.map((process, index) => (
                <motion.tr
                  key={process.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-800">{process.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{process.cpu}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{process.memory} MB</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      <span>Çalışıyor</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Durdur
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Info removed (mock veriler kaldırıldı) */}
    </div>
  )
}
