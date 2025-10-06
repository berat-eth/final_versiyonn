'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import UserDatabase from '@/components/UserDatabase'

export default function UserDatabasePage() {
  const [activeTab, setActiveTab] = useState('user-database')

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <UserDatabase />
        </main>
      </div>
    </div>
  )
}
