import { useState, useMemo } from 'react';
import { RotateCcw, Info } from 'lucide-react';

interface SankeyPipelineFlowProps {
  isDark?: boolean;
  isZh?: boolean;
}

interface LiveTagItem {
  id: string;
  name: string;
  ops: number;
  color: string;
  side: 'long' | 'short';
  modeId: string;
}

// Exactly 36 live tags as upstream NostalgiaForInfinityX8
const LIVE_TAGS: LiveTagItem[] = [
  // L Normal (Blue)
  { id: 'L#1', name: 'L#1', ops: 710, color: '#38bdf8', side: 'long', modeId: 'mode_l_normal' },
  { id: 'L#2', name: 'L#2', ops: 1248, color: '#38bdf8', side: 'long', modeId: 'mode_l_normal' },
  { id: 'L#3', name: 'L#3', ops: 1133, color: '#38bdf8', side: 'long', modeId: 'mode_l_normal' },
  { id: 'L#4', name: 'L#4', ops: 581, color: '#38bdf8', side: 'long', modeId: 'mode_l_normal' },
  { id: 'L#5', name: 'L#5', ops: 653, color: '#38bdf8', side: 'long', modeId: 'mode_l_normal' },
  { id: 'L#6', name: 'L#6', ops: 1297, color: '#38bdf8', side: 'long', modeId: 'mode_l_normal' },
  // L Pump (Orange)
  { id: 'L#21', name: 'L#21', ops: 351, color: '#fb923c', side: 'long', modeId: 'mode_l_pump' },
  // L Quick (Green)
  { id: 'L#41', name: 'L#41', ops: 1057, color: '#4ade80', side: 'long', modeId: 'mode_l_quick' },
  { id: 'L#42', name: 'L#42', ops: 905, color: '#4ade80', side: 'long', modeId: 'mode_l_quick' },
  { id: 'L#43', name: 'L#43', ops: 879, color: '#4ade80', side: 'long', modeId: 'mode_l_quick' },
  { id: 'L#44', name: 'L#44', ops: 554, color: '#4ade80', side: 'long', modeId: 'mode_l_quick' },
  { id: 'L#45', name: 'L#45', ops: 404, color: '#4ade80', side: 'long', modeId: 'mode_l_quick' },
  { id: 'L#46', name: 'L#46', ops: 480, color: '#4ade80', side: 'long', modeId: 'mode_l_quick' },
  { id: 'L#47', name: 'L#47', ops: 351, color: '#4ade80', side: 'long', modeId: 'mode_l_quick' },
  // L Rebuy (Pink)
  { id: 'L#61', name: 'L#61', ops: 629, color: '#f472b6', side: 'long', modeId: 'mode_l_rebuy' },
  { id: 'L#62', name: 'L#62', ops: 651, color: '#f472b6', side: 'long', modeId: 'mode_l_rebuy' },
  { id: 'L#63', name: 'L#63', ops: 949, color: '#f472b6', side: 'long', modeId: 'mode_l_rebuy' },
  { id: 'L#64', name: 'L#64', ops: 762, color: '#f472b6', side: 'long', modeId: 'mode_l_rebuy' },
  { id: 'L#65', name: 'L#65', ops: 334, color: '#f472b6', side: 'long', modeId: 'mode_l_rebuy' },
  // L Rapid (Cyan)
  { id: 'L#101', name: 'L#101', ops: 476, color: '#22d3ee', side: 'long', modeId: 'mode_l_rapid' },
  { id: 'L#102', name: 'L#102', ops: 545, color: '#22d3ee', side: 'long', modeId: 'mode_l_rapid' },
  { id: 'L#103', name: 'L#103', ops: 349, color: '#22d3ee', side: 'long', modeId: 'mode_l_rapid' },
  { id: 'L#104', name: 'L#104', ops: 366, color: '#22d3ee', side: 'long', modeId: 'mode_l_rapid' },
  // L Grind (Yellow)
  { id: 'L#120', name: 'L#120', ops: 3, color: '#facc15', side: 'long', modeId: 'mode_l_grind' },
  // L Top coins (Teal/Cyan)
  { id: 'L#141', name: 'L#141', ops: 858, color: '#06b6d4', side: 'long', modeId: 'mode_l_tc' },
  { id: 'L#142', name: 'L#142', ops: 834, color: '#06b6d4', side: 'long', modeId: 'mode_l_tc' },
  { id: 'L#143', name: 'L#143', ops: 520, color: '#06b6d4', side: 'long', modeId: 'mode_l_tc' },
  { id: 'L#144', name: 'L#144', ops: 561, color: '#06b6d4', side: 'long', modeId: 'mode_l_tc' },
  { id: 'L#145', name: 'L#145', ops: 453, color: '#06b6d4', side: 'long', modeId: 'mode_l_tc' },
  // L Scalp (Magenta)
  { id: 'L#161', name: 'L#161', ops: 336, color: '#e879f9', side: 'long', modeId: 'mode_l_scalp' },
  { id: 'L#162', name: 'L#162', ops: 310, color: '#e879f9', side: 'long', modeId: 'mode_l_scalp' },
  { id: 'L#163', name: 'L#163', ops: 657, color: '#e879f9', side: 'long', modeId: 'mode_l_scalp' },
  // Short tags
  { id: 'S#501', name: 'S#501', ops: 315, color: '#f87171', side: 'short', modeId: 'mode_s_normal' },
  { id: 'S#502', name: 'S#502', ops: 222, color: '#f87171', side: 'short', modeId: 'mode_s_normal' },
  { id: 'S#542', name: 'S#542', ops: 185, color: '#fb923c', side: 'short', modeId: 'mode_s_quick' },
  { id: 'S#562', name: 'S#562', ops: 1380, color: '#ef4444', side: 'short', modeId: 'mode_s_rebuy' },
];

