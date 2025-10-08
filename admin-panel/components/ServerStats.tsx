'use client'

import { useState, useEffect } from 'react'
import { Server, Cpu, HardDrive, Activity, Wifi, Database, Zap, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, MapPin, Mail, Container } from 'lucide-react'
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
  const [processes, setProcesses] = useState<any[]>([
    {
      name: 'FTP Server',
      cpu: 2.3,
      memory: 45,
      status: 'running'
    },
    {
      name: 'SSH Daemon',
      cpu: 1.8,
      memory: 32,
      status: 'running'
    }
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveSeries, setLiveSeries] = useState<any[]>([])
  const [lastAlertAt, setLastAlertAt] = useState<number>(0)
  const [alertActive, setAlertActive] = useState(false)
  const [visitorIps, setVisitorIps] = useState<any[]>([])
  const [loadingVisitors, setLoadingVisitors] = useState(false)

  // Ek: Mock altyapı servis istatistikleri (Veritabanı, Mail, Redis)
  const [dbStats, setDbStats] = useState<any>({
    connections: 0,
    qps: 0, // queries per second
    replicationLagMs: 0,
    status: 'online',
    uptime: '0g 0s',
    load: 0
  })
  const [mailStats, setMailStats] = useState<any>({
    sentPerMin: 0,
    queue: 0,
    bounceRate: 0,
    status: 'online',
    uptime: '0g 0s',
    load: 0
  })
  const [redisStats, setRedisStats] = useState<any>({
    memoryMb: 0,
    opsPerSec: 0,
    hitRate: 0,
    status: 'online',
    uptime: '0g 0s',
    load: 0
  })
  const [snortStats, setSnortStats] = useState<any>({
    totalLogs: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    dropped: 0,
    alerts: 0,
    blocked: 0,
    status: 'crashed',
    uptime: '0g 0s',
    load: 0
  })
  const [dockerStats, setDockerStats] = useState<any>({
    runningContainers: 0,
    totalContainers: 0,
    imagesCount: 0,
    diskUsage: 0,
    status: 'online',
    uptime: '0g 0s',
    load: 0
  })

  // Mock üretim yardımcıları
  const randomBetween = (min: number, max: number) => Math.round(min + Math.random() * (max - min))
  const randomFloat = (min: number, max: number, frac: number = 1) => Number((min + Math.random() * (max - min)).toFixed(frac))
  const randomUptime = () => {
    const d = randomBetween(0, 20)
    const h = randomBetween(0, 23)
    return `${d}g ${h}s`
  }

  useEffect(() => {
    const generate = () => {
      // Veritabanı
      const db = {
        connections: randomBetween(40, 220),
        qps: randomBetween(120, 950),
        replicationLagMs: randomBetween(0, 250),
        status: Math.random() > 0.96 ? 'warning' : 'online',
        uptime: randomUptime(),
        load: randomBetween(5, 95)
      }
      setDbStats(db)

      // Mail sunucusu
      const mail = {
        sentPerMin: randomBetween(20, 180),
        queue: randomBetween(0, 120),
        bounceRate: randomFloat(0.5, 6.5, 1),
        status: Math.random() > 0.97 ? 'warning' : 'online',
        uptime: randomUptime(),
        load: randomBetween(5, 95)
      }
      setMailStats(mail)

      // Redis
      const redis = {
        memoryMb: randomBetween(150, 1600),
        opsPerSec: randomBetween(2_000, 25_000),
        hitRate: randomFloat(75, 99, 1),
        status: Math.random() > 0.97 ? 'warning' : 'online',
        uptime: randomUptime(),
        load: randomBetween(5, 95)
      }
      setRedisStats(redis)

      // Snort IDS
      const snortStatus = Math.random() > 0.85 ? 'crashed' : Math.random() > 0.95 ? 'warning' : 'online'
      const snort = {
        totalLogs: randomBetween(500, 5000),
        highPriority: randomBetween(5, 50),
        mediumPriority: randomBetween(20, 200),
        lowPriority: randomBetween(100, 1000),
        dropped: randomBetween(0, 50),
        alerts: randomBetween(10, 100),
        blocked: randomBetween(5, 30),
        status: snortStatus,
        uptime: snortStatus === 'crashed' ? '0g 0s' : randomUptime(),
        load: snortStatus === 'crashed' ? 0 : randomBetween(5, 95)
      }
      setSnortStats(snort)

      // Docker
      const dockerStatus = Math.random() > 0.95 ? 'warning' : 'online'
      const docker = {
        runningContainers: randomBetween(3, 15),
        totalContainers: randomBetween(8, 25),
        imagesCount: randomBetween(5, 20),
        diskUsage: randomFloat(2.5, 15.8, 1),
        status: dockerStatus,
        uptime: randomUptime(),
        load: randomBetween(5, 95)
      }
      setDockerStats(docker)
    }

    generate()
    const t = setInterval(generate, 10000)
    return () => clearInterval(t)
  }, [])

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
        // FTP ve SSH süreçlerini koru, API'den gelen süreçlerle birleştir
        const apiProcesses = d.processes || []
        const defaultProcesses = [
          {
            name: 'FTP Server',
            cpu: 2.3,
            memory: 45,
            status: 'running'
          },
          {
            name: 'SSH Daemon',
            cpu: 1.8,
            memory: 32,
            status: 'running'
          }
        ]
        setProcesses([...defaultProcesses, ...apiProcesses])
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

  // Ziyaretçi IP / Konum verileri
  const fetchVisitorIps = async () => {
    try {
      setLoadingVisitors(true)
      // Öncelikle özel bir uç dene; yoksa live-views'tan türet
      try {
        const res = await api.get<any>('/admin/visitor-ips')
        if ((res as any)?.success && Array.isArray((res as any).data)) {
          setVisitorIps((res as any).data)
          return
        }
      } catch {}

      // Fallback: live-views üzerinden en son görüntülemeleri çek ve ip/location alanlarını güvenli şekilde çıkar
      try {
        const live = await api.get<any>('/admin/live-views')
        if ((live as any)?.success && Array.isArray((live as any).data)) {
          const mapped = ((live as any).data as any[]).map((v: any) => ({
            ip: v.ip || v.ipAddress || '-',
            location: v.location || v.geo || { city: v.city || '-', country: v.country || '-' },
            lastSeen: v.viewedAt || v.timestamp || v.lastSeen || null,
            hits: v.dwellSeconds ? 1 : (v.hits || 1),
            userId: v.userId || null,
          }))
          // Aynı IP'leri grupla ve en güncel zamanı/hit toplamını al
          const byIp: Record<string, any> = {}
          for (const item of mapped) {
            const key = item.ip || 'unknown'
            if (!byIp[key]) {
              byIp[key] = { ...item }
            } else {
              byIp[key].hits = (byIp[key].hits || 0) + (item.hits || 0)
              const prev = byIp[key].lastSeen ? new Date(byIp[key].lastSeen).getTime() : 0
              const cur = item.lastSeen ? new Date(item.lastSeen).getTime() : 0
              if (cur > prev) byIp[key].lastSeen = item.lastSeen
            }
          }
          setVisitorIps(Object.values(byIp))
        } else {
          setVisitorIps([])
        }
      } catch {
        setVisitorIps([])
      }
    } finally {
      setLoadingVisitors(false)
    }
  }

  useEffect(() => {
    fetchVisitorIps()
    const t = setInterval(fetchVisitorIps, 60000)
    return () => clearInterval(t)
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
      ram: Number(ramUsage || 0),
      disk: Number(diskUsage || 0)
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
      case 'crashed': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertCircle className="w-4 h-4" />
      case 'offline': return <AlertCircle className="w-4 h-4" />
      case 'crashed': return <AlertCircle className="w-4 h-4" />
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
        <div
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
        </div>

        <div
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
        </div>

        <div
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
        </div>
        <div
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
        </div>
      </div>

      {/* Akan Canlı Grafik (CPU/RAM/Disk) */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Canlı CPU, RAM ve Disk</h3>
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
            <Line type="monotone" dataKey="disk" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive />
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

      {/* Altyapı kartları, aşağıdaki Sunucu Durumu ile tek grid altında birleşecek */}

      {/* Server List */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Altyapı ve Sunucu Durumu</h3>
          <div className="flex items-center gap-2">
            {/* Ortalama Load */}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ortalama Load:</span>
              <span className="font-semibold text-slate-900">
                {servers && servers.length > 0
                  ? Math.round(servers.reduce((acc: number, s: any) => acc + (Number(s.load) || 0), 0) / servers.length)
                  : 0}%
              </span>
            </span>
            {/* Uptime (ilk sunucudan) */}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Uptime:</span>
              <span className="font-semibold text-slate-900">{servers && servers[0]?.uptime ? servers[0].uptime : 'N/A'}</span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Veritabanı */}
          <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Veritabanı</p>
                  <p className="text-xs text-slate-500">PostgreSQL/MySQL</p>
                </div>
              </div>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(dbStats.status)}`}>
                {getStatusIcon(dbStats.status)}
                <span className="capitalize">{dbStats.status}</span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Uptime</span>
                <span className="font-semibold text-slate-800">{dbStats.uptime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Load</span>
                <span className="font-semibold text-slate-800">{dbStats.load}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${dbStats.load > 70 ? 'bg-red-500' : dbStats.load > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${dbStats.load}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500">Conn</span><span className="font-semibold text-slate-800">{dbStats.connections}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">QPS</span><span className="font-semibold text-slate-800">{dbStats.qps}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Repl Lag</span><span className="font-semibold text-slate-800">{dbStats.replicationLagMs} ms</span></div>
              </div>
            </div>
          </div>

          {/* Mail */}
          <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Mail Sunucusu</p>
                  <p className="text-xs text-slate-500">SMTP</p>
                </div>
              </div>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(mailStats.status)}`}>
                {getStatusIcon(mailStats.status)}
                <span className="capitalize">{mailStats.status}</span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Uptime</span>
                <span className="font-semibold text-slate-800">{mailStats.uptime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Load</span>
                <span className="font-semibold text-slate-800">{mailStats.load}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${mailStats.load > 70 ? 'bg-red-500' : mailStats.load > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${mailStats.load}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500">Dk Gönderim</span><span className="font-semibold text-slate-800">{mailStats.sentPerMin}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Kuyruk</span><span className="font-semibold text-slate-800">{mailStats.queue}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Bounce</span><span className="font-semibold text-slate-800">{mailStats.bounceRate}%</span></div>
              </div>
            </div>
          </div>

          {/* Redis */}
          <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Redis</p>
                  <p className="text-xs text-slate-500">Cache</p>
                </div>
              </div>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(redisStats.status)}`}>
                {getStatusIcon(redisStats.status)}
                <span className="capitalize">{redisStats.status}</span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Uptime</span>
                <span className="font-semibold text-slate-800">{redisStats.uptime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Load</span>
                <span className="font-semibold text-slate-800">{redisStats.load}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${redisStats.load > 70 ? 'bg-red-500' : redisStats.load > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${redisStats.load}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500">Bellek</span><span className="font-semibold text-slate-800">{redisStats.memoryMb} MB</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Ops/sn</span><span className="font-semibold text-slate-800">{redisStats.opsPerSec}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Hit</span><span className="font-semibold text-slate-800">{redisStats.hitRate}%</span></div>
              </div>
            </div>
          </div>

          {/* Snort IDS */}
          <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Snort IDS</p>
                  <p className="text-xs text-slate-500">Güvenlik</p>
                </div>
              </div>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(snortStats.status)}`}>
                {getStatusIcon(snortStats.status)}
                <span className="capitalize">{snortStats.status}</span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Uptime</span>
                <span className="font-semibold text-slate-800">{snortStats.uptime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Load</span>
                <span className="font-semibold text-slate-800">{snortStats.load}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${snortStats.load > 70 ? 'bg-red-500' : snortStats.load > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${snortStats.load}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500">Loglar</span><span className="font-semibold text-slate-800">{snortStats.totalLogs}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Uyarı</span><span className="font-semibold text-slate-800">{snortStats.alerts}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Engellenen</span><span className="font-semibold text-slate-800">{snortStats.blocked}</span></div>
              </div>
            </div>
          </div>

          {/* Docker */}
          <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Container className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Docker</p>
                  <p className="text-xs text-slate-500">Container</p>
                </div>
              </div>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(dockerStats.status)}`}>
                {getStatusIcon(dockerStats.status)}
                <span className="capitalize">{dockerStats.status}</span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Uptime</span>
                <span className="font-semibold text-slate-800">{dockerStats.uptime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Load</span>
                <span className="font-semibold text-slate-800">{dockerStats.load}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${dockerStats.load > 70 ? 'bg-red-500' : dockerStats.load > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${dockerStats.load}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500">Çalışan</span><span className="font-semibold text-slate-800">{dockerStats.runningContainers}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Toplam</span><span className="font-semibold text-slate-800">{dockerStats.totalContainers}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Disk</span><span className="font-semibold text-slate-800">{dockerStats.diskUsage}GB</span></div>
              </div>
            </div>
          </div>
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

      {/* Visitor IPs and Locations */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-800">Ziyaretçi IP'leri ve Konumları</h3>
          {loadingVisitors && (
            <span className="text-xs text-slate-500">Yükleniyor...</span>
          )}
        </div>
        {visitorIps && visitorIps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">IP Adresi</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Konum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Son Görülme</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Hit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitorIps.slice(0, 50).map((v: any, i: number) => (
                  <tr key={(v.ip || 'unknown') + '_' + i} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="font-semibold text-slate-800">{v.ip || '-'}</div>
                      {v.userId ? (
                        <div className="text-xs text-slate-500">User #{v.userId}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-2 text-slate-700">
                        <MapPin className="w-4 h-4 text-rose-600" />
                        <span className="text-sm font-medium">
                          {(
                            (v.location && (v.location.city || v.location.town || v.location.state)) || '-' 
                          )}
                        </span>
                        <span className="text-xs text-slate-500">
                          {v.location && v.location.country ? `• ${v.location.country}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700">{v.lastSeen ? new Date(v.lastSeen).toLocaleString('tr-TR') : '-'}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-slate-800">{v.hits || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Kayıt bulunamadı</div>
        )}
      </div>

      {/* System Info removed (mock veriler kaldırıldı) */}
    </div>
  )
}
