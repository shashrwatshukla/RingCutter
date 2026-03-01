// FILE: src/pages/NetworkGraph.tsx

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Maximize2, Minimize2, Layers, Target, RotateCcw, Move } from 'lucide-react'
import { api, GraphNode, GraphEdge } from '../services/api'

// ============================================================
// TYPES
// ============================================================
interface PositionedNode {
  id: string
  x: number
  y: number
  is_mule: boolean
  ring_id: number
  city: string
  r: number
}

interface RingGroup {
  ringId: number
  members: GraphNode[]
}

// ============================================================
// COLORS
// ============================================================
const COLORS = {
  bg: '#060a13',
  mule: '#e11d48',
  muleBorder: '#fecdd3',
  muleGlow: 'rgba(225,29,72,0.15)',
  muleLabel: 'rgba(253,164,175,0.85)',
  normal: '#3b82f6',
  normalBright: '#60a5fa',
  normalGlow: 'rgba(59,130,246,0.18)',
  normalLabel: 'rgba(147,197,253,0.8)',
  fraudEdge: '#f43f5e',
  normalEdge: '#1e3a5f',
  gridLine: 'rgba(255,255,255,0.015)',
  clusterBg: 'rgba(225,29,72,0.03)',
  clusterBorder: 'rgba(254,205,211,0.25)',
}

// ============================================================
// HASH
// ============================================================
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// ============================================================
// LAYOUT
// ============================================================
function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  rings: RingGroup[],
  width: number,
  height: number
): PositionedNode[] {
  const positions: PositionedNode[] = []
  const cx = width / 2
  const cy = height / 2
  const placedIds = new Set<string>()

  // ── Place ring clusters ──
  const clusterR = Math.min(width, height) * 0.25
  const ringPositions: { cx: number; cy: number; r: number }[] = []

  rings.forEach((ring, ri) => {
    const clusterAngle = (2 * Math.PI * ri) / Math.max(rings.length, 1) - Math.PI / 2
    const ccx = cx + Math.cos(clusterAngle) * clusterR
    const ccy = cy + Math.sin(clusterAngle) * clusterR
    const polyR = Math.max(30, 15 + ring.members.length * 12)
    ringPositions.push({ cx: ccx, cy: ccy, r: polyR + 35 })

    ring.members.forEach((n, mi) => {
      const a = (2 * Math.PI * mi) / ring.members.length - Math.PI / 2
      positions.push({
        id: n.id,
        x: ccx + Math.cos(a) * polyR,
        y: ccy + Math.sin(a) * polyR,
        is_mule: true,
        ring_id: n.ring_id ?? -1,
        city: n.city,
        r: 8,
      })
      placedIds.add(n.id)
    })
  })

  // ── Place remaining nodes ──
  const remaining = nodes.filter(n => !placedIds.has(n.id))

  if (remaining.length > 0) {
    const margin = 70
    const usableW = width - margin * 2
    const usableH = height - margin * 2
    const aspect = usableW / usableH
    const cols = Math.max(1, Math.ceil(Math.sqrt(remaining.length * aspect)))
    const rows = Math.max(1, Math.ceil(remaining.length / cols))
    const cellW = usableW / cols
    const cellH = usableH / rows

    remaining.forEach((n, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const h = hashStr(n.id)
      const jx = (h % 100) / 100
      const jy = ((h >> 8) % 100) / 100

      let px = margin + col * cellW + jx * cellW * 0.6 + cellW * 0.2
      let py = margin + row * cellH + jy * cellH * 0.6 + cellH * 0.2

      // Push away from ring clusters
      ringPositions.forEach(rp => {
        const dx = px - rp.cx
        const dy = py - rp.cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < rp.r + 25) {
          const push = (rp.r + 25 - dist + 20) / Math.max(dist, 1)
          px += dx * push
          py += dy * push
        }
      })

      px = Math.max(margin, Math.min(width - margin, px))
      py = Math.max(margin, Math.min(height - margin, py))

      positions.push({
        id: n.id,
        x: px,
        y: py,
        is_mule: n.is_mule,
        ring_id: n.ring_id ?? -1,
        city: n.city,
        r: n.is_mule ? 6 : 5,
      })
    })
  }

  return positions
}

