export interface NfiSignalInfo {
  code: string;
  category: string;
  description: string;
  isShort: boolean;
  colorClasses: string;
}

export const SIGNAL_COLOR_STYLES = {
  rose: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  purple: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
  amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  blue: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
  pink: 'bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30',
  slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
};

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
      code: 'Hidden',
      category: 'Hidden',
      description: 'Hidden',
      isShort: false,
      colorClasses: SIGNAL_COLOR_STYLES.slate,
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

    // 智能语义配色（静态 Tailwind 兼容类，暗黑模式采用高对比度 15% 透光背景与亮色字）
    let colorClasses = SIGNAL_COLOR_STYLES.cyan;

    if (isShort) {
      colorClasses = SIGNAL_COLOR_STYLES.rose;
    } else if (
      cleanTag.includes('插针') ||
      cleanTag.includes('头皮') ||
      cleanTag.includes('超短') ||
      cleanTag.toLowerCase().includes('scalp') ||
      cleanTag.toLowerCase().includes('pin')
    ) {
      colorClasses = SIGNAL_COLOR_STYLES.purple;
    } else if (
      cleanTag.includes('重挫') ||
      cleanTag.includes('超跌') ||
      cleanTag.includes('抄底') ||
      cleanTag.includes('超卖') ||
      cleanTag.toLowerCase().includes('dip') ||
      cleanTag.toLowerCase().includes('oversold')
    ) {
      colorClasses = SIGNAL_COLOR_STYLES.amber;
    } else if (
      cleanTag.includes('低吸') ||
      cleanTag.includes('回调') ||
      cleanTag.includes('支撑') ||
      cleanTag.toLowerCase().includes('pullback')
    ) {
      colorClasses = SIGNAL_COLOR_STYLES.blue;
    } else if (
      cleanTag.includes('突破') ||
      cleanTag.includes('追多') ||
      cleanTag.includes('放量') ||
      cleanTag.includes('拉升') ||
      cleanTag.toLowerCase().includes('breakout')
    ) {
      colorClasses = SIGNAL_COLOR_STYLES.emerald;
    }

    return {
      code,
      category,
      description: cleanTag,
      isShort,
      colorClasses,
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
        colorClasses: SIGNAL_COLOR_STYLES.rose,
      };
    }

    // 161~173：高频超短头皮
    if (num >= 161 && num <= 173) {
      return {
        code: `${num}`,
        category: '高频超短头皮',
        description: '微观结构快速剥头皮套利',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.pink,
      };
    }

    // 141~145：头部主流大币
    if (num >= 141 && num <= 145) {
      return {
        code: `${num}`,
        category: '头部主流大币',
        description: 'BTC/ETH 主流核心资产专属做多信号',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.purple,
      };
    }

    // 1~13 & 120等波段体系：趋势波段多头
    if ((num >= 1 && num <= 13) || num === 120 || num === 12) {
      return {
        code: `${num}`,
        category: '趋势波段多头',
        description: '大级别均线顺势波段多头',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.emerald,
      };
    }

    // 21~26：放量拉升追多
    if (num >= 21 && num <= 26) {
      return {
        code: `${num}`,
        category: '放量拉升追多',
        description: '成交量异动放大与突破追强',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.cyan,
      };
    }

    // 41~53：超跌快速反弹
    if (num >= 41 && num <= 53) {
      return {
        code: `${num}`,
        category: '超跌快速反弹',
        description: '极端下挫超卖快速抢反弹',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.amber,
      };
    }

    // 61~68：回调低吸加仓
    if (num >= 61 && num <= 68) {
      return {
        code: `${num}`,
        category: '回调低吸加仓',
        description: '稳健支撑均线回踩低吸',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.blue,
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
    colorClasses: isShort ? SIGNAL_COLOR_STYLES.rose : SIGNAL_COLOR_STYLES.cyan,
  };
}

/**
 * Checks if the current bot strategy is NostalgiaForInfinity (NFI)
 * Note: E0V1E is its own distinct strategy and does not use NFI numeric manual.
 */
export function isNfiStrategy(strategyName?: string | null): boolean {
  if (!strategyName) return false;
  const s = strategyName.toLowerCase().trim();
  return (
    s.startsWith('nostalgia') ||
    s.startsWith('nfi') ||
    s.includes('nostalgiaforinfinity') ||
    s.includes('nfix')
  );
}
