import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, HelpCircle, User, X, ShieldAlert, AlertTriangle, Radio } from 'lucide-react'

interface Props {
  onStartTutorial: () => void
  alerts?: { pattern: string; account_id: string; severity: string; description: string }[]
}

export default function TopBar({ onStartTutorial, alerts = [] }: Props) {
  const [time, setTime] = useState(new Date())
  const [showNotif, setShowNotif] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const recentAlerts = alerts.slice(0, 8)
  const highCount = alerts.filter(a => a.severity === 'HIGH').length

  return (
    <>
      <header className="h-12 bg-[#090c14]/80 backdrop-blur-md border-b border-white/[0.04] flex items-center justify-between px-5 flex-shrink-0 relative z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Radio size={10} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Live</span>
          </div>
          <span className="text-[11px] text-gray-600 font-mono">
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[11px] text-gray-500 font-mono tabular-nums">
            {time.toLocaleTimeString('en-IN', { hour12: false })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStartTutorial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 text-xs font-medium transition-all border border-white/[0.04]"
          >
            <HelpCircle size={13} />
            <span>Guide</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Bell size={16} />
              {highCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/30">
                  {highCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-y-auto glass-panel rounded-2xl shadow-2xl shadow-black/40 z-50"
                >
                  <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className="text-red-400" />
                      <span className="text-sm font-semibold text-white">Threat Alerts</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 font-mono font-bold">{alerts.length}</span>
                    </div>
                    <button onClick={() => setShowNotif(false)} className="p-1 rounded-md hover:bg-white/5 text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {recentAlerts.length === 0 && (
                      <p className="text-center text-gray-600 text-sm py-8">No alerts yet</p>
                    )}
                    {recentAlerts.map((a, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          {a.severity === 'HIGH' ? (
                            <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{a.pattern}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                a.severity === 'HIGH' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                              }`}>{a.severity}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{a.account_id}</p>
                            <p className="text-[11px] text-gray-600 mt-0.5 truncate">{a.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-5 bg-white/[0.06] mx-1" />

          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/10">
              <User size={13} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] text-gray-400 font-medium leading-tight">Analyst</p>
              <p className="text-[9px] text-gray-600 font-mono">ADMIN</p>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}