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

export const STRATEGY_CATEGORY_TRANSLATIONS: Record<string, string> = {
  // Common E0V1E / E0V1EN / NFI categories
  '超跌插针': 'Oversold Pin',
  '深度重挫': 'Deep Plummet',
  '超跌': 'Oversold',
  '插针': 'Pin Bar',
  '重挫': 'Plummet',
  '抄底': 'Bottom Buy',
  '低吸': 'Pullback Buy',
  '回调': 'Pullback',
  '回调低吸': 'Pullback Dip',
  '回调低吸加仓': 'Pullback DCA',
  '放量拉升': 'Volume Surge',
  '放量突破': 'Volume Breakout',
  '放量拉升追多': 'Volume Breakout Long',
  '超跌反弹': 'Oversold Rebound',
  '超卖反弹': 'Oversold Rebound',
  '超跌快速反弹': 'Oversold Rebound',
  '趋势波段': 'Trend Swing',
  '趋势波段多头': 'Trend Swing Long',
  '头部主流大币': 'Large-Cap Leaders',
  '头部主流': 'Major Leaders',
  '主流大币': 'Large-Cap Coins',
  '高频超短': 'High-Freq Scalp',
  '高频超短头皮': 'High-Freq Scalp',
  '做空信号体系': 'Short Signal System',
  '做空体系': 'Short System',
  '顶背离': 'Top Divergence',
  '高位顶背离': 'Top Divergence',
  '底背离': 'Bullish Divergence',
  '均线回踩': 'MA Retest',
  '均线支撑': 'MA Support',
  '均线突破': 'MA Breakout',
  '跌破均线': 'MA Breakdown',
  '跌破支撑': 'Breakdown Support',
  '突破阻力': 'Break Resistance',
  '常规入场': 'Regular Entry',
  '策略信号': 'Strategy Signal',
  '未公开': 'Hidden',
  '强力反弹': 'Strong Rebound',
  '强力抄底': 'Strong Bottom Buy',
  '追多': 'Breakout Long',
  '做多': 'Long',
  '做空': 'Short',
  '剥头皮': 'Scalp',
  '头皮': 'Scalp',
  '震荡': 'Range Oscillation',
  '吸筹': 'Accumulation',
  '反弹': 'Rebound',
  '突破': 'Breakout',
  '支撑': 'Support',
  '阻力': 'Resistance',
  '死叉': 'Death Cross',
  '金叉': 'Golden Cross',
  '超卖': 'Oversold',
  '超买': 'Overbought',
  '加速': 'Acceleration',
  '急跌': 'Flash Crash',
  '急涨': 'Flash Pump',
  '横盘': 'Sideways',
  '盘整': 'Consolidation',
  '量能': 'Volume Power',
  '动量': 'Momentum',
  '突破追多': 'Breakout Long',
  '波段做多': 'Swing Long',
  '波段做空': 'Swing Short',
  '超短线': 'Ultra Scalp',
  '长线': 'Position Trading',
  '日内': 'Intraday',
};

// Aliases for backward compatibility
export const SIGNAL_CATEGORY_EN = STRATEGY_CATEGORY_TRANSLATIONS;

/**
 * Translates Chinese strategy terms or tags into clean English
 */
