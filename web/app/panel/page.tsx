'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/utils/api'
import Link from 'next/link'
import type { Order } from '@/lib/types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  })

  useEffect(() => {
    if (user?.id) {
      loadOrders()
    }
  }, [user])

  const loadOrders = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await ordersApi.getUserOrders(user.id)
      if (response.success && response.data) {
        const ordersData = response.data as Order[]
        setOrders(ordersData)
        setStats({
          totalOrders: ordersData.length,
          pendingOrders: ordersData.filter((o) => o.status === 'pending' || o.status === 'processing').length,
          completedOrders: ordersData.filter((o) => o.status === 'completed' || o.status === 'delivered').length,
        })
      }
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi',
    }
    return statusMap[status.toLowerCase()] || status
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-black mb-2">
          Hoş Geldiniz, {user?.name || 'Kullanıcı'}!
        </h1>
        <p className="text-blue-100 text-lg">
          Hesabınızı yönetin, siparişlerinizi takip edin ve daha fazlasını keşfedin.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Toplam Sipariş</h3>
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">shopping_bag</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalOrders}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Bekleyen Siparişler</h3>
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">pending</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.pendingOrders}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tamamlanan Siparişler</h3>
            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.completedOrders}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Son Siparişlerim</h2>
          <Link
            href="/panel/siparisler"
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Tümünü Gör
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
              sync
            </span>
            <p className="text-gray-600 dark:text-gray-400">Siparişler yükleniyor...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
              shopping_bag
            </span>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Henüz siparişiniz yok</p>
            <Link
              href="/urunler"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Ürünleri Keşfet
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">Sipariş #{order.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {order.items.length} ürün
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gray-900 dark:text-white">
                      {order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/panel/sepet"
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105"
        >
          <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400 mb-3 block">
            shopping_cart
          </span>
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Sepetim</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Sepetinizi görüntüleyin</p>
        </Link>

        <Link
          href="/panel/favoriler"
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105"
        >
          <span className="material-symbols-outlined text-4xl text-pink-600 dark:text-pink-400 mb-3 block">
            favorite
          </span>
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Favorilerim</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Favori ürünleriniz</p>
        </Link>

        <Link
          href="/panel/adresler"
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105"
        >
          <span className="material-symbols-outlined text-4xl text-purple-600 dark:text-purple-400 mb-3 block">
            location_on
          </span>
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Adreslerim</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Teslimat adresleri</p>
        </Link>

        <Link
          href="/panel/teklifler"
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105"
        >
          <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400 mb-3 block">
            description
          </span>
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Tekliflerim</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Teklif takibi</p>
        </Link>
      </div>
    </div>
  )
}

