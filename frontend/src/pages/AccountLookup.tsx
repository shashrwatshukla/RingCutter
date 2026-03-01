import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, BarChart, Bar
} from 'recharts'
import {
  Search as SearchIcon, Shield, MapPin, Clock, CreditCard, User,
  AlertTriangle, Lock, Unlock, FileText, Globe,
  Hash, Link
} from 'lucide-react'
import { api, AccountDetail } from '../services/api'

const CH_COLORS: Record<string, string> = {
  UPI: '#E74C3C',
  MOBILE_APP: '#3498DB',
  WEB_BANKING: '#2ECC71',
  ATM: '#F39C12',
  WALLET: '#9B59B6'
}
const CH_LABELS: Record<string, string> = {
  UPI: 'UPI',
  MOBILE_APP: 'App',
  WEB_BANKING: 'Web',
  ATM: 'ATM',
  WALLET: 'Wallet'
}

const TimelineTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[180px]">
      <p className="text-xs font-bold text-gray-800 mb-1">
        {CH_LABELS[d.channel] || d.channel}
      </p>
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Amount</span>
          <span className="text-gray-800 font-mono font-bold">
            ₹{d.amount?.toLocaleString('en-IN') || '0'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Fraud</span>
          <span className={d.fraud ? 'text-red-500 font-bold' : 'text-green-500'}>
            {d.fraud ? 'YES' : 'No'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">From</span>
          <span className="text-gray-600 font-mono text-[10px]">{d.from}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">To</span>
          <span className="text-gray-600 font-mono text-[10px]">{d.to}</span>
        </div>
      </div>
    </div>
  )
}

