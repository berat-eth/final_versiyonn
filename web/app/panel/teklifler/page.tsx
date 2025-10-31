'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function QuotesPage() {
  // TODO: Backend'den teklif takip endpoint'i eklendikten sonra entegre edilecek
  const [quotes] = useState<any[]>([])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Tekliflerim
        </h1>
        <Link
          href="/teklif-al"
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Yeni Teklif İste
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
          description
        </span>
        <p className="text-gray-600 dark:text-gray-400 mb-2">Henüz teklif talebiniz yok</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Özel üretim için teklif almak için yeni bir talep oluşturabilirsiniz.
        </p>
        <Link
          href="/teklif-al"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Yeni Teklif İste
        </Link>
      </div>
    </div>
  )
}

