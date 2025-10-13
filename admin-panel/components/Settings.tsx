'use client'

import { useState } from 'react'
import { Settings as SettingsIcon, User, Bell, Lock, Globe, Palette, Database, Mail, Smartphone, CreditCard, Shield, Save, Eye, EyeOff, UserPlus, Edit, Trash2, CheckCircle, XCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Settings() {
    const [activeTab, setActiveTab] = useState('profile')
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showAddAdminModal, setShowAddAdminModal] = useState(false)
    const [adminUsers, setAdminUsers] = useState([] as Array<{ id: number; name: string; email: string; role: string; status: 'Aktif' | 'Pasif'; lastLogin: string; permissions: string[] }>)

    // Form States
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        avatar: ''
    })

    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: false,
        smsNotifications: false,
        pushNotifications: false,
        orderUpdates: false,
        marketingEmails: false,
        securityAlerts: false,
        weeklyReports: false
    })

    const [securitySettings, setSecuritySettings] = useState({
        twoFactorAuth: false,
        sessionTimeout: '30',
        loginAlerts: false,
        ipWhitelist: false
    })

    const [appearanceSettings, setAppearanceSettings] = useState({
        theme: 'light',
        language: 'tr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'TRY',
        timezone: 'Europe/Istanbul'
    })

    const tabs = [
        { id: 'profile', label: 'Profil Bilgileri', icon: User },
        { id: 'admin-users', label: 'Admin Kullanıcılar', icon: Shield },
        { id: 'notifications', label: 'Bildirimler', icon: Bell },
        { id: 'security', label: 'Güvenlik', icon: Lock },
        { id: 'appearance', label: 'Görünüm', icon: Palette },
        { id: 'system', label: 'Sistem', icon: Database },
        { id: 'payment', label: 'Ödeme', icon: CreditCard },
    ]

    const saveSettings = () => {
        alert('Ayarlar başarıyla kaydedildi!')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center">
                        <SettingsIcon className="w-8 h-8 text-blue-600 mr-3" />
                        Ayarlar
                    </h2>
                    <p className="text-slate-500 mt-1">Sistem ve hesap ayarlarınızı yönetin</p>
                </div>
                <button
                    onClick={saveSettings}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow"
                >
                    <Save className="w-5 h-5" />
                    <span>Değişiklikleri Kaydet</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        {/* Profil Bilgileri */}
                        {activeTab === 'profile' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Profil Bilgileri</h3>
                                    <p className="text-slate-500 text-sm mb-6">Kişisel bilgilerinizi güncelleyin</p>
                                </div>

                                <div className="flex items-center space-x-6 mb-6">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {profileData.avatar || '👤'}
                                    </div>
                                    <div>
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                            Fotoğraf Değiştir
                                        </button>
                                        <p className="text-xs text-slate-500 mt-2">JPG, PNG veya GIF (Max. 2MB)</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Ad Soyad
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Telefon
                                        </label>
                                        <input
                                            type="tel"
                                            value={profileData.phone}
                                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Rol
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.role}
                                            placeholder="Belirtilmemiş"
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200">
                                    <h4 className="font-semibold text-slate-800 mb-4">Şifre Değiştir</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Mevcut Şifre
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Yeni Şifre
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Admin Kullanıcılar */}
                        {activeTab === 'admin-users' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">Admin Kullanıcı Yönetimi</h3>
                                        <p className="text-slate-500 text-sm">Sistem yöneticilerini ve yetkilerini yönetin</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddAdminModal(true)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                        <span>Yeni Admin Ekle</span>
                                    </button>
                                </div>

                                {adminUsers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                            <p className="text-sm text-blue-600 mb-1">Toplam Admin</p>
                                            <p className="text-3xl font-bold text-blue-700">{adminUsers.length}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                            <p className="text-sm text-green-600 mb-1">Aktif</p>
                                            <p className="text-3xl font-bold text-green-700">{adminUsers.filter(u => u.status === 'Aktif').length}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                                            <p className="text-sm text-red-600 mb-1">Pasif</p>
                                            <p className="text-3xl font-bold text-red-700">{adminUsers.filter(u => u.status === 'Pasif').length}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm">Henüz admin kullanıcı bulunmuyor.</div>
                                )}

                                {adminUsers.length > 0 ? (
                                    <div className="space-y-4">
                                        {adminUsers.map((admin, index) => (
                                            <motion.div
                                                key={admin.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
                                            >
                                                <div className="flex items-center justify-between gap-6 flex-wrap">
                                                    <div className="flex items-center space-x-4 flex-1">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                                            {admin.name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-lg font-bold text-slate-800">{admin.name}</h4>
                                                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${admin.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {admin.status === 'Aktif' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                                                                    {admin.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 mb-2">{admin.email}</p>
                                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                                                                    {admin.role}
                                                                </span>
                                                                <span>Son Giriş: {admin.lastLogin}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="text-xs text-slate-500 mb-1">Yetkiler</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {admin.permissions.map((perm, idx) => (
                                                                    <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                                                        {perm}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                                                                <Edit className="w-5 h-5" />
                                                            </button>
                                                            <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-600">Listelenecek admin bulunamadı.</div>
                                )}

                                {/* Yeni Admin Ekleme Modal */}
                                <AnimatePresence>
                                    {showAddAdminModal && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                            onClick={() => setShowAddAdminModal(false)}
                                        >
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.9, opacity: 0 }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
                                            >
                                                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                                    <h3 className="text-2xl font-bold text-slate-800">Yeni Admin Kullanıcı Ekle</h3>
                                                    <button
                                                        onClick={() => setShowAddAdminModal(false)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-6 h-6" />
                                                    </button>
                                                </div>

                                                <div className="p-6 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-2">Ad Soyad</label>
                                                            <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ahmet Yılmaz" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-2">E-posta</label>
                                                            <input type="email" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin@example.com" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-2">Rol</label>
                                                            <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                                <option>Super Admin</option>
                                                                <option>Admin</option>
                                                                <option>Moderatör</option>
                                                                <option>Editör</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-2">Durum</label>
                                                            <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                                <option>Aktif</option>
                                                                <option>Pasif</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Yetkiler</label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <label className="flex items-center space-x-2">
                                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                                                                <span className="text-sm text-slate-700">Ürün Yönetimi</span>
                                                            </label>
                                                            <label className="flex items-center space-x-2">
                                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                                                                <span className="text-sm text-slate-700">Sipariş Yönetimi</span>
                                                            </label>
                                                            <label className="flex items-center space-x-2">
                                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                                                                <span className="text-sm text-slate-700">Müşteri Yönetimi</span>
                                                            </label>
                                                            <label className="flex items-center space-x-2">
                                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                                                                <span className="text-sm text-slate-700">Raporlar</span>
                                                            </label>
                                                            <label className="flex items-center space-x-2">
                                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                                                                <span className="text-sm text-slate-700">Ayarlar</span>
                                                            </label>
                                                            <label className="flex items-center space-x-2">
                                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                                                                <span className="text-sm text-slate-700">Tüm Yetkiler</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="flex space-x-3 pt-4">
                                                        <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium">
                                                            Admin Ekle
                                                        </button>
                                                        <button 
                                                            onClick={() => setShowAddAdminModal(false)}
                                                            className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                                                        >
                                                            İptal
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Bildirimler */}
                        {activeTab === 'notifications' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Bildirim Ayarları</h3>
                                    <p className="text-slate-500 text-sm mb-6">Hangi bildirimleri almak istediğinizi seçin</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Mail className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium text-slate-800">Email Bildirimleri</p>
                                                <p className="text-xs text-slate-500">Seçili değil</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.emailNotifications}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Smartphone className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-slate-800">SMS Bildirimleri</p>
                                                <p className="text-xs text-slate-500">Seçili değil</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.smsNotifications}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Bell className="w-5 h-5 text-purple-600" />
                                            <div>
                                                <p className="font-medium text-slate-800">Push Bildirimleri</p>
                                                <p className="text-xs text-slate-500">Seçili değil</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.pushNotifications}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200">
                                    <h4 className="font-semibold text-slate-800 mb-4">Bildirim Tercihleri</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.orderUpdates}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, orderUpdates: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Sipariş güncellemeleri</span>
                                        </label>
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.marketingEmails}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, marketingEmails: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Pazarlama emailları</span>
                                        </label>
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.securityAlerts}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, securityAlerts: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Güvenlik uyarıları</span>
                                        </label>
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.weeklyReports}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, weeklyReports: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Haftalık raporlar</span>
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Güvenlik */}
                        {activeTab === 'security' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Güvenlik Ayarları</h3>
                                    <p className="text-slate-500 text-sm mb-6">Hesabınızın güvenliğini artırın</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Shield className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium text-slate-800">İki Faktörlü Doğrulama</p>
                                                <p className="text-xs text-slate-500">Ekstra güvenlik katmanı ekleyin</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={securitySettings.twoFactorAuth}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Bell className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-slate-800">Giriş Uyarıları</p>
                                                <p className="text-xs text-slate-500">Yeni giriş yapıldığında bildirim alın</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={securitySettings.loginAlerts}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, loginAlerts: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Oturum Zaman Aşımı (dakika)
                                        </label>
                                        <select
                                            value={securitySettings.sessionTimeout}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="15">15 dakika</option>
                                            <option value="30">30 dakika</option>
                                            <option value="60">1 saat</option>
                                            <option value="120">2 saat</option>
                                        </select>
                                    </div>
                                </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <h4 className="font-semibold text-slate-800 mb-2">Aktif Oturumlar</h4>
                                        <p className="text-sm text-slate-600">Oturum bilgisi bulunmuyor.</p>
                                    </div>
                            </motion.div>
                        )}

                        {/* Görünüm */}
                        {activeTab === 'appearance' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Görünüm Ayarları</h3>
                                    <p className="text-slate-500 text-sm mb-6">Arayüz tercihlerinizi özelleştirin</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-3">
                                            Tema
                                        </label>
                                        <div className="grid grid-cols-3 gap-4">
                                            <button
                                                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'light' })}
                                                className={`p-4 border-2 rounded-xl transition-all ${appearanceSettings.theme === 'light'
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="w-full h-20 bg-white rounded-lg mb-2 border border-slate-200"></div>
                                                <p className="text-sm font-medium text-slate-800">Açık</p>
                                            </button>
                                            <button
                                                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'dark' })}
                                                className={`p-4 border-2 rounded-xl transition-all ${appearanceSettings.theme === 'dark'
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="w-full h-20 bg-slate-800 rounded-lg mb-2"></div>
                                                <p className="text-sm font-medium text-slate-800">Koyu</p>
                                            </button>
                                            <button
                                                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'auto' })}
                                                className={`p-4 border-2 rounded-xl transition-all ${appearanceSettings.theme === 'auto'
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="w-full h-20 bg-gradient-to-r from-white to-slate-800 rounded-lg mb-2"></div>
                                                <p className="text-sm font-medium text-slate-800">Otomatik</p>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Dil
                                        </label>
                                        <select
                                            value={appearanceSettings.language}
                                            onChange={(e) => setAppearanceSettings({ ...appearanceSettings, language: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="tr">Türkçe</option>
                                            <option value="en">English</option>
                                            <option value="de">Deutsch</option>
                                            <option value="fr">Français</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Tarih Formatı
                                            </label>
                                            <select
                                                value={appearanceSettings.dateFormat}
                                                onChange={(e) => setAppearanceSettings({ ...appearanceSettings, dateFormat: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Para Birimi
                                            </label>
                                            <select
                                                value={appearanceSettings.currency}
                                                onChange={(e) => setAppearanceSettings({ ...appearanceSettings, currency: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="TRY">₺ TRY</option>
                                                <option value="USD">$ USD</option>
                                                <option value="EUR">€ EUR</option>
                                                <option value="GBP">£ GBP</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Saat Dilimi
                                        </label>
                                        <select
                                            value={appearanceSettings.timezone}
                                            onChange={(e) => setAppearanceSettings({ ...appearanceSettings, timezone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
                                            <option value="Europe/London">Londra (GMT+0)</option>
                                            <option value="America/New_York">New York (GMT-5)</option>
                                            <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Sistem */}
                        {activeTab === 'system' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Sistem Ayarları</h3>
                                    <p className="text-slate-500 text-sm mb-6">Sistem ve veritabanı ayarları</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                        <Database className="w-8 h-8 text-slate-700 mb-3" />
                                        <h4 className="font-semibold text-slate-800 mb-2">Veritabanı</h4>
                                        <p className="text-sm text-slate-600">Durum bilgisi bulunmuyor.</p>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                        <Globe className="w-8 h-8 text-slate-700 mb-3" />
                                        <h4 className="font-semibold text-slate-800 mb-2">API Durumu</h4>
                                        <p className="text-sm text-slate-600">Durum bilgisi bulunmuyor.</p>
                                    </div>
                                </div>

                                    <div className="bg-slate-50 rounded-xl p-6">
                                    <h4 className="font-semibold text-slate-800 mb-4">Sistem Bilgileri</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Versiyon</span>
                                                <span className="font-bold text-slate-800">-</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Son Güncelleme</span>
                                                <span className="font-bold text-slate-800">-</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Sunucu Durumu</span>
                                                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">Bilinmiyor</span>
                                        </div>
                                    </div>
                                </div>

                                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                                    <h4 className="font-semibold text-red-800 mb-2">Tehlikeli Bölge</h4>
                                    <p className="text-sm text-red-700 mb-4">Bu işlemler geri alınamaz</p>
                                    <div className="space-y-3">
                                            <div className="text-sm text-red-700">Aksiyonlar yapılandırılmadı.</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Ödeme */}
                        {activeTab === 'payment' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Ödeme Ayarları</h3>
                                    <p className="text-slate-500 text-sm mb-6">Ödeme yöntemlerinizi yönetin</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="border-2 border-blue-600 bg-blue-50 rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <CreditCard className="w-6 h-6 text-blue-600" />
                                                <div>
                                                    <p className="font-semibold text-slate-800">•••• •••• •••• 4242</p>
                                                    <p className="text-sm text-slate-500">Son kullanma: 12/25</p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium">
                                                Varsayılan
                                            </span>
                                        </div>
                                    </div>

                                    <button className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all text-slate-600 hover:text-blue-600 font-medium">
                                        + Yeni Kart Ekle
                                    </button>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h4 className="font-semibold text-slate-800 mb-4">Fatura Bilgileri</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Şirket Adı
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Şirket Adı"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Vergi Numarası
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="1234567890"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
