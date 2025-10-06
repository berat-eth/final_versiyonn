'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Filter, Download, Eye, Edit, Trash2, X, Save, Plus, Mail, Phone, MapPin, Calendar, Heart, ShoppingBag, TrendingUp, Award, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface User {
    id: number
    name: string
    email: string
    phone: string
    age: number
    gender: 'Erkek' | 'Kadın' | 'Diğer'
    birthDate: string
    address: string
    city: string
    country: string
    postalCode: string
    registrationDate: string
    lastLogin: string
    status: 'active' | 'inactive' | 'suspended'
    interests: string[]
    favoriteCategories: string[]
    totalOrders: number
    totalSpent: number
    averageOrderValue: number
    loyaltyPoints: number
    membershipLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
    preferredPayment: string
    newsletter: boolean
    smsNotifications: boolean
    notes: string
}

export default function UserDatabase() {
    const [users, setUsers] = useState<User[]>([])

    const [viewingUser, setViewingUser] = useState<User | null>(null)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterMembership, setFilterMembership] = useState('all')

    // Load users from remote API (admin endpoint), fallback to search endpoint
    useEffect(() => {
        let alive = true
        ;(async () => {
            try {
                const res = await fetch('https://api.zerodaysoftware.tr/api/admin/users?page=1&limit=100', { headers: { Accept: 'application/json' } })
                if (res.ok) {
                    const data = await res.json()
                    if (alive && data?.success && Array.isArray(data.data)) {
                        setUsers(data.data as any)
                        return
                    }
                }
                const res2 = await fetch('https://api.zerodaysoftware.tr/api/users/search?query=an&excludeUserId=0', { headers: { Accept: 'application/json' } })
                if (alive && res2.ok) {
                    const data2 = await res2.json()
                    if (data2?.success && Array.isArray(data2.data)) setUsers(data2.data as any)
                }
            } catch {}
        })()
        return () => { alive = false }
    }, [])

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm) ||
            user.city.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = filterStatus === 'all' || user.status === filterStatus
        const matchesMembership = filterMembership === 'all' || user.membershipLevel === filterMembership

        return matchesSearch && matchesStatus && matchesMembership
    })

    const stats = {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        inactive: users.filter(u => u.status === 'inactive').length,
        totalRevenue: users.reduce((sum, u) => sum + u.totalSpent, 0),
        avgOrderValue: users.reduce((sum, u) => sum + u.averageOrderValue, 0) / users.length,
        totalOrders: users.reduce((sum, u) => sum + u.totalOrders, 0)
    }

    const membershipColors = {
        Bronze: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
        Silver: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
        Gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
        Platinum: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' }
    }

    const statusColors = {
        active: { bg: 'bg-green-100', text: 'text-green-700' },
        inactive: { bg: 'bg-slate-100', text: 'text-slate-700' },
        suspended: { bg: 'bg-red-100', text: 'text-red-700' }
    }

    const deleteUser = (id: number) => {
        if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
            setUsers(users.filter(u => u.id !== id))
        }
    }

    const exportData = async () => {
        try {
            // Sunucu CSV export ucu: text/csv beklenir
            const res = await fetch('https://api.zerodaysoftware.tr/api/admin/users/export?format=csv', { headers: { Accept: 'text/csv' } })
            if (res.ok) {
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `kullanicilar-${new Date().toISOString().slice(0,10)}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                return
            }
            // Fallback: mevcut users ile istemci tarafı CSV oluştur
            const header = ['ID','Ad','Email','Telefon','Şehir','Üyelik','Durum','Sipariş','Harcama']
            const rows = users.map(u => [u.id, u.name, u.email, u.phone, u.city, u.membershipLevel, u.status, u.totalOrders, u.totalSpent])
            const csv = [header, ...rows]
              .map(r => r.map(v => String(v).replaceAll('"','""')).map(v => `"${v}"`).join(','))
              .join('\n')
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `kullanicilar-${new Date().toISOString().slice(0,10)}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch {
            alert('Export indirilemedi')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center">
                        <Users className="w-8 h-8 text-blue-600 mr-3" />
                        Kullanıcı Seviyesi
                    </h2>
                    <p className="text-slate-500 mt-1">Tüm kullanıcı verilerini detaylı şekilde yönetin</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={exportData}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Kullanıcı</span>
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm p-5"
                >
                    <p className="text-slate-500 text-sm mb-2">Toplam Kullanıcı</p>
                    <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm p-5"
                >
                    <p className="text-slate-500 text-sm mb-2">Aktif</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm p-5"
                >
                    <p className="text-slate-500 text-sm mb-2">Pasif</p>
                    <p className="text-3xl font-bold text-slate-600">{stats.inactive}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl shadow-sm p-5"
                >
                    <p className="text-slate-500 text-sm mb-2">Toplam Gelir</p>
                    <p className="text-3xl font-bold text-blue-600">₺{(stats.totalRevenue / 1000).toFixed(0)}K</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl shadow-sm p-5"
                >
                    <p className="text-slate-500 text-sm mb-2">Ort. Sipariş</p>
                    <p className="text-3xl font-bold text-purple-600">₺{stats.avgOrderValue.toFixed(0)}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-xl shadow-sm p-5"
                >
                    <p className="text-slate-500 text-sm mb-2">Toplam Sipariş</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.totalOrders}</p>
                </motion.div>
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="İsim, email, telefon veya şehir ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Pasif</option>
                                <option value="suspended">Askıya Alınmış</option>
                            </select>
                        </div>
                        <select
                            value={filterMembership}
                            onChange={(e) => setFilterMembership(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Tüm Üyelikler</option>
                            <option value="Bronze">Bronze</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="Platinum">Platinum</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Kullanıcı Listesi */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-6">
                    Kullanıcılar ({filteredUsers.length})
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kullanıcı</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İletişim</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Yaş</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Şehir</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Üyelik</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Sipariş</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Harcama</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user, index) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-10 h-10 bg-gradient-to-br ${user.membershipLevel === 'Platinum' ? 'from-purple-500 to-purple-600' :
                                                user.membershipLevel === 'Gold' ? 'from-yellow-500 to-yellow-600' :
                                                    user.membershipLevel === 'Silver' ? 'from-slate-400 to-slate-500' :
                                                        'from-orange-500 to-orange-600'
                                                } rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{user.name}</p>
                                                <p className="text-xs text-slate-500">ID: {user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-xs text-slate-600">
                                                <Mail className="w-3 h-3 mr-2 text-slate-400" />
                                                {user.email}
                                            </div>
                                            <div className="flex items-center text-xs text-slate-600">
                                                <Phone className="w-3 h-3 mr-2 text-slate-400" />
                                                {user.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-700 font-medium">{user.age}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-sm text-slate-600">
                                            <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                            {user.city}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${membershipColors[user.membershipLevel].bg} ${membershipColors[user.membershipLevel].text} ${membershipColors[user.membershipLevel].border}`}>
                                            <Award className="w-3 h-3 mr-1" />
                                            {user.membershipLevel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-800">{user.totalOrders}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-green-600">₺{user.totalSpent.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusColors[user.status].bg} ${statusColors[user.status].text}`}>
                                            {user.status === 'active' ? 'Aktif' : user.status === 'inactive' ? 'Pasif' : 'Askıda'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setViewingUser(user)}
                                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                                            >
                                                <Eye className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                                            >
                                                <Edit className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                            >
                                                <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Filtrelere uygun kullanıcı bulunamadı</p>
                    </div>
                )}
            </div>

            {/* Detay Modal */}
            <AnimatePresence>
                {viewingUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setViewingUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                                <h3 className="text-2xl font-bold text-slate-800">Kullanıcı Detayları</h3>
                                <button
                                    onClick={() => setViewingUser(null)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Temel Bilgiler */}
                                <div className="flex items-center space-x-4">
                                    <div className={`w-20 h-20 bg-gradient-to-br ${viewingUser.membershipLevel === 'Platinum' ? 'from-purple-500 to-purple-600' :
                                        viewingUser.membershipLevel === 'Gold' ? 'from-yellow-500 to-yellow-600' :
                                            viewingUser.membershipLevel === 'Silver' ? 'from-slate-400 to-slate-500' :
                                                'from-orange-500 to-orange-600'
                                        } rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                                        {viewingUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-slate-800">{viewingUser.name}</h4>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${membershipColors[viewingUser.membershipLevel].bg} ${membershipColors[viewingUser.membershipLevel].text} ${membershipColors[viewingUser.membershipLevel].border}`}>
                                                <Award className="w-3 h-3 inline mr-1" />
                                                {viewingUser.membershipLevel}
                                            </span>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusColors[viewingUser.status].bg} ${statusColors[viewingUser.status].text}`}>
                                                {viewingUser.status === 'active' ? 'Aktif' : viewingUser.status === 'inactive' ? 'Pasif' : 'Askıda'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Kişisel Bilgiler */}
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h5 className="font-semibold text-slate-800 mb-4 flex items-center">
                                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                                        Kişisel Bilgiler
                                    </h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Email</p>
                                            <p className="font-medium text-slate-800">{viewingUser.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Telefon</p>
                                            <p className="font-medium text-slate-800">{viewingUser.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Yaş</p>
                                            <p className="font-medium text-slate-800">{viewingUser.age} yaşında</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Cinsiyet</p>
                                            <p className="font-medium text-slate-800">{viewingUser.gender}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Doğum Tarihi</p>
                                            <p className="font-medium text-slate-800">{viewingUser.birthDate}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Ülke</p>
                                            <p className="font-medium text-slate-800">{viewingUser.country}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Adres Bilgileri */}
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                    <h5 className="font-semibold text-blue-800 mb-4 flex items-center">
                                        <MapPin className="w-5 h-5 mr-2" />
                                        Adres Bilgileri
                                    </h5>
                                    <div className="space-y-2">
                                        <p className="text-slate-700">{viewingUser.address}</p>
                                        <p className="text-slate-700">{viewingUser.city}, {viewingUser.country}</p>
                                        <p className="text-slate-700">Posta Kodu: {viewingUser.postalCode}</p>
                                    </div>
                                </div>

                                {/* Alışveriş İstatistikleri */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center text-green-600 mb-2">
                                            <ShoppingBag className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Toplam Sipariş</p>
                                        </div>
                                        <p className="text-3xl font-bold text-green-700">{viewingUser.totalOrders}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center text-blue-600 mb-2">
                                            <TrendingUp className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Toplam Harcama</p>
                                        </div>
                                        <p className="text-3xl font-bold text-blue-700">₺{viewingUser.totalSpent.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                        <div className="flex items-center text-purple-600 mb-2">
                                            <ShoppingBag className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Ort. Sipariş</p>
                                        </div>
                                        <p className="text-3xl font-bold text-purple-700">₺{viewingUser.averageOrderValue.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                                        <div className="flex items-center text-yellow-600 mb-2">
                                            <Award className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Puan</p>
                                        </div>
                                        <p className="text-3xl font-bold text-yellow-700">{viewingUser.loyaltyPoints}</p>
                                    </div>
                                </div>

                                {/* İlgi Alanları */}
                                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                                    <h5 className="font-semibold text-purple-800 mb-4 flex items-center">
                                        <Heart className="w-5 h-5 mr-2" />
                                        İlgi Alanları
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {viewingUser.interests.map((interest, index) => (
                                            <span key={index} className="px-3 py-1 bg-purple-200 text-purple-800 rounded-lg text-sm font-medium">
                                                {interest}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Favori Kategoriler */}
                                <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                                    <h5 className="font-semibold text-orange-800 mb-4 flex items-center">
                                        <ShoppingBag className="w-5 h-5 mr-2" />
                                        Favori Kategoriler
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {viewingUser.favoriteCategories.map((category, index) => (
                                            <span key={index} className="px-3 py-1 bg-orange-200 text-orange-800 rounded-lg text-sm font-medium">
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Hesap Bilgileri */}
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h5 className="font-semibold text-slate-800 mb-4 flex items-center">
                                        <Clock className="w-5 h-5 mr-2 text-slate-600" />
                                        Hesap Bilgileri
                                    </h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Kayıt Tarihi</p>
                                            <p className="font-medium text-slate-800">{viewingUser.registrationDate}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Son Giriş</p>
                                            <p className="font-medium text-slate-800">{viewingUser.lastLogin}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Tercih Edilen Ödeme</p>
                                            <p className="font-medium text-slate-800">{viewingUser.preferredPayment}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Bildirimler</p>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 rounded text-xs ${viewingUser.newsletter ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    Email: {viewingUser.newsletter ? 'Açık' : 'Kapalı'}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs ${viewingUser.smsNotifications ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    SMS: {viewingUser.smsNotifications ? 'Açık' : 'Kapalı'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notlar */}
                                {viewingUser.notes && (
                                    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                                        <h5 className="font-semibold text-yellow-800 mb-2">Notlar</h5>
                                        <p className="text-slate-700">{viewingUser.notes}</p>
                                    </div>
                                )}

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => {
                                            setViewingUser(null)
                                            setEditingUser(viewingUser)
                                        }}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                                    >
                                        Düzenle
                                    </button>
                                    <button
                                        onClick={() => setViewingUser(null)}
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
