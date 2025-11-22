'use client'

import { useEffect, useState } from 'react'
import { FileText, Search, Filter, Calendar, User, Package, Calculator, Save, RefreshCw, Archive, CheckCircle, XCircle, Edit, Eye, X, Download, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface ProformaRequest {
  id: number
  requestNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  companyName?: string
  createdAt: string
  status: string
  items?: ProformaItem[]
  totalQuantity?: number
}

interface ProformaItem {
  id: number
  productId: number
  productName: string
  productImage?: string
  quantity: number
  customizations?: any
  sizeDistribution?: SizeDistribution
}

interface ManualInvoiceItem {
  id: string // Geçici ID
  productName: string
  quantity: number
  sizeDistribution?: SizeDistribution
}

interface SizeDistribution {
  [key: string]: number // Beden: Adet (örn: { "S": 10, "M": 20, "L": 15 })
}

interface CostInputs {
  unitCost: number // Birim maliyeti
  printingCost: number // Baskı maliyeti
  embroideryCost: number // Nakış maliyeti
}

interface ItemCalculation {
  itemId: number
  productName: string
  quantity: number
  totalCost: number
  unitPrice: number
  finalUnitPrice: number
  totalOfferAmount: number
  vatAmount: number
  totalWithVat: number
}

interface CalculationResult {
  itemCalculations: ItemCalculation[]
  totalCost: number
  totalQuantity: number
  profitMargin: number
  vatRate: number
  totalOfferAmount: number
  totalVatAmount: number
  totalWithVat: number
  profitPercentage: number
}

export default function ProformaInvoice() {
  // Talep listesi
  const [requests, setRequests] = useState<ProformaRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtreler
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Seçili talep
  const [selectedRequest, setSelectedRequest] = useState<ProformaRequest | null>(null)
  const [selectedItems, setSelectedItems] = useState<ProformaItem[]>([])
  
  // Maliyet girişi - Her ürün için ayrı
  const [itemCosts, setItemCosts] = useState<Record<number, CostInputs>>({})
  
  // Hesaplama sonuçları
  const [calculation, setCalculation] = useState<CalculationResult | null>(null)
  const [profitMargin, setProfitMargin] = useState<number>(0) // Kâr marjı yüzdesi
  const [vatRate, setVatRate] = useState<number>(10) // KDV oranı (%)
  const [sharedShippingCost, setSharedShippingCost] = useState<number>(0) // Paylaşılan kargo maliyeti
  
  // KDV oranları
  const vatRates = [0, 1, 10, 20]
  
  // Teklif oluşturma
  const [unitSalePrice, setUnitSalePrice] = useState<number>(0)
  const [totalOfferAmount, setTotalOfferAmount] = useState<number>(0)
  const [profitPercentage, setProfitPercentage] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  
  // Manuel fatura oluşturma
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState<boolean>(false)
  const [manualCustomerName, setManualCustomerName] = useState<string>('')
  const [manualCustomerEmail, setManualCustomerEmail] = useState<string>('')
  const [manualCustomerPhone, setManualCustomerPhone] = useState<string>('')
  const [manualCompanyName, setManualCompanyName] = useState<string>('')
  const [manualItems, setManualItems] = useState<ManualInvoiceItem[]>([])
  const [manualItemCosts, setManualItemCosts] = useState<Record<string, CostInputs>>({})
  const [manualCalculation, setManualCalculation] = useState<CalculationResult | null>(null)
  
  useEffect(() => {
    loadRequests()
  }, [])
  
  useEffect(() => {
    if (selectedRequest) {
      loadRequestDetails(selectedRequest.id)
      resetCosts()
    }
  }, [selectedRequest])
  
  useEffect(() => {
    calculateCosts()
  }, [itemCosts, profitMargin, selectedItems, sharedShippingCost, vatRate])
  
  useEffect(() => {
    if (showManualInvoiceModal) {
      calculateManualCosts()
    }
  }, [manualItemCosts, profitMargin, manualItems, sharedShippingCost, vatRate, showManualInvoiceModal])
  
  useEffect(() => {
    if (calculation) {
      // Ortalama birim fiyat hesapla (KDV hariç)
      const avgUnitPrice = calculation.totalQuantity > 0 
        ? calculation.totalOfferAmount / calculation.totalQuantity 
        : 0
      setUnitSalePrice(avgUnitPrice)
      setTotalOfferAmount(calculation.totalWithVat) // KDV dahil toplam tutar
      setProfitPercentage(calculation.profitPercentage)
    }
  }, [calculation])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) {
        // Proforma fatura için uygun talepleri filtrele
        const proformaRequests = (res as any).data.map((r: any) => ({
          id: r.id,
          requestNumber: r.requestNumber || `REQ-${r.id}`,
          customerName: r.customerName || 'Bilinmeyen',
          customerEmail: r.customerEmail,
          customerPhone: r.customerPhone,
          companyName: r.companyName,
          createdAt: r.createdAt,
          status: r.status || 'pending',
          totalQuantity: r.totalQuantity || 0
        }))
        setRequests(proformaRequests)
      } else {
        setRequests([])
      }
    } catch (e: any) {
      setError(e?.message || 'Talepler getirilemedi')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const loadRequestDetails = async (requestId: number) => {
    try {
      const res = await api.get<any>(`/admin/custom-production-requests/${requestId}`)
      if ((res as any)?.success && (res as any).data) {
        const data = (res as any).data
        
        // Items'ları işle
        let items: ProformaItem[] = []
        if (data.items && Array.isArray(data.items)) {
          // Her item için ürün bilgilerini getir
          items = await Promise.all(
            data.items.map(async (item: any) => {
              let productName = item.productName || 'Bilinmeyen Ürün'
              let productImage = item.productImage
              
              // Ürün bilgilerini API'den çek
              if (item.productId) {
                try {
                  const productRes = await api.get<any>(`/products/${item.productId}`)
                  if ((productRes as any)?.success && (productRes as any).data) {
                    productName = (productRes as any).data.name || productName
                    productImage = (productRes as any).data.image || productImage
                  }
                } catch {
                  // Ürün bulunamazsa varsayılan değerler kullanılır
                }
              }
              
              // Beden dağılımını parse et
              let sizeDistribution: SizeDistribution | undefined
              if (item.customizations) {
                try {
                  const customizations = typeof item.customizations === 'string' 
                    ? JSON.parse(item.customizations) 
                    : item.customizations
                  
                  if (customizations.sizes && Array.isArray(customizations.sizes)) {
                    sizeDistribution = {}
                    customizations.sizes.forEach((sizeItem: any) => {
                      if (sizeItem.size && sizeItem.quantity) {
                        sizeDistribution![sizeItem.size] = sizeItem.quantity
                      }
                    })
                  } else if (customizations.sizeDistribution) {
                    sizeDistribution = customizations.sizeDistribution
                  }
                } catch {
                  // Parse hatası, boş bırak
                }
              }
              
              return {
                id: item.id,
                productId: item.productId,
                productName,
                productImage,
                quantity: item.quantity || 0,
                customizations: item.customizations,
                sizeDistribution
              }
            })
          )
        }
        
        setSelectedItems(items)
      }
    } catch (e: any) {
      console.error('Talep detayları getirilemedi:', e)
      setSelectedItems([])
    }
  }

  const resetCosts = () => {
    // Her ürün için maliyet girişlerini sıfırla
    // NOT: Veritabanından fiyat çekilmiyor, kullanıcının manuel girişi bekleniyor
    const newCosts: Record<number, CostInputs> = {}
    selectedItems.forEach(item => {
      newCosts[item.id] = {
        unitCost: 0, // Kullanıcının girdiği değer kullanılacak, veritabanı fiyatı kullanılmıyor
        printingCost: 0,
        embroideryCost: 0
      }
    })
    setItemCosts(newCosts)
    setProfitMargin(0)
    setVatRate(10) // Varsayılan KDV %10
    setSharedShippingCost(0)
  }

  const calculateCosts = () => {
    // Toplam adet hesapla
    const totalQuantity = selectedItems.reduce((sum, item) => {
      const sizeDist = item.sizeDistribution
      if (sizeDist) {
        return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
      }
      return sum + item.quantity
    }, 0)
    
    if (totalQuantity === 0 || selectedItems.length === 0) {
      setCalculation(null)
      return
    }
    
    // Her ürün için ayrı hesaplama yap
    const itemCalculations: ItemCalculation[] = []
    
    // Kargo maliyeti adet başına
    const shippingCostPerUnit = totalQuantity > 0 ? sharedShippingCost / totalQuantity : 0
    
    let totalCost = 0 // Kargo artık birim fiyata dahil olduğu için totalCost'a dahil edilmiyor
    
    selectedItems.forEach(item => {
      const costs = itemCosts[item.id] || {
        unitCost: 0,
        printingCost: 0,
        embroideryCost: 0
      }
      
      const sizeDist = item.sizeDistribution
      const itemQuantity = sizeDist 
        ? Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
        : item.quantity
      
      if (itemQuantity === 0) return
      
      // Ürün toplam maliyeti (birim maliyet + baskı + nakış)
      const itemTotalCost = 
        (costs.unitCost * itemQuantity) +
        costs.printingCost +
        costs.embroideryCost
      
      totalCost += itemTotalCost
      
      // Baskı ve nakış adet başına maliyetleri
      const printingCostPerUnit = costs.printingCost / itemQuantity
      const embroideryCostPerUnit = costs.embroideryCost / itemQuantity
      
      // Birim fiyatı (kâr marjı uygulanmış)
      const unitPriceBeforeMargin = costs.unitCost
      const unitPriceWithMargin = profitMargin > 0 
        ? unitPriceBeforeMargin * (1 + profitMargin / 100)
        : unitPriceBeforeMargin
      
      // Birim satış fiyatı = Birim fiyatı + baskı + nakış + kargo (KDV hariç)
      const unitSalePriceWithoutVat = unitPriceWithMargin + printingCostPerUnit + embroideryCostPerUnit + shippingCostPerUnit
      
      // KDV hesaplama (birim başına)
      const vatPerUnit = unitSalePriceWithoutVat * (vatRate / 100)
      
      // Final birim fiyat (KDV dahil) = Birim fiyatı + baskı + nakış + kargo + KDV
      const finalUnitPrice = unitSalePriceWithoutVat + vatPerUnit
      
      // Ürün teklif tutarı (KDV hariç)
      const itemTotalOfferAmount = unitSalePriceWithoutVat * itemQuantity
      
      // Toplam KDV
      const itemVatAmount = vatPerUnit * itemQuantity
      
      // Toplam (KDV dahil)
      const itemTotalWithVat = finalUnitPrice * itemQuantity
      
      itemCalculations.push({
        itemId: item.id,
        productName: item.productName,
        quantity: itemQuantity,
        totalCost: itemTotalCost,
        unitPrice: unitSalePriceWithoutVat, // Birim satış fiyatı (KDV hariç)
        finalUnitPrice, // Final birim fiyat (KDV dahil)
        totalOfferAmount: itemTotalOfferAmount,
        vatAmount: itemVatAmount,
        totalWithVat: itemTotalWithVat
      })
    })
    
    // Toplam maliyet (ürünler + kargo)
    const totalCostWithShipping = totalCost + sharedShippingCost
    
    // Toplam teklif tutarı (KDV hariç) - TÜM ÜRÜNLERİN TOPLAMI
    const totalOfferAmount = itemCalculations.reduce((sum, calc) => sum + calc.totalOfferAmount, 0)
    
    // Toplam KDV - TÜM ÜRÜNLERİN TOPLAMI
    const totalVatAmount = itemCalculations.reduce((sum, calc) => sum + calc.vatAmount, 0)
    
    // Toplam tutar (KDV dahil) - TÜM ÜRÜNLERİN TOPLAMI
    // Alternatif hesaplama: Her ürünün totalWithVat değerlerini topla
    const totalWithVatFromItems = itemCalculations.reduce((sum, calc) => sum + calc.totalWithVat, 0)
    // İki yöntem de aynı sonucu vermeli, güvenlik için ikisini de kontrol et
    const totalWithVat = totalOfferAmount + totalVatAmount
    
    // Hesaplama kontrolü (geliştirme aşamasında)
    if (Math.abs(totalWithVat - totalWithVatFromItems) > 0.01) {
      console.warn('Toplam hesaplama uyumsuzluğu:', { totalWithVat, totalWithVatFromItems })
    }
    
    // Kâr yüzdesi (kargo dahil toplam maliyet üzerinden)
    const profitPercentage = totalCostWithShipping > 0 
      ? ((totalOfferAmount - totalCostWithShipping) / totalCostWithShipping) * 100
      : 0
    
    setCalculation({
      itemCalculations,
      totalCost: totalCostWithShipping, // Kargo dahil toplam maliyet
      totalQuantity,
      profitMargin,
      vatRate,
      totalOfferAmount,
      totalVatAmount,
      totalWithVat,
      profitPercentage
    })
  }

  const handleSelectRequest = (request: ProformaRequest) => {
    setSelectedRequest(request)
  }

  const handleCostChange = (itemId: number, field: keyof CostInputs, value: string) => {
    // Boş string veya geçersiz değer için 0 kullan
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setItemCosts(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          unitCost: 0,
          printingCost: 0,
          embroideryCost: 0
        }),
        [field]: numValue
      }
    }))
  }
  
  const handleSharedShippingChange = (value: string) => {
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setSharedShippingCost(numValue)
  }
  
  const handleProfitMarginChange = (value: string) => {
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setProfitMargin(numValue)
  }
  
  // Manuel fatura hesaplama
  const calculateManualCosts = () => {
    const totalQuantity = manualItems.reduce((sum, item) => {
      const sizeDist = item.sizeDistribution
      if (sizeDist) {
        return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
      }
      return sum + item.quantity
    }, 0)
    
    if (totalQuantity === 0 || manualItems.length === 0) {
      setManualCalculation(null)
      return
    }
    
    const itemCalculations: ItemCalculation[] = []
    const shippingCostPerUnit = totalQuantity > 0 ? sharedShippingCost / totalQuantity : 0
    let totalCost = 0
    
    manualItems.forEach(item => {
      const costs = manualItemCosts[item.id] || {
        unitCost: 0,
        printingCost: 0,
        embroideryCost: 0
      }
      
      const sizeDist = item.sizeDistribution
      const itemQuantity = sizeDist 
        ? Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
        : item.quantity
      
      if (itemQuantity === 0) return
      
      const itemTotalCost = 
        (costs.unitCost * itemQuantity) +
        costs.printingCost +
        costs.embroideryCost
      
      totalCost += itemTotalCost
      
      const printingCostPerUnit = costs.printingCost / itemQuantity
      const embroideryCostPerUnit = costs.embroideryCost / itemQuantity
      
      const unitPriceBeforeMargin = costs.unitCost
      const unitPriceWithMargin = profitMargin > 0 
        ? unitPriceBeforeMargin * (1 + profitMargin / 100)
        : unitPriceBeforeMargin
      
      const unitSalePriceWithoutVat = unitPriceWithMargin + printingCostPerUnit + embroideryCostPerUnit + shippingCostPerUnit
      const vatPerUnit = unitSalePriceWithoutVat * (vatRate / 100)
      const finalUnitPrice = unitSalePriceWithoutVat + vatPerUnit
      const itemTotalOfferAmount = unitSalePriceWithoutVat * itemQuantity
      const itemVatAmount = vatPerUnit * itemQuantity
      const itemTotalWithVat = finalUnitPrice * itemQuantity
      
      itemCalculations.push({
        itemId: parseInt(item.id) || 0,
        productName: item.productName,
        quantity: itemQuantity,
        totalCost: itemTotalCost,
        unitPrice: unitSalePriceWithoutVat,
        finalUnitPrice,
        totalOfferAmount: itemTotalOfferAmount,
        vatAmount: itemVatAmount,
        totalWithVat: itemTotalWithVat
      })
    })
    
    const totalCostWithShipping = totalCost + sharedShippingCost
    const totalOfferAmount = itemCalculations.reduce((sum, calc) => sum + calc.totalOfferAmount, 0)
    const totalVatAmount = itemCalculations.reduce((sum, calc) => sum + calc.vatAmount, 0)
    const totalWithVat = totalOfferAmount + totalVatAmount
    const profitPercentage = totalCostWithShipping > 0 
      ? ((totalOfferAmount - totalCostWithShipping) / totalCostWithShipping) * 100
      : 0
    
    setManualCalculation({
      itemCalculations,
      totalCost: totalCostWithShipping,
      totalQuantity,
      profitMargin,
      vatRate,
      totalOfferAmount,
      totalVatAmount,
      totalWithVat,
      profitPercentage
    })
  }
  
  // Manuel fatura işlemleri
  const addManualItem = () => {
    const newItem: ManualInvoiceItem = {
      id: `manual-${Date.now()}-${Math.random()}`,
      productName: '',
      quantity: 1,
      sizeDistribution: undefined
    }
    setManualItems([...manualItems, newItem])
    setManualItemCosts({
      ...manualItemCosts,
      [newItem.id]: {
        unitCost: 0,
        printingCost: 0,
        embroideryCost: 0
      }
    })
  }
  
  const removeManualItem = (itemId: string) => {
    setManualItems(manualItems.filter(item => item.id !== itemId))
    const newCosts = { ...manualItemCosts }
    delete newCosts[itemId]
    setManualItemCosts(newCosts)
  }
  
  const updateManualItem = (itemId: string, field: keyof ManualInvoiceItem, value: any) => {
    setManualItems(manualItems.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ))
  }
  
  const handleManualCostChange = (itemId: string, field: keyof CostInputs, value: string) => {
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setManualItemCosts(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          unitCost: 0,
          printingCost: 0,
          embroideryCost: 0
        }),
        [field]: numValue
      }
    }))
  }
  
  const resetManualInvoice = () => {
    setManualCustomerName('')
    setManualCustomerEmail('')
    setManualCustomerPhone('')
    setManualCompanyName('')
    setManualItems([])
    setManualItemCosts({})
    setManualCalculation(null)
    setProfitMargin(0)
    setVatRate(10)
    setSharedShippingCost(0)
    setNotes('')
  }
  
  const handleSaveManualInvoice = async () => {
    if (!manualCustomerName.trim()) {
      alert('Lütfen müşteri adı girin')
      return
    }
    
    if (manualItems.length === 0) {
      alert('Lütfen en az bir ürün ekleyin')
      return
    }
    
    if (!manualCalculation) {
      alert('Lütfen maliyet bilgilerini girin ve hesaplama yapın')
      return
    }
    
    try {
      // Önce custom production request oluştur
      const totalQuantity = manualItems.reduce((sum, item) => {
        const sizeDist = item.sizeDistribution
        if (sizeDist) {
          return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
        }
        return sum + item.quantity
      }, 0)
      
      const requestData = {
        customerName: manualCustomerName,
        customerEmail: manualCustomerEmail || undefined,
        customerPhone: manualCustomerPhone || undefined,
        companyName: manualCompanyName || undefined,
        items: manualItems.map(item => ({
          productName: item.productName,
          quantity: item.sizeDistribution 
            ? Object.values(item.sizeDistribution).reduce((s: number, q: number) => s + q, 0)
            : item.quantity,
          customizations: item.sizeDistribution ? { sizeDistribution: item.sizeDistribution } : undefined
        })),
        totalQuantity,
        totalAmount: manualCalculation.totalWithVat,
        notes: notes || 'Manuel oluşturulan proforma fatura'
      }
      
      // Admin için manuel fatura oluşturma endpoint'i
      const createRes = await api.post<any>('/admin/custom-production-requests/manual', requestData)
      
      if ((createRes as any)?.success && (createRes as any).data?.id) {
        const requestId = (createRes as any).data.id
        
        // Proforma quote kaydet
        const itemCostsForSave: Record<number, CostInputs> = {}
        manualItems.forEach((item, index) => {
          itemCostsForSave[index + 1] = manualItemCosts[item.id] || {
            unitCost: 0,
            printingCost: 0,
            embroideryCost: 0
          }
        })
        
        await api.post(`/admin/custom-production-requests/${requestId}/proforma-quote`, {
          itemCosts: itemCostsForSave,
          sharedShippingCost,
          profitMargin,
          vatRate,
          unitSalePrice: manualCalculation.totalOfferAmount / manualCalculation.totalQuantity,
          totalOfferAmount: manualCalculation.totalOfferAmount,
          totalVatAmount: manualCalculation.totalVatAmount,
          totalWithVat: manualCalculation.totalWithVat,
          profitPercentage: manualCalculation.profitPercentage,
          notes,
          calculation: manualCalculation
        })
        
        alert('Manuel fatura başarıyla oluşturuldu')
        resetManualInvoice()
        setShowManualInvoiceModal(false)
        await loadRequests()
      } else {
        throw new Error('Talep oluşturulamadı')
      }
    } catch (e: any) {
      alert('Manuel fatura oluşturulamadı: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleSaveQuote = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.post(`/admin/custom-production-requests/${selectedRequest.id}/proforma-quote`, {
        itemCosts,
        sharedShippingCost,
        profitMargin,
        vatRate,
        unitSalePrice: unitSalePrice, // KDV hariç birim fiyat
        totalOfferAmount: calculation?.totalOfferAmount || 0, // KDV hariç toplam
        totalVatAmount: calculation?.totalVatAmount || 0, // KDV tutarı
        totalWithVat: totalOfferAmount, // KDV dahil toplam (kullanıcının girdiği)
        profitPercentage: profitPercentage,
        notes,
        calculation
      })
      alert('Teklif başarıyla kaydedildi')
      await loadRequests()
    } catch (e: any) {
      alert('Teklif kaydedilemedi: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleRequestRevision = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.put(`/admin/custom-production-requests/${selectedRequest.id}/request-revision`, { 
        revisionNotes: notes || 'Revizyon isteniyor'
      })
      alert('Revizyon talebi gönderildi')
      await loadRequests()
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: 'pending' })
      }
    } catch (e: any) {
      alert('Revizyon talebi gönderilemedi: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.put(`/admin/custom-production-requests/${selectedRequest.id}/approve-proforma`)
      alert('Proforma onaylandı')
      await loadRequests()
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: 'approved' })
      }
    } catch (e: any) {
      alert('Proforma onaylanamadı: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleArchive = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.put(`/admin/custom-production-requests/${selectedRequest.id}/status`, { 
        status: 'archived' 
      })
      alert('Talep arşivlendi')
      await loadRequests()
      setSelectedRequest(null)
    } catch (e: any) {
      alert('Talep arşivlenemedi')
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedRequest || !calculation) {
      alert('Lütfen bir talep seçin ve hesaplama yapın')
      return
    }

    try {
      // jsPDF'i dinamik olarak import et
      let jsPDF: any
      
      try {
        // Önce default export'u dene
        const module = await import('jspdf')
        console.log('jsPDF modülü yüklendi:', Object.keys(module))
        jsPDF = module.default || module.jsPDF || module
        
        // Eğer hala bir obje ise ve içinde jsPDF varsa
        if (jsPDF && typeof jsPDF !== 'function' && jsPDF.jsPDF) {
          jsPDF = jsPDF.jsPDF
        }
        
        // Eğer hala bir obje ise ve default property varsa
        if (jsPDF && typeof jsPDF !== 'function' && jsPDF.default) {
          jsPDF = jsPDF.default
        }
      } catch (importError: any) {
        console.error('jsPDF import hatası:', importError)
        console.error('Import error details:', importError?.message, importError?.stack)
        throw new Error('jsPDF modülü yüklenemedi: ' + (importError?.message || 'Bilinmeyen hata'))
      }
      
      if (!jsPDF) {
        throw new Error('jsPDF sınıfı bulunamadı')
      }
      
      console.log('jsPDF tipi:', typeof jsPDF)
      console.log('jsPDF is function:', typeof jsPDF === 'function')
      
      // jsPDF constructor kontrolü
      if (typeof jsPDF !== 'function') {
        console.error('jsPDF bir fonksiyon değil:', jsPDF)
        throw new Error('jsPDF bir constructor değil')
      }
      
      const doc = new jsPDF('p', 'mm', 'a4')
      
      // UTF-8 desteği için encoding ayarları
      // Türkçe karakterleri UTF-8 olarak koru
      const encodeUTF8 = (text: string): string => {
        if (!text) return text
        // jsPDF için Türkçe karakterleri koru (UTF-8 encoding)
        // Text'i normalize et ve UTF-8 olarak döndür
        try {
          // Unicode normalizasyonu
          const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          // Eğer normalize edilmiş metin orijinaliyle aynıysa (Türkçe karakterler zaten doğru)
          // direkt döndür, değilse orijinali döndür
          return text
        } catch {
          return text
        }
      }
      
      // jsPDF text metodunu UTF-8 destekli wrapper ile sarmala
      const addText = (text: string, x: number, y: number, options?: any) => {
        const encodedText = encodeUTF8(text)
        // Türkçe karakterleri desteklemek için text metodunu özel encoding ile çağır
        if (options && options.align) {
          doc.text(encodedText, x, y, options)
        } else {
          doc.text(encodedText, x, y)
        }
      }
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Renk tanımları
      const colors = {
        primary: [30, 64, 175],      // Blue-600
        secondary: [139, 92, 246],   // Purple-500
        success: [34, 197, 94],       // Green-500
        warning: [234, 179, 8],      // Yellow-500
        danger: [239, 68, 68],        // Red-500
        lightGray: [243, 244, 246],   // Gray-100
        mediumGray: [156, 163, 175],  // Gray-400
        darkGray: [55, 65, 81],       // Gray-700
      }

      // Arka plan rengi (üst kısım)
      doc.setFillColor(...colors.primary)
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      // Fatura Başlığı (beyaz renkte)
      doc.setFontSize(24)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('PROFORMA FATURA', pageWidth / 2, 20, { align: 'center' })
      
      // Fatura Numarası ve Tarih (beyaz renkte)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const invoiceNumber = `PRO-${selectedRequest.requestNumber || selectedRequest.id}`
      const invoiceDate = new Date().toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      doc.text(encodeUTF8(`Fatura No: ${invoiceNumber}`), margin, 32)
      doc.text(encodeUTF8(`Tarih: ${invoiceDate}`), pageWidth - margin, 32, { align: 'right' })
      
      yPos = 50

      // Müşteri Bilgileri - Renkli kutu
      doc.setFillColor(...colors.lightGray)
      doc.setDrawColor(...colors.primary)
      doc.setLineWidth(0.5)
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 40, 3, 3, 'FD')
      
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.primary)
      addText('MÜŞTERİ BİLGİLERİ', margin + 3, yPos + 8)
      
      yPos += 12
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.darkGray)
      addText(`${selectedRequest.customerName}`, margin + 3, yPos)
      yPos += 6

      if (selectedRequest.companyName) {
        addText(`${selectedRequest.companyName}`, margin + 3, yPos)
        yPos += 6
      }

      if (selectedRequest.customerEmail) {
        addText(`${selectedRequest.customerEmail}`, margin + 3, yPos)
        yPos += 6
      }

      if (selectedRequest.customerPhone) {
        addText(`${selectedRequest.customerPhone}`, margin + 3, yPos)
        yPos += 6
      }

      yPos += 12

      // Ürünler Başlığı
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.primary)
      addText('ÜRÜN DETAYLARI', margin, yPos)
      yPos += 8

      // Ürün kartları
      calculation.itemCalculations.forEach((itemCalc) => {
        const selectedItem = selectedItems.find(item => item.id === itemCalc.itemId)
        const itemCostsData = itemCosts[itemCalc.itemId] || { unitCost: 0, printingCost: 0, embroideryCost: 0 }
        
        // Sayfa kontrolü
        if (yPos > pageHeight - 80) {
          doc.addPage()
          yPos = margin
        }

        // Ürün kartı arka planı
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(...colors.mediumGray)
        doc.setLineWidth(0.3)
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 50, 3, 3, 'FD')
        
        const cardStartY = yPos
        
        // Ürün adı
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...colors.primary)
        const productName = itemCalc.productName.length > 40 
          ? itemCalc.productName.substring(0, 37) + '...' 
          : itemCalc.productName
        addText(productName, margin + 5, yPos + 7)
        
        // Toplam adet (sağ üst)
        doc.setFontSize(10)
        doc.setFillColor(...colors.success)
        doc.setDrawColor(...colors.success)
        doc.circle(pageWidth - margin - 10, yPos + 5, 8, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text(itemCalc.quantity.toString(), pageWidth - margin - 10, yPos + 8, { align: 'center' })
        
        yPos += 12

        // Beden dağılımı (varsa)
        if (selectedItem && selectedItem.sizeDistribution) {
          doc.setFontSize(9)
          doc.setTextColor(...colors.darkGray)
          doc.setFont('helvetica', 'bold')
          addText('Beden Dağılımı:', margin + 5, yPos)
          
          let xPos = margin + 40
          const sizeEntries = Object.entries(selectedItem.sizeDistribution).filter(([_, qty]) => qty > 0)
          
          if (sizeEntries.length > 0) {
            sizeEntries.forEach(([size, qty]) => {
              // Beden badge'i
              doc.setFillColor(...colors.secondary)
              doc.setDrawColor(...colors.secondary)
              doc.setLineWidth(0.2)
              const badgeWidth = 12
              const badgeHeight = 6
              doc.roundedRect(xPos, yPos - 4, badgeWidth, badgeHeight, 1, 1, 'FD')
              
              // Beden ve adet
              doc.setFontSize(7)
              doc.setTextColor(255, 255, 255)
              doc.setFont('helvetica', 'bold')
              addText(`${size}: ${qty}`, xPos + badgeWidth / 2, yPos - 0.5, { align: 'center' })
              
              xPos += badgeWidth + 3
              if (xPos > pageWidth - margin - 50) {
                xPos = margin + 40
                yPos += 8
              }
            })
          } else {
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...colors.mediumGray)
            addText('Beden bilgisi yok', margin + 40, yPos)
          }
          
          yPos += 10
        } else {
          yPos += 4
        }

        // Fiyat bilgileri (grid)
        const infoY = cardStartY + 35
        doc.setFontSize(8)
        doc.setTextColor(...colors.mediumGray)
        doc.setFont('helvetica', 'normal')
        
        // Sol sütun
        addText(`Birim Maliyet: ₺${itemCostsData.unitCost.toFixed(2)}`, margin + 5, infoY)
        addText(`Baskı: ₺${itemCostsData.printingCost.toFixed(2)}`, margin + 5, infoY + 4)
        addText(`Nakış: ₺${itemCostsData.embroideryCost.toFixed(2)}`, margin + 5, infoY + 8)
        
        // Orta sütun
        const midX = pageWidth / 2
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...colors.primary)
        addText(`Birim Fiyat:`, midX - 15, infoY)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...colors.success)
        addText(`₺${itemCalc.finalUnitPrice.toFixed(2)}`, midX - 15, infoY + 4)
        
        // Sağ sütun
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...colors.darkGray)
        addText(`KDV (%${calculation.vatRate}):`, pageWidth - margin - 35, infoY)
        doc.setTextColor(...colors.warning)
        addText(`₺${itemCalc.vatAmount.toFixed(2)}`, pageWidth - margin - 35, infoY + 4)
        doc.setFontSize(10)
        doc.setTextColor(...colors.danger)
        addText(`Toplam: ₺${itemCalc.totalWithVat.toFixed(2)}`, pageWidth - margin - 35, infoY + 8)
        
        yPos = cardStartY + 50 + 8
      })

      // Toplam bölümü - Renkli kutu
      if (yPos > pageHeight - 60) {
        doc.addPage()
        yPos = margin
      }

      yPos += 5
      doc.setFillColor(...colors.lightGray)
      doc.setDrawColor(...colors.primary)
      doc.setLineWidth(0.8)
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 3, 3, 'FD')
      
      yPos += 8

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.darkGray)
      
      // Toplam satırları
      addText('Ara Toplam (KDV Hariç):', pageWidth - 100, yPos, { align: 'right' })
      doc.setTextColor(...colors.primary)
      addText(`₺${calculation.totalOfferAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 7

      doc.setTextColor(...colors.darkGray)
      addText(`KDV (%${calculation.vatRate}):`, pageWidth - 100, yPos, { align: 'right' })
      doc.setTextColor(...colors.warning)
      addText(`₺${calculation.totalVatAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 8

      // Genel toplam - vurgulu
      doc.setLineWidth(0.5)
      doc.setDrawColor(...colors.primary)
      doc.line(pageWidth - 100, yPos - 2, pageWidth - margin, yPos - 2)
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.primary)
      addText('GENEL TOPLAM (KDV Dahil):', pageWidth - 100, yPos + 5, { align: 'right' })
      doc.setTextColor(...colors.success)
      doc.setFontSize(16)
      addText(`₺${calculation.totalWithVat.toFixed(2)}`, pageWidth - margin, yPos + 5, { align: 'right' })

      yPos += 20

      // Maliyet özeti - Renkli kutu
      if (yPos > pageHeight - 50) {
        doc.addPage()
        yPos = margin
      }

      doc.setFillColor(...colors.secondary)
      doc.setDrawColor(...colors.secondary)
      doc.setLineWidth(0.5)
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'FD')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      addText('Maliyet Özeti', margin + 5, yPos + 7)
      
      yPos += 10
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      addText(`Toplam Maliyet: ₺${calculation.totalCost.toFixed(2)}`, margin + 5, yPos)
      addText(`Kâr Marjı: %${profitMargin.toFixed(2)}`, pageWidth / 2 - 20, yPos)
      addText(`Kâr: %${calculation.profitPercentage.toFixed(2)}`, pageWidth - margin - 30, yPos, { align: 'right' })
      
      if (sharedShippingCost > 0) {
        yPos += 5
        addText(`Kargo: ₺${sharedShippingCost.toFixed(2)}`, margin + 5, yPos)
      }

      yPos += 12

      // Notlar
      if (notes && notes.trim()) {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin
        }

        doc.setFillColor(...colors.warning)
        doc.setDrawColor(...colors.warning)
        doc.setLineWidth(0.5)
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'FD')
        
        yPos += 7
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        addText('Notlar', margin + 5, yPos)
        yPos += 6
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        
        // Notları satırlara böl
        const encodedNotes = encodeUTF8(notes)
        const noteLines = doc.splitTextToSize(encodedNotes, pageWidth - (margin * 2) - 10)
        noteLines.forEach((line: string) => {
          if (yPos > pageHeight - 20) {
            doc.addPage()
            yPos = margin + 10
          }
          addText(line, margin + 8, yPos)
          yPos += 4
        })
      }

      // Alt bilgi - Renkli çizgi ile
      const finalY = pageHeight - 12
      doc.setLineWidth(0.5)
      doc.setDrawColor(...colors.primary)
      doc.line(margin, finalY - 3, pageWidth - margin, finalY - 3)
      
      doc.setFontSize(7)
      doc.setTextColor(...colors.mediumGray)
      doc.setFont('helvetica', 'italic')
      doc.text(
        'Bu belge bir proforma faturadır ve ödeme belgesi niteliği taşımaz.',
        pageWidth / 2,
        finalY,
        { align: 'center' }
      )

      // PDF'i indir
      const fileName = `proforma-fatura-${selectedRequest.requestNumber || selectedRequest.id}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error: any) {
      console.error('PDF oluşturma hatası:', error)
      console.error('Hata detayı:', error?.stack || error)
      
      // Hata mesajını al
      const errorMessage = error?.message || String(error) || 'Bilinmeyen hata'
      
      // jsPDF yüklü değilse veya başka bir hata varsa, HTML olarak indir
      if (errorMessage.includes('Cannot find module') || 
          errorMessage.includes('jspdf') || 
          errorMessage.includes('jsPDF') ||
          errorMessage.includes('is not a constructor') ||
          errorMessage.includes('Cannot read')) {
        console.log('PDF kütüphanesi hatası, HTML olarak indiriliyor...')
        handleDownloadHTML()
      } else {
        console.error('PDF oluşturma hatası:', errorMessage)
        alert('PDF oluşturulurken bir hata oluştu: ' + errorMessage + '\n\nHTML olarak indiriliyor...')
        handleDownloadHTML()
      }
    }
  }

  const handleDownloadHTML = () => {
    if (!selectedRequest || !calculation) {
      alert('Lütfen bir talep seçin ve hesaplama yapın')
      return
    }

    const html = generateProformaInvoiceHTML()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proforma-fatura-${selectedRequest.requestNumber || selectedRequest.id}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateProformaInvoiceHTML = (): string => {
    if (!selectedRequest || !calculation) return ''

    const invoiceNumber = `PRO-${selectedRequest.requestNumber || selectedRequest.id}`
    const invoiceDate = new Date().toLocaleDateString('tr-TR')
    
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proforma Fatura - ${invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1e40af;
      margin: 0;
      font-size: 28px;
    }
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .customer-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .customer-info h3 {
      margin-top: 0;
      color: #1e40af;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #1e40af;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .totals {
      margin-left: auto;
      width: 300px;
      margin-top: 20px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-final {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      border-top: 2px solid #1e40af;
      padding-top: 10px;
      margin-top: 10px;
    }
    .notes {
      margin-top: 30px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PROFORMA FATURA</h1>
  </div>
  
  <div class="invoice-info">
    <div>
      <strong>Fatura No:</strong> ${invoiceNumber}
    </div>
    <div>
      <strong>Tarih:</strong> ${invoiceDate}
    </div>
  </div>

  <div class="customer-info">
    <h3>Müşteri Bilgileri</h3>
    <p><strong>Müşteri:</strong> ${selectedRequest.customerName}</p>
    ${selectedRequest.companyName ? `<p><strong>Şirket:</strong> ${selectedRequest.companyName}</p>` : ''}
    ${selectedRequest.customerEmail ? `<p><strong>E-posta:</strong> ${selectedRequest.customerEmail}</p>` : ''}
    ${selectedRequest.customerPhone ? `<p><strong>Telefon:</strong> ${selectedRequest.customerPhone}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Ürün</th>
        <th>Adet</th>
        <th>Birim Fiyat (KDV Hariç)</th>
        <th>KDV (%${calculation.vatRate})</th>
        <th>Toplam (KDV Dahil)</th>
      </tr>
    </thead>
    <tbody>
      ${calculation.itemCalculations.map(itemCalc => {
        const itemCostsData = itemCosts[itemCalc.itemId] || { unitCost: 0, printingCost: 0, embroideryCost: 0 }
        return `
        <tr>
          <td>
            <strong>${itemCalc.productName}</strong><br>
            <small style="color: #6b7280;">
              Birim: ₺${itemCostsData.unitCost.toFixed(2)} | 
              Baskı: ₺${itemCostsData.printingCost.toFixed(2)} | 
              Nakış: ₺${itemCostsData.embroideryCost.toFixed(2)}
            </small>
          </td>
          <td>${itemCalc.quantity}</td>
          <td>₺${itemCalc.finalUnitPrice.toFixed(2)}</td>
          <td>₺${itemCalc.vatAmount.toFixed(2)}</td>
          <td>₺${itemCalc.totalWithVat.toFixed(2)}</td>
        </tr>
        `
      }).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Ara Toplam (KDV Hariç):</span>
      <span>₺${calculation.totalOfferAmount.toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>KDV (%${calculation.vatRate}):</span>
      <span>₺${calculation.totalVatAmount.toFixed(2)}</span>
    </div>
    <div class="totals-row total-final">
      <span>GENEL TOPLAM (KDV Dahil):</span>
      <span>₺${calculation.totalWithVat.toFixed(2)}</span>
    </div>
  </div>

  <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
    <h3 style="margin-top: 0; color: #1e40af;">Maliyet Özeti</h3>
    <p>Toplam Maliyet: <strong>₺${calculation.totalCost.toFixed(2)}</strong></p>
    <p>Kâr Marjı: <strong>%${profitMargin.toFixed(2)}</strong></p>
    <p>Kâr Yüzdesi: <strong>%${calculation.profitPercentage.toFixed(2)}</strong></p>
    ${sharedShippingCost > 0 ? `<p>Kargo: <strong>₺${sharedShippingCost.toFixed(2)}</strong></p>` : ''}
  </div>

  ${notes && notes.trim() ? `
  <div class="notes">
    <h3>Notlar</h3>
    <p>${notes.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Bu belge bir proforma faturadır ve ödeme belgesi niteliği taşımaz.</p>
  </div>
</body>
</html>
    `.trim()
  }

  const translateStatus = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'pending') return 'Beklemede'
    if (s === 'review') return 'Teklif'
    if (s === 'approved') return 'Onaylandı'
    if (s === 'rejected') return 'Reddedildi'
    if (s === 'archived') return 'Arşivlendi'
    return status
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'pending') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    if (s === 'review') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    if (s === 'approved') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    if (s === 'rejected') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    if (s === 'archived') return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
  }

  // Filtrelenmiş talepler
  const filteredRequests = requests.filter(request => {
    if (searchQuery && !request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !request.customerName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (customerFilter && !request.customerName.toLowerCase().includes(customerFilter.toLowerCase())) {
      return false
    }
    if (dateFilter) {
      const requestDate = new Date(request.createdAt).toISOString().split('T')[0]
      if (requestDate !== dateFilter) return false
    }
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false
    }
    return true
  })

  const totalQuantity = selectedItems.reduce((sum, item) => {
    const sizeDist = item.sizeDistribution
    if (sizeDist) {
      return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
    }
    return sum + item.quantity
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Proforma Fatura
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Talep yönetimi ve teklif oluşturma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetManualInvoice()
              setShowManualInvoiceModal(true)
            }}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Manuel Fatura Oluştur
          </button>
          <button
            onClick={loadRequests}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BÖLÜM 1: Talep Listesi Paneli */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Talep Listesi
            </h2>

            {/* Filtreler */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Müşteri
                </label>
                <input
                  type="text"
                  placeholder="Müşteri adı..."
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Durum
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Tümü</option>
                  <option value="pending">Beklemede</option>
                  <option value="review">Teklif</option>
                  <option value="approved">Onaylandı</option>
                  <option value="rejected">Reddedildi</option>
                  <option value="archived">Arşivlendi</option>
                </select>
              </div>
            </div>

            {/* Talep Listesi */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Yükleniyor...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Talep bulunamadı
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    onClick={() => handleSelectRequest(request)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedRequest?.id === request.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {request.requestNumber}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {request.customerName}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                        {translateStatus(request.status)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                      {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* BÖLÜM 2-6: Detay ve İşlem Alanı */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRequest ? (
            <>
              {/* BÖLÜM 2: Talep Detay Alanı */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Talep Detayı
                  </h2>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Müşteri Bilgileri
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Müşteri:</span>
                        <span className="ml-2 text-slate-800 dark:text-slate-200 font-medium">
                          {selectedRequest.customerName}
                        </span>
                      </div>
                      {selectedRequest.companyName && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Şirket:</span>
                          <span className="ml-2 text-slate-800 dark:text-slate-200">
                            {selectedRequest.companyName}
                          </span>
                        </div>
                      )}
                      {selectedRequest.customerEmail && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">E-posta:</span>
                          <span className="ml-2 text-slate-800 dark:text-slate-200">
                            {selectedRequest.customerEmail}
                          </span>
                        </div>
                      )}
                      {selectedRequest.customerPhone && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Telefon:</span>
                          <span className="ml-2 text-slate-800 dark:text-slate-200">
                            {selectedRequest.customerPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ürünler */}
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Ürünler
                    </h3>
                    <div className="space-y-4">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex gap-4">
                            {item.productImage && (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                {item.productName}
                              </h4>
                              
                              {/* Beden Dağılım Tablosu */}
                              {(() => {
                                const sizeDist = item.sizeDistribution
                                if (sizeDist && Object.keys(sizeDist).length > 0) {
                                  return (
                                    <div className="mt-3">
                                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Beden Dağılımı:
                                      </div>
                                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {Object.entries(sizeDist).map(([size, quantity]) => (
                                          <div
                                            key={size}
                                            className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center"
                                          >
                                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{size}</div>
                                            <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                              {quantity || 0}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                      Adet: <span className="font-semibold">{item.quantity}</span>
                                    </div>
                                  )
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {selectedItems.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                            Toplam Adet: {totalQuantity}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* BÖLÜM 3: Maliyet Giriş Alanı */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Maliyet Girişi
                </h2>
                
                {/* Her ürün için ayrı maliyet girişi */}
                <div className="space-y-6">
                  {selectedItems.map((item) => {
                    const itemQuantity = item.sizeDistribution 
                      ? Object.values(item.sizeDistribution).reduce((s: number, q: number) => s + q, 0)
                      : item.quantity
                    
                    const costs = itemCosts[item.id] || {
                      baseCost: 0,
                      printingCost: 0,
                      embroideryCost: 0,
                      laborCost: 0,
                      packagingCost: 0,
                      shippingCost: 0
                    }
                    
                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            {item.productName}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Adet: {itemQuantity}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Birim Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={costs.unitCost ?? 0}
                              onChange={(e) => handleCostChange(item.id, 'unitCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Birim başına maliyet</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Baskı Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={costs.printingCost ?? 0}
                              onChange={(e) => handleCostChange(item.id, 'printingCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Toplam baskı maliyeti</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Nakış Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={costs.embroideryCost ?? 0}
                              onChange={(e) => handleCostChange(item.id, 'embroideryCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Toplam nakış maliyeti</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Paylaşılan Kargo Maliyeti, KDV ve Kâr Marjı */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Paylaşılan Kargo Maliyeti (Tüm Sipariş İçin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sharedShippingCost ?? 0}
                        onChange={(e) => handleSharedShippingChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        KDV Oranı (%)
                      </label>
                      <select
                        value={vatRate ?? 10}
                        onChange={(e) => setVatRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {vatRates.map(rate => (
                          <option key={rate} value={rate}>
                            %{rate} KDV
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Kâr Marjı (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={profitMargin ?? 0}
                        onChange={(e) => handleProfitMarginChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BÖLÜM 4: Hesaplama Sonuçları */}
              {calculation && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Hesaplama Sonuçları</span>
                  </h2>
                  
                  {/* Her ürün için ayrı hesaplama */}
                  {calculation.itemCalculations.length > 0 && (
                    <div className="space-y-6 mb-8">
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Ürün Detayları</h3>
                      {calculation.itemCalculations.map((itemCalc, idx) => (
                        <div
                          key={itemCalc.itemId}
                          className="p-5 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-slate-200 dark:border-slate-700">
                            <h4 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-semibold">
                                #{idx + 1}
                              </span>
                              <span>{itemCalc.productName}</span>
                            </h4>
                          </div>
                          
                          {/* Birim Fiyat Bilgileri */}
                          <div className="mb-5 pb-5 border-b border-slate-200 dark:border-slate-700">
                            <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">Birim Fiyat Bilgileri</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Adet</div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{itemCalc.quantity}</div>
                              </div>
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Birim Fiyat (KDV Hariç)</div>
                                <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                                  ₺{itemCalc.unitPrice.toFixed(2)}
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1 italic">
                                  Birim + Baskı + Nakış + Kargo
                                </div>
                              </div>
                              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                                <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-2">Birim Fiyat (KDV Dahil)</div>
                                <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
                                  ₺{itemCalc.finalUnitPrice.toFixed(2)}
                                </div>
                              </div>
                              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Toplam Maliyet</div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white">
                                  ₺{itemCalc.totalCost.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Ürün Toplam Bilgileri */}
                          <div>
                            <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">Ürün Toplam Tutarlar</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-700">
                                <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Ürün Teklif (KDV Hariç)</div>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                  ₺{itemCalc.totalOfferAmount.toFixed(2)}
                                </div>
                              </div>
                              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300 dark:border-orange-700">
                                <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">KDV (%{calculation.vatRate})</div>
                                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                                  ₺{itemCalc.vatAmount.toFixed(2)}
                                </div>
                              </div>
                              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                                <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Toplam (KDV Dahil)</div>
                                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                  ₺{itemCalc.totalWithVat.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Toplam Özet - TÜM ÜRÜNLERİN TOPLAMI */}
                  <div className="pt-6 mt-6 border-t-4 border-purple-500 dark:border-purple-400 bg-gradient-to-r from-purple-50 via-purple-50/50 to-purple-50 dark:from-purple-900/30 dark:via-purple-900/20 dark:to-purple-900/30 rounded-xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                          <Calculator className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span>GENEL TOPLAM (Tüm Ürünler)</span>
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                      <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-md">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Toplam Adet</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                          {calculation.totalQuantity}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-md">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Toplam Maliyet</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                          ₺{calculation.totalCost.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 rounded-xl border-2 border-green-400 dark:border-green-600 shadow-lg">
                        <div className="text-xs font-bold text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">Toplam Teklif</div>
                        <div className="text-sm text-green-600 dark:text-green-500 mb-1">KDV Hariç</div>
                        <div className="text-3xl font-black text-green-700 dark:text-green-400">
                          ₺{calculation.totalOfferAmount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/20 rounded-xl border-2 border-orange-400 dark:border-orange-600 shadow-lg">
                        <div className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2 uppercase tracking-wide">Toplam KDV</div>
                        <div className="text-sm text-orange-600 dark:text-orange-500 mb-1">%{calculation.vatRate}</div>
                        <div className="text-3xl font-black text-orange-700 dark:text-orange-400">
                          ₺{calculation.totalVatAmount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-xl border-4 border-purple-400 dark:border-purple-500 shadow-xl col-span-1 lg:col-span-2">
                        <div className="text-xs font-black text-white mb-2 uppercase tracking-wider">GENEL TOPLAM</div>
                        <div className="text-sm font-semibold text-purple-100 mb-2">KDV Dahil - Tüm Ürünler</div>
                        <div className="text-4xl md:text-5xl font-black text-white leading-tight">
                          ₺{calculation.totalWithVat.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-xl border-2 border-blue-400 dark:border-blue-600 shadow-lg">
                        <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 uppercase tracking-wide">Kâr Yüzdesi</div>
                        <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                          %{calculation.profitPercentage.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BÖLÜM 5: Teklif Oluşturma Alanı */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Teklif Oluşturma
                </h2>
                
                <div className="space-y-4">
                  {calculation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-blue-700 dark:text-blue-400 font-medium">Teklif (KDV Hariç)</div>
                          <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                            ₺{calculation.totalOfferAmount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-orange-700 dark:text-orange-400 font-medium">KDV (%{calculation.vatRate})</div>
                          <div className="text-lg font-bold text-orange-800 dark:text-orange-300">
                            ₺{calculation.totalVatAmount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-purple-700 dark:text-purple-400 font-medium">Toplam (KDV Dahil)</div>
                          <div className="text-lg font-bold text-purple-800 dark:text-purple-300">
                            ₺{calculation.totalWithVat.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-green-700 dark:text-green-400 font-medium">Kâr Yüzdesi</div>
                          <div className="text-lg font-bold text-green-800 dark:text-green-300">
                            %{calculation.profitPercentage.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Birim Satış Fiyatı (KDV Hariç) (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={unitSalePrice ?? 0}
                        onChange={(e) => {
                          const value = e.target.value === '' || isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)
                          setUnitSalePrice(value)
                          if (totalQuantity > 0 && value >= 0 && calculation) {
                            const newTotal = value * totalQuantity
                            const vatAmount = newTotal * (calculation.vatRate / 100)
                            setTotalOfferAmount(newTotal + vatAmount)
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Toplam Teklif Tutarı (KDV Dahil) (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalOfferAmount ?? 0}
                        onChange={(e) => {
                          const value = e.target.value === '' || isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)
                          setTotalOfferAmount(value)
                          if (totalQuantity > 0 && value >= 0 && calculation) {
                            // KDV dahil toplamdan KDV hariç birim fiyatı hesapla
                            const vatMultiplier = 1 + (calculation.vatRate / 100)
                            const totalWithoutVat = value / vatMultiplier
                            setUnitSalePrice(totalWithoutVat / totalQuantity)
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Kâr Yüzdesi (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={(profitPercentage ?? 0).toFixed(2)}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Notlar
                    </label>
                    <textarea
                      value={notes ?? ''}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      placeholder="Teklif ile ilgili notlarınızı buraya yazabilirsiniz..."
                    />
                  </div>
                </div>
              </div>

              {/* BÖLÜM 6: Aksiyonlar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Aksiyonlar
                </h2>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleDownloadPDF}
                    className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF İndir
                  </button>
                  
                  <button
                    onClick={handleSaveQuote}
                    className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Teklif Kaydet
                  </button>
                  
                  <button
                    onClick={handleRequestRevision}
                    className="px-6 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Revizyon İste
                  </button>
                  
                  <button
                    onClick={handleApprove}
                    className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Onayla
                  </button>
                  
                  <button
                    onClick={handleArchive}
                    className="px-6 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Arşivle
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
              <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Detayları görüntülemek için bir talep seçin
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Manuel Fatura Oluşturma Modal */}
      <AnimatePresence>
        {showManualInvoiceModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Manuel Fatura Oluştur</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Yeni bir proforma fatura oluşturun
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowManualInvoiceModal(false)
                    resetManualInvoice()
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Müşteri Bilgileri */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Müşteri Bilgileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Müşteri Adı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualCustomerName}
                        onChange={(e) => setManualCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="Müşteri adı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        E-posta
                      </label>
                      <input
                        type="email"
                        value={manualCustomerEmail}
                        onChange={(e) => setManualCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={manualCustomerPhone}
                        onChange={(e) => setManualCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="0555 123 45 67"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Şirket Adı
                      </label>
                      <input
                        type="text"
                        value={manualCompanyName}
                        onChange={(e) => setManualCompanyName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="Şirket adı"
                      />
                    </div>
                  </div>
                </div>

                {/* Ürünler */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Ürünler
                    </h4>
                    <button
                      onClick={addManualItem}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ürün Ekle
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {manualItems.map((item, index) => (
                      <div key={item.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between mb-4">
                          <h5 className="font-semibold text-slate-800 dark:text-slate-200">Ürün #{index + 1}</h5>
                          <button
                            onClick={() => removeManualItem(item.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Ürün Adı <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => updateManualItem(item.id, 'productName', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              placeholder="Ürün adı"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Adet
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateManualItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        </div>
                        
                        {/* Maliyet Girişi */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Birim Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={manualItemCosts[item.id]?.unitCost || 0}
                              onChange={(e) => handleManualCostChange(item.id, 'unitCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Baskı Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={manualItemCosts[item.id]?.printingCost || 0}
                              onChange={(e) => handleManualCostChange(item.id, 'printingCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Nakış Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={manualItemCosts[item.id]?.embroideryCost || 0}
                              onChange={(e) => handleManualCostChange(item.id, 'embroideryCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {manualItems.length === 0 && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        Henüz ürün eklenmedi. Ürün eklemek için yukarıdaki butonu kullanın.
                      </div>
                    )}
                  </div>
                </div>

                {/* Genel Ayarlar */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Genel Ayarlar
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Paylaşılan Kargo Maliyeti (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sharedShippingCost}
                        onChange={(e) => handleSharedShippingChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        KDV Oranı (%)
                      </label>
                      <select
                        value={vatRate}
                        onChange={(e) => setVatRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {vatRates.map(rate => (
                          <option key={rate} value={rate}>
                            %{rate} KDV
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Kâr Marjı (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={profitMargin}
                        onChange={(e) => handleProfitMarginChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Notlar
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      placeholder="Fatura ile ilgili notlar..."
                    />
                  </div>
                </div>

                {/* Hesaplama Sonuçları */}
                {manualCalculation && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Hesaplama Sonuçları</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam Adet</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{manualCalculation.totalQuantity}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam Maliyet</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₺{manualCalculation.totalCost.toFixed(2)}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam Teklif (KDV Hariç)</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">₺{manualCalculation.totalOfferAmount.toFixed(2)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-lg p-4 text-white">
                        <div className="text-sm text-purple-100 mb-1">GENEL TOPLAM (KDV Dahil)</div>
                        <div className="text-3xl font-black">₺{manualCalculation.totalWithVat.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aksiyon Butonları */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowManualInvoiceModal(false)
                      resetManualInvoice()
                    }}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSaveManualInvoice}
                    className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Faturayı Kaydet
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
