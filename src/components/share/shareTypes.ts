export type ShareCardType = 'dashboard' | 'active_trade' | 'closed_trade';

export type ShareTheme = 'dark' | 'gradient' | 'minimal';

export interface DashboardShareData {
  type: 'dashboard';
  botName: string;
  strategyName: string;
  timeframe: string;
  balance?: number;
  freeBalance?: number;
  realizedProfit: number;
  realizedRatio: number;
  unrealizedProfit: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  activeTradesCount: number;
  maxOpenTrades: number;
  totalStake: number;
  avgDailyProfit?: number;
  dailyWinrate?: number;
  currencyUnit: string;
  exchangeRate?: number;
}

export interface ActiveTradeShareData {
  type: 'active_trade';
  botName: string;
  strategyName: string;
  tradeId: number;
  pair: string;
  isShort: boolean;
  openRate: number;
  currentRate?: number;
  profitPct: number;
  profitAbs: number;
  stakeAmount: number;
  amount?: number;
  enterTag?: string | null;
  stopLossAbs?: number;
  stopLossPct?: number;
  openTimestamp?: number | string;
  currencyUnit: string;
  exchangeRate?: number;
}

export interface ClosedTradeShareData {
  type: 'closed_trade';
  botName: string;
  strategyName: string;
  tradeId: number;
  pair: string;
  isShort: boolean;
  openRate: number;
  closeRate: number;
  profitPct: number;
  profitAbs: number;
  stakeAmount: number;
  amount?: number;
  enterTag?: string | null;
  exitReason?: string | null;
  openTimestamp?: number | string;
  closeTimestamp?: number | string;
  currencyUnit: string;
  exchangeRate?: number;
}

export type ShareCardData = DashboardShareData | ActiveTradeShareData | ClosedTradeShareData;

export interface ShareCardOptions {
  hideAmounts: boolean;       // 脱敏敏感金额 (替换为 ****)
  showBalance: boolean;       // 是否展示总余额 (仅主仪表盘有效)
  showStrategy: boolean;      // 是否展示策略与机器人名称
  showTradeDetails: boolean;  // 是否展示详细价格 (开仓价、平仓价等)
  showSignal: boolean;        // 是否展示入场信号标签
  showDuration: boolean;      // 是否展示持仓时长与时间
  theme: ShareTheme;          // 主题风格
}
