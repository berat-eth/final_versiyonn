'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, loading, user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/giris')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const menuItems = [
    { href: '/panel', label: 'Dashboard', icon: 'dashboard' },
    { href: '/panel/urunler', label: 'Ürünler', icon: 'shopping_bag' },
    { href: '/panel/profil', label: 'Profil', icon: 'person' },
    { href: '/panel/siparisler', label: 'Siparişlerim', icon: 'receipt_long' },
    { href: '/panel/adresler', label: 'Adreslerim', icon: 'location_on' },
    { href: '/panel/teklifler', label: 'Tekliflerim', icon: 'description' },
    { href: '/panel/destek', label: 'Destek', icon: 'support_agent' },
    { href: '/panel/odeme-gecmisi', label: 'Ödeme Geçmişi', icon: 'credit_card' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Menü"
              >
                <span className="material-symbols-outlined text-2xl">
                  {mobileMenuOpen ? 'close' : 'menu'}
                </span>
              </button>
              
              <Link href="/" className="text-sm md:text-lg font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <span className="hidden sm:inline">←</span>
                <span className="text-xs sm:text-base">Ana Sayfa</span>
              </Link>
              
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Kullanıcı Paneli</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden lg:inline truncate max-w-[150px]">
                {user?.name || user?.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-lg md:text-xl">logout</span>
                <span className="hidden md:inline">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex relative">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Desktop & Mobile */}
        <aside
          className={`fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="p-4 space-y-1 overflow-y-auto h-full">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/panel' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full min-w-0 p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

