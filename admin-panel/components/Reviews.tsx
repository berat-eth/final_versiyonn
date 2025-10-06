'use client'

import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface Review {
  id: number
  product: string
  customer: string
  rating: number
  comment: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
  helpful: number
}

export default function Reviews() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [reviews, setReviews] = useState<Review[]>([])

  const approve = (id: number) => {
    setReviews(reviews.map(r => r.id === id ? { ...r, status: 'approved' } : r))
  }

  const reject = (id: number) => {
    setReviews(reviews.map(r => r.id === id ? { ...r, status: 'rejected' } : r))
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Değerlendirme & Yorum Yönetimi</h2>
        <p className="text-slate-500 mt-1">Müşteri yorumlarını yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Yorum</p>
          <p className="text-3xl font-bold text-slate-800">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Onay Bekleyen</p>
          <p className="text-3xl font-bold text-yellow-600">{reviews.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Ortalama Puan</p>
          <p className="text-3xl font-bold text-green-600">
            {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} ⭐
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Faydalı Bulunma</p>
          <p className="text-3xl font-bold text-blue-600">{reviews.reduce((sum, r) => sum + r.helpful, 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Yorumlar</h3>
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-slate-200 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {review.customer.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{review.customer}</p>
                      <p className="text-sm text-slate-500">{review.product}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-slate-500">{review.date}</span>
                  </div>
                  <p className="text-slate-700 mb-3">{review.comment}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center text-slate-500">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {review.helpful} faydalı
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      review.status === 'approved' ? 'bg-green-100 text-green-700' :
                      review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {review.status === 'approved' ? 'Onaylandı' :
                       review.status === 'pending' ? 'Beklemede' : 'Reddedildi'}
                    </span>
                  </div>
                </div>
                {review.status === 'pending' && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => approve(review.id)}
                      className="p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </button>
                    <button
                      onClick={() => reject(review.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <XCircle className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
