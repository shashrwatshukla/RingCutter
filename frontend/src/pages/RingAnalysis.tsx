import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'
import { Link2, Users, Activity, Shield, ChevronDown, ChevronUp, AlertTriangle, Clock, Layers } from 'lucide-react'
import { api, Ring } from '../services/api'

const getColor = (s: number) => s > 0.4 ? '#E74C3C' : s > 0.25 ? '#E67E22' : s > 0.15 ? '#F39C12' : s > 0.08 ? '#27AE60' : '#2ECC71'
const getRiskLabel = (s: number) => s > 0.4 ? 'CRITICAL' : s > 0.25 ? 'HIGH' : s > 0.15 ? 'MODERATE' : s > 0.08 ? 'LOW' : 'MINIMAL'

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[160px]">
      <p className="text-sm font-bold text-gray-800 mb-1">Ring #{d.id}</p>
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Members</span>
          <span className="text-gray-700 font-mono font-bold">{d.x}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Risk Score</span>
          <span className="font-mono font-bold" style={{ color: getColor(d.y) }}>{d.y.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Mules Found</span>
          <span className="text-red-500 font-mono font-bold">{d.mules}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Density</span>
          <span className="text-gray-700 font-mono">{d.density.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Threat Level</span>
          <span className="font-bold" style={{ color: getColor(d.y) }}>{getRiskLabel(d.y)}</span>
        </div>
      </div>
    </div>
  )
}

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3">
      <p className="text-sm font-bold text-gray-800 mb-1">Ring {d.name}</p>
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Risk Score</span>
          <span className="font-mono font-bold" style={{ color: d.color }}>{d.score}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Members</span>
          <span className="text-gray-700 font-mono">{d.members}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Mules</span>
          <span className="text-red-500 font-mono">{d.mules}</span>
        </div>
      </div>
    </div>
  )
}

