import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts'
import { Search, Shield, Lock, Unlock, MapPin, Clock, CreditCard, User, AlertTriangle, FileText } from 'lucide-react'
import { api, AccountDetail } from '../services/api'

const CH_COLORS: Record<string, string> = { UPI: '#E74C3C', MOBILE_APP: '#3498DB', WEB_BANKING: '#2ECC71', ATM: '#F39C12', WALLET: '#9B59B6' }
const CH_LABELS: Record<string, string> = { UPI: 'UPI', MOBILE_APP: 'App', WEB_BANKING: 'Web', ATM: 'ATM', WALLET: 'Wallet' }

const TimelineTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[170px]">
      <p className="text-xs font-bold text-gray-800 mb-1">{CH_LABELS[d.channel] || d.channel}</p>
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-3"><span className="text-gray-400">Amount</span><span className="text-gray-800 font-mono font-bold">₹{d.amount.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between gap-3"><span className="text-gray-400">Fraud</span><span className={d.fraud ? 'text-red-500 font-bold' : 'text-green-500'}>{d.fraud ? 'YES' : 'No'}</span></div>
        <div className="flex justify-between gap-3"><span className="text-gray-400">Time</span><span className="text-gray-600 font-mono text-[10px]">{new Date(d.time).toLocaleString('en-IN')}</span></div>
      </div>
    </div>
  )
}

