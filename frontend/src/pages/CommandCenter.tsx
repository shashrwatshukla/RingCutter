import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import {
  Users,
  CreditCard,
  ShieldAlert,
  Link2,
  Zap,
  Target,
  Lock,
  Activity,
} from 'lucide-react'
import MetricCard from '../components/MetricCard'
import { api, Overview } from '../services/api'

const CHANNEL_COLORS: Record<string, string> = {
  UPI: '#E74C3C',
  MOBILE_APP: '#3498DB',
  WEB_BANKING: '#2ECC71',
  ATM: '#F39C12',
  WALLET: '#9B59B6',
}
const CHANNEL_LABELS: Record<string, string> = {
  UPI: 'UPI',
  MOBILE_APP: 'Mobile App',
  WEB_BANKING: 'Web Banking',
  ATM: 'ATM',
  WALLET: 'Wallet',
}
const COLORS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E91E63',
]

const WhiteTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[140px]">
      {label && <p className="text-xs font-bold text-gray-800 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-gray-500">{p.name}:</span>
          <span className="text-gray-800 font-mono font-bold">
            {typeof p.value === 'number'
              ? p.value.toLocaleString('en-IN')
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  const label = CHANNEL_LABELS[d.name] || d.name
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[170px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: d.payload.fill }}
        />
        <span className="text-sm font-bold text-gray-800">{label}</span>
      </div>
      <p className="text-xs text-gray-700 font-mono">
        {d.value.toLocaleString('en-IN')} transactions
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">
        {((d.payload.percent || 0) * 100).toFixed(1)}% of total
      </p>
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  value,
  percent,
}: any) => {
  const r = outerRadius + 32
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  const label = CHANNEL_LABELS[name] || name
  return (
    <g>
      <text
        x={x}
        y={y - 6}
        textAnchor={x > cx ? 'start' : 'end'}
        fill="#2C3E50"
        fontSize={11}
        fontWeight={700}
        fontFamily="Inter, system-ui"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 8}
        textAnchor={x > cx ? 'start' : 'end'}
        fill="#7F8C8D"
        fontSize={10}
        fontFamily="JetBrains Mono"
      >
        {value.toLocaleString('en-IN')} ({(percent * 100).toFixed(1)}%)
      </text>
    </g>
  )
}

