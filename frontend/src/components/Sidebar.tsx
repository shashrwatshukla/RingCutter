import React from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Globe,
  ShieldAlert,
  Link2,
  GitBranch,
  Search,
  Landmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Eye,
  SearchCode,
} from 'lucide-react'

interface Props {
  currentPage: string
  onPageChange: (page: string) => void
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { id: 'command', icon: LayoutDashboard, label: 'Command Center' },
  { id: 'graph', icon: Globe, label: 'Network Graph' },
  { id: 'threats', icon: ShieldAlert, label: 'Threat Feed' },
  { id: 'rings', icon: Link2, label: 'Ring Analysis' },
  { id: 'flow', icon: GitBranch, label: 'Channel Flow' },
  { id: 'account', icon: Search, label: 'Account Intel' },
  { id: 'lookup', icon: SearchCode, label: 'Account Lookup' },
  { id: 'watchlist', icon: Eye, label: 'Watchlist' },
  { id: 'compliance', icon: Landmark, label: 'Compliance' },
  { id: 'system', icon: Settings, label: 'System' },
]

export default function Sidebar({
  currentPage,
  onPageChange,
  collapsed,
  onToggle,
}: Props) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-screen bg-[#090c14] border-r border-white/[0.04] flex flex-col flex-shrink-0 select-none overflow-hidden"
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3 border-b border-white/[0.03] flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h1 className="text-[16px] font-extrabold bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent leading-tight">
              RingCutter
            </h1>
            <p className="text-[8px] text-gray-600 tracking-[2.5px] uppercase font-medium">
              Intelligence v3
            </p>
          </motion.div>
        )}
      </div>

      {/* Section label */}
      {!collapsed && (
        <p className="px-5 pt-4 pb-1 text-[9px] text-gray-600 tracking-[3px] uppercase font-bold flex-shrink-0">
          Navigation
        </p>
      )}

      {/* Navigation — no scroll, fits in remaining space */}
      <nav className="flex-1 px-3 py-1 flex flex-col justify-between overflow-hidden">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = currentPage === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left relative
                  ${
                    active
                      ? 'bg-gradient-to-r from-red-500/10 to-transparent text-red-400'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                  }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-red-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.6}
                  className="flex-shrink-0"
                />
                {!collapsed && (
                  <span className="text-[14px] font-medium">
                    {item.label}
                  </span>
                )}
                {active && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Collapse button pinned to bottom */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center p-3 mx-3 mb-3 rounded-xl hover:bg-white/[0.03] text-gray-600 transition-colors flex-shrink-0"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </motion.aside>
  )
}