export default function AccountIntel() {
  const [lists, setLists] = useState<{ mule_accounts: string[]; normal_accounts: string[] }>({ mule_accounts: [], normal_accounts: [] })
  const [selected, setSelected] = useState('')
  const [detail, setDetail] = useState<AccountDetail | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)

  useEffect(() => {
    api.getAccountsList().then(r => { setLists(r.data); if (r.data.mule_accounts.length) setSelected(r.data.mule_accounts[0]) })
  }, [])

  useEffect(() => {
    if (selected) {
      api.getAccount(selected).then(r => { setDetail(r.data); setIsBlocked(false); setReportGenerated(false) })
    }
  }, [selected])

  const handleBlock = async () => { setBlocking(true); try { await api.blockAccount(detail!.account_id) } catch {} setIsBlocked(true); setBlocking(false) }
  const handleUnblock = async () => { setBlocking(true); try { await api.unblockAccount(detail!.account_id) } catch {} setIsBlocked(false); setBlocking(false) }
  const handleReport = () => { setReportGenerated(true) }

  const chartData = detail?.transactions.map(t => ({
    time: new Date(t.timestamp).getTime(), amount: t.amount, channel: t.channel, fraud: t.is_fraud
  })) || []

  // Channel breakdown for this account
  const channelBreakdown = detail?.transactions.reduce((acc, t) => {
    const key = CH_LABELS[t.channel] || t.channel
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  const channelBarData = Object.entries(channelBreakdown).map(([k, v]) => ({ name: k, count: v }))

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Search size={14} className="text-white" /></span>
        Account Intelligence
      </h2>

      <div className="glass-panel rounded-xl p-4">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider font-bold block mb-2">Select Account to Investigate</label>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-gray-300 font-mono focus:outline-none focus:border-red-500/30 transition-colors appearance-none cursor-pointer">
          <optgroup label="Suspected Mule Accounts">{lists.mule_accounts.map(id => <option key={id} value={id}>{id}</option>)}</optgroup>
          <optgroup label="Normal Accounts">{lists.normal_accounts.map(id => <option key={id} value={id}>{id}</option>)}</optgroup>
        </select>
      </div>

      {detail && (
        <AnimatePresence mode="wait">
          <motion.div key={detail.account_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Status banner */}
            <div className={`rounded-2xl p-6 border ${detail.is_mule ? 'glass-panel border-red-500/20' : 'glass-panel border-emerald-500/20'}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${detail.is_mule ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
                    <Shield size={22} className={detail.is_mule ? 'text-red-400' : 'text-emerald-400'} />
                  </div>
                  <div>
                    <p className={`text-lg font-black ${detail.is_mule ? 'text-red-400' : 'text-emerald-400'}`}>
                      {detail.is_mule ? 'MULE SUSPECT' : 'VERIFIED NORMAL'}
                    </p>
                    <p className="text-sm text-gray-400 font-mono">{detail.account_id}</p>
                    <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                      <User size={10} /> {detail.customer_name} <MapPin size={10} className="ml-2" /> {detail.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Generate Report */}
                  <button onClick={handleReport}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      reportGenerated
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06]'
                    }`}>
                    <FileText size={14} /> {reportGenerated ? 'STR Generated' : 'Generate STR'}
                  </button>

                  {/* Flag as Suspicious */}
                  {!detail.is_mule && !isBlocked && (
                    <button onClick={handleBlock} disabled={blocking}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-bold border border-amber-500/20 transition-all disabled:opacity-50">
                      <AlertTriangle size={14} /> Flag Suspicious
                    </button>
                  )}

                  {/* Block / Unblock */}
                  {isBlocked ? (
                    <button onClick={handleUnblock} disabled={blocking}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/20 transition-all disabled:opacity-50">
                      <Unlock size={14} /> {blocking ? 'Processing...' : 'Unblock'}
                    </button>
                  ) : detail.is_mule ? (
                    <button onClick={handleBlock} disabled={blocking}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/20 transition-all disabled:opacity-50">
                      <Lock size={14} /> {blocking ? 'Blocking...' : 'Block Account'}
                    </button>
                  ) : null}
                  {isBlocked && (
                    <span className="text-[10px] px-2.5 py-1 rounded-md bg-red-500/20 text-red-300 font-bold flex items-center gap-1"><Lock size={9} /> BLOCKED</span>
                  )}
                  {reportGenerated && (
                    <span className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1"><FileText size={9} /> STR FILED</span>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Clock size={14} />, l: 'Account Age', v: `${detail.account_age_days} days` },
                { icon: <CreditCard size={14} />, l: 'Avg Balance', v: `₹${detail.avg_monthly_balance.toLocaleString('en-IN')}` },
                { icon: <Shield size={14} />, l: 'KYC Status', v: detail.kyc_status },
                { icon: <CreditCard size={14} />, l: 'Transactions', v: detail.transaction_count.toString() },
              ].map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-gray-600">{m.icon}<span className="text-[9px] uppercase tracking-wider font-bold">{m.l}</span></div>
                  <p className="text-lg font-bold font-mono text-white">{m.v}</p>
                </motion.div>
              ))}
            </div>

            {/* Risk breakdown */}
            {detail.risk && detail.risk.final_score > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Shield size={13} className="text-gray-500" /> Risk Score Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { l: 'GNN Model Score', v: detail.risk.gnn_score, c: '#E74C3C', desc: 'Graph neural network prediction' },
                    { l: 'Velocity Score', v: detail.risk.velocity_score, c: '#F39C12', desc: 'Speed-based pattern detection' },
                    { l: 'Community Score', v: detail.risk.community_score, c: '#9B59B6', desc: 'Ring membership analysis' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{item.l}</span>
                        <span className="text-xs font-mono text-gray-400">{(item.v * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.v * 100}%` }}
                          transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                          className="h-full rounded-full" style={{ background: item.c }} />
                      </div>
                      <p className="text-[10px] text-gray-700 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-sm text-white font-bold">Final Risk Score</span>
                    <span className={`text-2xl font-black font-mono ${
                      detail.risk.final_score > 0.85 ? 'text-red-400' : detail.risk.final_score > 0.5 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{(detail.risk.final_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      detail.risk.risk_level === 'HIGH' ? 'bg-red-500/15 text-red-400' :
                      detail.risk.risk_level === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>{detail.risk.risk_level}</span>
                    <span className="text-[10px] text-gray-600">→ {detail.risk.action}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Timeline */}
              {chartData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="lg:col-span-2 glass-panel rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <CreditCard size={13} className="text-gray-500" /> Transaction Timeline
                  </h3>
                  <div className="flex gap-3 mb-3 text-[10px]">
                    {Object.entries(CH_COLORS).map(([ch, col]) => (
                      <span key={ch} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: col }} /><span className="text-gray-500">{CH_LABELS[ch]}</span></span>
                    ))}
                    <span className="flex items-center gap-1.5 ml-2"><span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-transparent" /><span className="text-gray-500">Fraud</span></span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <XAxis dataKey="time" tick={false} axisLine={false} />
                      <YAxis dataKey="amount" tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1e293b' }}
                        label={{ value: 'Amount (₹)', fill: '#6b7280', fontSize: 10, angle: -90, position: 'insideLeft' }} />
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
              )}

              {/* Channel usage bar */}
              {channelBarData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className="glass-panel rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Activity size={13} className="text-gray-500" /> Channel Usage
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={channelBarData} layout="vertical" barCategoryGap={6}>
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
                      <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#e6edf3' }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={1200}>
                        {channelBarData.map((d, i) => {
                          const fullName = Object.entries(CH_LABELS).find(([, v]) => v === d.name)?.[0] || ''
                          return <Cell key={i} fill={CH_COLORS[fullName] || COLORS[i]} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

const COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6']
const Activity = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
)