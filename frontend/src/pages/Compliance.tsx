import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Landmark, CheckCircle, ChevronDown, ChevronUp, Zap, Clock, Target, DollarSign } from 'lucide-react'
import { api, ComplianceItem } from '../services/api'

export default function Compliance() {
  const [items, setItems] = useState<ComplianceItem[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => { api.getCompliance().then(r => setItems(r.data.items)) }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Landmark size={14} className="text-white" />
          </span>
          RBI & NPCI Compliance
        </h2>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-semibold">{items.length}/{items.length} COMPLIANT</span>
        </div>
      </div>

      {/* Compliance items */}
      <div className="space-y-2">
        {items.map((item, i) => {
          const isExpanded = expanded === i
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-panel rounded-xl overflow-hidden cursor-pointer transition-all hover:border-emerald-500/15"
              onClick={() => setExpanded(isExpanded ? null : i)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{item.requirement}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">→ {item.feature}</p>
                </div>
                <span className="text-[9px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold flex-shrink-0">
                  COMPLIANT
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
              </div>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-white/[0.04] bg-white/[0.01]"
                >
                  <div className="p-4">
                    <p className="text-sm text-gray-400 leading-relaxed">{item.detail}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Clock size={16} />, l: 'Detection Speed', v: '< 8 sec', s: 'vs 24-48 hours traditional', c: 'cyan' },
          { icon: <Target size={16} />, l: 'Ring Detection', v: '80%+', s: 'vs 0% in rule-based systems', c: 'emerald' },
          { icon: <Zap size={16} />, l: 'False Positives', v: '< 15%', s: '60% reduction', c: 'amber' },
          { icon: <DollarSign size={16} />, l: 'Infrastructure Cost', v: '₹0', s: '100% open source', c: 'purple' },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="glass-panel rounded-xl p-5 text-center"
          >
            <div className={`text-${m.c}-400 flex justify-center mb-3`}>{m.icon}</div>
            <p className={`text-2xl font-black font-mono text-${m.c}-400`}>{m.v}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1 font-bold">{m.l}</p>
            <p className="text-[10px] text-emerald-500/60 mt-1">{m.s}</p>
          </motion.div>
        ))}
      </div>

      {/* Tagline */}
      <div className="text-center py-14 glass-panel rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-red-500/20">
          <Zap size={28} className="text-white" />
        </div>
        <p className="text-2xl font-black italic bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
          "We don't detect mules.<br />We cut the entire ring."
        </p>
        <p className="text-sm text-gray-600 mt-4">
          RingCutter — Indian Bank × VIT Chennai
        </p>
        <p className="text-xs text-gray-700 mt-1">IntelliTrace Hackathon 2026</p>
      </div>
    </div>
  )
}