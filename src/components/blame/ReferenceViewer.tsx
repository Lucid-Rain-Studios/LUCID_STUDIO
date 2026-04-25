import React, { useEffect, useRef, useState } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
} from 'd3-force'

export interface GraphNode extends SimulationNodeDatum {
  id: string
  label: string
  assetClass: string
  isTarget: boolean
  hopDistance: number
}

export interface GraphLink {
  sourceId: string
  targetId: string
  isHard: boolean
}

type SimLink = { source: GraphNode; target: GraphNode; isHard: boolean }

interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
  width: number
  height: number
  onNodeClick?: (nodeId: string) => void
}

const CLASS_COLORS: Record<string, string> = {
  StaticMesh:     '#4d9dff',
  SkeletalMesh:   '#a27ef0',
  Texture2D:      '#2ec573',
  TextureCube:    '#2ec573',
  Material:       '#f5a832',
  MaterialInstance: '#f5a832',
  SoundWave:      '#e84545',
  SoundCue:       '#e84545',
  Blueprint:      '#e8622f',
  AnimSequence:   '#4dd9c5',
  World:          '#4dd9c5',
  DataTable:      '#8b94b0',
}

function classColor(cls: string): string {
  for (const [key, color] of Object.entries(CLASS_COLORS)) {
    if (cls.includes(key)) return color
  }
  return '#4e5870'
}

type Positions = Map<string, { x: number; y: number }>

export function ReferenceViewer({ nodes, links, width, height, onNodeClick }: Props) {
  const [positions, setPositions] = useState<Positions>(new Map())
  const [resolvedLinks, setResolvedLinks] = useState<SimLink[]>([])
  const simRef   = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null)
  const nodesRef = useRef<GraphNode[]>([])
  const dragNode = useRef<string | null>(null)
  const svgRef   = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (simRef.current) simRef.current.stop()

    const simNodes: GraphNode[] = nodes.map(n => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 40,
      y: height / 2 + (Math.random() - 0.5) * 40,
    }))
    nodesRef.current = simNodes

    const idMap = new Map(simNodes.map(n => [n.id, n]))
    const simLinks: SimLink[] = links
      .filter(l => idMap.has(l.sourceId) && idMap.has(l.targetId))
      .map(l => ({ source: idMap.get(l.sourceId)!, target: idMap.get(l.targetId)!, isHard: l.isHard }))

    const sim = forceSimulation<GraphNode>(simNodes)
      .force('link', forceLink<GraphNode, SimLink>(simLinks).id(d => d.id).distance(90).strength(0.6))
      .force('charge', forceManyBody<GraphNode>().strength(-220))
      .force('center', forceCenter<GraphNode>(width / 2, height / 2).strength(0.05))
      .force('collide', forceCollide<GraphNode>(32))

    sim.on('tick', () => {
      const map: Positions = new Map()
      for (const n of simNodes) map.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 })
      setPositions(new Map(map))
      setResolvedLinks([...simLinks])
    })

    simRef.current = sim
    return () => { sim.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, links.length, width, height])

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragNode.current || !simRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const node = nodesRef.current.find(n => n.id === dragNode.current)
    if (node) {
      node.fx = e.clientX - rect.left
      node.fy = e.clientY - rect.top
      simRef.current.alpha(0.3).restart()
    }
  }

  const onMouseUp = () => {
    if (dragNode.current && simRef.current) {
      const node = nodesRef.current.find(n => n.id === dragNode.current)
      if (node) { node.fx = null; node.fy = null }
    }
    dragNode.current = null
  }

  return (
    <svg
      ref={svgRef}
      width={width} height={height}
      style={{ display: 'block', borderRadius: 8, background: '#0d1020' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#2f3a54" />
        </marker>
      </defs>

      {/* Edges */}
      {resolvedLinks.map((link, i) => {
        const src = positions.get(link.source.id)
        const tgt = positions.get(link.target.id)
        if (!src || !tgt) return null
        // Shorten the line so it doesn't overlap with node circles
        const dx = tgt.x - src.x
        const dy = tgt.y - src.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const r = 12
        const x2 = tgt.x - (dx / dist) * r
        const y2 = tgt.y - (dy / dist) * r
        return (
          <line
            key={i}
            x1={src.x} y1={src.y} x2={x2} y2={y2}
            stroke={link.isHard ? '#2f3a54' : '#1e2436'}
            strokeWidth={link.isHard ? 1.5 : 1}
            strokeDasharray={link.isHard ? undefined : '4 3'}
            markerEnd="url(#arrow)"
          />
        )
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const pos = positions.get(node.id)
        if (!pos) return null
        const color = classColor(node.assetClass)
        const r     = node.isTarget ? 15 : node.hopDistance === 1 ? 11 : 9
        const label = node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label
        return (
          <g
            key={node.id}
            transform={`translate(${pos.x},${pos.y})`}
            style={{ cursor: 'pointer' }}
            onClick={() => onNodeClick?.(node.id)}
            onMouseDown={e => { e.preventDefault(); dragNode.current = node.id }}
          >
            <circle r={r} fill={`${color}18`} stroke={color} strokeWidth={node.isTarget ? 2.5 : 1.5} />
            {node.isTarget && <circle r={r - 5} fill={color} opacity={0.4} />}
            <text
              y={r + 13}
              textAnchor="middle"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: '#8b94b0', pointerEvents: 'none', userSelect: 'none' }}
            >
              {label}
            </text>
            <text
              y={r + 23}
              textAnchor="middle"
              style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 8, fill: '#4e5870', pointerEvents: 'none', userSelect: 'none' }}
            >
              {node.assetClass !== 'Unknown' ? node.assetClass : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
