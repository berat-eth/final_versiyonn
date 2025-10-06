'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ShoppingCart, Users } from 'lucide-react'

// Leaflet icon fix for Next.js
if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
}

interface LiveUser {
    id: number
    name: string
    city: string
    lat: number
    lng: number
    hasCart: boolean
    cartItems: number
    cartValue: number
    status: 'browsing' | 'checkout' | 'cart'
    page: string
}

interface LiveUserMapProps {
    users: LiveUser[]
}

// Custom marker icons
const createCustomIcon = (color: string, hasCart: boolean) => {
    const iconHtml = hasCart
        ? `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 3px solid white;">
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
         </svg>
       </div>`
        : `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 3px solid white;">
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
         </svg>
       </div>`

    return L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    })
}

function MapUpdater({ users }: { users: LiveUser[] }) {
    const map = useMap()

    useEffect(() => {
        if (users.length > 0) {
            const bounds = L.latLngBounds(users.map(u => [u.lat, u.lng]))
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [users, map])

    return null
}

export default function LiveUserMap({ users }: LiveUserMapProps) {
    // Türkiye merkez koordinatları
    const center: [number, number] = [39.0, 35.0]
    const ZOOM_LEVEL = 6

    return (
        <div className="relative w-full h-full rounded-xl overflow-hidden">
            <MapContainer
                center={center}
                zoom={ZOOM_LEVEL}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
                scrollWheelZoom={true}
                attributionControl={true}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater users={users} />

                {users.map((user) => {
                    const color =
                        user.status === 'checkout' ? '#10b981' :
                            user.hasCart ? '#f97316' : '#3b82f6'

                    return (
                        <Marker
                            key={user.id}
                            position={[user.lat, user.lng]}
                            icon={createCustomIcon(color, user.hasCart)}
                        >
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-200">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            {user.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.city}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Sayfa:</span>
                                            <span className="font-medium text-slate-800">{user.page}</span>
                                        </div>

                                        {user.hasCart && (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-600">Sepet:</span>
                                                    <span className="font-medium text-orange-600">{user.cartItems} ürün</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-600">Tutar:</span>
                                                    <span className="font-medium text-green-600">₺{user.cartValue.toLocaleString()}</span>
                                                </div>
                                            </>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                            <span className="text-slate-600">Durum:</span>
                                            <span className={`font-medium px-2 py-1 rounded text-xs ${user.status === 'checkout' ? 'bg-green-100 text-green-700' :
                                                    user.status === 'cart' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {user.status === 'checkout' ? '💳 Ödeme' :
                                                    user.status === 'cart' ? '🛒 Sepet' : '👀 Geziniyor'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    )
}