export default function RingAnalysis() {
  const [rings, setRings] = useState<Ring[]>([])
  const [expandedRing, setExpandedRing] = useState<number | null>(null)

  useEffect(() => {
    api.getRings().then(r => setRings(r.data.data || []))
  }, [])

  const bubbleData = rings.slice(0, 25).map(r => ({
    x: r.size, y: r.ring_score, z: r.actual_mules * 30 + 50,
    id: r.community_id, mules: r.actual_mules, density: r.density, name: `Ring #${r.community_id}`
  }))

  const barData = rings.slice(0, 15).map(r => ({
    name: `#${r.community_id}`, score: Number((r.ring_score * 100).toFixed(1)),
    members: r.size, mules: r.actual_mules, color: getColor(r.ring_score)
  }))

  const totalMembers = rings.reduce((s, r) => s + r.size, 0)
  const totalMules = rings.reduce((s, r) => s + r.actual_mules, 0)
  const avgScore = rings.length > 0 ? rings.reduce((s, r) => s + r.ring_score, 0) / rings.length : 0
  const highRiskRings = rings.filter(r => r.ring_score > 0.25).length

  const renderRingTopology = (ring: Ring, size: 'sm' | 'lg' = 'sm') => {
    const members = ring.members || []
    const count = Math.min(members.length, 15)
    const dim = size === 'lg' ? 320 : 200
    const cx = dim / 2, cy = dim / 2
    const radius = size === 'lg' ? (45 + count * 10) : (28 + count * 6)

    return (
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F5B7B1" strokeWidth={0.8} strokeDasharray="3,6" />
        {Array.from({ length: count }).map((_, i) => {
          const ni = (i + 1) % count
          const a1 = (2 * Math.PI * i) / count - Math.PI / 2
          const a2 = (2 * Math.PI * ni) / count - Math.PI / 2
          return (
            <line key={`b-${i}`}
              x1={cx + Math.cos(a1) * radius} y1={cy + Math.sin(a1) * radius}
              x2={cx + Math.cos(a2) * radius} y2={cy + Math.sin(a2) * radius}
              stroke="#F1948A" strokeWidth={size === 'lg' ? 1.5 : 1} strokeDasharray="4,3"
              className="animate-dash-flow" />
          )
        })}
        {ring.density > 0.2 && Array.from({ length: count }).map((_, i) => {
          if (i + 2 >= count) return null
          const a1 = (2 * Math.PI * i) / count - Math.PI / 2
          const a2 = (2 * Math.PI * (i + 2)) / count - Math.PI / 2
          return (
            <line key={`c-${i}`}
              x1={cx + Math.cos(a1) * radius} y1={cy + Math.sin(a1) * radius}
              x2={cx + Math.cos(a2) * radius} y2={cy + Math.sin(a2) * radius}
              stroke="#FADBD8" strokeWidth={0.5} />
          )
        })}
        {Array.from({ length: count }).map((_, i) => {
          const a = (2 * Math.PI * i) / count - Math.PI / 2
          const x = cx + Math.cos(a) * radius
          const y = cy + Math.sin(a) * radius
          const nr = size === 'lg' ? 9 : 5.5
          return (
            <g key={`n-${i}`}>
              <circle cx={x} cy={y} r={nr} fill="#E74C3C" />
              {size === 'lg' && members[i] && (
                <text x={x} y={y + nr + 11} textAnchor="middle" fill="#C0392B" opacity={0.6}
                  fontSize={7} fontFamily="JetBrains Mono" fontWeight={500}>
                  {members[i].slice(-6)}
                </text>
              )}
            </g>
          )
        })}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#BDC3C7" fontSize={size === 'lg' ? 10 : 7} fontWeight={800} fontFamily="JetBrains Mono">RING</text>
        <text x={cx} y={cy + (size === 'lg' ? 12 : 7)} textAnchor="middle" fill={getColor(ring.ring_score)}
          fontSize={size === 'lg' ? 15 : 10} fontWeight={900} fontFamily="JetBrains Mono">#{ring.community_id}</text>
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <Link2 size={14} className="text-white" />
          </span>
          Mule Ring Analysis
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold ml-1">LOUVAIN + GNN</span>
        </h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: <Layers size={14} />, l: 'Total Rings', v: rings.length, c: 'text-purple-400' },
          { icon: <Users size={14} />, l: 'Total Members', v: totalMembers, c: 'text-blue-400' },
          { icon: <AlertTriangle size={14} />, l: 'Mules Found', v: totalMules, c: 'text-red-400' },
          { icon: <Shield size={14} />, l: 'High Risk', v: highRiskRings, c: 'text-amber-400' },
          { icon: <Activity size={14} />, l: 'Avg Score', v: avgScore.toFixed(3), c: 'text-cyan-400' },
        ].map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-panel rounded-xl p-4 text-center">
            <div className={`flex justify-center mb-2 ${m.c}`}>{m.icon}</div>
            <p className={`text-xl font-black font-mono ${m.c}`}>{m.v}</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mt-1 font-bold">{m.l}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <Activity size={13} className="text-gray-500" /> Ring Landscape
          </h3>
          <p className="text-[10px] text-gray-600 mb-4">Each bubble = a community. Size = mule count. X = members. Y = risk score. Color = threat level. <span className="text-gray-500 font-semibold">Hover for details.</span></p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <XAxis dataKey="x" name="Members" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1e293b' }}
                label={{ value: '← Fewer Members    More Members →', fill: '#6b7280', fontSize: 9, position: 'insideBottom', offset: -5 }} />
              <YAxis dataKey="y" name="Risk Score" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1e293b' }}
                label={{ value: 'Risk Score', fill: '#6b7280', fontSize: 9, angle: -90, position: 'insideLeft' }} />
              <ZAxis dataKey="z" range={[40, 400]} />
              <Tooltip content={<CustomScatterTooltip />} cursor={false} />
              <Scatter data={bubbleData} animationDuration={1500}>
                {bubbleData.map((d, i) => <Cell key={i} fill={getColor(d.y)} fillOpacity={0.8} stroke={getColor(d.y)} strokeWidth={1.5} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <Shield size={13} className="text-gray-500" /> Ring Risk Ranking
          </h3>
          <p className="text-[10px] text-gray-600 mb-4">Communities sorted by composite risk score. <span className="text-gray-500 font-semibold">Hover for breakdown.</span></p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} barCategoryGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1e293b' }}
                label={{ value: 'Score %', fill: '#6b7280', fontSize: 9, angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomBarTooltip />} cursor={false} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} animationDuration={1400}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Ring cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Layers size={13} className="text-gray-500" /> Detected Ring Topologies
        </h3>

        {rings.slice(0, 12).map((r, i) => {
          const isExp = expandedRing === r.community_id
          const riskColor = getColor(r.ring_score)
          return (
            <motion.div key={r.community_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`glass-panel rounded-2xl overflow-hidden cursor-pointer transition-all ${isExp ? 'border-red-500/20' : 'hover:border-white/[0.08]'}`}
              onClick={() => setExpandedRing(isExp ? null : r.community_id)}>
              <div className="flex items-stretch">
                <div className="flex-shrink-0 bg-white/[0.008] border-r border-white/[0.03] flex items-center justify-center px-3">
                  {renderRingTopology(r, isExp ? 'lg' : 'sm')}
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-white">Ring #{r.community_id}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border"
                        style={{ color: riskColor, borderColor: `${riskColor}30`, background: `${riskColor}10` }}>
                        {getRiskLabel(r.ring_score)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black font-mono" style={{ color: riskColor }}>{(r.ring_score * 100).toFixed(1)}%</span>
                      {isExp ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: <Users size={13} />, v: r.size, l: 'Members', c: 'text-white' },
                      { icon: <AlertTriangle size={13} />, v: r.actual_mules, l: 'Confirmed Mules', c: 'text-red-400' },
                      { icon: <Activity size={13} />, v: `${(r.mule_ratio * 100).toFixed(0)}%`, l: 'Mule Ratio', c: 'text-amber-400' },
                      { icon: <Link2 size={13} />, v: r.density.toFixed(4), l: 'Internal Density', c: 'text-cyan-400' },
                    ].map((item, j) => (
                      <div key={j} className="flex items-center gap-2.5">
                        <span className="text-gray-600">{item.icon}</span>
                        <div>
                          <p className={`text-sm font-bold font-mono ${item.c}`}>{item.v}</p>
                          <p className="text-[8px] text-gray-600 uppercase tracking-wider">{item.l}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${r.ring_score * 100}%` }}
                      transition={{ delay: i * 0.04 + 0.3, duration: 0.8 }}
                      className="h-full rounded-full" style={{ background: riskColor }} />
                  </div>
                  <AnimatePresence>
                    {isExp && r.members?.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/[0.04]">
                        <p className="text-[9px] text-gray-600 uppercase tracking-[2px] font-bold mb-2">Member Accounts</p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.members.map(m => (
                            <span key={m} className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-red-500/[0.06] text-red-400/80 border border-red-500/10">
                              {m}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                          <div className="flex items-center gap-2">
                            <Clock size={10} className="text-gray-600" />
                            <span className="text-gray-500">Avg Account Age:</span>
                            <span className="text-gray-300 font-mono">{r.avg_account_age?.toFixed(0) || 'N/A'} days</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity size={10} className="text-gray-600" />
                            <span className="text-gray-500">Fraud Edge Ratio:</span>
                            <span className="text-gray-300 font-mono">{((r.fraud_edge_ratio || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}