export function translateStrategyTerm(text?: string | null): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (STRATEGY_CATEGORY_TRANSLATIONS[trimmed]) {
    return STRATEGY_CATEGORY_TRANSLATIONS[trimmed];
  }

  let result = trimmed;
  // Replace longer matching phrases first
  const sortedKeys = Object.keys(STRATEGY_CATEGORY_TRANSLATIONS).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (result.includes(k)) {
      result = result.split(k).join(` ${STRATEGY_CATEGORY_TRANSLATIONS[k]} `);
    }
  }

  const commonSubTerms: [RegExp, string][] = [
    [/跌破/g, 'Break below '],
    [/突破/g, 'Break above '],
    [/均线/g, 'MA '],
    [/且/g, ' and '],
    [/或/g, ' or '],
    [/超卖/g, 'Oversold '],
    [/超买/g, 'Overbought '],
    [/强力/g, 'Strong '],
    [/快速/g, 'Quick '],
    [/顺势/g, 'Trend following '],
    [/微观/g, 'Micro '],
    [/结构/g, 'Structure '],
    [/套利/g, 'Arbitrage '],
  ];

  for (const [regex, replacement] of commonSubTerms) {
    result = result.replace(regex, replacement);
  }

  // Clean up punctuation and strip any leftover Chinese characters
  result = result
    .replace(/[：:]/g, ': ')
    .replace(/[\u4e00-\u9fa5]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return result || trimmed;
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
export function parseNfiSignal(tag?: string | null, isZh = true): NfiSignalInfo {
  if (!tag || tag.trim() === '' || tag.trim() === '-') {
    return {
      code: 'Hidden',
      category: isZh ? '未公开' : 'Hidden',
      description: isZh ? '策略信号已隐藏' : 'Hidden strategy signal',
      isShort: false,
      colorClasses: SIGNAL_COLOR_STYLES.slate,
    };
  }

  const cleanTag = tag.trim();

  // 1. 结构化带括号/方括号或分隔符的策略标签匹配
  // (如: "buy_new [深度重挫：跌破SMA15均线4.0%强力抄底]" 或 "buy_1 [超跌插针：跌破SMA15均线2.7%且RSI超卖]" 或 "buy_1 · 超跌插针")
  let rawPrefix = '';
  let rawInside = '';

  const bracketMatch = cleanTag.match(/^([^[(\s]+)?\s*[[(]([^\])]+)[\])]/i);
  if (bracketMatch) {
    rawPrefix = bracketMatch[1]?.trim() || '';
    rawInside = bracketMatch[2]?.trim() || '';
  } else {
    const dotMatch = cleanTag.match(/^([^·:：\s]+)\s*[·:：]\s*(.+)$/);
    if (dotMatch) {
      rawPrefix = dotMatch[1].trim();
      rawInside = dotMatch[2].trim();
    }
  }

  if (rawInside || bracketMatch) {
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

    const localizedCategory = isZh ? category : translateStrategyTerm(category);
    const localizedDescription = isZh ? cleanTag : translateStrategyTerm(cleanTag);

    return {
      code,
      category: localizedCategory,
      description: localizedDescription,
      isShort,
      colorClasses,
    };
  }

  // 2. 纯数字 NFI 经典标签解析 (如 "120", "42", "142", "501")
  const match = cleanTag.match(/\b(\d+)\b/) || cleanTag.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : null;
  const displayCode = cleanTag.length <= 12 ? cleanTag : (num !== null ? `${num}` : cleanTag);

  if (num !== null) {
    // 500+：做空信号体系
    if (num >= 500) {
      return {
        code: displayCode,
        category: isZh ? '做空信号体系' : 'Short Signal System',
        description: isZh ? '高位顶背离与反转做空信号体系' : 'High top-divergence & reversal short system',
        isShort: true,
        colorClasses: SIGNAL_COLOR_STYLES.rose,
      };
    }

    // 161~173：高频超短头皮
    if (num >= 161 && num <= 173) {
      return {
        code: displayCode,
        category: isZh ? '高频超短头皮' : 'High-Freq Scalp',
        description: isZh ? '微观结构快速剥头皮套利' : 'Microstructure quick scalping arbitrage',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.pink,
      };
    }

    // 141~145：头部主流大币
    if (num >= 141 && num <= 145) {
      return {
        code: displayCode,
        category: isZh ? '头部主流大币' : 'Large-Cap Leaders',
        description: isZh ? 'BTC/ETH 主流核心资产专属做多信号' : 'BTC/ETH major assets dedicated long signals',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.purple,
      };
    }

    // 1~13 & 120等波段体系：趋势波段多头
    if ((num >= 1 && num <= 13) || num === 120 || num === 12) {
      return {
        code: displayCode,
        category: isZh ? '趋势波段多头' : 'Trend Swing Long',
        description: isZh ? '大级别均线顺势波段多头' : 'Higher timeframe MA trend swing long',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.emerald,
      };
    }

    // 21~26：放量拉升追多
    if (num >= 21 && num <= 26) {
      return {
        code: displayCode,
        category: isZh ? '放量拉升追多' : 'Volume Breakout Long',
        description: isZh ? '成交量异动放大与突破追强' : 'Volume spike & breakout momentum long',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.cyan,
      };
    }

    // 41~53：超跌快速反弹
    if (num >= 41 && num <= 53) {
      return {
        code: displayCode,
        category: isZh ? '超跌快速反弹' : 'Oversold Rebound',
        description: isZh ? '极端下挫超卖快速抢反弹' : 'Extreme drop & oversold bounce entry',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.amber,
      };
    }

    // 61~68：回调低吸加仓
    if (num >= 61 && num <= 68) {
      return {
        code: displayCode,
        category: isZh ? '回调低吸加仓' : 'Pullback DCA',
        description: isZh ? '稳健支撑均线回踩低吸' : 'Support MA retest & low-absorption entry',
        isShort: false,
        colorClasses: SIGNAL_COLOR_STYLES.blue,
      };
    }
  }

  // 3. 通用命名标签兜底
  const isShort = cleanTag.toLowerCase().includes('short') || cleanTag.includes('做空');
  const localizedTag = isZh ? cleanTag : translateStrategyTerm(cleanTag);
  return {
    code: cleanTag.length > 14 ? `${cleanTag.slice(0, 12)}…` : cleanTag,
    category: isZh ? '策略信号' : 'Strategy Signal',
    description: isZh ? `策略入场信号: ${cleanTag}` : `Strategy entry signal: ${localizedTag}`,
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

export const EXIT_REASONS_ZH: Record<string, string> = {
  roi: '止盈 (ROI)',
  stop_loss: '止损 (Stop Loss)',
  trailing_stop_loss: '追踪止损',
  stoploss_on_exchange: '交易所止损',
  sold_on_exchange: '交易所平仓',
  force_exit: '市价平仓',
  emergencysell: '紧急平仓',
  custom_exit: '策略退出',
  exit_signal: '策略退出信号',
  sell_signal: '卖出信号',
  partial_exit: '部分平仓',
  user: '人工平仓',
};

export const EXIT_REASONS_EN: Record<string, string> = {
  roi: 'Take Profit (ROI)',
  stop_loss: 'Stop Loss',
  trailing_stop_loss: 'Trailing SL',
  stoploss_on_exchange: 'Exchange SL',
  sold_on_exchange: 'Sold on Exchange',
  force_exit: 'Force Exit',
  emergencysell: 'Emergency Exit',
  custom_exit: 'Custom Exit',
  exit_signal: 'Exit Signal',
  sell_signal: 'Sell Signal',
  partial_exit: 'Partial Exit',
  user: 'Manual Exit',
};

/**
 * Converts Freqtrade / NFI strategy exit reasons and tags into authentic, professional
 * quant trading terminology in Chinese, while preserving clean original English tags.
 */
export function formatExitReason(
  reason: string | undefined,
  tag: string | undefined,
  isZh: boolean
): string {
  // If reason is generic or empty, use tag if available
  let raw = '';
  if (tag && (!reason || reason === 'exit_signal' || reason === 'custom_exit')) {
    raw = tag;
  } else if (reason) {
    raw = reason;
    // Only append tag if it's not a pure number (which is entry tag info) and not identical
    if (tag && tag !== reason && !tag.match(/^\d+(\s+\d+)*$/)) {
      raw = `${reason} (${tag})`;
    }
  } else {
    raw = tag || '';
  }

  raw = raw.trim();
  if (!raw) return '-';

  // Strip redundant trailing entry tags like "( 141 142 )" or "( 65 )"
  // because the table already displays entry tag in the adjacent column
  const cleanReason = raw.replace(/\s*\(\s*[\d\s]+\s*\)$/, '').trim();
  const lower = cleanReason.toLowerCase();

  if (!isZh) {
    if (EXIT_REASONS_EN[lower]) {
      return EXIT_REASONS_EN[lower];
    }
    return cleanReason;
  }

  // Chinese mode: map to professional crypto quant trading terminology
  if (EXIT_REASONS_ZH[lower]) {
    return EXIT_REASONS_ZH[lower];
  }

  // 1. Extreme protection / Risk control exits
  if (lower.includes('stoploss_doom')) {
    return '深度风控止损';
  }
  if (lower.includes('bad_trade_broken')) {
    return '形态破位止损';
  }
  if (lower.includes('bad_trade_abandon')) {
    return '废弃超时止损';
  }

  // 2. Profit target exits
  if (lower.startsWith('exit_profit_')) {
    if (lower.includes('tc') || lower.includes('top_coins')) return '主流大币止盈';
    if (lower.includes('rebuy')) return '低吸补仓止盈';
    if (lower.includes('normal')) return '常规多头止盈';
    if (lower.includes('pump')) return '放量拉升止盈';
    if (lower.includes('quick')) return '快速多头止盈';
    if (lower.includes('scalp')) return '超短剥头皮止盈';
    if (lower.includes('btc')) return 'BTC专属止盈';
    if (lower.includes('grind')) return '震荡研磨止盈';
    return '策略目标止盈';
  }

  // 3. Long exit signals
  if (lower.startsWith('exit_long_')) {
    if (lower.includes('quick') || lower.includes('_q_')) return '快速多头离场';
    if (lower.includes('tc') || lower.includes('top_coins')) return '主流币多头离场';
    if (lower.includes('rebuy') || lower.includes('_w_')) return '低吸补仓离场';
    if (lower.includes('normal') || lower.includes('_u_')) return '常规多头离场';
    if (lower.includes('grind') || lower.includes('_g_')) return '震荡研磨离场';
    if (lower.includes('pump')) return '拉升高位离场';
    if (lower.includes('scalp')) return '高频超短离场';
    if (lower.includes('btc')) return 'BTC专属离场';
    if (lower.includes('rapid') || lower.includes('rpd')) return '超跌反弹离场';
    if (lower.includes('stoploss')) return '策略防守止损';
    return '多头策略离场';
  }

  // 4. Short exit signals
  if (lower.startsWith('exit_short_')) {
    if (lower.includes('rebuy')) return '做空补仓平仓';
    if (lower.includes('quick') || lower.includes('_q_')) return '快速做空平仓';
    if (lower.includes('normal') || lower.includes('_u_')) return '常规做空平仓';
    if (lower.includes('scalp')) return '做空超短平仓';
    if (lower.includes('tc') || lower.includes('top_coins')) return '主流币做空平仓';
    if (lower.includes('pump')) return '冲高做空平仓';
    if (lower.includes('rapid') || lower.includes('rpd')) return '做空反弹平仓';
    if (lower.includes('stoploss')) return '空头防守止损';
    return '空头策略离场';
  }

  // 5. Generic exit signals
  if (lower.startsWith('exit_')) {
    if (lower.includes('derisk')) return '去风险减仓';
    if (lower.includes('dec')) return '动量衰竭离场';
    if (lower.includes('williams_r')) return '威廉超买离场';
    if (lower.includes('trend')) return '趋势反转离场';
    return '策略信号离场';
  }

  return cleanReason;
}
