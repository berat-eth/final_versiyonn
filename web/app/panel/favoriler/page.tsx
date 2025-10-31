'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { favoritesApi } from '@/utils/api'

interface FavoriteProduct {
  id: number;
  productId: number;
  name: string;
  price: number;
  image?: string;
  stock?: number;
  description?: string;
  createdAt: string;
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadFavorites()
    }
  }, [user])

  const loadFavorites = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await favoritesApi.getUserFavorites(user.id)
      if (response.success && response.data) {
        setFavorites(response.data)
      }
    } catch (error) {
      console.error('Favoriler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (favoriteId: number) => {
    if (!user?.id) return
    if (!confirm('Bu ürünü favorilerden kaldırmak istediğinize emin misiniz?')) return
    
    try {
      setRemoving(favoriteId)
      await favoritesApi.removeFromFavorites(favoriteId, user.id)
      await loadFavorites()
    } catch (error) {
      console.error('Favori kaldırılamadı:', error)
      alert('Favori kaldırılamadı. Lütfen tekrar deneyin.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
        Favorilerim
      </h1>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Favoriler yükleniyor...</p>
        </div>
      ) : favorites.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all"
            >
              <Link href={`/urunler/${favorite.productId}`}>
                {favorite.image ? (
                  <Image
                    src={favorite.image}
                    alt={favorite.name}
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-gray-400">image</span>
                  </div>
                )}
              </Link>
              
              <div className="p-6">
                <Link href={`/urunler/${favorite.productId}`}>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {favorite.name}
                  </h3>
                </Link>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400 mb-4">
                  {favorite.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
                <button
                  onClick={() => handleRemove(favorite.id)}
                  disabled={removing === favorite.id}
                  className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {removing === favorite.id ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      Kaldırılıyor...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">delete</span>
                      Favorilerden Kaldır
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

