'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Search, Filter, Download, Clock, CheckCircle, XCircle, Package, X, Truck, FileText, Printer, Send, MapPin, Phone, Mail, CreditCard, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { orderService } from '@/lib/services'
import type { Order } from '@/lib/api'
import { api } from '@/lib/api'

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const reloadOrders = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>('/admin/orders')
      if ((res as any)?.success && (res as any).data) setOrders((res as any).data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Siparişler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reloadOrders() }, [])

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [showCargoModal, setShowCargoModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [cargoCompany, setCargoCompany] = useState('')
  const [newStatus, setNewStatus] = useState<any>('processing')

  const statusConfig: Record<any, { label: string; color: string; icon: any; dotColor: string }> = {
    pending: { label: 'Ödeme Bekleniyor', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, dotColor: 'bg-yellow-500' },
    processing: { label: 'Paketleniyor', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package, dotColor: 'bg-blue-500' },
    shipped: { label: 'Kargoya Verildi', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck, dotColor: 'bg-purple-500' },
    completed: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, dotColor: 'bg-green-500' },
    cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, dotColor: 'bg-red-500' },
  }

  const cargoStatusConfig: Record<Exclude<Order['cargoStatus'], undefined>, { label: string; color: string }> = {
    preparing: { label: 'Hazırlanıyor', color: 'bg-yellow-100 text-yellow-700' },
    shipped: { label: 'Kargoya Verildi', color: 'bg-blue-100 text-blue-700' },
    'in-transit': { label: 'Yolda', color: 'bg-purple-100 text-purple-700' },
    delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-700' }
  }

  const handlePrintInvoice = (order: Order) => {
    alert(`📄 Fatura yazdırılıyor: ${order.invoiceNumber}`)
  }

  const handleSendInvoice = (order: Order) => {
    alert(`📧 Fatura e-posta ile gönderiliyor: ${order.customerEmail}`)
  }

  const handleTrackCargo = (order: Order) => {
    if (order.trackingNumber) {
      alert(`📦 Kargo takip: ${order.trackingNumber}\nKargo Firması: ${order.cargoCompany}`)
    }
  }

  const updateOrderStatus = async () => {
    if (!selectedOrderForAction) return
    try {
      setUpdateLoading(true)
      await api.patch(`/admin/orders/${(selectedOrderForAction as any).id}/status`, { status: newStatus })
      setSelectedOrderForAction(null)
      setViewingOrder(null)
      await reloadOrders()
    } catch (e) {
      alert('Sipariş durumu güncellenemedi')
    } finally {
      setUpdateLoading(false)
    }
  }

  const updateShipping = async () => {
    if (!selectedOrderForAction) return
    try {
      setUpdateLoading(true)
      await api.patch(`/admin/orders/${(selectedOrderForAction as any).id}/shipping`, {
        trackingNumber,
        cargoCompany,
        cargoStatus: 'shipped'
      })
      setSelectedOrderForAction(null)
      setShowCargoModal(false)
      await reloadOrders()
    } catch (e) {
      alert('Kargo bilgisi güncellenemedi')
    } finally {
      setUpdateLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = orders.length
    const waiting = orders.filter(o => o.status === 'pending').length
    const processing = orders.filter(o => o.status === 'processing').length
    const completed = orders.filter(o => o.status === 'completed').length
    return [
      { label: 'Toplam Sipariş', value: total.toLocaleString(), color: 'from-blue-500 to-blue-600' },
      { label: 'Bekleyen', value: waiting.toLocaleString(), color: 'from-yellow-500 to-yellow-600' },
      { label: 'İşlenen', value: processing.toLocaleString(), color: 'from-purple-500 to-purple-600' },
      { label: 'Tamamlanan', value: completed.toLocaleString(), color: 'from-green-500 to-green-600' },
    ]
  }, [orders])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Sipariş Yönetimi</h2>
          <p className="text-slate-500 mt-1">Tüm siparişlerinizi takip edin</p>
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow">
          <Download className="w-5 h-5" />
          <span>Rapor İndir</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm p-5 card-hover"
          >
            <p className="text-slate-500 text-sm mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            <div className={`mt-3 h-2 bg-gradient-to-r ${stat.color} rounded-full`}></div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Sipariş veya müşteri ara..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filtrele</span>
            </button>
            <select className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Tüm Durumlar</option>
              <option>Beklemede</option>
              <option>İşleniyor</option>
              <option>Tamamlandı</option>
              <option>İptal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Sipariş</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ürün</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ödeme</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tutar</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order, index) => {
                const StatusIcon = statusConfig[order.status as NonNullable<Order['status']>].icon
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {(order as any).userName?.charAt ? (order as any).userName.charAt(0) : 'U'}
                        </div>
                        <div>
                          <span className="text-slate-700 font-medium">{(order as any).userName || '—'}</span>
                          <p className="text-xs text-slate-500">{(order as any).userEmail || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{order.createdAt}</td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 text-sm">{(order as any).itemCount ?? (order.items?.length || 0)} ürün</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 text-sm">{(order as any).paymentMethod || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">₺{order.totalAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${statusConfig[order.status as NonNullable<Order['status']>].color}`}>
                        <div className={`w-2 h-2 rounded-full ${statusConfig[order.status as NonNullable<Order['status']>].dotColor}`}></div>
                        <span className="text-xs font-medium">{statusConfig[order.status as NonNullable<Order['status']>].label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => { setViewingOrder(order); setNewStatus((order as any).status); }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="Detayları Gör"
                        >
                          <Eye className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                        </button>
                        {order.trackingNumber && (
                        <button
                          onClick={() => {
                            setSelectedOrderForAction(order)
                            setTrackingNumber((order as any).trackingNumber || '')
                            setCargoCompany((order as any).cargoCompany || '')
                            setShowCargoModal(true)
                          }}
                          className="p-2 hover:bg-purple-50 rounded-lg transition-colors group"
                          title="Kargo Takip / Güncelle"
                        >
                          <Truck className="w-5 h-5 text-slate-400 group-hover:text-purple-600" />
                        </button>
                        )}
                        {order.invoiceNumber && (
                          <button
                            onClick={() => {
                              setSelectedOrderForAction(order)
                              setShowInvoiceModal(true)
                            }}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors group"
                            title="Fatura İşlemleri"
                          >
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600">Toplam 1,234 sipariş içinden 1-6 arası gösteriliyor</p>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
              Önceki
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              1
            </button>
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
              2
            </button>
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
              3
            </button>
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Kargo Takip Modal */}
      <AnimatePresence>
        {showCargoModal && selectedOrderForAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCargoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">Kargo Takip</h3>
                    <p className="text-sm text-slate-500">Sipariş #{selectedOrderForAction.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCargoModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Kargo Bilgileri */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Kargo Firması</p>
                      <input value={cargoCompany} onChange={(e)=>setCargoCompany(e.target.value)} placeholder={selectedOrderForAction.cargoCompany || 'Kargo Firması'} className="w-full px-3 py-2 border border-purple-200 rounded-lg" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Takip Numarası</p>
                      <input value={trackingNumber} onChange={(e)=>setTrackingNumber(e.target.value)} placeholder={selectedOrderForAction.trackingNumber || 'Takip No'} className="w-full px-3 py-2 border border-purple-200 rounded-lg font-mono" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    <button disabled={updateLoading} onClick={updateShipping} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">Kargo Bilgisi Kaydet</button>
                  </div>
                </div>

                {/* Kargo Durumu */}
                {selectedOrderForAction.cargoStatus && (
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="font-semibold text-slate-800 mb-4">Kargo Durumu</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'preparing' ||
                            selectedOrderForAction.cargoStatus === 'shipped' ||
                            selectedOrderForAction.cargoStatus === 'in-transit' ||
                            selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300'
                          }`}>
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Kargo Hazırlanıyor</p>
                          <p className="text-sm text-slate-500">Paketiniz kargoya hazırlanıyor</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'shipped' ||
                            selectedOrderForAction.cargoStatus === 'in-transit' ||
                            selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300'
                          }`}>
                          <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Kargoya Verildi</p>
                          <p className="text-sm text-slate-500">Paketiniz kargo şubesine teslim edildi</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'in-transit' ||
                            selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300'
                          }`}>
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Dağıtımda</p>
                          <p className="text-sm text-slate-500">Paketiniz size ulaştırılıyor</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrderForAction.cargoStatus === 'delivered'
                            ? 'bg-green-500' : 'bg-slate-300'
                          }`}>
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">Teslim Edildi</p>
                          <p className="text-sm text-slate-500">Paketiniz teslim edildi</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teslimat Adresi */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-slate-700">Teslimat Adresi</p>
                  </div>
                  <p className="text-sm text-slate-600">{selectedOrderForAction.shippingAddress}</p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      window.open(`https://www.google.com/search?q=${selectedOrderForAction.trackingNumber}`, '_blank')
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                  >
                    Kargo Sitesinde Takip Et
                  </button>
                  <button
                    onClick={() => setShowCargoModal(false)}
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

      {/* Fatura Modal */}
      <AnimatePresence>
        {showInvoiceModal && selectedOrderForAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInvoiceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">Fatura Detayları</h3>
                    <p className="text-sm text-slate-500">Sipariş #{selectedOrderForAction.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Fatura Başlık */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Fatura No</p>
                      <p className="text-2xl font-bold text-slate-800">{selectedOrderForAction.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-1">Fatura Tarihi</p>
                      <p className="text-lg font-semibold text-slate-800">{selectedOrderForAction.invoiceDate}</p>
                    </div>
                  </div>
                  {selectedOrderForAction.taxNumber && (
                    <div className="pt-4 border-t border-green-200">
                      <p className="text-sm text-slate-500 mb-1">Vergi Numarası</p>
                      <p className="font-semibold text-slate-800">{selectedOrderForAction.taxNumber}</p>
                    </div>
                  )}
                </div>

                {/* Müşteri Bilgileri */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Müşteri Bilgileri</p>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-800 font-medium">{selectedOrderForAction.customer}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedOrderForAction.customerEmail}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedOrderForAction.customerPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Ödeme Bilgileri</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-800">{selectedOrderForAction.payment}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-800">{selectedOrderForAction.date}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fatura Adresi */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-slate-700">Fatura Adresi</p>
                  </div>
                  <p className="text-sm text-slate-600">{selectedOrderForAction.billingAddress}</p>
                </div>

                {/* Fatura Özeti */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Fatura Özeti</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Ürün Sayısı:</span>
                      <span className="font-semibold text-slate-800">{Array.isArray(selectedOrderForAction.items) ? selectedOrderForAction.items.length : (selectedOrderForAction.items as any)} ürün</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Ara Toplam:</span>
                      <span className="font-semibold text-slate-800">₺{(((selectedOrderForAction.total ?? selectedOrderForAction.totalAmount) * 0.82)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">KDV (%18):</span>
                      <span className="font-semibold text-slate-800">₺{(((selectedOrderForAction.total ?? selectedOrderForAction.totalAmount) * 0.18)).toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Toplam:</span>
                      <span className="text-2xl font-bold text-green-600">₺{(selectedOrderForAction.total ?? selectedOrderForAction.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* İşlem Butonları */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handlePrintInvoice(selectedOrderForAction)}
                    className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                  >
                    <Printer className="w-6 h-6 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-blue-700">Yazdır</span>
                  </button>
                  <button
                    onClick={() => handleSendInvoice(selectedOrderForAction)}
                    className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
                  >
                    <Send className="w-6 h-6 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-green-700">E-posta Gönder</span>
                  </button>
                  <button
                    onClick={() => {
                      alert('📥 Fatura PDF olarak indiriliyor...')
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
                  >
                    <Download className="w-6 h-6 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-700">PDF İndir</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detay Modal */}
      <AnimatePresence>
        {viewingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">Sipariş Detayları</h3>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Sipariş No</p>
                    <p className="text-2xl font-bold text-slate-800">#{viewingOrder.id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select value={newStatus} onChange={(e)=>setNewStatus(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="pending">Ödeme Bekleniyor</option>
                      <option value="processing">Paketleniyor</option>
                      <option value="shipped">Kargoya Verildi</option>
                      <option value="completed">Teslim Edildi</option>
                      <option value="cancelled">İptal</option>
                    </select>
                    <button disabled={updateLoading} onClick={updateOrderStatus} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Durum Kaydet</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Müşteri</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {((viewingOrder as any).userName || (viewingOrder as any).customer || 'U').charAt(0)}
                      </div>
                      <p className="font-bold text-slate-800">{(viewingOrder as any).userName || (viewingOrder as any).customer || '—'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Tarih</p>
                    <p className="font-bold text-slate-800">{(viewingOrder as any).createdAt || (viewingOrder as any).date || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Ödeme Yöntemi</p>
                    <p className="font-bold text-slate-800">{(viewingOrder as any).paymentMethod || (viewingOrder as any).payment || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Ürün Sayısı</p>
                    <p className="font-bold text-slate-800">{Array.isArray((viewingOrder as any).items) ? (viewingOrder as any).items.length : ((viewingOrder as any).items as any)} ürün</p>
                  </div>
                </div>

                {/* İletişim Bilgileri */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">İletişim Bilgileri</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700">{viewingOrder.customerEmail}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700">{viewingOrder.customerPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Adres Bilgileri */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-semibold text-slate-700">Teslimat Adresi</p>
                    </div>
                    <p className="text-sm text-slate-600">{viewingOrder.shippingAddress}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <p className="text-sm font-semibold text-slate-700">Fatura Adresi</p>
                    </div>
                    <p className="text-sm text-slate-600">{viewingOrder.billingAddress}</p>
                  </div>
                </div>

                {/* Kargo Bilgileri */}
                {viewingOrder.trackingNumber && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-5 h-5 text-purple-600" />
                        <p className="text-sm font-semibold text-slate-700">Kargo Bilgileri</p>
                      </div>
                      {viewingOrder.cargoStatus && (
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${cargoStatusConfig[viewingOrder.cargoStatus].color}`}>
                          {cargoStatusConfig[viewingOrder.cargoStatus].label}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Kargo Firması:</span>
                        <span className="font-semibold text-slate-800">{viewingOrder.cargoCompany}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Takip No:</span>
                        <span className="font-mono font-semibold text-purple-600">{viewingOrder.trackingNumber}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fatura Bilgileri */}
                {viewingOrder.invoiceNumber && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-semibold text-slate-700">Fatura Bilgileri</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Fatura No:</span>
                        <span className="font-semibold text-slate-800">{viewingOrder.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Fatura Tarihi:</span>
                        <span className="font-semibold text-slate-800">{viewingOrder.invoiceDate}</span>
                      </div>
                      {viewingOrder.taxNumber && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Vergi No:</span>
                          <span className="font-semibold text-slate-800">{viewingOrder.taxNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <p className="text-sm text-slate-500 mb-2">Toplam Tutar</p>
                  <p className="text-3xl font-bold text-green-600">₺{(viewingOrder.total ?? viewingOrder.totalAmount).toLocaleString()}</p>
                </div>

                {/* Hızlı İşlemler */}
                <div className="grid grid-cols-3 gap-3">
                  {viewingOrder.trackingNumber && (
                    <button
                      onClick={() => handleTrackCargo(viewingOrder)}
                      className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
                    >
                      <Truck className="w-6 h-6 text-purple-600 mb-2" />
                      <span className="text-xs font-medium text-purple-700">Kargo Takip</span>
                    </button>
                  )}
                  {viewingOrder.invoiceNumber && (
                    <>
                      <button
                        onClick={() => handlePrintInvoice(viewingOrder)}
                        className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                      >
                        <Printer className="w-6 h-6 text-blue-600 mb-2" />
                        <span className="text-xs font-medium text-blue-700">Fatura Yazdır</span>
                      </button>
                      <button
                        onClick={() => handleSendInvoice(viewingOrder)}
                        className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
                      >
                        <Send className="w-6 h-6 text-green-600 mb-2" />
                        <span className="text-xs font-medium text-green-700">Fatura Gönder</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setViewingOrder(null)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
