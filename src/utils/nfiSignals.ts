export interface NfiSignalInfo {
  code: string;
  category: string;
  description: string;
  isShort: boolean;
  bgLight: string;
  textLight: string;
  borderLight: string;
  bgDark: string;
  textDark: string;
  borderDark: string;
}

/**
 * 📖 NFI / E0V1E / 通用策略入场信号智能解析速查字典：
 * • 支持结构化带方括号标签（如：buy_new [深度重挫：跌破SMA15均线4.0%强力抄底]）
 * • 1~13：趋势波段多头
 * • 21~26：放量拉升追多
 * • 41~53：超跌快速反弹
 * • 61~68：回调低吸加仓
 * • 141~145：头部主流大币
 * • 161~173：高频超短头皮
 * • 500+：做空信号体系
 */
export function parseNfiSignal(tag?: string | null): NfiSignalInfo {
  if (!tag || tag.trim() === '' || tag.trim() === '-') {
    return {
      code: '-',
      category: '常规入场',
      description: '常规或手动交易，无特定信号标签',
      isShort: false,
      bgLight: 'bg-slate-100',
      textLight: 'text-slate-600',
      borderLight: 'border-slate-200',
      bgDark: 'bg-slate-800/80',
      textDark: 'text-slate-400',
      borderDark: 'border-slate-700',
    };
  }

  const cleanTag = tag.trim();

  // 1. 结构化带括号/方括号的策略标签匹配 (如 E0V1E/NFI 常用: "buy_new [深度重挫：跌破SMA15均线4.0%强力抄底]" 或 "buy_1 [超跌插针：跌破SMA15均线2.7%且RSI超卖]")
  const bracketMatch = cleanTag.match(/^([^[(\s]+)?\s*[[(]([^\])]+)[\])]/i);
  if (bracketMatch) {
    const rawPrefix = bracketMatch[1]?.trim() || '';
    const rawInside = bracketMatch[2]?.trim() || '';

    let category = rawInside;
    if (rawInside.includes('：') || rawInside.includes(':')) {
      const parts = rawInside.split(/[：:]/);
      category = parts[0].trim();
    }

    const code = rawPrefix || category;
    const isShort = cleanTag.toLowerCase().includes('short') || cleanTag.includes('做空');

    // 智能语义配色
    let bgLight = 'bg-cyan-50';
    let textLight = 'text-cyan-700';
    let borderLight = 'border-cyan-200';
    let bgDark = 'bg-cyan-950/50';
    let textDark = 'text-cyan-400';
    let borderDark = 'border-cyan-800/60';

    if (isShort) {
      bgLight = 'bg-rose-50';
      textLight = 'text-rose-700';
      borderLight = 'border-rose-200';
      bgDark = 'bg-rose-950/50';
      textDark = 'text-rose-400';
      borderDark = 'border-rose-800/60';
    } else if (
      cleanTag.includes('插针') ||
      cleanTag.includes('头皮') ||
      cleanTag.includes('超短') ||
      cleanTag.toLowerCase().includes('scalp') ||
      cleanTag.toLowerCase().includes('pin')
    ) {
      bgLight = 'bg-purple-50';
      textLight = 'text-purple-700';
      borderLight = 'border-purple-200';
      bgDark = 'bg-purple-950/50';
      textDark = 'text-purple-400';
      borderDark = 'border-purple-800/60';
    } else if (
      cleanTag.includes('重挫') ||
      cleanTag.includes('超跌') ||
      cleanTag.includes('抄底') ||
      cleanTag.includes('超卖') ||
      cleanTag.toLowerCase().includes('dip') ||
      cleanTag.toLowerCase().includes('oversold')
    ) {
      bgLight = 'bg-amber-50';
      textLight = 'text-amber-700';
      borderLight = 'border-amber-200';
      bgDark = 'bg-amber-950/50';
      textDark = 'text-amber-400';
      borderDark = 'border-amber-800/60';
    } else if (
      cleanTag.includes('低吸') ||
      cleanTag.includes('回调') ||
      cleanTag.includes('支撑') ||
      cleanTag.toLowerCase().includes('pullback')
    ) {
      bgLight = 'bg-blue-50';
      textLight = 'text-blue-700';
      borderLight = 'border-blue-200';
      bgDark = 'bg-blue-950/50';
      textDark = 'text-blue-400';
      borderDark = 'border-blue-800/60';
    } else if (
      cleanTag.includes('突破') ||
      cleanTag.includes('追多') ||
      cleanTag.includes('放量') ||
      cleanTag.includes('拉升') ||
      cleanTag.toLowerCase().includes('breakout')
    ) {
      bgLight = 'bg-emerald-50';
      textLight = 'text-emerald-700';
      borderLight = 'border-emerald-200';
      bgDark = 'bg-emerald-950/50';
      textDark = 'text-emerald-400';
      borderDark = 'border-emerald-800/60';
    }

    return {
      code,
      category,
      description: cleanTag,
      isShort,
      bgLight,
      textLight,
      borderLight,
      bgDark,
      textDark,
      borderDark,
    };
  }

  // 2. 纯数字 NFI 经典标签解析 (如 "120", "42", "142", "501")
  const match = cleanTag.match(/\b(\d+)\b/) || cleanTag.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : null;

  if (num !== null) {
    // 500+：做空信号体系
    if (num >= 500) {
      return {
        code: `${num}`,
        category: '做空信号体系',
        description: '高位顶背离与反转做空信号体系',
        isShort: true,
        bgLight: 'bg-rose-50',
        textLight: 'text-rose-700',
        borderLight: 'border-rose-200',
        bgDark: 'bg-rose-950/50',
        textDark: 'text-rose-400',
        borderDark: 'border-rose-800/60',
      };
    }

    // 161~173：高频超短头皮
    if (num >= 161 && num <= 173) {
      return {
        code: `${num}`,
        category: '高频超短头皮',
        description: '微观结构快速剥头皮套利',
        isShort: false,
        bgLight: 'bg-pink-50',
        textLight: 'text-pink-700',
        borderLight: 'border-pink-200',
        bgDark: 'bg-pink-950/50',
        textDark: 'text-pink-400',
        borderDark: 'border-pink-800/60',
      };
    }

    // 141~145：头部主流大币
    if (num >= 141 && num <= 145) {
      return {
        code: `${num}`,
        category: '头部主流大币',
        description: 'BTC/ETH 主流核心资产专属做多信号',
        isShort: false,
        bgLight: 'bg-purple-50',
        textLight: 'text-purple-700',
        borderLight: 'border-purple-200',
        bgDark: 'bg-purple-950/50',
        textDark: 'text-purple-400',
        borderDark: 'border-purple-800/60',
      };
    }

    // 1~13 & 120等波段体系：趋势波段多头
    if ((num >= 1 && num <= 13) || num === 120 || num === 12) {
      return {
        code: `${num}`,
        category: '趋势波段多头',
        description: '大级别均线顺势波段多头',
        isShort: false,
        bgLight: 'bg-emerald-50',
        textLight: 'text-emerald-700',
        borderLight: 'border-emerald-200',
        bgDark: 'bg-emerald-950/50',
        textDark: 'text-emerald-400',
        borderDark: 'border-emerald-800/60',
      };
    }

    // 21~26：放量拉升追多
    if (num >= 21 && num <= 26) {
      return {
        code: `${num}`,
        category: '放量拉升追多',
        description: '成交量异动放大与突破追强',
        isShort: false,
        bgLight: 'bg-cyan-50',
        textLight: 'text-cyan-700',
        borderLight: 'border-cyan-200',
        bgDark: 'bg-cyan-950/50',
        textDark: 'text-cyan-400',
        borderDark: 'border-cyan-800/60',
      };
    }

    // 41~53：超跌快速反弹
    if (num >= 41 && num <= 53) {
      return {
        code: `${num}`,
        category: '超跌快速反弹',
        description: '极端下挫超卖快速抢反弹',
        isShort: false,
        bgLight: 'bg-amber-50',
        textLight: 'text-amber-700',
        borderLight: 'border-amber-200',
        bgDark: 'bg-amber-950/50',
        textDark: 'text-amber-400',
        borderDark: 'border-amber-800/60',
      };
    }

    // 61~68：回调低吸加仓
    if (num >= 61 && num <= 68) {
      return {
        code: `${num}`,
        category: '回调低吸加仓',
        description: '稳健支撑均线回踩低吸',
        isShort: false,
        bgLight: 'bg-blue-50',
        textLight: 'text-blue-700',
        borderLight: 'border-blue-200',
        bgDark: 'bg-blue-950/50',
        textDark: 'text-blue-400',
        borderDark: 'border-blue-800/60',
      };
    }
  }

  // 3. 通用命名标签兜底
  const isShort = cleanTag.toLowerCase().includes('short') || cleanTag.includes('做空');
  return {
    code: cleanTag.length > 14 ? `${cleanTag.slice(0, 12)}…` : cleanTag,
    category: '策略信号',
    description: `策略入场信号: ${cleanTag}`,
    isShort,
    bgLight: isShort ? 'bg-rose-50' : 'bg-cyan-50',
    textLight: isShort ? 'text-rose-700' : 'text-cyan-700',
    borderLight: isShort ? 'border-rose-200' : 'border-cyan-200',
    bgDark: isShort ? 'bg-rose-950/50' : 'bg-cyan-950/50',
    textDark: isShort ? 'text-rose-400' : 'text-cyan-400',
    borderDark: isShort ? 'border-rose-800/60' : 'border-cyan-800/60',
  };
}

/**
 * Checks if the current bot strategy is NostalgiaForInfinity (NFI) / E0V1E
 */
export function isNfiStrategy(strategyName?: string | null): boolean {
  if (!strategyName) return false;
  const s = strategyName.toLowerCase().trim();
  return (
    s.startsWith('nostalgia') ||
    s.startsWith('nfi') ||
    s.includes('nostalgiaforinfinity') ||
    s.includes('nfix') ||
    s.startsWith('e0v1') ||
    s.startsWith('e0v')
  );
}
