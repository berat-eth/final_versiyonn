'use client'

import { useEffect, useState } from 'react'
import { Gift, Search, Filter, Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { giftCardService } from '@/lib/services/giftCardService'

export default function GiftCards() {
    const [giftCards, setGiftCards] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchGiftCards = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await giftCardService.list()
            if (res.success && res.data) setGiftCards(res.data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Hediye kartları yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchGiftCards() }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700'
            case 'used': return 'bg-blue-100 text-blue-700'
            case 'expired': return 'bg-red-100 text-red-700'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Hediye Kartları</h2>
                    <p className="text-slate-500 mt-1">Hediye kartlarını yönetin</p>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Yeni Hediye Kartı</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Hediye kartı ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center space-x-2">
                        <Filter className="w-4 h-4" />
                        <span>Filtrele</span>
                    </button>
                </div>

                {loading ? (
                    <p className="text-slate-500">Yükleniyor...</p>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {giftCards
                      .filter(c => (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((card, index) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <Gift className="w-8 h-8" />
                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(card.status)}`}>
                                    {card.status}
                                </span>
                            </div>
                            <p className="text-2xl font-bold mb-2">{card.code}</p>
                            <p className="text-purple-100 text-sm mb-4">₺{Number(card.amount || 0).toFixed(2)}</p>
                            <div className="border-t border-purple-400 pt-4">
                                {card.fromUser && (<p className="text-sm text-purple-100">Gönderen: {card.fromUser}</p>)}
                                {card.recipient && (<p className="text-sm text-purple-100">Alıcı: {card.recipient}</p>)}
                                <p className="text-xs text-purple-200 mt-2">Son kullanma: {card.expiresAt}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
                )}
            </div>
        </div>
    )
}
