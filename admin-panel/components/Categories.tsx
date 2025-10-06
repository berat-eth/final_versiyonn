'use client'

import { useState } from 'react'
import { FolderTree, Plus, Edit2, Trash2, Search, Filter, Download, Upload } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Categories() {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Elektronik', parentId: null, productCount: 245, isActive: true, externalId: 'CAT001' },
    { id: 2, name: 'Giyim', parentId: null, productCount: 189, isActive: true, externalId: 'CAT002' },
    { id: 3, name: 'Ev & Yaşam', parentId: null, productCount: 156, isActive: true, externalId: 'CAT003' },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kategoriler</h2>
          <p className="text-slate-500 mt-1">Ürün kategorilerini yönetin</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kategori</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Kategori ara..."
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

        <div className="space-y-3">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <FolderTree className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{category.name}</h3>
                    <p className="text-sm text-slate-500">{category.productCount} ürün</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    category.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {category.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
