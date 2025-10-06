'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ShoppingBag, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const ForestBackground = dynamic(() => import('@/components/ForestBackground'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-green-900 to-slate-900" />
})

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simüle edilmiş login işlemi
    setTimeout(() => {
      setIsLoading(false)
      router.push('/dashboard')
    }, 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-green-900 to-slate-900" />}>
        <ForestBackground />
      </Suspense>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/30 relative z-10">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Hoş Geldiniz</h2>
            <p className="text-slate-500">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-600">Beni Hatırla</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Şifremi Unuttum?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-green-900/40 backdrop-blur-lg border border-green-500/30 rounded-2xl p-4 relative z-10"
        >
          <p className="text-sm text-white font-semibold mb-2">🎯 Demo Hesap Bilgileri:</p>
          <div className="space-y-1 text-sm text-green-100">
            <p>📧 Email: admin@example.com</p>
            <p>🔑 Şifre: demo123</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
