'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Download, Eye, Mail, Phone, MapPin, TrendingUp, RefreshCw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { userService } from '@/lib/services'
import type { User } from '@/lib/api'

interface CustomerStats {
  orders?: number
  totalSpent?: number
  lastOrder?: string
}

export default function Customers() {
  const [customers, setCustomers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingCustomer, setViewingCustomer] = useState<User | null>(null)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      // Backend'de tüm kullanıcıları getiren endpoint yoksa, yaygın bir harf ile arama yapıyoruz
      const response = await userService.getAllUsers()
      
      if (response.success && response.data) {
        setCustomers(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Müşteriler yüklenirken hata oluştu')
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      fetchCustomers()
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await userService.searchUsers(query, 0)
      
      if (response.success && response.data) {
        setCustomers(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        searchCustomers(searchTerm)
      } else {
        fetchCustomers()
      }
    }, 500)

    return () => clearTimeout(delaySearch)
  }, [searchTerm])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Müşteriler yükleniyor...</p>
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
          onClick={fetchCustomers}
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
          <h2 className="text-3xl font-bold text-slate-800">Müşteri Yönetimi</h2>
          <p className="text-slate-500 mt-1">Backend'den gelen müşteriler</p>
        </div>
        <button
          onClick={fetchCustomers}
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
              <p className="text-slate-500 text-sm">Toplam Müşteri</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Aktif Müşteri</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Yeni Müşteri (Bu Ay)</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {customers.filter(c => {
                  const createdDate = new Date(c.createdAt)
                  const now = new Date()
                  return createdDate.getMonth() === now.getMonth() && 
                         createdDate.getFullYear() === now.getFullYear()
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Kayıtlı Email</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100">
              <Filter className="w-4 h-4" />
              <span>Filtrele</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100">
              <Download className="w-4 h-4" />
              <span>Dışa Aktar</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İletişim</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Adres</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kayıt Tarihi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-600">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{customer.name}</p>
                        <p className="text-xs text-slate-500">ID: #{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{customer.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{customer.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{customer.address || 'Belirtilmemiş'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600">
                      {new Date(customer.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setViewingCustomer(customer)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5 text-blue-600" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">Müşteri bulunamadı</p>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {viewingCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingCustomer(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">Müşteri Detayları</h3>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-blue-600">
                      {viewingCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-800">{viewingCustomer.name}</h4>
                    <p className="text-slate-500">ID: #{viewingCustomer.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Email</p>
                    <p className="text-lg font-semibold text-slate-800">{viewingCustomer.email}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Telefon</p>
                    <p className="text-lg font-semibold text-slate-800">{viewingCustomer.phone}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                    <p className="text-sm text-slate-500 mb-1">Adres</p>
                    <p className="text-lg font-semibold text-slate-800">{viewingCustomer.address || 'Belirtilmemiş'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Kayıt Tarihi</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {new Date(viewingCustomer.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
