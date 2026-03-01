import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, ArrowRight, Info, Smartphone, Monitor, Landmark, Wallet, CreditCard } from 'lucide-react'
import { api } from '../services/api'

const CHANNEL_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  UPI:         { color: '#ff4757', icon: <Smartphone size={16} strokeWidth={2} />,  label: 'UPI' },
  MOBILE_APP:  { color: '#3742fa', icon: <Smartphone size={16} strokeWidth={2} />,  label: 'Mobile App' },
  WEB_BANKING: { color: '#2ed573', icon: <Monitor size={16} strokeWidth={2} />,     label: 'Web Banking' },
  ATM:         { color: '#ffa502', icon: <Landmark size={16} strokeWidth={2} />,     label: 'ATM' },
  WALLET:      { color: '#a855f7', icon: <Wallet size={16} strokeWidth={2} />,       label: 'Wallet' },
}

export default function ChannelFlow() {
  const [sankey, setSankey] = useState<{
    labels: string[]; sources: number[]; targets: number[]; values: number[]
  } | null>(null)

  useEffect(() => {
    api.getSankey().then(r => setSankey(r.data))
  }, [])

  if (!sankey) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const maxVal = Math.max(...(sankey.values.length ? sankey.values : [1]))
  const totalFlows = sankey.values.reduce((a, b) => a + b, 0)

  const flowSummary = sankey.sources.map((si, i) => ({
    from: sankey.labels[si],
    to: sankey.labels[sankey.targets[i]],
    value: sankey.values[i],
    fromMeta: CHANNEL_META[sankey.labels[si]] || { color: '#666', icon: <CreditCard size={16} />, label: sankey.labels[si] },
    toMeta: CHANNEL_META[sankey.labels[sankey.targets[i]]] || { color: '#666', icon: <CreditCard size={16} />, label: sankey.labels[sankey.targets[i]] },
  })).sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <GitBranch size={14} className="text-white" />
          </span>
          Cross-Channel Money Flow
        </h2>
        <span className="text-xs text-gray-600 font-mono">{totalFlows} transitions tracked</span>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-5 gap-3">
        {sankey.labels.map((label, i) => {
          const meta = CHANNEL_META[label] || { color: '#666', icon: <CreditCard size={16} />, label }
          const outgoing = sankey.sources.reduce((sum, si, idx) => si === i ? sum + sankey.values[idx] : sum, 0)
          const incoming = sankey.targets.reduce((sum, ti, idx) => ti === i ? sum + sankey.values[idx] : sum, 0)
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-xl p-4 text-center group hover:scale-[1.02] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2.5"
                style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}25` }}>
                <span style={{ color: meta.color }}>{meta.icon}</span>
              </div>
              <p className="text-xs font-bold text-white">{meta.label}</p>
              <div className="flex justify-center gap-4 mt-2.5 text-[10px]">
                <div className="text-center">
                  <p className="text-emerald-400 font-mono font-bold">{incoming}</p>
                  <p className="text-gray-600 text-[8px] uppercase tracking-wider">In</p>
                </div>
                <div className="w-px bg-white/[0.06]" />
                <div className="text-center">
                  <p className="text-red-400 font-mono font-bold">{outgoing}</p>
                  <p className="text-gray-600 text-[8px] uppercase tracking-wider">Out</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Flow visualization */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl p-6"
      >
        <h3 className="text-sm font-semibold text-gray-300 mb-6 flex items-center gap-2">
          <GitBranch size={13} className="text-gray-500" /> Channel Transition Flows
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/15 font-bold">MULE PATTERNS</span>
        </h3>

        {flowSummary.length > 0 ? (
          <div className="space-y-3.5">
            {flowSummary.map((flow, i) => {
              const w = (flow.value / maxVal) * 100
              const pct = totalFlows > 0 ? ((flow.value / totalFlows) * 100).toFixed(1) : '0'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                  className="flex items-center gap-3 group"
                >
                  {/* From channel */}
                  <div className="w-36 flex items-center gap-2 justify-end flex-shrink-0">
                    <span className="text-xs font-semibold truncate" style={{ color: flow.fromMeta.color }}>
                      {flow.fromMeta.label}
                    </span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${flow.fromMeta.color}15` }}>
                      <span style={{ color: flow.fromMeta.color }}>{flow.fromMeta.icon}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight size={11} className="text-gray-700 flex-shrink-0" />

                  {/* Progress bar */}
                  <div className="flex-1 relative h-10 rounded-xl bg-white/[0.015] overflow-hidden border border-white/[0.03] group-hover:border-white/[0.07] transition-all">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${w}%` }}
                      transition={{ delay: 0.4 + i * 0.06, duration: 0.9, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 rounded-xl"
                      style={{
                        background: `linear-gradient(90deg, ${flow.fromMeta.color}30, ${flow.fromMeta.color}50, ${flow.toMeta.color}40)`
                      }}
                    />
                    {/* Animated particle */}
                    <motion.div
                      className="absolute inset-y-0 w-12 rounded-xl"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${flow.fromMeta.color}20, transparent)`
                      }}
                      animate={{ left: ['-10%', '110%'] }}
                      transition={{ duration: 2.5 + Math.random() * 1.5, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2">
                      <span className="text-sm font-black font-mono text-white/90 drop-shadow-lg">{flow.value}</span>
                      <span className="text-[9px] text-white/40 font-mono">({pct}%)</span>
                    </div>
                  </div>

                  {/* To channel */}
                  <div className="w-36 flex items-center gap-2 flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${flow.toMeta.color}15` }}>
                      <span style={{ color: flow.toMeta.color }}>{flow.toMeta.icon}</span>
                    </div>
                    <span className="text-xs font-semibold truncate" style={{ color: flow.toMeta.color }}>
                      {flow.toMeta.label}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-12">No channel flow data available</p>
        )}
      </motion.div>

      {/* Insight */}
      <div className="glass-panel rounded-xl p-4 border-l-[3px] border-l-blue-500">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-white font-semibold mb-1">Cross-Channel Layering Pattern</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Thick bars indicate frequently used channel transitions by mule rings. The classic layering sequence is
              <span className="font-mono text-red-400"> UPI</span>
              <span className="text-gray-600"> → </span>
              <span className="font-mono text-blue-400">Mobile App</span>
              <span className="text-gray-600"> → </span>
              <span className="font-mono text-purple-400">Wallet</span>
              <span className="text-gray-600"> → </span>
              <span className="font-mono text-amber-400">ATM</span>
              <span className="text-gray-500"> — money enters digitally and exits as cash within minutes. No single-channel system catches this.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}