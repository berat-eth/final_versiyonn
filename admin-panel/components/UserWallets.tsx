'use client'

import { useEffect, useState } from 'react'
import { Wallet, Search, Filter, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { walletService } from '@/lib/services'

export default function UserWallets() {
  const [wallets, setWallets] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ totalBalance: number; totalCredit: number; totalDebit: number } | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [showTxModal, setShowTxModal] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [adjustError, setAdjustError] = useState<string | null>(null)
  const [adjustNote, setAdjustNote] = useState<string>('')

  const fetchWallets = async () => {
    try {
      setLoading(true)
      setError(null)
      const [listRes, sumRes] = await Promise.all([
        api.get<any>('/admin/wallets'),
        api.get<any>('/admin/wallets/summary')
      ])
      if ((listRes as any)?.success && (listRes as any).data) setWallets((listRes as any).data)
      if ((sumRes as any)?.success && (sumRes as any).data) setSummary((sumRes as any).data)
      else setWallets([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cüzdanlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWallets() }, [])

  const openTransactions = async (wallet: any) => {
    try {
      setSelectedWallet(wallet)
      setShowTxModal(true)
      setTxLoading(true)
      const res = await walletService.getTransactions(wallet.userId, 1, 100)
      if (res.success && (res as any).data?.transactions) setTransactions((res as any).data.transactions)
      else setTransactions([])
    } catch (e) {
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }

  const submitAdjust = async (sign: 1 | -1) => {
    if (!selectedWallet) return
    const amt = parseFloat(adjustAmount)
    if (isNaN(amt) || amt <= 0) {
      setAdjustError('Geçerli bir tutar girin')
      return
    }
    try {
      setAdjustLoading(true)
      setAdjustError(null)
      await api.post('/admin/wallets/adjust', {
        userId: selectedWallet.userId,
        amount: sign * amt,
        reason: adjustNote || (sign > 0 ? 'Admin balance increase' : 'Admin balance decrease')
      })
      await fetchWallets()
      await openTransactions(selectedWallet)
      setAdjustAmount('')
      setAdjustNote('')
    } catch (e: any) {
      setAdjustError(e?.message || 'İşlem başarısız')
    } finally {
      setAdjustLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kullanıcı Cüzdanları</h2>
          <p className="text-slate-500 mt-1">Müşteri bakiyelerini görüntüleyin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <Wallet className="w-8 h-8 mb-3" />
          <p className="text-blue-100 text-sm">Toplam Bakiye</p>
          <p className="text-3xl font-bold">₺{Number(summary?.totalBalance||0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-3" />
          <p className="text-green-100 text-sm">Toplam Yükleme</p>
          <p className="text-3xl font-bold">₺{Number(summary?.totalCredit||0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <TrendingDown className="w-8 h-8 mb-3" />
          <p className="text-orange-100 text-sm">Toplam Harcama</p>
          <p className="text-3xl font-bold">₺{Number(summary?.totalDebit||0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cüzdan ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Yükleniyor...</p>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
        ) : (
        <div className="space-y-3">
          {wallets
            .filter(w => `${w.userName||''} ${w.email||''}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((wallet, index) => (
            <motion.div
              key={wallet.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{wallet.userName}</h3>
                    <p className="text-sm text-slate-500">{wallet.userEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">₺{Number(wallet.balance||0).toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{wallet.currency || 'TRY'}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => openTransactions(wallet)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  İşlemleri Gör
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>

      {/* Transactions Modal */}
      {showTxModal && selectedWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTxModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Cüzdan İşlemleri</h3>
                <p className="text-slate-500 text-sm">{selectedWallet.userName} • Bakiye: ₺{Number(selectedWallet.balance||0).toFixed(2)}</p>
              </div>
              <button onClick={() => setShowTxModal(false)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100">Kapat</button>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center space-x-2">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Tutar"
                  className="px-3 py-2 border border-slate-300 rounded-lg w-40"
                />
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Açıklama (opsiyonel)"
                  className="px-3 py-2 border border-slate-300 rounded-lg flex-1"
                />
                <button
                  disabled={adjustLoading}
                  onClick={() => submitAdjust(1)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Bakiye Ekle
                </button>
                <button
                  disabled={adjustLoading}
                  onClick={() => submitAdjust(-1)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Bakiye Düş
                </button>
                {adjustError && <span className="text-sm text-red-600 ml-2">{adjustError}</span>}
              </div>
              {txLoading ? (
                <p className="text-slate-500">Yükleniyor...</p>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tür</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tutar</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Açıklama</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{tx.createdAt || tx.date}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 capitalize">{tx.type}</td>
                        <td className="px-4 py-3 text-sm font-semibold {tx.type==='credit' ? 'text-green-600' : 'text-red-600'}">₺{Number(tx.amount||0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{tx.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{tx.status || '-'}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">İşlem bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
