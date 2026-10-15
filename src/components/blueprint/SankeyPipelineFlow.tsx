import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw,
  Info,
  X,
  MousePointerClick,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Scan,
  Move,
} from 'lucide-react';
import { buildFlowGraph } from './flowData';
import type {
  FlowGraph,
  FlowTag,
  TraceSelection,
} from './flowTypes';

interface SankeyPipelineFlowProps {
  isDark?: boolean;
  isZh?: boolean;
}

// ---------------------------------------------------------------------------
// Layout constants (matches the reference 7-column pipeline geometry)
// ---------------------------------------------------------------------------
const W = 1875;
const H = 640;
const HEADER_Y = 16;

const COL = {
  entry: 27,
  prot: 326,
  vol: 631,
  mode: 935,
  exit: 1239,
  ladder: 1544,
  closed: 1848,
} as const;

const BAR_W = 5;
const BAR_H = 11;
const ENTRY_Y0 = 47;
const ENTRY_PITCH = 15;

const bezier = (x0: number, y0: number, x1: number, y1: number) => {
  const dx = (x1 - x0) * 0.5;
  return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`;
};

const logWidth = (count: number, max: number, min = 1.6, maxW = 4.6) => {
  if (max <= 0) return min;
  const t = Math.log1p(count) / Math.log1p(max);
  return min + t * (maxW - min);
};

// ---------------------------------------------------------------------------
// Edge model — every visible line is a real connection with trace membership
// ---------------------------------------------------------------------------
export interface Edge {
  id: string;
  d: string;
  color: string;
  width: number;
  title: string;
  tags: string[];
  modes: string[];
  protections: string[];
  exits: string[];
  ladders: string[];
}

export interface NodePos {
  id: string;
  kind: 'tag' | 'protection' | 'volume' | 'mode' | 'exit' | 'ladder' | 'closed';
  x: number;
  y: number; // center y
  h: number;
  label: string;
  sub?: string;
  color: string;
  refId: string; // id used for trace matching
  off?: boolean; // disabled rung (parsed from strategy params)
}

export interface BuiltFlow {
  nodes: NodePos[];
  edges: Edge[];
  tagByCode: Map<string, FlowTag>;
}

export function buildGeometry(g: FlowGraph, isZh = false): BuiltFlow {
  const nodes: NodePos[] = [];
  const edges: Edge[] = [];
  const tagByCode = new Map<string, FlowTag>();
  for (const t of g.tags) tagByCode.set(t.code, t);

  const maxOps = Math.max(1, ...g.tags.map((t) => t.ops));
  const modeById = new Map(g.modes.map((m) => [m.id, m]));
  const exitsOfTag = (t: FlowTag): string[] =>
    (t.modeId && modeById.get(t.modeId)?.exitSystems) || [];

  // ---- nodes ---------------------------------------------------------------
  const tagY = new Map<string, number>();
  g.tags.forEach((t, i) => {
    const y = ENTRY_Y0 + i * ENTRY_PITCH;
    tagY.set(t.code, y);
    const mode = g.modes.find((m) => m.id === t.modeId);
    nodes.push({
      id: `tag-${t.code}`, kind: 'tag', x: COL.entry, y, h: BAR_H,
      label: `${t.display} · ${t.ops} ${isZh ? '算子' : 'ops'}`, color: mode ? mode.color : '#8d8d8d',
      refId: t.code,
    });
  });

  const protY = new Map<string, number>();
  g.protections.forEach((p, i) => {
    const y = 140 + i * 140;
    protY.set(p.id, y);
    nodes.push({
      id: `prot-${p.id}`, kind: 'protection', x: COL.prot, y, h: BAR_H,
      label: p.label, color: p.color, refId: p.id,
    });
  });

  const volY = 310;
  nodes.push({
    id: 'vol', kind: 'volume', x: COL.vol, y: volY, h: 540,
    label: '', color: '#8d8d8d', refId: 'volume',
  });

  const modeY = new Map<string, number>();
  g.modes.forEach((m, i) => {
    const y = 75 + i * 48;
    modeY.set(m.id, y);
    const liveCount = g.tags.filter((t) => t.modeId === m.id).length;
    nodes.push({
      id: `mode-${m.id}`, kind: 'mode', x: COL.mode, y, h: BAR_H,
      label: `${m.label} · ${liveCount} ${isZh ? '标签' : 'tags'}`, color: m.color, refId: m.id,
    });
  });

  const exitY = new Map<string, number>();
  const exitOrder = ['eng_l_exit', 'eng_v4', 'eng_legacy_grind', 'eng_s_exit'];
  g.exits.forEach((e) => {
    const idx = exitOrder.indexOf(e.id);
    const y = [130, 280, 430, 565][idx] ?? 280;
    exitY.set(e.id, y);
    nodes.push({
      id: `exit-${e.id}`, kind: 'exit', x: COL.exit, y, h: BAR_H,
      label: e.label, sub: e.sub, color: e.color, refId: e.id,
    });
  });

  const ladderY = new Map<string, number>();
  g.ladders.forEach((l) => {
    // grind 1-5 -> 75..267 ; derisk 1-4 -> 340..496 ; buyback -> 580
    const n = Number(l.id.split('_').pop() ?? 1);
    let y: number;
    if (l.kind === 'grind') y = 75 + (n - 1) * 48;
    else if (l.kind === 'derisk') y = 340 + (n - 1) * 52;
    else y = 580;
    ladderY.set(l.id, y);
    nodes.push({
      id: `lad-${l.id}`, kind: 'ladder', x: COL.ladder, y, h: BAR_H,
      label: l.on ? l.label : `${l.label} · ${isZh ? '停用' : 'off'}`, color: l.color, refId: l.id,
      off: !l.on,
    });
  });

  const closedY = 360;
  nodes.push({
    id: 'closed', kind: 'closed', x: COL.closed, y: closedY, h: 150,
    label: isZh ? '平仓结算' : 'Closed', sub: `${g.closedBranches} ${isZh ? '分支' : 'branches'}`, color: '#8d8d8d', refId: 'closed',
  });

  // ---- edges ---------------------------------------------------------------
  // 1. tag -> protection groups
  const protTags = new Map<string, Set<string>>(); // protId -> tag codes
  for (const t of g.tags) {
    const groups = t.gates.length > 0
      ? [...new Set(t.gates.map((gt) => gt.group))]
      : g.protections.map((p) => p.id);
    for (const grp of groups) {
      if (!protY.has(grp)) continue;
      if (!protTags.has(grp)) protTags.set(grp, new Set());
      protTags.get(grp)!.add(t.code);
      const p = g.protections.find((x) => x.id === grp)!;
      edges.push({
        id: `e-tp-${t.code}-${grp}`,
        d: bezier(COL.entry + BAR_W, tagY.get(t.code)!, COL.prot, protY.get(grp)!),
        color: p.color,
        width: logWidth(t.ops, maxOps, 1.2, 3.4),
        title: isZh ? `${t.display} 通过 ${p.label.split(' ·')[0]}` : `${t.display} passes ${p.label.split(' ·')[0]}`,
        tags: [t.code], modes: t.modeId ? [t.modeId] : [],
        protections: [grp], exits: exitsOfTag(t), ladders: [],
      });
    }
  }

  // 2. protection -> volume
  const protOps = new Map<string, number>();
  for (const [grp, codes] of protTags) {
    protOps.set(grp, [...codes].reduce((s, c) => s + (tagByCode.get(c)?.ops ?? 0), 0));
  }
  const maxProtOps = Math.max(1, ...protOps.values());
  for (const p of g.protections) {
    const codes = [...(protTags.get(p.id) ?? [])];
    const pExits = [...new Set(codes.flatMap((c) => exitsOfTag(tagByCode.get(c)!)))];
    edges.push({
      id: `e-pv-${p.id}`,
      d: bezier(COL.prot + BAR_W, protY.get(p.id)!, COL.vol, volY),
      color: p.color,
      width: logWidth(protOps.get(p.id) ?? 0, maxProtOps, 1.6, 4.2),
      title: isZh ? `${p.label.split(' ·')[0]} → 分流汇聚` : `${p.label.split(' ·')[0]} → volume funnel`,
      tags: codes,
      modes: [...new Set(codes.map((c) => tagByCode.get(c)?.modeId).filter(Boolean) as string[])],
      protections: [p.id], exits: pExits, ladders: [],
    });
  }

  // 3. volume -> mode
  const modeOps = new Map<string, number>();
  for (const m of g.modes) {
    modeOps.set(m.id, g.tags.filter((t) => t.modeId === m.id).reduce((s, t) => s + t.ops, 0));
  }
  const maxModeOps = Math.max(1, ...modeOps.values());
  const modeProts = new Map<string, string[]>();
  for (const m of g.modes) {
    const mtags = g.tags.filter((t) => t.modeId === m.id);
    const groups = new Set<string>();
    for (const t of mtags) {
      const gs = t.gates.length > 0 ? t.gates.map((gt) => gt.group) : g.protections.map((p) => p.id);
      gs.forEach((x) => groups.add(x));
    }
    modeProts.set(m.id, [...groups]);
    edges.push({
      id: `e-vm-${m.id}`,
      d: bezier(COL.vol + 8, volY, COL.mode, modeY.get(m.id)!),
      color: m.color,
      width: logWidth(modeOps.get(m.id) ?? 0, maxModeOps, 2, 5.2),
      title: isZh ? `${m.label} ← 分流汇聚` : `${m.label} ← volume funnel`,
      tags: mtags.map((t) => t.code),
      modes: [m.id], protections: [...groups], exits: m.exitSystems, ladders: [],
    });
  }

  // 4. mode -> exit systems
  for (const m of g.modes) {
    const mtags = g.tags.filter((t) => t.modeId === m.id).map((t) => t.code);
    for (const e of m.exitSystems) {
      if (!exitY.has(e)) continue;
      const em = g.exits.find((x) => x.id === e);
      edges.push({
        id: `e-me-${m.id}-${e}`,
        d: bezier(COL.mode + BAR_W, modeY.get(m.id)!, COL.exit, exitY.get(e)!),
        color: m.color,
        width: logWidth(modeOps.get(m.id) ?? 0, maxModeOps, 1.8, 4.4),
        title: `${m.label} → ${em?.label ?? e}`,
        tags: mtags, modes: [m.id],
        protections: modeProts.get(m.id) ?? [], exits: [e], ladders: [],
      });
    }
  }

  // helper: tags/modes feeding an exit
  const exitFeeds = new Map<string, { tags: string[]; modes: string[]; protections: string[] }>();
  for (const e of g.exits) {
    const ms = g.modes.filter((m) => m.exitSystems.includes(e.id));
    const tags = ms.flatMap((m) => g.tags.filter((t) => t.modeId === m.id).map((t) => t.code));
    const protections = [...new Set(ms.flatMap((m) => modeProts.get(m.id) ?? []))];
    exitFeeds.set(e.id, { tags, modes: ms.map((m) => m.id), protections });
  }

  // 5a. system_v4 -> ladders
  const v4 = g.exits.find((e) => e.id === 'eng_v4');
  if (v4) {
    const feed = exitFeeds.get('eng_v4')!;
    for (const l of g.ladders) {
      edges.push({
        id: `e-el-v4-${l.id}`,
        d: bezier(COL.exit + BAR_W, exitY.get('eng_v4')!, COL.ladder, ladderY.get(l.id)!),
        color: l.color,
        width: 2,
        title: `system_v4 → ${l.label}`,
        tags: feed.tags, modes: feed.modes, protections: feed.protections,
        exits: ['eng_v4'], ladders: [l.id],
      });
    }
  }

  // 5b. other exits -> closed (direct, like the reference's long jump lines)
  for (const e of g.exits) {
    if (e.id === 'eng_v4') continue;
    const feed = exitFeeds.get(e.id)!;
    edges.push({
      id: `e-ec-${e.id}`,
      d: bezier(COL.exit + BAR_W, exitY.get(e.id)!, COL.closed, closedY),
      color: e.color,
      width: 3,
      title: isZh ? `${e.label} → 平仓结算 (直接)` : `${e.label} → Closed (direct)`,
      tags: feed.tags, modes: feed.modes, protections: feed.protections,
      exits: [e.id], ladders: [],
    });
  }

  // 6. ladders -> closed
  if (v4) {
    const feed = exitFeeds.get('eng_v4')!;
    for (const l of g.ladders) {
      edges.push({
        id: `e-lc-${l.id}`,
        d: bezier(COL.ladder + BAR_W, ladderY.get(l.id)!, COL.closed, closedY),
        color: l.color,
        width: 2,
        title: isZh ? `${l.label} → 平仓结算` : `${l.label} → Closed`,
        tags: feed.tags, modes: feed.modes, protections: feed.protections,
        exits: ['eng_v4'], ladders: [l.id],
      });
    }
  }

  return { nodes, edges, tagByCode };
}

// ---------------------------------------------------------------------------
// Trace computation
// ---------------------------------------------------------------------------
export function edgeMatches(e: Edge, sel: TraceSelection): boolean {
  switch (sel.kind) {
    case 'tag': return e.tags.includes(sel.id);
    case 'mode': return e.modes.includes(sel.id);
    case 'protection': return e.protections.includes(sel.id);
    case 'exit': return e.exits.includes(sel.id);
    case 'ladder': return e.ladders.includes(sel.id);
    default: return false;
  }
}

export function SankeyPipelineFlow({ isDark = true, isZh = false }: SankeyPipelineFlowProps) {
  const [trace, setTrace] = useState<TraceSelection | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pan & Zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasDraggedRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, dist: 0 });

  const graph: FlowGraph = useMemo(() => buildFlowGraph(isDark, isZh), [isDark, isZh]);
  const { nodes, edges, tagByCode } = useMemo(() => buildGeometry(graph, isZh), [graph, isZh]);

  // Capture Escape key when diagram is in fullscreen so it closes fullscreen without closing parent modal
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullscreen]);

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const availW = Math.max(100, cw - 32);
    const availH = Math.max(100, ch - 32);
    const s = Math.min(availW / W, availH / H);
    const clampedScale = Math.min(Math.max(s, 0.35), 1.6);
    const ox = (cw - W * clampedScale) / 2;
    const oy = Math.max(16, (ch - H * clampedScale) / 2);
    setScale(clampedScale);
    setPan({ x: ox, y: oy });
  }, []);

  const resetZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const ox = Math.max(16, (cw - W) / 2);
    const oy = Math.max(16, (ch - H) / 2);
    setScale(1);
    setPan({ x: ox, y: oy });
  }, []);

  const zoomBy = useCallback((multiplier: number) => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const centerX = cw / 2;
    const centerY = ch / 2;
    setScale((prevScale) => {
      const nextScale = Math.min(Math.max(prevScale * multiplier, 0.35), 4.5);
      setPan((prevPan) => {
        const contentX = (centerX - prevPan.x) / prevScale;
        const contentY = (centerY - prevPan.y) / prevScale;
        return {
          x: centerX - contentX * nextScale,
          y: centerY - contentY * nextScale,
        };
      });
      return nextScale;
    });
  }, []);

  // Fit view on initial mount and when fullscreen toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView();
    }, 60);
    return () => clearTimeout(timer);
  }, [isFullscreen, fitToView]);

  // Window resize listener to refit view cleanly if needed
  useEffect(() => {
    const handleResize = () => {
      fitToView();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToView]);

  // Wheel zoom centered on cursor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setScale((prevScale) => {
        const nextScale = Math.min(Math.max(prevScale * factor, 0.35), 4.5);
        setPan((prevPan) => {
          const contentX = (mouseX - prevPan.x) / prevScale;
          const contentY = (mouseY - prevPan.y) / prevScale;
          return {
            x: mouseX - contentX * nextScale,
            y: mouseY - contentY * nextScale,
          };
        });
        return nextScale;
      });
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Global mouseup listener for dragging
  useEffect(() => {
    const onGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => window.removeEventListener('mouseup', onGlobalMouseUp);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasDraggedRef.current = true;
    }
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      hasDraggedRef.current = false;
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
        dist: 0,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasDraggedRef.current = true;
      }
      setPan({
        x: touchStartRef.current.panX + dx,
        y: touchStartRef.current.panY + dy,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      touchStartRef.current.dist = dist;
      setScale((prev) => Math.min(Math.max(prev * factor, 0.35), 4.5));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const select = useCallback((sel: TraceSelection) => {
    setTrace((prev) => (prev && prev.kind === sel.kind && prev.id === sel.id ? null : sel));
  }, []);

  const reset = useCallback(() => setTrace(null), []);

  const traceState = useMemo(() => {
    if (!trace) return null;
    // Ladder selection: highlight this ladder's edges PLUS the full upstream
    // path through system_v4 (other ladders' edges stay dim).
    const matches = (e: Edge): boolean => {
      if (trace.kind === 'ladder') {
        if (e.ladders.includes(trace.id)) return true;
        return e.ladders.length === 0 && edgeMatches(e, { kind: 'exit', id: 'eng_v4' });
      }
      return edgeMatches(e, trace);
    };
    const activeEdgeIds = new Set(edges.filter(matches).map((e) => e.id));
    const activeNodeIds = new Set<string>();
    for (const e of edges) {
      if (!activeEdgeIds.has(e.id)) continue;
      for (const n of nodes) {
        if (edgeTouchesNode(e, n)) activeNodeIds.add(n.id);
      }
    }
    // always include the selected node itself
    const selNode = nodes.find(
      (n) =>
        (trace.kind === 'tag' && n.kind === 'tag' && n.refId === trace.id) ||
        (trace.kind === 'mode' && n.kind === 'mode' && n.refId === trace.id) ||
        (trace.kind === 'protection' && n.kind === 'protection' && n.refId === trace.id) ||
        (trace.kind === 'exit' && n.kind === 'exit' && n.refId === trace.id) ||
        (trace.kind === 'ladder' && n.kind === 'ladder' && n.refId === trace.id),
    );
    if (selNode) activeNodeIds.add(selNode.id);
    return { activeEdgeIds, activeNodeIds };
  }, [trace, edges, nodes]);

  // ---- theme -----------------------------------------------------------------
  const t = {
    panelBg: isDark ? '#161616' : '#ffffff',
    pageBg: isDark ? '#0f1114' : '#f1f5f9',
    label: isDark ? '#f4f4f4' : '#0f172a',
    halo: isDark ? '#161616' : '#ffffff',
    header: isDark ? '#8d8d8d' : '#64748b',
    sub: isDark ? '#8d8d8d' : '#64748b',
    barBg: isDark ? '#1e293b' : '#ffffff',
    barBorder: isDark ? '#334155' : '#cbd5e1',
  };

  const headers = isZh
    ? ['入场信号 (84条规则)', '风控门禁 (4大防御网)', '体量汇聚分流', '模式归属路由', '退出引擎架构', '动态阶梯调仓 (V4)', '平仓出场结算']
    : ['Entry signals', 'Protections', 'Volume', 'tag → mode', 'Exit systems', 'Ladders', 'Closed'];
  const headerX = isZh
    ? [COL.entry, COL.prot, COL.vol - 20, COL.mode - 65, COL.exit - 65, COL.ladder - 65, COL.closed - 50]
    : [COL.entry, COL.prot, COL.vol - 14, COL.mode - 78, COL.exit - 84, COL.ladder - 64, COL.closed - 44];

  // ---- breadcrumb --------------------------------------------------------------
  const crumb = useMemo(() => {
    if (!trace) return null;
    const parts: string[] = [];
    let detailTag: FlowTag | null = null;
    if (trace.kind === 'tag') {
      const tg = tagByCode.get(trace.id);
      if (!tg) return null;
      detailTag = tg;
      const mode = graph.modes.find((m) => m.id === tg.modeId);
      const exits = (mode?.exitSystems ?? []).map(
        (e) => graph.exits.find((x) => x.id === e)?.label ?? e,
      );
      parts.push(`${tg.display} · ${tg.ops} ${isZh ? '算子' : 'ops'}`);
      parts.push(
        tg.gates.length > 0
          ? `${tg.gates.length} ${isZh ? '个风控门禁' : tg.gates.length === 1 ? 'gate' : 'gates'}`
          : isZh ? '4 组风控保护' : '4 protection groups',
      );
      if (mode) parts.push(mode.label);
      if (exits.length) parts.push(exits.join(' + '));
      parts.push(isZh ? '平仓出场结算' : 'Closed');
    } else if (trace.kind === 'mode') {
      const m = graph.modes.find((x) => x.id === trace.id);
      if (!m) return null;
      const n = graph.tags.filter((x) => x.modeId === m.id).length;
      parts.push(`${m.label} · ${n} ${isZh ? '个标签' : 'tags'}`);
      parts.push(
        (m.exitSystems.map((e) => graph.exits.find((x) => x.id === e)?.label ?? e)).join(' + '),
      );
      parts.push(isZh ? '平仓出场结算' : 'Closed');
    } else if (trace.kind === 'protection') {
      const p = graph.protections.find((x) => x.id === trace.id);
      if (!p) return null;
      parts.push(p.label.split(' ·')[0]);
      parts.push(isZh ? '体量汇聚分流' : 'Volume');
      parts.push(isZh ? '模式 → 退出 → 平仓出场结算' : 'modes → exits → Closed');
    } else if (trace.kind === 'exit') {
      const e = graph.exits.find((x) => x.id === trace.id);
      if (!e) return null;
      parts.push(e.label);
      parts.push(e.id === 'eng_v4' ? (isZh ? `${graph.ladders.length} 级动态阶梯` : `${graph.ladders.length} ladders`) : (isZh ? '直接平仓退出' : 'direct'));
      parts.push(isZh ? '平仓出场结算' : 'Closed');
    } else {
      const l = graph.ladders.find((x) => x.id === trace.id);
      if (!l) return null;
      parts.push('system_v4');
      parts.push(l.label);
      parts.push(isZh ? '平仓出场结算' : 'Closed');
    }
    return { parts, detailTag };
  }, [trace, graph, tagByCode, isZh]);

  const onNodeKey = (sel: TraceSelection) => (ev: React.KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      select(sel);
    } else if (ev.key === 'Escape') {
      reset();
    }
  };

  const nodeSelFor = (n: NodePos): TraceSelection | null => {
    switch (n.kind) {
      case 'tag': return { kind: 'tag', id: n.refId };
      case 'protection': return { kind: 'protection', id: n.refId };
      case 'mode': return { kind: 'mode', id: n.refId };
      case 'exit': return { kind: 'exit', id: n.refId };
      case 'ladder': return { kind: 'ladder', id: n.refId };
      default: return null;
    }
  };

  const flowInner = (
    <div
      className={
        isFullscreen
          ? `fixed inset-0 z-[200] flex flex-col p-4 sm:p-6 backdrop-blur-md overflow-hidden ${
              isDark ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-100 text-black'
            }`
          : 'flex flex-col gap-3'
      }
    >
      <style>{`
        .nfi-edge { transition: opacity 0.25s ease, stroke-width 0.25s ease; }
        .nfi-edge:hover { stroke-opacity: 0.95 !important; }
        .nfi-edge-active {
          stroke-dasharray: 9 7;
          animation: nfi-dashflow 0.65s linear infinite;
        }
        @keyframes nfi-dashflow { to { stroke-dashoffset: -32; } }
        .nfi-node { cursor: pointer; outline: none; }
        .nfi-node:hover .nfi-bar, .nfi-node:focus-visible .nfi-bar { stroke: #f4f4f4; stroke-width: 1.5; }
        .nfi-node:focus-visible .nfi-bar { stroke-dasharray: 3 2; }
      `}</style>

      {/* Fullscreen Header Banner when expanded */}
      {isFullscreen && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-sm sm:text-base tracking-tight">
              {isZh ? 'NFI 策略架构执行流链路图' : 'NFI Strategy Execution Pipeline Flow'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              {isZh ? '全屏拓扑视图' : 'Fullscreen Canvas'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{isZh ? '退出全屏 (ESC)' : 'Exit Fullscreen (ESC)'}</span>
          </button>
        </div>
      )}

      {/* ---- Trace control / breadcrumb bar ---- */}
      <div
        className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 flex-wrap ${
          isDark ? 'bg-[#161616] border-[#2a2a2a] text-white' : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <MousePointerClick className={`w-4 h-4 shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} />
          {crumb ? (
            <>
              <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`}>
                {isZh ? '追踪链路' : 'Tracing'}:
              </span>
              {crumb.parts.map((p, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>→</span>}
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isDark ? 'bg-white/5 border-white/10 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    {p}
                  </span>
                </span>
              ))}
            </>
          ) : (
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isZh
                ? '点击任意节点追踪其完整执行链路 — 全流程保持高亮可见'
                : 'Click any node to trace its full execution path — the whole flow stays visible'}
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                {isZh
                  ? `  · ${graph.tags.length} 个活跃标签 · ${graph.modes.length} 组模式 · ${graph.exits.length} 个退出引擎 · ${graph.ladders.length} 级阶梯 → 平仓结算 (${graph.closedBranches} 个分支)`
                  : `  · ${graph.tags.length} live tags · ${graph.modes.length} modes · ${graph.exits.length} exit systems · ${graph.ladders.length} ladders → Closed (${graph.closedBranches} branches)`}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {crumb && (
            <button
              onClick={reset}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-400 text-black hover:bg-slate-200'
              }`}
            >
              {isZh ? <X className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {isZh ? '重置全景' : 'Full flow'}
            </button>
          )}

          {/* Flow diagram dedicated fullscreen button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={
              isFullscreen
                ? isZh ? '退出全屏 (ESC)' : 'Exit full screen (ESC)'
                : isZh ? '全屏查看执行链路图' : 'Fullscreen flow diagram'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0 cursor-pointer ${
              isDark
                ? 'bg-slate-800/90 border-slate-700 text-cyan-400 hover:bg-slate-700 hover:text-cyan-300'
                : 'bg-white border-slate-300 text-indigo-700 hover:bg-slate-100 hover:text-indigo-900 shadow-xs'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? (isZh ? '退出全屏' : 'Exit') : (isZh ? '全屏链路图' : 'Fullscreen')}</span>
          </button>
        </div>
      </div>

      {/* ---- Main canvas ---- */}
      <div
        ref={containerRef}
        className={`w-full relative overflow-hidden rounded-xl border shadow-2xl select-none ${
          isFullscreen ? 'flex-1 min-h-0' : 'h-[620px]'
        }`}
        style={{
          background: t.panelBg,
          borderColor: isDark ? '#2a2a2a' : '#cbd5e1',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Pan & Zoom Hint */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium backdrop-blur-md bg-black/60 border border-white/10 text-slate-200 shadow-md">
          <Move className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isZh ? '按住鼠标拖拽平移 · 滚轮自由缩放' : 'Drag to pan · Scroll to zoom'}</span>
        </div>

        {/* Floating Zoom Toolbar Controls */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 p-1 rounded-xl border shadow-xl backdrop-blur-md bg-slate-900/90 border-slate-700/80 text-white">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              zoomBy(0.8);
            }}
            title={isZh ? '缩小 (滚轮向下)' : 'Zoom out'}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            title={isZh ? '点击重置为 100%' : 'Reset to 100%'}
            className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-cyan-300 transition-colors cursor-pointer"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              zoomBy(1.25);
            }}
            title={isZh ? '放大 (滚轮向上)' : 'Zoom in'}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fitToView();
            }}
            title={isZh ? '全景自适应' : 'Fit to screen'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isZh ? '自适应' : 'Fit'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            title={isZh ? '原始 1:1 比例' : 'Reset 1:1'}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Transformable Canvas Surface */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            width: `${W}px`,
            height: `${H}px`,
            willChange: 'transform',
          }}
        >
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full font-sans pointer-events-auto"
            role="img"
            aria-label="NFI X8 decision flow"
          >
            <defs>
              <filter id="nfiGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* column headers */}
            {headers.map((hTxt, i) => (
              <text key={hTxt} x={headerX[i]} y={HEADER_Y} fontSize="11" fontWeight="700" fill={t.header}>
                {hTxt}
              </text>
            ))}

            {/* edges */}
            <g>
              {edges.map((e) => {
                const isActive = traceState ? traceState.activeEdgeIds.has(e.id) : false;
                const dimmed = traceState && !isActive;
                return (
                  <path
                    key={e.id}
                    d={e.d}
                    fill="none"
                    stroke={e.color}
                    strokeWidth={isActive ? e.width + 1.2 : e.width}
                    strokeOpacity={dimmed ? 0.05 : isActive ? 1 : 0.5}
                    strokeLinecap="round"
                    className={`nfi-edge${isActive ? ' nfi-edge-active' : ''}`}
                    filter={isActive ? 'url(#nfiGlow)' : undefined}
                  >
                    <title>{e.title}</title>
                  </path>
                );
              })}
            </g>

            {/* nodes */}
            <g>
              {nodes.map((n) => {
                const sel = nodeSelFor(n);
                const isActiveNode = traceState ? traceState.activeNodeIds.has(n.id) : false;
                const dimmed = traceState && !isActiveNode;
                const hovered = hoverNode === n.id;
                const nodeOpacity = dimmed ? 0.25 : n.off && !isActiveNode ? 0.38 : 1;
                const labelAnchor = n.kind === 'tag' || n.kind === 'protection' ? 'start' : 'end';
                const labelX = labelAnchor === 'start' ? n.x + BAR_W + 6 : n.x - 8;
                const showLabel = n.kind !== 'volume';
                return (
                  <g
                    key={n.id}
                    className={sel ? 'nfi-node' : undefined}
                    opacity={nodeOpacity}
                    role={sel ? 'button' : undefined}
                    tabIndex={sel ? 0 : undefined}
                    aria-label={sel ? `${n.label} — trace pipeline` : undefined}
                    onClick={sel ? () => {
                      if (hasDraggedRef.current) return;
                      select(sel);
                    } : undefined}
                    onKeyDown={sel ? onNodeKey(sel) : undefined}
                    onMouseEnter={() => setHoverNode(n.id)}
                    onMouseLeave={() => setHoverNode(null)}
                  >
                    <title>{n.sub ? `${n.label}\n${n.sub}` : n.label}</title>
                    <rect
                      x={n.x}
                      y={n.y - n.h / 2}
                      width={BAR_W}
                      height={n.h}
                      rx={1}
                      fill={n.color}
                      className="nfi-bar"
                      stroke={isActiveNode ? '#ffffff' : 'none'}
                      strokeWidth={isActiveNode ? 1.4 : 0}
                    />
                    {showLabel && (
                      <text
                        x={labelX}
                        y={n.y + 3.5}
                        textAnchor={labelAnchor}
                        fontSize={n.kind === 'closed' ? 13 : 11}
                        fontWeight={n.kind === 'closed' ? 800 : 600}
                        fill={hovered || isActiveNode ? t.label : t.label}
                        opacity={hovered || isActiveNode ? 1 : 0.92}
                        style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 3 }}
                      >
                        {n.label}
                      </text>
                    )}
                    {n.sub && n.kind !== 'closed' && (
                      <text
                        x={labelX}
                        y={n.y + 16}
                        textAnchor={labelAnchor}
                        fontSize="9"
                        fill={t.sub}
                        style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 3 }}
                      >
                        {n.sub}
                      </text>
                    )}
                    {n.kind === 'closed' && n.sub && (
                      <text
                        x={labelX}
                        y={n.y + 22}
                        textAnchor={labelAnchor}
                        fontSize="10"
                        fill={t.sub}
                        style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 3 }}
                      >
                        {n.sub}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* ---- Tag detail: its gates ---- */}
      {crumb?.detailTag && (
        <div
          className={`px-3.5 py-3 rounded-xl border ${
            isDark ? 'bg-[#161616] border-[#2a2a2a]' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-black'}`}>
              {crumb.detailTag.display}
              <span className={`ml-2 font-mono font-semibold normal-case tracking-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {isZh && crumb.detailTag.descriptionZh ? crumb.detailTag.descriptionZh : crumb.detailTag.description}
              </span>
            </div>
            <div className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {crumb.detailTag.ops} {isZh ? '算子' : 'ops'} · {crumb.detailTag.masks} {isZh ? '掩码' : 'masks'} · {crumb.detailTag.protections} {isZh ? '保护项' : 'protections'}
            </div>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: t.header }}>
            {isZh ? '所属保护门禁' : 'Its gates'} ({crumb.detailTag.gates.length || '—'})
          </div>
          {crumb.detailTag.gates.length > 0 ? (
            <div className="flex flex-col gap-1">
              {crumb.detailTag.gates.map((gt, i) => {
                const pcol = graph.protections.find((p) => p.id === gt.group)?.color ?? '#8d8d8d';
                const plabel = graph.protections.find((p) => p.id === gt.group)?.label.split(' ·')[0] ?? gt.group;
                return (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pcol }} />
                    <code className={`text-[11px] font-mono truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {gt.name}
                    </code>
                    <span className={`text-[10px] font-mono shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      {plabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {isZh ? '门禁明细将随策略解析动态加载' : 'Gate detail populates from the strategy parse (data/nfiTagGates.ts)'}
            </div>
          )}
        </div>
      )}

      {/* ---- helper note ---- */}
      <div
        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
          isDark ? 'bg-[#161616] border-[#2a2a2a] text-slate-300' : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold">{isZh ? '执行管道流转提示' : 'Execution Pipeline Insight'}: </span>
          {isZh
            ? '从左至右为量化执行顺序，连线粗细按条件频次对数缩放。点击任意节点（信号 / 保护组 / 模式 / 退出引擎 / 阶梯）即可追踪完整上下游链路：选中路径以流动虚线高亮动画呈现，其余流保持低亮背景可见。支持全屏查看以获得更开阔的拓扑视野。'
            : 'Left → right is execution order; line thickness is log-scaled by count. Click any node (signal, protection group, mode, exit engine, ladder) to trace its full path — the selected pipeline animates while the rest of the flow stays visible but dimmed.'}
        </div>
      </div>
    </div>
  );

  return isFullscreen ? createPortal(flowInner, document.body) : flowInner;
}

function edgeTouchesNode(e: Edge, n: NodePos): boolean {
  // node is on the path if the edge's membership matches the node's refId
  switch (n.kind) {
    case 'tag': return e.tags.includes(n.refId);
    case 'protection': return e.protections.includes(n.refId);
    case 'mode': return e.modes.includes(n.refId);
    case 'exit': return e.exits.includes(n.refId);
    case 'ladder': return e.ladders.includes(n.refId);
    case 'volume': return e.tags.length > 0; // volume sits on every tag path
    case 'closed': return true; // terminal of every path
    default: return false;
  }
}
