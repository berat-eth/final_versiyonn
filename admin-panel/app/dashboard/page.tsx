'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ShieldCheck, AlertTriangle, X } from 'lucide-react'
import Dashboard from '@/components/Dashboard'
import Sidebar from '@/components/Sidebar'
import Products from '@/components/Products'
import Orders from '@/components/Orders'
import Customers from '@/components/Customers'
import Analytics from '@/components/Analytics'
import Header from '@/components/Header'
import Cart from '@/components/Cart'
import Campaigns from '@/components/Campaigns'
import Stories from '@/components/Stories'
import Applications from '@/components/Applications'
import CustomerCare from '@/components/CustomerCare'
import Segments from '@/components/Segments'

import LiveData from '@/components/LiveData'

import Chatbot from '@/components/Chatbot'
import Security from '@/components/Security'
import BulkCustomProduction from '@/components/BulkCustomProduction'
import Backup from '@/components/Backup'
import ServerStats from '@/components/ServerStats'
import PushNotifications from '@/components/PushNotifications'
import Banners from '@/components/Banners'
import Coupons from '@/components/Coupons'
import Reviews from '@/components/Reviews'
import FileManager from '@/components/FileManager'
import SnortLogs from '@/components/SnortLogs'
import UserDatabase from '@/components/UserDatabase'
import Settings from '@/components/Settings'
import SQLQuery from '@/components/SQLQuery'
import ProjectAjax from '@/components/ProjectAjax'
import Email from '@/components/Email'
import SMS from '@/components/SMS'
import ProductionPlanning from '@/components/ProductionPlanning'
import ProductionOrders from '@/components/ProductionOrders'
import ProductionTracking from '@/components/ProductionTracking'
import WarehouseManagement from '@/components/WarehouseManagement'
import Categories from '@/components/Categories'
import PaymentTransactions from '@/components/PaymentTransactions'
import ReturnRequests from '@/components/ReturnRequests'
import UserWallets from '@/components/UserWallets'
import WalletTransactions from '@/components/WalletTransactions'
import WalletRechargeRequests from '@/components/WalletRechargeRequests'
import WalletWithdrawRequests from '@/components/WalletWithdrawRequests'
import ReferralEarnings from '@/components/ReferralEarnings'
import UserDiscountCodes from '@/components/UserDiscountCodes'
import DiscountWheelSpins from '@/components/DiscountWheelSpins'
import GiftCards from '@/components/GiftCards'
import Recommendations from '@/components/Recommendations'
// CustomProductionMessages merged into BulkCustomProduction
import Hepsiburada from '@/components/Hepsiburada'
import Trendyol from '@/components/Trendyol'
import GoogleMapsScraper from '@/components/GoogleMapsScraper'
import IntegrationMonitor from '@/components/IntegrationMonitor'


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [health, setHealth] = useState<any | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  // Hızlı eylemler ve bileşenler arası basit gezinme için custom event dinleyicisi
  useEffect(() => {
    // SSR kontrolü
    if (typeof window === 'undefined') return
    // Basit oturum koruması: giriş yapılmamışsa login'e yönlendir
    try {
      const logged = sessionStorage.getItem('adminLoggedIn') === '1'
      const token = sessionStorage.getItem('authToken')
      const ok = logged && !!token
      if (!ok) {
        // login sayfasına dön
        window.location.href = '/login'
        return
      }
    } catch {}
    
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { tab?: string }
      if (detail?.tab) setActiveTab(String(detail.tab))
    }
    window.addEventListener('goto-tab', handler as EventListener)
    // Header'dan modal açma eventi
    const openHealth = () => setShowHealthModal(true)
    window.addEventListener('open-health-modal', openHealth)
    return () => {
      window.removeEventListener('goto-tab', handler as EventListener)
      window.removeEventListener('open-health-modal', openHealth)
    }
  }, [])

  // Açılışta sağlık kontrolü
  useEffect(() => {
    // SSR kontrolü
    if (typeof window === 'undefined') return
    
    try {
      const already = sessionStorage.getItem('healthChecked')
      if (already) return
    } catch {}
    setShowHealthModal(true)
    setHealthLoading(true)
    setHealthError(null)
    api.get<any>('/health')
      .then((res) => {
        setHealth(res)
      })
      .catch((err) => {
        setHealthError(err?.message || 'Sağlık kontrolü başarısız')
      })
      .finally(() => {
        setHealthLoading(false)
        try { sessionStorage.setItem('healthChecked', '1') } catch {}
      })
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence>
            {showHealthModal && (
              <div className="fixed inset-0 z-[9999]">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowHealthModal(false)}></div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute left-1/2 top-10 -translate-x-1/2 w-[90%] max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      {healthLoading ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : healthError || health?.success === false ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      )}
                      <h3 className="text-slate-800 font-semibold">Sistem Sağlık Kontrolü</h3>
                    </div>
                    <button onClick={() => setShowHealthModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {healthLoading && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Kontrol ediliyor...
                      </div>
                    )}
                    {!healthLoading && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="p-3 rounded-lg bg-slate-50">
                            <div className="text-slate-500">Sunucu</div>
                            <div className="font-medium text-slate-800">{healthError ? 'HATA' : 'OK'}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50">
                            <div className="text-slate-500">Veritabanı</div>
                            <div className="font-medium text-slate-800">{health?.database || (healthError ? 'bilinmiyor' : 'ok')}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50">
                            <div className="text-slate-500">Uptime</div>
                            <div className="font-mono text-slate-800 text-xs">{typeof health?.uptime !== 'undefined' ? `${Math.round(health.uptime)} sn` : '-'}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50">
                            <div className="text-slate-500">Saat</div>
                            <div className="font-mono text-slate-800 text-xs">{health?.timestamp || new Date().toISOString()}</div>
                          </div>
                        </div>
                        {healthError && (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                            {healthError}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-4 border-t bg-slate-50 flex items-center justify-end">
                    <button onClick={() => setShowHealthModal(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900">Tamam</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'cart' && <Cart />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'campaigns' && <Campaigns />}
          {activeTab === 'coupons' && <Coupons />}
          {activeTab === 'stories' && <Stories />}
          {activeTab === 'banners' && <Banners />}
          {activeTab === 'push-notifications' && <PushNotifications />}
          {activeTab === 'reviews' && <Reviews />}
          {activeTab === 'applications' && <Applications />}
          {activeTab === 'customer-care' && <CustomerCare />}
          {activeTab === 'segments' && <Segments />}

          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'live-data' && <LiveData />}
          {activeTab === 'server-stats' && <ServerStats />}
          {activeTab === 'backup' && <Backup />}
          {activeTab === 'file-manager' && <FileManager />}

          {activeTab === 'chatbot' && <Chatbot />}
          {activeTab === 'security' && <Security />}
          {activeTab === 'snort-logs' && <SnortLogs />}
          {activeTab === 'sql-query' && <SQLQuery />}
          {activeTab === 'user-database' && <UserDatabase />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'bulk-custom-production' && <BulkCustomProduction />}
          {activeTab === 'project-ajax' && <ProjectAjax />}
          {activeTab === 'email' && <Email />}
          {activeTab === 'sms' && <SMS />}
          {activeTab === 'production-planning' && <ProductionPlanning />}
          {activeTab === 'production-orders' && <ProductionOrders />}
          {activeTab === 'production-tracking' && <ProductionTracking />}
          {activeTab === 'warehouse-management' && <WarehouseManagement />}
          {activeTab === 'categories' && <Categories />}
          {activeTab === 'payment-transactions' && <PaymentTransactions />}
          {activeTab === 'return-requests' && <ReturnRequests />}
          {activeTab === 'user-wallets' && <UserWallets />}
          {activeTab === 'wallet-transactions' && <WalletTransactions />}
          {activeTab === 'wallet-recharge-requests' && <WalletRechargeRequests />}
          {activeTab === 'wallet-withdraw-requests' && <WalletWithdrawRequests />}
          {activeTab === 'referral-earnings' && <ReferralEarnings />}
          {activeTab === 'user-discount-codes' && <UserDiscountCodes />}
          {activeTab === 'discount-wheel-spins' && <DiscountWheelSpins />}
          {activeTab === 'gift-cards' && <GiftCards />}
          {activeTab === 'recommendations' && <Recommendations />}
          {activeTab === 'integration-monitor' && <IntegrationMonitor />}
          {activeTab === 'hepsiburada' && <Hepsiburada />}
          {activeTab === 'trendyol' && <Trendyol />}
          {activeTab === 'google-maps-scraper' && <GoogleMapsScraper />}
        </main>
      </div>
    </div>
  )
}
