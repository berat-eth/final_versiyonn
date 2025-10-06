'use client'

import { useEffect, useState } from 'react'
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
import CRMLeads from '@/components/CRMLeads'
import CRMContacts from '@/components/CRMContacts'
import CRMOpportunities from '@/components/CRMOpportunities'
import CRMActivities from '@/components/CRMActivities'
import CRMPipeline from '@/components/CRMPipeline'
import CRMDeals from '@/components/CRMDeals'
import CRMTasks from '@/components/CRMTasks'
import ProductionPlanning from '@/components/ProductionPlanning'
import ProductionOrders from '@/components/ProductionOrders'
import ProductionTracking from '@/components/ProductionTracking'
import WarehouseManagement from '@/components/WarehouseManagement'
import Categories from '@/components/Categories'
import PaymentTransactions from '@/components/PaymentTransactions'
import ReturnRequests from '@/components/ReturnRequests'
import UserAddresses from '@/components/UserAddresses'
import UserWallets from '@/components/UserWallets'
import WalletTransactions from '@/components/WalletTransactions'
import WalletRechargeRequests from '@/components/WalletRechargeRequests'
import ReferralEarnings from '@/components/ReferralEarnings'
import UserDiscountCodes from '@/components/UserDiscountCodes'
import DiscountWheelSpins from '@/components/DiscountWheelSpins'
import GiftCards from '@/components/GiftCards'
import CustomerAnalytics from '@/components/CustomerAnalytics'
import UserEvents from '@/components/UserEvents'
import UserProfiles from '@/components/UserProfiles'
import Recommendations from '@/components/Recommendations'
// CustomProductionMessages merged into BulkCustomProduction


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Hızlı eylemler ve bileşenler arası basit gezinme için custom event dinleyicisi
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { tab?: string }
      if (detail?.tab) setActiveTab(String(detail.tab))
    }
    window.addEventListener('goto-tab', handler as EventListener)
    return () => window.removeEventListener('goto-tab', handler as EventListener)
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
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
          {activeTab === 'crm-leads' && <CRMLeads />}
          {activeTab === 'crm-contacts' && <CRMContacts />}
          {activeTab === 'crm-opportunities' && <CRMOpportunities />}
          {activeTab === 'crm-activities' && <CRMActivities />}
          {activeTab === 'crm-pipeline' && <CRMPipeline />}
          {activeTab === 'crm-deals' && <CRMDeals />}
          {activeTab === 'crm-tasks' && <CRMTasks />}
          {activeTab === 'production-planning' && <ProductionPlanning />}
          {activeTab === 'production-orders' && <ProductionOrders />}
          {activeTab === 'production-tracking' && <ProductionTracking />}
          {activeTab === 'warehouse-management' && <WarehouseManagement />}
          {activeTab === 'categories' && <Categories />}
          {activeTab === 'payment-transactions' && <PaymentTransactions />}
          {activeTab === 'return-requests' && <ReturnRequests />}
          {activeTab === 'user-addresses' && <UserAddresses />}
          {activeTab === 'user-wallets' && <UserWallets />}
          {activeTab === 'wallet-transactions' && <WalletTransactions />}
          {activeTab === 'wallet-recharge-requests' && <WalletRechargeRequests />}
          {activeTab === 'referral-earnings' && <ReferralEarnings />}
          {activeTab === 'user-discount-codes' && <UserDiscountCodes />}
          {activeTab === 'discount-wheel-spins' && <DiscountWheelSpins />}
          {activeTab === 'gift-cards' && <GiftCards />}
          {activeTab === 'customer-analytics' && <CustomerAnalytics />}
          {activeTab === 'user-events' && <UserEvents />}
          {activeTab === 'user-profiles' && <UserProfiles />}
          {activeTab === 'recommendations' && <Recommendations />}
          {/* removed: custom-production-messages */}
        </main>
      </div>
    </div>
  )
}