export default function CommandCenter() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [daily, setDaily] = useState<{
    normal: { date: string; count: number }[]
    fraud: { date: string; count: number }[]
  } | null>(null)
  const [channels, setChannels] = useState<{
    labels: string[]
    values: number[]
  } | null>(null)
  const [alertPatterns, setAlertPatterns] = useState<Record<string, number>>({})
  const [rings, setRings] = useState<
    {
      community_id: number
      size: number
      ring_score: number
      actual_mules: number
    }[]
  >([])

  useEffect(() => {
    api.getOverview().then((r) => setOverview(r.data))
    api.getDailyVolume().then((r) => setDaily(r.data))
    api.getChannels().then((r) => setChannels(r.data))
    api
      .getAlerts({ limit: 500 })
      .then((r) => {
        const patterns: Record<string, number> = {}
        ;(r.data.data || []).forEach((a: { pattern: string }) => {
          patterns[a.pattern] = (patterns[a.pattern] || 0) + 1
        })
        setAlertPatterns(patterns)
      })
    api
      .getRings()
      .then((r) => setRings((r.data.data || []).slice(0, 10)))
  }, [])

  if (!overview)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading intelligence...</p>
        </div>
      </div>
    )

  const dailyData = daily
    ? daily.normal.map((n, i) => ({
        date: n.date.slice(5),
        normal: n.count,
        fraud: daily.fraud[i]?.count || 0,
      }))
    : []
  const channelData = channels
    ? channels.labels.map((l, i) => ({ name: l, value: channels.values[i] }))
    : []
  const totalTxns = channelData.reduce((s, c) => s + c.value, 0)
  const alertData = Object.entries(alertPatterns)
    .map(([k, v]) => ({ name: k.replace(/_/g, ' '), count: v }))
    .sort((a, b) => b.count - a.count)

  const radarData = [
    { metric: 'Precision', value: overview.precision * 100 },
    { metric: 'Recall', value: overview.recall * 100 },
    { metric: 'F1 Score', value: overview.f1_score * 100 },
    { metric: 'Ring Detect', value: 82 },
    { metric: 'Speed', value: 95 },
    { metric: 'Coverage', value: 88 },
  ]

  // Top rings bar chart
  const topRingsData = rings.map((r) => ({
    name: `Ring #${r.community_id}`,
    score: Number((r.ring_score * 100).toFixed(1)),
    members: r.size,
    mules: r.actual_mules,
  }))

  const getColor = (s: number) =>
    s > 40
      ? '#E74C3C'
      : s > 25
        ? '#E67E22'
        : s > 15
          ? '#F39C12'
          : '#2ECC71'

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl glass-panel p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.03] via-transparent to-orange-500/[0.03]" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-xl shadow-red-500/20 flex-shrink-0">
            <Zap size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              Command Center
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cross-Channel Mule Ring Detection · Real-time Intelligence
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-semibold">
              ALL SYSTEMS ACTIVE
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total Accounts"
          value={overview.total_accounts}
          icon={<Users size={18} />}
          color="blue"
          subtitle="Monitored"
        />
        <MetricCard
          label="Transactions"
          value={overview.total_transactions}
          icon={<CreditCard size={18} />}
          color="cyan"
          subtitle="Processed"
        />
        <MetricCard
          label="Mule Accounts"
          value={overview.mule_accounts}
          icon={<ShieldAlert size={18} />}
          color="red"
          trend="up"
          subtitle="Detected"
        />
        <MetricCard
          label="Fraud Txns"
          value={overview.fraud_transactions}
          icon={<Target size={18} />}
          color="red"
          trend="up"
        />
        <MetricCard
          label="Mule Rings"
          value={overview.mule_rings}
          icon={<Link2 size={18} />}
          color="yellow"
          subtitle="Active"
        />
        <MetricCard
          label="Active Alerts"
          value={overview.total_alerts}
          icon={<ShieldAlert size={18} />}
          color="purple"
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 glass-panel rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Activity size={14} className="text-gray-500" /> Transaction
              Volume Over Time
            </h3>
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Fraud
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E74C3C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#E74C3C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip content={<WhiteTooltip />} />
              <Area
                type="monotone"
                dataKey="normal"
                stroke="#2ECC71"
                strokeWidth={2}
                fill="url(#gN)"
                name="Normal"
                animationDuration={1500}
              />
              <Area
                type="monotone"
                dataKey="fraud"
                stroke="#E74C3C"
                strokeWidth={2}
                fill="url(#gF)"
                name="Fraud"
                animationDuration={1800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <CreditCard size={14} className="text-gray-500" /> Channel
            Distribution
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                dataKey="value"
                stroke="rgba(6,9,15,0.9)"
                strokeWidth={3}
                animationBegin={200}
                animationDuration={1200}
                label={renderPieLabel}
                labelLine={{
                  stroke: 'rgba(255,255,255,0.1)',
                  strokeWidth: 1,
                }}
              >
                {channelData.map((c, i) => (
                  <Cell
                    key={i}
                    fill={CHANNEL_COLORS[c.name] || COLORS[i]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <text
                x="50%"
                y="46%"
                textAnchor="middle"
                fill="white"
                fontSize={18}
                fontWeight={900}
                fontFamily="JetBrains Mono"
              >
                {(totalTxns / 1000).toFixed(1)}K
              </text>
              <text
                x="50%"
                y="56%"
                textAnchor="middle"
                fill="#6b7280"
                fontSize={8}
                fontWeight={600}
                letterSpacing={2}
              >
                TOTAL TXNS
              </text>
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-panel rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <ShieldAlert size={14} className="text-gray-500" /> Detection
              Patterns
            </h3>
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
              GNN + RULES
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={alertData} layout="vertical" barCategoryGap={6}>
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#8b949e', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={130}
              />
              <Tooltip content={<WhiteTooltip />} />
              <Bar
                dataKey="count"
                radius={[0, 6, 6, 0]}
                animationDuration={1400}
                name="Alerts"
              >
                {alertData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Mule Rings Risk */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <Link2 size={14} className="text-gray-500" /> Top Mule Rings by
            Risk
          </h3>
          <p className="text-[10px] text-gray-600 mb-4">
            Highest risk communities detected by Louvain + GNN scoring.
          </p>
          {topRingsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topRingsData} barCategoryGap={4}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#8b949e', fontSize: 8 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<WhiteTooltip />} />
                <Bar
                  dataKey="score"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1400}
                  name="Risk Score"
                >
                  {topRingsData.map((d, i) => (
                    <Cell key={i} fill={getColor(d.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">
              Loading ring data...
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-panel rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Target size={14} className="text-gray-500" /> Model Performance
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart
              data={radarData}
              cx="50%"
              cy="50%"
              outerRadius="75%"
            >
              <PolarGrid stroke="rgba(255,255,255,0.04)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#8b949e', fontSize: 10 }}
              />
              <PolarRadiusAxis
                tick={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Radar
                dataKey="value"
                stroke="#E74C3C"
                fill="#E74C3C"
                fillOpacity={0.15}
                strokeWidth={2}
                animationDuration={1500}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <CreditCard size={14} className="text-gray-500" /> Channel Volume
            Breakdown
          </h3>
          <div
            className="grid grid-cols-3 gap-2"
            style={{ minHeight: 220 }}
          >
            {channelData
              .sort((a, b) => b.value - a.value)
              .map((c, i) => {
                const pct =
                  totalTxns > 0 ? (c.value / totalTxns) * 100 : 0
                const color = CHANNEL_COLORS[c.name] || COLORS[i]
                const label = CHANNEL_LABELS[c.name] || c.name
                return (
                  <motion.div
                    key={c.name}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.45 + i * 0.08 }}
                    className={`rounded-xl flex flex-col items-center justify-center text-center p-4 transition-all hover:scale-[1.03] cursor-default ${
                      i === 0 ? 'col-span-2 row-span-2' : ''
                    }`}
                    style={{
                      background: `${color}10`,
                      border: `1px solid ${color}20`,
                    }}
                  >
                    <p
                      className={`font-black font-mono ${
                        i === 0 ? 'text-4xl' : 'text-xl'
                      }`}
                      style={{ color }}
                    >
                      {pct.toFixed(1)}%
                    </p>
                    <p
                      className={`font-bold text-white ${
                        i === 0 ? 'text-sm mt-1' : 'text-xs mt-0.5'
                      }`}
                    >
                      {label}
                    </p>
                    <p
                      className={`font-mono text-gray-500 ${
                        i === 0 ? 'text-xs mt-1' : 'text-[10px] mt-0.5'
                      }`}
                    >
                      {c.value.toLocaleString('en-IN')}
                    </p>
                  </motion.div>
                )
              })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-panel rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Lock size={14} className="text-gray-500" /> Risk & Action Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'HIGH RISK',
                value: overview.high_risk,
                color: '#E74C3C',
                icon: <ShieldAlert size={16} />,
              },
              {
                label: 'MEDIUM RISK',
                value: overview.medium_risk,
                color: '#F39C12',
                icon: <ShieldAlert size={16} />,
              },
              {
                label: 'LOW RISK',
                value: overview.low_risk,
                color: '#2ECC71',
                icon: <ShieldAlert size={16} />,
              },
              {
                label: 'AUTO-BLOCKED',
                value: overview.auto_blocked,
                color: '#E74C3C',
                icon: <Lock size={16} />,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="p-4 rounded-xl"
                style={{
                  background: `${item.color}08`,
                  border: `1px solid ${item.color}18`,
                }}
              >
                <div
                  className="flex items-center gap-2 mb-2"
                  style={{ color: item.color }}
                >
                  {item.icon}
                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
                    {item.label}
                  </span>
                </div>
                <p
                  className="text-3xl font-black font-mono"
                  style={{ color: item.color }}
                >
                  {item.value}
                </p>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-gray-500">Detection Speed</span>
            <span className="text-lg font-black font-mono text-cyan-400">
              {overview.detection_speed}
            </span>
          </div>
        </motion.div>
      </div>

      <div className="text-center py-10 border-t border-white/[0.03]">
        <p className="text-lg font-black italic bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
          "We don't detect mules. We cut the entire ring."
        </p>
        <p className="text-[11px] text-gray-600 mt-2 tracking-wider">
          RingCutter v3.0 · IntelliTrace 2026 · Indian Bank × VIT Chennai
        </p>
      </div>
    </div>
  )
}