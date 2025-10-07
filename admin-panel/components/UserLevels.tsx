import { useEffect, useState } from 'react'
import { Award, Search, Plus, Minus } from 'lucide-react'
import { api } from '@/lib/api'

interface LevelInfo {
  totalExp: number
  currentLevel: { id: string; displayName: string; minExp: number; maxExp: number; color: string; multiplier: number }
  nextLevel: { id: string; displayName: string; minExp: number; maxExp: number; color: string; multiplier: number } | null
  expToNextLevel: number
  progressPercentage: number
}

export default function UserLevels() {
  const [userId, setUserId] = useState<string>('')
  const [info, setInfo] = useState<LevelInfo | null>(null)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustLoading, setAdjustLoading] = useState(false)

  const fetchInfo = async () => {
    if (!userId) { setError('Kullanıcı ID girin'); return }
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>(`/user-level/${userId}`)
      if (res?.success) setInfo(res.data)
      else setInfo(null)
    } catch (e: any) {
      setError(e?.message || 'Seviye bilgisi alınamadı')
      setInfo(null)
    } finally { setLoading(false) }
  }

  const fetchList = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/user-levels', { limit: 50, offset: 0 })
      if (res?.success) setList(res.data.users || [])
      else setList([])
    } catch (e: any) {
      setError(e?.message || 'Kullanıcı seviyeleri alınamadı')
      setList([])
    } finally { setLoading(false) }
  }

  const adjustExp = async (sign: 1 | -1) => {
    const amt = parseInt(adjustAmount, 10)
    if (!userId || !amt || amt <= 0) { setError('Geçerli bir tutar girin'); return }
    try {
      setAdjustLoading(true)
      setError(null)
      const res = await api.post<any>('/admin/user-exp/adjust', {
        userId: Number(userId),
        amount: sign * amt,
        description: sign > 0 ? 'Manual EXP add' : 'Manual EXP remove'
      })
      if (res?.success) await fetchInfo()
    } catch (e: any) {
      setError(e?.message || 'EXP güncellenemedi')
    } finally { setAdjustLoading(false) }
  }

  useEffect(()=>{ fetchList() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kullanıcı Seviyeleri</h2>
          <p className="text-slate-500 mt-1">Seviye bilgisi görüntüle, EXP ekle/çıkar</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="Kullanıcı ID" className="px-3 py-2 border border-slate-300 rounded-lg w-48" />
          <button onClick={fetchInfo} disabled={loading || !userId} className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Getir</button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        {loading ? (
          <p className="text-slate-500">Yükleniyor...</p>
        ) : info ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6" />
                <div>
                  <div className="text-slate-800 font-semibold">Seviye: <span style={{ color: info.currentLevel.color }}>{info.currentLevel.displayName}</span></div>
                  <div className="text-slate-500 text-sm">Toplam EXP: {info.totalExp}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-700 text-sm">Sonraki seviye: {info.nextLevel ? info.nextLevel.displayName : 'Maks'}</div>
                <div className="text-slate-500 text-sm">Kalan EXP: {info.expToNextLevel}</div>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${info.progressPercentage}%` }} />
            </div>

            <div className="flex items-center gap-2">
              <input type="number" value={adjustAmount} onChange={e=>setAdjustAmount(e.target.value)} placeholder="EXP" className="px-3 py-2 border border-slate-300 rounded-lg w-40" />
              <button onClick={()=>adjustExp(1)} disabled={adjustLoading} className="px-3 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4"/> Ekle</button>
              <button onClick={()=>adjustExp(-1)} disabled={adjustLoading} className="px-3 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><Minus className="w-4 h-4"/> Düş</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-slate-800 font-semibold">Tüm Kullanıcılar</div>
              <button onClick={fetchList} className="px-3 py-2 bg-slate-100 rounded-lg">Yenile</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kullanıcı</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Toplam EXP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Seviye</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">İlerleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((u:any, idx:number)=>(
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{u.name} (#{u.userId})</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{u.totalExp}</td>
                      <td className="px-4 py-3 text-sm" style={{color: u.currentLevel?.color}}>{u.currentLevel?.displayName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">%{Math.round(u.progressPercentage||0)}</td>
                    </tr>
                  ))}
                  {list.length===0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Kayıt bulunamadı</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
