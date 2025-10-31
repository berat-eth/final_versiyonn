'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function FavoritesPage() {
  // TODO: Backend'den favori ürünler endpoint'i eklendikten sonra entegre edilecek
  const [favorites] = useState<any[]>([])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
        Favorilerim
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
          favorite
        </span>
        <p className="text-gray-600 dark:text-gray-400 mb-2">Henüz favori ürününüz yok</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Beğendiğiniz ürünleri favorilerinize ekleyerek daha sonra kolayca bulabilirsiniz.
        </p>
        <Link
          href="/urunler"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
        >
          Ürünleri Keşfet
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>
    </div>
  )
}

