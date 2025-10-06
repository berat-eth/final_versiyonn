'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Warehouse, Package, MapPin, TrendingUp, TrendingDown,
    Search, Plus, Edit, Trash2, Eye, AlertTriangle,
    ArrowRight, X, Layers, QrCode, Barcode
} from 'lucide-react'

interface WarehouseProduct {
    id: number
    productName: string
    sku: string
    category: string
    quantity: number
    warehouseId: number
    warehouseName: string
    zoneId: number
    zoneName: string
    shelfNumber: string
    minStock: number
    maxStock: number
    lastUpdated: string
}

interface ShelfData {
    id: number
    zoneId: number
    zoneName: string
    shelfNumber: string
    capacity: number
    occupied: number
    products: number
    status: 'available' | 'full' | 'reserved'
}

interface ZoneData {
    id: number
    warehouseId: number
    name: string
    code: string
    capacity: number
    occupied: number
    shelves: number
    type: 'storage' | 'picking' | 'receiving' | 'shipping'
}

interface WarehouseData {
    id: number
    name: string
    code: string
    location: string
    capacity: number
    currentStock: number
    zones: number
    manager: string
    status: 'active' | 'maintenance' | 'inactive'
    temperature?: string
    type: 'main' | 'regional' | 'distribution'
}

export default function WarehouseManagement() {
    const [activeView, setActiveView] = useState<'warehouses' | 'products' | 'shelves' | 'zones'>('warehouses')
    const [searchTerm, setSearchTerm] = useState('')
    const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false)
    const [showEditWarehouseModal, setShowEditWarehouseModal] = useState(false)
    const [showAddProductModal, setShowAddProductModal] = useState(false)
    const [showAddShelfModal, setShowAddShelfModal] = useState(false)
    const [showAddZoneModal, setShowAddZoneModal] = useState(false)
    const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null)
    const [newProduct, setNewProduct] = useState({
        productName: '', sku: '', category: '', quantity: 0,
        warehouseId: 1, zoneId: 1, shelfNumber: '', minStock: 0, maxStock: 0
    })
    const [newShelf, setNewShelf] = useState({ zoneId: 1, shelfNumber: '', capacity: 50 })
    const [newZone, setNewZone] = useState({
        name: '', code: '', capacity: 1000, shelves: 0,
        type: 'storage' as 'storage' | 'picking' | 'receiving' | 'shipping'
    })
    const [newWarehouse, setNewWarehouse] = useState({
        name: '', code: '', location: '', capacity: 10000, manager: '',
        temperature: '', type: 'main' as 'main' | 'regional' | 'distribution'
    })

    const [warehouses, setWarehouses] = useState<WarehouseData[]>([
        {
            id: 1, name: 'Ana Depo İstanbul', code: 'WH-IST-001', location: 'İstanbul, Türkiye',
            capacity: 10000, currentStock: 7500, zones: 12, manager: 'Ahmet Yılmaz',
            status: 'active', temperature: '15-25°C', type: 'main'
        },
        {
            id: 2, name: 'Bölge Depo Ankara', code: 'WH-ANK-002', location: 'Ankara, Türkiye',
            capacity: 5000, currentStock: 3200, zones: 8, manager: 'Ayşe Demir',
            status: 'active', type: 'regional'
        }
    ])

    const [products, setProducts] = useState<WarehouseProduct[]>([
        {
            id: 1, productName: 'Kamp Çadırı 4 Kişilik', sku: 'CAMP-001', category: 'Kamp Malzemeleri',
            quantity: 150, warehouseId: 1, warehouseName: 'Ana Depo İstanbul', zoneId: 1,
            zoneName: 'A Bölgesi', shelfNumber: 'A-01-05', minStock: 50, maxStock: 200,
            lastUpdated: '2025-10-06 10:30'
        },
        {
            id: 2, productName: 'Uyku Tulumu', sku: 'SLEEP-001', category: 'Kamp Malzemeleri',
            quantity: 85, warehouseId: 1, warehouseName: 'Ana Depo İstanbul', zoneId: 1,
            zoneName: 'A Bölgesi', shelfNumber: 'A-01-08', minStock: 30, maxStock: 100,
            lastUpdated: '2025-10-06 09:15'
        }
    ])

    const [shelves, setShelves] = useState<ShelfData[]>([
        {
            id: 1, zoneId: 1, zoneName: 'A Bölgesi', shelfNumber: 'A-01-01',
            capacity: 50, occupied: 45, products: 3, status: 'available'
        },
        {
            id: 2, zoneId: 1, zoneName: 'A Bölgesi', shelfNumber: 'A-01-02',
            capacity: 50, occupied: 50, products: 2, status: 'full'
        }
    ])

    const [zones, setZones] = useState<ZoneData[]>([
        {
            id: 1, warehouseId: 1, name: 'A Bölgesi', code: 'A-01',
            capacity: 1000, occupied: 850, shelves: 20, type: 'storage'
        },
        {
            id: 2, warehouseId: 1, name: 'B Bölgesi', code: 'B-01',
            capacity: 800, occupied: 600, shelves: 16, type: 'picking'
        }
    ])

    const handleAddProduct = () => {
        const newProd: WarehouseProduct = {
            id: products.length + 1, ...newProduct,
            warehouseName: 'Ana Depo İstanbul',
            zoneName: zones.find(z => z.id === newProduct.zoneId)?.name || 'A Bölgesi',
            lastUpdated: new Date().toLocaleString('tr-TR')
        }
        setProducts([...products, newProd])
        setShowAddProductModal(false)
        alert('✅ Ürün başarıyla eklendi!')
    }

    const handleAddShelf = () => {
        const newShelfData: ShelfData = {
            id: shelves.length + 1, ...newShelf,
            zoneName: zones.find(z => z.id === newShelf.zoneId)?.name || 'A Bölgesi',
            occupied: 0, products: 0, status: 'available'
        }
        setShelves([...shelves, newShelfData])
        setShowAddShelfModal(false)
        alert('✅ Raf başarıyla eklendi!')
    }

    const handleAddZone = () => {
        const newZoneData: ZoneData = {
            id: zones.length + 1,
            warehouseId: 1,
            ...newZone,
            occupied: 0
        }
        setZones([...zones, newZoneData])
        setShowAddZoneModal(false)
        setNewZone({ name: '', code: '', capacity: 1000, shelves: 0, type: 'storage' })
        alert('✅ Bölge başarıyla eklendi!')
    }

    const handleAddWarehouse = () => {
        const newWarehouseData: WarehouseData = {
            id: warehouses.length + 1,
            ...newWarehouse,
            currentStock: 0,
            zones: 0,
            status: 'active'
        }
        setWarehouses([...warehouses, newWarehouseData])
        setShowAddWarehouseModal(false)
        setNewWarehouse({ name: '', code: '', location: '', capacity: 10000, manager: '', temperature: '', type: 'main' })
        alert('✅ Depo başarıyla eklendi!')
    }

    const handleEditWarehouse = (warehouse: WarehouseData) => {
        setEditingWarehouse(warehouse)
        setShowEditWarehouseModal(true)
    }

    const handleUpdateWarehouse = () => {
        if (!editingWarehouse) return

        setWarehouses(warehouses.map(w =>
            w.id === editingWarehouse.id ? editingWarehouse : w
        ))
        setShowEditWarehouseModal(false)
        setEditingWarehouse(null)
        alert('✅ Depo başarıyla güncellendi!')
    }

    const handleDeleteWarehouse = (id: number) => {
        if (confirm('Bu depoyu silmek istediğinizden emin misiniz?')) {
            setWarehouses(warehouses.filter(w => w.id !== id))
            alert('✅ Depo başarıyla silindi!')
        }
    }

    const filteredProducts = products.filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.shelfNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredShelves = shelves.filter(s =>
        s.shelfNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.zoneName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Depo Yönetimi</h2>
                    <p className="text-slate-500 mt-1">Ürün ve raf yönetimi</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-600 text-sm mb-1">Toplam Ürün</p>
                            <p className="text-3xl font-bold text-slate-800">{products.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-600 text-sm mb-1">Toplam Raf</p>
                            <p className="text-3xl font-bold text-slate-800">{shelves.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Layers className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-600 text-sm mb-1">Bölge Sayısı</p>
                            <p className="text-3xl font-bold text-slate-800">{zones.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* View Tabs */}
            <div className="bg-white rounded-2xl shadow-sm p-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button onClick={() => setActiveView('warehouses')}
                        className={`px-4 py-2.5 rounded-lg font-medium transition-all ${activeView === 'warehouses' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                            }`}>
                        <Warehouse className="w-4 h-4 inline mr-2" />Depolar
                    </button>
                    <button onClick={() => setActiveView('products')}
                        className={`px-4 py-2.5 rounded-lg font-medium transition-all ${activeView === 'products' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                            }`}>
                        <Package className="w-4 h-4 inline mr-2" />Ürünler
                    </button>
                    <button onClick={() => setActiveView('shelves')}
                        className={`px-4 py-2.5 rounded-lg font-medium transition-all ${activeView === 'shelves' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                            }`}>
                        <Layers className="w-4 h-4 inline mr-2" />Raflar
                    </button>
                    <button onClick={() => setActiveView('zones')}
                        className={`px-4 py-2.5 rounded-lg font-medium transition-all ${activeView === 'zones' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                            }`}>
                        <MapPin className="w-4 h-4 inline mr-2" />Bölgeler
                    </button>
                </div>
            </div>

            {/* Warehouses View */}
            {activeView === 'warehouses' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center justify-end">
                            <button onClick={() => setShowAddWarehouseModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2">
                                <Plus className="w-4 h-4" /><span>Depo Ekle</span>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {warehouses.map((warehouse, index) => (
                            <motion.div key={warehouse.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                            <Warehouse className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{warehouse.name}</h3>
                                            <p className="text-sm text-slate-500">{warehouse.code}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Konum:</span>
                                        <span className="font-medium text-slate-800">{warehouse.location}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Yönetici:</span>
                                        <span className="font-medium text-slate-800">{warehouse.manager}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Bölge Sayısı:</span>
                                        <span className="font-medium text-slate-800">{warehouse.zones}</span>
                                    </div>
                                    {warehouse.temperature && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Sıcaklık:</span>
                                            <span className="font-medium text-slate-800">{warehouse.temperature}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-600">Doluluk Oranı</span>
                                        <span className="font-bold text-slate-800">
                                            {Math.round((warehouse.currentStock / warehouse.capacity) * 100)}%
                                        </span>
                                    </div>
                                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`absolute h-full rounded-full ${(warehouse.currentStock / warehouse.capacity) * 100 > 80 ? 'bg-red-500' :
                                                (warehouse.currentStock / warehouse.capacity) * 100 > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`} style={{ width: `${(warehouse.currentStock / warehouse.capacity) * 100}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                                        <span>{warehouse.currentStock} m³</span>
                                        <span>{warehouse.capacity} m³</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${warehouse.type === 'main' ? 'bg-blue-100 text-blue-700' :
                                            warehouse.type === 'regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {warehouse.type === 'main' ? 'Ana Depo' :
                                            warehouse.type === 'regional' ? 'Bölge Deposu' : 'Dağıtım Merkezi'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${warehouse.status === 'active' ? 'bg-green-100 text-green-700' :
                                            warehouse.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {warehouse.status === 'active' ? 'Aktif' :
                                            warehouse.status === 'maintenance' ? 'Bakımda' : 'Pasif'}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-slate-200">
                                    <button
                                        onClick={() => handleEditWarehouse(warehouse)}
                                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center space-x-1">
                                        <Edit className="w-4 h-4" />
                                        <span>Düzenle</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteWarehouse(warehouse.id)}
                                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Products View */}
            {activeView === 'products' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input type="text" placeholder="Ürün, SKU veya raf ara..." value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <button onClick={() => setShowAddProductModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2">
                                <Plus className="w-4 h-4" /><span>Ürün Ekle</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ürün</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">SKU</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kategori</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Miktar</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Raf No</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Bölge</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                        <Package className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{product.productName}</p>
                                                        <p className="text-xs text-slate-500">{product.warehouseName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <Barcode className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm font-mono text-slate-600">{product.sku}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{product.category}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{product.quantity}</span>
                                                    <span className="text-xs text-slate-500">Min: {product.minStock}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-mono font-medium">
                                                    {product.shelfNumber}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{product.zoneName}</td>
                                            <td className="px-6 py-4">
                                                {product.quantity < product.minStock ? (
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center space-x-1 w-fit">
                                                        <AlertTriangle className="w-3 h-3" /><span>Düşük Stok</span>
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">Normal</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Shelves View */}
            {activeView === 'shelves' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input type="text" placeholder="Raf numarası ara..." value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <button onClick={() => setShowAddShelfModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2">
                                <Plus className="w-4 h-4" /><span>Raf Ekle</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredShelves.map((shelf, index) => (
                            <motion.div key={shelf.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{shelf.shelfNumber}</h4>
                                        <p className="text-sm text-slate-500">{shelf.zoneName}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${shelf.status === 'available' ? 'bg-green-100 text-green-700' :
                                            shelf.status === 'full' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {shelf.status === 'available' ? 'Müsait' : shelf.status === 'full' ? 'Dolu' : 'Rezerve'}
                                    </span>
                                </div>
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Kapasite:</span>
                                        <span className="font-medium text-slate-800">{shelf.capacity} birim</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Dolu:</span>
                                        <span className="font-medium text-slate-800">{shelf.occupied} birim</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Ürün Sayısı:</span>
                                        <span className="font-medium text-slate-800">{shelf.products}</span>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-600">Doluluk</span>
                                        <span className="font-bold text-slate-800">{Math.round((shelf.occupied / shelf.capacity) * 100)}%</span>
                                    </div>
                                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`absolute h-full rounded-full ${(shelf.occupied / shelf.capacity) * 100 > 80 ? 'bg-red-500' :
                                                (shelf.occupied / shelf.capacity) * 100 > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`} style={{ width: `${(shelf.occupied / shelf.capacity) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                                        <QrCode className="w-4 h-4 inline mr-1" />QR Kod
                                    </button>
                                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Zones View */}
            {activeView === 'zones' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center justify-end">
                            <button onClick={() => setShowAddZoneModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2">
                                <Plus className="w-4 h-4" /><span>Bölge Ekle</span>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {zones.map((zone, index) => (
                            <motion.div key={zone.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{zone.name}</h4>
                                        <p className="text-sm text-slate-500">{zone.code}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Raf Sayısı:</span>
                                        <span className="font-medium text-slate-800">{zone.shelves}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Kapasite:</span>
                                        <span className="font-medium text-slate-800">{zone.capacity} m³</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Dolu:</span>
                                        <span className="font-medium text-slate-800">{zone.occupied} m³</span>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-600">Doluluk</span>
                                        <span className="font-bold text-slate-800">{Math.round((zone.occupied / zone.capacity) * 100)}%</span>
                                    </div>
                                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"
                                            style={{ width: `${(zone.occupied / zone.capacity) * 100}%` }} />
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${zone.type === 'storage' ? 'bg-blue-100 text-blue-700' :
                                        zone.type === 'picking' ? 'bg-green-100 text-green-700' :
                                            zone.type === 'receiving' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {zone.type === 'storage' ? 'Depolama' : zone.type === 'picking' ? 'Toplama' :
                                        zone.type === 'receiving' ? 'Kabul' : 'Sevkiyat'}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            <AnimatePresence>
                {showAddProductModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddProductModal(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-slate-800">Yeni Ürün Ekle</h3>
                                    <button onClick={() => setShowAddProductModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Ürün Adı *</label>
                                        <input type="text" value={newProduct.productName}
                                            onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ürün adını girin" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">SKU *</label>
                                        <input type="text" value={newProduct.sku}
                                            onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="PROD-001" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Kategori *</label>
                                    <input type="text" value={newProduct.category}
                                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Kategori adı" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Miktar *</label>
                                        <input type="number" value={newProduct.quantity}
                                            onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Min Stok</label>
                                        <input type="number" value={newProduct.minStock}
                                            onChange={(e) => setNewProduct({ ...newProduct, minStock: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Max Stok</label>
                                        <input type="number" value={newProduct.maxStock}
                                            onChange={(e) => setNewProduct({ ...newProduct, maxStock: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Bölge *</label>
                                        <select value={newProduct.zoneId}
                                            onChange={(e) => setNewProduct({ ...newProduct, zoneId: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            {zones.map(zone => (<option key={zone.id} value={zone.id}>{zone.name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Raf Numarası *</label>
                                        <input type="text" value={newProduct.shelfNumber}
                                            onChange={(e) => setNewProduct({ ...newProduct, shelfNumber: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="A-01-05" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 flex items-center justify-end space-x-3">
                                <button onClick={() => setShowAddProductModal(false)}
                                    className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                                    İptal
                                </button>
                                <button onClick={handleAddProduct}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                                    Ürün Ekle
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Shelf Modal */}
            <AnimatePresence>
                {showAddShelfModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddShelfModal(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-slate-800">Yeni Raf Ekle</h3>
                                    <button onClick={() => setShowAddShelfModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Bölge *</label>
                                    <select value={newShelf.zoneId}
                                        onChange={(e) => setNewShelf({ ...newShelf, zoneId: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        {zones.map(zone => (<option key={zone.id} value={zone.id}>{zone.name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Raf Numarası *</label>
                                    <input type="text" value={newShelf.shelfNumber}
                                        onChange={(e) => setNewShelf({ ...newShelf, shelfNumber: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="A-01-10" />
                                    <p className="text-xs text-slate-500 mt-1">Format: Bölge-Koridor-Raf (örn: A-01-10)</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Kapasite (birim) *</label>
                                    <input type="number" value={newShelf.capacity}
                                        onChange={(e) => setNewShelf({ ...newShelf, capacity: parseInt(e.target.value) || 50 })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="50" />
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 flex items-center justify-end space-x-3">
                                <button onClick={() => setShowAddShelfModal(false)}
                                    className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                                    İptal
                                </button>
                                <button onClick={handleAddShelf}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                                    Raf Ekle
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Zone Modal */}
            <AnimatePresence>
                {showAddZoneModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddZoneModal(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-slate-800">Yeni Bölge Ekle</h3>
                                    <button onClick={() => setShowAddZoneModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Bölge Adı *</label>
                                    <input type="text" value={newZone.name}
                                        onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="C Bölgesi" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Bölge Kodu *</label>
                                    <input type="text" value={newZone.code}
                                        onChange={(e) => setNewZone({ ...newZone, code: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="C-01" />
                                    <p className="text-xs text-slate-500 mt-1">Format: Harf-Numara (örn: C-01)</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Kapasite (m³) *</label>
                                    <input type="number" value={newZone.capacity}
                                        onChange={(e) => setNewZone({ ...newZone, capacity: parseInt(e.target.value) || 1000 })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="1000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Raf Sayısı *</label>
                                    <input type="number" value={newZone.shelves}
                                        onChange={(e) => setNewZone({ ...newZone, shelves: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="20" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Bölge Tipi *</label>
                                    <select value={newZone.type}
                                        onChange={(e) => setNewZone({ ...newZone, type: e.target.value as any })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="storage">Depolama</option>
                                        <option value="picking">Toplama</option>
                                        <option value="receiving">Kabul</option>
                                        <option value="shipping">Sevkiyat</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 flex items-center justify-end space-x-3">
                                <button onClick={() => setShowAddZoneModal(false)}
                                    className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                                    İptal
                                </button>
                                <button onClick={handleAddZone}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                                    Bölge Ekle
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Warehouse Modal */}
            <AnimatePresence>
                {showAddWarehouseModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddWarehouseModal(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-slate-800">Yeni Depo Ekle</h3>
                                    <button onClick={() => setShowAddWarehouseModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Depo Adı *</label>
                                        <input type="text" value={newWarehouse.name}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ana Depo İstanbul" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Depo Kodu *</label>
                                        <input type="text" value={newWarehouse.code}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="WH-IST-001" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Konum *</label>
                                    <input type="text" value={newWarehouse.location}
                                        onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="İstanbul, Türkiye" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Kapasite (m³) *</label>
                                        <input type="number" value={newWarehouse.capacity}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: parseInt(e.target.value) || 10000 })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="10000" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Yönetici *</label>
                                        <input type="text" value={newWarehouse.manager}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, manager: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ahmet Yılmaz" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Sıcaklık (opsiyonel)</label>
                                        <input type="text" value={newWarehouse.temperature}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, temperature: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="15-25°C" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Depo Tipi *</label>
                                        <select value={newWarehouse.type}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, type: e.target.value as any })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="main">Ana Depo</option>
                                            <option value="regional">Bölge Deposu</option>
                                            <option value="distribution">Dağıtım Merkezi</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 flex items-center justify-end space-x-3">
                                <button onClick={() => setShowAddWarehouseModal(false)}
                                    className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                                    İptal
                                </button>
                                <button onClick={handleAddWarehouse}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                                    Depo Ekle
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Warehouse Modal */}
            <AnimatePresence>
                {showEditWarehouseModal && editingWarehouse && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowEditWarehouseModal(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-slate-800">Depo Düzenle</h3>
                                    <button onClick={() => setShowEditWarehouseModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Depo Adı *</label>
                                        <input type="text" value={editingWarehouse.name}
                                            onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Depo Kodu *</label>
                                        <input type="text" value={editingWarehouse.code}
                                            onChange={(e) => setEditingWarehouse({ ...editingWarehouse, code: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Konum *</label>
                                    <input type="text" value={editingWarehouse.location}
                                        onChange={(e) => setEditingWarehouse({ ...editingWarehouse, location: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Kapasite (m³) *</label>
                                        <input type="number" value={editingWarehouse.capacity}
                                            onChange={(e) => setEditingWarehouse({ ...editingWarehouse, capacity: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Yönetici *</label>
                                        <input type="text" value={editingWarehouse.manager}
                                            onChange={(e) => setEditingWarehouse({ ...editingWarehouse, manager: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Sıcaklık (opsiyonel)</label>
                                        <input type="text" value={editingWarehouse.temperature || ''}
                                            onChange={(e) => setEditingWarehouse({ ...editingWarehouse, temperature: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="15-25°C" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Depo Tipi *</label>
                                        <select value={editingWarehouse.type}
                                            onChange={(e) => setEditingWarehouse({ ...editingWarehouse, type: e.target.value as any })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="main">Ana Depo</option>
                                            <option value="regional">Bölge Deposu</option>
                                            <option value="distribution">Dağıtım Merkezi</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Durum *</label>
                                    <select value={editingWarehouse.status}
                                        onChange={(e) => setEditingWarehouse({ ...editingWarehouse, status: e.target.value as any })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="active">Aktif</option>
                                        <option value="maintenance">Bakımda</option>
                                        <option value="inactive">Pasif</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 flex items-center justify-end space-x-3">
                                <button onClick={() => setShowEditWarehouseModal(false)}
                                    className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                                    İptal
                                </button>
                                <button onClick={handleUpdateWarehouse}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                                    Güncelle
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
