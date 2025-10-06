'use client'

import { useState } from 'react'
import { FileCheck, CheckCircle, Clock, AlertCircle, Calendar, User } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CRMTasks() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [tasks] = useState<any[]>([])

  const priorityColors = {
    'Yüksek': 'bg-red-100 text-red-700 border-red-200',
    'Orta': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Düşük': 'bg-green-100 text-green-700 border-green-200',
  }

  const statusColors = {
    'Tamamlandı': 'bg-green-100 text-green-700',
    'Devam Ediyor': 'bg-blue-100 text-blue-700',
    'Bekliyor': 'bg-yellow-100 text-yellow-700',
  }

  // İstatistik kartları kaldırıldı (mock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">CRM Görevleri</h2>
          <p className="text-slate-500 mt-1">Görevlerinizi takip edin ve yönetin</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium">
          Yeni Görev Ekle
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Aktif Görevler</h3>
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-800 mb-2">{task.title}</h4>
                  <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                      {task.priority}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusColors[task.status as keyof typeof statusColors]}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {task.assignee}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {task.dueDate}
                  </span>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow text-sm">
                  Detay
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
