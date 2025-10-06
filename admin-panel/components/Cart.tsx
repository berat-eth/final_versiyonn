'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Trash2, RefreshCw, Package, Eye, X, User, Mail, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cartService, userService } from '@/lib/services'
import type { CartItem, User as UserType } from '@/lib/api'
import { useCallback } from 'react'
import { api } from '@/lib/api'

interface UserCart {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  items: CartItem[];
  total: number;
}

export default function Cart() {
  const [userCarts, setUserCarts] = useState<UserCart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingCart, setViewingCart] = useState<UserCart | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAllCarts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Backend'de admin/carts endpoint'i yoksa, kullanıcıları alıp sepetlerini çekeceğiz
      // Önce kullanıcıları alalım (minimum 2 karakter gerektiği için 'a' ile arama yapıyoruz)
      const usersResponse = await userService.getAllUsers()
      
      if (usersResponse.success && usersResponse.data) {
        const users = usersResponse.data
        
        // Her kullanıcının sepetini ve toplamını çek
        const cartsPromises = users.map(async (user: any) => {
          try {
            const [cartResponse, totalResponse] = await Promise.all([
              cartService.getCart(user.id),
              cartService.getCartTotal(user.id)
            ])
            
            return {
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userPhone: user.phone,
              items: cartResponse.success ? cartResponse.data || [] : [],
              total: totalResponse.success ? totalResponse.data || 0 : 0
            }
          } catch (err) {
            console.error(`Error fetching cart for user ${user.id}:`, err)
            return {
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userPhone: user.phone,
              items: [],
              total: 0
            }
          }
        })
        
        const carts = await Promise.all(cartsPromises)
        // Sadece sepetinde ürün olan kullanıcıları göster
        setUserCarts(carts.filter(cart => cart.items.length > 0))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sepetler yüklenirken hata oluştu')
      console.error('Error fetching carts:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearUserCart = async (userId: number, userName: string) => {
    if (!confirm(`${userName} kullanıcısının sepetini temizlemek istediğinizden emin misiniz?`)) return

    try {
      await cartService.clearCart(userId)
      await fetchAllCarts() // Refresh
    } catch (err) {
      console.error('Error clearing cart:', err)
      alert('Sepet temizlenirken hata oluştu')
    }
  }

  useEffect(() => {
    fetchAllCarts()
  }, [])

  const filteredCarts = userCarts.filter(cart =>
    cart.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cart.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalItems = userCarts.reduce((sum, cart) => sum + cart.items.length, 0)
  const totalValue = userCarts.reduce((sum, cart) => sum + cart.total, 0)
  const activeUsers = userCarts.length

  if (loading && userCarts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Sepetler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-semibold mb-2">Hata</p>
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchAllCarts}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Tüm Kullanıcı Sepetleri</h2>
          <p className="text-slate-500 mt-1">Aktif sepetleri görüntüleyin ve yönetin</p>
        </div>
        <button
          onClick={fetchAllCarts}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Aktif Sepet</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{activeUsers}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Toplam Ürün</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Toplam Değer</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ₺{totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <ShoppingCart className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Ort. Sepet Değeri</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                ₺{activeUsers > 0 ? (totalValue / activeUsers).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
            <Package className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Kullanıcı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {filteredCarts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Aktif Sepet Bulunamadı</h3>
            <p className="text-slate-500">Henüz hiçbir kullanıcının sepetinde ürün yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCarts.map((cart, index) => (
              <motion.div
                key={cart.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">
                        {cart.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{cart.userName}</h3>
                      <p className="text-xs text-slate-500">ID: #{cart.userId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingCart(cart)}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5 text-blue-600" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{cart.userEmail}</span>
                  </div>
                  {cart.userPhone && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{cart.userPhone}</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Ürün Sayısı</span>
                      <span className="font-bold text-slate-800">{cart.items.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Toplam</span>
                      <span className="font-bold text-green-600">₺{cart.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <DiscountActions userId={cart.userId} />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewingCart(cart)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Detayları Gör
                  </button>
                  <button
                    onClick={() => clearUserCart(cart.userId, cart.userName)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Detail Modal */}
      <AnimatePresence>
        {viewingCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingCart(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Sepet Detayları</h3>
                  <p className="text-slate-500 mt-1">{viewingCart.userName}</p>
                </div>
                <button
                  onClick={() => setViewingCart(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Kullanıcı</p>
                    <p className="text-lg font-bold text-slate-800">{viewingCart.userName}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Email</p>
                    <p className="text-lg font-bold text-slate-800 truncate">{viewingCart.userEmail}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Ürün Sayısı</p>
                    <p className="text-lg font-bold text-blue-600">{viewingCart.items.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Toplam Tutar</p>
                    <p className="text-lg font-bold text-green-600">
                      ₺{viewingCart.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Sepetteki Ürünler</h4>
                  <div className="space-y-3">
                    {viewingCart.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                        <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          {item.variationString && (
                            <p className="text-sm text-slate-500 mt-1">{item.variationString}</p>
                          )}
                          <p className="text-sm text-slate-500 mt-1">
                            Adet: {item.quantity} | Stok: {item.stock}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">
                            ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-slate-500">
                            Toplam: ₺{(item.price * item.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => clearUserCart(viewingCart.userId, viewingCart.userName)}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
                  >
                    Sepeti Temizle
                  </button>
                  <button
                    onClick={() => setViewingCart(null)}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DiscountActions({ userId }: { userId: number }) {
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const createCode = useCallback(async () => {
    const v = parseFloat(value)
    if (isNaN(v) || v <= 0) { setMsg('Geçerli bir değer girin'); return }
    try {
      setLoading(true)
      setMsg(null)
      const res = await api.post<any>('/admin/user-discount-codes', {
        userId,
        discountType: type,
        discountValue: v
      })
      if ((res as any)?.success && (res as any).data?.code) {
        setMsg(`Kod oluşturuldu: ${(res as any).data.code}`)
      } else {
        setMsg('Kod oluşturulamadı')
      }
    } catch (e: any) {
      setMsg(e?.message || 'Hata')
    } finally {
      setLoading(false)
    }
  }, [type, value, userId])

  return (
    <div className="flex items-center justify-end space-x-2">
      <select value={type} onChange={(e) => setType(e.target.value as any)} className="px-2 py-1 border border-slate-300 rounded-lg text-sm">
        <option value="percentage">% İndirim</option>
        <option value="fixed">Net Tutar</option>
      </select>
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type==='percentage' ? '% oran' : '₺ tutar'} className="px-2 py-1 border border-slate-300 rounded-lg w-28 text-sm" />
      <button disabled={loading} onClick={createCode} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">İndirim Kodu</button>
      {msg && <span className="text-xs text-slate-500 truncate max-w-[160px]">{msg}</span>}
    </div>
  )
}
