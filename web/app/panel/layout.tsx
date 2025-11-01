'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, loading, user, logout } = useAuth()

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
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-lg font-bold text-blue-600 dark:text-blue-400 hover:underline">
                ← Ana Sayfa
              </Link>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Kullanıcı Paneli</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:inline">
                {user?.name || user?.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span className="hidden md:inline">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/panel' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <details className="relative">
            <summary className="bg-blue-600 text-white p-4 rounded-full shadow-lg cursor-pointer list-none">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </summary>
            <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[200px]">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/panel' && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </details>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

