export interface Trade {
  trade_id: number;
  pair: string;
  is_open: boolean;
  is_short?: boolean;
  open_date: string;
  open_timestamp: number;
  close_date?: string;
  close_timestamp?: number;
  open_rate: number;
  close_rate?: number;
  current_rate?: number;
  amount: number;
  stake_amount: number;
  profit_ratio: number;
  profit_pct: number;
  profit_abs?: number;
  stop_loss_pct?: number;
  stop_loss_abs?: number;
  initial_stop_loss_pct?: number;
  enter_tag?: string;
  exit_tag?: string;
  exit_reason?: string;
  timeframe?: string;
  orders?: Array<{
    order_id?: string;
    ft_order_side?: string;
    ft_is_entry?: boolean;
    filled?: number;
    cost?: number;
    funding_fee?: number;
  }>;
}

export interface ProfitSummary {
  profit_closed_coin: number;
  profit_closed_percent_mean: number;
  profit_closed_ratio: number;
  profit_closed_fiat: number;
  profit_all_coin: number;
  profit_all_percent_mean: number;
  profit_all_ratio: number;
  profit_all_fiat: number;
  trade_count: number;
  closed_trade_count: number;
  first_trade_date: string;
  latest_trade_date: string;
  avg_duration: string;
  best_pair: string;
  winning_trades: number;
  losing_trades: number;
  winrate: number;
  max_drawdown?: number;
  max_drawdown_pct?: number;
}

export interface DailyRecord {
  date: string;
  abs_profit: number;
  fiat_value: number;
  trade_count: number;
  starting_balance?: number;
}

export interface CandleData {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalStat {
  tag: string;
  total_trades: number;
  win_trades: number;
  loss_trades: number;
  win_rate: number;
  total_profit_pct: number;
  avg_profit_pct: number;
  avg_duration_min: number;
}

export interface BotProfile {
  id: string;
  name: string;
  apiUrl: string;
  username?: string;
  password?: string;
  createdAt: number;
  lastConnected?: number;
  isShared?: boolean;
}

export interface BotConfig {
  apiUrl: string;
  username?: string;
  password?: string;
  strategyName?: string;
  timeframe?: string;
  state?: 'running' | 'stopped' | 'reload';
  dry_run?: boolean;
  stake_currency?: string;
  max_open_trades?: number;
}

export interface BotState {
  version: string;
  strategy: string;
  timeframe: string;
  state: 'running' | 'stopped' | 'reload';
  dry_run: boolean;
  stake_currency: string;
  max_open_trades: number;
  balance: number;
  free_balance?: number;
  stake_amount: number | string;
  whitelist: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
}
