'use client'

import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUp, ArrowDown, Calendar } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { motion } from 'framer-motion'

// Mock veriler kaldırıldı - Backend entegrasyonu için hazır
const monthlyData: any[] = []
const customerBehavior: any[] = []
const categoryPerformance: any[] = []
const customerSegments: any[] = []

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Detaylı Analitik</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">İşletmenizin derinlemesine analizi</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4" />
            <span>Tarih Seç</span>
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow">
            Rapor İndir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Gelir & Gider Analizi</h3>
          <ResponsiveContainer width="100%" height={300}>
            {monthlyData && monthlyData.length > 0 ? (
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }}
              />
              <Legend />
              <Bar dataKey="gelir" fill="#667eea" radius={[8, 8, 0, 0]} />
              <Bar dataKey="gider" fill="#f093fb" radius={[8, 8, 0, 0]} />
              <Bar dataKey="kar" fill="#43e97b" radius={[8, 8, 0, 0]} />
            </BarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Müşteri Davranış Analizi</h3>
          <ResponsiveContainer width="100%" height={300}>
            {customerBehavior && customerBehavior.length > 0 ? (
            <RadarChart data={customerBehavior}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="category" stroke="#64748b" />
              <PolarRadiusAxis stroke="#94a3b8" />
              <Radar name="Puan" dataKey="value" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">92%</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Memnuniyet</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">78%</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Tekrar Alım</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Kategori Performansı</h3>
        <ResponsiveContainer width="100%" height={350}>
          {categoryPerformance && categoryPerformance.length > 0 ? (
          <AreaChart data={categoryPerformance}>
            <defs>
              <linearGradient id="colorSatis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSiparis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f093fb" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f093fb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="satis" stroke="#667eea" strokeWidth={2} fillOpacity={1} fill="url(#colorSatis)" />
            <Area type="monotone" dataKey="siparis" stroke="#f093fb" strokeWidth={2} fillOpacity={1} fill="url(#colorSiparis)" />
          </AreaChart>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
          )}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {customerSegments.map((segment, index) => (
          <motion.div
            key={segment.segment}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 card-hover"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${segment.color} rounded-xl flex items-center justify-center mb-4`}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{segment.segment}</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Müşteri</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{segment.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Gelir</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₺{(segment.revenue / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Ort. Sipariş</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₺{segment.avgOrder}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Büyüme</span>
                <div className="flex items-center space-x-1">
                  <ArrowUp className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-600">+{(Math.random() * 20 + 5).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Dönüşüm Oranı</h4>
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-2">3.8%</p>
          <p className="text-blue-100 text-sm">Ziyaretçiden müşteriye</p>
          <div className="mt-4 pt-4 border-t border-blue-400">
            <div className="flex items-center justify-between text-sm">
              <span>Geçen ay</span>
              <span className="font-semibold">3.2%</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Sepet Ortalaması</h4>
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-2">₺1,245</p>
          <p className="text-green-100 text-sm">Ortalama sipariş değeri</p>
          <div className="mt-4 pt-4 border-t border-green-400">
            <div className="flex items-center justify-between text-sm">
              <span>Geçen ay</span>
              <span className="font-semibold">₺1,180</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Müşteri Yaşam Değeri</h4>
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-2">₺8,450</p>
          <p className="text-purple-100 text-sm">Ortalama CLV</p>
          <div className="mt-4 pt-4 border-t border-purple-400">
            <div className="flex items-center justify-between text-sm">
              <span>Geçen ay</span>
              <span className="font-semibold">₺7,890</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
