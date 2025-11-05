'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Bot, Send, User, Clock, CheckCheck, Phone, Video, MoreVertical, Search, Paperclip, Smile, X, Volume2, VolumeX, Users, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: number
  sender: 'customer' | 'agent'
  text: string
  time: string
  read: boolean
}

interface Conversation {
  id: number
  customer: string
  avatar: string
  lastMessage: string
  time: string
  unread: number
  status: 'online' | 'offline' | 'away'
  messages: Message[]
}

export default function Chatbot() {
  const [selectedChat, setSelectedChat] = useState<number | null>(null)
  const [messageText, setMessageText] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  
  // Backend'den konuşmaları yükle
  useEffect(() => {
    loadConversations()
  }, [])
  
  const loadConversations = async () => {
    try {
      setLoading(true)
      const { api } = await import('@/lib/api')
      const response = await api.get<any>('/admin/chatbot/conversations')
      const data = response as any
      if (data.success && Array.isArray(data.data)) {
        // Backend'den gelen verileri Conversation formatına dönüştür
        const formatted = data.data.map((msg: any, index: number) => ({
          id: msg.id || index,
          customer: msg.userName || msg.userEmail || 'Misafir',
          avatar: (msg.userName || 'M').charAt(0).toUpperCase(),
          lastMessage: msg.message || 'Mesaj yok',
          time: new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          status: 'offline' as const,
          messages: [{
            id: msg.id,
            sender: 'customer' as const,
            text: msg.message || '',
            time: new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            read: true
          }],
          productId: msg.productId,
          productName: msg.productName || msg.productFullName,
          productPrice: msg.productPrice || msg.productFullPrice,
          productImage: msg.productImage || msg.productFullImage,
          userEmail: msg.userEmail,
          userPhone: msg.userPhone
        }))
        setConversations(formatted)
      }
    } catch (error) {
      console.error('Konuşmalar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  // Yeni mesaj simülasyonu - Her 30 saniyede bir rastgele müşteriden mesaj gelir
  useEffect(() => {
    if (conversations.length === 0) return

    const interval = setInterval(() => {
      if (conversations.length === 0) return
      
      const randomConvIndex = Math.floor(Math.random() * conversations.length)
      const randomMessages = [
        'Merhaba, yardım alabilir miyim?',
        'Ürün ne zaman gelir?',
        'Fiyat bilgisi alabilir miyim?',
        'Stokta var mı?',
        'İndirim var mı?',
        'Kargo ücreti ne kadar?',
        'Taksit seçenekleri neler?',
        'Ürün garantisi var mı?',
      ]
      const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)]

      setConversations(prev => {
        if (prev.length === 0) return prev
        
        const newConvs = [...prev]
        const conv = newConvs[randomConvIndex]
        
        if (!conv || !conv.messages) return prev

        const newMessageId = conv.messages.length + 1

        conv.messages.push({
          id: newMessageId,
          sender: 'customer',
          text: randomMessage,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          read: false
        })

        conv.lastMessage = randomMessage
        conv.time = 'Şimdi'
        conv.unread += 1

        // Zil sesi çal
        if (soundEnabled) {
          playNotificationSound()
        }

        return newConvs
      })
    }, 30000) // 30 saniye

    return () => clearInterval(interval)
  }, [conversations.length, soundEnabled])

  // Bildirim sesi çalma fonksiyonu - Uzun ve melodik zil sesi
  const playNotificationSound = () => {
    const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null

    // Birinci nota (Do)
    if (!audioContext) return
    
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }

    // Melodik zil sesi - 4 nota
    const now = audioContext.currentTime
    playNote(523.25, now, 0.3)        // Do (C5)
    playNote(659.25, now + 0.15, 0.3) // Mi (E5)
    playNote(783.99, now + 0.3, 0.3)  // Sol (G5)
    playNote(1046.50, now + 0.45, 0.5) // Do (C6) - Daha uzun
  }

  // Mesaj gönderme
  const sendMessage = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!messageText.trim() || selectedChat === null) return

    const conv = conversations.find(c => c.id === selectedChat)
    if (!conv || !conv.messages) return

    const messageToSend = messageText.trim()
    setMessageText('') // Hemen input'u temizle

    const newMessage: Message = {
      id: conv.messages.length + 1,
      sender: 'agent',
      text: messageToSend,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      read: true
    }

    setConversations(prev => {
      const newConvs = [...prev]
      const convIndex = newConvs.findIndex(c => c.id === selectedChat)
      if (convIndex !== -1 && newConvs[convIndex] && newConvs[convIndex].messages) {
        newConvs[convIndex].messages.push(newMessage)
        newConvs[convIndex].lastMessage = messageToSend
        newConvs[convIndex].time = 'Şimdi'
        newConvs[convIndex].unread = 0
      }
      return newConvs
    })

    setTimeout(() => scrollToBottom(), 100)
  }

  // Enter tuşu için ayrı handler
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedChat, conversations])

  const selectedConversation = conversations.find(c => c.id === selectedChat)
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread, 0)

  const filteredConversations = conversations.filter(conv =>
    conv.customer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Canlı Destek</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Müşterilerinizle anlık iletişim</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-xl transition-colors ${soundEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          {totalUnread > 0 && (
            <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold">
              {totalUnread} Yeni Mesaj
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-xl shadow-lg p-5 text-white"
        >
          <MessageSquare className="w-6 h-6 opacity-80 mb-2" />
          <p className="text-blue-100 text-sm mb-1">Toplam Konuşma</p>
          <p className="text-3xl font-bold">{conversations.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-xl shadow-lg p-5 text-white"
        >
          <Users className="w-6 h-6 opacity-80 mb-2" />
          <p className="text-green-100 text-sm mb-1">Aktif Müşteri</p>
          <p className="text-3xl font-bold">{conversations.filter(c => c.status === 'online').length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-800 rounded-xl shadow-lg p-5 text-white"
        >
          <TrendingUp className="w-6 h-6 opacity-80 mb-2" />
          <p className="text-purple-100 text-sm mb-1">Çözüm Oranı</p>
          <p className="text-3xl font-bold">0%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-700 dark:to-orange-800 rounded-xl shadow-lg p-5 text-white"
        >
          <Clock className="w-6 h-6 opacity-80 mb-2" />
          <p className="text-orange-100 text-sm mb-1">Ort. Yanıt Süresi</p>
          <p className="text-3xl font-bold">0dk</p>
        </motion.div>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Müşteri ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
            {filteredConversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setSelectedChat(conv.id)
                  // Okundu olarak işaretle
                  setConversations(prev => {
                    const newConvs = [...prev]
                    const convIndex = newConvs.findIndex(c => c.id === conv.id)
                    if (convIndex !== -1 && newConvs[convIndex] && newConvs[convIndex].messages) {
                      newConvs[convIndex].unread = 0
                      newConvs[convIndex].messages.forEach(m => m.read = true)
                    }
                    return newConvs
                  })
                }}
                className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-colors ${selectedChat === conv.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {conv.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${conv.status === 'online' ? 'bg-green-500' :
                      conv.status === 'away' ? 'bg-yellow-500' : 'bg-slate-400'
                      }`}></div>
                  </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{conv.customer}</p>
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">{conv.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{conv.lastMessage}</p>
                    {conv.productName && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">🛍️ {conv.productName}</p>
                    )}
                  </div>
                  {conv.unread > 0 && (
                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {conv.unread}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700" style={{ height: '700px' }}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedConversation.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${selectedConversation.status === 'online' ? 'bg-green-500' :
                      selectedConversation.status === 'away' ? 'bg-yellow-500' : 'bg-slate-400'
                      }`}></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedConversation.customer}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedConversation.status === 'online' ? 'Çevrimiçi' :
                        selectedConversation.status === 'away' ? 'Uzakta' : 'Çevrimdışı'}
                    </p>
                    {selectedConversation.userEmail && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">{selectedConversation.userEmail}</p>
                    )}
                    {selectedConversation.userPhone && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">{selectedConversation.userPhone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Phone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Video className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Ürün Bilgileri */}
              {selectedConversation.productId && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center space-x-4">
                    {selectedConversation.productImage && (
                      <img 
                        src={selectedConversation.productImage} 
                        alt={selectedConversation.productName || 'Ürün'}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">İlgili Ürün</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedConversation.productName || 'Ürün bilgisi yok'}</p>
                      {selectedConversation.productPrice && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-bold mt-1">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedConversation.productPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900">
                {selectedConversation.messages && selectedConversation.messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${message.sender === 'agent' ? 'order-2' : 'order-1'}`}>
                      <div className={`rounded-2xl px-4 py-3 ${message.sender === 'agent'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}>
                        <p className="text-sm">{message.text}</p>
                      </div>
                      <div className={`flex items-center space-x-1 mt-1 text-xs text-slate-400 dark:text-slate-500 ${message.sender === 'agent' ? 'justify-end' : 'justify-start'
                        }`}>
                        <span>{message.time}</span>
                        {message.sender === 'agent' && (
                          <CheckCheck className={`w-4 h-4 ${message.read ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card">
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Smile className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!messageText.trim()}
                    className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-dark-card">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Konuşma Seçin</h3>
                <p className="text-slate-500 dark:text-slate-400">Müşterilerinizle sohbet etmek için bir konuşma seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
