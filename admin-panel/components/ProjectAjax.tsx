'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Mic, Image as ImageIcon, Paperclip, RotateCcw, Copy, ThumbsUp, ThumbsDown, Download, Settings, Zap, Brain, MessageSquare, User, Bot, Loader2, ChevronDown, Code, FileText, Lightbulb, TrendingUp, Server, Wifi, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OllamaService, OllamaConfig, OllamaMessage } from '@/lib/services/ollama-service'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    isTyping?: boolean
}

interface Suggestion {
    icon: any
    text: string
    category: string
}

export default function ProjectAjax() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Merhaba! Ben Project Ajax, yapay zeka destekli iş asistanınızım. Size nasıl yardımcı olabilirim?',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [selectedModel, setSelectedModel] = useState('ollama-gemma2:1b')
    const [temperature, setTemperature] = useState(0.7)
    const [maxTokens, setMaxTokens] = useState(2000)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

    // API Keys
    const [openaiKey, setOpenaiKey] = useState('')
    const [anthropicKey, setAnthropicKey] = useState('')
    const [googleKey, setGoogleKey] = useState('')
    const [anythingllmUrl, setAnythingllmUrl] = useState('')

    // Ollama Config
    const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
        enabled: false,
        apiUrl: 'http://localhost:11434',
        model: 'gemma2:1b',
        temperature: 0.7,
        maxTokens: 2000
    })
    const [ollamaStatus, setOllamaStatus] = useState<'online' | 'offline' | 'checking'>('checking')
    const [availableModels, setAvailableModels] = useState<string[]>([])

    // System Prompt
    const [systemPrompt, setSystemPrompt] = useState('Sen yardımcı bir iş asistanısın. Kullanıcılara e-ticaret, satış analizi, müşteri yönetimi ve iş stratejileri konularında yardımcı oluyorsun.')

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const suggestions: Suggestion[] = [
        { icon: TrendingUp, text: 'Bu ayki satış trendlerini analiz et', category: 'Analiz' },
        { icon: Lightbulb, text: 'Müşteri segmentasyonu için öneriler sun', category: 'Strateji' },
        { icon: FileText, text: 'Ürün performans raporu oluştur', category: 'Rapor' },
        { icon: Code, text: 'SQL sorgusu yaz: En çok satan 10 ürün', category: 'Kod' },
    ]

    const models = [
        { id: 'ollama-gemma2:1b', name: 'Gemma2:1b (Ollama)', description: 'Google - Hızlı ve verimli', icon: Server, provider: 'Ollama' },
        { id: 'ollama-gemma2:2b', name: 'Gemma2:2b (Ollama)', description: 'Google - Daha güçlü', icon: Server, provider: 'Ollama' },
        { id: 'ollama-llama3.2:1b', name: 'Llama3.2:1b (Ollama)', description: 'Meta - Kompakt', icon: Server, provider: 'Ollama' },
        { id: 'ollama-llama3.2:3b', name: 'Llama3.2:3b (Ollama)', description: 'Meta - Dengeli', icon: Server, provider: 'Ollama' },
        { id: 'gpt-4', name: 'ChatGPT-4 Turbo', description: 'OpenAI - En güçlü', icon: Brain, provider: 'OpenAI' },
        { id: 'gpt-3.5', name: 'ChatGPT-3.5', description: 'OpenAI - Hızlı', icon: Zap, provider: 'OpenAI' },
        { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Anthropic - Güçlü', icon: MessageSquare, provider: 'Anthropic' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Anthropic - Dengeli', icon: MessageSquare, provider: 'Anthropic' },
        { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google - Çok modlu', icon: Sparkles, provider: 'Google' },
        { id: 'gemini-ultra', name: 'Gemini Ultra', description: 'Google - Ultra', icon: Sparkles, provider: 'Google' },
        { id: 'anythingllm', name: 'AnythingLLM', description: 'Custom - Yerel', icon: Brain, provider: 'Custom' },
    ]

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Ollama konfigürasyonunu yükle
    useEffect(() => {
        loadOllamaConfig()
        checkOllamaStatus()
    }, [])

    const loadOllamaConfig = async () => {
        try {
            const config = await OllamaService.getConfig()
            setOllamaConfig(config)
        } catch (error) {
            console.error('❌ Ollama config yüklenemedi:', error)
        }
    }

    const checkOllamaStatus = async () => {
        setOllamaStatus('checking')
        try {
            const health = await OllamaService.checkHealth()
            setOllamaStatus(health.status)
            setAvailableModels(health.models || [])
        } catch (error) {
            console.error('❌ Ollama status kontrol edilemedi:', error)
            setOllamaStatus('offline')
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        const currentInput = input
        setInput('')
        setIsTyping(true)

        try {
            // Ollama modeli seçilmişse Ollama'ya gönder
            if (selectedModel.startsWith('ollama-')) {
                const modelName = selectedModel.replace('ollama-', '')
                await sendToOllama(currentInput, modelName)
            } else {
                // Diğer modeller için simüle edilmiş yanıt
                setTimeout(() => {
                    const aiMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: generateAIResponse(currentInput),
                        timestamp: new Date()
                    }
                    setMessages(prev => [...prev, aiMessage])
                    setIsTyping(false)
                }, 1500)
            }
        } catch (error) {
            console.error('❌ Mesaj gönderilemedi:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            setIsTyping(false)
        }
    }

    const sendToOllama = async (userInput: string, modelName: string) => {
        try {
            // Mesaj geçmişini hazırla
            const ollamaMessages: OllamaMessage[] = [
                { role: 'system', content: systemPrompt },
                ...messages.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                })),
                { role: 'user', content: userInput }
            ]

            // Ollama'ya gönder
            const response = await OllamaService.sendMessage(ollamaMessages, {
                model: modelName,
                temperature,
                maxTokens
            })

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.message.content,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMessage])
            setIsTyping(false)
        } catch (error) {
            console.error('❌ Ollama yanıtı alınamadı:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Ollama Hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            setIsTyping(false)
        }
    }

    const generateAIResponse = (userInput: string): string => {
        const lowerInput = userInput.toLowerCase()

        if (lowerInput.includes('satış') || lowerInput.includes('trend')) {
            return `📊 **Satış Trend Analizi**\n\nSon 30 günlük verilerinizi analiz ettim:\n\n• Toplam Satış: ₺328,450 (+12.5%)\n• En Çok Satan Kategori: Elektronik (%45)\n• Büyüme Trendi: Pozitif yönde\n• Öneriler:\n  - iPhone 15 Pro stoklarını artırın\n  - Hafta sonu kampanyaları etkili\n  - Mobil satışlar artış gösteriyor\n\nDetaylı rapor için "rapor oluştur" yazabilirsiniz.`
        }

        if (lowerInput.includes('müşteri') || lowerInput.includes('segment')) {
            return `👥 **Müşteri Segmentasyonu**\n\nMüşterilerinizi 4 ana segmente ayırdım:\n\n1. **Premium Segment** (%23)\n   - Ortalama sepet: ₺5,200\n   - Sadakat: Yüksek\n\n2. **Düzenli Alıcılar** (%45)\n   - Ortalama sepet: ₺2,100\n   - Aylık alışveriş: 2-3 kez\n\n3. **Fırsat Avcıları** (%22)\n   - Kampanyalara duyarlı\n   - İndirim dönemlerinde aktif\n\n4. **Yeni Müşteriler** (%10)\n   - İlk alışveriş deneyimi\n   - Potansiyel yüksek\n\nHer segment için özel stratejiler önerebilirim.`
        }

        if (lowerInput.includes('rapor')) {
            return `📄 **Rapor Oluşturma**\n\nHangi türde rapor istersiniz?\n\n• Satış Performans Raporu\n• Müşteri Analiz Raporu\n• Ürün Performans Raporu\n• Finansal Özet Raporu\n• Stok Durum Raporu\n\nRapor türünü belirtin, sizin için detaylı bir analiz hazırlayayım.`
        }

        if (lowerInput.includes('sql') || lowerInput.includes('sorgu')) {
            return `💻 **SQL Sorgusu**\n\n\`\`\`sql\nSELECT \n  p.product_name,\n  COUNT(o.order_id) as total_orders,\n  SUM(o.quantity) as total_quantity,\n  SUM(o.total_amount) as revenue\nFROM products p\nJOIN orders o ON p.product_id = o.product_id\nWHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)\nGROUP BY p.product_id, p.product_name\nORDER BY revenue DESC\nLIMIT 10;\n\`\`\`\n\nBu sorgu son 30 günün en çok satan 10 ürününü getirir. Çalıştırmak ister misiniz?`
        }

        return `Anladım! "${userInput}" hakkında size yardımcı olabilirim. \n\nŞu konularda uzmanım:\n• Satış ve trend analizi\n• Müşteri segmentasyonu\n• Rapor oluşturma\n• SQL sorguları\n• İş stratejileri\n• Veri görselleştirme\n\nDaha spesifik bir soru sorabilir veya yukarıdaki konulardan birini seçebilirsiniz.`
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleSuggestionClick = (suggestion: Suggestion) => {
        setInput(suggestion.text)
        inputRef.current?.focus()
    }

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content)
        alert('📋 Mesaj kopyalandı!')
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-t-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-white rounded-xl blur-md opacity-50 animate-pulse"></div>
                            <div className="relative w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                                <Sparkles className="w-7 h-7" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Project Ajax</h2>
                            <p className="text-sm text-white/80">Yapay Zeka İş Asistanı</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                        >
                            {models.map(model => (
                                <option key={model.id} value={model.id} className="text-slate-800">
                                    {model.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={checkOllamaStatus}
                            className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg border border-white/30 transition-colors"
                            title="Ollama Durumunu Kontrol Et"
                        >
                            {ollamaStatus === 'checking' ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : ollamaStatus === 'online' ? (
                                <Wifi className="w-5 h-5 text-green-400" />
                            ) : (
                                <WifiOff className="w-5 h-5 text-red-400" />
                            )}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg border border-white/30 transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 bg-white overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex items-start space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                {/* Avatar */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${message.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-500 to-cyan-600'
                                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                                    }`}>
                                    {message.role === 'user' ? (
                                        <User className="w-5 h-5 text-white" />
                                    ) : (
                                        <Bot className="w-5 h-5 text-white" />
                                    )}
                                </div>

                                {/* Message Content */}
                                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                                    <div className={`inline-block p-4 rounded-2xl ${message.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white'
                                        : 'bg-slate-100 text-slate-800'
                                        }`}>
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                            {message.content}
                                        </div>
                                    </div>

                                    {/* Message Actions */}
                                    {message.role === 'assistant' && (
                                        <div className="flex items-center space-x-2 mt-2">
                                            <button
                                                onClick={() => copyMessage(message.content)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Kopyala"
                                            >
                                                <Copy className="w-4 h-4 text-slate-400" />
                                            </button>
                                            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Beğen">
                                                <ThumbsUp className="w-4 h-4 text-slate-400" />
                                            </button>
                                            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Beğenme">
                                                <ThumbsDown className="w-4 h-4 text-slate-400" />
                                            </button>
                                            <span className="text-xs text-slate-400 ml-2">
                                                {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start space-x-3"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-slate-100 p-4 rounded-2xl">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
                <div className="bg-slate-50 p-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-3 font-medium">💡 Önerilen Sorular:</p>
                    <div className="grid grid-cols-2 gap-3">
                        {suggestions.map((suggestion, index) => {
                            const Icon = suggestion.icon
                            return (
                                <motion.button
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="flex items-center space-x-3 p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-left group"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500 mb-0.5">{suggestion.category}</p>
                                        <p className="text-sm font-medium text-slate-800 truncate">{suggestion.text}</p>
                                    </div>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Enhanced LLM Input Area */}
            <div className="bg-white border-t border-slate-200 rounded-b-2xl">
                {/* Advanced Settings */}
                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-b border-slate-200 overflow-hidden"
                        >
                            <div className="p-4 bg-slate-50">
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Model Selection */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-2">
                                            🤖 Model
                                        </label>
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {models.map(model => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Temperature */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-2">
                                            🌡️ Temperature: {temperature}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={temperature}
                                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>Kesin</span>
                                            <span>Yaratıcı</span>
                                        </div>
                                    </div>

                                    {/* Max Tokens */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-2">
                                            📝 Max Tokens: {maxTokens}
                                        </label>
                                        <input
                                            type="range"
                                            min="100"
                                            max="4000"
                                            step="100"
                                            value={maxTokens}
                                            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>Kısa</span>
                                            <span>Uzun</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Model Info */}
                                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                                        <Brain className="w-4 h-4 text-purple-600" />
                                        <span className="font-medium">
                                            {models.find(m => m.id === selectedModel)?.name}:
                                        </span>
                                        <span>{models.find(m => m.id === selectedModel)?.description}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Input Area */}
                <div className="p-4">
                    {/* Input Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-slate-700">LLM Input</span>
                            <span className="text-xs text-slate-500">
                                ({input.length} karakter)
                            </span>
                        </div>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{showAdvanced ? 'Basit Mod' : 'Gelişmiş Ayarlar'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Compact Input */}
                    <div className="flex items-end space-x-3">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Mesajınızı yazın... (Enter ile gönder)"
                                rows={1}
                                className="w-full px-4 py-3 pr-24 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all resize-none"
                                style={{ minHeight: '48px', maxHeight: '120px' }}
                            />

                            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                                <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Dosya Ekle">
                                    <Paperclip className="w-4 h-4 text-slate-400" />
                                </button>
                                <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Görsel Ekle">
                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                </button>
                                <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Sesli Mesaj">
                                    <Mic className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isTyping ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            <span className="font-medium">Gönder</span>
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                        {models.find(m => m.id === selectedModel)?.provider} API • {models.find(m => m.id === selectedModel)?.name}
                    </p>
                </div>
            </div>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                        <Settings className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800">LLM Ayarları</h3>
                                        <p className="text-sm text-slate-500">API anahtarları ve sistem ayarları</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <RotateCcw className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* System Prompt */}
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <Brain className="w-5 h-5 text-purple-600" />
                                        <h4 className="font-bold text-slate-800">Sistem Promptu</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">
                                        AI'nın davranışını ve yanıt tarzını belirleyin
                                    </p>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        placeholder="Sistem promptunu girin..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                                    />
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">{systemPrompt.length} karakter</span>
                                        <button
                                            onClick={() => setSystemPrompt('Sen yardımcı bir iş asistanısın. Kullanıcılara e-ticaret, satış analizi, müşteri yönetimi ve iş stratejileri konularında yardımcı oluyorsun.')}
                                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                        >
                                            Varsayılana Dön
                                        </button>
                                    </div>
                                </div>

                                {/* Ollama Configuration */}
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <Server className="w-5 h-5 text-green-600" />
                                        <h4 className="font-bold text-slate-800">Ollama Konfigürasyonu</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Yerel Ollama sunucunuzu yapılandırın
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id="ollama-enabled"
                                                checked={ollamaConfig.enabled}
                                                onChange={(e) => setOllamaConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                                                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                                            />
                                            <label htmlFor="ollama-enabled" className="text-sm font-medium text-slate-700">
                                                Ollama'yı etkinleştir
                                            </label>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                🌐 Ollama API URL
                                            </label>
                                            <input
                                                type="text"
                                                value={ollamaConfig.apiUrl}
                                                onChange={(e) => setOllamaConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                                                placeholder="http://localhost:11434"
                                                className="w-full px-4 py-3 bg-white border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                🤖 Varsayılan Model
                                            </label>
                                            <select
                                                value={ollamaConfig.model}
                                                onChange={(e) => setOllamaConfig(prev => ({ ...prev, model: e.target.value }))}
                                                className="w-full px-4 py-3 bg-white border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                            >
                                                <option value="gemma2:1b">Gemma2:1b (Önerilen)</option>
                                                <option value="gemma2:2b">Gemma2:2b</option>
                                                <option value="llama3.2:1b">Llama3.2:1b</option>
                                                <option value="llama3.2:3b">Llama3.2:3b</option>
                                                {availableModels.map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                {ollamaStatus === 'checking' ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                ) : ollamaStatus === 'online' ? (
                                                    <Wifi className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <WifiOff className="w-4 h-4 text-red-600" />
                                                )}
                                                <span className="text-sm font-medium text-slate-700">
                                                    Durum: {ollamaStatus === 'checking' ? 'Kontrol ediliyor...' : 
                                                           ollamaStatus === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={checkOllamaStatus}
                                                className="px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                            >
                                                Yenile
                                            </button>
                                        </div>

                                        {availableModels.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    📦 Mevcut Modeller ({availableModels.length})
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableModels.map(model => (
                                                        <span
                                                            key={model}
                                                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-lg"
                                                        >
                                                            {model}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* API Keys */}
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                                        <Zap className="w-5 h-5 mr-2 text-blue-600" />
                                        API Anahtarları
                                    </h4>

                                    {/* OpenAI */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            🤖 OpenAI API Key (ChatGPT)
                                        </label>
                                        <input
                                            type="password"
                                            value={openaiKey}
                                            onChange={(e) => setOpenaiKey(e.target.value)}
                                            placeholder="sk-..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                API anahtarı al →
                                            </a>
                                        </p>
                                    </div>

                                    {/* Anthropic */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            💬 Anthropic API Key (Claude)
                                        </label>
                                        <input
                                            type="password"
                                            value={anthropicKey}
                                            onChange={(e) => setAnthropicKey(e.target.value)}
                                            placeholder="sk-ant-..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                                                API anahtarı al →
                                            </a>
                                        </p>
                                    </div>

                                    {/* Google */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            ✨ Google API Key (Gemini)
                                        </label>
                                        <input
                                            type="password"
                                            value={googleKey}
                                            onChange={(e) => setGoogleKey(e.target.value)}
                                            placeholder="AIza..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                                                API anahtarı al →
                                            </a>
                                        </p>
                                    </div>

                                    {/* AnythingLLM */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            🔧 AnythingLLM URL
                                        </label>
                                        <input
                                            type="text"
                                            value={anythingllmUrl}
                                            onChange={(e) => setAnythingllmUrl(e.target.value)}
                                            placeholder="http://localhost:3001"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Yerel AnythingLLM sunucu URL'si
                                        </p>
                                    </div>
                                </div>

                                {/* Security Notice */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-yellow-800 mb-1">Güvenlik Uyarısı</p>
                                            <p className="text-xs text-yellow-700">
                                                API anahtarlarınız tarayıcınızda yerel olarak saklanır. Güvenlik için anahtarlarınızı kimseyle paylaşmayın ve düzenli olarak yenileyin.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex space-x-3">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await OllamaService.saveConfig(ollamaConfig)
                                                alert('✅ Ayarlar kaydedildi!')
                                                setShowSettings(false)
                                                checkOllamaStatus()
                                            } catch (error) {
                                                alert('❌ Ayarlar kaydedilemedi: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
                                            }
                                        }}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                                    >
                                        Kaydet
                                    </button>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