export function SankeyPipelineFlow({ isDark = true, isZh = false }: SankeyPipelineFlowProps) {
  const [activeTag, setActiveTag] = useState<string>('L#1');
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const selectedTagItem = useMemo(() => {
    return LIVE_TAGS.find((t) => t.id === activeTag) || LIVE_TAGS[0];
  }, [activeTag]);

  // Cubic Bezier Ribbon Generator (closed path with upper and lower curve)
  const createRibbon = (
    x0: number,
    y0Top: number,
    y0Bot: number,
    x1: number,
    y1Top: number,
    y1Bot: number
  ) => {
    const dx = (x1 - x0) * 0.45;
    return `M ${x0} ${y0Top} C ${x0 + dx} ${y0Top}, ${x1 - dx} ${y1Top}, ${x1} ${y1Top} L ${x1} ${y1Bot} C ${x1 - dx} ${y1Bot}, ${x0 + dx} ${y0Bot}, ${x0} ${y0Bot} Z`;
  };

  // Trace line spline
  const createSpline = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = (x1 - x0) * 0.45;
    return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`;
  };

  // Pre-calculated target coordinates
  // Col 1: Signals x = 160
  // Col 2: Protections xIn = 270, xOut = 370
  // Col 3: Gateway bar xIn = 450, xOut = 462
  // Col 4: Tag classification xIn = 550, xOut = 670
  // Col 5: Processing engines xIn = 760, xOut = 870
  // Col 6: Action tiers xIn = 960, xOut = 1070
  // Col 7: Closed xIn = 1170, xOut = 1240

  const protectionNodes = [
    { id: 'prot_overflow', name: 'Overflow guards · 38x', yTop: 50, yBot: 180, cy: 115 },
    { id: 'prot_global', name: 'Global protections · 36x', yTop: 210, yBot: 340, cy: 275 },
    { id: 'prot_candle', name: 'Candle health · 35x', yTop: 370, yBot: 500, cy: 435 },
    { id: 'prot_pair', name: 'Pair mode guards · 6x', yTop: 530, yBot: 660, cy: 595 },
  ];

  const modeNodes = [
    { id: 'mode_l_normal', name: 'L Normal · 6 tags', yTop: 45, yBot: 85, cy: 65, color: '#38bdf8', engineId: 'eng_l_exit' },
    { id: 'mode_l_pump', name: 'L Pump · 1 tags', yTop: 95, yBot: 135, cy: 115, color: '#fb923c', engineId: 'eng_l_exit' },
    { id: 'mode_l_quick', name: 'L Quick · 7 tags', yTop: 145, yBot: 185, cy: 165, color: '#4ade80', engineId: 'eng_l_exit' },
    { id: 'mode_l_rebuy', name: 'L Rebuy · 5 tags', yTop: 195, yBot: 235, cy: 215, color: '#f472b6', engineId: 'eng_v4' },
    { id: 'mode_l_rapid', name: 'L Rapid · 4 tags', yTop: 245, yBot: 285, cy: 265, color: '#22d3ee', engineId: 'eng_v4' },
    { id: 'mode_l_grind', name: 'L Grind · 1 tags', yTop: 295, yBot: 335, cy: 315, color: '#facc15', engineId: 'eng_legacy_grind' },
    { id: 'mode_l_tc', name: 'L Top coins · 5 tags', yTop: 345, yBot: 385, cy: 365, color: '#06b6d4', engineId: 'eng_v4' },
    { id: 'mode_l_scalp', name: 'L Scalp · 3 tags', yTop: 395, yBot: 435, cy: 415, color: '#e879f9', engineId: 'eng_v4' },
    { id: 'mode_s_normal', name: 'S Normal · 2 tags', yTop: 495, yBot: 535, cy: 515, color: '#f87171', engineId: 'eng_s_exit' },
    { id: 'mode_s_quick', name: 'S Quick · 1 tags', yTop: 550, yBot: 590, cy: 570, color: '#fb923c', engineId: 'eng_s_exit' },
    { id: 'mode_s_rebuy', name: 'S Rebuy · 1 tags', yTop: 605, yBot: 645, cy: 625, color: '#ef4444', engineId: 'eng_s_exit' },
  ];

  const engineNodes = [
    { id: 'eng_l_exit', name: 'L exit engines', sub: 'signals/williams/stoploss', yTop: 60, yBot: 180, cy: 120, color: '#38bdf8' },
    { id: 'eng_v4', name: 'system_v4', sub: 'dynamic new trade ladder', yTop: 210, yBot: 350, cy: 280, color: '#a855f7' },
    { id: 'eng_legacy_grind', name: 'legacy grind · rebuy', sub: 'staged grid recovery', yTop: 380, yBot: 470, cy: 425, color: '#fb7185' },
    { id: 'eng_s_exit', name: 'S exit engines', sub: 'short reversal exit stack', yTop: 500, yBot: 640, cy: 570, color: '#f43f5e' },
  ];

  const ladderNodes = [
    { id: 'lad_g1', name: 'Grind 1 · 5 steps', cy: 65, color: '#facc15' },
    { id: 'lad_g2', name: 'Grind 2 · 5 steps', cy: 115, color: '#facc15' },
    { id: 'lad_g3', name: 'Grind 3 · 5 steps', cy: 165, color: '#facc15' },
    { id: 'lad_g4', name: 'Grind 4 · 5 steps', cy: 215, color: '#facc15' },
    { id: 'lad_g5', name: 'Grind 5 · 5 steps', cy: 265, color: '#facc15' },
    { id: 'lad_dr1', name: 'De-risk 1 · 20%', cy: 335, color: '#fb923c' },
    { id: 'lad_dr2', name: 'De-risk 2 · 30%', cy: 395, color: '#fb923c' },
    { id: 'lad_dr3', name: 'De-risk 3 · 50%', cy: 455, color: '#fb923c' },
    { id: 'lad_dr4', name: 'De-risk 4 · 100%', cy: 515, color: '#fb923c' },
    { id: 'lad_bb1', name: 'Buyback 1 · 100%', cy: 585, color: '#4ade80' },
  ];

  // Active trace calculated points
  const activeMode = modeNodes.find((m) => m.id === selectedTagItem.modeId) || modeNodes[0];
  const activeEngine = engineNodes.find((e) => e.id === activeMode.engineId) || engineNodes[0];
  const activeLadder = ladderNodes[0]; // Primary entry target ladder

  const activeTagIndex = LIVE_TAGS.findIndex((t) => t.id === activeTag);
  const activeTagY = 40 + activeTagIndex * 19;

  return (
    <div className="flex flex-col gap-4">
      {/* Trace Control Bar */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-white shadow-md'
            : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`}>
            {isZh ? '当前追踪信号' : 'Active Trace Tag'}:
          </span>
          <span
            className="text-xs font-mono font-bold px-2.5 py-1 rounded-md text-white shadow"
            style={{ backgroundColor: selectedTagItem.color }}
          >
            {selectedTagItem.name} ({selectedTagItem.ops} ops)
          </span>
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-black'}`}>
            → {activeMode.name.split('·')[0].trim()}
          </span>
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-black'}`}>
            → {activeEngine.name}
          </span>
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-black'}`}>
            → Closed (227 branches)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTag('L#1')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-400 text-black hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isZh ? '重置为 L#1' : 'Reset (L#1)'}
          </button>
        </div>
      </div>

      {/* Main Sankey Canvas Viewport */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-700/80 bg-[#161a23] shadow-2xl p-2 select-none">
        <svg
          viewBox="0 0 1280 720"
          className="w-full min-w-[1100px] h-auto font-sans"
          style={{ maxHeight: '780px' }}
        >
          <defs>
            <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="1" />
            </linearGradient>

            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* COLUMN LABELS (Header) */}
          <g className="text-[11px] font-bold fill-slate-400 uppercase tracking-wider">
            <text x="25" y="24">1. Entry signals</text>
            <text x="280" y="24">2. Protections</text>
            <text x="430" y="24">3. Volume</text>
            <text x="560" y="24">4. tag → mode</text>
            <text x="770" y="24">5. Exit systems</text>
            <text x="970" y="24">6. Ladders (v4)</text>
            <text x="1185" y="24">7. Closed</text>
          </g>

          {/* ======================================================== */}
          {/* FLOW RIBBONS (BACKGROUND SANKEY CONNECTORS)              */}
          {/* ======================================================== */}
          <g opacity="0.32">
            {/* Col 1 -> Col 2 (Protections) */}
            <path
              d={createRibbon(160, 40, 160, 270, 50, 180)}
              fill="#38bdf8"
            />
            <path
              d={createRibbon(160, 170, 310, 270, 210, 340)}
              fill="#4ade80"
            />
            <path
              d={createRibbon(160, 320, 500, 270, 370, 500)}
              fill="#f472b6"
            />
            <path
              d={createRibbon(160, 510, 640, 270, 530, 660)}
              fill="#f87171"
            />

            {/* Col 2 -> Col 3 (Gateway Bar x=450) */}
            <path
              d={createRibbon(370, 50, 180, 450, 120, 260)}
              fill="#60a5fa"
            />
            <path
              d={createRibbon(370, 210, 340, 450, 260, 400)}
              fill="#60a5fa"
            />
            <path
              d={createRibbon(370, 370, 500, 450, 400, 540)}
              fill="#60a5fa"
            />
            <path
              d={createRibbon(370, 530, 660, 450, 540, 620)}
              fill="#60a5fa"
            />

            {/* Col 3 -> Col 4 (Tag Modes) */}
            {modeNodes.map((m) => (
              <path
                key={`rib-mode-${m.id}`}
                d={createRibbon(462, m.cy - 12, m.cy + 12, 550, m.yTop, m.yBot)}
                fill={m.color}
              />
            ))}

            {/* Col 4 -> Col 5 (Engines) */}
            {modeNodes.map((m) => {
              const eng = engineNodes.find((e) => e.id === m.engineId) || engineNodes[0];
              return (
                <path
                  key={`rib-eng-${m.id}`}
                  d={createRibbon(670, m.yTop + 5, m.yBot - 5, 760, eng.cy - 18, eng.cy + 18)}
                  fill={m.color}
                />
              );
            })}

            {/* Col 5 -> Col 6 (Ladders) */}
            <path d={createRibbon(870, 80, 160, 960, 50, 280)} fill="#facc15" />
            <path d={createRibbon(870, 230, 330, 960, 320, 530)} fill="#fb923c" />
            <path d={createRibbon(870, 400, 450, 960, 100, 250)} fill="#fb7185" />
            <path d={createRibbon(870, 520, 620, 960, 560, 610)} fill="#f87171" />

            {/* Col 6 -> Col 7 (Closed Bar) */}
            {ladderNodes.map((l, idx) => (
              <path
                key={`rib-close-${idx}`}
                d={createRibbon(1070, l.cy - 7, l.cy + 7, 1170, 180 + idx * 30, 200 + idx * 30)}
                fill="#64748b"
              />
            ))}
          </g>

          {/* ======================================================== */}
          {/* ACTIVE TRACE OVERLAY HIGHLIGHT LINE                      */}
          {/* ======================================================== */}
          <g filter="url(#glowEffect)">
            {/* Tag to Protections */}
            <path
              d={createSpline(160, activeTagY, 270, 275)}
              fill="none"
              stroke={selectedTagItem.color}
              strokeWidth="5"
            />
            {/* Protections to Gateway */}
            <path
              d={createSpline(370, 275, 450, activeMode.cy)}
              fill="none"
              stroke={selectedTagItem.color}
              strokeWidth="5"
            />
            {/* Gateway to Mode */}
            <path
              d={createSpline(462, activeMode.cy, 550, activeMode.cy)}
              fill="none"
              stroke={selectedTagItem.color}
              strokeWidth="5"
            />
            {/* Mode to Engine */}
            <path
              d={createSpline(670, activeMode.cy, 760, activeEngine.cy)}
              fill="none"
              stroke={selectedTagItem.color}
              strokeWidth="5"
            />
            {/* Engine to Ladders */}
            <path
              d={createSpline(870, activeEngine.cy, 960, activeLadder.cy)}
              fill="none"
              stroke={selectedTagItem.color}
              strokeWidth="5"
            />
            {/* Ladders to Closed */}
            <path
              d={createSpline(1070, activeLadder.cy, 1170, 350)}
              fill="none"
              stroke={selectedTagItem.color}
              strokeWidth="5"
            />
          </g>

          {/* ======================================================== */}
          {/* COLUMN 1: ENTRY SIGNALS (36 LIVE TAGS)                   */}
          {/* ======================================================== */}
          <g>
            {LIVE_TAGS.map((tag, idx) => {
              const y = 40 + idx * 18.5;
              const isSelected = activeTag === tag.id;
              const isHovered = hoveredTag === tag.id;

              return (
                <g
                  key={tag.id}
                  className="cursor-pointer transition-opacity"
                  onClick={() => setActiveTag(tag.id)}
                  onMouseEnter={() => setHoveredTag(tag.id)}
                  onMouseLeave={() => setHoveredTag(null)}
                >
                  {/* Selection pill */}
                  {isSelected && (
                    <rect
                      x="18"
                      y={y - 10}
                      width="142"
                      height="16"
                      rx="4"
                      fill={tag.color}
                      fillOpacity="0.22"
                      stroke={tag.color}
                      strokeWidth="1.2"
                    />
                  )}

                  {/* Colored indicator dot */}
                  <circle
                    cx="28"
                    cy={y - 2}
                    r={isSelected ? 4.5 : 3.5}
                    fill={tag.color}
                  />

                  {/* Tag Name */}
                  <text
                    x="38"
                    y={y + 1}
                    className="font-mono text-[11px] font-bold"
                    fill={isSelected ? '#ffffff' : isHovered ? '#f1f5f9' : '#cbd5e1'}
                  >
                    {tag.name}
                  </text>

                  {/* Ops Count */}
                  <text
                    x="85"
                    y={y + 1}
                    className="font-mono text-[9.5px]"
                    fill={isSelected ? tag.color : '#94a3b8'}
                  >
                    · {tag.ops} ops
                  </text>
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* COLUMN 2: PROTECTIONS (4 VERTICAL GUARD CARDS)           */}
          {/* ======================================================== */}
          <g>
            {protectionNodes.map((prot) => (
              <g key={prot.id}>
                <rect
                  x="270"
                  y={prot.yTop}
                  width="100"
                  height={prot.yBot - prot.yTop}
                  rx="6"
                  fill="#1e293b"
                  fillOpacity="0.8"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <text
                  x="320"
                  y={prot.cy - 4}
                  textAnchor="middle"
                  className="font-mono text-[10.5px] font-bold fill-slate-200"
                >
                  {prot.name.split('·')[0].trim()}
                </text>
                <text
                  x="320"
                  y={prot.cy + 12}
                  textAnchor="middle"
                  className="font-mono text-[10px] font-bold fill-cyan-400"
                >
                  · {prot.name.split('·')[1]?.trim() || ''}
                </text>
              </g>
            ))}
          </g>

          {/* ======================================================== */}
          {/* COLUMN 3: GATEWAY DIVIDER / VOLUME FUNNEL BAR            */}
          {/* ======================================================== */}
          <g>
            <rect
              x="450"
              y="50"
              width="12"
              height="610"
              rx="6"
              fill="#475569"
            />
            {/* Vertical rotated text */}
            <text
              x="-355"
              y="459"
              transform="rotate(-90)"
              className="text-[10px] font-bold font-mono fill-slate-300 uppercase tracking-widest pointer-events-none"
            >
              Volume &gt; 0 Funnel
            </text>
          </g>

          {/* ======================================================== */}
          {/* COLUMN 4: TAG CLASSIFICATION (MODE GROUPS)               */}
          {/* ======================================================== */}
          <g>
            {modeNodes.map((m) => {
              const isModeActive = selectedTagItem.modeId === m.id;
              return (
                <g key={m.id}>
                  <rect
                    x="550"
                    y={m.yTop}
                    width="120"
                    height={m.yBot - m.yTop}
                    rx="6"
                    fill="#1e293b"
                    stroke={isModeActive ? m.color : '#334155'}
                    strokeWidth={isModeActive ? 2 : 1}
                  />
                  <circle cx="562" cy={m.cy} r="3.5" fill={m.color} />
                  <text
                    x="572"
                    y={m.cy + 3.5}
                    className="font-mono text-[10.5px] font-bold"
                    fill={isModeActive ? '#ffffff' : '#cbd5e1'}
                  >
                    {m.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* COLUMN 5: PROCESSING ENGINES                             */}
          {/* ======================================================== */}
          <g>
            {engineNodes.map((eng) => {
              const isEngActive = activeEngine.id === eng.id;
              return (
                <g key={eng.id}>
                  <rect
                    x="760"
                    y={eng.yTop}
                    width="110"
                    height={eng.yBot - eng.yTop}
                    rx="6"
                    fill="#1e293b"
                    stroke={isEngActive ? eng.color : '#334155'}
                    strokeWidth={isEngActive ? 2 : 1}
                  />
                  <text
                    x="815"
                    y={eng.cy - 6}
                    textAnchor="middle"
                    className="font-mono text-[11px] font-bold"
                    fill={isEngActive ? '#ffffff' : '#e2e8f0'}
                  >
                    {eng.name}
                  </text>
                  <text
                    x="815"
                    y={eng.cy + 10}
                    textAnchor="middle"
                    className="font-mono text-[8.5px] fill-slate-400"
                  >
                    {eng.sub}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* COLUMN 6: ACTION TIERS / LADDERS                         */}
          {/* ======================================================== */}
          <g>
            {ladderNodes.map((l) => (
              <g key={l.id}>
                <rect
                  x="960"
                  y={l.cy - 16}
                  width="110"
                  height="32"
                  rx="5"
                  fill="#1e293b"
                  stroke={l.color}
                  strokeWidth="1"
                  strokeOpacity="0.75"
                />
                <circle cx="972" cy={l.cy} r="3" fill={l.color} />
                <text
                  x="982"
                  y={l.cy + 3.5}
                  className="font-mono text-[10px] font-bold fill-slate-200"
                >
                  {l.name}
                </text>
              </g>
            ))}
          </g>

          {/* ======================================================== */}
          {/* COLUMN 7: TERMINAL (CLOSED · 227 BRANCHES)               */}
          {/* ======================================================== */}
          <g>
            <rect
              x="1170"
              y="180"
              width="75"
              height="360"
              rx="8"
              fill="#334155"
              fillOpacity="0.85"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <text
              x="1207"
              y="340"
              textAnchor="middle"
              className="font-mono text-[13px] font-black fill-cyan-400 tracking-wide"
            >
              Closed
            </text>
            <text
              x="1207"
              y="360"
              textAnchor="middle"
              className="font-mono text-[9px] font-bold fill-slate-300"
            >
              227 branches
            </text>
          </g>
        </svg>
      </div>

      {/* Helper Note for Traders */}
      <div
        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-300'
            : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold">
            {isZh ? '执行管道流转提示' : 'Execution Pipeline Insight'}:
          </span>{' '}
          {isZh
            ? '点击左侧任意活跃信号（L#1 - S#562）即可高亮完整的策略执行链路。所有信号必须依序穿透4重防御风控并经由Volume漏斗分发进入对应的Mode与Ladder分批阶梯。'
            : 'Click any live signal on the far left (L#1 - S#562) to highlight its complete trade execution path. Each signal passes 4-tier protection guards and the Volume funnel before reaching mode-specific dynamic ladders.'}
        </div>
      </div>
    </div>
  );
}
