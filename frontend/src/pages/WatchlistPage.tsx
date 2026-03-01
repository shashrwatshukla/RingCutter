import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Trash2, Plus, Shield, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import { api, AccountDetail } from '../services/api'

interface WatchItem {
  accountId: string
  addedAt: string
  reason: string
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  detail?: AccountDetail | null
  loadingDetail?: boolean
  loadFailed?: boolean
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [newId, setNewId] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newRisk, setNewRisk] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Load real account IDs from alerts (always available)
  useEffect(() => {
    const loadDefaults = async () => {
      const reasons = [
        'Rapid cross-channel activity detected',
        'Fan-in pattern — possible collector mule',
        'Dormant activation after 180 days',
        'Shared device with known mule',
        'Structuring — multiple txns below 50K',
      ]
      const riskLevels: Array<'HIGH' | 'MEDIUM' | 'LOW'> = ['HIGH', 'HIGH', 'MEDIUM', 'HIGH', 'MEDIUM']

      try {
        const alertRes = await api.getAlerts({ limit: 20 })
        const alerts = alertRes.data.data || alertRes.data || []
        const seen = new Set<string>()
        const defaults: WatchItem[] = []

        for (const a of alerts) {
          const aid = a.account_id || a.accountId
          if (aid && !seen.has(aid) && defaults.length < 5) {
            seen.add(aid)
            defaults.push({
              accountId: aid,
              addedAt: new Date().toISOString(),
              reason: reasons[defaults.length] || 'Flagged by system',
              riskLevel: riskLevels[defaults.length] || 'MEDIUM',
            })
          }
        }

        // If alerts didn't give enough, try rings
        if (defaults.length < 3) {
          try {
            const ringRes = await api.getRings()
            const rings = ringRes.data.data || ringRes.data || []
            for (const ring of rings) {
              const members = ring.members || ring.accounts || []
              for (const m of members) {
                const mid = typeof m === 'string' ? m : (m.account_id || m.id)
                if (mid && !seen.has(mid) && defaults.length < 5) {
                  seen.add(mid)
                  defaults.push({
                    accountId: mid,
                    addedAt: new Date().toISOString(),
                    reason: reasons[defaults.length] || 'Ring member detected',
                    riskLevel: riskLevels[defaults.length] || 'HIGH',
                  })
                }
              }
              if (defaults.length >= 5) break
            }
          } catch {}
        }

        setWatchlist(defaults.length > 0 ? defaults : [{
          accountId: 'NO_DATA',
          addedAt: new Date().toISOString(),
          reason: 'Add accounts manually using the form above',
          riskLevel: 'LOW',
        }])
      } catch {
        setWatchlist([])
      }
      setInitialized(true)
    }
    loadDefaults()
  }, [])

  const addToWatchlist = () => {
    if (!newId.trim()) return
    if (watchlist.find((w) => w.accountId === newId.trim())) return
    setWatchlist((prev) => [
      ...prev,
      {
        accountId: newId.trim(),
        addedAt: new Date().toISOString(),
        reason: newReason.trim() || 'Manual addition by analyst',
        riskLevel: newRisk,
      },
    ])
    setNewId('')
    setNewReason('')
  }

  const removeFromWatchlist = (id: string) => {
    setWatchlist((prev) => prev.filter((w) => w.accountId !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const toggleExpand = async (id: string) => {
    if (id === 'NO_DATA') return
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    const item = watchlist.find((w) => w.accountId === id)
    if (item && !item.detail && !item.loadFailed) {
      setWatchlist((prev) => prev.map((w) => w.accountId === id ? { ...w, loadingDetail: true } : w))
      try {
        const r = await api.getAccount(id)
        if (r.data && r.data.account_id) {
          setWatchlist((prev) => prev.map((w) => w.accountId === id ? { ...w, detail: r.data, loadingDetail: false } : w))
        } else {
          setWatchlist((prev) => prev.map((w) => w.accountId === id ? { ...w, detail: null, loadingDetail: false, loadFailed: true } : w))
        }
      } catch {
        setWatchlist((prev) => prev.map((w) => w.accountId === id ? { ...w, detail: null, loadingDetail: false, loadFailed: true } : w))
      }
    }
  }

  const highCount = watchlist.filter((w) => w.riskLevel === 'HIGH').length
  const medCount = watchlist.filter((w) => w.riskLevel === 'MEDIUM').length

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading watchlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Eye size={14} className="text-white" />
          </span>
          Account Watchlist
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold ml-1">
            {watchlist.filter(w => w.accountId !== 'NO_DATA').length} MONITORED
          </span>
        </h2>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1.5 text-red-400"><AlertTriangle size={10} /> {highCount} Critical</span>
          <span className="flex items-center gap-1.5 text-amber-400"><Shield size={10} /> {medCount} Warning</span>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-3">Add Account to Watchlist</p>
        <div className="flex gap-3 flex-wrap">
          <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Account ID (e.g. IB1234567890)"
            className="flex-1 min-w-[200px] bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-amber-500/30 placeholder-gray-700" />
          <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Reason for monitoring"
            className="flex-1 min-w-[200px] bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-amber-500/30 placeholder-gray-700" />
          <select value={newRisk} onChange={(e) => setNewRisk(e.target.value as any)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none appearance-none cursor-pointer">
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button onClick={addToWatchlist}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-bold border border-amber-500/20 transition-all">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {watchlist.filter(w => w.accountId !== 'NO_DATA').map((w, i) => {
            const isExpanded = expandedId === w.accountId
            return (
              <motion.div
                key={w.accountId + w.addedAt}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-panel rounded-xl overflow-hidden hover:border-amber-500/15 transition-all"
              >
                <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(w.accountId)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    w.riskLevel === 'HIGH' ? 'bg-red-500/10' : w.riskLevel === 'MEDIUM' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                  }`}>
                    {w.riskLevel === 'HIGH' ? <AlertTriangle size={18} className="text-red-400" /> : <Eye size={18} className="text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold font-mono text-white">{w.accountId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{w.reason}</p>
                    <p className="text-[10px] text-gray-700 font-mono mt-0.5">Added: {new Date(w.addedAt).toLocaleString('en-IN')}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold flex-shrink-0 ${
                    w.riskLevel === 'HIGH' ? 'bg-red-500/15 text-red-400' : w.riskLevel === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}>{w.riskLevel}</span>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-600 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-600 flex-shrink-0" />}
                  <button onClick={(e) => { e.stopPropagation(); removeFromWatchlist(w.accountId) }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/[0.04] bg-white/[0.01] overflow-hidden"
                    >
                      {w.loadingDetail ? (
                        <div className="p-6 flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-gray-500">Loading account details...</span>
                        </div>
                      ) : w.detail ? (
                        <div className="p-5 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-sm font-bold ${w.detail.is_mule ? 'text-red-400' : 'text-emerald-400'}`}>
                              {w.detail.is_mule ? '⚠ MULE SUSPECT' : '✓ NORMAL ACCOUNT'}
                            </span>
                            <span className="text-xs text-gray-600">|</span>
                            <span className="text-xs text-gray-400">{w.detail.customer_name || 'Unknown'}</span>
                            <span className="text-xs text-gray-600">|</span>
                            <span className="text-xs text-gray-400">{w.detail.city || 'Unknown'}</span>
                            <span className="text-xs text-gray-600">|</span>
                            <span className="text-xs text-gray-400">{w.detail.account_type || 'Unknown'}</span>
                            <span className="text-xs text-gray-600">|</span>
                            <span className="text-xs text-gray-400">KYC: {w.detail.kyc_status || 'Unknown'}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { l: 'Account Age', v: `${w.detail.account_age_days || 0} days` },
                              { l: 'Avg Balance', v: `₹${(w.detail.avg_monthly_balance || 0).toLocaleString('en-IN')}` },
                              { l: 'Transactions', v: (w.detail.transaction_count || 0).toString() },
                              { l: 'Ring ID', v: w.detail.mule_ring_id != null && w.detail.mule_ring_id >= 0 ? `#${w.detail.mule_ring_id}` : 'None' },
                            ].map((m, j) => (
                              <div key={j} className="bg-white/[0.02] rounded-lg p-2.5">
                                <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">{m.l}</p>
                                <p className="text-sm font-bold font-mono text-white mt-0.5">{m.v}</p>
                              </div>
                            ))}
                          </div>
                          {w.detail.risk && w.detail.risk.final_score > 0 && (
                            <div className="flex items-center gap-4 bg-white/[0.02] rounded-lg p-3 flex-wrap">
                              <span className="text-xs text-gray-500">Risk:</span>
                              <span className={`text-sm font-black font-mono ${
                                w.detail.risk.final_score > 0.85 ? 'text-red-400' : w.detail.risk.final_score > 0.5 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>{(w.detail.risk.final_score * 100).toFixed(1)}%</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                w.detail.risk.risk_level === 'HIGH' ? 'bg-red-500/15 text-red-400' : w.detail.risk.risk_level === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                              }`}>{w.detail.risk.risk_level}</span>
                              <span className="text-[10px] text-gray-600">→ {w.detail.risk.action}</span>
                              <span className="text-[10px] text-gray-600 ml-auto">
                                GNN: {((w.detail.risk.gnn_score || 0) * 100).toFixed(0)}% |
                                Vel: {((w.detail.risk.velocity_score || 0) * 100).toFixed(0)}% |
                                Comm: {((w.detail.risk.community_score || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {/* Recent transactions preview */}
                          {w.detail.transactions && w.detail.transactions.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-2">
                                Recent Transactions ({Math.min(w.detail.transactions.length, 5)} of {w.detail.transaction_count || 0})
                              </p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-[10px]">
                                  <thead>
                                    <tr className="border-b border-white/[0.06]">
                                      <th className="text-left py-1 px-2 text-gray-600">From</th>
                                      <th className="text-left py-1 px-2 text-gray-600">To</th>
                                      <th className="text-right py-1 px-2 text-gray-600">Amount</th>
                                      <th className="text-left py-1 px-2 text-gray-600">Channel</th>
                                      <th className="text-center py-1 px-2 text-gray-600">Fraud</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {w.detail.transactions.slice(0, 5).map((t, ti) => {
                                      const chColors: Record<string, string> = { UPI: '#E74C3C', MOBILE_APP: '#3498DB', WEB_BANKING: '#2ECC71', ATM: '#F39C12', WALLET: '#9B59B6' }
                                      const chLabels: Record<string, string> = { UPI: 'UPI', MOBILE_APP: 'App', WEB_BANKING: 'Web', ATM: 'ATM', WALLET: 'Wallet' }
                                      return (
                                        <tr key={ti} className={`border-b border-white/[0.02] ${t.is_fraud ? 'bg-red-500/[0.03]' : ''}`}>
                                          <td className="py-1 px-2 font-mono text-gray-400">{t.from_account || '—'}</td>
                                          <td className="py-1 px-2 font-mono text-gray-400">{t.to_account || '—'}</td>
                                          <td className="py-1 px-2 font-mono text-white text-right">₹{(t.amount || 0).toLocaleString('en-IN')}</td>
                                          <td className="py-1 px-2">
                                            <span className="px-1 py-0.5 rounded text-[8px] font-bold"
                                              style={{ background: `${chColors[t.channel] || '#666'}15`, color: chColors[t.channel] || '#666' }}>
                                              {chLabels[t.channel] || t.channel || '?'}
                                            </span>
                                          </td>
                                          <td className="py-1 px-2 text-center">
                                            {t.is_fraud ? <span className="text-red-400 font-bold">YES</span> : <span className="text-gray-700">—</span>}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-5 text-center text-gray-600 text-sm">
                          <AlertTriangle size={20} className="mx-auto mb-2 text-gray-700" />
                          <p>Account not found in database. It may be an external account or the ID may be incorrect.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {watchlist.filter(w => w.accountId !== 'NO_DATA').length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <Eye size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No accounts in watchlist</p>
            <p className="text-xs text-gray-700 mt-1">Add accounts above to start monitoring</p>
          </div>
        )}
      </div>
    </div>
  )
}