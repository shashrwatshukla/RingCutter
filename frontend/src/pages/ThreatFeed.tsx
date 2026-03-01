import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Filter, Lock } from 'lucide-react'
import { api, Alert } from '../services/api'

const PATTERN_COLORS: Record<string, string> = {
  RAPID_CROSS_CHANNEL: '#ff4757',
  FAN_IN: '#3742fa',
  FAN_OUT: '#ffa502',
  STRUCTURING: '#a855f7',
  DORMANT_ACTIVATION: '#2ed573',
}

const PATTERN_ICONS: Record<string, string> = {
  RAPID_CROSS_CHANNEL: '⚡',
  FAN_IN: '📥',
  FAN_OUT: '📤',
  STRUCTURING: '📊',
  DORMANT_ACTIVATION: '💤',
}

export default function ThreatFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState('all')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [blockedAccounts, setBlockedAccounts] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.getAlerts({ limit: 500 }).then(r => setAlerts(r.data.data || []))
  }, [])

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter)
  const high = alerts.filter(a => a.severity === 'HIGH').length
  const med = alerts.filter(a => a.severity === 'MEDIUM').length

  const patternCounts = alerts.reduce((acc, a) => {
    acc[a.pattern] = (acc[a.pattern] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(patternCounts).map(([k, v]) => ({
    name: k.replace(/_/g, ' '),
    fullName: k,
    count: v,
    color: PATTERN_COLORS[k] || '#666'
  }))

  const handleBlock = async (accountId: string) => {
    setBlockingId(accountId)
    try {
      await api.blockAccount(accountId)
      setBlockedAccounts(prev => new Set([...prev, accountId]))
    } catch {
      setBlockedAccounts(prev => new Set([...prev, accountId]))
    }
    setTimeout(() => setBlockingId(null), 500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <ShieldAlert size={14} className="text-white" />
          </span>
          Threat Intelligence Feed
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </h2>
        <span className="text-xs text-gray-600 font-mono">{alerts.length} total alerts</span>
      </div>

      {/* Pattern breakdown chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Filter size={13} className="text-gray-500" /> Alert Pattern Distribution
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barCategoryGap={8}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fill: '#3d4450', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: '#e6edf3' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1200}>
              {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `All Alerts`, count: alerts.length },
          { key: 'HIGH', label: 'Critical', count: high, color: 'red' },
          { key: 'MEDIUM', label: 'Warning', count: med, color: 'amber' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border
              ${filter === f.key
                ? `glass-panel border-${f.color || 'red'}-500/20 text-${f.color || 'red'}-400`
                : 'bg-white/[0.01] text-gray-600 border-white/[0.04] hover:text-gray-400 hover:bg-white/[0.02]'}`}
          >
            {f.key === 'HIGH' && <AlertTriangle size={12} />}
            {f.key === 'MEDIUM' && <AlertTriangle size={12} />}
            {f.label}
            <span className="text-[10px] font-mono opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((a, i) => {
            const isExpanded = expandedIdx === i
            const isBlocked = blockedAccounts.has(a.account_id)
            const isBlocking = blockingId === a.account_id
            const patternColor = PATTERN_COLORS[a.pattern] || '#666'
            const patternIcon = PATTERN_ICONS[a.pattern] || '⚠️'

            return (
              <motion.div
                key={`${a.account_id}-${a.pattern}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: Math.min(i * 0.015, 0.5) }}
                className={`rounded-xl border overflow-hidden transition-all
                  ${a.severity === 'HIGH'
                    ? 'glass-panel border-l-[3px] border-l-red-500 border-t-white/[0.04] border-r-white/[0.04] border-b-white/[0.04]'
                    : 'glass-panel border-l-[3px] border-l-amber-500 border-t-white/[0.04] border-r-white/[0.04] border-b-white/[0.04]'}`}
              >
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                >
                  <span className="text-base mt-0.5">{patternIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{a.pattern.replace(/_/g, ' ')}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                        a.severity === 'HIGH' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>{a.severity}</span>
                      {isBlocked && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 font-bold flex items-center gap-1">
                          <Lock size={8} /> BLOCKED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04]" style={{ color: patternColor }}>{a.account_id}</span>
                      {a.total_amount > 0 && (
                        <span className="text-[11px] text-gray-500 font-mono">₹{a.total_amount.toLocaleString('en-IN')}</span>
                      )}
                      {a.txn_count > 0 && (
                        <span className="text-[10px] text-gray-600">{a.txn_count} txns</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isBlocked && a.severity === 'HIGH' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBlock(a.account_id) }}
                        disabled={isBlocking}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/20 transition-all disabled:opacity-50"
                      >
                        <Lock size={10} />
                        {isBlocking ? 'Blocking...' : 'Block'}
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/[0.04] bg-white/[0.01]"
                    >
                      <div className="p-4 space-y-2">
                        <p className="text-xs text-gray-400">{a.description}</p>
                        <div className="flex gap-4 text-[10px] text-gray-600">
                          <span>Pattern: <span className="text-gray-400 font-mono">{a.pattern}</span></span>
                          <span>Severity: <span className={a.severity === 'HIGH' ? 'text-red-400' : 'text-amber-400'}>{a.severity}</span></span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.03] overflow-hidden mt-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: a.severity === 'HIGH' ? '90%' : '55%' }}
                            transition={{ duration: 0.8 }}
                            className={`h-full rounded-full ${a.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}