'use client'

import { useState } from 'react'
import { Sparkles, Search, Filter, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState([
    { 
      id: 1, 
      userName: 'Ahmet Yılmaz', 
      recommendedProducts: [
        { name: 'iPhone 15 Pro', score: 0.95 },
        { name: 'AirPods Pro', score: 0.88 },
        { name: 'Apple Watch', score: 0.82 }
      ],
      generatedAt: '2024-01-15 14:30'
    },
    { 
      id: 2, 
      userName: 'Ayşe Demir', 
      recommendedProducts: [
        { name: 'Samsung Galaxy S24', score: 0.92 },
        { name: 'Galaxy Buds', score: 0.85 },
        { name: 'Galaxy Watch', score: 0.78 }
      ],
      generatedAt: '2024-01-15 15:45'
    },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Ürün Önerileri</h2>
          <p className="text-slate-500 mt-1">AI destekli kişiselleştirilmiş ürün önerileri</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Yeniden Oluştur</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Öneri ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{rec.userName}</h3>
                    <p className="text-xs text-slate-500">Oluşturulma: {rec.generatedAt}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600 mb-2">Önerilen Ürünler:</p>
                {rec.recommendedProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{product.name}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                          style={{ width: `${product.score * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-purple-600">
                        {(product.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
