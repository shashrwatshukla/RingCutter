import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Rocket,
  BookOpen,
  Zap,
} from 'lucide-react'

interface Props {
  onClose: () => void
  onNavigate: (page: string) => void
}

const steps = [
  {
    page: 'command',
    title: 'Welcome to RingCutter',
    description:
      'RingCutter is a Cross-Channel Mule Ring Detection System built for Indian banks. It uses Graph Neural Networks to detect organized money laundering rings that operate across UPI, Mobile App, Web Banking, ATM, and Wallet channels simultaneously.',
    icon: <Zap size={28} className="text-red-400" />,
    terms: [
      {
        term: 'Mule Account',
        def: 'A bank account used by criminals to move stolen money.',
      },
      {
        term: 'Mule Ring',
        def: 'A group of mule accounts working together to launder funds.',
      },
    ],
  },
  {
    page: 'command',
    title: 'Command Center',
    description:
      'Your mission control. Top metric cards show system health. Charts include daily transaction volume, channel distribution, top mule rings by risk score, detection patterns, model performance radar, and risk summary with auto-block counts.',
    icon: <BookOpen size={28} className="text-blue-400" />,
    terms: [
      {
        term: 'F1 Score',
        def: 'A measure of model accuracy combining precision and recall.',
      },
      {
        term: 'Auto-Block',
        def: 'Account automatically blocked when risk exceeds 0.85.',
      },
    ],
  },
  {
    page: 'graph',
    title: 'Entity Network Graph',
    description:
      'The visual brain. Red dots = mule suspects in polygon structures. Blue dots = normal accounts. Hover for details, zoom with +/- buttons, select rings to focus.',
    icon: <BookOpen size={28} className="text-emerald-400" />,
    terms: [
      { term: 'Node', def: 'A single account in the graph.' },
      { term: 'Edge', def: 'A money transfer between two accounts.' },
      {
        term: 'GraphSAGE',
        def: 'GNN architecture that learns from neighbor aggregation.',
      },
    ],
  },
  {
    page: 'threats',
    title: 'Threat Intelligence Feed',
    description:
      'Every suspicious pattern triggers an alert. 5 detection patterns: Rapid Cross-Channel Hop, Fan-In, Fan-Out, Structuring, and Dormant Activation. Expand alerts for details and block accounts directly.',
    icon: <BookOpen size={28} className="text-amber-400" />,
    terms: [
      {
        term: 'Cross-Channel Hop',
        def: 'Money crosses 3+ channels within 30 minutes.',
      },
      {
        term: 'Structuring',
        def: 'Multiple transactions just below ₹50,000 to avoid reporting.',
      },
    ],
  },
  {
    page: 'rings',
    title: 'Mule Ring Analysis',
    description:
      'Detected criminal rings with polygon topology visualizations. The Ring Landscape chart compares all rings. Click any ring to see member account IDs.',
    icon: <BookOpen size={28} className="text-purple-400" />,
    terms: [
      {
        term: 'Ring Score',
        def: 'Composite score from GNN + graph density + behavioral signals.',
      },
      {
        term: 'Louvain Algorithm',
        def: 'Community detection algorithm for graph clustering.',
      },
    ],
  },
  {
    page: 'flow',
    title: 'Cross-Channel Money Flow',
    description:
      'Visualizes channel hopping patterns. Animated bars show frequent transitions. UPI → App → Wallet → ATM is the classic layering sequence.',
    icon: <BookOpen size={28} className="text-cyan-400" />,
    terms: [
      {
        term: 'Layering',
        def: 'Moving money through multiple channels to obscure its origin.',
      },
    ],
  },
  {
    page: 'account',
    title: 'Account Intelligence',
    description:
      'Select any account from the dropdown to see risk breakdown, transaction timeline, and channel usage. Block/unblock and generate STR reports.',
    icon: <BookOpen size={28} className="text-blue-400" />,
    terms: [
      {
        term: 'STR',
        def: 'Suspicious Transaction Report — mandatory filing to FIU-IND.',
      },
    ],
  },
  {
    page: 'lookup',
    title: 'Account Lookup',
    description:
      'Enter ANY account ID to get a complete investigation report. Shows profile info, transaction timeline, channel usage, risk scores, and full transaction log. Block accounts and generate STR directly.',
    icon: <BookOpen size={28} className="text-indigo-400" />,
    terms: [
      {
        term: 'Investigation',
        def: 'Examining all data about a suspicious account.',
      },
      {
        term: 'Device Fingerprint',
        def: 'Unique device identifier — shared devices = strong mule signal.',
      },
    ],
  },
  {
    page: 'watchlist',
    title: 'Account Watchlist',
    description:
      'Persistent monitoring watchlist. Add accounts with reason and risk level. Click any entry to expand and see full account details, transactions, and risk scores loaded from the database.',
    icon: <BookOpen size={28} className="text-amber-400" />,
    terms: [
      {
        term: 'Watchlist',
        def: 'Accounts under active analyst surveillance.',
      },
      {
        term: 'Early Warning',
        def: 'Signals indicating potential future fraud.',
      },
    ],
  },
  {
    page: 'compliance',
    title: 'RBI & NPCI Compliance',
    description:
      'Every RingCutter feature maps to RBI and NPCI regulations. Covers real-time monitoring, network-based detection, explainable AI, and suspicious transaction reporting.',
    icon: <BookOpen size={28} className="text-emerald-400" />,
    terms: [
      {
        term: 'CDD',
        def: 'Customer Due Diligence — KYC verification required by RBI.',
      },
      {
        term: 'EWS',
        def: 'Early Warning System — mandated by RBI for proactive fraud detection.',
      },
    ],
  },
]

export default function TutorialOverlay({ onClose, onNavigate }: Props) {
  const [step, setStep] = useState(0)
  const current = steps[step]

  useEffect(() => {
    onNavigate(current.page)
  }, [step])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center pb-6"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-2xl mx-4"
        >
          <div className="glass-panel rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            <div className="h-1 bg-white/[0.03]">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                animate={{
                  width: `${((step + 1) / steps.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all"
              >
                <X size={16} />
              </button>
              <div className="flex gap-1 mb-5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[3px] rounded-full transition-all duration-300 ${
                      i === step
                        ? 'w-8 bg-red-500'
                        : i < step
                          ? 'w-3 bg-red-500/30'
                          : 'w-3 bg-white/[0.06]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 mt-0.5">{current.icon}</div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {current.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {current.description}
                  </p>
                </div>
              </div>
              {current.terms && current.terms.length > 0 && (
                <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-4 mb-5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-[2px] font-bold mb-3">
                    Key Terms
                  </p>
                  <div className="space-y-2.5">
                    {current.terms.map((t, i) => (
                      <div key={i}>
                        <span className="text-xs font-bold text-white">
                          {t.term}
                        </span>
                        <span className="text-[11px] text-gray-500 ml-2">
                          — {t.def}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Skip tour
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 font-mono">
                    {step + 1}/{steps.length}
                  </span>
                  {step > 0 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-gray-400 text-xs font-medium transition-all"
                    >
                      <ChevronLeft size={12} /> Back
                    </button>
                  )}
                  <button
                    onClick={() =>
                      step < steps.length - 1
                        ? setStep(step + 1)
                        : onClose()
                    }
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/20"
                  >
                    {step === steps.length - 1 ? (
                      <>
                        <Rocket size={12} /> Launch
                      </>
                    ) : (
                      <>
                        Next <ChevronRight size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}