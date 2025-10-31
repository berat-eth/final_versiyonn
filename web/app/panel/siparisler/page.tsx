'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi, customProductionApi } from '@/utils/api'
import type { Order } from '@/lib/types'
import Image from 'next/image'

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [customRequests, setCustomRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadOrders()
      loadCustomRequests()
    }
  }, [user])

  const loadOrders = async () => {
    if (!user?.id) return
    try {
      const response = await ordersApi.getUserOrders(user.id)
      if (response.success && response.data) {
        setOrders(response.data as Order[])
      }
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error)
    }
  }

  const loadCustomRequests = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await customProductionApi.getUserRequests(user.id)
      if (response.success && response.data) {
        setCustomRequests(response.data as any[])
      }
    } catch (error) {
      console.error('Özel üretim talepleri yüklenemedi:', error)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Siparişlerim
        </h1>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Siparişler yükleniyor...</p>
        </div>
      ) : orders.length === 0 && customRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
            shopping_bag
          </span>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Henüz siparişiniz yok</p>
          <a
            href="/urunler"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Ürünleri Keşfet
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Custom Production Requests */}
          {customRequests.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Özel Üretim Talepleri</h2>
              {customRequests.map((request) => (
                <div
                  key={`request-${request.id}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {request.requestNumber || `Talep #${request.id}`}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.quoteStatus === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            request.quoteStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            request.quoteStatus === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {request.quoteStatus === 'accepted' ? 'Teklif Onaylandı' :
                             request.quoteStatus === 'rejected' ? 'Teklif Reddedildi' :
                             request.quoteStatus === 'sent' ? 'Teklif Bekleniyor' :
                             request.status === 'completed' ? 'Tamamlandı' :
                             request.status === 'cancelled' ? 'İptal Edildi' :
                             'Beklemede'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      {request.quoteAmount && (
                        <div className="text-left md:text-right">
                          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            ₺{Number(request.quoteAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Teklif Tutarı
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.items && request.items.length > 0 && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/30">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Ürünler</h4>
                      <div className="space-y-3">
                        {request.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-start gap-4">
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName || 'Ürün'}
                                width={60}
                                height={60}
                                className="rounded-lg object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-15 h-15 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-400">image</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {item.productName || `Ürün #${item.productId}`}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Adet: {item.quantity}
                              </p>
                              {item.customizations && (() => {
                                try {
                                  const customizations = typeof item.customizations === 'string' 
                                    ? JSON.parse(item.customizations) 
                                    : item.customizations;
                                  if (customizations?.sizes && Array.isArray(customizations.sizes) && customizations.sizes.length > 0) {
                                    return (
                                      <div className="mt-2">
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Beden Dağılımı:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {customizations.sizes.map((sizeItem: any, sizeIdx: number) => (
                                            <span 
                                              key={sizeIdx}
                                              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
                                            >
                                              {sizeItem.size}: {sizeItem.quantity}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  }
                                } catch {}
                                return null
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Regular Orders */}
          {orders.length > 0 && (
            <>
              {customRequests.length > 0 && <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 mt-6">Siparişlerim</h2>}
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sipariş #{order.id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {order.shippingAddress && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            <span className="material-symbols-outlined text-sm align-middle">location_on</span>
                            {' '}
                            {order.city && `${order.city}, `}
                            {order.district && `${order.district}, `}
                            {order.shippingAddress}
                          </p>
                        )}
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                          {order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                        {order.paymentMethod && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Ödeme: {order.paymentMethod}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/30">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sipariş Detayları</h4>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-4">
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName || 'Ürün'}
                                width={60}
                                height={60}
                                className="rounded-lg object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-15 h-15 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-400">image</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {item.productName || 'Ürün'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Adet: {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

