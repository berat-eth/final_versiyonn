'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { customProductionApi } from '@/utils/api'
import { FileText, Download, CheckCircle, XCircle } from 'lucide-react'

export default function QuotesPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadRequests()
    }
  }, [user])

  const loadRequests = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await customProductionApi.getUserRequests(user.id)
      if (response.success && response.data) {
        setRequests(response.data as any[])
      }
    } catch (error) {
      console.error('Teklifler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuote = async (requestId: number) => {
    if (!confirm('Teklifi onaylamak istediğinize emin misiniz?')) return
    
    try {
      const response = await customProductionApi.updateQuoteStatus(requestId, 'accepted')
      if (response.success) {
        alert('Teklif onaylandı')
        await loadRequests()
        setShowDetailModal(false)
      } else {
        alert('Teklif onaylanamadı: ' + (response.message || 'Bilinmeyen hata'))
      }
    } catch (error: any) {
      console.error('Teklif onaylama hatası:', error)
      alert('Teklif onaylanamadı: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const handleRejectQuote = async (requestId: number) => {
    if (!confirm('Teklifi reddetmek istediğinize emin misiniz?')) return
    
    try {
      const response = await customProductionApi.updateQuoteStatus(requestId, 'rejected')
      if (response.success) {
        alert('Teklif reddedildi')
        await loadRequests()
        setShowDetailModal(false)
      } else {
        alert('Teklif reddedilemedi: ' + (response.message || 'Bilinmeyen hata'))
      }
    } catch (error: any) {
      console.error('Teklif reddetme hatası:', error)
      alert('Teklif reddedilemedi: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const getStatusColor = (status: string, quoteStatus?: string) => {
    if (quoteStatus === 'accepted') return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    if (quoteStatus === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    if (quoteStatus === 'sent') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    }
  }

  const getStatusText = (status: string, quoteStatus?: string) => {
    if (quoteStatus === 'accepted') return 'Teklif Onaylandı'
    if (quoteStatus === 'rejected') return 'Teklif Reddedildi'
    if (quoteStatus === 'sent') return 'Teklif Bekleniyor'
    const statusMap: Record<string, string> = {
      pending: 'Beklemede',
      review: 'İnceleniyor',
      design: 'Tasarım',
      production: 'Üretimde',
      shipped: 'Kargolandı',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
    }
    return statusMap[status?.toLowerCase()] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Tekliflerim
        </h1>
      </div>

      {requests.length === 0 ? (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
          description
        </span>
        <p className="text-gray-600 dark:text-gray-400 mb-2">Henüz teklif talebiniz yok</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Özel üretim için teklif almak için yeni bir talep oluşturabilirsiniz.
        </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {request.requestNumber || `Talep #${request.id}`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(request.status, request.quoteStatus)}`}>
                  {getStatusText(request.status, request.quoteStatus)}
                </span>
              </div>

              {request.items && request.items.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ürünler:</p>
                  <div className="space-y-1">
                    {request.items.slice(0, 3).map((item: any, idx: number) => (
                      <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                        • {item.productName || `Ürün #${item.productId}`} - {item.quantity} adet
                      </p>
                    ))}
                    {request.items.length > 3 && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        + {request.items.length - 3} ürün daha...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Proforma Fatura Bilgileri */}
              {request.proformaTotalWithVat && request.proformaQuoteData && (
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">Proforma Fatura</p>
                    </div>
                    {request.proformaQuotedAt && (
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {new Date(request.proformaQuotedAt).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Teklif (KDV Hariç)</p>
                      <p className="text-lg font-bold text-purple-900 dark:text-purple-200">
                        ₺{((request.proformaTotalWithVat || 0) / (1 + (request.proformaVatRate || 10) / 100)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">KDV (%{request.proformaVatRate || 10})</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        ₺{((request.proformaTotalWithVat || 0) - (request.proformaTotalWithVat || 0) / (1 + (request.proformaVatRate || 10) / 100)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Toplam Tutar (KDV Dahil)</p>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      ₺{Number(request.proformaTotalWithVat).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {request.proformaQuoteData?.notes && (
                    <p className="text-sm text-purple-700 dark:text-purple-400 mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                      {request.proformaQuoteData.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Klasik Teklif Bilgileri (Proforma yoksa) */}
              {!request.proformaTotalWithVat && request.quoteAmount && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Teklif Tutarı</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₺{Number(request.quoteAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {request.quoteNotes && (
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">{request.quoteNotes}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedRequest(request)
                    setShowDetailModal(true)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Detayları Gör
                </button>
                
                {/* PDF İndir butonu (Proforma varsa) */}
                {request.proformaTotalWithVat && (
                  <button
                    onClick={() => {
                      // PDF'i yeni sekmede aç veya indir
                      const invoiceNumber = request.requestNumber || `PRO-${request.id}`
                      const fileName = `proforma-fatura-${invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`
                      alert('PDF indirme özelliği yakında eklenecek. Proforma fatura numarası: ' + invoiceNumber)
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF İndir
                  </button>
                )}
                
                {(request.quoteStatus === 'sent' && (request.quoteAmount || request.proformaTotalWithVat)) && (
                  <>
                    <button
                      onClick={() => handleAcceptQuote(request.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Onayla
                    </button>
                    <button
                      onClick={() => handleRejectQuote(request.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reddet
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Talep Detayları</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {selectedRequest.requestNumber || `Talep #${selectedRequest.id}`}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(selectedRequest.status, selectedRequest.quoteStatus)}`}>
                  {getStatusText(selectedRequest.status, selectedRequest.quoteStatus)}
                </span>
              </div>

              {/* Proforma Fatura Bilgileri */}
              {selectedRequest.proformaTotalWithVat && selectedRequest.proformaQuoteData && (
                <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      <h4 className="text-xl font-bold text-purple-900 dark:text-purple-300">Proforma Fatura</h4>
                    </div>
                    {selectedRequest.proformaQuotedAt && (
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        {new Date(selectedRequest.proformaQuotedAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  {/* Maliyet Detayları */}
                  {selectedRequest.proformaQuoteData?.calculation && (
                    <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                      <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">Maliyet Detayları</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Toplam Maliyet</p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            ₺{selectedRequest.proformaQuoteData.calculation.totalCost?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Kâr Yüzdesi</p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            %{selectedRequest.proformaQuoteData.calculation.profitPercentage?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Kâr Marjı</p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            %{selectedRequest.proformaProfitMargin || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Kargo</p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            ₺{selectedRequest.proformaSharedShippingCost?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ürün Detayları ve Fiyatlar */}
                  {selectedRequest.proformaQuoteData?.calculation?.itemCalculations && (
                    <div className="mb-4 space-y-3">
                      <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-300">Ürün Fiyatları</h5>
                      {selectedRequest.proformaQuoteData.calculation.itemCalculations.map((itemCalc: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                          <p className="font-semibold text-gray-900 dark:text-white mb-2">{itemCalc.productName}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Birim Fiyat</p>
                              <p className="font-medium text-gray-900 dark:text-white">₺{itemCalc.finalUnitPrice?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Adet</p>
                              <p className="font-medium text-gray-900 dark:text-white">{itemCalc.quantity}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Toplam</p>
                              <p className="font-medium text-purple-600 dark:text-purple-400">₺{itemCalc.totalWithVat?.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toplam Tutar */}
                  <div className="p-4 bg-purple-600 dark:bg-purple-800 rounded-lg text-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-100">Teklif (KDV Hariç)</span>
                      <span className="font-bold">
                        ₺{((selectedRequest.proformaTotalWithVat || 0) / (1 + (selectedRequest.proformaVatRate || 10) / 100)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-100">KDV (%{selectedRequest.proformaVatRate || 10})</span>
                      <span className="font-bold">
                        ₺{((selectedRequest.proformaTotalWithVat || 0) - (selectedRequest.proformaTotalWithVat || 0) / (1 + (selectedRequest.proformaVatRate || 10) / 100)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-purple-400">
                      <span className="text-lg font-semibold">GENEL TOPLAM</span>
                      <span className="text-2xl font-black">
                        ₺{Number(selectedRequest.proformaTotalWithVat).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Notlar */}
                  {selectedRequest.proformaQuoteData?.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-1">Notlar</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 whitespace-pre-wrap">
                        {selectedRequest.proformaQuoteData.notes}
                      </p>
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  {selectedRequest.quoteStatus === 'sent' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => {
                          const invoiceNumber = selectedRequest.requestNumber || `PRO-${selectedRequest.id}`
                          const fileName = `proforma-fatura-${invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`
                          alert('PDF indirme özelliği yakında eklenecek. Proforma fatura numarası: ' + invoiceNumber)
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PDF İndir
                      </button>
                      <button
                        onClick={() => handleAcceptQuote(selectedRequest.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Teklifi Onayla
                      </button>
                      <button
                        onClick={() => handleRejectQuote(selectedRequest.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Teklifi Reddet
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Klasik Teklif Bilgileri (Proforma yoksa) */}
              {!selectedRequest.proformaTotalWithVat && selectedRequest.quoteAmount && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2">Teklif Bilgileri</h4>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    ₺{Number(selectedRequest.quoteAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {selectedRequest.quoteNotes && (
                    <p className="text-sm text-blue-700 dark:text-blue-400">{selectedRequest.quoteNotes}</p>
                  )}
                  {selectedRequest.quoteStatus === 'sent' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleAcceptQuote(selectedRequest.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Teklifi Onayla
                      </button>
                      <button
                        onClick={() => handleRejectQuote(selectedRequest.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Teklifi Reddet
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              {selectedRequest.items && selectedRequest.items.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ürünler</h4>
                  <div className="space-y-4">
                    {selectedRequest.items.map((item: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <p className="font-semibold text-gray-900 dark:text-white mb-2">
                          {item.productName || `Ürün #${item.productId}`}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Adet: {item.quantity}</p>
                        {item.customizations && (() => {
                          try {
                            const customizations = typeof item.customizations === 'string' 
                              ? JSON.parse(item.customizations) 
                              : item.customizations;
                            if (customizations?.sizes && Array.isArray(customizations.sizes) && customizations.sizes.length > 0) {
                              return (
                                <div className="mt-2">
                                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Beden Dağılımı:</p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {customizations.sizes.map((sizeItem: any, sizeIdx: number) => (
                                      <span 
                                        key={sizeIdx}
                                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
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
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Notlar</h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 whitespace-pre-wrap">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          </div>
      </div>
      )}
    </div>
  )
}

