import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Cpu, Database, Globe, Code, Monitor, BarChart3, Shield, CheckCircle } from 'lucide-react'
import { api, Overview } from '../services/api'

export default function SystemPage() {
  const [data, setData] = useState<Overview | null>(null)
  useEffect(() => { api.getOverview().then(r => setData(r.data)) }, [])
  if (!data) return null

  const techStack = [
    { icon: <Cpu size={14} />,      label: 'AI Engine',       tech: 'PyTorch Geometric (GraphSAGE GNN)', status: 'active' },
    { icon: <Globe size={14} />,     label: 'Graph Analysis',  tech: 'NetworkX 3.2 + Louvain Community Detection', status: 'active' },
    { icon: <Shield size={14} />,    label: 'Pattern Engine',  tech: 'Custom Velocity & Behavioral Detector', status: 'active' },
    { icon: <Monitor size={14} />,   label: 'Frontend',        tech: 'React 18 + TypeScript + Tailwind CSS', status: 'active' },
    { icon: <Code size={14} />,      label: 'Backend API',     tech: 'FastAPI (Python) + REST', status: 'active' },
    { icon: <BarChart3 size={14} />, label: 'Visualization',   tech: 'Recharts + Custom SVG + Framer Motion', status: 'active' },
    { icon: <Database size={14} />,  label: 'Data Pipeline',   tech: 'Pandas + NumPy + Scikit-learn', status: 'active' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
            <Settings size={14} className="text-white" />
          </span>
          System Overview
        </h2>
      </div>

      {/* Model Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'F1 Score', v: data.f1_score.toFixed(4), c: 'text-emerald-400', icon: <CheckCircle size={16} className="text-emerald-400" /> },
          { l: 'Precision', v: data.precision.toFixed(4), c: 'text-emerald-400', icon: <Shield size={16} className="text-emerald-400" /> },
          { l: 'Recall', v: data.recall.toFixed(4), c: 'text-cyan-400', icon: <Cpu size={16} className="text-cyan-400" /> },
          { l: 'Model', v: data.model, c: 'text-purple-400', icon: <Database size={16} className="text-purple-400" /> },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="glass-panel rounded-xl p-5 text-center"
          >
            <div className="flex justify-center mb-3">{m.icon}</div>
            <p className={`text-2xl font-black font-mono ${m.c}`}>{m.v}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-2 font-bold">{m.l}</p>
          </motion.div>
        ))}
      </div>

      {/* Tech Stack */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center gap-2">
          <Code size={13} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-300">Technology Stack</h3>
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold">ALL OPEN SOURCE</span>
        </div>
        {techStack.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.04 }}
            className="flex items-center px-5 py-3.5 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
          >
            <span className="text-gray-600 mr-3">{t.icon}</span>
            <span className="w-32 text-sm text-gray-400 font-medium">{t.label}</span>
            <span className="flex-1 text-sm text-gray-300 font-mono">{t.tech}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Dataset Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { l: 'Accounts Monitored', v: data.total_accounts.toLocaleString('en-IN'), c: 'text-blue-400' },
          { l: 'Transactions Analyzed', v: data.total_transactions.toLocaleString('en-IN'), c: 'text-cyan-400' },
          { l: 'Mules Detected', v: data.mule_accounts.toString(), c: 'text-red-400' },
          { l: 'Fraud Transactions', v: data.fraud_transactions.toLocaleString('en-IN'), c: 'text-red-400' },
          { l: 'Rings Identified', v: data.mule_rings.toString(), c: 'text-amber-400' },
          { l: 'Alerts Generated', v: data.total_alerts.toString(), c: 'text-purple-400' },
        ].map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="glass-panel rounded-xl p-4 text-center"
          >
            <p className={`text-xl font-bold font-mono ${d.c}`}>{d.v}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1.5 font-bold">{d.l}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}