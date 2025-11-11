'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface MaintenanceModeData {
  enabled: boolean
  message: string
  estimatedEndTime: string | null
}

export default function MaintenanceMode() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceModeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.plaxsy.com/api'
        const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
        
        const response = await fetch(`${API_BASE_URL}/maintenance/status?platform=web`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          cache: 'no-store'
        })

        if (response.ok) {
          const data = await response.json()
          if (data?.success && data?.data?.enabled) {
            setMaintenanceData({
              enabled: true,
              message: data.data.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
              estimatedEndTime: data.data.estimatedEndTime || null
            })
          } else {
            setMaintenanceData(null)
          }
        } else {
          setMaintenanceData(null)
        }
      } catch (error) {
        console.error('Bakım modu kontrolü başarısız:', error)
        setMaintenanceData(null)
      } finally {
        setLoading(false)
      }
    }

    checkMaintenance()
    
    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkMaintenance, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return null
  }

  if (!maintenanceData?.enabled) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <Image
            src="/assets/logo.png"
            alt="Logo"
            width={180}
            height={180}
            className="mx-auto"
            priority
          />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Bakım Modu
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {maintenanceData.message}
        </p>
        
        {maintenanceData.estimatedEndTime && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Tahmini Bitiş:</span>{' '}
              {new Date(maintenanceData.estimatedEndTime).toLocaleString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
        
        <button
          onClick={() => {
            window.location.reload()
          }}
          className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}

