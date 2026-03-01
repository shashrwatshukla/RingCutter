import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  label: string
  value: number | string
  color: 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'cyan' | 'white'
  icon: React.ReactNode
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

const palette: Record<string, { text: string; border: string; bar: string; glow: string }> = {
  red:    { text: 'text-red-400',    border: 'border-red-500/15',    bar: 'from-red-500 to-rose-600',     glow: 'shadow-red-500/5' },
  green:  { text: 'text-emerald-400',border: 'border-emerald-500/15',bar: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/5' },
  blue:   { text: 'text-blue-400',   border: 'border-blue-500/15',   bar: 'from-blue-500 to-indigo-500',  glow: 'shadow-blue-500/5' },
  yellow: { text: 'text-amber-400',  border: 'border-amber-500/15',  bar: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/5' },
  purple: { text: 'text-purple-400', border: 'border-purple-500/15', bar: 'from-purple-500 to-violet-600', glow: 'shadow-purple-500/5' },
  cyan:   { text: 'text-cyan-400',   border: 'border-cyan-500/15',   bar: 'from-cyan-400 to-teal-500',    glow: 'shadow-cyan-500/5' },
  white:  { text: 'text-gray-200',   border: 'border-white/10',      bar: 'from-gray-400 to-gray-500',    glow: 'shadow-white/3' },
}

export default function MetricCard({ label, value, color, icon, subtitle, trend }: Props) {
  const [display, setDisplay] = useState(0)
  const mounted = useRef(false)
  const c = palette[color]
  const num = typeof value === 'number' ? value : 0

  useEffect(() => {
    if (typeof value !== 'number') return
    if (mounted.current) { setDisplay(num); return }
    mounted.current = true
    const dur = 1200
    const steps = 40
    const inc = num / steps
    let cur = 0
    const timer = setInterval(() => {
      cur += inc
      if (cur >= num) { setDisplay(num); clearInterval(timer) }
      else setDisplay(Math.floor(cur))
    }, dur / steps)
    return () => clearInterval(timer)
  }, [num, value])

  const shown = typeof value === 'string' ? value : display.toLocaleString('en-IN')

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden rounded-2xl glass-panel border ${c.border} p-5 shadow-lg ${c.glow} group`}
    >
      <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`${c.text} opacity-70`}>
            {icon}
          </div>
          {trend && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
              trend === 'up' ? 'bg-red-500/10 text-red-400' :
              trend === 'down' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-gray-500/10 text-gray-500'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
            </span>
          )}
        </div>
        <p className={`text-2xl font-black font-mono ${c.text} leading-none tracking-tight`}>
          {shown}
        </p>
        <p className="text-[10px] text-gray-500 uppercase tracking-[2px] font-semibold mt-2.5">
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.bar} opacity-60`} />
    </motion.div>
  )
}