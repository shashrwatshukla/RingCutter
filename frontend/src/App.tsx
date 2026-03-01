import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import TutorialOverlay from './components/TutorialOverlay'
import CommandCenter from './pages/CommandCenter'
import NetworkGraph from './pages/NetworkGraph'
import ThreatFeed from './pages/ThreatFeed'
import RingAnalysis from './pages/RingAnalysis'
import ChannelFlow from './pages/ChannelFlow'
import AccountIntel from './pages/AccountIntel'
import AccountLookup from './pages/AccountLookup'
import WatchlistPage from './pages/WatchlistPage'
import Compliance from './pages/Compliance'
import SystemPage from './pages/SystemPage'
import { api, Alert } from './services/api'

const pages: Record<string, React.FC> = {
  command: CommandCenter,
  graph: NetworkGraph,
  threats: ThreatFeed,
  rings: RingAnalysis,
  flow: ChannelFlow,
  account: AccountIntel,
  lookup: AccountLookup,
  watchlist: WatchlistPage,
  compliance: Compliance,
  system: SystemPage,
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('command')
  const [collapsed, setCollapsed] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [topAlerts, setTopAlerts] = useState<Alert[]>([])

  useEffect(() => {
    api
      .getAlerts({ limit: 20 })
      .then((r) => setTopAlerts(r.data.data || []))
      .catch(() => {})
  }, [])

  const PageComponent = pages[currentPage] || CommandCenter

  return (
    <div className="flex h-screen bg-[#06090f] overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          onStartTutorial={() => setShowTutorial(true)}
          alerts={topAlerts}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <PageComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <AnimatePresence>
        {showTutorial && (
          <TutorialOverlay
            onClose={() => setShowTutorial(false)}
            onNavigate={setCurrentPage}
          />
        )}
      </AnimatePresence>
    </div>
  )
}