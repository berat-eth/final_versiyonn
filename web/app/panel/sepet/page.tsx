'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { cartApi } from '@/utils/api'
import type { CartItem } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

export default function CartPage() {
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadCart()
    }
  }, [user])

  const loadCart = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await cartApi.getCart(user.id)
      if (response.success && response.data) {
        setCartItems(response.data as CartItem[])
      }
    } catch (error) {
      console.error('Sepet yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return
    try {
      setUpdating(cartItemId)
      await cartApi.updateCartItem(cartItemId, newQuantity)
      await loadCart()
    } catch (error) {
      console.error('Miktar güncellenemedi:', error)
      alert('Miktar güncellenemedi. Lütfen tekrar deneyin.')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (cartItemId: number) => {
    if (!confirm('Bu ürünü sepetten kaldırmak istediğinize emin misiniz?')) return
    try {
      setUpdating(cartItemId)
      await cartApi.removeFromCart(cartItemId)
      await loadCart()
    } catch (error) {
      console.error('Ürün sepetten kaldırılamadı:', error)
      alert('Ürün sepetten kaldırılamadı. Lütfen tekrar deneyin.')
    } finally {
      setUpdating(null)
    }
  }

  const clearCart = async () => {
    if (!user?.id) return
    if (!confirm('Sepetinizdeki tüm ürünleri kaldırmak istediğinize emin misiniz?')) return
    try {
      await cartApi.clearCart(user.id)
      await loadCart()
    } catch (error) {
      console.error('Sepet temizlenemedi:', error)
      alert('Sepet temizlenemedi. Lütfen tekrar deneyin.')
    }
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Sepetim
        </h1>
        {cartItems.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            Sepeti Temizle
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Sepet yükleniyor...</p>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
            shopping_cart
          </span>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Sepetiniz boş</p>
          <Link
            href="/urunler"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Ürünleri Keşfet
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={100}
                        height={100}
                        className="rounded-xl object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400 text-3xl">image</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{item.name}</h3>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id || item.quantity <= 1}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                        <span className="px-4 py-2 font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
                          {updating === item.id ? (
                            <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id || (item.stock !== undefined && item.quantity >= item.stock)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>

                      {item.stock !== undefined && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Stok: {item.stock}
                        </p>
                      )}

                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                        className="ml-auto p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sipariş Özeti</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Toplam Ürün:</span>
                  <span className="font-semibold">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
              </div>

              <Link
                href="/panel/siparisler"
                className="w-full block text-center py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Sipariş Ver
              </Link>

              <Link
                href="/urunler"
                className="mt-3 w-full block text-center py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Alışverişe Devam Et
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

