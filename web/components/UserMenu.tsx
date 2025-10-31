'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    router.push('/')
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/giris"
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20`}
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">login</span>
          Giriş Yap
        </span>
      </Link>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
          isOpen
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
        }`}
      >
        <span className="material-symbols-outlined text-lg">account_circle</span>
        <span className="hidden md:inline max-w-[120px] truncate">{user?.name || user?.email}</span>
        <span className="material-symbols-outlined text-sm">{isOpen ? 'expand_less' : 'expand_more'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {user?.name || 'Kullanıcı'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              {user?.email}
            </p>
          </div>

          <div className="py-2">
            <Link
              href="/panel"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Dashboard
            </Link>
            <Link
              href="/panel/profil"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">person</span>
              Profil
            </Link>
            <Link
              href="/panel/siparisler"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">shopping_bag</span>
              Siparişlerim
            </Link>
            <Link
              href="/panel/sepet"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">shopping_cart</span>
              Sepetim
            </Link>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

