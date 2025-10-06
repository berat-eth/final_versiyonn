'use client'

import { useState } from 'react'
import { TrendingUp, DollarSign, Target, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CRMPipeline() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const stages: any[] = []

  // İstatistik kartları kaldırıldı (mock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Satış Hunisi</h2>
          <p className="text-slate-500 mt-1">Satış sürecinizi görselleştirin</p>
        </div>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Satış Aşamaları</h3>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className={`bg-gradient-to-r ${stage.color} rounded-xl p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold mb-2">{stage.name}</h4>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm opacity-90">{stage.count} Fırsat</span>
                      <span className="text-sm opacity-90">₺{stage.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">₺{Math.round(stage.value / stage.count / 1000)}K</p>
                    <p className="text-sm opacity-90">Ort. Değer</p>
                  </div>
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="flex justify-center my-2">
                  <ArrowRight className="w-6 h-6 text-slate-400" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
