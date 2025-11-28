'use client'

import { useState, useEffect } from 'react'
import { api, type ApiResponse } from '@/lib/api'

export type Permission = 'products' | 'orders' | 'customers' | 'reports' | 'settings' | 'all'

interface AdminProfile {
  id: number
  name: string
  email: string
  role: string
  permissions: Permission[]
}

export function usePermissions() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get<ApiResponse<AdminProfile>>('/admin/profile')
        if (response.success && response.data) {
          setProfile({
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            role: response.data.role,
            permissions: response.data.permissions || []
          })
        }
      } catch (error) {
        console.error('Profil yüklenemedi:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const hasPermission = (permission: Permission): boolean => {
    if (!profile) return false
    // 'all' yetkisi varsa tüm yetkilere sahip
    if (profile.permissions.includes('all')) return true
    return profile.permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: (Permission | string)[]): boolean => {
    if (!profile) return false
    if (profile.permissions.includes('all')) return true
    return permissions.some(p => profile.permissions.includes(p as Permission))
  }

  return {
    profile,
    loading,
    hasPermission,
    hasAnyPermission
  }
}