// Single ring layout
function computeRingLayout(
  ringNodes: GraphNode[],
  neighborNodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): PositionedNode[] {
  const positions: PositionedNode[] = []
  const cx = width / 2
  const cy = height / 2

  // Ring members in center circle
  const ringR = Math.max(80, 50 + ringNodes.length * 20)
  ringNodes.forEach((n, i) => {
    const a = (2 * Math.PI * i) / ringNodes.length - Math.PI / 2
    positions.push({
      id: n.id,
      x: cx + Math.cos(a) * ringR,
      y: cy + Math.sin(a) * ringR,
      is_mule: true,
      ring_id: n.ring_id ?? -1,
      city: n.city,
      r: 12,
    })
  })

  // Neighbor nodes in outer orbit
  if (neighborNodes.length > 0) {
    const outerR = ringR + 140
    neighborNodes.forEach((n, i) => {
      const a = (2 * Math.PI * i) / neighborNodes.length + 0.2
      const jitter = (hashStr(n.id) % 30) - 15
      positions.push({
        id: n.id,
        x: cx + Math.cos(a) * (outerR + jitter),
        y: cy + Math.sin(a) * (outerR + jitter),
        is_mule: n.is_mule,
        ring_id: n.ring_id ?? -1,
        city: n.city,
        r: n.is_mule ? 7 : 6,
      })
    })
  }

  return positions
}

// Grid
function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = COLORS.gridLine
  ctx.lineWidth = 0.5
  const step = 50
  for (let x = 0; x < w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
}