const BarTooltipWhite = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3">
      {label && <p className="text-xs font-bold text-gray-800 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="text-gray-800 font-mono font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AccountLookup() {
  const [searchId, setSearchId] = useState('')
  const [detail, setDetail] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [sampleIds, setSampleIds] = useState<string[]>([])

  // Load sample account IDs from alerts (which always exist)
  useEffect(() => {
    const loadSamples = async () => {
      try {
        // Try getting IDs from alerts first — these always have valid account IDs
        const alertRes = await api.getAlerts({ limit: 10 })
        const alerts = alertRes.data.data || alertRes.data || []
        const ids: string[] = []
        const seen = new Set<string>()

        for (const a of alerts) {
          const aid = a.account_id || a.accountId
          if (aid && !seen.has(aid)) {
            seen.add(aid)
            ids.push(aid)
            if (ids.length >= 5) break
          }
        }

        // If we didn't get enough from alerts, try rings
        if (ids.length < 3) {
          try {
            const ringRes = await api.getRings()
            const rings = ringRes.data.data || ringRes.data || []
            for (const ring of rings) {
              const members = ring.members || ring.accounts || []
              for (const m of members) {
                const mid = typeof m === 'string' ? m : (m.account_id || m.id)
                if (mid && !seen.has(mid)) {
                  seen.add(mid)
                  ids.push(mid)
                  if (ids.length >= 5) break
                }
              }
              if (ids.length >= 5) break
            }
          } catch {}
        }

        setSampleIds(ids)
      } catch {
        setSampleIds([])
      }
    }
    loadSamples()
  }, [])

  const doSearch = async (id: string) => {
    if (!id.trim()) return
    setLoading(true)
    setError('')
    setDetail(null)
    setIsBlocked(false)
    setReportGenerated(false)
    try {
      const r = await api.getAccount(id.trim())
      if (r.data && r.data.account_id) {
        setDetail(r.data)
      } else {
        setError(`Account "${id.trim()}" not found. Try one of the sample IDs below.`)
      }
    } catch {
      setError(`Account "${id.trim()}" not found. Try one of the sample IDs below.`)
    }
    setLoading(false)
  }

  const handleSearch = () => doSearch(searchId)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleSampleClick = (id: string) => {
    setSearchId(id)
    doSearch(id)
  }

  const handleBlock = async () => {
    if (!detail) return
    setBlocking(true)
    try { await api.blockAccount(detail.account_id) } catch {}
    setIsBlocked(true)
    setBlocking(false)
  }

  const handleUnblock = async () => {
    if (!detail) return
    setBlocking(true)
    try { await api.unblockAccount(detail.account_id) } catch {}
    setIsBlocked(false)
    setBlocking(false)
  }

  const transactions = detail?.transactions || []

  const chartData = transactions.map((t) => ({
    time: new Date(t.timestamp).getTime(),
    amount: t.amount || 0,
    channel: t.channel || 'UNKNOWN',
    fraud: t.is_fraud || false,
    from: t.from_account || '',
    to: t.to_account || '',
  }))

  const channelBreakdown = transactions.reduce((acc, t) => {
    const key = CH_LABELS[t.channel] || t.channel || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const channelBarData = Object.entries(channelBreakdown).map(([k, v]) => ({ name: k, count: v }))

  const uniqueCounterparties = detail
    ? new Set(
        [...transactions.map((t) => t.from_account), ...transactions.map((t) => t.to_account)]
          .filter((id) => id && id !== detail.account_id)
      ).size
    : 0

  const fraudTxns = transactions.filter((t) => t.is_fraud).length
  const totalAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0)
  const uniqueCities = detail ? new Set(transactions.map((t) => t.city).filter(Boolean)).size : 0

  const riskData = detail?.risk || null
  const hasRisk = riskData && riskData.final_score > 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
          <SearchIcon size={14} className="text-white" />
        </span>
        Account Lookup
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold ml-1">
          FULL INVESTIGATION
        </span>
      </h2>

      {/* Search bar */}
      <div className="glass-panel rounded-2xl p-6">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-3">
          Enter Account ID to Investigate
        </p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="e.g. IB1234567890"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 font-mono focus:outline-none focus:border-indigo-500/40 placeholder-gray-700 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Searching...</>
            ) : (
              <><SearchIcon size={14} /> Search</>
            )}
          </button>
        </div>

        {/* Sample IDs */}
        {sampleIds.length > 0 && !detail && (
          <div className="mt-3">
            <p className="text-[10px] text-gray-600 mb-1.5">Try these account IDs:</p>
            <div className="flex gap-2 flex-wrap">
              {sampleIds.map((id) => (
                <button
                  key={id}
                  onClick={() => handleSampleClick(id)}
                  className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-indigo-500/[0.06] text-indigo-400/80 border border-indigo-500/10 hover:bg-indigo-500/[0.12] hover:border-indigo-500/20 transition-all cursor-pointer"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} /> {error}
            </p>
            {sampleIds.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-600 mb-1.5">Try these valid IDs:</p>
                <div className="flex gap-2 flex-wrap">
                  {sampleIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => handleSampleClick(id)}
                      className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-indigo-500/[0.06] text-indigo-400/80 border border-indigo-500/10 hover:bg-indigo-500/[0.12] hover:border-indigo-500/20 transition-all cursor-pointer"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {detail && (
          <motion.div key={detail.account_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Status banner */}
            <div className={`rounded-2xl p-6 border ${detail.is_mule ? 'glass-panel border-red-500/20' : 'glass-panel border-emerald-500/20'}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${detail.is_mule ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
                    <Shield size={26} className={detail.is_mule ? 'text-red-400' : 'text-emerald-400'} />
                  </div>
                  <div>
                    <p className={`text-xl font-black ${detail.is_mule ? 'text-red-400' : 'text-emerald-400'}`}>
                      {detail.is_mule ? 'MULE SUSPECT' : 'VERIFIED NORMAL'}
                    </p>
                    <p className="text-base text-white font-mono font-bold">{detail.account_id}</p>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><User size={11} /> {detail.customer_name || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {detail.city || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><CreditCard size={11} /> {detail.account_type || 'Unknown'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setReportGenerated(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      reportGenerated ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06]'
                    }`}>
                    <FileText size={14} /> {reportGenerated ? 'STR Generated' : 'Generate STR'}
                  </button>
                  {isBlocked ? (
                    <button onClick={handleUnblock} disabled={blocking}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/20 transition-all disabled:opacity-50">
                      <Unlock size={14} /> {blocking ? 'Processing...' : 'Unblock'}
                    </button>
                  ) : (
                    <button onClick={handleBlock} disabled={blocking}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/20 transition-all disabled:opacity-50">
                      <Lock size={14} /> {blocking ? 'Blocking...' : 'Block Account'}
                    </button>
                  )}
                  {isBlocked && (
                    <span className="text-[10px] px-2.5 py-1 rounded-md bg-red-500/20 text-red-300 font-bold flex items-center gap-1">
                      <Lock size={9} /> BLOCKED
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { icon: <Clock size={13} />, l: 'Account Age', v: `${detail.account_age_days || 0} days` },
                { icon: <CreditCard size={13} />, l: 'Avg Balance', v: `₹${(detail.avg_monthly_balance || 0).toLocaleString('en-IN')}` },
                { icon: <Shield size={13} />, l: 'KYC Status', v: detail.kyc_status || 'Unknown' },
                { icon: <Hash size={13} />, l: 'Total Txns', v: (detail.transaction_count || 0).toString() },
                { icon: <User size={13} />, l: 'Counterparties', v: uniqueCounterparties.toString() },
                { icon: <AlertTriangle size={13} />, l: 'Fraud Txns', v: fraudTxns.toString() },
                { icon: <CreditCard size={13} />, l: 'Total Volume', v: `₹${totalAmount.toLocaleString('en-IN')}` },
                { icon: <Globe size={13} />, l: 'Cities Active', v: uniqueCities.toString() },
                { icon: <User size={13} />, l: 'Age', v: `${detail.age || 0} years` },
                { icon: <CreditCard size={13} />, l: 'Account Type', v: detail.account_type || 'Unknown' },
                { icon: <Link size={13} />, l: 'Ring ID', v: detail.mule_ring_id != null && detail.mule_ring_id >= 0 ? `#${detail.mule_ring_id}` : 'None' },
                { icon: <Shield size={13} />, l: 'Status', v: detail.is_mule ? 'MULE' : 'NORMAL' },
              ].map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="glass-panel rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-gray-600">
                    {m.icon}
                    <span className="text-[8px] uppercase tracking-wider font-bold">{m.l}</span>
                  </div>
                  <p className="text-sm font-bold font-mono text-white truncate">{m.v}</p>
                </motion.div>
              ))}
            </div>

            {/* Risk breakdown */}
            {hasRisk && riskData && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Shield size={13} className="text-gray-500" /> Risk Score Breakdown
                </h3>
                <div className="space-y-3">
                  {[
                    { l: 'GNN Model Score', v: riskData.gnn_score || 0, c: '#E74C3C', desc: 'Graph neural network prediction' },
                    { l: 'Velocity Score', v: riskData.velocity_score || 0, c: '#F39C12', desc: 'Speed-based pattern detection' },
                    { l: 'Community Score', v: riskData.community_score || 0, c: '#9B59B6', desc: 'Louvain community detection score' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{item.l}</span>
                        <span className="text-xs font-mono text-gray-400">{(item.v * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.v * 100}%` }}
                          transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }} className="h-full rounded-full" style={{ background: item.c }} />
                      </div>
                      <p className="text-[10px] text-gray-700 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-sm text-white font-bold">Final Risk Score</span>
                    <span className={`text-2xl font-black font-mono ${
                      riskData.final_score > 0.85 ? 'text-red-400' : riskData.final_score > 0.5 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{(riskData.final_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      riskData.risk_level === 'HIGH' ? 'bg-red-500/15 text-red-400' : riskData.risk_level === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>{riskData.risk_level}</span>
                    <span className="text-[10px] text-gray-600">→ {riskData.action}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Charts */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="lg:col-span-2 glass-panel rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <CreditCard size={13} className="text-gray-500" /> Transaction Timeline
                    <span className="text-[10px] text-gray-600 ml-auto font-mono">{transactions.length} transactions</span>
                  </h3>
                  <div className="flex gap-3 mb-3 text-[10px] flex-wrap">
                    {Object.entries(CH_COLORS).map(([ch, col]) => (
                      <span key={ch} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
                        <span className="text-gray-500">{CH_LABELS[ch]}</span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 ml-2">
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-transparent" />
                      <span className="text-gray-500">Fraud</span>
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <XAxis dataKey="time" tick={false} axisLine={false} />
                      <YAxis dataKey="amount" tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                      <Tooltip content={<TimelineTooltip />} cursor={false} />
                      <Scatter data={chartData} animationDuration={1200}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={CH_COLORS[d.channel] || '#6b7280'} r={d.fraud ? 7 : 3.5}
                            stroke={d.fraud ? '#E74C3C' : 'none'} strokeWidth={d.fraud ? 2.5 : 0} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </motion.div>

                {channelBarData.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="glass-panel rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                      <CreditCard size={13} className="text-gray-500" /> Channel Usage
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={channelBarData} layout="vertical" barCategoryGap={6}>
                        <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
                        <Tooltip content={<BarTooltipWhite />} cursor={false} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={1200} name="Transactions">
                          {channelBarData.map((d, i) => {
                            const fullName = Object.entries(CH_LABELS).find(([, v]) => v === d.name)?.[0] || ''
                            return <Cell key={i} fill={CH_COLORS[fullName] || '#6b7280'} />
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </div>
            )}

            {/* Full Transaction Table */}
            {transactions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Hash size={13} className="text-gray-500" /> Transaction Log
                  <span className="text-[10px] text-gray-600 ml-auto font-mono">
                    Showing {Math.min(transactions.length, 50)} of {detail.transaction_count || transactions.length}
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-2 px-2 text-gray-500 font-semibold">Txn ID</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-semibold">From</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-semibold">To</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-semibold">Amount</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-semibold">Channel</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-semibold">Time</th>
                        <th className="text-center py-2 px-2 text-gray-500 font-semibold">Fraud</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 50).map((t, i) => (
                        <tr key={i} className={`border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors ${t.is_fraud ? 'bg-red-500/[0.03]' : ''}`}>
                          <td className="py-1.5 px-2 font-mono text-gray-400">{(t.txn_id || '').slice(0, 16)}</td>
                          <td className="py-1.5 px-2 font-mono text-gray-300">{t.from_account || '—'}</td>
                          <td className="py-1.5 px-2 font-mono text-gray-300">{t.to_account || '—'}</td>
                          <td className="py-1.5 px-2 font-mono text-white text-right">₹{(t.amount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{ background: `${CH_COLORS[t.channel] || '#666'}15`, color: CH_COLORS[t.channel] || '#666' }}>
                              {CH_LABELS[t.channel] || t.channel || '?'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 font-mono text-gray-500">
                            {t.timestamp ? new Date(t.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {t.is_fraud ? <span className="text-red-400 font-bold">YES</span> : <span className="text-gray-700">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}