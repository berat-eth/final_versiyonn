'use client'

import { useState } from 'react'
import { PhoneCall, Mail, Phone, Building, MapPin, Calendar, Search, Filter, X, MessageSquare, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Contact {
    id: number
    name: string
    email: string
    phone: string
    company: string
    position: string
    location: string
    lastContact: string
    notes: string
    tags: string[]
}

export default function CRMContacts() {
    // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
    const [contacts] = useState<Contact[]>([])

    const [viewingContact, setViewingContact] = useState<Contact | null>(null)

    // İstatistik kartları kaldırıldı (mock)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">İletişim Yönetimi</h2>
                    <p className="text-slate-500 mt-1">İş iletişimlerinizi merkezi olarak yönetin</p>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center space-x-2">
                    <PhoneCall className="w-5 h-5" />
                    <span>Yeni İletişim Ekle</span>
                </button>
            </div>

            {/* İstatistik kartları kaldırıldı */}

            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="İletişim ara..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                            <Filter className="w-4 h-4" />
                            <span>Filtrele</span>
                        </button>
                    </div>
                </div>

                {/* Yatay Liste Formatı */}
                <div className="space-y-4">
                    {contacts.map((contact, index) => (
                        <motion.div
                            key={contact.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-xl transition-all"
                        >
                            <div className="flex items-center justify-between gap-6 flex-wrap lg:flex-nowrap">
                                {/* Sol Taraf - Profil Bilgileri */}
                                <div className="flex items-center space-x-4 flex-1 min-w-[300px]">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
                                        {contact.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-lg font-bold text-slate-800">{contact.name}</h3>
                                            <div className="flex flex-wrap gap-1">
                                                {contact.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2">{contact.position} • {contact.company}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                            <span className="flex items-center">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {contact.location}
                                            </span>
                                            <span className="flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                Son: {contact.lastContact}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Orta - İletişim Bilgileri */}
                                <div className="flex items-center gap-3 min-w-[200px]">
                                    <div className="text-left">
                                        <div className="flex items-center text-sm text-slate-600 mb-1">
                                            <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                            <span className="font-medium">{contact.email}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600">
                                            <Phone className="w-4 h-4 mr-2 text-slate-400" />
                                            <span className="font-medium">{contact.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sağ Taraf - Aksiyon Butonları */}
                                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap lg:flex-nowrap">
                                    <a
                                        href={`https://wa.me/${contact.phone.replace(/\s/g, '').replace(/^0/, '90')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center space-x-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                        <span className="font-medium">WhatsApp</span>
                                    </a>

                                    <a
                                        href={`mailto:${contact.email}`}
                                        className="group relative px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center space-x-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Send className="w-5 h-5" />
                                        <span className="font-medium">E-posta</span>
                                    </a>

                                    <button
                                        onClick={() => setViewingContact(contact)}
                                        className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                                    >
                                        Detay
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Detay Modal */}
            <AnimatePresence>
                {viewingContact && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setViewingContact(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
                        >
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-slate-800">İletişim Detayları</h3>
                                <button
                                    onClick={() => setViewingContact(null)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {viewingContact.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-slate-800">{viewingContact.name}</h4>
                                        <p className="text-slate-600">{viewingContact.position}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {viewingContact.tags.map(tag => (
                                                <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <div className="flex items-center text-slate-500 mb-2">
                                            <Mail className="w-4 h-4 mr-2" />
                                            <p className="text-sm">E-posta</p>
                                        </div>
                                        <p className="font-bold text-slate-800">{viewingContact.email}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <div className="flex items-center text-slate-500 mb-2">
                                            <Phone className="w-4 h-4 mr-2" />
                                            <p className="text-sm">Telefon</p>
                                        </div>
                                        <p className="font-bold text-slate-800">{viewingContact.phone}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <div className="flex items-center text-slate-500 mb-2">
                                            <Building className="w-4 h-4 mr-2" />
                                            <p className="text-sm">Şirket</p>
                                        </div>
                                        <p className="font-bold text-slate-800">{viewingContact.company}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <div className="flex items-center text-slate-500 mb-2">
                                            <MapPin className="w-4 h-4 mr-2" />
                                            <p className="text-sm">Konum</p>
                                        </div>
                                        <p className="font-bold text-slate-800">{viewingContact.location}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-sm text-slate-500 mb-2">Notlar</p>
                                    <p className="text-slate-800">{viewingContact.notes}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <a
                                        href={`https://wa.me/${viewingContact.phone.replace(/\s/g, '').replace(/^0/, '90')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                        <span>WhatsApp</span>
                                    </a>
                                    <a
                                        href={`mailto:${viewingContact.email}`}
                                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                                    >
                                        <Send className="w-5 h-5" />
                                        <span>E-posta Gönder</span>
                                    </a>
                                    <a
                                        href={`tel:${viewingContact.phone}`}
                                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                                    >
                                        <Phone className="w-5 h-5" />
                                        <span>Ara</span>
                                    </a>
                                    <button
                                        onClick={() => setViewingContact(null)}
                                        className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                                    >
                                        Kapat
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