// ============================================================
// COMPONENT
// ============================================================
export default function NetworkGraph() {
  const [allNodes, setAllNodes] = useState<GraphNode[]>([])
  const [allEdges, setAllEdges] = useState<GraphEdge[]>([])
  const [maxNodes, setMaxNodes] = useState(200)
  const [selectedRing, setSelectedRing] = useState<number | null>(null)
  const [hoveredNode, setHoveredNode] = useState<PositionedNode | null>(null)
  const [hoveredConnections, setHoveredConnections] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoomDisplay, setZoomDisplay] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const W = 1400
  const H = 900

  // ── Fetch ──
  useEffect(() => {
    setLoading(true)
    api.getGraph(maxNodes).then(r => {
      console.log('Graph API response:', r.data)
      console.log('Total nodes:', r.data.nodes.length)
      console.log('Mule nodes:', r.data.nodes.filter((n: GraphNode) => n.is_mule).length)
      console.log('Normal nodes:', r.data.nodes.filter((n: GraphNode) => !n.is_mule).length)
      console.log('Sample nodes:', r.data.nodes.slice(0, 5))
      setAllNodes(r.data.nodes)
      setAllEdges(r.data.edges)
      setLoading(false)
    }).catch(err => {
      console.error('Graph fetch error:', err)
      setLoading(false)
    })
  }, [maxNodes])

  // ── Rings ──
  const rings = useMemo<RingGroup[]>(() => {
    const m: Record<number, GraphNode[]> = {}
    allNodes.forEach(n => {
      const rid = n.ring_id
      if (n.is_mule && rid != null && rid >= 0) {
        if (!m[rid]) m[rid] = []
        m[rid].push(n)
      }
    })
    return Object.entries(m)
      .map(([rid, members]) => ({ ringId: Number(rid), members }))
      .sort((a, b) => b.members.length - a.members.length)
  }, [allNodes])

  // ── FILTERED nodes & edges based on selected ring ──
  const { filteredNodes, filteredEdges } = useMemo(() => {
    if (selectedRing === null) {
      return { filteredNodes: allNodes, filteredEdges: allEdges }
    }

    // Get ring members
    const ringMembers = allNodes.filter(
      n => n.is_mule && n.ring_id != null && n.ring_id === selectedRing
    )
    const memberIds = new Set(ringMembers.map(n => n.id))

    // Find edges connected to ring members
    const ringEdges = allEdges.filter(
      e => memberIds.has(e.source) || memberIds.has(e.target)
    )

    // Find neighbor node IDs from those edges
    const neighborIds = new Set<string>()
    ringEdges.forEach(e => {
      if (!memberIds.has(e.source)) neighborIds.add(e.source)
      if (!memberIds.has(e.target)) neighborIds.add(e.target)
    })

    // Get neighbor nodes
    const neighborNodes = allNodes.filter(n => neighborIds.has(n.id))

    // Only these nodes and edges
    const nodes = [...ringMembers, ...neighborNodes]
    return { filteredNodes: nodes, filteredEdges: ringEdges }
  }, [allNodes, allEdges, selectedRing])

  const muleCount = useMemo(() => allNodes.filter(n => n.is_mule).length, [allNodes])
  const normalCount = useMemo(() => allNodes.filter(n => !n.is_mule).length, [allNodes])
  const filteredMuleCount = useMemo(() => filteredNodes.filter(n => n.is_mule).length, [filteredNodes])
  const filteredNormalCount = useMemo(() => filteredNodes.filter(n => !n.is_mule).length, [filteredNodes])

  // ── Layout ──
  const positioned = useMemo(() => {
    if (selectedRing !== null) {
      const ringMembers = filteredNodes.filter(
        n => n.is_mule && n.ring_id != null && n.ring_id === selectedRing
      )
      const memberIds = new Set(ringMembers.map(n => n.id))
      const neighbors = filteredNodes.filter(n => !memberIds.has(n.id))
      return computeRingLayout(ringMembers, neighbors, filteredEdges, W, H)
    }
    return computeLayout(filteredNodes, filteredEdges, rings, W, H)
  }, [filteredNodes, filteredEdges, rings, selectedRing])

  const posMap = useMemo(() => {
    const m = new Map<string, PositionedNode>()
    positioned.forEach(p => m.set(p.id, p))
    return m
  }, [positioned])

  const visibleEdges = useMemo(
    () => filteredEdges.filter(e => posMap.has(e.source) && posMap.has(e.target)),
    [filteredEdges, posMap]
  )

  const fraudEdges = useMemo(
    () => visibleEdges.filter(e => e.is_fraud),
    [visibleEdges]
  )

  const connectedMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    visibleEdges.forEach(e => {
      if (!m.has(e.source)) m.set(e.source, new Set())
      if (!m.has(e.target)) m.set(e.target, new Set())
      m.get(e.source)!.add(e.target)
      m.get(e.target)!.add(e.source)
    })
    return m
  }, [visibleEdges])

  // Reset view when ring changes
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setZoomDisplay(100)
    setHoveredNode(null)
  }, [selectedRing])

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ============================================================
  // CANVAS DRAW
  // ============================================================
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    let running = true
    const hovId = hoveredNode?.id ?? null
    const connSet = hovId ? connectedMap.get(hovId) ?? new Set<string>() : null

    function draw() {
      if (!running || !ctx) return
      const now = Date.now()

      // Clear
      ctx.fillStyle = COLORS.bg
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      drawGrid(ctx, W, H)

      // ── Ring cluster backgrounds (all-rings mode) ──
      if (selectedRing === null) {
        rings.forEach(ring => {
          const members = ring.members
            .map(m => posMap.get(m.id))
            .filter((p): p is PositionedNode => p !== undefined)
          if (members.length < 2) return

          const avgX = members.reduce((s, p) => s + p.x, 0) / members.length
          const avgY = members.reduce((s, p) => s + p.y, 0) / members.length
          const maxD = Math.max(...members.map(p =>
            Math.sqrt((p.x - avgX) ** 2 + (p.y - avgY) ** 2)
          )) + 35

          ctx.beginPath()
          ctx.arc(avgX, avgY, maxD, 0, Math.PI * 2)
          ctx.fillStyle = COLORS.clusterBg
          ctx.fill()
          ctx.setLineDash([4, 6])
          ctx.strokeStyle = COLORS.clusterBorder
          ctx.lineWidth = 0.8
          ctx.stroke()
          ctx.setLineDash([])

          ctx.font = '700 9px "JetBrains Mono", monospace'
          ctx.fillStyle = 'rgba(225,29,72,0.45)'
          ctx.textAlign = 'center'
          ctx.fillText(`RING #${ring.ringId}`, avgX, avgY - maxD - 8)
          ctx.font = '400 7px "JetBrains Mono", monospace'
          ctx.fillStyle = 'rgba(225,29,72,0.25)'
          ctx.fillText(`${ring.members.length} members`, avgX, avgY - maxD + 3)
        })
      } else {
        // Focused ring background
        const ringNodes = positioned.filter(n => n.ring_id === selectedRing && n.is_mule)
        if (ringNodes.length > 1) {
          const avgX = ringNodes.reduce((s, p) => s + p.x, 0) / ringNodes.length
          const avgY = ringNodes.reduce((s, p) => s + p.y, 0) / ringNodes.length
          const maxD = Math.max(...ringNodes.map(p =>
            Math.sqrt((p.x - avgX) ** 2 + (p.y - avgY) ** 2)
          )) + 40

          ctx.beginPath()
          ctx.arc(avgX, avgY, maxD, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(225,29,72,0.04)'
          ctx.fill()
          ctx.setLineDash([5, 7])
          ctx.strokeStyle = 'rgba(225,29,72,0.3)'
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.font = '800 16px "JetBrains Mono", monospace'
        ctx.fillStyle = 'rgba(225,29,72,0.3)'
        ctx.textAlign = 'center'
        ctx.fillText(`RING #${selectedRing} — FOCUSED VIEW`, W / 2, 30)

        // Subtitle
        ctx.font = '400 10px "JetBrains Mono", monospace'
        ctx.fillStyle = 'rgba(225,29,72,0.15)'
        ctx.fillText(
          `${filteredMuleCount} mule nodes · ${filteredNormalCount} connected accounts`,
          W / 2, 48
        )
      }

      // ── Normal edges ──
      visibleEdges.forEach(e => {
        if (e.is_fraud) return
        const s = posMap.get(e.source)
        const t = posMap.get(e.target)
        if (!s || !t) return

        const isHL = hovId !== null && (e.source === hovId || e.target === hovId)
        const isDim = hovId !== null && !isHL

        ctx.globalAlpha = isDim ? 0.02 : isHL ? 0.8 : 0.15
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = isHL ? '#60a5fa' : COLORS.normalEdge
        ctx.lineWidth = isHL ? 2 : 0.5
        ctx.stroke()
        ctx.globalAlpha = 1
      })

      // ── Fraud edges ──
      visibleEdges.forEach(e => {
        if (!e.is_fraud) return
        const s = posMap.get(e.source)
        const t = posMap.get(e.target)
        if (!s || !t) return

        const isHL = hovId !== null && (e.source === hovId || e.target === hovId)
        const isDim = hovId !== null && !isHL

        ctx.globalAlpha = isDim ? 0.04 : isHL ? 1 : 0.5
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = COLORS.fraudEdge
        ctx.lineWidth = isHL ? 3 : 1.2
        ctx.stroke()

        if (isHL) {
          ctx.globalAlpha = 0.12
          ctx.lineWidth = 7
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      })

      // ── Particles on fraud edges ──
      fraudEdges.forEach((e, i) => {
        const s = posMap.get(e.source)
        const t = posMap.get(e.target)
        if (!s || !t) return

        const offset = ((hashStr(e.source + e.target) + i * 131) % 1000) / 1000
        const progress = ((now / 5000 + offset) % 1)
        const px = s.x + (t.x - s.x) * progress
        const py = s.y + (t.y - s.y) * progress
        const alpha = 0.3 + Math.sin(progress * Math.PI) * 0.7

        ctx.beginPath()
        ctx.arc(px, py, 6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(244,63,94,${alpha * 0.12})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(244,63,94,${alpha})`
        ctx.fill()

        ctx.font = '600 5px "JetBrains Mono", monospace'
        ctx.fillStyle = `rgba(253,164,175,${alpha * 0.7})`
        ctx.textAlign = 'center'
        ctx.fillText(e.source, px, py - 8)
      })

      // ── NORMAL (blue) NODES ──
      positioned.forEach(n => {
        if (n.is_mule) return

        const isHov = hovId === n.id
        const isConn = connSet?.has(n.id) ?? false
        const isDim = hovId !== null && !isHov && !isConn
        const nodeR = isHov ? n.r * 2.5 : isConn ? n.r * 1.6 : n.r

        // Outer glow — always visible
        if (!isDim) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, nodeR + 4, 0, Math.PI * 2)
          ctx.fillStyle = isHov
            ? 'rgba(96,165,250,0.3)'
            : isConn
            ? 'rgba(96,165,250,0.2)'
            : COLORS.normalGlow
          ctx.fill()
        }

        ctx.globalAlpha = isDim ? 0.06 : isHov ? 1 : isConn ? 0.95 : 0.8

        // Main circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR, 0, Math.PI * 2)

        if (isHov) {
          const grad = ctx.createRadialGradient(
            n.x - nodeR * 0.3, n.y - nodeR * 0.3, 0,
            n.x, n.y, nodeR
          )
          grad.addColorStop(0, '#93c5fd')
          grad.addColorStop(1, COLORS.normal)
          ctx.fillStyle = grad
        } else {
          ctx.fillStyle = COLORS.normal
        }
        ctx.fill()

        // Border
        ctx.strokeStyle = isHov ? '#bfdbfe' : isConn ? '#60a5fa' : 'rgba(59,130,246,0.4)'
        ctx.lineWidth = isHov ? 2.5 : isConn ? 1.5 : 0.8
        ctx.stroke()

        // Label
        if (isHov || isConn) {
          ctx.font = `${isHov ? 700 : 500} ${isHov ? 9 : 7}px "JetBrains Mono", monospace`
          ctx.fillStyle = isHov ? '#bfdbfe' : COLORS.normalLabel
          ctx.textAlign = 'center'
          ctx.globalAlpha = isHov ? 1 : 0.8
          ctx.fillText(n.id, n.x, n.y + nodeR + (isHov ? 14 : 11))
          if (isHov) {
            ctx.font = '400 6px "JetBrains Mono", monospace'
            ctx.fillStyle = 'rgba(148,163,184,0.6)'
            ctx.fillText(n.city, n.x, n.y + nodeR + 24)
          }
        }

        ctx.globalAlpha = 1
      })

      // ── MULE (red) NODES ──
      positioned.forEach(n => {
        if (!n.is_mule) return

        const isHov = hovId === n.id
        const isConn = connSet?.has(n.id) ?? false
        const isDim = hovId !== null && !isHov && !isConn
        const nodeR = isHov ? n.r * 2 : n.r

        // Pulse
        const pulsePhase = (now % 2500) / 2500
        const pulseR = nodeR + 5 + pulsePhase * 14
        const pulseAlpha = (1 - pulsePhase) * 0.35
        if (!isDim) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(225,29,72,${pulseAlpha})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        ctx.globalAlpha = isDim ? 0.05 : 1

        // Outer glow
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR + 6, 0, Math.PI * 2)
        ctx.fillStyle = isDim ? 'rgba(225,29,72,0.01)' : isHov ? 'rgba(225,29,72,0.35)' : COLORS.muleGlow
        ctx.fill()

        // Main circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR, 0, Math.PI * 2)
        const grad = ctx.createRadialGradient(
          n.x - nodeR * 0.3, n.y - nodeR * 0.3, 0,
          n.x, n.y, nodeR
        )
        grad.addColorStop(0, '#fb7185')
        grad.addColorStop(1, COLORS.mule)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.strokeStyle = isHov ? '#fff' : COLORS.muleBorder
        ctx.lineWidth = isHov ? 2.5 : 1.5
        ctx.stroke()

        // Warning icon
        if (isHov) {
          ctx.font = 'bold 8px sans-serif'
          ctx.fillStyle = '#fff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('!', n.x, n.y + 0.5)
          ctx.textBaseline = 'alphabetic'
        }

        // Label
        ctx.font = `${isHov ? 800 : 600} ${isHov ? 10 : 7}px "JetBrains Mono", monospace`
        ctx.fillStyle = isDim ? 'rgba(253,164,175,0.05)' : isHov ? '#fda4af' : COLORS.muleLabel
        ctx.textAlign = 'center'
        ctx.fillText(n.id, n.x, n.y + nodeR + (isHov ? 16 : 13))

        if (isHov) {
          ctx.font = '400 7px "JetBrains Mono", monospace'
          ctx.fillStyle = 'rgba(253,164,175,0.5)'
          ctx.fillText(`Ring #${n.ring_id} · ${n.city}`, n.x, n.y + nodeR + 26)
        }

        ctx.globalAlpha = 1
      })

      ctx.restore()

      // Center crosshair
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(W / 2 - 8, H / 2); ctx.lineTo(W / 2 + 8, H / 2)
      ctx.moveTo(W / 2, H / 2 - 8); ctx.lineTo(W / 2, H / 2 + 8)
      ctx.stroke()

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => { running = false; cancelAnimationFrame(animFrameRef.current) }
  }, [positioned, visibleEdges, fraudEdges, posMap, connectedMap, hoveredNode, zoom, pan, rings, selectedRing, filteredMuleCount, filteredNormalCount])

  // ============================================================
  // MOUSE — no scroll zoom
  // ============================================================
  const getCanvasPos = useCallback(
    (e: React.MouseEvent): { cx: number; cy: number } => {
      const canvas = canvasRef.current
      if (!canvas) return { cx: 0, cy: 0 }
      const rect = canvas.getBoundingClientRect()
      return {
        cx: ((e.clientX - rect.left) * (W / rect.width) - pan.x) / zoom,
        cy: ((e.clientY - rect.top) * (H / rect.height) - pan.y) / zoom,
      }
    },
    [zoom, pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x
        const dy = e.clientY - panStartRef.current.y
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        setPan({
          x: panStartRef.current.panX + dx * (W / rect.width),
          y: panStartRef.current.panY + dy * (H / rect.height),
        })
        return
      }

      const { cx, cy } = getCanvasPos(e)
      let found: PositionedNode | null = null
      let bestDist = Infinity

      for (let i = positioned.length - 1; i >= 0; i--) {
        const n = positioned[i]
        const dx = cx - n.x, dy = cy - n.y
        const dist = dx * dx + dy * dy
        const hitR = n.is_mule ? 18 : 12
        if (dist < hitR * hitR && dist < bestDist) {
          bestDist = dist
          found = n
        }
      }

      if (found) {
        if (!hoveredNode || hoveredNode.id !== found.id) {
          setHoveredNode(found)
          setHoveredConnections(connectedMap.get(found.id)?.size ?? 0)
        }
      } else if (hoveredNode) {
        setHoveredNode(null)
      }
    },
    [positioned, hoveredNode, getCanvasPos, connectedMap]
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isPanningRef.current = true
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const handleMouseUp = useCallback(() => { isPanningRef.current = false }, [])

  const handleZoomIn = useCallback(() => {
    setZoom(z => { const n = Math.min(5, z * 1.3); setZoomDisplay(Math.round(n * 100)); return n })
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => { const n = Math.max(0.15, z * 0.75); setZoomDisplay(Math.round(n * 100)); return n })
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1); setPan({ x: 0, y: 0 }); setZoomDisplay(100)
  }, [])

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            <Layers size={18} className="text-gray-500" />
            Entity Network Graph
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag to pan · Use +/− buttons to zoom · Hover nodes to inspect
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-[11px] text-blue-400 font-mono">
            <span className="text-blue-300 font-bold">{normalCount}</span> normal
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-[11px] text-red-400 font-mono">
            <span className="text-red-300 font-bold">{muleCount}</span> mules
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-gray-400 font-mono">
            <span className="text-gray-300 font-bold">{allEdges.length}</span> edges
          </div>
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-1.5 text-[11px] text-red-400/80 font-mono">
            <span className="text-red-300 font-bold">{allEdges.filter(e => e.is_fraud).length}</span> fraud
          </div>
        </div>
      </div>

      {/* Ring tabs */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mr-1">Filter:</span>
        <button
          onClick={() => setSelectedRing(null)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
            selectedRing === null
              ? 'bg-white/10 border-gray-500 text-white'
              : 'bg-white/[0.02] border-white/[0.06] text-gray-600 hover:text-gray-400 hover:border-white/10'
          }`}
        >
          All ({allNodes.length})
        </button>
        {rings.slice(0, 14).map(ring => (
          <button
            key={ring.ringId}
            onClick={() => setSelectedRing(ring.ringId)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border flex items-center gap-1 ${
              selectedRing === ring.ringId
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-white/[0.02] border-white/[0.06] text-gray-600 hover:text-gray-400 hover:border-white/10'
            }`}
          >
            {selectedRing === ring.ringId && <Target size={10} className="text-red-400" />}
            Ring #{ring.ringId}
            <span className="text-[9px] opacity-60">({ring.members.length})</span>
          </button>
        ))}
      </div>

      {/* Node slider */}
      <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5">
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Max nodes:</span>
        <input
          type="range" min={50} max={400} value={maxNodes}
          onChange={e => setMaxNodes(Number(e.target.value))}
          className="flex-1 max-w-[200px] accent-red-500 h-1"
        />
        <span className="text-[11px] text-gray-400 font-mono font-bold w-8">{maxNodes}</span>
      </div>

      {/* Viewing info when ring selected */}
      <AnimatePresence>
        {selectedRing !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Target size={14} className="text-red-400" />
              <div>
                <p className="text-red-400 text-xs font-bold font-mono">
                  Viewing Ring #{selectedRing} only
                </p>
                <p className="text-red-400/50 text-[10px] mt-0.5">
                  Showing {filteredMuleCount} mule nodes + {filteredNormalCount} connected normal accounts · {visibleEdges.length} edges
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRing(null)}
              className="text-[10px] text-red-400/70 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg px-3 py-1.5 transition-all"
            >
              Show All
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden border border-gray-700/50"
        style={{ background: COLORS.bg }}
      >
        {/* Loading overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-[#060a13]/90 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full mx-auto mb-3"
                />
                <p className="text-gray-500 text-xs font-mono">Loading graph data...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute top-3 left-3 z-20 bg-[#0f1629]/90 backdrop-blur-md rounded-xl border border-gray-800/80 px-4 py-3 space-y-2 shadow-xl">
          <p className="text-[9px] text-gray-500 uppercase tracking-[2px] font-bold mb-1">Legend</p>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <span className="w-3 h-3 rounded-full bg-[#e11d48] shadow-[0_0_8px_rgba(225,29,72,0.6)] border border-[#fecdd3]/50" />
            Mule Account ({selectedRing !== null ? filteredMuleCount : muleCount})
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <span className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-[0_0_6px_rgba(59,130,246,0.4)] border border-[#93c5fd]/30" />
            Normal Account ({selectedRing !== null ? filteredNormalCount : normalCount})
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#f43f5e" strokeWidth="2" /></svg>
            Fraud edge ({fraudEdges.length})
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#1e3a5f" strokeWidth="1.5" /></svg>
            Normal edge
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <motion.span
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"
            />
            <span>Money flow</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="absolute top-3 right-3 z-20 bg-[#0f1629]/90 backdrop-blur-md rounded-xl border border-gray-800/80 flex items-center gap-0.5 p-1.5 shadow-xl">
          <button onClick={handleZoomIn} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors" title="Zoom In">
            <Plus size={16} />
          </button>
          <button onClick={handleZoomOut} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors" title="Zoom Out">
            <Minus size={16} />
          </button>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <button onClick={handleReset} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors" title="Reset View">
            <RotateCcw size={14} />
          </button>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <button onClick={toggleFullscreen} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* Zoom % */}
        <div className="absolute bottom-3 right-3 z-20 text-[10px] text-gray-500 font-mono bg-[#0f1629]/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-gray-800/80 flex items-center gap-2">
          <Move size={10} className="text-gray-600" />
          {zoomDisplay}%
        </div>

        {/* Canvas — NO onWheel */}
        <canvas
          ref={canvasRef}
          className="w-full cursor-grab active:cursor-grabbing"
          style={{ height: isFullscreen ? '100vh' : 700 }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setHoveredNode(null) }}
        />

        {/* Hover panel */}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-3 left-3 z-20 bg-[#0f1629]/95 backdrop-blur-md rounded-xl border border-gray-800/80 p-4 min-w-[250px] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-gray-500 uppercase tracking-[2px] font-bold">Node Details</p>
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${
                  hoveredNode.is_mule
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {hoveredNode.is_mule ? '⚠ MULE' : '● NORMAL'}
                </span>
              </div>

              <p className="text-sm font-bold font-mono text-gray-200 mb-3">{hoveredNode.id}</p>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-bold flex items-center gap-1 ${hoveredNode.is_mule ? 'text-red-400' : 'text-blue-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hoveredNode.is_mule ? 'bg-red-400' : 'bg-blue-400'}`} />
                    {hoveredNode.is_mule ? 'MULE ACCOUNT' : 'NORMAL ACCOUNT'}
                  </span>
                </div>
                {hoveredNode.ring_id >= 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ring</span>
                    <span className="text-red-400 font-mono font-bold">#{hoveredNode.ring_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">City</span>
                  <span className="text-gray-300">{hoveredNode.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Connections</span>
                  <span className="text-gray-300 font-mono font-bold">{hoveredConnections}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}