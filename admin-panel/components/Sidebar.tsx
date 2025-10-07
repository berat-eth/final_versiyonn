'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, BarChart3, Bell, LogOut, ShoppingBasket, Megaphone, Image, FileText, UserCog, UsersRound, Edit, Radio, MessageSquare, Shield, Crown, Ticket, Star, AlertTriangle, Menu, X, Database, Sparkles, Mail, Smartphone, Briefcase, UserPlus, PhoneCall, Calendar, Target, TrendingUp, FileCheck, Factory, ClipboardList, PackageCheck, Warehouse, Wallet, CreditCard, RotateCcw, MapPin, Gift, Disc, FolderTree, Activity, UserCircle, DollarSign, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      router.push('/login')
    }
  }
  const menuGroups = [
    {
      title: 'Ana Menü',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'E-Ticaret',
      items: [
        { id: 'orders', label: 'Siparişler', icon: ShoppingCart },
        { id: 'cart', label: 'Sepetler', icon: ShoppingBasket },
        { id: 'products', label: 'Ürünler', icon: Package },
        { id: 'categories', label: 'Kategoriler', icon: FolderTree },
        { id: 'reviews', label: 'Yorumlar', icon: Star },
        { id: 'return-requests', label: 'İade Talepleri', icon: RotateCcw },
      ]
    },
    {
      title: 'Müşteri Yönetimi',
      items: [
        { id: 'customers', label: 'Kullanıcılar', icon: Users },
        { id: 'user-levels', label: 'Kullanıcı Seviyesi', icon: UsersRound },
        { id: 'user-addresses', label: 'Kullanıcı Adresleri', icon: MapPin },
        { id: 'user-profiles', label: 'Kullanıcı Profilleri', icon: User },
        { id: 'user-events', label: 'Kullanıcı Etkinlikleri', icon: Activity },
        { id: 'customer-care', label: 'Müşteri Bakiyeleri', icon: UserCog },
        { id: 'customer-analytics', label: 'Müşteri Analitiği', icon: BarChart3 },
        { id: 'segments', label: 'Müşteri Segmentleri', icon: UsersRound },
      ]
    },
    // CRM grubu kaldırıldı
    {
      title: 'Üretim & Lojistik',
      items: [
        { id: 'production-planning', label: 'Üretim Planlama', icon: Factory },
        { id: 'production-orders', label: 'Üretim Emirleri', icon: ClipboardList },
        { id: 'production-tracking', label: 'Üretim Takibi', icon: PackageCheck },
        { id: 'warehouse-management', label: 'Depo Yönetimi', icon: Warehouse },
      ]
    },
    {
      title: 'Pazarlama',
      items: [
        { id: 'campaigns', label: 'Kampanyalar', icon: Megaphone },
        { id: 'coupons', label: 'Kupon Kodları', icon: Ticket },
        { id: 'user-discount-codes', label: 'Kullanıcı İndirim Kodları', icon: Ticket },
        { id: 'discount-wheel-spins', label: 'Çarkıfelek', icon: Disc },
        { id: 'gift-cards', label: 'Hediye Kartları', icon: Gift },
        { id: 'email', label: 'E-posta', icon: Mail },
        { id: 'sms', label: 'SMS', icon: Smartphone },
        { id: 'push-notifications', label: 'Push Bildirimler', icon: Bell },
        { id: 'stories', label: "Story'ler", icon: Image },
        { id: 'banners', label: 'Banner Yönetimi', icon: Image },
      ]
    },
    {
      title: 'Analiz & Raporlama',
      items: [
        { id: 'analytics', label: 'Analitik', icon: BarChart3 },
        { id: 'live-data', label: 'Canlı Veriler', icon: Radio },
      ]
    },
    {
      title: 'Yapay Zeka',
      items: [
        { id: 'project-ajax', label: 'Project Ajax', icon: Sparkles },
        { id: 'recommendations', label: 'Ürün Önerileri', icon: Sparkles },
      ]
    },
    {
      title: 'Finans',
      items: [
        { id: 'payment-transactions', label: 'Ödeme İşlemleri', icon: CreditCard },
        { id: 'user-wallets', label: 'Kullanıcı Cüzdanları', icon: Wallet },
        { id: 'wallet-recharge-requests', label: 'Bakiye Yükleme', icon: Wallet },
        { id: 'referral-earnings', label: 'Referans Kazançları', icon: DollarSign },
      ]
    },

    {
      title: 'Sistem',
      items: [
        { id: 'server-stats', label: 'Sunucu İstatistikleri', icon: Activity },
        { id: 'backup', label: 'Veri Yedekleme', icon: Settings },
        { id: 'file-manager', label: 'Dosya Yöneticisi', icon: FolderTree },
        { id: 'security', label: 'Güvenlik', icon: Shield },
        { id: 'snort-logs', label: 'Snort IDS Logları', icon: AlertTriangle },
        { id: 'sql-query', label: 'SQL Sorgu Penceresi', icon: Database },
        { id: 'chatbot', label: 'Chatbot', icon: MessageSquare },
      ]
    },
    {
      title: 'B2B',
      items: [
        { id: 'applications', label: 'Bayilik Başvuruları', icon: FileText },
        { id: 'bulk-custom-production', label: 'Özel Toptan Üretim', icon: Crown },
      ]
    },
  ]

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <aside className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl flex flex-col h-screen transition-all duration-300 fixed lg:relative z-50`}>
        {/* Header with Toggle */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            {!isCollapsed && (
              <span className="text-xs text-slate-400">Menü</span>
            )}
          </div>
        </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-custom">
        {menuGroups.map((group, groupIndex) => (
          <div key={group.title} className="mb-6">
            {!isCollapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            {group.items.map((item, index) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                  title={isCollapsed ? item.label : ''}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-4'
                  } py-2.5 mb-1 rounded-lg text-left transition-all text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${!isCollapsed && 'mr-3'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="ml-auto w-2 h-2 bg-white rounded-full"
                        />
                      )}
                    </>
                  )}
                </motion.button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700 bg-slate-900 flex-shrink-0">
        <button 
          onClick={() => setActiveTab('settings')}
          title={isCollapsed ? 'Ayarlar' : ''}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'px-3'
          } py-2.5 rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Settings className={`w-5 h-5 ${!isCollapsed && 'mr-2'}`} />
          {!isCollapsed && <span>Ayarlar</span>}
        </button>
        <button 
          onClick={handleLogout}
          title={isCollapsed ? 'Çıkış Yap' : ''}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'px-3'
          } py-2.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-all mt-2`}
        >
          <LogOut className={`w-5 h-5 ${!isCollapsed && 'mr-2'}`} />
          {!isCollapsed && <span>Çıkış Yap</span>}
        </button>
      </div>

        <style jsx>{`
          .scrollbar-custom::-webkit-scrollbar {
            width: 6px;
          }

          .scrollbar-custom::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.3);
            border-radius: 10px;
            margin: 8px 0;
          }

          .scrollbar-custom::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            transition: all 0.3s ease;
          }

          .scrollbar-custom::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #7c8ef5 0%, #8b5bb8 100%);
            width: 8px;
          }

          .scrollbar-custom::-webkit-scrollbar-thumb:active {
            background: linear-gradient(180deg, #5568d3 0%, #6a3d8f 100%);
          }

          /* Firefox */
          .scrollbar-custom {
            scrollbar-width: thin;
            scrollbar-color: #667eea rgba(15, 23, 42, 0.3);
          }
        `}</style>
      </aside>
    </>
  )
}
