'use client'

import { useState } from 'react'
import { MessageSquare, Search, Filter, Send } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CustomProductionMessages() {
  const [messages, setMessages] = useState([
    { id: 1, requestId: 1, requestNumber: 'CPR-001', userName: 'Ahmet Yılmaz', sender: 'user', message: 'Ürünün rengini değiştirebilir miyiz?', createdAt: '2024-01-15 14:30' },
    { id: 2, requestId: 1, requestNumber: 'CPR-001', userName: 'Admin', sender: 'admin', message: 'Evet, renk seçeneklerini size göndereceğiz.', createdAt: '2024-01-15 14:35' },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Özel Üretim Mesajları</h2>
          <p className="text-slate-500 mt-1">Müşterilerle özel üretim talepleriniz hakkında iletişim kurun</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Mesaj ara..."
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

        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: message.sender === 'user' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-md p-4 rounded-xl ${
                message.sender === 'admin' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-semibold text-sm">{message.userName}</span>
                </div>
                <p className="text-sm mb-1">{message.message}</p>
                <p className={`text-xs ${message.sender === 'admin' ? 'text-blue-100' : 'text-slate-500'}`}>
                  {message.createdAt}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
          <input
            type="text"
            placeholder="Mesajınızı yazın..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2">
            <Send className="w-4 h-4" />
            <span>Gönder</span>
          </button>
        </div>
      </div>
    </div>
  )
}
